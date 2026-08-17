import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdminApi } from "@/lib/authz";

export type WithdrawalDetailRow = {
  id: number;
  store_id: number;
  store_name: string;
  store_slug: string;
  user_id: number;
  user_name: string;
  user_email: string;
  wallet_id: number;
  amount: number;
  payment_method: string;
  payout_details_json: string;
  status: "pending" | "approved" | "processed" | "rejected";
  reference: string | null;
  payout_reference: string | null;
  notes: string | null;
  admin_notes: string | null;
  processed_by: number | null;
  processed_by_name: string | null;
  processed_at: string | null;
  created_at: string;
};

/**
 * GET /api/admin/withdrawals
 * Returns all withdrawals with optional ?status= filter.
 * Joined with store, user, and wallet data.
 */
export async function GET(request: Request) {
  const access = await requireAdminApi();
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") ?? "pending";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = 30;
  const offset = (page - 1) * limit;

  try {
    const conditions = status === "all" ? "1=1" : "w.status = ?";
    const params: unknown[] = status === "all" ? [limit, offset] : [status, limit, offset];

    const rows = await query<WithdrawalDetailRow[]>(
      `SELECT
         w.id, w.store_id, w.user_id, w.wallet_id,
         w.amount, w.payment_method, w.payout_details_json,
         w.status, w.reference, w.payout_reference,
         w.notes, w.admin_notes, w.processed_by, w.processed_at,
         w.created_at,
         s.name AS store_name, s.slug AS store_slug,
         u.name AS user_name, u.email AS user_email,
         pb.name AS processed_by_name
       FROM withdrawals w
       JOIN stores s ON s.id = w.store_id
       JOIN users u ON u.id = w.user_id
       LEFT JOIN users pb ON pb.id = w.processed_by
       WHERE ${conditions}
       ORDER BY w.created_at ASC
       LIMIT ? OFFSET ?`,
      params
    );

    const [{ total }] = await query<{ total: number }[]>(
      status === "all"
        ? "SELECT COUNT(*) AS total FROM withdrawals"
        : "SELECT COUNT(*) AS total FROM withdrawals WHERE status = ?",
      status === "all" ? [] : [status]
    );

    // Summary counts
    const statusCounts = await query<{ status: string; cnt: number }[]>(
      "SELECT status, COUNT(*) AS cnt FROM withdrawals GROUP BY status"
    );

    const counts = { pending: 0, approved: 0, processed: 0, rejected: 0 };
    for (const r of statusCounts) {
      if (r.status in counts) (counts as Record<string, number>)[r.status] = Number(r.cnt);
    }

    return NextResponse.json({
      withdrawals: rows,
      counts,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error("Admin withdrawals GET error:", err);
    return NextResponse.json({ error: "Failed to fetch withdrawals" }, { status: 500 });
  }
}
