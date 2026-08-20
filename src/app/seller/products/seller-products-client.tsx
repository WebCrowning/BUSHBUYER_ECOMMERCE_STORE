"use client";

import { useEffect, useRef, useState } from "react";
import type { Product } from "@/types";
import type { Store } from "@/types/marketplace";
import { Package, Plus, Trash2, Edit2, AlertTriangle, Image as ImageIcon, Store as StoreIcon, Loader2, ArrowUpRight } from "lucide-react";
import Link from "next/link";

import { USD_TO_XAF, formatCurrency } from "@/lib/utils";

type ProductForm = {
  name: string;
  price: string;
  transportFee: string;
  image: string;
  imageZoom: string;
  description: string;
  featured: "0" | "1";
  category: string;
  packageName: "pack" | "bag" | "bundle" | "carton";
  unitType: "pcs" | "kg";
  unitValue: string;
  stockPackages: string;
};

const defaultForm: ProductForm = {
  name: "",
  price: "",
  transportFee: "0",
  image: "",
  imageZoom: "100",
  description: "",
  featured: "0",
  category: "General",
  packageName: "pack",
  unitType: "pcs",
  unitValue: "1",
  stockPackages: "0",
};

const NEW_CATEGORY_VALUE = "__new_category__";
const LOW_STOCK_THRESHOLD = 5;

function normalizeCategory(category: string) {
  return category.trim().replace(/\s+/g, " ");
}

