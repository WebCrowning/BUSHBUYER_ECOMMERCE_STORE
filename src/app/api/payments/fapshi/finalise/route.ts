import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { query } from "@/lib/db";
import { PaymentService } from "@/services/payment.service";
import { FapshiProvider } from "@/providers/fapshi.provider";

type FapshiSession = {
  id: number;
  trans_id: string;
  user_id: number;
  master_order_id: string | null;
  currency: string;
  verified_total: number;
  items_json: string;
  status: "created" | "consumed" | "expired" | "failed";
};

/**
 * POST /api/payments/fapshi/finalise
 * Body: { transId: string; masterOrderId?: string }
 *
 * Called by the fapshi-success page after verifying a SUCCESSFUL payment.
 * Checks if an order already exists (webhook may have already created it).
 * If not, handles the payment via PaymentService.handleSuccessfulPayment
 * which credits wallets and updates order statuses — creating a webhook-
 * independent guarantee that the order is always recorded.
 *
 * Returns { orderId: string | null, alreadyExisted: boolean }
 */
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const transId: string = body?.transId ?? "";
    const masterOrderId: string = body?.masterOrderId ?? "";

    if (!transId) {
      return NextResponse.json({ error: "transId is required" }, { status: 400 });
    }

    // 1. Re-verify with Fapshi API to be sure the payment is actually SUCCESSFUL
    let verifiedAmount = 0;
    try {
      const status = await FapshiProvider.verifyTransaction(transId);
      if (status.status !== "SUCCESSFUL") {
        return NextResponse.json({ error: "Payment is not confirmed as successful", status: status.status }, { status: 400 });
      }
      verifiedAmount = Number(status.amount ?? 0);
    } catch (err) {
      console.warn("[fapshi/finalise] Could not re-verify with Fapshi API:", err);
      // Allow to proceed if Fapshi API is temporarily unavailable; order may already exist
    }

    // 2. Look up the fapshi_checkout_session
    const [session_row] = await query<FapshiSession[]>(
      "SELECT * FROM fapshi_checkout_sessions WHERE trans_id = ? LIMIT 1",
      [transId]
    );

    const effectiveMasterOrderId = session_row?.master_order_id || masterOrderId;
    if (!effectiveMasterOrderId) {
      return NextResponse.json({ error: "Cannot resolve master order ID", orderId: null });
    }

    // 3. Check if an order already exists for this master_order_id
    const existingOrders = await query<{ id: number; public_order_id: string }[]>(
      "SELECT id, public_order_id FROM orders WHERE master_order_id = ? LIMIT 1",
      [effectiveMasterOrderId]
    );

    if (existingOrders.length > 0) {
      // Order already exists (webhook created it) — just mark session consumed
      await query(
        "UPDATE fapshi_checkout_sessions SET status = 'consumed', consumed_at = NOW() WHERE trans_id = ? AND status = 'created'",
        [transId]
      );
      return NextResponse.json({
        ok: true,
        orderId: existingOrders[0].public_order_id,
        alreadyExisted: true,
      });
    }

    // 4. Order does NOT exist yet — create it via handleSuccessfulPayment
    // This is the webhook-independent fallback path.
    try {
      await PaymentService.handleSuccessfulPayment(
        effectiveMasterOrderId,
        "fapshi",
        transId,
        verifiedAmount,
        Number(session.user.id)
      );
    } catch (err) {
      console.error("[fapshi/finalise] handleSuccessfulPayment error:", err);
      // Return the orderId even if wallet crediting failed — the order may have been created
    }

    // Mark session consumed
    await query(
      "UPDATE fapshi_checkout_sessions SET status = 'consumed', consumed_at = NOW() WHERE trans_id = ?",
      [transId]
    );

    // Fetch the newly created order
    const newOrders = await query<{ id: number; public_order_id: string }[]>(
      "SELECT id, public_order_id FROM orders WHERE master_order_id = ? LIMIT 1",
      [effectiveMasterOrderId]
    );

    return NextResponse.json({
      ok: true,
      orderId: newOrders[0]?.public_order_id ?? null,
      alreadyExisted: false,
    });
  } catch (err) {
    console.error("[fapshi/finalise] Error:", err);
    return NextResponse.json({ error: "Failed to finalise Fapshi payment", orderId: null }, { status: 500 });
  }
}
