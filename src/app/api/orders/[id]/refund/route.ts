import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { query } from "@/lib/db";
import { PaymentService } from "@/services/payment.service";

function canRefund(role?: string) {
  return (
    role === "super_admin" ||
    role === "platform_admin" ||
    role === "finance_admin"
  );
}

type OrderRow = {
  id: number;
  public_order_id: string;
  master_order_id: string;
  store_id: number;
  payment_status: string;
  payment_gateway: string;
  paypal_transaction_id: string | null;
  fapshi_trans_id: string | null;
  total_price: number;
};

/**
 * POST /api/orders/[orderId]/refund
 * Finance Admin / Super Admin only.
 * Body: { amount: number, reason: string, type: "full" | "partial" }
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const role = (session?.user as { role?: string })?.role;

    if (!session?.user?.id || !canRefund(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: orderId } = await params;
    const body = await request.json().catch(() => null);

    if (!body?.amount || !body?.reason) {
      return NextResponse.json(
        { error: "amount and reason are required" },
        { status: 400 }
      );
    }

    const { amount, reason, type = "full" } = body as {
      amount: number;
      reason: string;
      type?: "full" | "partial";
    };

    if (Number(amount) <= 0) {
      return NextResponse.json({ error: "Refund amount must be greater than 0" }, { status: 400 });
    }

    // Fetch the order
    const orders = await query<OrderRow[]>(
      `SELECT id, public_order_id, master_order_id, store_id, payment_status,
              payment_gateway, paypal_transaction_id, fapshi_trans_id, total_price
       FROM orders
       WHERE public_order_id = ? OR master_order_id = ?
       LIMIT 1`,
      [orderId, orderId]
    );

    if (orders.length === 0) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const order = orders[0];

    if (order.payment_status === "Refunded") {
      return NextResponse.json({ error: "Order has already been fully refunded" }, { status: 400 });
    }

    if (Number(amount) > Number(order.total_price)) {
      return NextResponse.json(
        { error: "Refund amount cannot exceed the order total" },
        { status: 400 }
      );
    }

    const gateway = (order.payment_gateway || "paypal") as "paypal" | "fapshi";
    const paymentReference =
      gateway === "fapshi"
        ? (order.fapshi_trans_id || order.public_order_id)
        : (order.paypal_transaction_id || order.public_order_id);

    // Process refund: updates wallet and logs ledger entry
    await PaymentService.processRefund(
      order.master_order_id || order.public_order_id,
      order.store_id,
      gateway,
      paymentReference,
      Number(amount),
      reason
    );

    // Update order payment_status
    const newPaymentStatus = type === "full" ? "Refunded" : "Partially Refunded";
    await query(
      "UPDATE orders SET payment_status = ? WHERE id = ?",
      [newPaymentStatus, order.id]
    );

    return NextResponse.json({
      ok: true,
      orderId: order.public_order_id,
      refundedAmount: amount,
      newPaymentStatus,
    });
  } catch (err) {
    console.error("[Refund Route] Error:", err);
    return NextResponse.json(
      { error: "Failed to process refund. Please contact support if payment was charged." },
      { status: 500 }
    );
  }
}
