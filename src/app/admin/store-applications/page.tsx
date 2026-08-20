"use client";

import { useEffect, useState } from "react";
import {
  Store,
  CheckCircle,
  Clock,
  XCircle,
  Search,
  RefreshCw,
  UserCheck,
  Building2,
  FileText,
  Mail,
  Phone,
  Calendar,
  AlertCircle,
  X,
  Check,
} from "lucide-react";
import Link from "next/link";

interface StoreApplicationItem {
  id: number;
  user_id: number;
  user_name: string;
  user_email: string;
  store_name: string;
  business_category: string;
  products_description: string;
  phone: string | null;
  email: string | null;
  additional_notes: string | null;
  status: "pending" | "approved" | "rejected";
  admin_notes: string | null;
  created_at: string;
  existing_store_count: number;
}

export default function AdminStoreApplicationsPage() {
  const [applications, setApplications] = useState<StoreApplicationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Modal states
  const [selectedApp, setSelectedApp] = useState<StoreApplicationItem | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [processing, setProcessing] = useState(false);
  const [actionSuccess, setActionSuccess] = useState("");
  const [actionError, setActionError] = useState("");

  const loadApplications = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/store-applications");
      if (res.ok) {
        const data = await res.json();
        if (data.applications) {
          setApplications(data.applications);
        }
      }
    } catch (err) {
      console.error("Failed to load store applications:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApplications();
  }, []);

  const handleApprove = async (app: StoreApplicationItem) => {
    if (!confirm(`Are you sure you want to approve '${app.store_name}' and grant store access to ${app.user_name}?`)) {
      return;
    }

    setProcessing(true);
    setActionSuccess("");
    setActionError("");

    try {
      const res = await fetch(`/api/admin/store-applications/${app.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve" }),
      });

      const data = await res.json();

      if (!res.ok) {
        setActionError(data.error || "Failed to approve store application.");
        return;
      }

      setActionSuccess(`Store '${app.store_name}' approved, created, and access granted to user!`);
      await loadApplications();
    } catch (err) {
      setActionError("Error executing approval action.");
    } finally {
      setProcessing(false);
    }
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApp) return;

    setProcessing(true);
    setActionSuccess("");
    setActionError("");

    try {
      const res = await fetch(`/api/admin/store-applications/${selectedApp.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reject",
          admin_notes: rejectReason,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setActionError(data.error || "Failed to reject application.");
        return;
      }

      setActionSuccess(`Application for '${selectedApp.store_name}' has been rejected.`);
      setSelectedApp(null);
      setRejectReason("");
      await loadApplications();
    } catch (err) {
      setActionError("Error rejecting application.");
    } finally {
      setProcessing(false);
    }
  };

  const filteredApps = applications.filter((app) => {
    const matchesTab = activeTab === "all" || app.status === activeTab;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      app.store_name.toLowerCase().includes(q) ||
      app.user_name.toLowerCase().includes(q) ||
      app.user_email.toLowerCase().includes(q) ||
      app.business_category.toLowerCase().includes(q);
    return matchesTab && matchesSearch;
  });

  const pendingCount = applications.filter((a) => a.status === "pending").length;
  const approvedCount = applications.filter((a) => a.status === "approved").length;
  const rejectedCount = applications.filter((a) => a.status === "rejected").length;

  return (
    <div className="space-y-6">
      {/* Top Title Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
            <div>
              <div className="flex items-center gap-2">
                <Store className="w-7 h-7 text-brand" />
                <h1 className="text-2xl md:text-3xl font-black text-white">Store Creation Applications</h1>
              </div>
              <p className="text-slate-400 text-xs md:text-sm mt-1">
                Review seller requests, create store instances, and grant vendor access to platform users.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/admin/stores"
                className="px-4 py-2 rounded-xl border border-slate-700 bg-slate-900 text-slate-300 text-xs font-semibold hover:bg-slate-800 transition-colors"
              >
                All Stores Database
              </Link>
              <button
                onClick={loadApplications}
                className="p-2.5 rounded-xl border border-slate-800 bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                title="Refresh applications"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>

          {/* Action Feedback Banners */}
          {actionSuccess && (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm font-medium flex items-center justify-between">
              <span>{actionSuccess}</span>
              <button onClick={() => setActionSuccess("")} className="text-emerald-400 hover:text-emerald-300">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {actionError && (
            <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-medium flex items-center justify-between">
              <span>{actionError}</span>
              <button onClick={() => setActionError("")} className="text-red-400 hover:text-red-300">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Metric Overview Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Total Received</p>
              <p className="text-2xl md:text-3xl font-black text-white mt-1">{applications.length}</p>
            </div>
            <div className="rounded-2xl border border-amber-500/30 bg-amber-950/20 p-4">
              <p className="text-xs text-amber-400 font-semibold uppercase tracking-wider flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> Pending Review
              </p>
              <p className="text-2xl md:text-3xl font-black text-amber-400 mt-1">{pendingCount}</p>
            </div>
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-4">
              <p className="text-xs text-emerald-400 font-semibold uppercase tracking-wider flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" /> Created & Approved
              </p>
              <p className="text-2xl md:text-3xl font-black text-emerald-400 mt-1">{approvedCount}</p>
            </div>
            <div className="rounded-2xl border border-red-500/30 bg-red-950/20 p-4">
              <p className="text-xs text-red-400 font-semibold uppercase tracking-wider flex items-center gap-1">
                <XCircle className="w-3.5 h-3.5" /> Rejected
              </p>
              <p className="text-2xl md:text-3xl font-black text-red-400 mt-1">{rejectedCount}</p>
            </div>
          </div>

          {/* Filters & Search */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/40 p-3 rounded-2xl border border-slate-800">
            {/* Status Tabs */}
            <div className="flex items-center gap-1 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
              <button
                onClick={() => setActiveTab("pending")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  activeTab === "pending"
                    ? "bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                Pending ({pendingCount})
              </button>
              <button
                onClick={() => setActiveTab("all")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  activeTab === "all"
                    ? "bg-brand text-white shadow-lg shadow-brand/20"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                All Applications ({applications.length})
              </button>
              <button
                onClick={() => setActiveTab("approved")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  activeTab === "approved"
                    ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                Approved ({approvedCount})
              </button>
              <button
                onClick={() => setActiveTab("rejected")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  activeTab === "rejected"
                    ? "bg-red-600 text-white shadow-lg shadow-red-600/20"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                Rejected ({rejectedCount})
              </button>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search requests..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand transition-colors"
              />
            </div>
          </div>

          {/* Applications List Grid */}
          {loading ? (
            <div className="p-12 text-center text-slate-400">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-brand border-t-transparent mb-3"></div>
              <p className="text-sm font-medium">Loading store applications...</p>
            </div>
          ) : filteredApps.length === 0 ? (
            <div className="p-12 text-center rounded-3xl border border-slate-800 bg-slate-900/30">
              <Store className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-white">No Applications Found</h3>
              <p className="text-xs text-slate-400 mt-1">There are no store applications matching this status or query.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredApps.map((app) => (
                <div
                  key={app.id}
                  className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 md:p-6 backdrop-blur-md hover:border-slate-700 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-6"
                >
                  <div className="flex-1 space-y-3">
                    {/* Badge & ID */}
                    <div className="flex items-center gap-3">
                      <span
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                          app.status === "pending"
                            ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                            : app.status === "approved"
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            : "bg-red-500/20 text-red-400 border border-red-500/30"
                        }`}
                      >
                        {app.status === "pending" && <Clock className="w-3.5 h-3.5" />}
                        {app.status === "approved" && <CheckCircle className="w-3.5 h-3.5" />}
                        {app.status === "rejected" && <XCircle className="w-3.5 h-3.5" />}
                        {app.status}
                      </span>
                      <span className="text-xs text-slate-500 font-mono">App #{app.id}</span>
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                        {new Date(app.created_at).toLocaleString()}
                      </span>
                    </div>

                    {/* Store Title & User Info */}
                    <div>
                      <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-brand" />
                        {app.store_name}
                        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-md bg-slate-800 text-slate-300">
                          {app.business_category}
                        </span>
                      </h3>

                      <div className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-slate-300">
                        <span className="flex items-center gap-1">
                          <UserCheck className="w-3.5 h-3.5 text-brand" />
                          Applicant: <strong className="text-white">{app.user_name}</strong>
                        </span>
                        <span className="flex items-center gap-1">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          {app.email || app.user_email}
                        </span>
                        {app.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                            {app.phone}
                          </span>
                        )}
                      </div>

                      {/* Multi-store warning badge */}
                      {app.existing_store_count > 0 && (
                        <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-400 text-xs font-semibold">
                          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                          Already owns {app.existing_store_count} active store{app.existing_store_count > 1 ? "s" : ""} — this will create an additional store
                        </div>
                      )}
                    </div>

                    {/* Products Description */}
                    <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300">
                      <p className="font-semibold text-slate-400 mb-1 flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5 text-slate-500" />
                        Proposed Products / Inventory:
                      </p>
                      <p className="leading-relaxed whitespace-pre-wrap">{app.products_description}</p>
                      {app.additional_notes && (
                        <p className="mt-2 pt-2 border-t border-slate-800 text-slate-400 italic">
                          Notes: {app.additional_notes}
                        </p>
                      )}
                    </div>

                    {/* Admin notes if rejected/approved */}
                    {app.admin_notes && (
                      <div className="text-xs text-slate-400 italic">
                        <strong>Admin Notes:</strong> {app.admin_notes}
                      </div>
                    )}
                  </div>

                  {/* Actions Column */}
                  <div className="flex flex-row lg:flex-col items-center justify-end gap-3 border-t lg:border-t-0 lg:border-l border-slate-800 pt-4 lg:pt-0 lg:pl-6">
                    {app.status === "pending" ? (
                      <>
                        <button
                          onClick={() => handleApprove(app)}
                          disabled={processing}
                          className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-950 transition-all flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50"
                        >
                          <Check className="w-4 h-4" />
                          Create Store & Grant Access
                        </button>
                        <button
                          onClick={() => setSelectedApp(app)}
                          disabled={processing}
                          className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-red-500/40 bg-red-950/30 hover:bg-red-900/50 text-red-300 font-semibold text-xs transition-all flex items-center justify-center gap-1.5"
                        >
                          <X className="w-4 h-4" />
                          Reject Request
                        </button>
                      </>
                    ) : app.status === "approved" ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-950/50 px-4 py-2 rounded-xl border border-emerald-500/20">
                        <CheckCircle className="w-4 h-4" /> Store Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-red-400 bg-red-950/50 px-4 py-2 rounded-xl border border-red-500/20">
                        <XCircle className="w-4 h-4" /> Request Rejected
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        {/* Reject Modal */}
      {selectedApp && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-400" />
                Reject Store Application
              </h3>
              <button
                onClick={() => setSelectedApp(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Rejecting application for <strong className="text-white">{selectedApp.store_name}</strong>. An in-app notification will be sent to <span className="text-slate-200">{selectedApp.user_name}</span>.
            </p>

            <form onSubmit={handleRejectSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Reason for Rejection (Included in User Notification)
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Products listed do not comply with vendor guidelines or incomplete contact info..."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500 transition-colors"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedApp(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processing}
                  className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-all disabled:opacity-50"
                >
                  {processing ? "Rejecting..." : "Confirm Rejection"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
