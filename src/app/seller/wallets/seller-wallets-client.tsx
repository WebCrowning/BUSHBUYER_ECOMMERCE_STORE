"use client";

import { useCallback, useEffect, useState } from "react";
import type { Store } from "@/types/marketplace";
import {
  Wallet, DollarSign, Clock, TrendingUp, Percent,
  PlusCircle, Loader2, RefreshCw, X, Info,
  ArrowDownLeft, ArrowUpRight,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface WalletData {
  id: number; store_id: number;
  available_balance: number; pending_balance: number;
  total_withdrawals: number; total_refunds: number;
  total_commission_paid: number; total_sales: number;
  currency: string; updated_at: string;
}

interface Transaction {
  id: number; amount: number; transaction_type: string;
  reference_type: string | null; reference_id: string | null;
  description: string | null; status: string;
  admin_note: string | null; created_at: string;
}

interface Withdrawal {
  id: number; amount: number; payment_method: string;
  payout_details_json: string; status: string;
  payout_reference: string | null; admin_notes: string | null;
  processed_at: string | null; created_at: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(v: number, c = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: c }).format(Number(v ?? 0));
}

function TxTypeBadge({ type }: { type: string }) {
  const map: Record<string, string> = {
    sale:       "bg-emerald-50 text-emerald-700 border-emerald-200",
    commission: "bg-purple-50 text-purple-700 border-purple-200",
    withdrawal: "bg-amber-50 text-amber-700 border-amber-200",
    refund:     "bg-red-50 text-red-700 border-red-200",
    adjustment: "bg-sky-50 text-sky-700 border-sky-200",
    payment_fee:"bg-gray-50 text-gray-600 border-gray-200",
  };
  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold capitalize ${map[type] ?? "bg-gray-50 text-gray-600 border-gray-200"}`}>
      {type.replace(/_/g, " ")}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending:   "border-amber-200 bg-amber-50 text-amber-700",
    approved:  "border-sky-200 bg-sky-50 text-sky-700",
    processed: "border-emerald-200 bg-emerald-50 text-emerald-700",
    rejected:  "border-red-200 bg-red-50 text-red-700",
    completed: "border-emerald-200 bg-emerald-50 text-emerald-700",
  };
  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold capitalize ${map[status] ?? "border-gray-200 bg-gray-50 text-gray-600"}`}>
      {status}
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
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"ledger" | "withdrawals">("ledger");

  // Withdrawal form
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("bank_transfer");
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [bankName, setBankName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
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
      }
    } finally {
      setLoading(false);
    }
  }, [store.id]);

  useEffect(() => { void load(); }, [load]);

  const available = Number(wallet?.available_balance ?? 0);
  const hasPending = withdrawals.some((w) => w.status === "pending" || w.status === "approved");

  async function handleWithdraw(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const amt = Number(amount);
    if (isNaN(amt) || amt < 10) { setMsg({ text: "Minimum withdrawal is $10.00.", ok: false }); return; }
    if (amt > available) { setMsg({ text: `Amount exceeds available balance (${fmt(available)}).`, ok: false }); return; }
    if (hasPending) { setMsg({ text: "You already have a pending withdrawal. Wait for it to be processed.", ok: false }); return; }

    setSubmitting(true);
    try {
      const res = await fetch("/api/seller/wallets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId: store.id,
          amount: amt,
          paymentMethod,
          payoutDetails: {
            accountName, accountNumber, bankName,
            mobileNumber, paypalEmail, notes,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) { setMsg({ text: data.error ?? "Submission failed.", ok: false }); return; }
      setMsg({ text: "Withdrawal request submitted! An admin will review and process it.", ok: true });
      setAmount("");
      setAccountName(""); setAccountNumber(""); setBankName("");
      setMobileNumber(""); setPaypalEmail(""); setNotes("");
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
            <h1 className="text-xl font-extrabold text-brand-deep">Wallet &amp; Earnings</h1>
            <p className="mt-0.5 text-xs text-foreground/60">
              <span className="font-semibold text-foreground/80">{store.name}</span> — platform commission: <span className="font-bold text-purple-600">{commissionRate}%</span>
            </p>
          </div>
        </div>
        <button type="button" onClick={() => void load()}
          className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-bold text-foreground/60 hover:bg-surface-soft">
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
            <span className="text-[10px] font-bold uppercase tracking-wider text-foreground/50">Pending</span>
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <p className="text-xl font-extrabold text-amber-600">{loading ? "…" : fmt(wallet?.pending_balance ?? 0)}</p>
          <p className="mt-0.5 text-[10px] text-foreground/50">Awaiting delivery / admin</p>
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
            <span className="text-[10px] font-bold uppercase tracking-wider text-foreground/50">Fees Paid</span>
            <Percent className="h-4 w-4 text-purple-500" />
          </div>
          <p className="text-xl font-extrabold text-purple-600">{loading ? "…" : fmt(wallet?.total_commission_paid ?? 0)}</p>
          <p className="mt-0.5 text-[10px] text-foreground/50">Platform commission</p>
        </div>
      </div>

      {/* ── Withdrawal Form ── */}
      {canWithdraw ? (
        <div className="rounded-2xl border border-border bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <PlusCircle className="h-4 w-4 text-emerald-600" />
            <h2 className="text-sm font-bold text-brand-deep">Request Payout</h2>
          </div>

          {hasPending && (
            <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-medium text-amber-800">
              <Info size={13} className="mt-0.5 shrink-0" />
              You have an active withdrawal pending admin review. Submit another after it is processed.
            </div>
          )}

          {msg && (
            <div className={`flex items-center justify-between rounded-xl border px-4 py-2.5 text-xs font-semibold ${msg.ok ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}`}>
              {msg.text}
              <button type="button" onClick={() => setMsg(null)}><X size={12} className="ml-2 opacity-60" /></button>
            </div>
          )}

          <form onSubmit={(e) => void handleWithdraw(e)} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-foreground/50">Amount (USD) *</label>
                <input type="number" min={10} step={0.01} max={available} value={amount}
                  onChange={(e) => setAmount(e.target.value)} placeholder={`Max: ${fmt(available)}`}
                  className="w-full rounded-xl border border-border bg-surface-soft px-4 py-2.5 text-xs focus:border-brand focus:bg-white focus:outline-none" />
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-foreground/50">Payment Method *</label>
                <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full rounded-xl border border-border bg-surface-soft px-4 py-2.5 text-xs focus:border-brand focus:outline-none">
                  <option value="bank_transfer">Bank Wire / Direct Transfer</option>
                  <option value="fapshi">Fapshi Mobile Money</option>
                  <option value="paypal">PayPal</option>
                </select>
              </div>
            </div>

            {/* Payout details — conditional by method */}
            {paymentMethod === "bank_transfer" && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div><label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-foreground/50">Account Name</label>
                  <input value={accountName} onChange={(e) => setAccountName(e.target.value)} placeholder="Full name on account" className="w-full rounded-xl border border-border bg-surface-soft px-3 py-2 text-xs focus:border-brand focus:outline-none" /></div>
                <div><label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-foreground/50">Account Number</label>
                  <input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} placeholder="IBAN / account number" className="w-full rounded-xl border border-border bg-surface-soft px-3 py-2 text-xs focus:border-brand focus:outline-none" /></div>
                <div><label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-foreground/50">Bank Name</label>
                  <input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="e.g. Afriland First Bank" className="w-full rounded-xl border border-border bg-surface-soft px-3 py-2 text-xs focus:border-brand focus:outline-none" /></div>
              </div>
            )}

            {paymentMethod === "fapshi" && (
              <div><label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-foreground/50">Mobile Money Number</label>
                <input value={mobileNumber} onChange={(e) => setMobileNumber(e.target.value)} placeholder="+237 6XX XXX XXX" className="w-full rounded-xl border border-border bg-surface-soft px-3 py-2 text-xs focus:border-brand focus:outline-none" /></div>
            )}

            {paymentMethod === "paypal" && (
              <div><label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-foreground/50">PayPal Email</label>
                <input type="email" value={paypalEmail} onChange={(e) => setPaypalEmail(e.target.value)} placeholder="paypal@email.com" className="w-full rounded-xl border border-border bg-surface-soft px-3 py-2 text-xs focus:border-brand focus:outline-none" /></div>
            )}

            <div><label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-foreground/50">Notes (optional)</label>
              <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any additional instructions for the admin..."
                className="w-full rounded-xl border border-border bg-surface-soft px-3 py-2 text-xs focus:border-brand focus:outline-none" /></div>

            <div className="flex justify-end">
              <button type="submit" disabled={submitting || available < 10 || hasPending}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:opacity-50">
                {submitting ? <Loader2 size={13} className="animate-spin" /> : <DollarSign size={13} />}
                {submitting ? "Submitting…" : "Submit Payout Request"}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <Info size={15} className="mt-0.5 shrink-0 text-amber-600" />
          <p className="text-xs font-medium text-amber-800">Only store owners can request withdrawals. Contact your store owner to initiate a payout.</p>
        </div>
      )}

      {/* ── Tabs: Ledger / Withdrawals ── */}
      <div className="flex rounded-2xl border border-border bg-white p-1.5 shadow-sm">
        {(["ledger", "withdrawals"] as const).map((t) => (
          <button key={t} type="button" onClick={() => setActiveTab(t)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold capitalize transition-all ${activeTab === t ? "bg-brand text-white shadow-sm" : "text-foreground/60 hover:text-foreground"}`}>
            {t === "ledger" ? <ArrowDownLeft size={13} /> : <ArrowUpRight size={13} />}
            {t === "ledger" ? "Transaction Ledger" : "Withdrawal History"}
            <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-extrabold ${activeTab === t ? "bg-white/20" : "bg-surface"}`}>
              {t === "ledger" ? transactions.length : withdrawals.length}
            </span>
          </button>
        ))}
      </div>

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

      {/* ── Withdrawals Table ── */}
      {activeTab === "withdrawals" && (
        <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
          <div className="border-b border-border px-5 py-3.5">
            <h2 className="text-sm font-bold text-brand-deep">Withdrawal History</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-surface-soft/60 text-left text-[11px] font-bold uppercase tracking-wider text-foreground/50">
                  <th className="px-5 py-3">Date</th>
                  <th className="px-3 py-3">Amount</th>
                  <th className="px-3 py-3">Method</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">Payout Ref</th>
                  <th className="px-3 py-3">Admin Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i}>{Array.from({ length: 6 }).map((__, j) => (<td key={j} className="px-3 py-3"><div className="h-4 animate-pulse rounded-lg bg-border" /></td>))}</tr>
                  ))
                ) : withdrawals.length === 0 ? (
                  <tr><td colSpan={6} className="py-10 text-center text-foreground/40">No withdrawal requests yet.</td></tr>
                ) : (
                  withdrawals.map((w) => (
                    <tr key={w.id} className="hover:bg-surface-soft/40">
                      <td className="px-5 py-3 text-foreground/50">{new Date(w.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</td>
                      <td className="px-3 py-3 font-extrabold text-emerald-600">{fmt(w.amount)}</td>
                      <td className="px-3 py-3 capitalize text-foreground/70">{w.payment_method.replace(/_/g, " ")}</td>
                      <td className="px-3 py-3"><StatusBadge status={w.status} /></td>
                      <td className="px-3 py-3 font-mono text-[10px] text-foreground/50">{w.payout_reference ?? "—"}</td>
                      <td className="px-3 py-3 text-foreground/60 max-w-[160px] truncate">{w.admin_notes ?? "—"}</td>
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
