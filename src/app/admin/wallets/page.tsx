"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Wallet, RefreshCw, TrendingUp, Clock, DollarSign, Percent,
  AlertCircle, Store, Check, X, ChevronDown, ChevronUp,
  Settings, Loader2, Plus, Edit2, Trash2, Info,
  Smartphone, ShieldAlert, ShieldCheck, Search, ArrowRight,
  ExternalLink, CheckCircle2, RotateCw
} from "lucide-react";
import Link from "next/link";
import { maskPhoneNumber } from "@/lib/cameroon-phone";

// ─── Types ────────────────────────────────────────────────────────────────────
interface WalletRow {
  id: number;
  store_id: number;
  store_name: string;
  store_slug: string;
  store_status: string;
  available_balance: number;
  pending_balance: number;
  total_withdrawals: number;
  total_sales: number;
  total_commission_paid: number;
  total_refunds: number;
  currency: string;
  updated_at: string;
}

interface WithdrawalRow {
  id: number;
  store_id: number;
  store_name: string;
  store_slug: string;
  user_name: string;
  user_email: string;
  amount: number;
  fee: number;
  net_amount: number;
  currency: string;
  payment_method: string;
  payout_details_json: string;
  recipient_phone: string | null;
  recipient_name: string | null;
  recipient_email: string | null;
  status: string;
  fapshi_reference: string | null;
  fapshi_transaction_id: string | null;
  payout_reference: string | null;
  failure_reason: string | null;
  admin_notes: string | null;
  processed_by_name: string | null;
  requested_at: string;
  approved_at: string | null;
  processed_at: string | null;
  completed_at: string | null;
  created_at: string;
}

interface Summary {
  total_available: number;
  total_pending: number;
  total_sales: number;
  total_commission: number;
}

interface Commission {
  id: number;
  level: "global" | "category" | "store";
  target_id: string | null;
  rate_percentage: number;
  description: string | null;
  holding_period_days: number;
  is_active: number;
  store_name: string | null;
  updated_by_name: string | null;
  updated_at: string | null;
}

