import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { DashboardClientContent } from "@/components/dashboard-client-content";
import { requireUserPage } from "@/lib/authz";
import { query } from "@/lib/db";
import { StoreRepository } from "@/repositories/store.repository";
import type { Order } from "@/types";

export const metadata: Metadata = {
  robots: "noindex, nofollow",
};

type UserProfileRow = {
  id: number;
  name: string;
  email: string;
  created_at: string;
};

type TicketCountRow = {
  open_tickets: number;
};

export default async function CustomerDashboardPage() {
  const session = await requireUserPage();
  const role = (session.user as { role?: string } | undefined)?.role;

  // Keep admins in the admin area to avoid user-dashboard confusion.
  if (role === "admin" || role === "sub_admin") {
    redirect("/admin");
  }

  const userStoresList = await StoreRepository.getUserStores(Number(session.user.id));
  const referredStoreSlug = (session.user as { referredStoreSlug?: string | null } | undefined)?.referredStoreSlug;

  // Referred customers land on their owner index store page after login
  if (userStoresList.length === 0 && referredStoreSlug) {
    redirect(`/store/${referredStoreSlug}`);
  }

  const userId = Number(session.user.id);

  const [orders, profileRows, userStores] = await Promise.all([
    query<Order[]>("SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC", [userId]),
    query<UserProfileRow[]>(
      "SELECT id, name, email, created_at FROM users WHERE id = ? LIMIT 1",
      [userId],
    ),
    StoreRepository.getUserStores(userId),
  ]);

  const profile = profileRows[0];

  let openSupportTickets = 0;
  try {
    const ticketRows = await query<TicketCountRow[]>(
      "SELECT COUNT(*) AS open_tickets FROM admin_chat_conversations WHERE customer_id = ? AND status != 'closed'",
      [userId],
    );
    openSupportTickets = Number(ticketRows[0]?.open_tickets ?? 0);
  } catch {
    openSupportTickets = 0;
  }

  const totalOrders = orders.length;
  const paidOrders = orders.filter((o) => {
    const s = (o as unknown as Record<string, unknown>).order_status as string ?? o.status ?? "";
    return s === "Paid" || s === "Payment Confirmed" || s === "Shipped" || s === "Delivered" || s === "Completed" || s === "In Transit" || s === "Out for Delivery";
  }).length;

  const totalSpent = orders
    .filter((o) => {
      const s = (o as unknown as Record<string, unknown>).order_status as string ?? o.status ?? "";
      return s === "Paid" || s === "Payment Confirmed" || s === "Shipped" || s === "Delivered" || s === "Completed" || s === "In Transit" || s === "Out for Delivery";
    })
    .reduce((sum, o) => sum + Number(o.total_price), 0);

  const paymentHistory = orders
    .filter((o) => !!(o as unknown as Record<string, unknown>).paypal_order_id || !!(o as unknown as Record<string, unknown>).paypal_transaction_id)
    .slice(0, 8);

  const recentOrders = orders.slice(0, 5);

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand/5 to-transparent">
      <SiteHeader />
      <DashboardClientContent
        userName={session.user.name ?? "Customer"}
        userEmail={session.user.email ?? "-"}
        profile={profile}
        orders={orders}
        recentOrders={recentOrders}
        paymentHistory={paymentHistory}
        userStores={userStores}
        totalOrders={totalOrders}
        paidOrders={paidOrders}
        totalSpent={totalSpent}
        openSupportTickets={openSupportTickets}
      />
      <SiteFooter />
    </div>
  );
}

