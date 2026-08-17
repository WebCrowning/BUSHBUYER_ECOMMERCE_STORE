import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { OrderStatusBadge } from "@/components/order-status-badge";
import { requireUserPage } from "@/lib/authz";
import { query } from "@/lib/db";
import { StoreRepository } from "@/repositories/store.repository";
import { formatCurrency } from "@/lib/utils";
import type { Order } from "@/types";

export const metadata: Metadata = {
  robots: "noindex, nofollow",
};
import {
  ShoppingCart,
  TrendingUp,
  MessageSquare,
  User,
  ChevronRight,
  ChevronDown,
  LayoutDashboard,
  PackageSearch,
  ReceiptText,
  Headset,
  Mail,
  Shield,
  Settings,
  Store,
} from "lucide-react";

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
  const activeOrders = orders.filter((o) => {
    const s = (o as unknown as Record<string, unknown>).order_status as string ?? o.status ?? "";
    return s !== "Delivered" && s !== "Completed";
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

  const paymentRef = (o: Order) => {
    const raw = o as unknown as Record<string, unknown>;
    const ref = (raw.paypal_transaction_id as string) || (raw.paypal_order_id as string) || "";
    return ref ? ref.substring(0, 16) + "…" : "—";
  };

  const recentOrders = orders.slice(0, 5);

  const accountNavItemsBase = [
    {
      href: "/dashboard",
      label: "Dashboard Home",
      helper: "Overview and account summary",
      icon: LayoutDashboard,
      active: true,
    },
    {
      href: "/dashboard/profile",
      label: "Profile Settings",
      helper: "Update your account details",
      icon: Settings,
      active: false,
    },
    {
      href: "/products",
      label: "Browse Products",
      helper: "Find and shop food items",
      icon: PackageSearch,
      active: false,
    },
    {
      href: "/orders",
      label: "My Orders",
      helper: "Track shipping and status",
      icon: ReceiptText,
      active: false,
    },
    {
      href: "/chat",
      label: "Support Chat",
      helper: "Chat with support team",
      icon: Headset,
      active: false,
    },
    {
      href: "/contact",
      label: "Contact Us",
      helper: "Send message to our team",
      icon: Mail,
      active: false,
    },
    {
      href: "/privacy",
      label: "Privacy Policy",
      helper: "Understand data handling",
      icon: Shield,
      active: false,
    },
  ];

  const accountNavItems = [...accountNavItemsBase];
  if (userStores && userStores.length > 0) {
    const primary = userStores[0];
    accountNavItems.unshift({
      href: "/seller/dashboard",
      label: "Seller Portal",
      helper: primary?.name ? `Manage ${primary.name}` : "Manage your store",
      icon: Store,
      active: false,
    });
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand/5 to-transparent">
      <SiteHeader />
      <main className="container-shell py-12">
        <div className="mb-6 lg:hidden">
          <details className="group rounded-2xl border border-border bg-white p-3 shadow-sm">
            <summary className="flex cursor-pointer list-none items-center justify-between rounded-xl border border-border bg-surface px-3 py-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-foreground/50">Account Menu</p>
                <p className="text-sm font-bold text-brand-deep">Dashboard Navigation</p>
              </div>
              <ChevronDown className="h-4 w-4 text-foreground/70 transition-transform group-open:rotate-180" />
            </summary>
            <div className="mt-3 grid gap-2">
              {accountNavItems.map((item) => {
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`rounded-xl border px-3 py-2 transition-colors ${
                      item.active
                        ? "border-brand/30 bg-brand/10"
                        : "border-border bg-white hover:bg-surface-soft"
                    }`}
                  >
                    <span className="flex items-start gap-3">
                      <span className="rounded-lg bg-surface p-2">
                        <Icon className="h-4 w-4 text-brand" />
                      </span>
                      <span>
                        <span className="block text-sm font-semibold text-foreground">{item.label}</span>
                        <span className="block text-xs text-foreground/60">{item.helper}</span>
                      </span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </details>
        </div>

        <div className="grid gap-8 lg:grid-cols-[260px_1fr] lg:items-start">
          <aside className="hidden lg:block lg:sticky lg:top-24">
            <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
              <div className="mb-3 border-b border-border pb-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-foreground/50">Account Menu</p>
                <p className="text-lg font-bold text-brand-deep">Quick Navigation</p>
                <p className="text-xs text-foreground/60">Everything in one place</p>
              </div>
              <nav className="space-y-2">
                {accountNavItems.map((item) => {
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`block rounded-xl border px-3 py-2 transition-colors ${
                        item.active
                          ? "border-brand/30 bg-brand/10"
                          : "border-border bg-white hover:bg-surface-soft"
                      }`}
                    >
                      <span className="flex items-start gap-3">
                        <span className="rounded-lg bg-surface p-2">
                          <Icon className="h-4 w-4 text-brand" />
                        </span>
                        <span>
                          <span className="block text-sm font-semibold text-foreground">{item.label}</span>
                          <span className="block text-xs text-foreground/60">{item.helper}</span>
                        </span>
                      </span>
                    </Link>
                  );
                })}
              </nav>
            </div>
          </aside>

          <div>
            {/* Header */}
            <div className="mb-12">
              <p className="section-kicker text-brand">Your Account</p>
              <h1 className="section-title mt-2 text-4xl font-bold text-brand-deep">Welcome back{profile?.name ? `, ${profile.name}` : ""}</h1>
              <p className="mt-2 text-lg text-foreground/60">Track your orders and manage your account</p>
            </div>

            {/* Stats Cards */}
            <div className="mb-12 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          <article className="group rounded-2xl border border-border/50 bg-gradient-to-br from-white to-surface p-6 shadow-sm transition-all hover:shadow-md hover:border-brand/30">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-foreground/50">Total Orders</p>
                <p className="mt-3 text-3xl font-bold text-brand-deep">{totalOrders}</p>
              </div>
              <div className="rounded-lg bg-brand/10 p-3">
                <ShoppingCart className="h-5 w-5 text-brand" />
              </div>
            </div>
            <p className="mt-4 text-xs text-foreground/60">All time purchases</p>
          </article>

          <article className="group rounded-2xl border border-border/50 bg-gradient-to-br from-white to-surface p-6 shadow-sm transition-all hover:shadow-md hover:border-brand/30">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-foreground/50">Paid Orders</p>
                <p className="mt-3 text-3xl font-bold text-green-600">{paidOrders}</p>
              </div>
              <div className="rounded-lg bg-green-100 p-3">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
            </div>
            <p className="mt-4 text-xs text-foreground/60">Successfully completed</p>
          </article>

          <article className="group rounded-2xl border border-border/50 bg-gradient-to-br from-white to-surface p-6 shadow-sm transition-all hover:shadow-md hover:border-brand/30">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-foreground/50">Total Spent</p>
                <p className="mt-3 text-3xl font-bold text-brand-deep">{formatCurrency(totalSpent, "USD")}</p>
              </div>
              <div className="rounded-lg bg-brand/10 p-3">
                <TrendingUp className="h-5 w-5 text-brand" />
              </div>
            </div>
            <p className="mt-4 text-xs text-foreground/60">Your lifetime value</p>
          </article>

          <article className="group rounded-2xl border border-border/50 bg-gradient-to-br from-white to-surface p-6 shadow-sm transition-all hover:shadow-md hover:border-brand/30">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-foreground/50">Support</p>
                <p className="mt-3 text-3xl font-bold text-orange-600">{openSupportTickets}</p>
              </div>
              <div className="rounded-lg bg-orange-100 p-3">
                <MessageSquare className="h-5 w-5 text-orange-600" />
              </div>
            </div>
            <p className="mt-4 text-xs text-foreground/60">Open tickets</p>
          </article>
          </div>

          {/* Main Grid */}
          <div className="mb-12 grid gap-8 lg:grid-cols-[1.5fr_0.8fr]">
          {/* Recent Orders */}
          <section className="rounded-2xl border border-border/50 bg-white p-8 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-brand-deep">Recent Orders</h2>
                <p className="mt-1 text-sm text-foreground/60">Your latest purchases</p>
              </div>
              <Link href="/orders" className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-brand hover:bg-brand/5 transition-colors">
                View all <ChevronRight className="h-4 w-4" />
              </Link>
            </div>

            {recentOrders.length === 0 ? (
              <div className="rounded-xl border-2 border-dashed border-border/50 bg-surface/30 p-8 text-center">
                <ShoppingCart className="mx-auto h-12 w-12 text-foreground/30 mb-3" />
                <p className="text-sm font-medium text-foreground/60">No orders yet</p>
                <Link href="/products" className="mt-3 inline-block text-brand font-semibold hover:text-brand-deep">Start shopping →</Link>
              </div>
            ) : (
              <div className="space-y-3">
                {recentOrders.map((order) => (
                  <Link key={order.id} href={`/orders/${order.public_order_id}`} className="group block">
                    <article className="rounded-xl border border-border/50 bg-gradient-to-r from-surface/50 to-transparent p-4 transition-all hover:border-brand/30 hover:bg-surface/80">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-foreground/90 text-sm">Order {order.public_order_id}</p>
                          <p className="text-xs text-foreground/50 mt-1">{new Date(order.created_at).toLocaleDateString()}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <OrderStatusBadge status={order.status} />
                          <p className="font-bold text-brand-deep">{formatCurrency(Number(order.total_price), "USD")}</p>
                        </div>
                      </div>
                    </article>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Profile */}
            <section className="rounded-2xl border border-border/50 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="rounded-lg bg-brand/10 p-3">
                  <User className="h-5 w-5 text-brand" />
                </div>
                <h2 className="text-lg font-bold text-brand-deep">Profile</h2>
              </div>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-xs font-semibold uppercase text-foreground/50">Name</p>
                  <p className="mt-1 font-medium text-foreground/80">{profile?.name ?? session.user.name ?? "Customer"}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-foreground/50">Email</p>
                  <p className="mt-1 font-medium text-foreground/80 truncate">{profile?.email ?? session.user.email ?? "-"}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-foreground/50">Member Since</p>
                  <p className="mt-1 font-medium text-foreground/80">{profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : "-"}</p>
                </div>
              </div>
            </section>

            {/* Quick Actions */}
            <section className="rounded-2xl border border-border/50 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-brand-deep mb-4">Quick Links</h2>
              <div className="space-y-2 text-sm font-medium">
                <Link href="/products" className="flex items-center justify-between rounded-lg px-3 py-3 bg-brand/5 text-brand hover:bg-brand/10 transition-colors">
                  Browse Products <ChevronRight className="h-4 w-4" />
                </Link>
                <Link href="/orders" className="flex items-center justify-between rounded-lg px-3 py-3 bg-green-100/50 text-green-700 hover:bg-green-100 transition-colors">
                  Track Orders <ChevronRight className="h-4 w-4" />
                </Link>
                <Link href="/chat" className="flex items-center justify-between rounded-lg px-3 py-3 bg-orange-100/50 text-orange-700 hover:bg-orange-100 transition-colors">
                  Support Chat <ChevronRight className="h-4 w-4" />
                </Link>
                <Link href="/contact" className="flex items-center justify-between rounded-lg px-3 py-3 bg-purple-100/50 text-purple-700 hover:bg-purple-100 transition-colors">
                  Contact Team <ChevronRight className="h-4 w-4" />
                </Link>
                <Link href="/dashboard/profile" className="flex items-center justify-between rounded-lg px-3 py-3 bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors">
                  Update Profile <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            </section>
          </div>
            </div>

            {/* Payment History */}
            {paymentHistory.length > 0 && (
              <section className="rounded-2xl border border-border/50 bg-white p-8 shadow-sm">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-brand-deep">Payment History</h2>
                  <p className="mt-1 text-sm text-foreground/60">Recent transactions</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b-2 border-brand/10 text-foreground/60">
                        <th className="py-3 pr-4 text-left font-semibold">Order</th>
                        <th className="py-3 pr-4 text-left font-semibold">Payment ID</th>
                        <th className="py-3 pr-4 text-left font-semibold">Status</th>
                        <th className="py-3 pr-4 text-left font-semibold">Amount</th>
                        <th className="py-3 text-left font-semibold">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paymentHistory.map((order) => (
                        <tr key={order.id} className="border-b border-border/30 transition-colors hover:bg-surface/50">
                          <td className="py-4 pr-4 font-semibold text-foreground/80">{order.public_order_id}</td>
                          <td className="py-4 pr-4 text-xs font-mono text-foreground/60">{paymentRef(order)}</td>
                          <td className="py-4 pr-4"><OrderStatusBadge status={order.status} /></td>
                          <td className="py-4 pr-4 font-bold text-brand-deep">{formatCurrency(Number(order.total_price), "USD")}</td>
                          <td className="py-4 text-foreground/60">{new Date(order.created_at).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
