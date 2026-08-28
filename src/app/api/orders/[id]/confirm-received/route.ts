import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { query } from "@/lib/db";
import { sendCustomerReceivedConfirmationEmails } from "@/lib/email";
import { createAdminNotification } from "@/lib/notifications";
import { isOrderReference } from "@/lib/order-reference";

type Params = {
  params: Promise<{ id: string }>;
};

type OrderRow = {
  id: number;
  public_order_id: string;
  user_id: number;
  status: "Pending" | "Paid" | "Shipped" | "Delivered";
  received_confirmed_at: string | null;
  customer_name: string;
  customer_email: string;
};

export async function PATCH(_request: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const orderId = id.toUpperCase();
  if (!isOrderReference(orderId)) {
    return NextResponse.json({ error: "Invalid order id" }, { status: 400 });
  }

  try {
    const rows = await query<OrderRow[]>(
      "SELECT id, public_order_id, user_id, status, received_confirmed_at, customer_name, customer_email FROM orders WHERE public_order_id = ? AND user_id = ? LIMIT 1",
      [orderId, Number(session.user.id)],
    );

    const order = rows[0];
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.status !== "Delivered") {
      return NextResponse.json(
        { error: "You can confirm receipt after admin marks the order as Delivered" },
        { status: 400 },
      );
    }

    if (order.received_confirmed_at) {
      return NextResponse.json({ ok: true, alreadyConfirmed: true });
    }

    await query(
      "UPDATE orders SET received_confirmed_at = NOW() WHERE id = ? AND user_id = ?",
      [order.id, Number(session.user.id)],
    );


    await createAdminNotification({
      type: "order",
      title: `Order ${order.public_order_id} received by customer`,
      body: "Customer has confirmed package receipt.",
      link: `/admin/orders`,
    });

    await sendCustomerReceivedConfirmationEmails({
      orderId: order.public_order_id,
      customerName: order.customer_name,
      customerEmail: order.customer_email,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to confirm receipt" }, { status: 500 });
  }
}
