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
  Calculator,
  ShieldAlert,
  Percent,
  DollarSign,
  ArrowUpRight,
  Settings2,
  Lock,
  Zap,
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

  // Live Calculator State
  const [calcAmount, setCalcAmount] = useState<number>(50000);

  // Load Store Registration Fee
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

  // Load Withdrawal Settings
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

  // Save Store Registration Fee
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
      setRegFeeSuccess(`Store registration fee updated to ${data.fee_cfa.toLocaleString()} CFA!`);
    } catch {
      setRegFeeError("Unexpected error while saving fee.");
    } finally {
      setSavingRegFee(false);
    }
  };

  // Save Withdrawal Settings
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
          reason: updateReason || "Updated from Admin Fees & Charges dashboard",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setWithdrawalError(data.error || "Failed to update withdrawal charges.");
        return;
      }
      setWithdrawalSettings(data.settings);
      setWithdrawalSuccess("Store owner withdrawal charges & limits updated successfully!");
      setUpdateReason("");
    } catch {
      setWithdrawalError("Unexpected error while saving withdrawal settings.");
    } finally {
      setSavingWithdrawal(false);
    }
  };

  // Calculate live preview
  const calcFixedFee = Number(withdrawalSettings.withdrawal_fee_fixed) || 0;
  const calcPctFee =
    (calcAmount * (Number(withdrawalSettings.withdrawal_fee_percentage) || 0)) / 100;
  const calcTotalFee = Math.round(calcFixedFee + calcPctFee);
  const calcNetAmount = Math.max(0, calcAmount - calcTotalFee);

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
            Manage the store creation registration fee and vendor withdrawal charges from a unified control panel.
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
            Refresh All
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
                  Vendor Onboarding
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                The one-time fee vendors must pay via MTN/Orange Mobile Money before their application is submitted for admin review.
              </p>
            </div>
          </div>

          <Link
            href="/store/apply"
            target="_blank"
            className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:text-brand-light transition-colors self-start sm:self-auto"
          >
            Preview Apply Page <ArrowUpRight className="w-3.5 h-3.5" />
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
          {/* Current Fee Highlight Card */}
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-6 flex flex-col justify-between">
            <div>
              <span className="text-[11px] uppercase tracking-wider font-bold text-emerald-400 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5" /> Current Registration Fee
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
                Advertised on the vendor application page and charged live through Fapshi.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-emerald-500/20 text-[11px] text-slate-400 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
              Changes update immediately on the live store application form.
            </div>
          </div>

          {/* Update Fee Form */}
          <form
            onSubmit={handleSaveRegFee}
            className="lg:col-span-2 rounded-2xl border border-slate-800 bg-slate-950/60 p-6 flex flex-col justify-between space-y-4"
          >
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                Set New One-Time Store Registration Fee (CFA)
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
                Enter the exact amount in Central African CFA Francs (minimum 100 CFA).
              </p>

              {/* Quick suggestion buttons */}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="text-[11px] text-slate-500">Presets:</span>
                {[2500, 5000, 7500, 10000, 15000].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setRegFeeInput(String(preset))}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                      Number(regFeeInput) === preset
                        ? "bg-brand/20 border-brand text-brand"
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
                {savingRegFee ? "Saving..." : "Save Registration Fee"}
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
                  Payouts &amp; Wallets
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Configure the fees deducted when a seller withdraws funds from their Bushbuyer wallet to MTN MoMo, Orange Money, or Bank.
              </p>
            </div>
          </div>

          <Link
            href="/admin/wallets"
            className="inline-flex items-center gap-1 text-xs font-semibold text-amber-400 hover:text-amber-300 transition-colors self-start sm:self-auto"
          >
            View Wallets &amp; Payouts <ArrowRight className="w-3.5 h-3.5" />
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
                Flat fee deducted regardless of withdrawal size (e.g. 100 CFA).
              </p>
            </div>

            {/* Percentage Fee */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5 space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Percent className="w-3.5 h-3.5 text-brand" /> Percentage Fee (%)
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
                Percentage deducted from requested amount (e.g. 1.5% or 2%).
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
              <p className="text-[11px] text-slate-500">Lowest amount a seller can withdraw.</p>
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
              <p className="text-[11px] text-slate-500">Highest single withdrawal amount allowed.</p>
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
                  <Lock className="w-3.5 h-3.5 inline mr-1" /> MANUAL (Recommended)
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
                  <Zap className="w-3.5 h-3.5 inline mr-1" /> AUTOMATIC
                </button>
              </div>
            </div>

            {/* Auto Mode Limits (conditionally highlighted) */}
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

          {/* ─────────────────────────────────────────────────────────────
              INTERACTIVE LIVE FEE CALCULATOR PREVIEW
             ───────────────────────────────────────────────────────────── */}
          <div className="rounded-2xl border border-brand/30 bg-brand/5 p-6 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-brand flex items-center gap-1.5">
                <Calculator className="w-4 h-4" /> Live Fee Simulation Calculator
              </span>
              <span className="text-xs text-slate-400">
                Test how your fees apply to a seller payout
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="w-full sm:w-64">
                <label className="text-[11px] text-slate-400 block mb-1 font-semibold">
                  Sample Withdrawal Amount:
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="5000"
                    min="1000"
                    value={calcAmount}
                    onChange={(e) => setCalcAmount(Math.max(0, Number(e.target.value)))}
                    className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2 text-sm font-bold text-white focus:outline-none focus:border-brand"
                  />
                  <span className="absolute right-3 top-2 text-xs font-bold text-slate-500">
                    CFA
                  </span>
                </div>
              </div>

              {/* Live breakdown badges */}
              <div className="flex-1 w-full grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">
                    Fixed Fee
                  </span>
                  <span className="text-sm font-black text-slate-200">
                    {calcFixedFee.toLocaleString()} CFA
                  </span>
                </div>

                <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">
                    Percentage ({withdrawalSettings.withdrawal_fee_percentage}%)
                  </span>
                  <span className="text-sm font-black text-slate-200">
                    {Math.round(calcPctFee).toLocaleString()} CFA
                  </span>
                </div>

                <div className="bg-red-950/30 p-3 rounded-xl border border-red-500/30">
                  <span className="text-[10px] text-red-400 block uppercase font-bold">
                    Platform Earns
                  </span>
                  <span className="text-sm font-black text-red-400">
                    {calcTotalFee.toLocaleString()} CFA
                  </span>
                </div>

                <div className="bg-emerald-950/30 p-3 rounded-xl border border-emerald-500/30">
                  <span className="text-[10px] text-emerald-400 block uppercase font-bold">
                    Vendor Receives
                  </span>
                  <span className="text-sm font-black text-emerald-400">
                    {calcNetAmount.toLocaleString()} CFA
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Audit Reason & Save Button */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-800">
            <input
              type="text"
              value={updateReason}
              onChange={(e) => setUpdateReason(e.target.value)}
              placeholder="Reason for change (optional, for audit trail)..."
              className="w-full sm:max-w-md rounded-xl border border-slate-800 bg-slate-950 px-4 py-2 text-xs text-slate-300 focus:outline-none focus:border-brand"
            />

            <button
              type="submit"
              disabled={savingWithdrawal || loadingWithdrawal}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-lg shadow-amber-950 transition-all active:scale-95 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {savingWithdrawal ? "Saving..." : "Save Withdrawal Charges"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