interface WithdrawalSettings {
  withdrawal_mode: "MANUAL" | "AUTO";
  min_withdrawal_amount: number;
  max_withdrawal_amount: number;
  withdrawal_fee_fixed: number;
  withdrawal_fee_percentage: number;
  auto_max_amount: number;
  daily_user_limit: number;
  daily_global_limit: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(v: number, c = "XAF") {
  if (c === "XAF" || c === "FCFA") {
    return `${Number(v ?? 0).toLocaleString()} XAF`;
  }
  return new Intl.NumberFormat("en-US", { style: "currency", currency: c }).format(Number(v ?? 0));
}

function StatusBadge({ status }: { status: string }) {
  const s = String(status || "").toUpperCase();
  const map: Record<string, { bg: string; label: string }> = {
    PENDING:    { bg: "border-amber-200 bg-amber-50 text-amber-700", label: "Pending Review" },
    APPROVED:   { bg: "border-sky-200 bg-sky-50 text-sky-700", label: "Approved" },
    PROCESSING: { bg: "border-blue-200 bg-blue-50 text-blue-700", label: "Processing Payout" },
    SUCCESS:    { bg: "border-emerald-200 bg-emerald-50 text-emerald-700", label: "Paid Successfully" },
    FAILED:     { bg: "border-red-200 bg-red-50 text-red-700", label: "Failed / Refunded" },
    REJECTED:   { bg: "border-red-200 bg-red-50 text-red-700", label: "Rejected" },
    CANCELLED:  { bg: "border-gray-200 bg-gray-50 text-gray-600", label: "Cancelled" },
  };
  const config = map[s] || { bg: "border-gray-200 bg-gray-50 text-gray-600", label: s || "Unknown" };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${config.bg}`}>
      {s === "PROCESSING" && <Loader2 size={10} className="animate-spin" />}
      {config.label}
    </span>
  );
}

// ─── Withdrawal Action Modal ───────────────────────────────────────────────────
function ActionModal({
  withdrawal,
  onClose,
  onDone,
}: {
  withdrawal: WithdrawalRow;
  onClose: () => void;
  onDone: () => void;
}) {
  const s = withdrawal.status?.toUpperCase();
  const defaultAction = s === "PROCESSING" ? "reconcile" : s === "APPROVED" ? "process" : "approve";
  const [action, setAction] = useState<"approve" | "reject" | "process" | "reconcile">(defaultAction);
  const [adminNotes, setAdminNotes] = useState("");
  const [payoutRef, setPayoutRef] = useState(withdrawal.fapshi_transaction_id || "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successInfo, setSuccessInfo] = useState<string | null>(null);

  const parsedDetails = (() => {
    try { return JSON.parse(withdrawal.payout_details_json || "{}"); } catch { return {}; }
  })();

  const isFapshi =
    withdrawal.payment_method?.startsWith("fapshi") ||
    withdrawal.payment_method === "mobile_money";

  async function submit() {
    setError("");
    setSuccessInfo(null);

    if (action === "process" && !payoutRef.trim()) {
      setError("Payout reference is required when manually marking as processed.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/withdrawals/${withdrawal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          admin_notes: adminNotes,
          payout_reference: payoutRef,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Action failed");
        return;
      }

      if (action === "reconcile") {
        setSuccessInfo(`Fapshi status: ${data.fapshiStatus} | Local status: ${data.localStatus}`);
        setTimeout(() => onDone(), 1500);
      } else {
        onDone();
      }
    } catch (err: any) {
      setError(err.message || "Failed to execute withdrawal action");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-gray-900 text-base">Withdrawal #{withdrawal.id}</h3>
              <StatusBadge status={withdrawal.status} />
            </div>
            <p className="text-xs text-gray-500 font-mono mt-0.5">{withdrawal.fapshi_reference || "No ref"}</p>
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={18} /></button>
        </div>

        {/* Breakdown Card */}
        <div className="rounded-xl border border-gray-200 bg-gray-50/80 p-4 space-y-2 text-xs">
          <div className="flex justify-between border-b border-gray-200 pb-2">
            <span className="text-gray-500">Store / Seller</span>
            <span className="font-bold text-gray-900">{withdrawal.store_name} ({withdrawal.user_name})</span>
          </div>
          <div className="grid grid-cols-3 gap-2 py-1">
            <div>
              <span className="text-gray-500 text-[10px] uppercase font-bold">Gross Requested</span>
              <p className="font-bold text-gray-900">{fmt(withdrawal.amount, withdrawal.currency)}</p>
            </div>
            <div>
              <span className="text-gray-500 text-[10px] uppercase font-bold">Fee Deducted</span>
              <p className="font-bold text-amber-700">{fmt(withdrawal.fee || 0, withdrawal.currency)}</p>
            </div>
            <div>
              <span className="text-gray-500 text-[10px] uppercase font-bold">Net Payout</span>
              <p className="font-extrabold text-emerald-700 text-sm">{fmt(withdrawal.net_amount || withdrawal.amount, withdrawal.currency)}</p>
            </div>
          </div>
          <div className="flex justify-between border-t border-gray-200 pt-2">
            <span className="text-gray-500">Method</span>
            <span className="font-bold text-brand-deep capitalize">{withdrawal.payment_method.replace(/_/g, " ")}</span>
          </div>

          {withdrawal.recipient_phone && (
            <div className="flex justify-between">
              <span className="text-gray-500">Mobile Money Phone</span>
              <span className="font-mono font-bold text-gray-900">{withdrawal.recipient_phone}</span>
            </div>
          )}
          {withdrawal.recipient_email && (
            <div className="flex justify-between">
              <span className="text-gray-500">Recipient Email</span>
              <span className="font-bold text-gray-900">{withdrawal.recipient_email}</span>
            </div>
          )}
          {parsedDetails.bankName && (
            <div className="flex justify-between">
              <span className="text-gray-500">Bank Details</span>
              <span className="text-gray-800">{parsedDetails.bankName} - {parsedDetails.accountNumber} ({parsedDetails.accountName})</span>
            </div>
          )}
          {withdrawal.fapshi_transaction_id && (
            <div className="flex justify-between">
              <span className="text-gray-500">Fapshi Trans ID</span>
              <span className="font-mono text-gray-800 font-semibold">{withdrawal.fapshi_transaction_id}</span>
            </div>
          )}
          {withdrawal.failure_reason && (
            <div className="rounded-lg bg-red-50 p-2 text-red-700 font-semibold text-[11px]">
              Failure Reason: {withdrawal.failure_reason}
            </div>
          )}
        </div>

        {/* Action Tabs */}
        <div className="flex rounded-xl border border-gray-200 overflow-hidden text-xs font-bold">
          {s === "PENDING" && (
            <>
              <button
                type="button"
                onClick={() => setAction("approve")}
                className={`flex-1 py-2.5 transition-colors ${action === "approve" ? "bg-emerald-600 text-white" : "text-gray-600 hover:bg-gray-50"}`}
              >
                {isFapshi ? "⚡ Approve & Payout via Fapshi" : "Approve"}
              </button>
              <button
                type="button"
                onClick={() => setAction("reject")}
                className={`flex-1 py-2.5 transition-colors ${action === "reject" ? "bg-red-600 text-white" : "text-gray-600 hover:bg-gray-50"}`}
              >
                Reject &amp; Refund
              </button>
            </>
          )}

          {s === "APPROVED" && (
            <>
              <button
                type="button"
                onClick={() => setAction("approve")}
                className={`flex-1 py-2.5 transition-colors ${action === "approve" ? "bg-emerald-600 text-white" : "text-gray-600 hover:bg-gray-50"}`}
              >
                {isFapshi ? "Retry Fapshi Payout" : "Mark Dispatched"}
              </button>
              <button
                type="button"
                onClick={() => setAction("process")}
                className={`flex-1 py-2.5 transition-colors ${action === "process" ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-50"}`}
              >
                Manual Reference
              </button>
              <button
                type="button"
                onClick={() => setAction("reject")}
                className={`flex-1 py-2.5 transition-colors ${action === "reject" ? "bg-red-600 text-white" : "text-gray-600 hover:bg-gray-50"}`}
              >
                Reject &amp; Refund
              </button>
            </>
          )}

