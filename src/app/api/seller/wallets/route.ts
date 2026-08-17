import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireStoreOrAdminApi } from "@/lib/authz";
import { z } from "zod";

type WalletRow = {
  id: number;
  store_id: number;
  available_balance: number;
  pending_balance: number;
  total_withdrawals: number;
  total_refunds: number;
  total_commission_paid: number;
  total_sales: number;
  currency: string;
  updated_at: string;
};

type TransactionRow = {
  id: number;
  wallet_id: number;
  store_id: number;
  amount: number;
  transaction_type: string;
  reference_type: string | null;
  reference_id: string | null;
  description: string | null;
  status: string;
  admin_note: string | null;
  created_at: string;
};

type WithdrawalRow = {
  id: number;
  store_id: number;
  amount: number;
  payment_method: string;
  payout_details_json: string;
  status: string;
  reference: string | null;
  payout_reference: string | null;
  admin_notes: string | null;
  processed_at: string | null;
  created_at: string;
};

const withdrawalSchema = z.object({
  storeId: z.number().int().positive(),
  amount: z.number().positive("Amount must be greater than 0"),
  paymentMethod: z.enum(["bank_transfer", "fapshi", "paypal"], {
    error: "Payment method must be bank_transfer, fapshi, or paypal",
  }),
  payoutDetails: z.object({
    accountName: z.string().min(2).optional(),
    accountNumber: z.string().min(4).optional(),
    bankName: z.string().optional(),
    mobileNumber: z.string().optional(),
    paypalEmail: z.string().email().optional(),
    notes: z.string().max(300).optional(),
  }).optional().default({}),
});

/**
 * GET /api/seller/wallets?storeId=<id>
 * Returns wallet balance, recent transactions (last 50), and withdrawal history.
 * Accessible by store owners/staff and platform admins.
 */
