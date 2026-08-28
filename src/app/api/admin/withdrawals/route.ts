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
  fee: number;
  net_amount: number;
  currency: string;
  payment_method: string;
  payout_details_json: string;
  recipient_phone: string | null;
  recipient_name: string | null;
  recipient_email: string | null;
  status: string;
  reference: string | null;
  payout_reference: string | null;
  fapshi_reference: string | null;
  fapshi_transaction_id: string | null;
  failure_reason: string | null;
  notes: string | null;
  admin_notes: string | null;
  processed_by: number | null;
  processed_by_name: string | null;
  requested_at: string;
  approved_at: string | null;
  processed_at: string | null;
  completed_at: string | null;
  created_at: string;
};

/**
 * GET /api/admin/withdrawals
 * Returns all withdrawals with optional ?status=, ?search= filter.
 * Joined with store, user, and wallet data.
 */
export async function GET(request: Request) {
  const access = await requireAdminApi();
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { searchParams } = new URL(request.url);
  const statusParam = searchParams.get("status") ?? "PENDING";
  const search = searchParams.get("search")?.trim() || "";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = 30;
  const offset = (page - 1) * limit;

  try {
    const whereParts: string[] = [];
    const params: unknown[] = [];

    if (statusParam && statusParam.toLowerCase() !== "all") {
      whereParts.push("LOWER(w.status) = ?");
      params.push(statusParam.toLowerCase());
    }

    if (search) {
      whereParts.push(
        "(s.name LIKE ? OR u.name LIKE ? OR u.email LIKE ? OR w.recipient_phone LIKE ? OR w.fapshi_reference LIKE ? OR w.fapshi_transaction_id LIKE ?)"
      );
      const sTerm = `%${search}%`;
      params.push(sTerm, sTerm, sTerm, sTerm, sTerm, sTerm);
    }

    const whereClause = whereParts.length > 0 ? `WHERE ${whereParts.join(" AND ")}` : "";

    const rows = await query<WithdrawalDetailRow[]>(
      `SELECT
         w.id, w.store_id, w.user_id, w.wallet_id,
         w.amount, COALESCE(w.fee, 0) AS fee, COALESCE(w.net_amount, w.amount) AS net_amount,
         COALESCE(w.currency, 'XAF') AS currency,
         w.payment_method, w.payout_details_json,
         w.recipient_phone, w.recipient_name, w.recipient_email,
         UPPER(w.status) AS status,
         w.reference, w.payout_reference, w.fapshi_reference, w.fapshi_transaction_id,
         w.failure_reason, w.notes, w.admin_notes, w.processed_by,
         w.requested_at, w.approved_at, w.processed_at, w.completed_at, w.created_at,
         s.name AS store_name, s.slug AS store_slug,
         u.name AS user_name, u.email AS user_email,
         pb.name AS processed_by_name
       FROM withdrawals w
       JOIN stores s ON s.id = w.store_id
       JOIN users u ON u.id = w.user_id
       LEFT JOIN users pb ON pb.id = w.processed_by
       ${whereClause}
       ORDER BY w.id DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const countRows = await query<{ total: number }[]>(
      `SELECT COUNT(*) AS total
       FROM withdrawals w
       JOIN stores s ON s.id = w.store_id
       JOIN users u ON u.id = w.user_id
       ${whereClause}`,
      params
    );
    const total = Number(countRows[0]?.total || 0);

    // Summary counts
    const statusCounts = await query<{ status: string; cnt: number }[]>(
      "SELECT UPPER(status) AS status, COUNT(*) AS cnt FROM withdrawals GROUP BY UPPER(status)"
    );

    const counts: Record<string, number> = {
      pending: 0,
      approved: 0,
      processing: 0,
      success: 0,
      failed: 0,
      rejected: 0,
      cancelled: 0,
      all: 0,
    };

    let totalAll = 0;
    for (const r of statusCounts) {
      const lower = r.status.toLowerCase();
      counts[lower] = Number(r.cnt);
      totalAll += Number(r.cnt);
    }
    counts.all = totalAll;

    return NextResponse.json({
      withdrawals: rows,
      counts,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
    });
  } catch (err) {
    console.error("Admin withdrawals GET error:", err);
    return NextResponse.json({ error: "Failed to fetch withdrawals" }, { status: 500 });
  }
}
