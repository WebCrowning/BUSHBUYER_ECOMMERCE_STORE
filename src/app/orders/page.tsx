import type { Metadata } from "next";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { OrdersClientContent } from "@/components/orders-client-content";
import { requireUserPage } from "@/lib/authz";
import { query } from "@/lib/db";
import type { Order } from "@/types";

export const metadata: Metadata = {
  robots: "noindex, nofollow",
};

export default async function OrdersPage() {
  const session = await requireUserPage();
  const rawUserId = Number(session.user?.id);
  const userId = !isNaN(rawUserId) && rawUserId > 0 ? rawUserId : 0;
  const userEmail = session.user?.email ?? "";

  let orders: Order[] = [];
  try {
    if (userId > 0 && userEmail) {
      orders = await query<Order[]>(
        "SELECT * FROM orders WHERE user_id = ? OR customer_email = ? ORDER BY created_at DESC",
        [userId, userEmail],
      );
    } else if (userId > 0) {
      orders = await query<Order[]>(
        "SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC",
        [userId],
      );
    } else if (userEmail) {
      orders = await query<Order[]>(
        "SELECT * FROM orders WHERE customer_email = ? ORDER BY created_at DESC",
        [userEmail],
      );
    }
  } catch (error) {
    console.error("Error loading orders:", error);
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <OrdersClientContent orders={orders} />
      <SiteFooter />
    </div>
  );
}
