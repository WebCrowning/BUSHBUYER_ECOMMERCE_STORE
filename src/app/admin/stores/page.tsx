"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Store,
  Plus,
  Search,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  ExternalLink,
  MoreHorizontal,
  ShieldCheck,
  Ban,
  Pencil,
  Eye,
  Users,
  X,
  Globe,
} from "lucide-react";
import Link from "next/link";

interface StoreRow {
  id: number;
  name: string;
  slug: string;
  logo: string | null;
  business_category: string;
  email: string | null;
  phone: string | null;
  city: string | null;
  quarter?: string | null;
  landmark?: string | null;
  gps_coordinates?: string | null;
  country: string | null;
  verification_status: "unverified" | "pending" | "verified" | "rejected";
  store_status: "active" | "inactive" | "suspended";
  rating_avg: number | string;
  rating_count: number;
  followers_count: number | string;
  products_sold_count: number;
  created_at: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  inactive: "bg-gray-100 text-gray-700 border-gray-200",
  suspended: "bg-red-50 text-red-700 border-red-200",
};

const VERIFY_COLORS: Record<string, string> = {
  verified: "bg-emerald-50 text-emerald-700 border-emerald-200",
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  unverified: "bg-gray-100 text-gray-600 border-gray-200",
  rejected: "bg-red-50 text-red-700 border-red-200",
};

const VERIFY_ICONS: Record<string, React.ReactNode> = {
  verified: <CheckCircle size={12} />,
  pending: <Clock size={12} />,
  unverified: <AlertTriangle size={12} />,
  rejected: <XCircle size={12} />,
};

const DEFAULT_CATEGORIES = [
  "General",
  "Electronics & Computing",
  "Phones & Gadgets",
  "Fashion & Apparel",
  "Food & Groceries",
  "Health & Beauty",
  "Home & Living",
  "Automotive & Tools",
  "Sports & Outdoors",
  "Books & Stationery",
  "Baby & Kids",
  "Jewelry & Watches",
];

