import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/authz";
import { WithdrawalRepository } from "@/repositories/withdrawal.repository";

type Params = { params: Promise<{ id: string }> };

/**
 * PATCH /api/admin/withdrawals/[id]
 * Body: { action: "approve" | "reject" | "process" | "reconcile", admin_notes?: string, payout_reference?: string }
 *
 * approve   → PENDING → APPROVED → dispatches Fapshi Payout → PROCESSING/SUCCESS
 * reject    → PENDING|APPROVED → REJECTED (funds atomically returned to available_balance)
 * process   → manual confirmation for bank wire / external reference
 * reconcile → queries Fapshi status (GET /payment-status/{transId}) and syncs
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

  if (!["approve", "reject", "process", "reconcile"].includes(action)) {
    return NextResponse.json({ error: "action must be approve, reject, process, or reconcile" }, { status: 400 });
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "0.0.0.0";
  const userAgent = request.headers.get("user-agent") || undefined;
  const adminUserId = Number(access.session.user.id);

  try {
    if (action === "approve") {
      const updated = await WithdrawalRepository.approveWithdrawal(
        withdrawalId,
        adminUserId,
        adminNotes,
        ip,
        userAgent
      );
      return NextResponse.json({ ok: true, withdrawal: updated, status: updated.status });
    }

    if (action === "reject") {
      const updated = await WithdrawalRepository.rejectWithdrawal(
        withdrawalId,
        adminUserId,
        adminNotes || "Rejected by administrator",
        ip,
        userAgent
      );
      return NextResponse.json({ ok: true, withdrawal: updated, status: "REJECTED" });
    }

    if (action === "reconcile") {
      const result = await WithdrawalRepository.reconcileWithFapshi(withdrawalId, adminUserId);
      return NextResponse.json({ ok: true, ...result });
    }

    if (action === "process") {
      if (!payoutReference.trim()) {
        return NextResponse.json({ error: "payout_reference is required when manually marking as processed" }, { status: 400 });
      }
      await WithdrawalRepository.finalizeSuccess(withdrawalId, payoutReference.trim());
      return NextResponse.json({ ok: true, status: "SUCCESS" });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err: any) {
    console.error("Admin withdrawal PATCH error:", err);
    return NextResponse.json({ error: err.message || "Failed to process withdrawal action" }, { status: 500 });
  }
}
