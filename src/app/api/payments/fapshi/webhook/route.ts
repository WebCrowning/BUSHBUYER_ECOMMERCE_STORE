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

    if (!eventId || !externalId) {
      return NextResponse.json({ error: "Invalid webhook payload: missing eventId or externalId" }, { status: 400 });
    }

    // Idempotency: log webhook; returns false if already processed
    const logged = await PaymentRepository.logWebhook(
      "fapshi",
      String(eventId),
      eventType || "payment.SUCCESS",
      payload
    );

    if (!logged) {
      return NextResponse.json({ status: "ignored_duplicate" });
    }

    // Process only successful payments
    if (eventType === "payment.SUCCESS" || (payload as any).status === "SUCCESSFUL" || (payload as any).status === "SUCCESS") {
      await PaymentService.handleSuccessfulPayment(
        String(externalId),       // masterOrderId
        "fapshi",
        String(transId || eventId), // paymentReference
        Number(amount || 0),
        Number(userId || 0)
      );
    }

    return NextResponse.json({ status: "success" });
  } catch (err: any) {
    console.error("[Fapshi Webhook] Error:", err);
    return NextResponse.json({ error: "Webhook processing error" }, { status: 500 });
  }
}
