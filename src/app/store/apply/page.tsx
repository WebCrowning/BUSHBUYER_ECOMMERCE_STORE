"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { useTranslation } from "@/hooks/use-translation";
import {
  Store,
  CheckCircle,
  Clock,
  XCircle,
  ArrowRight,
  Sparkles,
  Building2,
  Phone,
  Mail,
  FileText,
  CreditCard,
  Check,
  Loader2,
  ShieldCheck,
  Zap,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { CAMEROON_MARKET_CATEGORIES } from "@/lib/cameroon-locations";

interface StoreApplication {
  id: number;
  user_id: number;
  store_name: string;
  business_category: string;
  products_description: string;
  phone: string | null;
  email: string | null;
  additional_notes: string | null;
  status: "pending" | "approved" | "rejected";
  admin_notes: string | null;
  application_fee_cfa?: number;
  payment_status?: "pending" | "paid" | "failed";
  payment_reference?: string | null;
  paid_at?: string | null;
  created_at: string;
}

export default function ApplyStorePage() {
  const { data: session, status: authStatus } = useSession();
  const { t } = useTranslation();
  const [applications, setApplications] = useState<StoreApplication[]>([]);
  const [loadingApps, setLoadingApps] = useState(true);

  // Dynamic registration fee fetched from platform settings
  const [registrationFee, setRegistrationFee] = useState<number>(5000);
  const [loadingFee, setLoadingFee] = useState(true);

  // Form State
  const [storeName, setStoreName] = useState("");
  const [category, setCategory] = useState("Electronics & Computing");
  const [productsDesc, setProductsDesc] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [payingAppId, setPayingAppId] = useState<number | null>(null);
  const [verifyingAppId, setVerifyingAppId] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [showFormOverride, setShowFormOverride] = useState(false);

  // Fetch current registration fee (public endpoint, no auth needed)
  useEffect(() => {
    fetch("/api/registration-fee")
      .then((r) => r.json())
      .then((d) => {
        if (d?.fee_cfa && Number.isFinite(d.fee_cfa) && d.fee_cfa > 0) {
          setRegistrationFee(d.fee_cfa);
        }
      })
      .catch(() => {/* silently keep the 5000 default */})
      .finally(() => setLoadingFee(false));
  }, []);

  useEffect(() => {
    if (session?.user?.email) {
      setEmail(session.user.email);
    }
  }, [session]);

  const loadApplications = async () => {
    try {
      setLoadingApps(true);
      const res = await fetch("/api/store-applications");
      if (res.ok) {
        const data = await res.json();
        if (data.applications) {
          setApplications(data.applications);
        }
      }
    } catch (err) {
      console.error("Failed to load store applications:", err);
    } finally {
      setLoadingApps(false);
    }
  };

  useEffect(() => {
    if (authStatus === "authenticated") {
      loadApplications();
    } else if (authStatus === "unauthenticated") {
      setLoadingApps(false);
    }
  }, [authStatus]);

  // Auto-verify transaction if user returned from Fapshi payment portal
  useEffect(() => {
    if (typeof window === "undefined" || authStatus !== "authenticated") return;
    const params = new URLSearchParams(window.location.search);
    const appIdParam = params.get("appId") || params.get("applicationId");
    const transIdParam =
      params.get("transId") ||
      params.get("trans_id") ||
      sessionStorage.getItem("fapshi_store_trans_id") ||
      "";

    if (appIdParam) {
      verifyPaymentStatus(Number(appIdParam), transIdParam);
    }
  }, [authStatus]); // eslint-disable-line react-hooks/exhaustive-deps

  const verifyPaymentStatus = async (appId: number, transId?: string) => {
    try {
      setVerifyingAppId(appId);
      setErrorMsg("");

      const q = new URLSearchParams({ appId: String(appId) });
      if (transId) q.set("transId", transId);

      const res = await fetch(`/api/store-applications/verify-payment?${q.toString()}`);
      const data = await res.json();

      if (data.verified && data.payment_status === "paid") {
        setSuccessMsg(
          `🎉 Payment Confirmed! Your ${registrationFee.toLocaleString()} CFA registration fee was received via Fapshi Mobile Money. Your store application is now under admin review!`
        );
        if (typeof window !== "undefined") {
          sessionStorage.removeItem("fapshi_store_trans_id");
          const cleanUrl = window.location.pathname;
          window.history.replaceState({}, document.title, cleanUrl);
        }
        await loadApplications();
      } else if (data.payment_status === "pending") {
        setErrorMsg(
          data.message ||
            "Payment prompt has been initiated. If you completed authorization on your phone, wait a moment and click 'Check Payment Status'."
        );
      } else if (data.payment_status === "failed") {
        setErrorMsg(data.message || "Payment was not completed. Please try paying again.");
        await loadApplications();
      }
    } catch (err: any) {
      console.error("Payment verification error:", err);
    } finally {
      setVerifyingAppId(null);
    }
  };

  const handlePayFee = async (appId: number) => {
    try {
      setPayingAppId(appId);
      setErrorMsg("");
      setSuccessMsg("");

      const res = await fetch("/api/store-applications/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId: appId }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to initiate payment gateway");
      }

      if (data.paymentUrl) {
        if (typeof window !== "undefined" && data.transId) {
          sessionStorage.setItem("fapshi_store_trans_id", data.transId);
        }
        // Redirect user to real Fapshi hosted checkout page
        window.location.href = data.paymentUrl;
        return;
      }

      if (data.payment_status === "paid") {
        setSuccessMsg("Registration fee is already paid. Your application is under admin review.");
        await loadApplications();
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Payment initiation failed. Please try again.");
    } finally {
      setPayingAppId(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!storeName.trim()) {
      setErrorMsg("Store name is required.");
      return;
    }
    if (!productsDesc.trim()) {
      setErrorMsg("Products description is required.");
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch("/api/store-applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          store_name: storeName,
          business_category: category,
          products_description: productsDesc,
          phone,
          email,
          additional_notes: notes,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || "Failed to submit application.");
        return;
      }

      setStoreName("");
      setProductsDesc("");
      setNotes("");
      setShowFormOverride(false);
      await loadApplications();

      // Directly launch real payment gateway for the newly created application
      if (data.id) {
        await handlePayFee(data.id);
      } else {
        setSuccessMsg(
          `Application submitted! Please complete the registration fee payment below.`
        );
      }
    } catch {
      setErrorMsg("An unexpected error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const pendingApp = applications.find((a) => a.status === "pending");
  const approvedApp = applications.find((a) => a.status === "approved");

  // The effective fee for a specific app uses its snapshotted fee, or the current platform fee
  const getAppFee = (app: StoreApplication) =>
    app.application_fee_cfa && app.application_fee_cfa > 0
      ? app.application_fee_cfa
      : registrationFee;

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-brand/5 to-transparent text-foreground">
      <SiteHeader />

      <main className="flex-1 container-shell py-12">
        <div className="max-w-3xl mx-auto">
          {/* Header Banner */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold uppercase tracking-wider mb-4">
              <Sparkles className="w-4 h-4" />
              Vendor Registration &amp; Cameroon Marketplace
            </div>
            <h1 className="text-3xl md:text-5xl font-black text-brand-deep tracking-tight">
              Open Your Store on Bushbuyer
            </h1>
            <p className="mt-4 text-foreground/60 text-base md:text-lg max-w-xl mx-auto">
              Join Cameroon&apos;s fastest growing multi-vendor marketplace. Set up your store,
              turn on GPS location, and reach buyers across Douala, Yaoundé, Buea, Bamenda and beyond.
            </p>
          </div>

          {/* Pricing & Fee Callout Banner */}
          <div className="mb-8 rounded-3xl bg-gradient-to-br from-emerald-900 to-teal-950 text-white p-6 sm:p-8 shadow-xl relative overflow-hidden">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold uppercase tracking-wider">
                  <Zap size={13} /> One-Time Registration Fee
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold">
                  {loadingFee ? (
                    <span className="inline-block w-32 h-8 bg-white/10 rounded-lg animate-pulse" />
                  ) : (
                    `${registrationFee.toLocaleString()} CFA One-Time Fee`
                  )}
                </h2>
                <p className="text-xs sm:text-sm text-emerald-100/80 max-w-md leading-relaxed">
                  Includes full seller dashboard access, live store GPS location tagging,
                  unlimited product catalog, customer direct chat, and order fulfillment.
                </p>
              </div>

              <div className="bg-emerald-950/70 p-4 rounded-2xl border border-emerald-700/50 shrink-0 text-center sm:text-right">
                <span className="text-[10px] uppercase font-bold text-emerald-300 block">Platform Commission</span>
                <span className="text-2xl font-black text-white">10%</span>
                <span className="text-[11px] text-emerald-200/70 block mt-0.5">Per completed sale</span>
              </div>
            </div>
          </div>

          {/* Unauthenticated View */}
          {authStatus === "unauthenticated" && (
            <div className="rounded-3xl border border-border bg-white p-8 md:p-12 text-center shadow-xl">
              <div className="w-16 h-16 rounded-2xl bg-brand/20 border border-brand/30 text-brand flex items-center justify-center mx-auto mb-6">
                <Store className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold text-brand-deep mb-3">Sign in required to apply</h2>
              <p className="text-foreground/60 mb-8 max-w-md mx-auto">
                Please sign in or create an account to start your store application and verify your seller profile.
              </p>
              <Link
                href="/signin?callbackUrl=/store/apply"
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-emerald-600 text-white font-bold text-lg hover:bg-emerald-700 shadow-md transition-all active:scale-95"
              >
                Sign In to Apply
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          )}

          {/* Loading Auth State */}
          {authStatus === "loading" || loadingApps ? (
            <div className="rounded-3xl border border-border bg-white p-12 text-center shadow-lg">
              <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-brand border-t-transparent mb-4"></div>
              <p className="text-foreground/60 font-medium">Checking application status...</p>
            </div>
          ) : null}

          {/* Authenticated View */}
          {authStatus === "authenticated" && !loadingApps && (
            <>
              {/* Approved Card */}
              {approvedApp && !showFormOverride && (
                <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-8 mb-8 shadow-lg">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-2xl bg-emerald-500/20 text-emerald-600">
                      <CheckCircle className="w-8 h-8" />
                    </div>
                    <div className="flex-1">
                      <div className="inline-block px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-700 text-xs font-bold uppercase tracking-wider mb-2">
                        Store Approved &amp; Active
                      </div>
                      <h2 className="text-2xl font-bold text-brand-deep">{approvedApp.store_name}</h2>
                      <p className="text-foreground/70 mt-2 text-sm">
                        Your store application has been approved! You can now manage products, set up
                        GPS coordinates, and process orders in your seller portal.
                      </p>
                      <div className="mt-6 flex flex-wrap gap-4">
                        <Link
                          href="/seller/dashboard"
                          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700 transition-colors shadow-md"
                        >
                          <Building2 className="w-4 h-4" />
                          Go to Seller Dashboard
                        </Link>
                        <button
                          onClick={() => setShowFormOverride(true)}
                          className="px-4 py-3 rounded-xl border border-border bg-surface text-foreground/70 font-semibold text-sm hover:bg-surface-soft transition-colors"
                        >
                          Apply for Another Store
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Pending Application Card */}
              {pendingApp && !showFormOverride && (
                <div className="rounded-3xl border border-amber-200 bg-amber-50 p-8 mb-8 shadow-lg">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-600">
                      <Clock className="w-8 h-8" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                        <div className="inline-block px-3 py-1 rounded-full bg-amber-500/20 text-amber-700 text-xs font-bold uppercase tracking-wider">
                          Application Under Review
                        </div>

                        {pendingApp.payment_status === "paid" ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-300">
                            <CheckCircle size={13} /> {getAppFee(pendingApp).toLocaleString()} CFA Fee Paid
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-100 text-red-800 text-xs font-bold border border-red-300">
                            <AlertTriangle size={13} /> Payment Required to Continue
                          </span>
                        )}
                      </div>

                      <h2 className="text-2xl font-bold text-brand-deep">{pendingApp.store_name}</h2>
                      <p className="text-foreground/70 mt-2 text-sm">
                        Submitted on{" "}
                        <span className="font-semibold text-foreground">
                          {new Date(pendingApp.created_at).toLocaleDateString()}
                        </span>
                        . Our administrative team reviews submissions within 24–48 business hours.
                      </p>

                      {/* ── MANDATORY Payment Step ── */}
                      {pendingApp.payment_status !== "paid" && (
                        <div className="mt-5 rounded-2xl border-2 border-red-300 bg-red-50 overflow-hidden shadow-sm">
                          {/* Warning Header */}
                          <div className="flex items-center gap-2 bg-red-500 text-white px-5 py-3">
                            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                            <p className="text-xs font-extrabold uppercase tracking-wide">
                              Action Required — Payment Needed to Complete Submission
                            </p>
                          </div>
                          <div className="p-5 space-y-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="font-bold text-sm text-gray-900">
                                  One-Time Store Registration Fee
                                </h4>
                                <p className="text-xs text-gray-600 mt-0.5">
                                  Pay securely via MTN Mobile Money, Orange Money, or Credit Card.
                                </p>
                              </div>
                              <span className="text-2xl font-extrabold text-red-700">
                                {getAppFee(pendingApp).toLocaleString()} CFA
                              </span>
                            </div>

                            <p className="text-xs text-red-700 font-semibold bg-red-100 rounded-xl px-4 py-2.5">
                              ⚠ Your application will <strong>not be reviewed</strong> by the admin team until this
                              fee is paid. Please complete payment to activate your submission.
                            </p>

                            {/* No-Refund Policy Notice */}
                            <div className="flex items-start gap-2.5 rounded-xl border border-orange-300 bg-orange-50 px-4 py-3 text-xs text-orange-800">
                              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 flex-shrink-0 mt-0.5 text-orange-500" viewBox="0 0 24 24" fill="currentColor">
                                <path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003ZM12 8.25a.75.75 0 0 1 .75.75v3.75a.75.75 0 0 1-1.5 0V9a.75.75 0 0 1 .75-.75Zm0 8.25a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" clipRule="evenodd" />
                              </svg>
                              <p>
                                <strong className="font-bold text-orange-900">Non-Refundable Fee:</strong> The registration fee is{" "}
                                <strong className="font-bold">strictly non-refundable</strong>, regardless of the outcome of your
                                application. By proceeding with payment, you acknowledge and agree to this policy.
                              </p>
                            </div>

                            <div className="flex flex-col sm:flex-row items-center gap-3">
                              <button
                                type="button"
                                id="pay-registration-fee-btn"
                                onClick={() => handlePayFee(pendingApp.id)}
                                disabled={payingAppId === pendingApp.id || verifyingAppId === pendingApp.id}
                                className="w-full sm:flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-sm py-3.5 shadow-md shadow-red-800/30 transition-all active:scale-95 disabled:opacity-50"
                              >
                                {payingAppId === pendingApp.id ? (
                                  <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Connecting to Fapshi...
                                  </>
                                ) : (
                                  <>
                                    <CreditCard className="w-4 h-4" />
                                    Pay {getAppFee(pendingApp).toLocaleString()} CFA via Mobile Money
                                  </>
                                )}
                              </button>

                              <button
                                type="button"
                                onClick={() => verifyPaymentStatus(pendingApp.id, pendingApp.payment_reference || undefined)}
                                disabled={payingAppId === pendingApp.id || verifyingAppId === pendingApp.id}
                                className="w-full sm:w-auto px-5 py-3.5 rounded-xl border border-red-300 bg-white hover:bg-red-50 text-red-700 font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                              >
                                {verifyingAppId === pendingApp.id ? (
                                  <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Checking...
                                  </>
                                ) : (
                                  <>
                                    <RefreshCw className="w-4 h-4" />
                                    Check Payment Status
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Paid — waiting for review */}
                      {pendingApp.payment_status === "paid" && (
                        <div className="mt-4 flex items-center gap-3 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
                          <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                          Payment confirmed. Your application is in the admin review queue — you&apos;ll be notified when a decision is made.
                        </div>
                      )}

                      <div className="mt-4 p-4 rounded-xl bg-surface border border-border text-xs text-foreground/60 space-y-1">
                        <p><strong className="text-foreground/80">Category:</strong> {pendingApp.business_category}</p>
                        <p><strong className="text-foreground/80">Products:</strong> {pendingApp.products_description}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Messages */}
              {errorMsg && (
                <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-sm font-semibold">
                  {errorMsg}
                </div>
              )}

              {successMsg && (
                <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-semibold">
                  {successMsg}
                </div>
              )}

              {/* Application Form */}
              {(!pendingApp || showFormOverride) && (!approvedApp || showFormOverride) && (
                <form
                  onSubmit={handleSubmit}
                  className="rounded-3xl border border-border bg-white p-6 sm:p-10 shadow-xl space-y-6"
                >
                  <div className="border-b border-border pb-4">
                    <h2 className="text-xl font-bold text-brand-deep">Store Information</h2>
                    <p className="text-xs text-foreground/60 mt-1">
                      Tell us about the store you want to create on Bushbuyer.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {/* Store Name */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-foreground/70 mb-2">
                        Store Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={storeName}
                        onChange={(e) => setStoreName(e.target.value)}
                        placeholder="e.g. Douala Tech & Electronics"
                        className="w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-foreground outline-none focus:border-emerald-600 focus:bg-white transition-all"
                      />
                    </div>

                    {/* Business Category */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-foreground/70 mb-2">
                        Primary Store Category *
                      </label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm font-semibold text-foreground outline-none focus:border-emerald-600 focus:bg-white transition-all"
                      >
                        {CAMEROON_MARKET_CATEGORIES.map((c) => (
                          <option key={c.slug} value={c.name}>
                            {c.icon} {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Products Description */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-foreground/70 mb-2">
                      Products Description &amp; Brands Sold *
                    </label>
                    <textarea
                      rows={3}
                      required
                      value={productsDesc}
                      onChange={(e) => setProductsDesc(e.target.value)}
                      placeholder="Describe what items you sell (e.g. Laptops, TVs, smartphones, accessories) and your product sourcing..."
                      className="w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-foreground outline-none focus:border-emerald-600 focus:bg-white transition-all resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {/* Phone */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-foreground/70 mb-2">
                        WhatsApp / Contact Phone *
                      </label>
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+237 6..."
                        className="w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-foreground outline-none focus:border-emerald-600 focus:bg-white transition-all"
                      />
                    </div>

                    {/* Email */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-foreground/70 mb-2">
                        Business Email Address
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="store@email.com"
                        className="w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-foreground outline-none focus:border-emerald-600 focus:bg-white transition-all"
                      />
                    </div>
                  </div>

                  {/* Additional Notes */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-foreground/70 mb-2">
                      Physical Store Location / Additional Notes
                    </label>
                    <textarea
                      rows={2}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="e.g. Physical shop located in Akwa Douala, Boulevard de la Liberté..."
                      className="w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-foreground outline-none focus:border-emerald-600 focus:bg-white transition-all resize-none"
                    />
                  </div>

                  {/* Dynamic Fee Notice in Form */}
                  <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs text-emerald-900 font-semibold">
                    <span>One-time store registration fee:</span>
                    {loadingFee ? (
                      <span className="inline-block w-20 h-4 bg-emerald-200 rounded animate-pulse" />
                    ) : (
                      <span className="font-extrabold text-sm text-emerald-800">
                        {registrationFee.toLocaleString()} CFA
                      </span>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-base py-4 shadow-lg shadow-emerald-700/20 transition-all active:scale-95 disabled:opacity-50"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin text-white" />
                        Submitting Application...
                      </>
                    ) : (
                      <>
                        Submit Store Application ({loadingFee ? "..." : `${registrationFee.toLocaleString()} CFA`})
                        <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