export async function GET(request: Request) {
  const access = await requireStoreOrAdminApi();
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { searchParams } = new URL(request.url);
  const overrideId = searchParams.get("storeId");
  const storeId = overrideId ? parseInt(overrideId, 10) : access.primaryStoreId;

  if (!storeId || isNaN(storeId)) {
    return NextResponse.json({ error: "No store found for your account" }, { status: 400 });
  }

  if (!access.isSuperAdmin && !access.userStoreIds.includes(storeId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    // 1. Wallet balance
    const [wallet] = await query<WalletRow[]>(
      "SELECT * FROM wallets WHERE store_id = ? LIMIT 1",
      [storeId]
    );

    // 2. Recent transactions (last 100)
    const transactions = await query<TransactionRow[]>(
      `SELECT id, wallet_id, store_id, amount, transaction_type, reference_type,
              reference_id, description, status, admin_note, created_at
       FROM wallet_transactions
       WHERE store_id = ?
       ORDER BY id DESC LIMIT 100`,
      [storeId]
    );

    // 3. Withdrawal history
    const withdrawals = await query<WithdrawalRow[]>(
      `SELECT id, store_id, amount, payment_method, payout_details_json,
              status, reference, payout_reference, admin_notes, processed_at, created_at
       FROM withdrawals
       WHERE store_id = ?
       ORDER BY id DESC LIMIT 50`,
      [storeId]
    );

    // 4. Commission rate for this store (informational)
    const [commissionRow] = await query<{ rate_percentage: number }[]>(
      `SELECT rate_percentage FROM commissions
       WHERE (level = 'store' AND target_id = ? AND is_active = 1)
       UNION ALL
       SELECT rate_percentage FROM commissions
       WHERE level = 'global' AND is_active = 1
       LIMIT 1`,
      [String(storeId)]
    );

    return NextResponse.json({
      wallet: wallet ?? null,
      transactions,
      withdrawals,
      commissionRate: commissionRow?.rate_percentage ?? 5.0,
    });
  } catch (err) {
    console.error("Seller wallets GET error:", err);
    return NextResponse.json({ error: "Failed to fetch wallet data" }, { status: 500 });
  }
}

/**
 * POST /api/seller/wallets
 * Submit a withdrawal request.
 * Only store_owner role can withdraw — staff cannot.
 */
export async function POST(request: Request) {
  const access = await requireStoreOrAdminApi();
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const userId = access.userId;
  const role = access.role as string;

  // Only store owners (and platform admins) may request withdrawals
  const canWithdraw =
    access.isSuperAdmin ||
    role === "store_owner" ||
    role === "admin" ||
    role === "finance_admin";

  if (!canWithdraw) {
    return NextResponse.json(
      { error: "Only store owners can request withdrawals" },
      { status: 403 }
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = withdrawalSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid data" }, { status: 400 });
  }

  const { storeId, amount, paymentMethod, payoutDetails } = parsed.data;

  // Verify requester belongs to this store
  if (!access.isSuperAdmin && !access.userStoreIds.includes(storeId)) {
    return NextResponse.json({ error: "Forbidden: this store is not yours" }, { status: 403 });
  }

  try {
    // Fetch wallet with a lock-safe read
    const [wallet] = await query<WalletRow[]>(
      "SELECT * FROM wallets WHERE store_id = ? LIMIT 1",
      [storeId]
    );

    if (!wallet) {
      return NextResponse.json({ error: "Wallet not found for this store" }, { status: 404 });
    }

    const available = Number(wallet.available_balance);

    if (amount > available) {
      return NextResponse.json(
        {
          error: `Requested amount ($${amount.toFixed(2)}) exceeds available balance ($${available.toFixed(2)})`,
        },
        { status: 400 }
      );
    }

    const MIN_AMOUNT = 10;
    if (amount < MIN_AMOUNT) {
      return NextResponse.json(
        { error: `Minimum withdrawal amount is $${MIN_AMOUNT.toFixed(2)}` },
        { status: 400 }
      );
    }

    // Check for an already-pending withdrawal from this store
    const [pendingRow] = await query<{ cnt: number }[]>(
      "SELECT COUNT(*) AS cnt FROM withdrawals WHERE store_id = ? AND status IN ('pending','approved')",
      [storeId]
    );

    if (Number(pendingRow?.cnt) > 0) {
      return NextResponse.json(
        { error: "You already have a pending or approved withdrawal request. Please wait for it to be processed before submitting another." },
        { status: 400 }
      );
    }

    // Deduct from available, add to pending
    await query(
      `UPDATE wallets
       SET available_balance = available_balance - ?,
           pending_balance = pending_balance + ?
       WHERE store_id = ? AND available_balance >= ?`,
      [amount, amount, storeId, amount]
    );

    // Verify the update actually applied (concurrent race protection)
    const [updated] = await query<{ available_balance: number }[]>(
      "SELECT available_balance FROM wallets WHERE store_id = ? LIMIT 1",
      [storeId]
    );
    if (!updated) throw new Error("Wallet update verification failed");

    // Insert withdrawal request
    const result = await query<{ insertId: number }>(
      `INSERT INTO withdrawals
         (store_id, user_id, wallet_id, amount, payment_method, payout_details_json, status)
       VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
      [storeId, userId, wallet.id, amount, paymentMethod, JSON.stringify(payoutDetails)]
    );

    // Log wallet_transactions entry (pending withdrawal deduction)
    await query(
      `INSERT INTO wallet_transactions
         (wallet_id, store_id, amount, transaction_type, reference_type, reference_id, description, status)
       VALUES (?, ?, ?, 'withdrawal', 'withdrawal', ?, ?, 'pending')`,
      [wallet.id, storeId, amount, String(result.insertId), `Withdrawal request #${result.insertId} — awaiting admin approval`]
    );

    return NextResponse.json({
      ok: true,
      withdrawalId: result.insertId,
      message: "Withdrawal request submitted. An admin will review and process it shortly.",
    }, { status: 201 });
  } catch (err) {
    console.error("Seller wallets POST error:", err);
    return NextResponse.json({ error: "Failed to submit withdrawal request" }, { status: 500 });
  }
}
