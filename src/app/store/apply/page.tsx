"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { useTranslation } from "@/hooks/use-translation";
import { Store, CheckCircle, Clock, XCircle, ArrowRight, Sparkles, Building2, Phone, Mail, FileText } from "lucide-react";

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
  created_at: string;
}

export default function ApplyStorePage() {
  const { data: session, status: authStatus } = useSession();
  const { t } = useTranslation();
  const [applications, setApplications] = useState<StoreApplication[]>([]);
  const [loadingApps, setLoadingApps] = useState(true);
  
  // Form State
  const [storeName, setStoreName] = useState("");
  const [category, setCategory] = useState("Raw Foods & Produce");
  const [productsDesc, setProductsDesc] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  
  const [submitting, setSubmitting] = useState(false);
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
      setErrorMsg(t("apply_error_store_name"));
      return;
    }
    if (!productsDesc.trim()) {
      setErrorMsg(t("apply_error_products"));
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

      setSuccessMsg(t("apply_success"));
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
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand/10 border border-brand/20 text-brand text-xs font-semibold uppercase tracking-wider mb-4">
              <Sparkles className="w-4 h-4" />
              {t("apply_badge")}
            </div>
            <h1 className="text-3xl md:text-5xl font-black text-brand-deep tracking-tight">
              {t("apply_title")}
            </h1>
            <p className="mt-4 text-foreground/60 text-base md:text-lg max-w-xl mx-auto">
              {t("apply_desc")}
            </p>
          </div>

          {/* Unauthenticated View */}
          {authStatus === "unauthenticated" && (
            <div className="rounded-3xl border border-border bg-white p-8 md:p-12 text-center shadow-xl">
              <div className="w-16 h-16 rounded-2xl bg-brand/20 border border-brand/30 text-brand flex items-center justify-center mx-auto mb-6">
                <Store className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold text-brand-deep mb-3">{t("apply_login_required")}</h2>
              <p className="text-foreground/60 mb-8 max-w-md mx-auto">
                {t("apply_login_desc")}
              </p>
              <Link
                href="/signin?callbackUrl=/store/apply"
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-gradient-to-r from-brand to-brand-deep text-white font-bold text-lg hover:shadow-lg hover:shadow-brand/30 transition-all active:scale-95"
              >
                {t("apply_login_btn")}
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          )}

          {/* Loading Auth State */}
          {authStatus === "loading" || loadingApps ? (
            <div className="rounded-3xl border border-border bg-white p-12 text-center shadow-lg">
              <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-brand border-t-transparent mb-4"></div>
              <p className="text-foreground/60 font-medium">{t("apply_checking")}</p>
            </div>
          ) : null}

          {/* Authenticated View */}
          {authStatus === "authenticated" && !loadingApps && (
            <>
              {/* Approved Card */}
              {approvedApp && !showFormOverride && (
                <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-8 mb-8 shadow-lg">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-2xl bg-emerald-500/20 text-emerald-400">
                      <CheckCircle className="w-8 h-8" />
                    </div>
                    <div className="flex-1">
                      <div className="inline-block px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2">
                        {t("apply_approved_badge")}
                      </div>
                      <h2 className="text-2xl font-bold text-brand-deep">
                        {t("apply_approved_title")} {approvedApp.store_name}
                      </h2>
                      <p className="text-foreground/70 mt-2 text-sm">
                        {t("apply_approved_desc")}
                      </p>
                      <div className="mt-6 flex flex-wrap gap-4">
                        <Link
                          href="/seller/dashboard"
                          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-900/40"
                        >
                          <Building2 className="w-4 h-4" />
                          {t("apply_go_seller")}
                        </Link>
                        <button
                          onClick={() => setShowFormOverride(true)}
                          className="px-4 py-3 rounded-xl border border-border bg-surface text-foreground/70 font-semibold text-sm hover:bg-surface-soft transition-colors"
                        >
                          {t("apply_another_store")}
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
                    <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-400">
                      <Clock className="w-8 h-8" />
                    </div>
                    <div className="flex-1">
                      <div className="inline-block px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 text-xs font-bold uppercase tracking-wider mb-2">
                        {t("apply_pending_badge")}
                      </div>
                      <h2 className="text-2xl font-bold text-brand-deep">
                        {pendingApp.store_name}
                      </h2>
                      <p className="text-foreground/70 mt-2 text-sm">
                        {t("apply_pending_submitted")}{" "}
                        <span className="font-semibold text-foreground">
                          {new Date(pendingApp.created_at).toLocaleDateString()}
                        </span>{" "}
                        {t("apply_pending_being_reviewed")}
                      </p>
                      <div className="mt-4 p-4 rounded-xl bg-surface border border-border text-xs text-foreground/60 space-y-1">
                        <p><strong className="text-foreground/80">{t("apply_pending_category")}</strong> {pendingApp.business_category}</p>
                        <p><strong className="text-foreground/80">{t("apply_pending_products")}</strong> {pendingApp.products_description}</p>
                      </div>
                      <p className="mt-4 text-xs text-amber-700/80 italic">
                        {t("apply_pending_note")}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Rejected Application Banner */}
              {latestApp?.status === "rejected" && !pendingApp && !approvedApp && !showFormOverride && (
                <div className="rounded-3xl border border-red-200 bg-red-50 p-8 mb-8 shadow-lg">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-2xl bg-red-500/20 text-red-400">
                      <XCircle className="w-8 h-8" />
                    </div>
                    <div className="flex-1">
                      <div className="inline-block px-3 py-1 rounded-full bg-red-500/20 text-red-400 text-xs font-bold uppercase tracking-wider mb-2">
                        {t("apply_rejected_badge")}
                      </div>
                      <h2 className="text-2xl font-bold text-brand-deep">
                        {t("apply_rejected_for")} {latestApp.store_name}
                      </h2>
                      <p className="text-foreground/70 mt-2 text-sm">
                        {t("apply_rejected_reason")} {latestApp.admin_notes || t("apply_rejected_default_reason")}
                      </p>
                      <button
                        onClick={() => setShowFormOverride(true)}
                        className="mt-4 px-6 py-2.5 rounded-xl bg-surface-soft hover:bg-border text-foreground font-bold text-sm transition-colors"
                      >
                        {t("apply_submit_new")}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Application Form */}
              {(!pendingApp && !approvedApp) || showFormOverride ? (
                <form
                  onSubmit={handleSubmit}
                  className="rounded-3xl border border-border bg-white p-6 md:p-10 shadow-xl space-y-6"
                >
                  <div className="border-b border-border pb-4">
                    <h2 className="text-xl font-bold text-brand-deep flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-brand" />
                      {t("apply_form_title")}
                    </h2>
                    <p className="text-foreground/60 text-xs mt-1">
                      {t("apply_form_desc")}
                    </p>
                  </div>

                  {errorMsg && (
                    <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-600 text-sm font-medium">
                      {errorMsg}
                    </div>
                  )}

                  {successMsg && (
                    <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 text-sm font-medium">
                      {successMsg}
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-foreground/70 uppercase tracking-wider mb-2">
                      {t("apply_store_name_label")}
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        placeholder={t("apply_store_name_placeholder")}
                        value={storeName}
                        onChange={(e) => setStoreName(e.target.value)}
                        className="w-full rounded-2xl border border-border bg-surface px-4 py-3.5 text-sm text-foreground placeholder-foreground/30 focus:border-brand focus:outline-none transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-foreground/70 uppercase tracking-wider mb-2">
                      {t("apply_category_label")}
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full rounded-2xl border border-border bg-surface px-4 py-3.5 text-sm text-foreground focus:border-brand focus:outline-none transition-colors"
                    >
                      <option value="Raw Foods & Produce">Raw Foods & Produce</option>
                      <option value="Spices & Seasonings">Spices & Seasonings</option>
                      <option value="Groceries & Snacks">Groceries & Snacks</option>
                      <option value="Fashion & Apparel">Fashion & Apparel</option>
                      <option value="Electronics & Tech">Electronics & Tech</option>
                      <option value="Beauty & Personal Care">Beauty & Personal Care</option>
                      <option value="General">General Marketplace</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-foreground/70 uppercase tracking-wider mb-2">
                      {t("apply_products_label")}
                    </label>
                    <textarea
                      required
                      rows={4}
                      placeholder={t("apply_products_placeholder")}
                      value={productsDesc}
                      onChange={(e) => setProductsDesc(e.target.value)}
                      className="w-full rounded-2xl border border-border bg-surface px-4 py-3.5 text-sm text-foreground placeholder-foreground/30 focus:border-brand focus:outline-none transition-colors"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-foreground/70 uppercase tracking-wider mb-2 flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-foreground/40" />
                        {t("apply_phone_label")}
                      </label>
                      <input
                        type="text"
                        placeholder={t("apply_phone_placeholder")}
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-foreground placeholder-foreground/30 focus:border-brand focus:outline-none transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-foreground/70 uppercase tracking-wider mb-2 flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5 text-foreground/40" />
                        {t("apply_email_label")}
                      </label>
                      <input
                        type="email"
                        placeholder={t("apply_email_placeholder")}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-foreground placeholder-foreground/30 focus:border-brand focus:outline-none transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-foreground/70 uppercase tracking-wider mb-2 flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5 text-foreground/40" />
                      {t("apply_notes_label")}
                    </label>
                    <textarea
                      rows={2}
                      placeholder={t("apply_notes_placeholder")}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-foreground placeholder-foreground/30 focus:border-brand focus:outline-none transition-colors"
                    />
                  </div>

                  <div className="pt-4 flex items-center justify-end gap-3">
                    {showFormOverride && (
                      <button
                        type="button"
                        onClick={() => setShowFormOverride(false)}
                        className="px-6 py-3 rounded-full border border-border bg-surface text-foreground/70 text-sm font-semibold hover:bg-surface-soft transition-colors"
                      >
                        {t("apply_cancel")}
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-8 py-3.5 rounded-full bg-gradient-to-r from-brand to-brand-deep text-white font-bold text-sm hover:shadow-lg hover:shadow-brand/30 disabled:opacity-50 transition-all active:scale-95"
                    >
                      {submitting ? t("apply_submitting") : t("apply_submit")}
                    </button>
                  </div>
                </form>
              ) : null}
            </>
          )}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