export default function SellerProductsClient({
  store,
  initialProducts,
  initialCategories,
  autoOpenForm = false,
}: {
  store: Store;
  initialProducts: Product[];
  initialCategories: string[];
  autoOpenForm?: boolean;
}) {
  const formSectionRef = useRef<HTMLElement | null>(null);
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [categoryOptions, setCategoryOptions] = useState<string[]>(
    initialCategories.length > 0 ? initialCategories : ["General"]
  );
  const [form, setForm] = useState<ProductForm>(defaultForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [status, setStatus] = useState<string>("");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [selectedUploadName, setSelectedUploadName] = useState("");
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [showImageLibrary, setShowImageLibrary] = useState(false);
  const [savingZoom, setSavingZoom] = useState(false);
  const [savingProduct, setSavingProduct] = useState(false);

  async function reloadProducts() {
    try {
      const res = await fetch(`/api/admin/products?store_id=${store.id}`);
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products ?? []);
        if (Array.isArray(data.categories) && data.categories.length > 0) {
          setCategoryOptions(data.categories);
        }
      }
      // Always refresh from the global categories table
      const catRes = await fetch("/api/admin/categories");
      if (catRes.ok) {
        const catData = await catRes.json();
        const names: string[] = (catData.categories ?? []).map((c: { name: string }) => c.name);
        if (names.length > 0) setCategoryOptions(names);
      }
    } catch {
      // Ignore
    }
  }

  async function loadUploadedImages() {
    try {
      const response = await fetch("/api/admin/upload?type=seller");
      if (response.ok) {
        const payload = await response.json();
        setUploadedImages(payload?.images ?? []);
      }
    } catch {
      setUploadedImages([]);
    }
  }

  useEffect(() => {
    void loadUploadedImages();
  }, []);

  // Auto-scroll to the form when arriving from /seller/products/new
  useEffect(() => {
    if (autoOpenForm && formSectionRef.current) {
      setTimeout(() => {
        formSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 150);
    }
  }, [autoOpenForm]);

  async function uploadImage(file: File) {
    setUploadingImage(true);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const response = await fetch("/api/admin/upload?type=seller", { method: "POST", body: fd });

      // Safely parse JSON — catch HTML error pages from middleware
      let payload: Record<string, unknown> | null = null;
      try {
        payload = await response.json();
      } catch {
        throw new Error(`Upload failed (HTTP ${response.status})`);
      }

      if (!response.ok || !payload?.imageUrl) {
        // Extract a safe string from whatever the server returned
        const raw = payload?.error;
        const msg =
          typeof raw === "string"
            ? raw
            : raw && typeof (raw as Record<string, unknown>).message === "string"
              ? String((raw as Record<string, unknown>).message)
              : `Upload failed (HTTP ${response.status})`;
        throw new Error(msg);
      }

      setForm((prev) => ({ ...prev, image: String(payload!.imageUrl) }));
      setStatus("Image uploaded successfully.");
      await loadUploadedImages();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Image upload failed. Please try again.");
    } finally {
      setUploadingImage(false);
    }
  }

  async function submitProduct() {
    if (savingProduct) return;
    setStatus("");
    setSavingProduct(true);

    try {
      const normalizedCat = normalizeCategory(form.category) || "General";
      const body = {
        name: form.name,
        price: Number(form.price),
        transportFee: Number(form.transportFee),
        image: form.image,
        imageZoom: Number(form.imageZoom),
        description: form.description,
        featured: Number(form.featured),
        category: normalizedCat,
        packageName: form.packageName,
        unitType: form.unitType,
        unitValue: Number(form.unitValue),
        stockPackages: Number(form.stockPackages),
        storeId: store.id,
      };

      const endpoint = editingId ? `/api/admin/products/${editingId}` : "/api/admin/products";
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errPayload = await res.json().catch(() => null);
        throw new Error(errPayload?.error ?? "Failed to save product.");
      }

      setStatus(editingId ? "✓ Product updated successfully!" : "✓ Product created successfully!");
      setEditingId(null);
      setForm(defaultForm);
      await reloadProducts();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Failed to save product.");
    } finally {
      setSavingProduct(false);
    }
  }

  async function deleteProduct(id: number) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
      if (res.ok) {
        setStatus("✓ Product deleted successfully.");
        await reloadProducts();
      } else {
        setStatus("Failed to delete product.");
      }
    } finally {
      setDeletingId(null);
      setDeleteTarget(null);
    }
  }

  const lowStockProducts = products.filter(
    (product) => Number(product.stockPackages) <= LOW_STOCK_THRESHOLD
  );

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-2xl border border-border bg-white p-6 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <StoreIcon className="w-5 h-5 text-emerald-600" />
            <h1 className="text-xl font-extrabold text-brand-deep">Store Catalog & Products</h1>
          </div>
          <p className="mt-1 text-xs text-foreground/60">
            Managing products for <span className="font-bold text-foreground/80">{store.name}</span>
          </p>
        </div>

        <Link
          href={`/store/${store.slug}`}
          target="_blank"
          className="px-4 py-2 bg-surface hover:bg-surface-soft text-foreground/80 text-xs font-bold rounded-xl flex items-center gap-1.5 border border-border transition-all"
        >
          Preview Store Catalog <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
        </Link>
      </div>

      {/* Add / Edit Form */}
      <section ref={formSectionRef} className="rounded-2xl border border-border bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-brand-deep mb-4">
          {editingId ? "Edit Product" : "Add New Product to Store"}
        </h2>

        {status && (
          <div className={`mb-4 rounded-xl border px-4 py-2.5 text-xs font-medium ${
            status.startsWith("✓") ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"
          }`}>
            {status}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-foreground/60">Product Name *</label>
            <input
              required
              className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-xs text-brand-deep placeholder-foreground/40 focus:border-brand focus:outline-none"
              placeholder="e.g. Premium Dried Fish"
              value={form.name}
              onChange={(e) => setForm((v) => ({ ...v, name: e.target.value }))}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold uppercase tracking-wide text-foreground/60">
                Price (USD & CFA) *
              </label>
              {Number(form.price) > 0 && (
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  ≈ {formatCurrency(Math.round(Number(form.price) * USD_TO_XAF), "XAF")} CFA
                </span>
              )}
            </div>
            <input
              required
              type="number"
              min="0"
              step="0.01"
              className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-xs text-brand-deep placeholder-foreground/40 focus:border-brand focus:outline-none"
              placeholder="18.50"
              value={form.price}
              onChange={(e) => setForm((v) => ({ ...v, price: e.target.value }))}
            />
            <p className="mt-1 text-[11px] text-foreground/50 flex items-center justify-between">
              <span>Base currency: USD ($)</span>
              <span className="font-semibold text-emerald-600">
                {Number(form.price) > 0
                  ? `$${Number(form.price).toFixed(2)} = ${formatCurrency(Math.round(Number(form.price) * USD_TO_XAF), "XAF")} CFA`
                  : `1 USD = ${USD_TO_XAF} CFA`}
              </span>
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold uppercase tracking-wide text-foreground/60">
                Transport Fee (USD & CFA)
              </label>
              {Number(form.transportFee) > 0 && (
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  ≈ {formatCurrency(Math.round(Number(form.transportFee) * USD_TO_XAF), "XAF")} CFA
                </span>
              )}
            </div>
            <input
              type="number"
              min="0"
              step="0.01"
              className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-xs text-brand-deep placeholder-foreground/40 focus:border-brand focus:outline-none"
              placeholder="0.00"
              value={form.transportFee}
              onChange={(e) => setForm((v) => ({ ...v, transportFee: e.target.value }))}
            />
            <p className="mt-1 text-[11px] text-foreground/50 flex items-center justify-between">
              <span>Delivery / transport cost</span>
              {Number(form.transportFee) > 0 && (
                <span className="font-semibold text-emerald-600">
                  ${Number(form.transportFee).toFixed(2)} = {formatCurrency(Math.round(Number(form.transportFee) * USD_TO_XAF), "XAF")} CFA
                </span>
              )}
            </p>
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-foreground/60">Category</label>
            <select
              className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-xs text-brand-deep focus:border-brand focus:outline-none"
              value={categoryOptions.includes(form.category) ? form.category : NEW_CATEGORY_VALUE}
              onChange={(e) => {
                const val = e.target.value;
                if (val === NEW_CATEGORY_VALUE) {
                  setForm((v) => ({ ...v, category: "" }));
                } else {
                  setForm((v) => ({ ...v, category: val }));
                }
              }}
            >
              {categoryOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
              <option value={NEW_CATEGORY_VALUE}>+ Add New Category</option>
            </select>
            {!categoryOptions.includes(form.category) && (
              <input
                className="mt-2 w-full rounded-xl border border-border bg-surface px-4 py-2 text-xs text-brand-deep placeholder-foreground/40 focus:border-brand focus:outline-none"
                placeholder="Enter new category name..."
                value={form.category}
                onChange={(e) => setForm((v) => ({ ...v, category: e.target.value }))}
              />
            )}
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-foreground/60">Package Name</label>
            <select
              className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-xs text-brand-deep focus:border-brand focus:outline-none"
              value={form.packageName}
              onChange={(e) => setForm((v) => ({ ...v, packageName: e.target.value as ProductForm["packageName"] }))}
            >
              <option value="pack">pack</option>
              <option value="bag">bag</option>
              <option value="bundle">bundle</option>
              <option value="carton">carton</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-foreground/60">Unit Type</label>
            <select
              className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-xs text-brand-deep focus:border-brand focus:outline-none"
              value={form.unitType}
              onChange={(e) => setForm((v) => ({ ...v, unitType: e.target.value as ProductForm["unitType"] }))}
            >
              <option value="pcs">pieces (pcs)</option>
              <option value="kg">kilogram (kg)</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-foreground/60">Unit Value per Package</label>
            <input
              type="number"
              min="0.001"
              step="0.001"
              className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-xs text-brand-deep placeholder-foreground/40 focus:border-brand focus:outline-none"
              placeholder="1"
              value={form.unitValue}
              onChange={(e) => setForm((v) => ({ ...v, unitValue: e.target.value }))}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-foreground/60">Stock Packages Available</label>
            <input
              type="number"
              min="0"
              step="1"
              className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-xs text-brand-deep placeholder-foreground/40 focus:border-brand focus:outline-none"
              placeholder="50"
              value={form.stockPackages}
              onChange={(e) => setForm((v) => ({ ...v, stockPackages: e.target.value }))}
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-foreground/60">Product Image URL / Upload</label>
            <div className="flex gap-2">
              <input
                className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-xs text-brand-deep placeholder-foreground/40 focus:border-brand focus:outline-none"
                placeholder="https://images.unsplash.com/... or upload image"
                value={form.image}
                onChange={(e) => setForm((v) => ({ ...v, image: e.target.value }))}
              />
              <label className="shrink-0 cursor-pointer rounded-xl bg-surface hover:bg-surface-soft border border-border px-4 py-2.5 text-xs font-bold text-brand-deep transition-colors flex items-center gap-2">
                {uploadingImage ? <Loader2 size={14} className="animate-spin text-emerald-600" /> : <ImageIcon size={14} />}
                <span>{uploadingImage ? "Uploading..." : "Upload File"}</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  disabled={uploadingImage}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) await uploadImage(file);
                  }}
                />
              </label>
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-foreground/60">Description</label>
            <textarea
              className="w-full min-h-24 rounded-xl border border-border bg-surface px-4 py-2.5 text-xs text-brand-deep placeholder-foreground/40 focus:border-brand focus:outline-none"
              placeholder="Detailed description of the product..."
              value={form.description}
              onChange={(e) => setForm((v) => ({ ...v, description: e.target.value }))}
            />
          </div>
        </div>

        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={submitProduct}
            disabled={savingProduct}
            className="rounded-xl bg-brand px-6 py-2.5 text-xs font-bold text-brand-deep hover:bg-brand-deep disabled:opacity-50 transition-colors shadow-sm flex items-center gap-2"
          >
            {savingProduct && <Loader2 size={14} className="animate-spin" />}
            <span>{savingProduct ? "Saving..." : editingId ? "Update Product" : "Create Product"}</span>
          </button>
          {editingId && (
            <button
              type="button"
              onClick={() => {
                setEditingId(null);
                setForm(defaultForm);
              }}
              className="rounded-xl border border-border bg-surface px-5 py-2.5 text-xs font-bold text-foreground/70 hover:bg-surface-soft transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      </section>

      {/* Catalog Table */}
      <section className="rounded-2xl border border-border bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-brand-deep">Store Products ({products.length})</h2>
          {lowStockProducts.length > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-bold text-red-600">
              <AlertTriangle size={13} /> {lowStockProducts.length} Low Stock Item(s)
            </span>
          )}
        </div>

        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full text-xs text-foreground/70 text-left">
            <thead className="bg-surface text-foreground/60 font-bold uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Product</th>
                <th className="px-3 py-3">Category</th>
                <th className="px-3 py-3">Price (USD / CFA)</th>
                <th className="px-3 py-3">Stock</th>
                <th className="px-3 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {products.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-foreground/50">
                    <Package size={32} className="mx-auto mb-2 text-foreground/40" />
                    No products found for this store. Add your first product above!
                  </td>
                </tr>
              ) : (
                products.map((p) => (
                  <tr key={p.id} className="hover:bg-surface transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {p.image ? (
                          <img src={p.image} alt={p.name} className="h-10 w-10 rounded-lg object-cover border border-border shrink-0" />
                        ) : (
                          <div className="h-10 w-10 rounded-lg bg-surface border border-border flex items-center justify-center font-bold text-foreground/50 shrink-0">
                            P
                          </div>
                        )}
                        <div>
                          <p className="font-bold text-brand-deep">{p.name}</p>
                          <p className="text-[10px] text-foreground/50">ID: #{p.id} &bull; Per {p.packageName} ({Number(p.unitValue)} {p.unitType})</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <span className="rounded-md bg-surface border border-border px-2 py-0.5 text-[11px] font-medium text-foreground/70">
                        {p.category}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="font-bold text-brand-deep">${Number(p.price).toFixed(2)}</div>
                      <div className="text-[10px] font-semibold text-emerald-700">
                        {formatCurrency(Math.round(Number(p.price) * USD_TO_XAF), "XAF")} CFA
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      {Number(p.stockPackages) <= LOW_STOCK_THRESHOLD ? (
                        <span className="rounded-md bg-red-50 border border-red-200 px-2 py-0.5 text-[11px] font-bold text-red-600">
                          {p.stockPackages} packages (Low)
                        </span>
                      ) : (
                        <span className="rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[11px] font-bold text-emerald-600">
                          {p.stockPackages} packages
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => {
                            setEditingId(p.id);
                            setForm({
                              name: p.name,
                              price: String(p.price),
                              transportFee: String(p.transportFee ?? 0),
                              image: p.image || "",
                              imageZoom: String(p.imageZoom ?? 100),
                              description: p.description || "",
                              featured: p.featured ? "1" : "0",
                              category: p.category || "General",
                              packageName: (p.packageName as ProductForm["packageName"]) || "pack",
                              unitType: (p.unitType as ProductForm["unitType"]) || "pcs",
                              unitValue: String(p.unitValue || 1),
                              stockPackages: String(p.stockPackages || 0),
                            });
                          }}
                          className="rounded-lg bg-surface hover:bg-surface-soft border border-border p-1.5 text-foreground/70 hover:text-brand-deep transition-colors"
                          title="Edit product"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => deleteProduct(p.id)}
                          disabled={deletingId === p.id}
                          className="rounded-lg bg-surface hover:bg-red-50 border border-border hover:border-red-300 p-1.5 text-foreground/60 hover:text-red-600 transition-colors"
                          title="Delete product"
                        >
                          {deletingId === p.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
