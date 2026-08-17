import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { PaypalProvider, PayPalWebhookEvent } from "@/providers/paypal.provider";
import { PaymentRepository } from "@/repositories/payment.repository";
import { PaymentService } from "@/services/payment.service";

type ExistingWebhookEvent = { id: number };

type MatchingOrderRow = {
  id: number;
  master_order_id: string;
  public_order_id: string;
  user_id: number;
  total_price: number;
};

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();

    let event: PayPalWebhookEvent;
    try {
      event = JSON.parse(rawBody) as PayPalWebhookEvent;
    } catch {
      return NextResponse.json({ error: "Invalid webhook payload" }, { status: 400 });
    }

    if (!event?.id || !event.event_type) {
      return NextResponse.json({ error: "Invalid webhook payload" }, { status: 400 });
    }

    // Security: Verify PayPal webhook signature server-side
    const token = await PaypalProvider.getAccessToken();
    const signatureValid = await PaypalProvider.verifyWebhookSignature(token, request, event);

    if (!signatureValid) {
      console.warn("[PayPal Webhook] Signature verification failed — rejecting request.");
      return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
    }

    // Idempotency: check if we already processed this event_id
    const existingEvent = await query<ExistingWebhookEvent[]>(
      "SELECT id FROM paypal_webhook_events WHERE event_id = ? LIMIT 1",
      [event.id]
    );

    if (existingEvent.length > 0) {
      return NextResponse.json({ ok: true, duplicate: true });
    }

    const captureId = event.resource?.id ?? null;
    const paypalOrderId = event.resource?.supplementary_data?.related_ids?.order_id ?? null;

    let reconciliationStatus: "processed" | "unmatched" = "unmatched";
    let matchedOrderId: number | null = null;

    if (event.event_type === "PAYMENT.CAPTURE.COMPLETED") {
      const matchingOrders = await query<MatchingOrderRow[]>(
        `SELECT id, master_order_id, public_order_id, user_id, total_price
         FROM orders
         WHERE paypal_transaction_id = ? OR paypal_order_id = ?
         LIMIT 1`,
        [captureId, paypalOrderId]
      );

      if (matchingOrders.length > 0) {
        const order = matchingOrders[0];
        matchedOrderId = order.id;
        reconciliationStatus = "processed";

        // Extract captured amount from event resource
        const captures = event.resource?.purchase_units?.[0]?.payments?.captures;
        const capture = captures?.[0];
        const paidAmount = capture?.amount?.value
          ? Number(capture.amount.value)
          : Number(order.total_price);

        // Use unified payment service — credits seller wallets, updates statuses
        try {
          await PaymentService.handleSuccessfulPayment(
            order.master_order_id || order.public_order_id,
            "paypal",
            String(captureId || paypalOrderId || event.id),
            paidAmount,
            order.user_id
          );
        } catch (err) {
          console.error("[PayPal Webhook] handleSuccessfulPayment error:", err);
          reconciliationStatus = "unmatched";
        }
      }
    }

    // Log to paypal_webhook_events for audit trail
    await query(
      `INSERT INTO paypal_webhook_events
       (event_id, event_type, resource_id, paypal_order_id, payload, reconciliation_status, matched_order_id, processed_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        event.id,
        event.event_type,
        captureId,
        paypalOrderId,
        rawBody,
        reconciliationStatus,
        matchedOrderId,
      ]
    );

    // Also log in unified payment_webhooks table
    await PaymentRepository.logWebhook(
      "paypal",
      event.id,
      event.event_type,
      event
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[PayPal Webhook] Error:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
