"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Settings,
  ArrowLeft,
  Save,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  DollarSign,
  Info,
  Pencil,
} from "lucide-react";

export default function RegistrationSettingsPage() {
  const [feeCfa, setFeeCfa] = useState<number>(5000);
  const [inputVal, setInputVal] = useState<string>("5000");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [editing, setEditing] = useState(false);

  const loadFee = async () => {
    try {
      setLoading(true);
      setSuccessMsg("");
      setErrorMsg("");
      const res = await fetch("/api/admin/registration-settings");
      if (res.ok) {
        const data = await res.json();
        setFeeCfa(data.fee_cfa ?? 5000);
        setInputVal(String(data.fee_cfa ?? 5000));
      }
    } catch {
      setErrorMsg("Failed to load current registration fee.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFee();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg("");
    setErrorMsg("");

    const val = Number(inputVal);
    if (!Number.isFinite(val) || val < 100) {
      setErrorMsg("Please enter a valid amount (minimum 100 CFA).");
      return;
    }

    try {
      setSaving(true);
      const res = await fetch("/api/admin/registration-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fee_cfa: val }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Failed to update fee.");
        return;
      }
      setFeeCfa(data.fee_cfa);
      setInputVal(String(data.fee_cfa));
      setSuccessMsg(data.message || "Registration fee updated successfully!");
      setEditing(false);
    } catch {
      setErrorMsg("An unexpected error occurred. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/admin/store-applications"
              className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Applications
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <Settings className="w-7 h-7 text-brand" />
            <h1 className="text-2xl md:text-3xl font-black text-white">
              Registration Fee Settings
            </h1>
          </div>
          <p className="text-slate-400 text-xs md:text-sm mt-1">
            Control the one-time store registration fee that vendors must pay when applying.
            Changes take effect immediately on the{" "}
            <Link href="/store/apply" target="_blank" className="text-brand hover:underline">
              /store/apply
            </Link>{" "}
            page.
          </p>
        </div>
        <button
          onClick={loadFee}
          className="p-2.5 rounded-xl border border-slate-800 bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors self-start md:self-auto"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Feedback */}
      {successMsg && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm font-medium">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-medium">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          {errorMsg}
        </div>
      )}

      {/* Current Fee Card */}
      {loading ? (
        <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-12 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-brand border-t-transparent mb-3" />
          <p className="text-sm text-slate-400 font-medium">Loading current settings...</p>
        </div>
      ) : (
        <>
          {/* Current Fee Display */}
          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 md:p-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <div className="space-y-1">
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-brand" />
                  Current Store Registration Fee
                </p>
                <p className="text-4xl md:text-5xl font-black text-white">
                  {feeCfa.toLocaleString()}
                  <span className="text-xl font-bold text-slate-400 ml-2">CFA</span>
                </p>
                <p className="text-xs text-slate-500">
                  One-time payment required from every vendor at registration
                </p>
              </div>
              {!editing && (
                <button
                  onClick={() => {
                    setEditing(true);
                    setInputVal(String(feeCfa));
                    setSuccessMsg("");
                    setErrorMsg("");
                  }}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand hover:bg-brand/90 text-white font-bold text-sm shadow-lg shadow-brand/20 transition-all active:scale-95"
                >
                  <Pencil className="w-4 h-4" />
                  Edit Fee
                </button>
              )}
            </div>
          </div>

          {/* Edit Form */}
          {editing && (
            <div className="rounded-3xl border border-brand/40 bg-slate-900/80 p-6 md:p-8 shadow-xl shadow-brand/5">
              <h2 className="text-lg font-bold text-white mb-1">Update Registration Fee</h2>
              <p className="text-xs text-slate-400 mb-6">
                Enter the new fee in CFA. The change will be reflected immediately on the
                vendor registration page for all users.
              </p>

              <form onSubmit={handleSave} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                    New Fee Amount (CFA)
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm pointer-events-none">
                      XAF
                    </span>
                    <input
                      id="reg-fee-input"
                      type="number"
                      min={100}
                      step={100}
                      value={inputVal}
                      onChange={(e) => setInputVal(e.target.value)}
                      required
                      className="w-full bg-slate-950 border border-slate-700 rounded-2xl pl-14 pr-4 py-3.5 text-white text-xl font-bold focus:outline-none focus:border-brand transition-colors"
                      placeholder="5000"
                    />
                  </div>
                  {Number(inputVal) > 0 && (
                    <p className="mt-2 text-xs text-slate-400">
                      Preview:{" "}
                      <span className="text-emerald-400 font-bold">
                        {Number(inputVal).toLocaleString()} CFA
                      </span>
                    </p>
                  )}
                </div>

                {/* Info Banner */}
                <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
                  <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>
                    Existing pending applications that have not yet paid will use the new fee
                    amount when they proceed to payment. Applications with a snapshotted fee at
                    submission time will honour the fee that was active when they applied.
                  </span>
                </div>

                <div className="flex items-center gap-3 pt-1">
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-950 transition-all active:scale-95 disabled:opacity-50"
                  >
                    {saving ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Save New Fee
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(false);
                      setInputVal(String(feeCfa));
                      setErrorMsg("");
                    }}
                    className="px-5 py-3 rounded-xl border border-slate-700 bg-slate-900 text-slate-300 text-sm font-semibold hover:bg-slate-800 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Info Card */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 space-y-3">
            <h3 className="text-sm font-bold text-white">How it works</h3>
            <ul className="space-y-2 text-xs text-slate-400">
              <li className="flex items-start gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                The fee is stored in the platform&apos;s <code className="text-slate-300 bg-slate-800 px-1 rounded">system_settings</code> table and fetched live.
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                The <strong className="text-slate-300">/store/apply</strong> page always loads the current fee dynamically — no code changes needed.
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                When a user submits their application, the active fee is snapshotted into the <code className="text-slate-300 bg-slate-800 px-1 rounded">application_fee_cfa</code> column.
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                Vendors <strong className="text-slate-300">must pay</strong> before their application can be reviewed — the payment step is mandatory.
              </li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
