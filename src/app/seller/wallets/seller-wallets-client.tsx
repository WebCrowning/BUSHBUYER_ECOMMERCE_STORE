"use client";

import { useCallback, useEffect, useState } from "react";
import type { Store } from "@/types/marketplace";
import {
  Wallet, DollarSign, Clock, TrendingUp, Percent,
  PlusCircle, Loader2, RefreshCw, X, Info,
  ArrowDownLeft, ArrowUpRight, Smartphone, Building,
  CreditCard, CheckCircle2, AlertTriangle, ShieldCheck
} from "lucide-react";
import { parseCameroonPhone, maskPhoneNumber } from "@/lib/cameroon-phone";

// ─── Types ────────────────────────────────────────────────────────────────────
interface WalletData {
  id: number;
  store_id: number;
  available_balance: number;
  pending_balance: number;
  total_withdrawals: number;
  total_refunds: number;
  total_commission_paid: number;
  total_sales: number;
  currency: string;
  updated_at: string;
}

interface Transaction {
  id: number;
  amount: number;
  transaction_type: string;
  reference_type: string | null;
  reference_id: string | null;
  description: string | null;
  status: string;
  admin_note: string | null;
  created_at: string;
}

interface Withdrawal {
  id: number;
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
  processed_at: string | null;
  created_at: string;
}

