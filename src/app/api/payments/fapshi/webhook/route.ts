import { PaymentRepository } from "@/repositories/payment.repository";
import { PaymentService } from "@/services/payment.service";
import { FapshiProvider } from "@/providers/fapshi.provider";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();

    // Security: Verify Fapshi webhook signature before processing
    const signatureHeader =
      req.headers.get("x-fapshi-signature") ||
      req.headers.get("fapshi-signature") ||
      req.headers.get("x-wh-secret") ||
      "";

    if (!FapshiProvider.verifyWebhookSignature(rawBody, signatureHeader)) {
      console.warn("[Fapshi Webhook] Signature verification failed — rejecting request.");
      return NextResponse.json({ error: "Invalid webhook signature" }, { status: 403 });
    }

    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid webhook payload" }, { status: 400 });
    }

    const { eventId, eventType, externalId, transId, amount, userId } = payload as {
      eventId?: string;
      eventType?: string;
      externalId?: string;
      transId?: string;
      amount?: number;
      userId?: number;
      status?: string;
    };

    const effectiveEventId = String(eventId || transId || "");
    if (!effectiveEventId || !externalId) {
      return NextResponse.json({ error: "Invalid webhook payload: missing eventId/transId or externalId" }, { status: 400 });
    }

    // Idempotency: log webhook; returns false if already processed
    const logged = await PaymentRepository.logWebhook(
      "fapshi",
      effectiveEventId,
      eventType || "payment.SUCCESS",
      payload
    );

    if (!logged) {
      return NextResponse.json({ status: "ignored_duplicate" });
    }

    // Process only successful payments
    if (eventType === "payment.SUCCESS" || (payload as any).status === "SUCCESSFUL" || (payload as any).status === "SUCCESS") {
      if (String(externalId).startsWith("STORE-APP-")) {
        const parts = String(externalId).split("-");
        const appId = Number(parts[2]);
        if (appId > 0) {
          const { query } = await import("@/lib/db");
          const { createAdminNotification } = await import("@/lib/notifications");
          const apps = await query<any[]>(
            "SELECT * FROM store_applications WHERE id = ? LIMIT 1",
            [appId]
          );
          const app = apps[0];
          if (app && app.payment_status !== "paid") {
            const feeCfa = Number(app.application_fee_cfa) || Number(amount) || 5000;
            await query(
              `UPDATE store_applications
               SET payment_status = 'paid',
                   payment_reference = ?,
                   payment_gateway = 'fapshi',
                   paid_at = NOW()
               WHERE id = ?`,
              [String(transId || eventId), appId]
            );

            await createAdminNotification({
              type: "store_application",
              title: `Store Application Fee Paid (${feeCfa.toLocaleString()} CFA)`,
              body: `Applicant for store '${app.store_name}' completed the registration fee via Fapshi Webhook. Ready for review!`,
              link: "/admin/store-applications",
            });
          }
        }
      } else {
        await PaymentService.handleSuccessfulPayment(
          String(externalId),       // masterOrderId
          "fapshi",
          String(transId || eventId), // paymentReference
          Number(amount || 0),
          Number(userId || 0)
        );
      }
    }

    return NextResponse.json({ status: "success" });
  } catch (err: any) {
    console.error("[Fapshi Webhook] Error:", err);
    return NextResponse.json({ error: "Webhook processing error" }, { status: 500 });
  }
}
