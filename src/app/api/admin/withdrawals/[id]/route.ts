import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdminApi } from "@/lib/authz";

type Params = { params: Promise<{ id: string }> };

type WithdrawalRow = {
  id: number;
  store_id: number;
  wallet_id: number;
  amount: number;
  status: string;
};

/**
 * PATCH /api/admin/withdrawals/[id]
 * Body: { action: "approve" | "reject" | "process", admin_notes?: string, payout_reference?: string }
 *
 * approve  → status: pending → approved   (admin confirms they will process it)
 * reject   → status: pending|approved → rejected (money returned to available_balance)
 * process  → status: approved → processed (payout sent, add payout_reference)
 */
export async function PATCH(request: Request, { params }: Params) {
  const access = await requireAdminApi();
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { id } = await params;
  const withdrawalId = parseInt(id, 10);
  if (isNaN(withdrawalId)) {
    return NextResponse.json({ error: "Invalid withdrawal ID" }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const action = body?.action as string;
  const adminNotes: string = body?.admin_notes ?? "";
  const payoutReference: string = body?.payout_reference ?? "";

  if (!["approve", "reject", "process"].includes(action)) {
    return NextResponse.json({ error: "action must be approve, reject, or process" }, { status: 400 });
  }

  const adminUserId = Number(access.session.user.id);

  try {
    // Fetch the withdrawal with a lock
    const rows = await query<WithdrawalRow[]>(
      "SELECT id, store_id, wallet_id, amount, status FROM withdrawals WHERE id = ? LIMIT 1",
      [withdrawalId]
    );

    if (!rows[0]) {
      return NextResponse.json({ error: "Withdrawal not found" }, { status: 404 });
    }

    const w = rows[0];

    if (action === "approve") {
      if (w.status !== "pending") {
        return NextResponse.json({ error: "Only pending withdrawals can be approved" }, { status: 400 });
      }

      await query(
        `UPDATE withdrawals
         SET status = 'approved', admin_notes = ?, processed_by = ?, processed_at = NOW()
         WHERE id = ?`,
        [adminNotes || null, adminUserId, withdrawalId]
      );

      return NextResponse.json({ ok: true, status: "approved" });
    }

    if (action === "reject") {
      if (!["pending", "approved"].includes(w.status)) {
        return NextResponse.json({ error: "Only pending or approved withdrawals can be rejected" }, { status: 400 });
      }

      // Return funds to available_balance, clear pending_balance
      await query(
        `UPDATE wallets
         SET available_balance = available_balance + ?,
             pending_balance = GREATEST(0, pending_balance - ?)
         WHERE id = ?`,
        [w.amount, w.amount, w.wallet_id]
      );

      // Log reversal in wallet_transactions
      const [walletRow] = await query<{ id: number; store_id: number }[]>(
        "SELECT id, store_id FROM wallets WHERE id = ? LIMIT 1",
        [w.wallet_id]
      );

      if (walletRow) {
        await query(
          `INSERT INTO wallet_transactions
             (wallet_id, store_id, amount, transaction_type, reference_type, reference_id, description, status, admin_note)
           VALUES (?, ?, ?, 'adjustment', 'withdrawal', ?, ?, 'completed', ?)`,
          [
            w.wallet_id,
            walletRow.store_id,
            w.amount,
            String(withdrawalId),
            `Withdrawal #${withdrawalId} rejected — funds returned to balance`,
            adminNotes || null,
          ]
        );
      }

      await query(
        `UPDATE withdrawals
         SET status = 'rejected', admin_notes = ?, processed_by = ?, processed_at = NOW()
         WHERE id = ?`,
        [adminNotes || null, adminUserId, withdrawalId]
      );

      return NextResponse.json({ ok: true, status: "rejected" });
    }

    if (action === "process") {
      if (w.status !== "approved") {
        return NextResponse.json({ error: "Only approved withdrawals can be marked as processed" }, { status: 400 });
      }
      if (!payoutReference.trim()) {
        return NextResponse.json({ error: "payout_reference is required when processing a withdrawal" }, { status: 400 });
      }

      // Move from pending_balance to total_withdrawals
      await query(
        `UPDATE wallets
         SET pending_balance = GREATEST(0, pending_balance - ?),
             total_withdrawals = total_withdrawals + ?
         WHERE id = ?`,
        [w.amount, w.amount, w.wallet_id]
      );

      // Log withdrawal ledger entry
      const [walletRow] = await query<{ id: number; store_id: number }[]>(
        "SELECT id, store_id FROM wallets WHERE id = ? LIMIT 1",
        [w.wallet_id]
      );

      if (walletRow) {
        await query(
          `INSERT INTO wallet_transactions
             (wallet_id, store_id, amount, transaction_type, reference_type, reference_id, description, status, admin_note)
           VALUES (?, ?, ?, 'withdrawal', 'withdrawal', ?, ?, 'completed', ?)`,
          [
            w.wallet_id,
            walletRow.store_id,
            w.amount,
            String(withdrawalId),
            `Payout processed (ref: ${payoutReference})`,
            adminNotes || null,
          ]
        );
      }

      await query(
        `UPDATE withdrawals
         SET status = 'processed', payout_reference = ?, admin_notes = ?,
             processed_by = ?, processed_at = NOW()
         WHERE id = ?`,
        [payoutReference, adminNotes || null, adminUserId, withdrawalId]
      );

      return NextResponse.json({ ok: true, status: "processed" });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    console.error("Admin withdrawal PATCH error:", err);
    return NextResponse.json({ error: "Failed to process withdrawal action" }, { status: 500 });
  }
}
