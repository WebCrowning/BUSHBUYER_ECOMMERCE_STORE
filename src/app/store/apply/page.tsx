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

  // Form State
  const [storeName, setStoreName] = useState("");
  const [category, setCategory] = useState("Electronics & Computing");
  const [productsDesc, setProductsDesc] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [payingAppId, setPayingAppId] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [showFormOverride, setShowFormOverride] = useState(false);

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

      setSuccessMsg("Store application created! Please proceed to pay the 5,000 CFA one-time registration fee below to complete submission.");
      setStoreName("");
      setProductsDesc("");
      setNotes("");
      setShowFormOverride(false);
      await loadApplications();
    } catch {
      setErrorMsg("An unexpected error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePayFee = async (appId: number) => {
    try {
      setPayingAppId(appId);
      setErrorMsg("");

      const res = await fetch("/api/store-applications/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId: appId, directConfirm: true }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to process 5,000 CFA payment");
      }

      if (data.paymentUrl) {
        window.location.href = data.paymentUrl;
        return;
      }

      setSuccessMsg("5,000 CFA Registration Fee paid successfully! Your application is now under admin review.");
      await loadApplications();
    } catch (err: any) {
      setErrorMsg(err.message || "Payment failed. Please try again.");
    } finally {
      setPayingAppId(null);
    }
  };

  const pendingApp = applications.find((a) => a.status === "pending");
  const approvedApp = applications.find((a) => a.status === "approved");
  const latestApp = applications[0];

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-brand/5 to-transparent text-foreground">
      <SiteHeader />

      <main className="flex-1 container-shell py-12">
        <div className="max-w-3xl mx-auto">
          {/* Header Banner */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold uppercase tracking-wider mb-4">
              <Sparkles className="w-4 h-4" />
              Vendor Registration & Cameroon Marketplace
            </div>
            <h1 className="text-3xl md:text-5xl font-black text-brand-deep tracking-tight">
              Open Your Store on Bushbuyer
            </h1>
            <p className="mt-4 text-foreground/60 text-base md:text-lg max-w-xl mx-auto">
              Join Cameroon&apos;s fastest growing multi-vendor marketplace. Set up your store, turn on GPS location, and reach buyers across Douala, Yaoundé, Buea, Bamenda and beyond.
            </p>
          </div>

          {/* Pricing & Fee Callout Banner */}
          <div className="mb-8 rounded-3xl bg-gradient-to-br from-emerald-900 to-teal-950 text-white p-6 sm:p-8 shadow-xl relative overflow-hidden">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold uppercase tracking-wider">
                  <Zap size={13} /> One-Time Application Fee
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold">5,000 CFA One-Time Fee</h2>
                <p className="text-xs sm:text-sm text-emerald-100/80 max-w-md leading-relaxed">
                  Includes full seller dashboard access, live store GPS location tagging, unlimited product catalog, customer direct chat, and order fulfillment.
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
                        Store Approved & Active
                      </div>
                      <h2 className="text-2xl font-bold text-brand-deep">
                        {approvedApp.store_name}
                      </h2>
                      <p className="text-foreground/70 mt-2 text-sm">
                        Your store application has been approved! You can now manage products, set up GPS coordinates, and process orders in your seller portal.
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
                            <CheckCircle size={13} /> 5,000 CFA Fee Paid
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-100 text-red-800 text-xs font-bold border border-red-300">
                            <Clock size={13} /> 5,000 CFA Payment Required
                          </span>
                        )}
                      </div>

                      <h2 className="text-2xl font-bold text-brand-deep">
                        {pendingApp.store_name}
                      </h2>
                      <p className="text-foreground/70 mt-2 text-sm">
                        Submitted on{" "}
                        <span className="font-semibold text-foreground">
                          {new Date(pendingApp.created_at).toLocaleDateString()}
                        </span>
                        . Our administrative team reviews submissions within 24-48 business hours.
                      </p>

                      {/* Payment Step if not paid */}
                      {pendingApp.payment_status !== "paid" && (
                        <div className="mt-5 p-5 rounded-2xl bg-white border border-amber-300 shadow-sm space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-bold text-sm text-gray-900">
                                Complete One-Time 5,000 CFA Registration Fee
                              </h4>
                              <p className="text-xs text-gray-600 mt-0.5">
                                Pay via MTN Mobile Money, Orange Money, or Credit Card.
                              </p>
                            </div>
                            <span className="text-lg font-extrabold text-emerald-800">5,000 CFA</span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handlePayFee(pendingApp.id)}
                            disabled={payingAppId === pendingApp.id}
                            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm py-3 shadow-md transition-all active:scale-95 disabled:opacity-50"
                          >
                            {payingAppId === pendingApp.id ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin text-white" />
                                Processing Payment...
                              </>
                            ) : (
                              <>
                                <CreditCard className="w-4 h-4" />
                                Pay 5,000 CFA Fee via Mobile Money
                              </>
                            )}
                          </button>
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
                      Products Description & Brands Sold *
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

                  {/* 5,000 CFA Fee Notice in Form */}
                  <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs text-emerald-900 font-semibold">
                    <span>One-time store registration fee:</span>
                    <span className="font-extrabold text-sm text-emerald-800">5,000 CFA</span>
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
                        Submit Store Application (5,000 CFA)
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
