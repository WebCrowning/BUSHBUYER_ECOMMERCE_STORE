"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Wallet, RefreshCw, TrendingUp, Clock, DollarSign, Percent,
  AlertCircle, Store, Check, X, ChevronDown, ChevronUp,
  Settings, Loader2, Plus, Edit2, Trash2, Info,
} from "lucide-react";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────
interface WalletRow {
  id: number; store_id: number; store_name: string; store_slug: string;
  store_status: string; available_balance: number; pending_balance: number;
  total_withdrawals: number; total_sales: number; total_commission_paid: number;
  total_refunds: number; currency: string; updated_at: string;
}

interface WithdrawalRow {
  id: number; store_id: number; store_name: string; store_slug: string;
  user_name: string; user_email: string; amount: number;
  payment_method: string; payout_details_json: string;
  status: string; payout_reference: string | null;
  admin_notes: string | null; processed_by_name: string | null;
  processed_at: string | null; created_at: string;
}

interface Summary {
  total_available: number; total_pending: number;
  total_sales: number; total_commission: number;
}

interface Commission {
  id: number; level: "global" | "category" | "store";
  target_id: string | null; rate_percentage: number;
  description: string | null; holding_period_days: number;
  is_active: number; store_name: string | null;
  updated_by_name: string | null; updated_at: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(v: number, c = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: c }).format(Number(v ?? 0));
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending:   "border-amber-200 bg-amber-50 text-amber-700",
    approved:  "border-sky-200 bg-sky-50 text-sky-700",
    processed: "border-emerald-200 bg-emerald-50 text-emerald-700",
    rejected:  "border-red-200 bg-red-50 text-red-700",
  };
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-bold capitalize ${map[status] ?? "border-gray-200 bg-gray-50 text-gray-600"}`}>
      {status}
    </span>
  );
}

// ─── Withdrawal Action Modal ───────────────────────────────────────────────────
function ActionModal({
  withdrawal, onClose, onDone,
}: {
  withdrawal: WithdrawalRow;
  onClose: () => void;
  onDone: () => void;
}) {
  const [action, setAction] = useState<"approve" | "reject" | "process">("approve");
  const [adminNotes, setAdminNotes] = useState("");
  const [payoutRef, setPayoutRef] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const parsedDetails = (() => {
    try { return JSON.parse(withdrawal.payout_details_json || "{}"); } catch { return {}; }
  })();

  async function submit() {
    setError("");
    if (action === "process" && !payoutRef.trim()) {
      setError("Payout reference is required when marking as processed.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/withdrawals/${withdrawal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, admin_notes: adminNotes, payout_reference: payoutRef }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Action failed"); return; }
      onDone();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-4">
          <h3 className="font-bold text-gray-900">Withdrawal #{withdrawal.id}</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={16} /></button>
        </div>

        {/* Summary */}
        <div className="mb-4 rounded-xl border border-gray-100 bg-gray-50 p-3 space-y-1.5 text-xs">
          <div className="flex justify-between"><span className="text-gray-500">Store</span><span className="font-bold">{withdrawal.store_name}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Amount</span><span className="font-extrabold text-emerald-700">{fmt(withdrawal.amount)}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Method</span><span className="capitalize">{withdrawal.payment_method.replace(/_/g, " ")}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Requested by</span><span>{withdrawal.user_name}</span></div>
          {parsedDetails.accountName && <div className="flex justify-between"><span className="text-gray-500">Account</span><span>{parsedDetails.accountName}</span></div>}
          {parsedDetails.accountNumber && <div className="flex justify-between"><span className="text-gray-500">Account #</span><span>{parsedDetails.accountNumber}</span></div>}
          {parsedDetails.bankName && <div className="flex justify-between"><span className="text-gray-500">Bank</span><span>{parsedDetails.bankName}</span></div>}
          {parsedDetails.mobileNumber && <div className="flex justify-between"><span className="text-gray-500">Mobile #</span><span>{parsedDetails.mobileNumber}</span></div>}
          {parsedDetails.paypalEmail && <div className="flex justify-between"><span className="text-gray-500">PayPal</span><span>{parsedDetails.paypalEmail}</span></div>}
        </div>

        {/* Action tabs */}
        <div className="mb-4 flex rounded-xl border border-gray-200 overflow-hidden text-xs font-bold">
          {(["approve", "reject", "process"] as const)
            .filter((a) => {
              if (withdrawal.status === "pending") return a !== "process";
              if (withdrawal.status === "approved") return a !== "approve";
              return false;
            })
            .map((a) => (
              <button key={a} type="button" onClick={() => setAction(a)}
                className={`flex-1 py-2.5 capitalize transition-colors ${action === a ? (a === "reject" ? "bg-red-600 text-white" : "bg-emerald-600 text-white") : "text-gray-500 hover:bg-gray-50"}`}>
                {a}
              </button>
            ))}
        </div>

        {action === "process" && (
          <div className="mb-3">
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-gray-500">Payout Reference * <span className="text-gray-400 normal-case">(bank ref, transaction ID, etc.)</span></label>
            <input value={payoutRef} onChange={(e) => setPayoutRef(e.target.value)}
              placeholder="e.g. TXN-20260814-001"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs focus:border-emerald-500 focus:outline-none" />
          </div>
        )}

        <div className="mb-4">
          <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-gray-500">Admin Notes <span className="text-gray-400 normal-case">(optional)</span></label>
          <textarea value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} rows={2}
            placeholder="Reason, instructions, or confirmation notes..."
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs focus:border-emerald-500 focus:outline-none" />
        </div>

        {error && <p className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">{error}</p>}

        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-gray-200 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-50">Cancel</button>
          <button type="button" onClick={() => void submit()} disabled={submitting}
            className={`flex-1 rounded-xl py-2.5 text-xs font-bold text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 ${action === "reject" ? "bg-red-600 hover:bg-red-700" : "bg-emerald-600 hover:bg-emerald-700"}`}>
            {submitting ? <Loader2 size={13} className="animate-spin" /> : action === "approve" ? <Check size={13} /> : action === "reject" ? <X size={13} /> : <Check size={13} />}
            {submitting ? "Processing…" : `Confirm ${action}`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Commission Editor ─────────────────────────────────────────────────────────
function CommissionPanel() {
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalRate, setGlobalRate] = useState(5);
  const [editing, setEditing] = useState<Commission | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ level: "global" as Commission["level"], target_id: "", rate_percentage: 5, description: "", holding_period_days: 0, is_active: true });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/commissions");
      if (r.ok) { const d = await r.json(); setCommissions(d.commissions ?? []); setGlobalRate(d.globalRate ?? 5); }
    } finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);

  function startEdit(c: Commission) {
    setEditing(c);
    setForm({ level: c.level, target_id: c.target_id ?? "", rate_percentage: Number(c.rate_percentage), description: c.description ?? "", holding_period_days: Number(c.holding_period_days ?? 0), is_active: !!c.is_active });
    setCreating(false);
  }

  function startCreate() {
    setCreating(true);
    setEditing(null);
    setForm({ level: "global", target_id: "", rate_percentage: 5, description: "", holding_period_days: 0, is_active: true });
  }

  async function save() {
    setSaving(true);
    setMsg("");
    try {
      const url = editing ? "/api/admin/commissions" : "/api/admin/commissions";
      const method = editing ? "PUT" : "POST";
      const body = editing ? { id: editing.id, ...form } : form;
      const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const d = await r.json();
      if (!r.ok) { setMsg(d.error ?? "Save failed"); return; }
      setMsg("✓ Saved");
      setEditing(null);
      setCreating(false);
      await load();
      setTimeout(() => setMsg(""), 3000);
    } finally { setSaving(false); }
  }

  async function remove(id: number, level: string) {
    if (!confirm(level === "global" ? "Deactivate this global rate?" : "Delete this rule?")) return;
    await fetch(`/api/admin/commissions?id=${id}`, { method: "DELETE" });
    await load();
  }

  const levelColor = (l: string) => l === "global" ? "bg-purple-50 text-purple-700 border-purple-200" : l === "category" ? "bg-sky-50 text-sky-700 border-sky-200" : "bg-emerald-50 text-emerald-700 border-emerald-200";

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5">
        <div className="flex items-center gap-2">
          <Settings size={15} className="text-purple-600" />
          <h2 className="text-sm font-bold text-gray-900">Commission Rate Management</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-purple-200 bg-purple-50 px-2.5 py-1 text-xs font-bold text-purple-700">Global: {globalRate}%</span>
          <button type="button" onClick={startCreate} className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-purple-700">
            <Plus size={12} /> Add Rule
          </button>
        </div>
      </div>

      {(creating || editing) && (
        <div className="border-b border-gray-100 p-4 bg-gray-50/60">
          <p className="mb-3 text-xs font-bold text-gray-700">{editing ? "Edit Commission Rule" : "New Commission Rule"}</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-gray-500">Level</label>
              <select value={form.level} onChange={(e) => setForm((f) => ({ ...f, level: e.target.value as Commission["level"] }))}
                className="w-full rounded-xl border border-gray-200 bg-white px-2 py-2 text-xs focus:outline-none">
                <option value="global">Global (platform-wide)</option>
                <option value="category">Category</option>
                <option value="store">Store-specific</option>
              </select>
            </div>
            {form.level !== "global" && (
              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-gray-500">{form.level === "store" ? "Store ID" : "Category"}</label>
                <input value={form.target_id} onChange={(e) => setForm((f) => ({ ...f, target_id: e.target.value }))}
                  placeholder={form.level === "store" ? "Store ID number" : "e.g. Seafood"}
                  className="w-full rounded-xl border border-gray-200 bg-white px-2 py-2 text-xs focus:outline-none" />
              </div>
            )}
            <div>
              <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-gray-500">Rate (%)</label>
              <input type="number" min={0} max={100} step={0.5} value={form.rate_percentage}
                onChange={(e) => setForm((f) => ({ ...f, rate_percentage: Number(e.target.value) }))}
                className="w-full rounded-xl border border-gray-200 bg-white px-2 py-2 text-xs focus:outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-gray-500">Hold (days)</label>
              <input type="number" min={0} max={90} value={form.holding_period_days}
                onChange={(e) => setForm((f) => ({ ...f, holding_period_days: Number(e.target.value) }))}
                className="w-full rounded-xl border border-gray-200 bg-white px-2 py-2 text-xs focus:outline-none" />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 cursor-pointer">
              <input type="checkbox" checked={form.is_active} onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))} />
              Active
            </label>
            {msg && <span className={`text-xs font-semibold ${msg.startsWith("✓") ? "text-emerald-700" : "text-red-600"}`}>{msg}</span>}
            <div className="ml-auto flex gap-2">
              <button type="button" onClick={() => { setCreating(false); setEditing(null); }} className="rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-600 hover:bg-gray-50">Cancel</button>
              <button type="button" onClick={() => void save()} disabled={saving}
                className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-purple-700 disabled:opacity-50">
                {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50 text-left text-[11px] font-bold uppercase tracking-wider text-gray-500">
              <th className="px-5 py-3">Level</th>
              <th className="px-3 py-3">Target</th>
              <th className="px-3 py-3">Rate</th>
              <th className="px-3 py-3">Hold (days)</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              Array.from({ length: 2 }).map((_, i) => (
                <tr key={i}>{Array.from({ length: 6 }).map((__, j) => (<td key={j} className="px-3 py-3"><div className="h-4 animate-pulse rounded bg-gray-100" /></td>))}</tr>
              ))
            ) : commissions.length === 0 ? (
              <tr><td colSpan={6} className="py-8 text-center text-gray-400">No commission rules. Add one above.</td></tr>
            ) : (
              commissions.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50/60">
                  <td className="px-5 py-3">
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold capitalize ${levelColor(c.level)}`}>{c.level}</span>
                  </td>
                  <td className="px-3 py-3 text-gray-700">{c.level === "store" ? (c.store_name ? `${c.store_name} (#${c.target_id})` : `Store #${c.target_id}`) : c.target_id || "—"}</td>
                  <td className="px-3 py-3 font-extrabold text-gray-900">{Number(c.rate_percentage).toFixed(2)}%</td>
                  <td className="px-3 py-3 text-gray-600">{c.holding_period_days ?? 0}d</td>
                  <td className="px-3 py-3">
                    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold ${c.is_active ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-gray-200 bg-gray-50 text-gray-500"}`}>
                      {c.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <div className="inline-flex items-center gap-1">
                      <button type="button" onClick={() => startEdit(c)} className="rounded-lg border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-50 hover:text-gray-900"><Edit2 size={12} /></button>
                      <button type="button" onClick={() => void remove(c.id, c.level)} className="rounded-lg border border-gray-200 p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={12} /></button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="border-t border-gray-100 px-5 py-3">
        <p className="flex items-start gap-1.5 text-[11px] text-gray-500">
          <Info size={12} className="mt-0.5 shrink-0" />
          Priority: store-specific &gt; category &gt; global. Hold days delay funds moving to available balance after delivery.
        </p>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function AdminWalletsPage() {
  const [wallets, setWallets] = useState<WalletRow[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRow[]>([]);
  const [wdStatus, setWdStatus] = useState("pending");
  const [wdCounts, setWdCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<{ pages: number; total: number } | null>(null);
  const [activeModal, setActiveModal] = useState<WithdrawalRow | null>(null);
  const [showCommissions, setShowCommissions] = useState(false);

  const fetchWallets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/wallets?page=${page}`);
      if (res.ok) {
        const data = await res.json();
        setWallets(data.wallets ?? []);
        setSummary(data.summary ?? null);
        setPagination(data.pagination ?? null);
      }
    } finally { setLoading(false); }
  }, [page]);

  const fetchWithdrawals = useCallback(async () => {
    const res = await fetch(`/api/admin/withdrawals?status=${wdStatus}`);
    if (res.ok) {
      const data = await res.json();
      setWithdrawals(data.withdrawals ?? []);
      setWdCounts(data.counts ?? {});
    }
  }, [wdStatus]);

  useEffect(() => { void fetchWallets(); }, [fetchWallets]);
  useEffect(() => { void fetchWithdrawals(); }, [fetchWithdrawals]);

  const wdStatuses = ["pending", "approved", "processed", "rejected", "all"];

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 md:text-2xl">Wallets &amp; Payouts</h1>
          <p className="mt-0.5 text-xs text-gray-500">
            Seller balances, withdrawal approvals, commission rates, and marketplace revenue.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setShowCommissions((v) => !v)}
            className="inline-flex items-center gap-2 rounded-xl border border-purple-200 bg-purple-50 px-3.5 py-2 text-xs font-bold text-purple-700 hover:bg-purple-100">
            <Settings size={13} /> Commission Rates
            {showCommissions ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
          <button type="button" onClick={() => { void fetchWallets(); void fetchWithdrawals(); }}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 shadow-sm">
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>
      </div>

      {/* ── Commission Panel ── */}
      {showCommissions && <CommissionPanel />}

      {/* ── Summary ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Total Available", value: fmt(summary?.total_available ?? 0), icon: <DollarSign size={16} />, color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
          { label: "Pending Payouts", value: fmt(summary?.total_pending ?? 0), icon: <Clock size={16} />, color: "text-amber-700", bg: "bg-amber-50 border-amber-200" },
          { label: "Platform Sales", value: fmt(summary?.total_sales ?? 0), icon: <TrendingUp size={16} />, color: "text-sky-700", bg: "bg-sky-50 border-sky-200" },
          { label: "Total Commission", value: fmt(summary?.total_commission ?? 0), icon: <Percent size={16} />, color: "text-purple-700", bg: "bg-purple-50 border-purple-200" },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl border p-3.5 shadow-sm ${s.bg}`}>
            <div className={`mb-1.5 ${s.color}`}>{s.icon}</div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500">{s.label}</p>
            <p className={`mt-0.5 text-lg font-extrabold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* ── Withdrawals ── */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-3.5">
          <div className="flex items-center gap-2">
            <AlertCircle size={15} className="text-amber-600" />
            <h2 className="text-sm font-bold text-gray-900">Withdrawal Requests</h2>
          </div>
          {/* Status filter tabs */}
          <div className="flex flex-wrap gap-1.5">
            {wdStatuses.map((s) => (
              <button key={s} type="button" onClick={() => setWdStatus(s)}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-bold capitalize transition-colors ${wdStatus === s ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                {s}{wdCounts[s] ? ` (${wdCounts[s]})` : ""}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50 text-left text-[11px] font-bold uppercase tracking-wider text-gray-500">
                <th className="px-5 py-3">Store</th>
                <th className="px-3 py-3">Amount</th>
                <th className="px-3 py-3">Method</th>
                <th className="px-3 py-3">Requested By</th>
                <th className="px-3 py-3">Date</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Payout Ref</th>
                <th className="px-3 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {withdrawals.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center">
                    <Wallet size={28} className="mx-auto mb-2 text-gray-300" />
                    <p className="text-gray-400 text-xs">No {wdStatus === "all" ? "" : wdStatus} withdrawal requests</p>
                  </td>
                </tr>
              ) : (
                withdrawals.map((w) => (
                  <tr key={w.id} className="hover:bg-gray-50/60">
                    <td className="px-5 py-3">
                      <Link href={`/store/${w.store_slug}`} target="_blank" className="font-bold text-gray-900 hover:text-emerald-600">{w.store_name}</Link>
                    </td>
                    <td className="px-3 py-3 font-extrabold text-emerald-700">{fmt(w.amount)}</td>
                    <td className="px-3 py-3 capitalize text-gray-700">{w.payment_method.replace(/_/g, " ")}</td>
                    <td className="px-3 py-3 text-gray-600">{w.user_name}</td>
                    <td className="px-3 py-3 text-[11px] text-gray-400">{new Date(w.created_at).toLocaleDateString()}</td>
                    <td className="px-3 py-3"><StatusBadge status={w.status} /></td>
                    <td className="px-3 py-3 text-[11px] text-gray-500 font-mono">{w.payout_reference ?? "—"}</td>
                    <td className="px-3 py-3 text-right">
                      {(w.status === "pending" || w.status === "approved") && (
                        <button type="button" onClick={() => setActiveModal(w)}
                          className="rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 shadow-sm">
                          Review
                        </button>
                      )}
                      {w.admin_notes && (
                        <span className="ml-1.5 text-[10px] text-gray-400" title={w.admin_notes}><Info size={11} /></span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── All Store Wallets ── */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-5 py-3.5">
          <h2 className="text-sm font-bold text-gray-900">All Store Wallets</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50 text-left text-[11px] font-bold uppercase tracking-wider text-gray-500">
                <th className="px-5 py-3">Store</th>
                <th className="px-3 py-3">Available</th>
                <th className="px-3 py-3">Pending</th>
                <th className="px-3 py-3">Total Sales</th>
                <th className="px-3 py-3">Commission</th>
                <th className="px-3 py-3">Withdrawn</th>
                <th className="px-3 py-3">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>{Array.from({ length: 7 }).map((__, j) => (<td key={j} className="px-3 py-3"><div className="h-4 animate-pulse rounded bg-gray-100" /></td>))}</tr>
                ))
              ) : wallets.length === 0 ? (
                <tr><td colSpan={7} className="py-12 text-center"><Wallet size={28} className="mx-auto mb-2 text-gray-300" /><p className="text-gray-400">No wallets</p></td></tr>
              ) : (
                wallets.map((w) => (
                  <tr key={w.id} className="hover:bg-gray-50/60">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100 text-gray-500"><Store size={13} /></div>
                        <div>
                          <Link href={`/store/${w.store_slug}`} target="_blank" className="font-bold text-gray-900 hover:text-emerald-600">{w.store_name}</Link>
                          <p className={`text-[10px] font-semibold ${w.store_status === "active" ? "text-emerald-600" : "text-red-500"}`}>{w.store_status}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 font-extrabold text-emerald-700">{fmt(w.available_balance)}</td>
                    <td className="px-3 py-3 font-bold text-amber-600">{fmt(w.pending_balance)}</td>
                    <td className="px-3 py-3 text-sky-700 font-semibold">{fmt(w.total_sales)}</td>
                    <td className="px-3 py-3 text-gray-500">{fmt(w.total_commission_paid)}</td>
                    <td className="px-3 py-3 text-gray-500">{fmt(w.total_withdrawals)}</td>
                    <td className="px-3 py-3 text-[11px] text-gray-400">{w.updated_at ? new Date(w.updated_at).toLocaleDateString() : "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {pagination && pagination.pages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3 text-xs text-gray-500">
            <p>{pagination.total} total wallets</p>
            <div className="flex items-center gap-1.5">
              <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="rounded-lg border border-gray-200 px-2.5 py-1 font-semibold hover:bg-gray-50 disabled:opacity-40">Prev</button>
              <span className="text-[11px]">{page}/{pagination.pages}</span>
              <button disabled={page >= pagination.pages} onClick={() => setPage((p) => p + 1)} className="rounded-lg border border-gray-200 px-2.5 py-1 font-semibold hover:bg-gray-50 disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>

      {/* ── Action Modal ── */}
      {activeModal && (
        <ActionModal
          withdrawal={activeModal}
          onClose={() => setActiveModal(null)}
          onDone={() => { setActiveModal(null); void fetchWallets(); void fetchWithdrawals(); }}
        />
      )}
    </div>
  );
}
