import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { FapshiProvider } from "@/providers/fapshi.provider";
import { WithdrawalRepository } from "@/repositories/withdrawal.repository";
import { WithdrawalRecord } from "@/types/withdrawal";

/**
 * POST /api/payments/fapshi/payout-webhook
 * Fapshi Payout Webhook Notification Listener.
 *
 * Fapshi posts transaction updates (e.g. status: 'SUCCESSFUL', 'FAILED', 'EXPIRED')
 * with signature header `x-wh-secret` or HMAC-SHA256.
 */
export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature =
      request.headers.get("x-wh-secret") ||
      request.headers.get("x-fapshi-signature") ||
      "";

    // Verify webhook signature
    const isValidSig = FapshiProvider.verifyWebhookSignature(rawBody, signature, true);
    if (!isValidSig) {
      console.warn("[Fapshi Payout Webhook] Rejected invalid webhook signature.");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const payload = JSON.parse(rawBody || "{}");
    const { transId, status, externalId, message } = payload;

    if (!transId && !externalId) {
      return NextResponse.json({ error: "Missing transId or externalId" }, { status: 400 });
    }

    // Find matching withdrawal by transId or external reference
    const withdrawals = await query<WithdrawalRecord[]>(
      `SELECT * FROM withdrawals
       WHERE fapshi_transaction_id = ? OR fapshi_reference = ? OR id = ?
       LIMIT 1`,
      [transId || "", externalId || "", isNaN(Number(externalId)) ? -1 : Number(externalId)]
    );

    if (!withdrawals[0]) {
      console.warn(`[Fapshi Payout Webhook] No withdrawal found matching transId: ${transId}, externalId: ${externalId}`);
      return NextResponse.json({ message: "Withdrawal not found, ignored" }, { status: 200 });
    }

    const w = withdrawals[0];

    // Record webhook event into audit log
    await query(
      `INSERT INTO withdrawal_audit_logs (
        withdrawal_id, actor_role, action, metadata_json
      ) VALUES (?, 'webhook', 'FAPSHI_PAYOUT_WEBHOOK_RECEIVED', ?)`,
      [w.id, JSON.stringify(payload)]
    );

    // Finalize status based on Fapshi status
    if (status === "SUCCESSFUL" && w.status !== "SUCCESS") {
      await WithdrawalRepository.finalizeSuccess(w.id, transId);
      console.log(`[Fapshi Payout Webhook] Finalized withdrawal #${w.id} to SUCCESS.`);
    } else if ((status === "FAILED" || status === "EXPIRED") && w.status !== "FAILED" && w.status !== "SUCCESS") {
      await WithdrawalRepository.finalizeFailure(w.id, message || `Fapshi payout ${status}`);
      console.log(`[Fapshi Payout Webhook] Finalized withdrawal #${w.id} to FAILED (refunded).`);
    }

    return NextResponse.json({ success: true, transId, status });
  } catch (err: any) {
    console.error("[Fapshi Payout Webhook] Error processing webhook:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
