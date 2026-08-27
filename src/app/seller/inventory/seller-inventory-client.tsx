"use client";

import { useMemo, useState } from "react";
import type { Product } from "@/types";
import type { Store } from "@/types/marketplace";
import { Boxes, Search, AlertTriangle, CheckCircle, Package, RefreshCw, Store as StoreIcon, Edit2, Loader2 } from "lucide-react";
import Link from "next/link";
import { USD_TO_XAF, formatCurrency } from "@/lib/utils";

type StockFilter = "all" | "instock" | "low" | "out";

export default function SellerInventoryClient({
  store,
  initialProducts,
}: {
  store: Store;
  initialProducts: Product[];
}) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [queryText, setQueryText] = useState("");
  const [filter, setFilter] = useState<StockFilter>("all");
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [editingStockId, setEditingStockId] = useState<number | null>(null);
  const [newStockVal, setNewStockVal] = useState<string>("");
  const [statusMsg, setStatusMsg] = useState("");

  const summary = useMemo(() => {
    let totalPackages = 0;
    let inStock = 0;
    let lowStock = 0;
    let outOfStock = 0;

    for (const p of products) {
      const pkgs = Number(p.stockPackages ?? 0);
      totalPackages += pkgs;
      if (pkgs === 0) outOfStock++;
      else if (pkgs <= 5) lowStock++;
      else inStock++;
    }

    return {
      totalProducts: products.length,
      inStock,
      lowStock,
      outOfStock,
      totalPackagesAvailable: totalPackages,
    };
  }, [products]);

  const filteredProducts = useMemo(() => {
    const q = queryText.trim().toLowerCase();

    return products.filter((p) => {
      const matchesQuery =
        q.length === 0 ||
        p.name.toLowerCase().includes(q) ||
        (p.category || "").toLowerCase().includes(q);

      const pkgs = Number(p.stockPackages ?? 0);
      const matchesFilter =
        filter === "all" ||
        (filter === "instock" && pkgs > 5) ||
        (filter === "low" && pkgs > 0 && pkgs <= 5) ||
        (filter === "out" && pkgs === 0);

      return matchesQuery && matchesFilter;
    });
  }, [products, queryText, filter]);

  async function reloadInventory() {
    try {
      const res = await fetch(`/api/admin/products?store_id=${store.id}`);
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products ?? []);
      }
    } catch {
      // Ignore
    }
  }

  async function handleUpdateStock(productId: number) {
    const val = parseInt(newStockVal, 10);
    if (isNaN(val) || val < 0) return;

    setUpdatingId(productId);
    try {
      const targetProduct = products.find((p) => p.id === productId);
      if (!targetProduct) return;

      const res = await fetch(`/api/admin/products/${productId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: targetProduct.name,
          price: targetProduct.price,
          transportFee: targetProduct.transportFee,
          image: targetProduct.image,
          description: targetProduct.description,
          featured: targetProduct.featured,
          category: targetProduct.category,
          packageName: targetProduct.packageName,
          unitType: targetProduct.unitType,
          unitValue: targetProduct.unitValue,
          stockPackages: val,
          storeId: store.id,
        }),
      });

      if (res.ok) {
        setStatusMsg(`✓ Stock updated to ${val} packages`);
        setEditingStockId(null);
        await reloadInventory();
        setTimeout(() => setStatusMsg(""), 3000);
      } else {
        setStatusMsg("Failed to update stock");
      }
    } catch {
      setStatusMsg("Failed to update stock");
    } finally {
      setUpdatingId(null);
    }
  }

  function stockBadge(stockPackages: number) {
    if (stockPackages === 0) {
      return "border-red-200 bg-red-50 text-red-600";
    }
    if (stockPackages <= 5) {
      return "border-amber-200 bg-amber-50 text-amber-600";
    }
    return "border-emerald-200 bg-emerald-50 text-emerald-600";
  }

  function stockLabel(stockPackages: number) {
    if (stockPackages === 0) return "Out of stock";
    if (stockPackages <= 5) return "Low stock";
    return "In stock";
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-2xl border border-border bg-white p-6 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Boxes className="w-5 h-5 text-emerald-600" />
            <h1 className="text-xl font-extrabold text-brand-deep">Store Inventory Monitor</h1>
          </div>
          <p className="mt-1 text-xs text-foreground/60">
            Package availability & inventory control for <span className="font-bold text-foreground/80">{store.name}</span>
          </p>
        </div>

        <div className="flex gap-2">
          <Link
            href="/seller/products"
            className="px-4 py-2 bg-brand hover:bg-brand-deep text-brand-deep text-xs font-bold rounded-xl transition-all shadow-sm"
          >
            Manage Products
          </Link>
        </div>
      </div>

      {statusMsg && (
        <div className={`rounded-xl border px-4 py-2.5 text-xs font-bold ${
          statusMsg.startsWith("✓") ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"
        }`}>
          {statusMsg}
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-wider text-foreground/60">Total Products</p>
          <p className="mt-1 text-2xl font-extrabold text-brand-deep">{summary.totalProducts}</p>
        </div>

        <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-wider text-foreground/60">In Stock</p>
          <p className="mt-1 text-2xl font-extrabold text-emerald-600">{summary.inStock}</p>
        </div>

        <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-wider text-foreground/60">Low Stock</p>
          <p className="mt-1 text-2xl font-extrabold text-amber-600">{summary.lowStock}</p>
        </div>

        <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-wider text-foreground/60">Out of Stock</p>
          <p className="mt-1 text-2xl font-extrabold text-red-600">{summary.outOfStock}</p>
        </div>

        <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-wider text-foreground/60">Total Packages</p>
          <p className="mt-1 text-2xl font-extrabold text-brand-deep">{summary.totalPackagesAvailable}</p>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="rounded-2xl border border-border bg-white p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-foreground/50" />
            <input
              type="search"
              placeholder="Search store inventory by name or category..."
              value={queryText}
              onChange={(e) => setQueryText(e.target.value)}
              className="w-full rounded-xl border border-border bg-surface pl-9 pr-4 py-2 text-xs text-brand-deep placeholder-foreground/40 focus:border-brand focus:outline-none"
            />
          </div>

          <div className="flex gap-1.5 flex-wrap">
            <button
              onClick={() => setFilter("all")}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                filter === "all" ? "bg-brand text-brand-deep" : "bg-surface text-foreground/70 hover:bg-surface-soft"
              }`}
            >
              All Items ({products.length})
            </button>
            <button
              onClick={() => setFilter("instock")}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                filter === "instock" ? "bg-emerald-600 text-brand-deep" : "bg-surface text-foreground/70 hover:bg-surface-soft"
              }`}
            >
              In Stock ({summary.inStock})
            </button>
            <button
              onClick={() => setFilter("low")}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                filter === "low" ? "bg-amber-600 text-brand-deep" : "bg-surface text-foreground/70 hover:bg-surface-soft"
              }`}
            >
              Low Stock ({summary.lowStock})
            </button>
            <button
              onClick={() => setFilter("out")}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                filter === "out" ? "bg-red-600 text-brand-deep" : "bg-surface text-foreground/70 hover:bg-surface-soft"
              }`}
            >
              Out of Stock ({summary.outOfStock})
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full text-xs text-foreground/70 text-left">
            <thead className="bg-surface text-foreground/60 font-bold uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Product Name</th>
                <th className="px-3 py-3">Category</th>
                <th className="px-3 py-3">Price (USD / CFA)</th>
                <th className="px-3 py-3">Package Config</th>
                <th className="px-3 py-3">Stock Packages</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3 text-right">Quick Update</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-foreground/50 font-medium">
                    No products match the selected inventory filter.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const pkgs = Number(p.stockPackages ?? 0);
                  const isEditing = editingStockId === p.id;
                    const isBlocked = p.status === "blocked" || (p as any).admin_blocked === 1;
                    return (
                    <tr
                      key={p.id}
                      className={`transition-colors ${
                        isBlocked ? "bg-red-50/40 hover:bg-red-50/60" : "hover:bg-surface"
                      }`}
                    >
                      <td className="px-4 py-3 font-bold text-brand-deep">
                        <div>{p.name}</div>
                        {isBlocked && (
                          <div className="mt-1 inline-flex items-center gap-1 rounded-md bg-red-100 border border-red-300 px-2 py-0.5 text-[10px] font-bold text-red-800">
                            <AlertTriangle size={11} className="text-red-600" />
                            <span>Product blocked. Contact admin.</span>
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3 text-foreground/60">{p.category}</td>
                      <td className="px-3 py-3 font-bold text-brand-deep">
                        <div>${Number(p.price).toFixed(2)}</div>
                        <div className="text-[10px] font-semibold text-emerald-700">
                          {formatCurrency(Math.round(Number(p.price) * USD_TO_XAF), "XAF")} CFA
                        </div>
                      </td>
                      <td className="px-3 py-3 text-foreground/60">
                        {p.packageName} ({Number(p.unitValue)} {p.unitType})
                      </td>
                      <td className="px-3 py-3 font-bold text-brand-deep">{pkgs} package(s)</td>
                      <td className="px-3 py-3">
                        {isBlocked ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-red-300 bg-red-100 px-2.5 py-0.5 text-[10px] font-bold text-red-700">
                            🚫 Blocked by Admin
                          </span>
                        ) : (
                          <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${stockBadge(pkgs)}`}>
                            {stockLabel(pkgs)}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right">
                        {isEditing ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <input
                              type="number"
                              min="0"
                              className="w-16 rounded-lg border border-border bg-surface px-2 py-1 text-xs text-brand-deep focus:border-brand focus:outline-none"
                              value={newStockVal}
                              onChange={(e) => setNewStockVal(e.target.value)}
                            />
                            <button
                              onClick={() => void handleUpdateStock(p.id)}
                              disabled={updatingId === p.id}
                              className="rounded-lg bg-emerald-600 hover:bg-emerald-700 px-2.5 py-1 text-[11px] font-bold text-brand-deep disabled:opacity-50"
                            >
                              {updatingId === p.id ? <Loader2 size={12} className="animate-spin" /> : "Save"}
                            </button>
                            <button
                              onClick={() => setEditingStockId(null)}
                              className="rounded-lg bg-surface hover:bg-surface-soft border border-border px-2 py-1 text-[11px] text-foreground/60"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setEditingStockId(p.id);
                              setNewStockVal(String(pkgs));
                            }}
                            className="inline-flex items-center gap-1 rounded-lg bg-surface hover:bg-surface-soft border border-border px-3 py-1 text-[11px] font-bold text-foreground/70 transition-colors"
                          >
                            <Edit2 size={12} /> Set Stock
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
