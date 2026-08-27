"use client";

import Link from "next/link";
import { OrderStatusBadge } from "@/components/order-status-badge";
import { useCart } from "@/context/cart-context";
import { useTranslation } from "@/hooks/use-translation";
import { formatPrice } from "@/lib/utils";
import type { Order } from "@/types";
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
  PlusCircle,
  Compass,
  MapPin,
  Navigation,
} from "lucide-react";

type UserProfileRow = {
  id: number;
  name: string;
  email: string;
  created_at: string;
};

type UserStore = {
  id: number;
  name: string;
  slug: string;
};

interface DashboardClientContentProps {
  userName: string;
  userEmail: string;
  profile: UserProfileRow | undefined;
  orders: Order[];
  recentOrders: Order[];
  paymentHistory: Order[];
  userStores: UserStore[];
  totalOrders: number;
  paidOrders: number;
  totalSpent: number;
  openSupportTickets: number;
}

export function DashboardClientContent({
  userName,
  userEmail,
  profile,
  recentOrders,
  paymentHistory,
  userStores,
  totalOrders,
  paidOrders,
  totalSpent,
  openSupportTickets,
}: DashboardClientContentProps) {
  const { t } = useTranslation();
  const { currency } = useCart();

  const paymentRef = (o: Order) => {
    const raw = o as unknown as Record<string, unknown>;
    const ref = (raw.paypal_transaction_id as string) || (raw.paypal_order_id as string) || "";
    return ref ? ref.substring(0, 16) + "…" : "—";
  };

  const accountNavItemsBase = [
    {
      href: "/dashboard",
      label: t("dashboard_nav_home"),
      helper: t("dashboard_nav_home_helper"),
      icon: LayoutDashboard,
      active: true,
    },
    {
      href: "/dashboard/visited-stores",
      label: "Visited Stores & GPS Map",
      helper: "Track locations of shops you visited",
      icon: Compass,
      active: false,
    },
    {
      href: "/dashboard/profile",
      label: t("dashboard_nav_profile"),
      helper: t("dashboard_nav_profile_helper"),
      icon: Settings,
      active: false,
    },
    {
      href: "/products",
      label: t("dashboard_nav_browse"),
      helper: t("dashboard_nav_browse_helper"),
      icon: PackageSearch,
      active: false,
    },
    {
      href: "/orders",
      label: t("dashboard_nav_orders"),
      helper: t("dashboard_nav_orders_helper"),
      icon: ReceiptText,
      active: false,
    },
    {
      href: "/chat",
      label: t("dashboard_nav_chat"),
      helper: t("dashboard_nav_chat_helper"),
      icon: Headset,
      active: false,
    },
    {
      href: "/contact",
      label: t("dashboard_nav_contact"),
      helper: t("dashboard_nav_contact_helper"),
      icon: Mail,
      active: false,
    },
    {
      href: "/privacy",
      label: t("dashboard_nav_privacy"),
      helper: t("dashboard_nav_privacy_helper"),
      icon: Shield,
      active: false,
    },
  ];

  const accountNavItems = [...accountNavItemsBase];
  if (userStores && userStores.length > 0) {
    const primary = userStores[0];
    accountNavItems.unshift({
      href: "/seller/dashboard",
      label: t("dashboard_nav_seller"),
      helper: primary?.name ? `Manage ${primary.name}` : t("dashboard_nav_seller_helper"),
      icon: Store,
      active: false,
    });
  } else {
    // User has no store — offer them a link to apply for one (at the top)
    accountNavItems.unshift({
      href: "/store/apply",
      label: t("dashboard_nav_open_store"),
      helper: t("dashboard_nav_open_store_helper"),
      icon: PlusCircle,
      active: false,
    });
  }

  return (
    <main className="container-shell py-12">
      {/* Mobile drawer */}
      <div className="mb-6 lg:hidden">
        <details className="group rounded-2xl border border-border bg-white p-3 shadow-sm">
          <summary className="flex cursor-pointer list-none items-center justify-between rounded-xl border border-border bg-surface px-3 py-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-foreground/50">{t("dashboard_account_menu")}</p>
              <p className="text-sm font-bold text-brand-deep">{t("dashboard_navigation")}</p>
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
              <p className="text-xs font-semibold uppercase tracking-wide text-foreground/50">{t("dashboard_account_menu")}</p>
              <p className="text-lg font-bold text-brand-deep">{t("dashboard_quick_nav")}</p>
              <p className="text-xs text-foreground/60">{t("dashboard_one_place")}</p>
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
            <p className="section-kicker text-brand">{t("dashboard_your_account")}</p>
            <h1 className="section-title mt-2 text-4xl font-bold text-brand-deep">
              {t("dashboard_welcome")}{profile?.name ? `, ${profile.name}` : ""}
            </h1>
            <p className="mt-2 text-lg text-foreground/60">{t("dashboard_subtitle")}</p>
          </div>

          {/* Stats Cards */}
          <div className="mb-12 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
            <article className="group rounded-2xl border border-border/50 bg-gradient-to-br from-white to-surface p-6 shadow-sm transition-all hover:shadow-md hover:border-brand/30">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-foreground/50">{t("dashboard_total_orders")}</p>
                  <p className="mt-3 text-3xl font-bold text-brand-deep">{totalOrders}</p>
                </div>
                <div className="rounded-lg bg-brand/10 p-3">
                  <ShoppingCart className="h-5 w-5 text-brand" />
                </div>
              </div>
              <p className="mt-4 text-xs text-foreground/60">{t("dashboard_all_time")}</p>
            </article>

            <article className="group rounded-2xl border border-border/50 bg-gradient-to-br from-white to-surface p-6 shadow-sm transition-all hover:shadow-md hover:border-brand/30">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-foreground/50">{t("dashboard_paid_orders")}</p>
                  <p className="mt-3 text-3xl font-bold text-green-600">{paidOrders}</p>
                </div>
                <div className="rounded-lg bg-green-100 p-3">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                </div>
              </div>
              <p className="mt-4 text-xs text-foreground/60">{t("dashboard_completed")}</p>
            </article>

            <article className="group rounded-2xl border border-border/50 bg-gradient-to-br from-white to-surface p-6 shadow-sm transition-all hover:shadow-md hover:border-brand/30">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-foreground/50">{t("dashboard_total_spent")}</p>
                  <p className="mt-3 text-3xl font-bold text-brand-deep">{formatPrice(totalSpent, currency)}</p>
                </div>
                <div className="rounded-lg bg-brand/10 p-3">
                  <TrendingUp className="h-5 w-5 text-brand" />
                </div>
              </div>
              <p className="mt-4 text-xs text-foreground/60">{t("dashboard_lifetime")}</p>
            </article>

            <article className="group rounded-2xl border border-border/50 bg-gradient-to-br from-white to-surface p-6 shadow-sm transition-all hover:shadow-md hover:border-brand/30">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-foreground/50">{t("dashboard_support")}</p>
                  <p className="mt-3 text-3xl font-bold text-orange-600">{openSupportTickets}</p>
                </div>
                <div className="rounded-lg bg-orange-100 p-3">
                  <MessageSquare className="h-5 w-5 text-orange-600" />
                </div>
              </div>
              <p className="mt-4 text-xs text-foreground/60">{t("dashboard_open_tickets")}</p>
            </article>
          </div>

          {/* Visited Stores & GPS Map Banner */}
          <div className="mb-12 rounded-3xl bg-gradient-to-r from-emerald-900 via-teal-900 to-emerald-950 p-6 sm:p-7 text-white shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center shrink-0">
                <Compass className="w-6 h-6 text-emerald-300" />
              </div>
              <div>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-300 uppercase tracking-wider">
                  <MapPin size={12} /> Google Maps Store Tracker
                </span>
                <h3 className="text-lg font-bold text-white mt-0.5">Physical Stores &amp; GPS Directory</h3>
                <p className="text-xs text-emerald-100/80 mt-1 max-w-xl">
                  Re-visit stores you&apos;ve browsed, check verified shop locations across Cameroon, and get turn-by-turn Google Maps directions.
                </p>
              </div>
            </div>
            <Link
              href="/dashboard/visited-stores"
              className="shrink-0 inline-flex items-center gap-2 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-extrabold text-xs px-6 py-3.5 shadow-md hover:shadow-lg transition-all active:scale-95"
            >
              <Navigation className="w-4 h-4" />
              View Visited Stores Map
            </Link>
          </div>

          {/* Main Grid */}
          <div className="mb-12 grid gap-8 lg:grid-cols-[1.5fr_0.8fr]">
            {/* Recent Orders */}
            <section className="rounded-2xl border border-border/50 bg-white p-8 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-brand-deep">{t("dashboard_recent_orders")}</h2>
                  <p className="mt-1 text-sm text-foreground/60">{t("dashboard_latest_purchases")}</p>
                </div>
                <Link href="/orders" className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-brand hover:bg-brand/5 transition-colors">
                  {t("dashboard_view_all")} <ChevronRight className="h-4 w-4" />
                </Link>
              </div>

              {recentOrders.length === 0 ? (
                <div className="rounded-xl border-2 border-dashed border-border/50 bg-surface/30 p-8 text-center">
                  <ShoppingCart className="mx-auto h-12 w-12 text-foreground/30 mb-3" />
                  <p className="text-sm font-medium text-foreground/60">{t("dashboard_no_orders")}</p>
                  <Link href="/products" className="mt-3 inline-block text-brand font-semibold hover:text-brand-deep">{t("dashboard_start_shopping")}</Link>
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
                            <p className="font-bold text-brand-deep">{formatPrice(Number(order.total_price), currency)}</p>
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
                  <h2 className="text-lg font-bold text-brand-deep">{t("dashboard_profile")}</h2>
                </div>
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="text-xs font-semibold uppercase text-foreground/50">{t("dashboard_name")}</p>
                    <p className="mt-1 font-medium text-foreground/80">{profile?.name ?? userName ?? "Customer"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase text-foreground/50">{t("dashboard_email")}</p>
                    <p className="mt-1 font-medium text-foreground/80 truncate">{profile?.email ?? userEmail ?? "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase text-foreground/50">{t("dashboard_member_since")}</p>
                    <p className="mt-1 font-medium text-foreground/80">{profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : "-"}</p>
                  </div>
                </div>
              </section>

              {/* Quick Actions */}
              <section className="rounded-2xl border border-border/50 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-bold text-brand-deep mb-4">{t("dashboard_quick_links")}</h2>
                <div className="space-y-2 text-sm font-medium">
                  <Link href="/products" className="flex items-center justify-between rounded-lg px-3 py-3 bg-brand/5 text-brand hover:bg-brand/10 transition-colors">
                    {t("dashboard_browse_products")} <ChevronRight className="h-4 w-4" />
                  </Link>
                  <Link href="/orders" className="flex items-center justify-between rounded-lg px-3 py-3 bg-green-100/50 text-green-700 hover:bg-green-100 transition-colors">
                    {t("dashboard_track_orders")} <ChevronRight className="h-4 w-4" />
                  </Link>
                  {userStores.length === 0 && (
                    <Link href="/store/apply" className="flex items-center justify-between rounded-lg px-3 py-3 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors border border-emerald-200/60 font-semibold">
                      <span className="flex items-center gap-1.5">
                        <PlusCircle className="h-4 w-4" />
                        {t("dashboard_open_store")}
                      </span>
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  )}
                  <Link href="/chat" className="flex items-center justify-between rounded-lg px-3 py-3 bg-orange-100/50 text-orange-700 hover:bg-orange-100 transition-colors">
                    {t("dashboard_support_chat")} <ChevronRight className="h-4 w-4" />
                  </Link>
                  <Link href="/contact" className="flex items-center justify-between rounded-lg px-3 py-3 bg-purple-100/50 text-purple-700 hover:bg-purple-100 transition-colors">
                    {t("dashboard_contact_team")} <ChevronRight className="h-4 w-4" />
                  </Link>
                  <Link href="/dashboard/profile" className="flex items-center justify-between rounded-lg px-3 py-3 bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors">
                    {t("dashboard_update_profile")} <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              </section>
            </div>
          </div>

          {/* Payment History */}
          {paymentHistory.length > 0 && (
            <section className="rounded-2xl border border-border/50 bg-white p-8 shadow-sm">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-brand-deep">{t("dashboard_payment_history")}</h2>
                <p className="mt-1 text-sm text-foreground/60">{t("dashboard_recent_transactions")}</p>
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
                        <td className="py-4 pr-4 font-bold text-brand-deep">{formatPrice(Number(order.total_price), currency)}</td>
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
  );
}
