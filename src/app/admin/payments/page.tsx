"use client";

import { useCallback, useEffect, useState } from "react";
import {
  DollarSign,
  TrendingUp,
  Smartphone,
  CreditCard,
  Percent,
  Clock,
  ArrowUpRight,
  RefreshCw,
  ShieldCheck,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import type { PaymentDashboardStats, PaymentTransactionRow } from "@/types/marketplace";

function StatCard({
  icon,
  label,
  value,
  sub,
  accent = "brand",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  accent?: "brand" | "blue" | "orange" | "purple" | "amber";
}) {
  const accentMap: Record<string, string> = {
    brand: "bg-emerald-50 text-emerald-700 border-emerald-100",
    blue: "bg-blue-50 text-blue-700 border-blue-100",
    orange: "bg-orange-50 text-orange-700 border-orange-100",
    purple: "bg-purple-50 text-purple-700 border-purple-100",
    amber: "bg-amber-50 text-amber-700 border-amber-100",
  };
  const iconBg: Record<string, string> = {
    brand: "bg-emerald-100 text-emerald-600",
    blue: "bg-blue-100 text-blue-600",
    orange: "bg-orange-100 text-orange-600",
    purple: "bg-purple-100 text-purple-600",
    amber: "bg-amber-100 text-amber-600",
  };

  return (
    <div className="bg-white rounded-2xl border border-border/50 p-6 shadow-sm">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg[accent]}`}>
          {icon}
        </div>
        <span className={`text-xs font-semibold px-2 py-1 rounded-lg border ${accentMap[accent]}`}>
          {label}
        </span>
      </div>
      <p className="text-2xl font-bold text-foreground/90 tabular-nums">{value}</p>
      {sub && <p className="text-xs text-foreground/50 mt-1">{sub}</p>}
    </div>
  );
}

function GatewayDonut({ paypal, fapshi }: { paypal: number; fapshi: number }) {
  const total = paypal + fapshi || 1;
  const paypalPct = Math.round((paypal / total) * 100);
  const fapshiPct = 100 - paypalPct;

  // Simple CSS donut using conic-gradient
  const donutStyle = {
    background: `conic-gradient(#3b82f6 0% ${paypalPct}%, #f97316 ${paypalPct}% 100%)`,
  };

  return (
    <div className="bg-white rounded-2xl border border-border/50 p-6 shadow-sm">
      <h3 className="font-bold text-sm text-foreground/70 mb-4">Gateway Breakdown</h3>
      <div className="flex items-center gap-6">
        <div
          className="w-20 h-20 rounded-full flex-shrink-0 relative"
          style={donutStyle}
        >
          <div className="absolute inset-2.5 rounded-full bg-white" />
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-blue-500 flex-shrink-0" />
            <span className="text-foreground/60">PayPal</span>
            <span className="font-bold ml-auto">{paypalPct}%</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-orange-500 flex-shrink-0" />
            <span className="text-foreground/60">Mobile Money</span>
            <span className="font-bold ml-auto">{fapshiPct}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const GATEWAY_BADGES: Record<string, string> = {
  paypal: "bg-blue-50 text-blue-700 border-blue-200",
  fapshi: "bg-orange-50 text-orange-700 border-orange-200",
};

const STATUS_BADGES: Record<string, string> = {
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  failed: "bg-red-50 text-red-700 border-red-200",
  refunded: "bg-purple-50 text-purple-700 border-purple-200",
};

export default function AdminPaymentsDashboardPage() {
  const [stats, setStats] = useState<PaymentDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/payments/dashboard");
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to load financial dashboard");
      }
      const data = await res.json();
      setStats(data.stats);
    } catch (e: any) {
      setError(e.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchStats();
  }, [fetchStats]);

  const fmt = (n: number, currency = "USD") =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(n);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground/90">Financial Dashboard</h1>
          <p className="text-sm text-foreground/55 mt-1">
            Platform revenue, gateway volumes, commissions &amp; withdrawals
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={fetchStats}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl border border-border/50 bg-white px-4 py-2.5 text-sm font-semibold text-foreground/70 transition-all hover:bg-surface-soft disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <Link
            href="/admin/wallets"
            className="flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-deep"
          >
            <ShieldCheck className="h-4 w-4" />
            Manage Wallets
          </Link>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading && !stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-border/50 p-6 shadow-sm animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-2/3 mb-3" />
              <div className="h-7 bg-gray-200 rounded w-1/2" />
            </div>
          ))}
        </div>
      )}

      {stats && (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={<DollarSign className="h-5 w-5" />}
              label="Total Revenue"
              value={fmt(stats.totalRevenue)}
              sub="All gateways combined"
              accent="brand"
            />
            <StatCard
              icon={<CreditCard className="h-5 w-5" />}
              label="PayPal Volume"
              value={fmt(stats.paypalVolume)}
              sub={`+${fmt(stats.paypalVolumeLast30)} last 30 days`}
              accent="blue"
            />
            <StatCard
              icon={<Smartphone className="h-5 w-5" />}
              label="Mobile Money"
              value={fmt(stats.fapshiVolume)}
              sub={`+${fmt(stats.fapshiVolumeLast30)} last 30 days`}
              accent="orange"
            />
            <StatCard
              icon={<Percent className="h-5 w-5" />}
              label="Platform Commission"
              value={fmt(stats.totalCommission)}
              sub={`+${fmt(stats.commissionLast30)} last 30 days`}
              accent="purple"
            />
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={<TrendingUp className="h-5 w-5" />}
              label="Seller Payouts"
              value={fmt(stats.totalSellerPayouts)}
              sub="Net credited to seller wallets"
              accent="brand"
            />
            <StatCard
              icon={<Clock className="h-5 w-5" />}
              label="Pending Withdrawals"
              value={String(stats.pendingWithdrawalsCount)}
              sub={`${fmt(stats.pendingWithdrawalsAmount)} awaiting approval`}
              accent="amber"
            />

            {/* Gateway Donut spanning 2 cols */}
            <div className="col-span-2">
              <GatewayDonut
                paypal={stats.gatewayBreakdown.paypal}
                fapshi={stats.gatewayBreakdown.fapshi}
              />
            </div>
          </div>

          {/* Recent Transactions */}
          <div className="bg-white rounded-2xl border border-border/50 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-border/30 flex items-center justify-between">
              <h3 className="font-bold text-foreground/90">Recent Transactions</h3>
              <Link
                href="/admin/wallets"
                className="flex items-center gap-1 text-xs font-semibold text-brand hover:text-brand-deep transition-colors"
              >
                View All <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/20 bg-surface-soft/50">
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-foreground/50">Order ID</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-foreground/50">Gateway</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-foreground/50">Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-foreground/50">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-foreground/50">Customer</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-foreground/50">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {stats.recentTransactions.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-sm text-foreground/40">
                        No transactions found
                      </td>
                    </tr>
                  )}
                  {stats.recentTransactions.map((tx: PaymentTransactionRow) => (
                    <tr key={tx.id} className="hover:bg-surface-soft/40 transition-colors">
                      <td className="px-6 py-3">
                        <span className="font-mono text-xs font-semibold text-foreground/70">
                          {tx.master_order_id}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded-full border capitalize ${
                            GATEWAY_BADGES[tx.payment_gateway] || "bg-gray-50 text-gray-600 border-gray-200"
                          }`}
                        >
                          {tx.payment_gateway === "fapshi" ? "Mobile Money" : tx.payment_gateway}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold tabular-nums text-foreground/80">
                        {fmt(tx.amount, tx.currency)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded-full border capitalize ${
                            STATUS_BADGES[tx.transaction_status] || "bg-gray-50 text-gray-600 border-gray-200"
                          }`}
                        >
                          {tx.transaction_status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-foreground/60 text-xs">
                        {tx.customer_name || `Customer #${tx.customer_id}`}
                      </td>
                      <td className="px-4 py-3 text-foreground/50 text-xs tabular-nums whitespace-nowrap">
                        {new Date(tx.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quick Actions */}
          {stats.pendingWithdrawalsCount > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-800">
                    {stats.pendingWithdrawalsCount} withdrawal request{stats.pendingWithdrawalsCount !== 1 ? "s" : ""} awaiting approval
                  </p>
                  <p className="text-xs text-amber-600">
                    Total: {fmt(stats.pendingWithdrawalsAmount)} pending
                  </p>
                </div>
              </div>
              <Link
                href="/admin/wallets"
                className="flex items-center gap-1.5 rounded-xl bg-amber-600 px-4 py-2 text-xs font-semibold text-white whitespace-nowrap transition-colors hover:bg-amber-700"
              >
                Review Withdrawals <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}
