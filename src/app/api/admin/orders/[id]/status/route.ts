import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { sendOrderStatusChangedEmails } from "@/lib/email";
import { createUserNotification } from "@/lib/notifications";
import { orderStatusSchema } from "@/lib/validation";
import { toId } from "@/lib/utils";
import { requireStoreOrAdminApi } from "@/lib/authz";
import { validateSameOrigin } from "@/lib/request-security";

type Params = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, { params }: Params) {
  const originError = validateSameOrigin(request);
  if (originError) return originError;

  const access = await requireStoreOrAdminApi();
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { id } = await params;
  const orderId = toId(id);
  if (!orderId) {
    return NextResponse.json({ error: "Invalid order id" }, { status: 400 });
  }

  // Check store ownership for store owners
  if (!access.isSuperAdmin) {
    const existing = await query<Array<{ store_id: number }>>(
      "SELECT store_id FROM orders WHERE id = ?",
      [orderId]
    );
    if (!existing.length || !access.userStoreIds.includes(existing[0].store_id)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const payload = await request.json().catch(() => null);
  const parsed = orderStatusSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const rows = await query<Array<{ user_id: number; order_status: string; status: string; customer_name: string; customer_email: string; public_order_id: string }>>(
      "SELECT user_id, order_status, status, customer_name, customer_email, public_order_id FROM orders WHERE id = ? LIMIT 1",
      [orderId],
    );

    if (!rows[0]) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    await query(
      "UPDATE orders SET order_status = ?, status = ?, received_confirmed_at = CASE WHEN ? = 'Delivered' THEN received_confirmed_at ELSE NULL END WHERE id = ?",
      [parsed.data.status, parsed.data.status, parsed.data.status, orderId],
    );

    const currentStatus = rows[0].order_status || rows[0].status;
    if (currentStatus !== parsed.data.status) {
      await createUserNotification(rows[0].user_id, {
        type: "order",
        title: `Order ${rows[0].public_order_id} status updated`,
        body: `Your order is now marked as ${parsed.data.status}.`,
        link: `/orders/${rows[0].public_order_id}`,
      });

      await sendOrderStatusChangedEmails({
        orderId: rows[0].public_order_id,
        customerName: rows[0].customer_name,
        customerEmail: rows[0].customer_email,
        newStatus: parsed.data.status,
      });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to update order status" }, { status: 500 });
  }
}
