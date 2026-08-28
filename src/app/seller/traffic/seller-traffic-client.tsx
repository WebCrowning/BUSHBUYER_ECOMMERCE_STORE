"use client";

import { useCallback, useEffect, useState } from "react";
import type { Store } from "@/types/marketplace";
import {
  BarChart3,
  Users,
  Eye,
  Clock,
  RefreshCw,
  TrendingUp,
  Globe,
  ArrowUpRight,
  Smartphone,
  Monitor,
  Tablet,
  Laptop,
  Bot,
  Layers,
} from "lucide-react";
import Link from "next/link";

type Summary = {
  totalPageViews: number;
  uniqueVisitors: number;
  avgLoadMs: number | null;
};

type TopPage = {
  path: string;
  pageViews: number;
  uniqueVisitors: number;
  avgLoadMs: number | null;
  topCountry: string | null;
  topDevice?: string | null;
};

type DailyTrend = {
  date: string;
  views: number;
  visitors: number;
};

type Referrer = {
  referrer: string;
  cnt: number;
};

type DeviceData = {
  device: string;
  views: number;
  visitors: number;
};

export default function SellerTrafficClient({ store }: { store: Store }) {
  const [days, setDays] = useState<number | null>(30);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<Summary>({ totalPageViews: 0, uniqueVisitors: 0, avgLoadMs: null });
  const [topPages, setTopPages] = useState<TopPage[]>([]);
  const [dailyTrend, setDailyTrend] = useState<DailyTrend[]>([]);
  const [topReferrers, setTopReferrers] = useState<Referrer[]>([]);
  const [devices, setDevices] = useState<DeviceData[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const daysParam = days === null ? "all" : days;
      const res = await fetch(
        `/api/seller/traffic?storeId=${store.id}&days=${daysParam}`,
        { cache: "no-store" }
      );
      if (res.ok) {
        const data = await res.json();
        setSummary(data.summary ?? { totalPageViews: 0, uniqueVisitors: 0, avgLoadMs: null });
        setTopPages(data.topPages ?? []);
        setDailyTrend(data.dailyTrend ?? []);
        setTopReferrers(data.topReferrers ?? []);
        setDevices(data.devices ?? []);
      }
    } catch {
      setSummary({ totalPageViews: 0, uniqueVisitors: 0, avgLoadMs: null });
      setTopPages([]);
      setDevices([]);
    } finally {
      setLoading(false);
    }
  }, [days, store.id]);

  useEffect(() => { void load(); }, [load]);

  const storeUrl = `/store/${store.slug}`;

  const getDeviceIcon = (device?: string | null) => {
    switch (device?.toLowerCase()) {
      case "mobile":
        return <Smartphone size={13} className="text-emerald-600" />;
      case "desktop":
        return <Monitor size={13} className="text-sky-600" />;
      case "tablet":
        return <Tablet size={13} className="text-purple-600" />;
      case "bot":
        return <Bot size={13} className="text-amber-600" />;
      default:
        return <Laptop size={13} className="text-foreground/50" />;
    }
  };

  const getDeviceBadge = (device?: string | null) => {
    if (!device) return <span className="text-foreground/40">—</span>;
    const d = device.toLowerCase();
    let bg = "bg-surface border-border text-foreground/70";
    if (d === "mobile") bg = "bg-emerald-50 border-emerald-200 text-emerald-700";
    else if (d === "desktop") bg = "bg-sky-50 border-sky-200 text-sky-700";
    else if (d === "tablet") bg = "bg-purple-50 border-purple-200 text-purple-700";
    else if (d === "bot") bg = "bg-amber-50 border-amber-200 text-amber-700";

    return (
      <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${bg}`}>
        {getDeviceIcon(device)}
        <span>{device}</span>
      </span>
    );
  };

  const totalDeviceViews = devices.reduce((sum, d) => sum + d.views, 0);

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="rounded-2xl border border-border bg-white p-6 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-sky-200 bg-sky-50">
            <BarChart3 className="h-5 w-5 text-sky-600" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-brand-deep">Store Traffic Analytics</h1>
            <p className="mt-0.5 text-xs text-foreground/60">
              Visitor data for{" "}
              <Link href={storeUrl} target="_blank" className="font-semibold text-foreground/80 hover:text-brand inline-flex items-center gap-0.5">
                {store.name} <ArrowUpRight size={11} />
              </Link>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-xl border border-border overflow-hidden">
            {[7, 30, 90].map((v) => (
              <button key={v} type="button" onClick={() => setDays(v)}
                className={`px-3 py-1.5 text-xs font-bold transition-colors ${days === v ? "bg-brand text-white" : "bg-surface text-foreground/60 hover:bg-surface-soft"}`}>
                {v}d
              </button>
            ))}
            <button type="button" onClick={() => setDays(null)}
              className={`px-3 py-1.5 text-xs font-bold transition-colors ${days === null ? "bg-brand text-white" : "bg-surface text-foreground/60 hover:bg-surface-soft"}`}>
              All
            </button>
          </div>
          <button type="button" onClick={() => void load()}
            className="rounded-xl border border-border p-1.5 text-foreground/50 hover:bg-surface-soft"
            title="Refresh traffic data">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* ── Summary Cards ── */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-foreground/50">Page Views</span>
            <Eye className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="text-3xl font-extrabold text-brand-deep">{loading ? "…" : summary.totalPageViews.toLocaleString()}</p>
          <p className="mt-0.5 text-[10px] text-foreground/40">visits to your store</p>
        </div>

        <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-foreground/50">Unique Visitors</span>
            <Users className="h-4 w-4 text-sky-600" />
          </div>
          <p className="text-3xl font-extrabold text-brand-deep">{loading ? "…" : summary.uniqueVisitors.toLocaleString()}</p>
          <p className="mt-0.5 text-[10px] text-foreground/40">distinct sessions</p>
        </div>

        <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-foreground/50">Avg Load Time</span>
            <Clock className="h-4 w-4 text-purple-600" />
          </div>
          <p className="text-3xl font-extrabold text-brand-deep">
            {loading ? "…" : summary.avgLoadMs ? `${summary.avgLoadMs} ms` : "—"}
          </p>
          <p className="mt-0.5 text-[10px] text-foreground/40">page response</p>
        </div>
      </div>

      {/* ── Trend, Devices & Referrers ── */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Daily Trend */}
        <div className="rounded-2xl border border-border bg-white p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={15} className="text-emerald-600" />
              <h2 className="text-sm font-bold text-brand-deep">Daily Views Trend</h2>
            </div>
            {loading ? (
              <div className="flex items-end gap-1 h-28">
                {[45, 70, 35, 85, 50, 65, 40, 90, 60, 75].map((height, i) => (
                  <div
                    key={i}
                    className="flex-1 animate-pulse rounded-sm bg-border"
                    style={{ height: `${height}%` }}
                  />
                ))}
              </div>
            ) : dailyTrend.length === 0 ? (
              <p className="text-xs text-foreground/40 text-center py-8">No data for this period.</p>
            ) : (
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {dailyTrend.slice(-14).map((d) => {
                  const maxViews = Math.max(...dailyTrend.map((x) => x.views), 1);
                  const pct = Math.round((d.views / maxViews) * 100);
                  return (
                    <div key={d.date} className="flex items-center gap-2 text-[11px]">
                      <span className="w-16 shrink-0 text-foreground/50">
                        {new Date(d.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                      </span>
                      <div className="flex-1 h-3.5 rounded-full bg-surface overflow-hidden">
                        <div className="h-full rounded-full bg-emerald-500/70 transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="w-7 text-right font-bold text-foreground/70">{d.views}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Device Breakdown */}
        <div className="rounded-2xl border border-border bg-white p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Laptop size={15} className="text-purple-600" />
                <h2 className="text-sm font-bold text-brand-deep">Device Type</h2>
              </div>
              <span className="text-[10px] font-semibold text-foreground/40">
                {devices.length} platform{devices.length !== 1 ? "s" : ""}
              </span>
            </div>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-8 animate-pulse rounded-lg bg-border/60" />
                ))}
              </div>
            ) : devices.length === 0 ? (
              <p className="text-xs text-foreground/40 text-center py-8">No device data yet.</p>
            ) : (
              <div className="space-y-3">
                {devices.map((d) => {
                  const pct = totalDeviceViews > 0 ? Math.round((d.views / totalDeviceViews) * 100) : 0;
                  const isMobile = d.device.toLowerCase() === "mobile";
                  const isDesktop = d.device.toLowerCase() === "desktop";
                  const isTablet = d.device.toLowerCase() === "tablet";
                  const barColor = isMobile ? "bg-emerald-500" : isDesktop ? "bg-sky-500" : isTablet ? "bg-purple-500" : "bg-amber-500";

                  return (
                    <div key={d.device} className="space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="flex items-center gap-1.5 font-semibold text-brand-deep">
                          {getDeviceIcon(d.device)}
                          {d.device}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-foreground/80">{d.views.toLocaleString()} views</span>
                          <span className="text-foreground/40">({pct}%)</span>
                        </div>
                      </div>
                      <div className="h-2 rounded-full bg-surface overflow-hidden">
                        <div className={`h-full rounded-full ${barColor} transition-all`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Top Referrers */}
        <div className="rounded-2xl border border-border bg-white p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Globe size={15} className="text-sky-600" />
              <h2 className="text-sm font-bold text-brand-deep">Top Traffic Sources</h2>
            </div>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="mb-2.5 h-5 animate-pulse rounded bg-border/60" />
              ))
            ) : topReferrers.length === 0 ? (
              <p className="text-xs text-foreground/40 text-center py-8">No referrer data yet.</p>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {topReferrers.map((r) => {
                  const maxCnt = Math.max(...topReferrers.map((x) => x.cnt), 1);
                  const pct = Math.round((r.cnt / maxCnt) * 100);
                  return (
                    <div key={r.referrer} className="flex items-center gap-2 text-[11px]">
                      <span className="w-24 shrink-0 truncate text-foreground/60" title={r.referrer}>{r.referrer}</span>
                      <div className="flex-1 h-3.5 rounded-full bg-surface overflow-hidden">
                        <div className="h-full rounded-full bg-sky-400/60 transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="w-7 text-right font-bold text-foreground/70">{r.cnt}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Top Pages Table ── */}
      <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
        <div className="border-b border-border px-5 py-3.5 flex items-center justify-between">
          <h2 className="text-sm font-bold text-brand-deep">
            Store Page Breakdown
            {topPages.length > 0 && (
              <span className="ml-2 text-[11px] font-normal text-foreground/40">({topPages.length} page{topPages.length !== 1 ? "s" : ""})</span>
            )}
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-surface-soft/60 text-left text-[11px] font-bold uppercase tracking-wider text-foreground/50">
                <th className="px-5 py-3">Path</th>
                <th className="px-3 py-3">Views</th>
                <th className="px-3 py-3">Visitors</th>
                <th className="px-3 py-3">Top Device</th>
                <th className="px-3 py-3">Top Country</th>
                <th className="px-3 py-3">Avg Load</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i}>{Array.from({ length: 6 }).map((__, j) => (<td key={j} className="px-3 py-3"><div className="h-4 animate-pulse rounded bg-border" /></td>))}</tr>
                ))
              ) : topPages.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <BarChart3 size={28} className="mx-auto mb-2 text-foreground/20" />
                    <p className="text-foreground/40 text-xs">No traffic recorded yet. Share your store link to get started!</p>
                    <Link href={storeUrl} target="_blank" className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-brand hover:underline">
                      View Store <ArrowUpRight size={11} />
                    </Link>
                  </td>
                </tr>
              ) : (
                topPages.map((row) => (
                  <tr key={row.path} className="hover:bg-surface-soft/40">
                    <td className="px-5 py-3 font-mono text-[11px] text-brand-deep">{row.path}</td>
                    <td className="px-3 py-3 font-bold text-emerald-600">{row.pageViews.toLocaleString()}</td>
                    <td className="px-3 py-3 font-bold text-sky-600">{row.uniqueVisitors.toLocaleString()}</td>
                    <td className="px-3 py-3">{getDeviceBadge(row.topDevice)}</td>
                    <td className="px-3 py-3">
                      {row.topCountry ? (
                        <span className="inline-flex rounded-full border border-border bg-surface px-2 py-0.5 text-[10px] font-semibold text-foreground/60">
                          {row.topCountry}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-3 py-3 text-foreground/50">{row.avgLoadMs ? `${row.avgLoadMs} ms` : "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
