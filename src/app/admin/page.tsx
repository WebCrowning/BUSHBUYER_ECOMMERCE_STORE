"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import { OrderStatusBadge } from "@/components/order-status-badge";

type StatsRow = {
  totalOrders: number;
  revenue: number;
  pendingOrders: number;
  deliveredOrders: number;
  productsCount: number;
  lowStockProducts: number;
  openSupportTickets: number;
  contactMessages: number;
};

type RecentOrderRow = {
  id: number;
  public_order_id: string;
  customer_name: string;
  status: "Pending" | "Paid" | "Shipped" | "Delivered";
  total_price: number;
  created_at: string;
};

const EMPTY_STATS: StatsRow = {
  totalOrders: 0,
  revenue: 0,
  pendingOrders: 0,
  deliveredOrders: 0,
  productsCount: 0,
  lowStockProducts: 0,
  openSupportTickets: 0,
  contactMessages: 0,
};

export default function AdminPage() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<StatsRow | null>(null);
  const [recentOrders, setRecentOrders] = useState<RecentOrderRow[]>([]);
  const [startDate, setStartDate] = useState<string>(searchParams.get("startDate") ?? "");
  const [endDate, setEndDate] = useState<string>(searchParams.get("endDate") ?? "");

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (startDate) params.append("startDate", startDate);
        if (endDate) params.append("endDate", endDate);

        const res = await fetch(`/api/admin/stats?${params.toString()}`);
        if (!res.ok) {
          throw new Error("Failed to fetch admin stats");
        }

        const data = await res.json();
        setStats(data?.stats ?? EMPTY_STATS);
        setRecentOrders(Array.isArray(data?.recentOrders) ? data.recentOrders : []);
      } catch (err) {
        console.error("Error fetching stats:", err);
        setStats(EMPTY_STATS);
        setRecentOrders([]);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [startDate, endDate]);

  const handlePreset = (days: number | null) => {
    if (days === null) {
      setStartDate("");
      setEndDate("");
    } else {
      const today = new Date();
      const start = new Date();
      start.setDate(today.getDate() - days);
      setStartDate(start.toISOString().split("T")[0]);
      setEndDate(today.toISOString().split("T")[0]);
    }
  };

  const completionRate =
    stats && stats.totalOrders > 0
      ? Math.round((Number(stats.deliveredOrders) / Number(stats.totalOrders)) * 100)
      : 0;

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-border/70 bg-gradient-to-br from-brand/10 via-white to-amber-50 p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-foreground/60">Super Admin Master Overview</p>
            <h2 className="mt-2 text-3xl font-extrabold text-brand-deep">Marketplace Control Center</h2>
            <p className="mt-2 text-sm text-foreground/70">
              {startDate || endDate
                ? `Showing data from ${startDate ? new Date(startDate).toLocaleDateString() : "start"} to ${endDate ? new Date(endDate).toLocaleDateString() : "now"}`
                : "Manage stores, vendor staff, wallets, products, and order fulfillment across all marketplace stores."}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-end gap-3">
            <Link
              href="/seller/dashboard"
              className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-2xl text-xs font-bold shadow transition-colors"
            >
              Open Vendor Portal &rarr;
            </Link>
            <div className="rounded-2xl border border-brand/20 bg-white/90 px-4 py-3 text-right shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-foreground/60">Delivery Completion</p>
              <p className="mt-1 text-2xl font-extrabold text-brand-deep">{loading ? "..." : `${completionRate}%`}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-white p-5 shadow-sm">
        <h3 className="text-lg font-bold text-brand-deep mb-4">Filter by Date Range</h3>
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => handlePreset(null)}
            className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${
              !startDate && !endDate
                ? "bg-brand text-white"
                : "border border-border hover:bg-surface"
            }`}
          >
            All Time
          </button>
          <button
            onClick={() => handlePreset(7)}
            className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${
              startDate && !endDate && new Date(startDate) > new Date(Date.now() - 8 * 24 * 60 * 60 * 1000)
                ? "bg-brand text-white"
                : "border border-border hover:bg-surface"
            }`}
          >
            Last 7 Days
          </button>
          <button
            onClick={() => handlePreset(30)}
            className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${
              startDate && !endDate && new Date(startDate) > new Date(Date.now() - 31 * 24 * 60 * 60 * 1000)
                ? "bg-brand text-white"
                : "border border-border hover:bg-surface"
            }`}
          >
            Last 30 Days
          </button>
        </div>
        <div className="flex flex-wrap gap-3">
          <div>
            <label className="block text-xs font-semibold text-foreground/60 mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-foreground/60 mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>
        </div>
      </section>


      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-border bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-foreground/60">Total Orders</p>
          <p className="mt-2 text-3xl font-extrabold text-brand-deep">{loading ? "..." : stats?.totalOrders ?? 0}</p>
          <p className="mt-2 text-xs text-foreground/60">All customer purchases</p>
        </article>
        <article className="rounded-2xl border border-border bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-foreground/60">Revenue</p>
          <p className="mt-2 text-3xl font-extrabold text-brand-deep">
            {loading ? "..." : formatCurrency(Number(stats?.revenue ?? 0), "USD")}
          </p>
          <p className="mt-2 text-xs text-foreground/60">Gross order value</p>
        </article>
        <article className="rounded-2xl border border-border bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-foreground/60">Pending Orders</p>
          <p className="mt-2 text-3xl font-extrabold text-amber-600">{loading ? "..." : stats?.pendingOrders ?? 0}</p>
          <p className="mt-2 text-xs text-foreground/60">Require fulfillment action</p>
        </article>
        <article className="rounded-2xl border border-border bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-foreground/60">Delivered</p>
          <p className="mt-2 text-3xl font-extrabold text-emerald-600">{loading ? "..." : stats?.deliveredOrders ?? 0}</p>
          <p className="mt-2 text-xs text-foreground/60">Successfully completed</p>
        </article>
      </section>

      <section className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-bold text-brand-deep">Recent Orders</h3>
            <Link href="/admin/orders" className="text-sm font-semibold text-brand hover:text-brand-deep">
              Open orders
            </Link>
          </div>

          {loading ? (
            <p className="rounded-xl border border-border bg-surface p-4 text-sm text-foreground/70">Loading orders...</p>
          ) : (recentOrders?.length ?? 0) === 0 ? (
            <p className="rounded-xl border border-border bg-surface p-4 text-sm text-foreground/70">No orders in this period.</p>
          ) : (
            <div className="space-y-3">
              {(recentOrders ?? []).map((order) => (
                <article key={order.id} className="rounded-xl border border-border bg-surface/70 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-foreground/80">Order {order.public_order_id}</p>
                      <p className="text-xs text-foreground/60">
                        {order.customer_name} • {new Date(order.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <OrderStatusBadge status={order.status} />
                      <p className="text-sm font-extrabold text-brand-deep">
                        {formatCurrency(Number(order.total_price), "USD")}
                      </p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
            <h3 className="text-lg font-bold text-brand-deep">Inventory Snapshot</h3>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-brand/10 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-foreground/60">Products</p>
                <p className="mt-1 text-2xl font-extrabold text-brand-deep">{stats?.productsCount ?? 0}</p>
              </div>
              <div className="rounded-xl bg-red-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-foreground/60">Low Stock</p>
                <p className="mt-1 text-2xl font-extrabold text-red-600">{stats?.lowStockProducts ?? 0}</p>
              </div>
            </div>
            <Link href="/admin/products" className="mt-4 inline-block text-sm font-semibold text-brand hover:text-brand-deep">
              Manage products
            </Link>
            <Link href="/admin/inventory" className="mt-2 inline-block text-sm font-semibold text-brand hover:text-brand-deep">
              Monitor stock availability
            </Link>
          </div>

          <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
            <h3 className="text-lg font-bold text-brand-deep">Support Queue</h3>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between rounded-xl bg-surface p-3">
                <span className="font-semibold text-foreground/70">Open chat tickets</span>
                <span className="text-xl font-extrabold text-brand-deep">{stats?.openSupportTickets ?? 0}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-surface p-3">
                <span className="font-semibold text-foreground/70">Open contact messages</span>
                <span className="text-xl font-extrabold text-brand-deep">{stats?.contactMessages ?? 0}</span>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <Link
                href="/admin/chat"
                className="rounded-full border border-border px-4 py-1.5 text-xs font-semibold hover:bg-surface-soft"
              >
                Open chat
              </Link>
              <Link
                href="/admin/messages"
                className="rounded-full border border-border px-4 py-1.5 text-xs font-semibold hover:bg-surface-soft"
              >
                Open messages
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
