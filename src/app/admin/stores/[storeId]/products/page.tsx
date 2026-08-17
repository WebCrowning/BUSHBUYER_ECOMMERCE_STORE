"use client";

import { use, useCallback, useEffect, useState } from "react";
import {
  Package,
  Globe,
  EyeOff,
  RefreshCw,
  ArrowLeft,
  Search,
  ToggleLeft,
  ToggleRight,
  Loader2,
  Store,
  CheckSquare,
  Square,
  ShoppingBag,
  X,
  Info,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";

interface StoreProduct {
  id: number;
  store_id: number;
  name: string;
  price: number;
  discount_price: number | null;
  image: string;
  category: string;
  status: string;
  stock_packages: number;
  featured: number;
  marketplace_enabled: number;
  created_at: string;
  store_name: string;
  store_slug: string;
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    active:   "border-emerald-200 bg-emerald-50 text-emerald-700",
    draft:    "border-amber-200 bg-amber-50 text-amber-700",
    archived: "border-gray-200 bg-gray-50 text-gray-500",
  };
  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold capitalize ${map[status] ?? map.archived}`}>
      {status}
    </span>
  );
}

export default function AdminStoreProductsPage({
  params,
}: {
  params: Promise<{ storeId: string }>;
}) {
  const { storeId } = use(params);

  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<number | null>(null);
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [filter, setFilter] = useState<"all" | "enabled" | "disabled">("all");
  const [search, setSearch] = useState("");
  const [statusMsg, setStatusMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const storeName = products[0]?.store_name ?? `Store #${storeId}`;
  const storeSlug = products[0]?.store_slug ?? "";
  const totalEnabled = products.filter((p) => p.marketplace_enabled === 1).length;

  function flash(text: string, ok: boolean) {
    setStatusMsg({ text, ok });
    setTimeout(() => setStatusMsg(null), 4000);
  }

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/stores/${storeId}/products`);
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => { void fetchProducts(); }, [fetchProducts]);

  async function handleToggle(productId: number, current: number) {
    setToggling(productId);
    try {
      const res = await fetch(`/api/admin/stores/${storeId}/products`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, marketplace_enabled: current !== 1 }),
      });
      const data = await res.json();
      if (res.ok) {
        setProducts(data.products ?? []);
        flash(
          current === 1
            ? `Product removed from marketplace.`
            : `Product is now visible on /products.`,
          true
        );
      } else {
        flash(data.error ?? "Failed to update.", false);
      }
    } finally {
      setToggling(null);
    }
  }

  async function handleBulk(enable: boolean) {
    if (selected.size === 0) return;
    setBulkUpdating(true);
    try {
      const res = await fetch(`/api/admin/stores/${storeId}/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productIds: Array.from(selected),
          marketplace_enabled: enable,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        flash(`${data.updated} product${data.updated !== 1 ? "s" : ""} ${enable ? "added to" : "removed from"} marketplace.`, true);
        setSelected(new Set());
        await fetchProducts();
      } else {
        flash(data.error ?? "Bulk update failed.", false);
      }
    } finally {
      setBulkUpdating(false);
    }
  }

  const filtered = products.filter((p) => {
    const matchFilter =
      filter === "all" ||
      (filter === "enabled" && p.marketplace_enabled === 1) ||
      (filter === "disabled" && p.marketplace_enabled !== 1);
    const matchSearch =
      !search.trim() ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  function toggleSelect(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(filtered.map((p) => p.id)));
  }

  function clearSelection() {
    setSelected(new Set());
  }

  return (
    <div className="space-y-6">
      {/* ── Back + Header ─────────────────────────────────────────────────── */}
      <div>
        <Link
          href="/admin/stores"
          className="mb-2 inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-gray-900"
        >
          <ArrowLeft size={13} /> Back to Stores
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900 md:text-2xl">
              Marketplace Visibility
            </h1>
            <p className="mt-0.5 text-xs text-gray-500">
              <span className="font-semibold text-gray-700">{storeName}</span> —
              toggle which products appear on{" "}
              <Link href="/products" target="_blank" className="font-bold text-emerald-600 hover:underline">
                /products
              </Link>{" "}
              (the public marketplace catalog).
            </p>
          </div>

          <div className="flex items-center gap-2">
            {storeSlug && (
              <Link
                href={`/store/${storeSlug}`}
                target="_blank"
                className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-600 hover:bg-gray-50"
              >
                <Store size={13} /> View Store
              </Link>
            )}
            <button
              type="button"
              onClick={() => void fetchProducts()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-600 hover:bg-gray-50 shadow-sm"
            >
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* ── Stats Bar ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-gray-200 bg-white p-3.5 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Total Products</p>
          <p className="mt-1 text-2xl font-extrabold text-gray-900">{products.length}</p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
            <Globe size={10} className="inline mr-1" />On Marketplace
          </p>
          <p className="mt-1 text-2xl font-extrabold text-emerald-700">{totalEnabled}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-3.5 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
            <EyeOff size={10} className="inline mr-1" />Not Listed
          </p>
          <p className="mt-1 text-2xl font-extrabold text-gray-500">{products.length - totalEnabled}</p>
        </div>
      </div>

      {/* ── Info Banner ───────────────────────────────────────────────────── */}
      <div className="flex items-start gap-2.5 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3">
        <Info size={14} className="mt-0.5 shrink-0 text-sky-500" />
        <p className="text-xs text-sky-800">
          <span className="font-bold">Only you (admin) can change marketplace visibility.</span>{" "}
          Store owners and staff cannot enable their own products on the public catalog —
          you must review and approve each one here.
        </p>
      </div>

      {/* ── Status Banner ─────────────────────────────────────────────────── */}
      {statusMsg && (
        <div
          className={`flex items-center justify-between rounded-xl border px-4 py-2.5 text-xs font-semibold ${
            statusMsg.ok
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {statusMsg.text}
          <button type="button" onClick={() => setStatusMsg(null)}>
            <X size={13} className="ml-2 opacity-60 hover:opacity-100" />
          </button>
        </div>
      )}

      {/* ── Toolbar ───────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search size={13} className="pointer-events-none absolute inset-y-0 left-3 my-auto text-gray-400" />
          <input
            type="text"
            placeholder="Search products…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-8 pr-3 text-xs text-gray-800 placeholder-gray-400 focus:border-emerald-500 focus:outline-none"
          />
        </div>

        {/* Filter tabs */}
        <div className="flex rounded-xl border border-gray-200 overflow-hidden text-xs font-bold">
          {(["all", "enabled", "disabled"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`px-3 py-2 capitalize transition-colors ${
                filter === f ? "bg-gray-900 text-white" : "bg-white text-gray-500 hover:bg-gray-50"
              }`}
            >
              {f === "all" ? `All (${products.length})` : f === "enabled" ? `On Marketplace (${totalEnabled})` : `Hidden (${products.length - totalEnabled})`}
            </button>
          ))}
        </div>
      </div>

      {/* ── Bulk Actions ──────────────────────────────────────────────────── */}
      {filtered.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5">
          <button type="button" onClick={selectAll} className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-600 hover:text-gray-900">
            <CheckSquare size={13} /> Select all ({filtered.length})
          </button>
          {selected.size > 0 && (
            <>
              <span className="text-gray-300">|</span>
              <span className="text-xs font-bold text-emerald-700">{selected.size} selected</span>
              <button type="button" onClick={clearSelection} className="text-xs font-bold text-gray-400 hover:text-gray-600">
                <Square size={13} className="inline mr-0.5" /> Clear
              </button>
              <span className="text-gray-300">|</span>
              <button
                type="button"
                onClick={() => void handleBulk(true)}
                disabled={bulkUpdating}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {bulkUpdating ? <Loader2 size={12} className="animate-spin" /> : <Globe size={12} />}
                Enable on Marketplace
              </button>
              <button
                type="button"
                onClick={() => void handleBulk(false)}
                disabled={bulkUpdating}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              >
                {bulkUpdating ? <Loader2 size={12} className="animate-spin" /> : <EyeOff size={12} />}
                Remove from Marketplace
              </button>
            </>
          )}
        </div>
      )}

      {/* ── Product Grid ──────────────────────────────────────────────────── */}
      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-36 animate-pulse rounded-2xl bg-gray-100" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white py-16 text-center shadow-sm">
          <Package size={36} className="mx-auto mb-2 text-gray-300" />
          <p className="font-semibold text-gray-500">
            {products.length === 0
              ? "No products in this store yet."
              : "No products match your filter."}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((product) => {
            const isEnabled = product.marketplace_enabled === 1;
            const isSelected = selected.has(product.id);
            const isToggling = toggling === product.id;

            return (
              <div
                key={product.id}
                onClick={() => toggleSelect(product.id)}
                className={`group relative cursor-pointer rounded-2xl border bg-white p-4 shadow-sm transition-all hover:shadow-md ${
                  isSelected ? "border-emerald-400 ring-2 ring-emerald-200" : "border-gray-200"
                }`}
              >
                {/* Selection checkbox */}
                <div className="absolute right-3 top-3 z-10">
                  {isSelected ? (
                    <CheckSquare size={16} className="text-emerald-600" />
                  ) : (
                    <Square size={16} className="text-gray-300 group-hover:text-gray-400" />
                  )}
                </div>

                <div className="flex gap-3">
                  {/* Product image */}
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-gray-100">
                    {product.image ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={product.image}
                        alt={product.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-gray-300">
                        <ShoppingBag size={22} />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-bold text-gray-900">{product.name}</p>
                    <p className="mt-0.5 text-xs text-gray-500">{product.category}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-800">
                        ${Number(product.price).toFixed(2)}
                      </span>
                      <StatusPill status={product.status} />
                      <span className="text-[10px] text-gray-400">
                        {product.stock_packages} in stock
                      </span>
                    </div>
                  </div>
                </div>

                {/* Marketplace toggle */}
                <div
                  className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3"
                  onClick={(e) => e.stopPropagation()} // prevent card selection when clicking toggle
                >
                  <div className="flex items-center gap-1.5">
                    {isEnabled ? (
                      <Globe size={13} className="text-emerald-600" />
                    ) : (
                      <EyeOff size={13} className="text-gray-400" />
                    )}
                    <span
                      className={`text-xs font-bold ${
                        isEnabled ? "text-emerald-700" : "text-gray-400"
                      }`}
                    >
                      {isEnabled ? "On /products" : "Not listed"}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => void handleToggle(product.id, product.marketplace_enabled)}
                    disabled={isToggling}
                    title={isEnabled ? "Remove from marketplace" : "Show on marketplace"}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none disabled:opacity-50 ${
                      isEnabled ? "bg-emerald-500" : "bg-gray-200"
                    }`}
                  >
                    {isToggling ? (
                      <Loader2
                        size={12}
                        className="absolute inset-0 m-auto animate-spin text-white"
                      />
                    ) : (
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform duration-200 ${
                          isEnabled ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Footer note ───────────────────────────────────────────────────── */}
      {!loading && products.length > 0 && (
        <p className="text-center text-xs text-gray-400">
          Changes take effect immediately.{" "}
          <Link href="/products" target="_blank" className="font-bold text-emerald-600 hover:underline">
            View /products →
          </Link>
        </p>
      )}
    </div>
  );
}
