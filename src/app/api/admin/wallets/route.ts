import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { query } from "@/lib/db";

function isAdmin(role?: string) {
  return (
    role === "admin" ||
    role === "sub_admin" ||
    role === "super_admin" ||
    role === "platform_admin" ||
    role === "finance_admin"
  );
}

export async function GET(request: Request) {
  try {
    const session = await auth();
    const role = (session?.user as { role?: string })?.role;
    if (!session?.user?.id || !isAdmin(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = 20;
    const offset = (page - 1) * limit;

    const wallets = await query<Record<string, unknown>[]>(
      `SELECT w.*, s.name AS store_name, s.slug AS store_slug, s.store_status
       FROM wallets w
       JOIN stores s ON s.id = w.store_id
       ORDER BY w.available_balance DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    const [{ total }] = await query<{ total: number }[]>(
      "SELECT COUNT(*) AS total FROM wallets"
    );

    const [summary] = await query<{
      total_available: number;
      total_pending: number;
      total_sales: number;
      total_commission: number;
    }[]>(
      `SELECT
         SUM(available_balance) AS total_available,
         SUM(pending_balance) AS total_pending,
         SUM(total_sales) AS total_sales,
         SUM(total_commission_paid) AS total_commission
       FROM wallets`
    );

    // Pending withdrawals
    const pendingWithdrawals = await query<Record<string, unknown>[]>(
      `SELECT w.id, w.store_id, w.amount, w.payment_method, w.status, w.created_at,
              s.name AS store_name
       FROM withdrawals w
       JOIN stores s ON s.id = w.store_id
       WHERE w.status = 'pending'
       ORDER BY w.created_at ASC
       LIMIT 20`
    );

    return NextResponse.json({
      wallets,
      summary,
      pendingWithdrawals,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error("Admin wallets GET error:", err);
    return NextResponse.json({ error: "Failed to fetch wallets" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    const role = (session?.user as { role?: string })?.role;
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only store owners and admins may submit withdrawals
    const canWithdraw =
      isAdmin(role) ||
      role === "store_owner";

    if (!canWithdraw) {
      return NextResponse.json({ error: "Only store owners can request withdrawals" }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    const storeId = parseInt(body?.storeId, 10);
    const amount = Number(body?.amount);
    const paymentMethod = String(body?.paymentMethod ?? body?.payment_method ?? "bank_transfer");

    if (isNaN(storeId) || storeId <= 0) {
      return NextResponse.json({ error: "Invalid storeId" }, { status: 400 });
    }
    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Amount must be greater than 0" }, { status: 400 });
    }

    const userId = Number(session.user.id);

    // Verify store ownership (non-admins)
    if (!isAdmin(role)) {
      const storeCheck = await query<{ id: number }[]>(
        "SELECT id FROM store_users WHERE store_id = ? AND user_id = ? AND store_role = 'store_owner' AND status = 'active' LIMIT 1",
        [storeId, userId]
      );
      if (!storeCheck[0]) {
        return NextResponse.json({ error: "You are not the owner of this store" }, { status: 403 });
      }
    }

    // Check wallet balance
    const [wallet] = await query<{ id: number; available_balance: number; pending_balance: number }[]>(
      "SELECT id, available_balance, pending_balance FROM wallets WHERE store_id = ? LIMIT 1",
      [storeId]
    );

    if (!wallet) {
      return NextResponse.json({ error: "Wallet not found for this store" }, { status: 404 });
    }

    if (amount < 10) {
      return NextResponse.json({ error: "Minimum withdrawal amount is $10.00" }, { status: 400 });
    }

    if (amount > Number(wallet.available_balance)) {
      return NextResponse.json({
        error: `Requested amount ($${amount.toFixed(2)}) exceeds available balance ($${Number(wallet.available_balance).toFixed(2)})`
      }, { status: 400 });
    }

    // Block duplicate pending withdrawals
    const [pending] = await query<{ cnt: number }[]>(
      "SELECT COUNT(*) AS cnt FROM withdrawals WHERE store_id = ? AND status IN ('pending','approved')",
      [storeId]
    );
    if (Number(pending?.cnt) > 0) {
      return NextResponse.json({
        error: "A withdrawal request is already pending for this store. Wait for it to be processed."
      }, { status: 400 });
    }

    // Deduct from available, add to pending
    await query(
      `UPDATE wallets SET available_balance = available_balance - ?, pending_balance = pending_balance + ?
       WHERE store_id = ? AND available_balance >= ?`,
      [amount, amount, storeId, amount]
    );

    const result = await query<{ insertId: number }>(
      `INSERT INTO withdrawals (store_id, user_id, wallet_id, amount, payment_method, payout_details_json, status)
       VALUES (?, ?, ?, ?, ?, '{}', 'pending')`,
      [storeId, userId, wallet.id, amount, paymentMethod]
    );

    // Log in wallet_transactions
    await query(
      `INSERT INTO wallet_transactions (wallet_id, store_id, amount, transaction_type, reference_type, reference_id, description, status)
       VALUES (?, ?, ?, 'withdrawal', 'withdrawal', ?, ?, 'pending')`,
      [wallet.id, storeId, amount, String(result.insertId), `Withdrawal request #${result.insertId} — pending admin approval`]
    );

    return NextResponse.json({
      ok: true,
      withdrawalId: result.insertId,
      message: "Withdrawal request submitted. An admin will review it shortly.",
    }, { status: 201 });
  } catch (err) {
    console.error("Admin wallets POST error:", err);
    return NextResponse.json({ error: "Failed to submit withdrawal" }, { status: 500 });
  }
}
