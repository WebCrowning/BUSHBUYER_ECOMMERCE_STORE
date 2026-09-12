"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Coins,
  Store,
  Wallet,
  ArrowRight,
  Save,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Percent,
  DollarSign,
  ArrowUpRight,
  Settings2,
  Lock,
  Zap,
  ShieldCheck,
} from "lucide-react";

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

export default function FeesAndChargesPage() {
  // Store Registration Fee State
  const [regFee, setRegFee] = useState<number>(5000);
  const [regFeeInput, setRegFeeInput] = useState<string>("5000");
  const [loadingRegFee, setLoadingRegFee] = useState(true);
  const [savingRegFee, setSavingRegFee] = useState(false);
  const [regFeeSuccess, setRegFeeSuccess] = useState("");
  const [regFeeError, setRegFeeError] = useState("");

  // Withdrawal Settings State
  const [withdrawalSettings, setWithdrawalSettings] = useState<WithdrawalSettings>({
    withdrawal_mode: "MANUAL",
    min_withdrawal_amount: 500,
    max_withdrawal_amount: 500000,
    withdrawal_fee_fixed: 0,
    withdrawal_fee_percentage: 0,
    auto_max_amount: 50000,
    daily_user_limit: 100000,
    daily_global_limit: 1000000,
  });
  const [loadingWithdrawal, setLoadingWithdrawal] = useState(true);
  const [savingWithdrawal, setSavingWithdrawal] = useState(false);
  const [withdrawalSuccess, setWithdrawalSuccess] = useState("");
  const [withdrawalError, setWithdrawalError] = useState("");
  const [updateReason, setUpdateReason] = useState("");

  // Load Store Registration Fee from live database
  const loadRegFee = async () => {
    try {
      setLoadingRegFee(true);
      setRegFeeError("");
      const res = await fetch("/api/admin/registration-settings");
      if (res.ok) {
        const data = await res.json();
        const fee = data.fee_cfa ?? 5000;
        setRegFee(fee);
        setRegFeeInput(String(fee));
      } else {
        setRegFeeError("Failed to fetch current registration fee.");
      }
    } catch {
      setRegFeeError("Network error while loading registration fee.");
    } finally {
      setLoadingRegFee(false);
    }
  };

  // Load Withdrawal Settings from live database
  const loadWithdrawalSettings = async () => {
    try {
      setLoadingWithdrawal(true);
      setWithdrawalError("");
      const res = await fetch("/api/admin/withdrawal-settings");
      if (res.ok) {
        const data = await res.json();
        if (data.settings) {
          setWithdrawalSettings(data.settings);
        }
      } else {
        setWithdrawalError("Failed to fetch withdrawal fee settings.");
      }
    } catch {
      setWithdrawalError("Network error while loading withdrawal settings.");
    } finally {
      setLoadingWithdrawal(false);
    }
  };

  useEffect(() => {
    loadRegFee();
    loadWithdrawalSettings();
  }, []);

  // Save Store Registration Fee to live database
  const handleSaveRegFee = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegFeeSuccess("");
    setRegFeeError("");

    const val = Number(regFeeInput);
    if (!Number.isFinite(val) || val < 100) {
      setRegFeeError("Store registration fee must be at least 100 CFA.");
      return;
    }

    try {
      setSavingRegFee(true);
      const res = await fetch("/api/admin/registration-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fee_cfa: val }),
      });
      const data = await res.json();
      if (!res.ok) {
        setRegFeeError(data.error || "Failed to update registration fee.");
        return;
      }
      setRegFee(data.fee_cfa);
      setRegFeeInput(String(data.fee_cfa));
      setRegFeeSuccess(`Live store registration fee updated to ${data.fee_cfa.toLocaleString()} CFA!`);
    } catch {
      setRegFeeError("Unexpected error while saving fee.");
    } finally {
      setSavingRegFee(false);
    }
  };

  // Save Withdrawal Settings to live database
  const handleSaveWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    setWithdrawalSuccess("");
    setWithdrawalError("");

    if (withdrawalSettings.min_withdrawal_amount > withdrawalSettings.max_withdrawal_amount) {
      setWithdrawalError("Minimum withdrawal cannot be greater than maximum withdrawal.");
      return;
    }

    try {
      setSavingWithdrawal(true);
      const res = await fetch("/api/admin/withdrawal-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...withdrawalSettings,
          reason: updateReason || "Live fee update from Admin Fees & Charges dashboard",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setWithdrawalError(data.error || "Failed to update withdrawal charges.");
        return;
      }
      setWithdrawalSettings(data.settings);
      setWithdrawalSuccess("Live store owner withdrawal charges & limits updated successfully!");
      setUpdateReason("");
    } catch {
      setWithdrawalError("Unexpected error while saving withdrawal settings.");
    } finally {
      setSavingWithdrawal(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <Coins className="w-8 h-8 text-brand" />
            <h1 className="text-2xl md:text-3xl font-black text-white">
              Platform Fees &amp; Charges Management
            </h1>
          </div>
          <p className="text-slate-400 text-xs md:text-sm mt-1">
            Configure live store creation fees and seller withdrawal charges. All changes are written directly to the database and apply live.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              loadRegFee();
              loadWithdrawalSettings();
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-800 bg-slate-900 text-slate-300 text-xs font-semibold hover:text-white hover:bg-slate-800 transition-colors"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${loadingRegFee || loadingWithdrawal ? "animate-spin" : ""}`}
            />
            Refresh Live Settings
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 1: STORE CREATION / REGISTRATION FEE
         ───────────────────────────────────────────────────────────── */}
      <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 md:p-8 space-y-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Store className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white">Store Creation Registration Fee</h2>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-extrabold uppercase">
                  Live Vendor Onboarding
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                The one-time registration fee vendors pay via MTN / Orange Mobile Money when applying for a store.
              </p>
            </div>
          </div>

          <Link
            href="/store/apply"
            target="_blank"
            className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:text-brand-light transition-colors self-start sm:self-auto"
          >
            Open Live Application Page <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Feedback alerts */}
        {regFeeSuccess && (
          <div className="flex items-center gap-2 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            {regFeeSuccess}
          </div>
        )}
        {regFeeError && (
          <div className="flex items-center gap-2 p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {regFeeError}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Current Live Fee Card */}
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-6 flex flex-col justify-between">
            <div>
              <span className="text-[11px] uppercase tracking-wider font-bold text-emerald-400 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5" /> Live Active Registration Fee
              </span>
              <div className="mt-3">
                {loadingRegFee ? (
                  <div className="h-10 w-32 bg-slate-800 rounded-lg animate-pulse" />
                ) : (
                  <p className="text-3xl sm:text-4xl font-black text-white">
                    {regFee.toLocaleString()}{" "}
                    <span className="text-emerald-400 text-lg font-bold">CFA</span>
                  </p>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Applied to all incoming store registration requests on the live website.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-emerald-500/20 text-[11px] text-emerald-300 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Connected directly to live Fapshi Mobile Money checkout.
            </div>
          </div>

          {/* Update Live Fee Form */}
          <form
            onSubmit={handleSaveRegFee}
            className="lg:col-span-2 rounded-2xl border border-slate-800 bg-slate-950/60 p-6 flex flex-col justify-between space-y-4"
          >
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                Update Store Registration Fee (CFA)
              </label>
              <div className="relative max-w-md">
                <input
                  type="number"
                  min="100"
                  step="100"
                  value={regFeeInput}
                  onChange={(e) => setRegFeeInput(e.target.value)}
                  disabled={loadingRegFee || savingRegFee}
                  className="w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-lg font-bold text-white focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand disabled:opacity-50"
                  placeholder="e.g. 5000"
                  required
                />
                <span className="absolute right-4 top-3.5 text-xs font-bold text-slate-500">
                  XAF / CFA
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-2">
                Enter the exact amount in Central African CFA Francs (XAF).
              </p>

              {/* Presets */}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="text-[11px] text-slate-500 font-semibold">Quick Amounts:</span>
                {[2500, 5000, 7500, 10000, 15000].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setRegFeeInput(String(preset))}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all ${
                      Number(regFeeInput) === preset
                        ? "bg-brand/20 border-brand text-brand font-bold"
                        : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    {preset.toLocaleString()} CFA
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800/80 flex items-center justify-end">
              <button
                type="submit"
                disabled={savingRegFee || loadingRegFee}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-950 transition-all active:scale-95 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {savingRegFee ? "Saving to Database..." : "Save Live Registration Fee"}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 2: STORE OWNER WITHDRAWAL CHARGES & LIMITS
         ───────────────────────────────────────────────────────────── */}
      <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 md:p-8 space-y-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white">Store Owner Withdrawal Charges &amp; Limits</h2>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-extrabold uppercase">
                  Live Payout Rules
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Configure live fees deducted when sellers withdraw funds from their wallet to MTN MoMo, Orange Money, or Bank.
              </p>
            </div>
          </div>

          <Link
            href="/admin/wallets"
            className="inline-flex items-center gap-1 text-xs font-semibold text-amber-400 hover:text-amber-300 transition-colors self-start sm:self-auto"
          >
            Manage Seller Wallets &amp; Payouts <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Feedback alerts */}
        {withdrawalSuccess && (
          <div className="flex items-center gap-2 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            {withdrawalSuccess}
          </div>
        )}
        {withdrawalError && (
          <div className="flex items-center gap-2 p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {withdrawalError}
          </div>
        )}

        <form onSubmit={handleSaveWithdrawal} className="space-y-6">
          {/* Main Fee Parameters Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Fixed Fee */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5 space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-brand" /> Fixed Fee per Withdrawal
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="50"
                  value={withdrawalSettings.withdrawal_fee_fixed}
                  onChange={(e) =>
                    setWithdrawalSettings((s) => ({
                      ...s,
                      withdrawal_fee_fixed: Math.max(0, Number(e.target.value)),
                    }))
                  }
                  className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2.5 text-base font-bold text-white focus:border-brand focus:outline-none"
                  required
                />
                <span className="absolute right-3.5 top-3 text-xs font-bold text-slate-500">
                  CFA
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Flat fee deducted from each withdrawal request (e.g. 100 CFA).
              </p>
            </div>

            {/* Percentage Fee */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5 space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Percent className="w-3.5 h-3.5 text-brand" /> Percentage Charge (%)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={withdrawalSettings.withdrawal_fee_percentage}
                  onChange={(e) =>
                    setWithdrawalSettings((s) => ({
                      ...s,
                      withdrawal_fee_percentage: Math.max(0, Number(e.target.value)),
                    }))
                  }
                  className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2.5 text-base font-bold text-white focus:border-brand focus:outline-none"
                  required
                />
                <span className="absolute right-3.5 top-3 text-xs font-bold text-slate-500">
                  %
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Percentage deducted from the payout amount (e.g. 1.5% or 2%).
              </p>
            </div>

            {/* Minimum Withdrawal Amount */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5 space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Minimum Withdrawal (CFA)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="100"
                  step="100"
                  value={withdrawalSettings.min_withdrawal_amount}
                  onChange={(e) =>
                    setWithdrawalSettings((s) => ({
                      ...s,
                      min_withdrawal_amount: Math.max(0, Number(e.target.value)),
                    }))
                  }
                  className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2.5 text-base font-bold text-white focus:border-brand focus:outline-none"
                  required
                />
                <span className="absolute right-3.5 top-3 text-xs font-bold text-slate-500">
                  CFA
                </span>
              </div>
              <p className="text-[11px] text-slate-500">Minimum balance a seller must withdraw.</p>
            </div>

            {/* Maximum Withdrawal Amount */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5 space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Maximum Withdrawal (CFA)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="1000"
                  step="1000"
                  value={withdrawalSettings.max_withdrawal_amount}
                  onChange={(e) =>
                    setWithdrawalSettings((s) => ({
                      ...s,
                      max_withdrawal_amount: Math.max(0, Number(e.target.value)),
                    }))
                  }
                  className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2.5 text-base font-bold text-white focus:border-brand focus:outline-none"
                  required
                />
                <span className="absolute right-3.5 top-3 text-xs font-bold text-slate-500">
                  CFA
                </span>
              </div>
              <p className="text-[11px] text-slate-500">Maximum allowed per single request.</p>
            </div>
          </div>

          {/* Execution Mode & Safety Controls */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Settings2 className="w-4 h-4 text-brand" /> Withdrawal Execution Mode
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Choose whether withdrawals require manual administrator approval or execute automatically via Fapshi.
                </p>
              </div>

              <div className="flex items-center gap-2 bg-slate-900 p-1.5 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() =>
                    setWithdrawalSettings((s) => ({ ...s, withdrawal_mode: "MANUAL" }))
                  }
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                    withdrawalSettings.withdrawal_mode === "MANUAL"
                      ? "bg-amber-500 text-slate-950 shadow-md"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Lock className="w-3.5 h-3.5 inline mr-1" /> MANUAL (Admin Review)
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setWithdrawalSettings((s) => ({ ...s, withdrawal_mode: "AUTO" }))
                  }
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                    withdrawalSettings.withdrawal_mode === "AUTO"
                      ? "bg-emerald-500 text-slate-950 shadow-md"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Zap className="w-3.5 h-3.5 inline mr-1" /> AUTOMATIC (Instant Payout)
                </button>
              </div>
            </div>

            {/* Auto Mode Limits (conditionally displayed) */}
            {withdrawalSettings.withdrawal_mode === "AUTO" && (
              <div className="mt-4 pt-4 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-[11px] font-bold uppercase text-slate-400 block mb-1">
                    Auto-Payout Single Max (CFA)
                  </label>
                  <input
                    type="number"
                    value={withdrawalSettings.auto_max_amount}
                    onChange={(e) =>
                      setWithdrawalSettings((s) => ({
                        ...s,
                        auto_max_amount: Number(e.target.value),
                      }))
                    }
                    className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-semibold text-white focus:outline-none"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Amounts above this require manual admin approval.
                  </p>
                </div>
                <div>
                  <label className="text-[11px] font-bold uppercase text-slate-400 block mb-1">
                    Daily User Limit (CFA)
                  </label>
                  <input
                    type="number"
                    value={withdrawalSettings.daily_user_limit}
                    onChange={(e) =>
                      setWithdrawalSettings((s) => ({
                        ...s,
                        daily_user_limit: Number(e.target.value),
                      }))
                    }
                    className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-semibold text-white focus:outline-none"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">Maximum automated per user per 24h.</p>
                </div>
                <div>
                  <label className="text-[11px] font-bold uppercase text-slate-400 block mb-1">
                    Daily Global Limit (CFA)
                  </label>
                  <input
                    type="number"
                    value={withdrawalSettings.daily_global_limit}
                    onChange={(e) =>
                      setWithdrawalSettings((s) => ({
                        ...s,
                        daily_global_limit: Number(e.target.value),
                      }))
                    }
                    className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-semibold text-white focus:outline-none"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">Platform-wide auto payout ceiling.</p>
                </div>
              </div>
            )}
          </div>

          {/* Active Live Policy Summary Card */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-5">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300 block mb-3">
              Active Live Policy Summary
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-slate-500 block">Fixed Deduction</span>
                <strong className="text-white text-sm">
                  {Number(withdrawalSettings.withdrawal_fee_fixed || 0).toLocaleString()} CFA
                </strong>
              </div>
              <div>
                <span className="text-slate-500 block">Percentage Deduction</span>
                <strong className="text-white text-sm">
                  {withdrawalSettings.withdrawal_fee_percentage}%
                </strong>
              </div>
              <div>
                <span className="text-slate-500 block">Allowed Range</span>
                <strong className="text-white text-sm">
                  {Number(withdrawalSettings.min_withdrawal_amount || 0).toLocaleString()} – {Number(withdrawalSettings.max_withdrawal_amount || 0).toLocaleString()} CFA
                </strong>
              </div>
              <div>
                <span className="text-slate-500 block">Mode</span>
                <strong className={`text-sm ${withdrawalSettings.withdrawal_mode === "AUTO" ? "text-emerald-400" : "text-amber-400"}`}>
                  {withdrawalSettings.withdrawal_mode === "AUTO" ? "Automatic Payouts" : "Manual Admin Review"}
                </strong>
              </div>
            </div>
          </div>

          {/* Audit Reason & Save Button */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-800">
            <input
              type="text"
              value={updateReason}
              onChange={(e) => setUpdateReason(e.target.value)}
              placeholder="Reason for change (optional, for admin audit trail)..."
              className="w-full sm:max-w-md rounded-xl border border-slate-800 bg-slate-950 px-4 py-2 text-xs text-slate-300 focus:outline-none focus:border-brand"
            />

            <button
              type="submit"
              disabled={savingWithdrawal || loadingWithdrawal}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-lg shadow-amber-950 transition-all active:scale-95 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {savingWithdrawal ? "Saving to Database..." : "Save Live Withdrawal Charges"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