interface WithdrawalSettings {
  withdrawal_mode: "MANUAL" | "AUTO";
  min_withdrawal_amount: number;
  max_withdrawal_amount: number;
  withdrawal_fee_fixed: number;
  withdrawal_fee_percentage: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(v: number, c = "XAF") {
  if (c === "XAF" || c === "FCFA") {
    return `${Number(v ?? 0).toLocaleString()} XAF`;
  }
  return new Intl.NumberFormat("en-US", { style: "currency", currency: c }).format(Number(v ?? 0));
}

function TxTypeBadge({ type }: { type: string }) {
  const map: Record<string, string> = {
    sale:        "bg-emerald-50 text-emerald-700 border-emerald-200",
    commission:  "bg-purple-50 text-purple-700 border-purple-200",
    withdrawal:  "bg-amber-50 text-amber-700 border-amber-200",
    refund:      "bg-red-50 text-red-700 border-red-200",
    adjustment:  "bg-sky-50 text-sky-700 border-sky-200",
    payment_fee: "bg-gray-50 text-gray-600 border-gray-200",
  };
  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold capitalize ${map[type] ?? "bg-gray-50 text-gray-600 border-gray-200"}`}>
      {type.replace(/_/g, " ")}
    </span>
  );
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

// ─── Main Component ───────────────────────────────────────────────────────────
export default function SellerWalletsClient({
  store,
  canWithdraw,
}: {
  store: Store;
  canWithdraw: boolean;
}) {
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [commissionRate, setCommissionRate] = useState<number>(5);
  const [settings, setSettings] = useState<WithdrawalSettings>({
    withdrawal_mode: "MANUAL",
    min_withdrawal_amount: 500,
    max_withdrawal_amount: 500000,
    withdrawal_fee_fixed: 0,
    withdrawal_fee_percentage: 0,
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"ledger" | "withdrawals">("withdrawals");

  // Withdrawal form
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("fapshi_mtn");
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [bankName, setBankName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [fapshiEmail, setFapshiEmail] = useState("");
  const [paypalEmail, setPaypalEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/seller/wallets?storeId=${store.id}`);
      if (res.ok) {
        const data = await res.json();
        setWallet(data.wallet ?? null);
        setTransactions(data.transactions ?? []);
        setWithdrawals(data.withdrawals ?? []);
        setCommissionRate(Number(data.commissionRate ?? 5));
        if (data.withdrawalSettings) {
          setSettings(data.withdrawalSettings);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [store.id]);

  useEffect(() => { void load(); }, [load]);

  const available = Number(wallet?.available_balance ?? 0);
  const hasPending = withdrawals.some((w) => {
    const s = w.status?.toUpperCase();
    return s === "PENDING" || s === "APPROVED" || s === "PROCESSING";
  });

  // Calculate live fee & net amount
  const amtNum = Number(amount) || 0;
  const fixedFee = Number(settings.withdrawal_fee_fixed || 0);
  const pctFee = (amtNum * Number(settings.withdrawal_fee_percentage || 0)) / 100;
  const totalFee = Math.round((fixedFee + pctFee) * 100) / 100;
  const netAmount = Math.max(0, Math.round((amtNum - totalFee) * 100) / 100);

  // Live Cameroon phone parsing
  const phoneCheck = parseCameroonPhone(mobileNumber);

  async function handleWithdraw(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);

    if (isNaN(amtNum) || amtNum < settings.min_withdrawal_amount) {
      setMsg({ text: `Minimum withdrawal is ${fmt(settings.min_withdrawal_amount)}.`, ok: false });
      return;
    }
    if (amtNum > settings.max_withdrawal_amount) {
      setMsg({ text: `Maximum withdrawal is ${fmt(settings.max_withdrawal_amount)}.`, ok: false });
      return;
    }
    if (amtNum > available) {
      setMsg({ text: `Amount exceeds your available balance (${fmt(available)}).`, ok: false });
      return;
    }
    if (hasPending) {
      setMsg({ text: "You already have an active withdrawal awaiting processing.", ok: false });
      return;
    }

    if (paymentMethod === "fapshi_mtn" || paymentMethod === "fapshi_orange") {
      if (!phoneCheck.isValid) {
        setMsg({ text: phoneCheck.errorMessage || "Please enter a valid 9-digit Cameroon mobile money number.", ok: false });
        return;
      }
    } else if (paymentMethod === "fapshi_wallet") {
      if (!fapshiEmail || !fapshiEmail.includes("@")) {
        setMsg({ text: "Please enter a valid Fapshi account email address.", ok: false });
        return;
      }
    }

    setSubmitting(true);
    try {
      const idempotencyKey = `wd-${store.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const res = await fetch("/api/seller/wallets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId: store.id,
          amount: amtNum,
          paymentMethod,
          idempotencyKey,
          payoutDetails: {
            accountName: accountName || undefined,
            accountNumber: accountNumber || undefined,
            bankName: bankName || undefined,
            mobileNumber: mobileNumber ? phoneCheck.normalized : undefined,
            phone: mobileNumber ? phoneCheck.normalized : undefined,
            email: fapshiEmail || undefined,
            paypalEmail: paypalEmail || undefined,
            notes: notes || undefined,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setMsg({ text: data.error ?? "Withdrawal request failed.", ok: false });
        return;
      }

      setMsg({
        text: data.message || "Withdrawal request submitted! It will be processed shortly.",
        ok: true,
      });

      setAmount("");
      setAccountName("");
      setAccountNumber("");
      setBankName("");
      setMobileNumber("");
      setFapshiEmail("");
      setPaypalEmail("");
      setNotes("");
      setActiveTab("withdrawals");
      await load();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-border bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50">
            <Wallet className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-brand-deep">Wallet &amp; Payouts</h1>
            <p className="mt-0.5 text-xs text-foreground/60">
              <span className="font-semibold text-foreground/80">{store.name}</span> — platform commission: <span className="font-bold text-purple-600">{commissionRate}%</span>
            </p>
          </div>
        </div>
        <button type="button" onClick={() => void load()}
          className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3.5 py-2 text-xs font-bold text-foreground/60 hover:bg-surface-soft shadow-sm">
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {/* ── Balance Cards ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-foreground/50">Available</span>
            <DollarSign className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="text-xl font-extrabold text-emerald-600">{loading ? "…" : fmt(available)}</p>
          <p className="mt-0.5 text-[10px] text-foreground/50">Ready to withdraw</p>
        </div>

        <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-foreground/50">Reserved / Pending</span>
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <p className="text-xl font-extrabold text-amber-600">{loading ? "…" : fmt(wallet?.pending_balance ?? 0)}</p>
          <p className="mt-0.5 text-[10px] text-foreground/50">Locked for pending payouts</p>
        </div>

        <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-foreground/50">Gross Sales</span>
            <TrendingUp className="h-4 w-4 text-sky-600" />
          </div>
          <p className="text-xl font-extrabold text-brand-deep">{loading ? "…" : fmt(wallet?.total_sales ?? 0)}</p>
          <p className="mt-0.5 text-[10px] text-foreground/50">Lifetime revenue</p>
        </div>

        <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-foreground/50">Total Paid Out</span>
            <Percent className="h-4 w-4 text-purple-500" />
          </div>
          <p className="text-xl font-extrabold text-purple-600">{loading ? "…" : fmt(wallet?.total_withdrawals ?? 0)}</p>
          <p className="mt-0.5 text-[10px] text-foreground/50">Completed disbursements</p>
        </div>
      </div>

      {/* ── Withdrawal Form ── */}
      {canWithdraw ? (
        <div className="rounded-2xl border border-border bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <PlusCircle className="h-4 w-4 text-emerald-600" />
              <h2 className="text-sm font-bold text-brand-deep">Request Withdrawal</h2>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-foreground/50">
              <span>Min: <b className="text-foreground/80">{fmt(settings.min_withdrawal_amount)}</b></span>
              <span>•</span>
              <span>Max: <b className="text-foreground/80">{fmt(settings.max_withdrawal_amount)}</b></span>
            </div>
          </div>

          {hasPending && (
            <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-medium text-amber-800">
              <Info size={14} className="mt-0.5 shrink-0 text-amber-600" />
              <span>You have an active withdrawal currently pending or processing. You can submit another after it is finalized.</span>
            </div>
          )}

          {msg && (
            <div className={`flex items-center justify-between rounded-xl border px-4 py-3 text-xs font-semibold ${msg.ok ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}`}>
              <span>{msg.text}</span>
              <button type="button" onClick={() => setMsg(null)}><X size={13} className="ml-2 opacity-60" /></button>
            </div>
          )}

          <form onSubmit={(e) => void handleWithdraw(e)} className="space-y-4">
            {/* Payment Method Selector */}
            <div>
              <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-foreground/50">Select Payout Method *</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {[
                  { id: "fapshi_mtn", label: "MTN Mobile Money", sub: "Instant MoMo Payout", icon: <Smartphone className="text-amber-500 w-4 h-4" /> },
                  { id: "fapshi_orange", label: "Orange Money", sub: "Instant OM Payout", icon: <Smartphone className="text-orange-500 w-4 h-4" /> },
                  { id: "fapshi_wallet", label: "Fapshi Wallet", sub: "Fapshi Email Account", icon: <ShieldCheck className="text-purple-600 w-4 h-4" /> },
                  { id: "bank_transfer", label: "Bank Wire Transfer", sub: "Manual 1-3 Business Days", icon: <Building className="text-sky-600 w-4 h-4" /> },
                  { id: "paypal", label: "PayPal Payout", sub: "Manual Processing", icon: <CreditCard className="text-blue-600 w-4 h-4" /> },
                ].map((m) => {
                  const isSelected = paymentMethod === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPaymentMethod(m.id)}
                      className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                        isSelected
                          ? "border-emerald-600 bg-emerald-50/60 shadow-sm ring-1 ring-emerald-500"
                          : "border-border bg-surface-soft hover:bg-white"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        {m.icon}
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                      </div>
                      <div>
                        <p className="font-bold text-xs text-brand-deep">{m.label}</p>
                        <p className="text-[10px] text-foreground/50">{m.sub}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Amount Input & Live Summary */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-foreground/50">Withdrawal Amount (XAF) *</label>
                <input
                  type="number"
                  min={settings.min_withdrawal_amount}
                  max={Math.min(available, settings.max_withdrawal_amount)}
                  step={100}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder={`Min: ${settings.min_withdrawal_amount} | Max: ${fmt(available)}`}
                  className="w-full rounded-xl border border-border bg-surface-soft px-4 py-2.5 text-xs font-semibold focus:border-brand focus:bg-white focus:outline-none"
                />
              </div>

              {/* Dynamic Fee & Net Payout Card */}
              <div className="rounded-xl border border-border/70 bg-surface-soft/60 p-3 flex flex-col justify-center space-y-1 text-xs">
                <div className="flex justify-between text-foreground/60">
                  <span>Gross Requested:</span>
                  <span className="font-bold text-brand-deep">{fmt(amtNum)}</span>
                </div>
                <div className="flex justify-between text-foreground/60">
                  <span>Withdrawal Fee:</span>
                  <span className="text-amber-700 font-semibold">{totalFee === 0 ? "FREE" : fmt(totalFee)}</span>
                </div>
                <div className="flex justify-between border-t border-border/60 pt-1 font-bold text-emerald-700">
                  <span>Net You Will Receive:</span>
                  <span className="text-sm">{fmt(netAmount)}</span>
                </div>
              </div>
            </div>

            {/* Recipient Details based on Payment Method */}
            {(paymentMethod === "fapshi_mtn" || paymentMethod === "fapshi_orange") && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-foreground/50">
                    Cameroon Mobile Money Number *
                  </label>
                  {mobileNumber && phoneCheck.isValid && (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                      ✓ {phoneCheck.operator} detected ({phoneCheck.international})
                    </span>
                  )}
                  {mobileNumber && !phoneCheck.isValid && (
                    <span className="text-[10px] font-semibold text-red-600">
                      {phoneCheck.errorMessage}
                    </span>
                  )}
                </div>
                <input
                  type="tel"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  placeholder="e.g. 677 12 34 56 or 699 00 11 22"
                  className="w-full rounded-xl border border-border bg-surface-soft px-4 py-2.5 text-xs font-mono focus:border-brand focus:bg-white focus:outline-none"
                />
              </div>
            )}

            {paymentMethod === "fapshi_wallet" && (
              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-foreground/50">Fapshi Account Email *</label>
                <input
                  type="email"
                  value={fapshiEmail}
                  onChange={(e) => setFapshiEmail(e.target.value)}
                  placeholder="your-fapshi-account@email.com"
                  className="w-full rounded-xl border border-border bg-surface-soft px-4 py-2.5 text-xs focus:border-brand focus:bg-white focus:outline-none"
                />
              </div>
            )}

            {paymentMethod === "bank_transfer" && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-foreground/50">Account Holder Name</label>
                  <input value={accountName} onChange={(e) => setAccountName(e.target.value)} placeholder="Full legal name" className="w-full rounded-xl border border-border bg-surface-soft px-3 py-2 text-xs focus:border-brand focus:outline-none" />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-foreground/50">Account / IBAN Number</label>
                  <input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} placeholder="Account number" className="w-full rounded-xl border border-border bg-surface-soft px-3 py-2 text-xs focus:border-brand focus:outline-none" />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-foreground/50">Bank Name &amp; Branch</label>
                  <input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="e.g. UBA, Afriland, Ecobank" className="w-full rounded-xl border border-border bg-surface-soft px-3 py-2 text-xs focus:border-brand focus:outline-none" />
                </div>
              </div>
            )}

            {paymentMethod === "paypal" && (
              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-foreground/50">PayPal Email *</label>
                <input
                  type="email"
                  value={paypalEmail}
                  onChange={(e) => setPaypalEmail(e.target.value)}
                  placeholder="paypal@email.com"
                  className="w-full rounded-xl border border-border bg-surface-soft px-3 py-2 text-xs focus:border-brand focus:outline-none"
                />
              </div>
            )}

            <div>
              <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-foreground/50">Notes (optional)</label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any special payout instructions for the admin..."
                className="w-full rounded-xl border border-border bg-surface-soft px-3 py-2 text-xs focus:border-brand focus:outline-none"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submitting || available < settings.min_withdrawal_amount || hasPending}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:opacity-50"
              >
                {submitting ? <Loader2 size={13} className="animate-spin" /> : <DollarSign size={13} />}
                {submitting ? "Submitting Request…" : "Confirm Withdrawal Request"}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <Info size={15} className="mt-0.5 shrink-0 text-amber-600" />
          <p className="text-xs font-medium text-amber-800">Only store owners can request payouts. Contact your store owner to initiate a withdrawal.</p>
        </div>
      )}

      {/* ── Tabs: Ledger / Withdrawals ── */}
      <div className="flex rounded-2xl border border-border bg-white p-1.5 shadow-sm">
        {(["withdrawals", "ledger"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setActiveTab(t)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold capitalize transition-all ${
              activeTab === t ? "bg-brand text-white shadow-sm" : "text-foreground/60 hover:text-foreground"
            }`}
          >
            {t === "withdrawals" ? <ArrowUpRight size={13} /> : <ArrowDownLeft size={13} />}
            {t === "withdrawals" ? "Withdrawal History" : "Transaction Ledger"}
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${activeTab === t ? "bg-white/20" : "bg-surface"}`}>
              {t === "withdrawals" ? withdrawals.length : transactions.length}
            </span>
          </button>
        ))}
      </div>

      {/* ── Withdrawals Table ── */}
      {activeTab === "withdrawals" && (
        <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
          <div className="border-b border-border px-5 py-3.5 flex items-center justify-between">
            <h2 className="text-sm font-bold text-brand-deep">Withdrawal Requests &amp; Disbursements</h2>
            <span className="text-xs text-foreground/40">{withdrawals.length} record{withdrawals.length !== 1 ? "s" : ""}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-surface-soft/60 text-left text-[11px] font-bold uppercase tracking-wider text-foreground/50">
                  <th className="px-5 py-3">Date</th>
                  <th className="px-3 py-3">Requested</th>
                  <th className="px-3 py-3">Net Payout</th>
                  <th className="px-3 py-3">Method / Recipient</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">Reference</th>
                  <th className="px-3 py-3">Notes / Error</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i}>{Array.from({ length: 7 }).map((__, j) => (<td key={j} className="px-3 py-3"><div className="h-4 animate-pulse rounded-lg bg-border" /></td>))}</tr>
                  ))
                ) : withdrawals.length === 0 ? (
                  <tr><td colSpan={7} className="py-12 text-center text-foreground/40">No withdrawal requests yet.</td></tr>
                ) : (
                  withdrawals.map((w) => (
                    <tr key={w.id} className="hover:bg-surface-soft/40">
                      <td className="px-5 py-3 text-foreground/50">{new Date(w.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</td>
                      <td className="px-3 py-3 font-semibold text-foreground/70">{fmt(w.amount, w.currency)}</td>
                      <td className="px-3 py-3 font-extrabold text-emerald-600">{fmt(w.net_amount || w.amount, w.currency)}</td>
                      <td className="px-3 py-3">
                        <span className="font-semibold text-brand-deep capitalize">{w.payment_method.replace(/_/g, " ")}</span>
                        {w.recipient_phone && <p className="text-[10px] text-foreground/50 font-mono">{maskPhoneNumber(w.recipient_phone)}</p>}
                        {w.recipient_email && <p className="text-[10px] text-foreground/50">{w.recipient_email}</p>}
                      </td>
                      <td className="px-3 py-3"><StatusBadge status={w.status} /></td>
                      <td className="px-3 py-3 font-mono text-[10px] text-foreground/50">
                        {w.fapshi_transaction_id || w.fapshi_reference || w.payout_reference || "—"}
                      </td>
                      <td className="px-3 py-3 text-foreground/60 max-w-[180px] truncate" title={w.failure_reason || w.admin_notes || ""}>
                        {w.failure_reason ? (
                          <span className="text-red-600 font-semibold">{w.failure_reason}</span>
                        ) : (
                          w.admin_notes || "—"
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Ledger Table ── */}
      {activeTab === "ledger" && (
        <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
          <div className="border-b border-border px-5 py-3.5">
            <h2 className="text-sm font-bold text-brand-deep">Transaction Ledger</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-surface-soft/60 text-left text-[11px] font-bold uppercase tracking-wider text-foreground/50">
                  <th className="px-5 py-3">Date</th>
                  <th className="px-3 py-3">Type</th>
                  <th className="px-3 py-3">Amount</th>
                  <th className="px-3 py-3">Description</th>
                  <th className="px-3 py-3">Ref</th>
                  <th className="px-3 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>{Array.from({ length: 6 }).map((__, j) => (<td key={j} className="px-3 py-3"><div className="h-4 animate-pulse rounded-lg bg-border" /></td>))}</tr>
                  ))
                ) : transactions.length === 0 ? (
                  <tr><td colSpan={6} className="py-10 text-center text-foreground/40">No transactions yet.</td></tr>
                ) : (
                  transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-surface-soft/40">
                      <td className="px-5 py-3 text-foreground/50">{new Date(tx.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</td>
                      <td className="px-3 py-3"><TxTypeBadge type={tx.transaction_type} /></td>
                      <td className={`px-3 py-3 font-extrabold ${["sale", "adjustment"].includes(tx.transaction_type) ? "text-emerald-600" : "text-foreground/70"}`}>
                        {["commission", "withdrawal", "refund", "payment_fee"].includes(tx.transaction_type) ? "-" : "+"}{fmt(tx.amount)}
                      </td>
                      <td className="px-3 py-3 text-foreground/70 max-w-[200px] truncate">{tx.description ?? "—"}</td>
                      <td className="px-3 py-3 font-mono text-[10px] text-foreground/50">{tx.reference_id ?? "—"}</td>
                      <td className="px-3 py-3"><StatusBadge status={tx.status} /></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