function CreateStoreModal({
  onClose,
  onCreated,
  existingStores = [],
}: {
  onClose: () => void;
  onCreated: () => void;
  existingStores?: StoreRow[];
}) {
  const [form, setForm] = useState({
    name: "",
    slug: "",
    business_category: "General",
    email: "",
    phone: "",
    city: "Douala",
    quarter: "Akwa",
    landmark: "",
    gps_coordinates: "",
    country: "Cameroon",
    description: "",
  });

  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [customCategoryInput, setCustomCategoryInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Load database categories and merge with store categories
  useEffect(() => {
    async function loadCategories() {
      setLoadingCategories(true);
      try {
        const catMap = new Map<string, string>();
        // Add defaults
        for (const c of DEFAULT_CATEGORIES) {
          catMap.set(c.toLowerCase(), c);
        }
        // Add from existing stores in view
        for (const s of existingStores) {
          if (s.business_category && s.business_category.trim()) {
            const cat = s.business_category.trim();
            catMap.set(cat.toLowerCase(), cat);
          }
        }
        // Fetch from /api/admin/categories
        const res = await fetch("/api/admin/categories");
        if (res.ok) {
          const data = await res.json();
          for (const item of data.categories ?? []) {
            if (item.name && item.name.trim()) {
              const name = item.name.trim();
              catMap.set(name.toLowerCase(), name);
            }
          }
        }
        setCategories(Array.from(catMap.values()).sort((a, b) => a.localeCompare(b)));
      } catch {
        // non-fatal fallback to defaults
      } finally {
        setLoadingCategories(false);
      }
    }
    void loadCategories();
  }, [existingStores]);

  const autoSlug = (name: string) =>
    name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-");

  const handleChange = (field: string, value: string) => {
    setForm((p) => ({
      ...p,
      [field]: value,
      ...(field === "name" ? { slug: autoSlug(value) } : {}),
    }));
  };

  const handleCategorySelectChange = (val: string) => {
    if (val === "__custom__") {
      setIsCustomCategory(true);
      setCustomCategoryInput("");
    } else {
      setIsCustomCategory(false);
      handleChange("business_category", val);
    }
  };

  const handleApplyCustomCategory = () => {
    const trimmed = customCategoryInput.trim();
    if (!trimmed) return;
    if (!categories.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
      setCategories((prev) => [...prev, trimmed].sort((a, b) => a.localeCompare(b)));
    }
    handleChange("business_category", trimmed);
    setIsCustomCategory(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const finalCategory = isCustomCategory ? customCategoryInput.trim() || "General" : form.business_category;
      const payload = {
        ...form,
        business_category: finalCategory,
      };

      const res = await fetch("/api/admin/stores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Failed to create store");
      } else {
        onCreated();
        onClose();
      }
    } catch {
      setError("Network error, please try again");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4 overflow-hidden">
      <div className="flex flex-col w-full max-w-xl max-h-[90vh] sm:max-h-[85vh] rounded-2xl border border-gray-200 bg-white shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Fixed Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 shrink-0 bg-white">
          <div>
            <h2 className="font-bold text-gray-900 text-base">Create New Store</h2>
            <p className="text-xs text-gray-500">Register and configure a new merchant store on Bushbuyer</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-start gap-2">
                <AlertTriangle size={16} className="shrink-0 mt-0.5 text-red-600" />
                <span>{error}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Store Name */}
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Store Name *
                </label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-emerald-600 focus:bg-white focus:outline-none transition-all"
                  placeholder="e.g. Collins Electronics"
                />
              </div>

              {/* Slug */}
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Slug *
                </label>
                <input
                  required
                  value={form.slug}
                  onChange={(e) => handleChange("slug", autoSlug(e.target.value))}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-emerald-600 focus:bg-white focus:outline-none transition-all"
                  placeholder="e.g. collins-electronics"
                />
                <p className="mt-1 text-[11px] text-gray-400">URL: /store/{form.slug || "your-slug"}</p>
              </div>

              {/* Category Selection with Dropdown & Custom Input */}
              <div className="sm:col-span-2 rounded-xl border border-gray-200 bg-gray-50/70 p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wide text-gray-600">
                    Business Category *
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      if (!isCustomCategory) {
                        setIsCustomCategory(true);
                        setCustomCategoryInput(form.business_category);
                      } else {
                        setIsCustomCategory(false);
                      }
                    }}
                    className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 hover:underline flex items-center gap-1"
                  >
                    {isCustomCategory ? "← Select from Database List" : "✏️ Enter Custom Category"}
                  </button>
                </div>

                {isCustomCategory ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        autoFocus
                        value={customCategoryInput}
                        onChange={(e) => setCustomCategoryInput(e.target.value)}
                        placeholder="Type new category (e.g. Solar Energy & Inverters)"
                        className="flex-1 rounded-xl border border-emerald-500 bg-white px-3.5 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      />
                      <button
                        type="button"
                        onClick={handleApplyCustomCategory}
                        className="rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition-colors shrink-0"
                      >
                        Set
                      </button>
                    </div>
                    <p className="text-[11px] text-gray-500">
                      Enter a custom category name. It will be added to the category options automatically.
                    </p>
                  </div>
                ) : (
                  <div className="relative">
                    <select
                      value={form.business_category}
                      onChange={(e) => handleCategorySelectChange(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-xs font-medium text-gray-900 focus:border-emerald-600 focus:outline-none transition-all"
                    >
                      {categories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                      <option value="__custom__" className="text-emerald-700 font-bold">
                        ➕ Add New / Custom Category...
                      </option>
                    </select>
                    {loadingCategories && (
                      <span className="absolute right-8 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">
                        Loading...
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Email
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-emerald-600 focus:bg-white focus:outline-none transition-all"
                  placeholder="store@email.com"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Phone
                </label>
                <input
                  value={form.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-emerald-600 focus:bg-white focus:outline-none transition-all"
                  placeholder="+237 6..."
                />
              </div>

              {/* City */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                  City
                </label>
                <input
                  value={form.city}
                  onChange={(e) => handleChange("city", e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-emerald-600 focus:bg-white focus:outline-none transition-all"
                  placeholder="Douala"
                />
              </div>

              {/* Quarter */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Quarter / Neighborhood
                </label>
                <input
                  value={form.quarter}
                  onChange={(e) => handleChange("quarter", e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-emerald-600 focus:bg-white focus:outline-none transition-all"
                  placeholder="e.g. Akwa, Bastos, Molyko"
                />
              </div>

              {/* Landmark */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Landmark / Street Reference
                </label>
                <input
                  value={form.landmark}
                  onChange={(e) => handleChange("landmark", e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-emerald-600 focus:bg-white focus:outline-none transition-all"
                  placeholder="Opposite TotalEnergies, Near Market"
                />
              </div>

              {/* GPS Coordinates */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                  GPS Coordinates (lat, lng)
                </label>
                <input
                  value={form.gps_coordinates}
                  onChange={(e) => handleChange("gps_coordinates", e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-emerald-600 focus:bg-white focus:outline-none font-mono transition-all"
                  placeholder="4.0511, 9.7042"
                />
              </div>

              {/* Description */}
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => handleChange("description", e.target.value)}
                  className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-emerald-600 focus:bg-white focus:outline-none transition-all"
                  placeholder="Short store description..."
                />
              </div>
            </div>
          </div>

          {/* Sticky Footer */}
          <div className="shrink-0 flex items-center justify-end gap-3 border-t border-gray-100 bg-gray-50/90 px-6 py-3.5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-gray-200 bg-white px-5 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 shadow-sm transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50 hover:bg-emerald-700 shadow-sm transition-colors"
            >
              {saving ? "Creating..." : "Create Store"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ActionMenu({
  store,
  onStatusChange,
  onVerifyChange,
}: {
  store: StoreRow;
  onStatusChange: (id: number, status: string) => void;
  onVerifyChange: (id: number, status: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);

  const handleBackdropPointerDown = (e: React.PointerEvent) => {
    pointerStartRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleBackdropPointerUp = (e: React.PointerEvent) => {
    const start = pointerStartRef.current;
    pointerStartRef.current = null;
    // Only close when the pointer up happened directly on the backdrop element
    // and the pointer didn't move much (treat as a click). This avoids
    // closing when the user interacts with the browser scrollbar or performs
    // a larger drag to scroll the page.
    if (e.target === e.currentTarget && (!start || Math.hypot(e.clientX - start.x, e.clientY - start.y) < 8)) {
      setOpen(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((p) => !p)}
        className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
      >
        <MoreHorizontal size={16} />
      </button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-10"
            onPointerDown={handleBackdropPointerDown}
            onPointerUp={handleBackdropPointerUp}
          />
          <div className="absolute right-0 z-20 mt-1 w-52 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
            <Link
              href={`/store/${store.slug}`}
              target="_blank"
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
            >
              <Eye size={14} /> View Store
            </Link>
            <Link
              href={`/admin/stores/${store.id}/users`}
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
            >
              <Users size={14} /> Manage Staff
            </Link>
            <Link
              href={`/admin/stores/${store.id}/products`}
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-emerald-700 hover:bg-emerald-50 font-semibold"
            >
              <Globe size={14} /> Marketplace Products
            </Link>
            <div className="border-t border-gray-100" />
            {store.verification_status !== "verified" && (
              <button
                onClick={() => { onVerifyChange(store.id, "verified"); setOpen(false); }}
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-emerald-700 hover:bg-gray-50"
              >
                <ShieldCheck size={14} /> Verify Store
              </button>
            )}
            {store.verification_status !== "rejected" && (
              <button
                onClick={() => { onVerifyChange(store.id, "rejected"); setOpen(false); }}
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-gray-50"
              >
                <XCircle size={14} /> Reject Verification
              </button>
            )}
            <div className="border-t border-gray-100" />
            {store.store_status !== "active" && (
              <button
                onClick={() => { onStatusChange(store.id, "active"); setOpen(false); }}
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-emerald-700 hover:bg-gray-50"
              >
                <CheckCircle size={14} /> Set Active
              </button>
            )}
            {store.store_status !== "suspended" && (
              <button
                onClick={() => { onStatusChange(store.id, "suspended"); setOpen(false); }}
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-gray-50"
              >
                <Ban size={14} /> Suspend Store
              </button>
            )}
            {store.store_status !== "inactive" && (
              <button
                onClick={() => { onStatusChange(store.id, "inactive"); setOpen(false); }}
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50"
              >
                <Pencil size={14} /> Set Inactive
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default function AdminStoresPage() {
  const [stores, setStores] = useState<StoreRow[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);

  const fetchStores = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (statusFilter) params.set("status", statusFilter);
      const res = await fetch(`/api/admin/stores?${params}`);
      if (res.ok) {
        const data = await res.json();
        setStores(data.stores ?? []);
        setPagination(data.pagination ?? null);
      }
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => { void fetchStores(); }, [fetchStores]);

  const patchStore = async (id: number, data: Record<string, string>) => {
    await fetch(`/api/admin/stores/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    void fetchStores();
  };

  const filtered = search.trim()
    ? stores.filter(
        (s) =>
          s.name.toLowerCase().includes(search.toLowerCase()) ||
          s.slug.toLowerCase().includes(search.toLowerCase()) ||
          (s.email ?? "").toLowerCase().includes(search.toLowerCase())
      )
    : stores;

  const stats = {
    total: pagination?.total ?? 0,
    active: stores.filter((s) => s.store_status === "active").length,
    suspended: stores.filter((s) => s.store_status === "suspended").length,
    verified: stores.filter((s) => s.verification_status === "verified").length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 md:text-2xl">Store Management</h1>
          <p className="mt-0.5 text-xs text-gray-500">
            Create, monitor, and manage seller stores on Bushbuyer.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/store-applications"
            className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2 text-xs font-bold text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
          >
            <Store size={15} /> Applications
          </Link>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition-colors"
          >
            <Plus size={15} /> New Store
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Total Stores", value: stats.total, color: "text-gray-900" },
          { label: "Active", value: stats.active, color: "text-emerald-600" },
          { label: "Suspended", value: stats.suspended, color: "text-red-600" },
          { label: "Verified", value: stats.verified, color: "text-sky-600" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-gray-200 bg-white p-3.5 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">{s.label}</p>
            <p className={`mt-1 text-2xl font-extrabold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search stores by name, slug, email..."
            className="w-full rounded-xl border border-gray-200 bg-white pl-9 pr-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:border-emerald-600 focus:outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 focus:border-emerald-600 focus:outline-none"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="suspended">Suspended</option>
        </select>
        <button
          onClick={() => void fetchStores()}
          className="rounded-xl border border-gray-200 bg-white p-2 text-gray-500 hover:text-gray-900"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50 text-left font-bold uppercase tracking-wide text-gray-500">
                <th className="px-4 py-3">Store</th>
                <th className="px-3 py-3">Category</th>
                <th className="px-3 py-3">Location</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Verification</th>
                <th className="px-3 py-3">Followers</th>
                <th className="px-3 py-3">Rating</th>
                <th className="px-3 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 8 }).map((__, j) => (
                      <td key={j} className="px-3 py-3">
                        <div className="h-4 animate-pulse rounded bg-gray-100" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center">
                    <Store size={36} className="mx-auto mb-2 text-gray-300" />
                    <p className="text-gray-500">No stores found</p>
                  </td>
                </tr>
              ) : (
                filtered.map((store) => {
                  const ratingVal = Number(store.rating_avg ?? 0);
                  const followersVal = Number(store.followers_count ?? 0);

                  return (
                    <tr key={store.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          {store.logo ? (
                            <img
                              src={store.logo}
                              alt={store.name}
                              className="h-8 w-8 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-gray-500 font-bold text-xs">
                              {store.name.substring(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <p className="font-bold text-gray-900">{store.name}</p>
                            <p className="text-[11px] text-gray-400">/{store.slug}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-gray-600">{store.business_category}</td>
                      <td className="px-3 py-3 text-gray-500">
                        {[store.city, store.country].filter(Boolean).join(", ") || "—"}
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold capitalize ${STATUS_COLORS[store.store_status] ?? ""}`}
                        >
                          {store.store_status}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold capitalize ${VERIFY_COLORS[store.verification_status] ?? ""}`}
                        >
                          {VERIFY_ICONS[store.verification_status]}
                          {store.verification_status}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-gray-700 font-semibold">{followersVal.toLocaleString()}</td>
                      <td className="px-3 py-3">
                        <span className="text-amber-600 font-bold">
                          {ratingVal > 0 ? ratingVal.toFixed(1) : "—"}
                        </span>
                        {store.rating_count > 0 && (
                          <span className="ml-1 text-[11px] text-gray-400">({store.rating_count})</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/store/${store.slug}`}
                            target="_blank"
                            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                          >
                            <ExternalLink size={14} />
                          </Link>
                          <ActionMenu
                            store={store}
                            onStatusChange={(id, status) =>
                              patchStore(id, { store_status: status })
                            }
                            onVerifyChange={(id, status) =>
                              patchStore(id, { verification_status: status })
                            }
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination && pagination.pages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3 text-xs text-gray-500">
            <p>
              Showing {(pagination.page - 1) * pagination.limit + 1}–
              {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
              {pagination.total} stores
            </p>
            <div className="flex items-center gap-1.5">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="rounded-lg border border-gray-200 px-2.5 py-1 font-semibold hover:bg-gray-50 disabled:opacity-40"
              >
                Prev
              </button>
              <span className="text-[11px]">
                {page} / {pagination.pages}
              </span>
              <button
                disabled={page >= pagination.pages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-lg border border-gray-200 px-2.5 py-1 font-semibold hover:bg-gray-50 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {showCreate && (
        <CreateStoreModal
          onClose={() => setShowCreate(false)}
          onCreated={() => void fetchStores()}
          existingStores={stores}
        />
      )}
    </div>
  );
}