          {(s === "PROCESSING" || s === "FAILED") && (
            <>
              {withdrawal.fapshi_transaction_id && (
                <button
                  type="button"
                  onClick={() => setAction("reconcile")}
                  className={`flex-1 py-2.5 transition-colors ${action === "reconcile" ? "bg-purple-600 text-white" : "text-gray-600 hover:bg-gray-50"}`}
                >
                  Sync with Fapshi
                </button>
              )}
              <button
                type="button"
                onClick={() => setAction("process")}
                className={`flex-1 py-2.5 transition-colors ${action === "process" ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-50"}`}
              >
                Manual Complete
              </button>
              <button
                type="button"
                onClick={() => setAction("reject")}
                className={`flex-1 py-2.5 transition-colors ${action === "reject" ? "bg-red-600 text-white" : "text-gray-600 hover:bg-gray-50"}`}
              >
                Reject &amp; Refund
              </button>
            </>
          )}
        </div>

        {action === "approve" && isFapshi && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-xs text-emerald-800 flex items-start gap-2">
            <ShieldCheck size={16} className="mt-0.5 shrink-0 text-emerald-600" />
            <div>
              <p className="font-bold">Automated Fapshi Payout</p>
              <p className="mt-0.5 text-[11px]">Approving will immediately trigger Fapshi Disbursement API to send <b>{fmt(withdrawal.net_amount || withdrawal.amount, withdrawal.currency)}</b> directly to the recipient.</p>
            </div>
          </div>
        )}

        {action === "process" && (
          <div>
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-gray-500">Payout Reference *</label>
            <input
              value={payoutRef}
              onChange={(e) => setPayoutRef(e.target.value)}
              placeholder="e.g. FAK-TRANS-12345 or Bank Wire Ref"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-mono focus:border-brand focus:outline-none"
            />
          </div>
        )}

        <div>
          <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-gray-500">Admin Notes / Rejection Reason</label>
          <textarea
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            rows={2}
            placeholder={action === "reject" ? "Please state the reason for rejection (returned to seller)..." : "Optional internal notes..."}
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs focus:border-brand focus:outline-none"
          />
        </div>

        {error && <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{error}</p>}
        {successInfo && <p className="rounded-xl border border-purple-200 bg-purple-50 px-3 py-2 text-xs font-semibold text-purple-700">{successInfo}</p>}

        <div className="flex gap-2 pt-2">
          <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-gray-200 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-50">Cancel</button>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={submitting}
            className={`flex-1 rounded-xl py-2.5 text-xs font-bold text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 ${
              action === "reject"
                ? "bg-red-600 hover:bg-red-700"
                : action === "reconcile"
                ? "bg-purple-600 hover:bg-purple-700"
                : "bg-emerald-600 hover:bg-emerald-700"
            }`}
          >
            {submitting ? <Loader2 size={13} className="animate-spin" /> : action === "reconcile" ? <RotateCw size={13} /> : <Check size={13} />}
            {submitting ? "Processing…" : `Confirm ${action}`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Settings Panel ────────────────────────────────────────────────────────────
function SettingsPanel({
  settings,
  onUpdate,
}: {
  settings: WithdrawalSettings;
  onUpdate: () => void;
}) {
  const [form, setForm] = useState<WithdrawalSettings>(settings);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [showAutoConfirm, setShowAutoConfirm] = useState(false);

  useEffect(() => {
    setForm(settings);
  }, [settings]);

  async function handleSave(overrideMode?: "MANUAL" | "AUTO") {
    setSaving(true);
    setMsg("");
    const payload = {
      ...form,
      withdrawal_mode: overrideMode || form.withdrawal_mode,
    };

    try {
      const res = await fetch("/api/admin/withdrawal-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data.error ?? "Failed to save settings");
        return;
      }
      setMsg("✓ Settings saved successfully");
      onUpdate();
      setTimeout(() => setMsg(""), 3000);
    } finally {
      setSaving(false);
      setShowAutoConfirm(false);
    }
  }

  function toggleMode(target: "MANUAL" | "AUTO") {
    if (target === "AUTO" && form.withdrawal_mode === "MANUAL") {
      setShowAutoConfirm(true);
    } else {
      setForm((f) => ({ ...f, withdrawal_mode: target }));
    }
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-gray-100 pb-3">
        <div className="flex items-center gap-2">
          <Settings size={16} className="text-brand-deep" />
          <h2 className="text-sm font-bold text-gray-900">Withdrawal &amp; Payout Security Settings</h2>
        </div>
        {msg && <span className={`text-xs font-semibold ${msg.startsWith("✓") ? "text-emerald-700" : "text-red-600"}`}>{msg}</span>}
      </div>

      {/* Mode Switch Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-gray-200 p-4 bg-gray-50/60 space-y-3">
          <label className="block text-xs font-bold text-gray-800">Withdrawal Execution Mode</label>
          <div className="flex rounded-xl border border-gray-200 overflow-hidden text-xs font-bold">
            <button
              type="button"
              onClick={() => toggleMode("MANUAL")}
              className={`flex-1 py-2.5 flex items-center justify-center gap-1.5 transition-colors ${
                form.withdrawal_mode === "MANUAL"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-gray-600 hover:bg-white"
              }`}
            >
              <ShieldCheck size={14} /> MANUAL (Recommended)
            </button>
            <button
              type="button"
              onClick={() => toggleMode("AUTO")}
              className={`flex-1 py-2.5 flex items-center justify-center gap-1.5 transition-colors ${
                form.withdrawal_mode === "AUTO"
                  ? "bg-amber-600 text-white shadow-sm"
                  : "text-gray-600 hover:bg-white"
              }`}
            >
              <ShieldAlert size={14} /> AUTO PAYOUT
            </button>
          </div>
          <p className="text-[11px] text-gray-500">
            {form.withdrawal_mode === "MANUAL"
              ? "All withdrawal requests require administrator manual approval before Fapshi payout is dispatched."
              : "Withdrawals below auto limits are automatically dispatched directly to user's Mobile Money account."}
          </p>
        </div>

        {/* Global Limits */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-gray-500">Min Amount (XAF)</label>
            <input
              type="number"
              value={form.min_withdrawal_amount}
              onChange={(e) => setForm((f) => ({ ...f, min_withdrawal_amount: Number(e.target.value) }))}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-gray-500">Max Amount (XAF)</label>
            <input
              type="number"
              value={form.max_withdrawal_amount}
              onChange={(e) => setForm((f) => ({ ...f, max_withdrawal_amount: Number(e.target.value) }))}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-gray-500">Fixed Fee (XAF)</label>
            <input
              type="number"
              value={form.withdrawal_fee_fixed}
              onChange={(e) => setForm((f) => ({ ...f, withdrawal_fee_fixed: Number(e.target.value) }))}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-gray-500">Fee Percentage (%)</label>
            <input
              type="number"
              step={0.1}
              value={form.withdrawal_fee_percentage}
              onChange={(e) => setForm((f) => ({ ...f, withdrawal_fee_percentage: Number(e.target.value) }))}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Auto Limits Details */}
      {form.withdrawal_mode === "AUTO" && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-gray-100 pt-3">
          <div>
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-gray-500">Single Auto Max (XAF)</label>
            <input
              type="number"
              value={form.auto_max_amount}
              onChange={(e) => setForm((f) => ({ ...f, auto_max_amount: Number(e.target.value) }))}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-gray-500">Daily User Limit (XAF)</label>
            <input
              type="number"
              value={form.daily_user_limit}
              onChange={(e) => setForm((f) => ({ ...f, daily_user_limit: Number(e.target.value) }))}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-gray-500">Daily Global Cap (XAF)</label>
            <input
              type="number"
              value={form.daily_global_limit}
              onChange={(e) => setForm((f) => ({ ...f, daily_global_limit: Number(e.target.value) }))}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold focus:outline-none"
            />
          </div>
        </div>
      )}

      <div className="flex justify-end pt-2">
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving}
          className="inline-flex items-center gap-1.5 rounded-xl bg-gray-900 px-5 py-2 text-xs font-bold text-white hover:bg-black disabled:opacity-50"
        >
          {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
          Save Payout Settings
        </button>
      </div>

      {/* Auto Mode Confirmation Dialog */}
      {showAutoConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-amber-600">
              <ShieldAlert size={28} />
              <h3 className="font-bold text-gray-900 text-base">Enable Automatic Disbursements?</h3>
            </div>
            <p className="text-xs text-gray-600">
              Enabling AUTO mode allows eligible user withdrawal requests up to <b>{fmt(form.auto_max_amount)}</b> to be automatically sent to their MTN/Orange Mobile Money account without manual review.
            </p>
            <div className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
              Requests exceeding auto caps or daily user limits will safely hold for manual approval.
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAutoConfirm(false)}
                className="flex-1 rounded-xl border border-gray-200 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setForm((f) => ({ ...f, withdrawal_mode: "AUTO" }));
                  void handleSave("AUTO");
                }}
                className="flex-1 rounded-xl bg-amber-600 py-2.5 text-xs font-bold text-white hover:bg-amber-700"
              >
                Yes, Enable AUTO Mode
              </button>
            </div>
          </div>
        </div>
      )}
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
  const [form, setForm] = useState({
    level: "global" as Commission["level"],
    target_id: "",
    rate_percentage: 5,
    description: "",
    holding_period_days: 0,
    is_active: true,
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/commissions");
      if (r.ok) {
        const d = await r.json();
        setCommissions(d.commissions ?? []);
        setGlobalRate(d.globalRate ?? 5);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  function startEdit(c: Commission) {
    setEditing(c);
    setForm({
      level: c.level,
      target_id: c.target_id ?? "",
      rate_percentage: Number(c.rate_percentage),
      description: c.description ?? "",
      holding_period_days: Number(c.holding_period_days ?? 0),
      is_active: !!c.is_active,
    });
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
      const url = "/api/admin/commissions";
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

  const levelColor = (l: string) =>
    l === "global"
      ? "bg-purple-50 text-purple-700 border-purple-200"
      : l === "category"
      ? "bg-sky-50 text-sky-700 border-sky-200"
      : "bg-emerald-50 text-emerald-700 border-emerald-200";

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
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function AdminWalletsPage() {
  const [wallets, setWallets] = useState<WalletRow[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRow[]>([]);
  const [wdStatus, setWdStatus] = useState("PENDING");
  const [wdCounts, setWdCounts] = useState<Record<string, number>>({});
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<{ pages: number; total: number } | null>(null);
  const [activeModal, setActiveModal] = useState<WithdrawalRow | null>(null);
  const [showCommissions, setShowCommissions] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<WithdrawalSettings>({
    withdrawal_mode: "MANUAL",
    min_withdrawal_amount: 500,
    max_withdrawal_amount: 500000,
    withdrawal_fee_fixed: 0,
    withdrawal_fee_percentage: 0,
    auto_max_amount: 50000,
    daily_user_limit: 100000,
    daily_global_limit: 1000000,
  });

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/withdrawal-settings");
      if (res.ok) {
        const data = await res.json();
        if (data.settings) setSettings(data.settings);
      }
    } catch {}
  }, []);

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
    } finally {
      setLoading(false);
    }
  }, [page]);

  const fetchWithdrawals = useCallback(async () => {
    const q = new URLSearchParams();
    if (wdStatus) q.set("status", wdStatus);
    if (search) q.set("search", search);

    const res = await fetch(`/api/admin/withdrawals?${q.toString()}`);
    if (res.ok) {
      const data = await res.json();
      setWithdrawals(data.withdrawals ?? []);
      setWdCounts(data.counts ?? {});
    }
  }, [wdStatus, search]);

  useEffect(() => { void fetchSettings(); }, [fetchSettings]);
  useEffect(() => { void fetchWallets(); }, [fetchWallets]);
  useEffect(() => { void fetchWithdrawals(); }, [fetchWithdrawals]);

  const wdStatuses = ["PENDING", "APPROVED", "PROCESSING", "SUCCESS", "FAILED", "REJECTED", "ALL"];

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-gray-900 md:text-2xl">Wallets &amp; Payout Disbursements</h1>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold ${
                settings.withdrawal_mode === "AUTO"
                  ? "border border-amber-200 bg-amber-50 text-amber-700"
                  : "border border-emerald-200 bg-emerald-50 text-emerald-700"
              }`}
            >
              Mode: {settings.withdrawal_mode}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-gray-500">
            Fapshi payout approvals, automated disbursements, commission structures, and store financial ledgers.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowSettings((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 shadow-sm"
          >
            <Settings size={13} /> Payout Rules
            {showSettings ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
          <button
            type="button"
            onClick={() => setShowCommissions((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-purple-200 bg-purple-50 px-3.5 py-2 text-xs font-bold text-purple-700 hover:bg-purple-100"
          >
            <Percent size={13} /> Commissions
            {showCommissions ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
          <button
            type="button"
            onClick={() => {
              void fetchWallets();
              void fetchWithdrawals();
              void fetchSettings();
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 shadow-sm"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>
      </div>

      {/* ── Settings Panel ── */}
      {showSettings && (
        <SettingsPanel
          settings={settings}
          onUpdate={() => {
            void fetchSettings();
            void fetchWithdrawals();
          }}
        />
      )}

      {/* ── Commission Panel ── */}
      {showCommissions && <CommissionPanel />}

      {/* ── Summary ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Available Balances", value: fmt(summary?.total_available ?? 0), icon: <DollarSign size={16} />, color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
          { label: "Pending Withdrawals", value: fmt(summary?.total_pending ?? 0), icon: <Clock size={16} />, color: "text-amber-700", bg: "bg-amber-50 border-amber-200" },
          { label: "Platform Gross Sales", value: fmt(summary?.total_sales ?? 0), icon: <TrendingUp size={16} />, color: "text-sky-700", bg: "bg-sky-50 border-sky-200" },
          { label: "Total Commissions Earned", value: fmt(summary?.total_commission ?? 0), icon: <Percent size={16} />, color: "text-purple-700", bg: "bg-purple-50 border-purple-200" },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl border p-3.5 shadow-sm ${s.bg}`}>
            <div className={`mb-1.5 ${s.color}`}>{s.icon}</div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500">{s.label}</p>
            <p className={`mt-0.5 text-lg font-extrabold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* ── Withdrawals ── */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-3.5">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="text-amber-600" />
            <h2 className="text-sm font-bold text-gray-900">Withdrawal &amp; Payout Requests</h2>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-2.5 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search store, phone, ref..."
                className="rounded-xl border border-gray-200 bg-gray-50 pl-8 pr-3 py-1.5 text-xs focus:border-brand focus:bg-white focus:outline-none"
              />
            </div>
            {/* Status filter tabs */}
            <div className="flex flex-wrap gap-1">
              {wdStatuses.map((s) => {
                const count = wdCounts[s.toLowerCase()] ?? 0;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setWdStatus(s)}
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-colors ${
                      wdStatus.toUpperCase() === s.toUpperCase()
                        ? "bg-gray-900 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {s} {count > 0 ? `(${count})` : ""}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50 text-left text-[11px] font-bold uppercase tracking-wider text-gray-500">
                <th className="px-5 py-3">Store &amp; Seller</th>
                <th className="px-3 py-3">Gross / Net</th>
                <th className="px-3 py-3">Payment Method</th>
                <th className="px-3 py-3">Recipient Account</th>
                <th className="px-3 py-3">Date</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Fapshi Ref / TransId</th>
                <th className="px-3 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {withdrawals.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center">
                    <Wallet size={28} className="mx-auto mb-2 text-gray-300" />
                    <p className="text-gray-400 text-xs">No {wdStatus.toLowerCase()} withdrawal requests found</p>
                  </td>
                </tr>
              ) : (
                withdrawals.map((w) => (
                  <tr key={w.id} className="hover:bg-gray-50/60">
                    <td className="px-5 py-3">
                      <Link href={`/store/${w.store_slug}`} target="_blank" className="font-bold text-gray-900 hover:text-emerald-600">
                        {w.store_name}
                      </Link>
                      <p className="text-[10px] text-gray-500">{w.user_name}</p>
                    </td>
                    <td className="px-3 py-3">
                      <p className="font-extrabold text-emerald-700">{fmt(w.net_amount || w.amount, w.currency)}</p>
                      {w.fee > 0 && <p className="text-[10px] text-amber-700">Fee: {fmt(w.fee, w.currency)}</p>}
                    </td>
                    <td className="px-3 py-3 capitalize text-gray-700 font-semibold">{w.payment_method.replace(/_/g, " ")}</td>
                    <td className="px-3 py-3">
                      {w.recipient_phone && <p className="font-mono text-gray-900 font-semibold">{maskPhoneNumber(w.recipient_phone)}</p>}
                      {w.recipient_email && <p className="text-gray-700">{w.recipient_email}</p>}
                      {!w.recipient_phone && !w.recipient_email && <p className="text-gray-400">—</p>}
                    </td>
                    <td className="px-3 py-3 text-[11px] text-gray-400">
                      {new Date(w.requested_at || w.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-3"><StatusBadge status={w.status} /></td>
                    <td className="px-3 py-3 text-[11px] text-gray-500 font-mono">
                      {w.fapshi_transaction_id || w.fapshi_reference || w.payout_reference || "—"}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setActiveModal(w)}
                        className="rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 shadow-sm"
                      >
                        {w.status === "PENDING" ? "Review & Payout" : "Manage"}
                      </button>
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
                <th className="px-3 py-3">Reserved (Pending)</th>
                <th className="px-3 py-3">Total Sales</th>
                <th className="px-3 py-3">Commission Paid</th>
                <th className="px-3 py-3">Total Withdrawn</th>
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
          onDone={() => {
            setActiveModal(null);
            void fetchWallets();
            void fetchWithdrawals();
          }}
        />
      )}
    </div>
  );
}

