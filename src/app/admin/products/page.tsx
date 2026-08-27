"use client";

import { useEffect, useRef, useState } from "react";
import type { Product } from "@/types";
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

export default function AdminProductsPage() {
  const formSectionRef = useRef<HTMLElement | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<string[]>(["General"]);
  const [stores, setStores] = useState<Array<{ id: number; name: string; slug: string }>>([]);
  const [selectedStoreFilter, setSelectedStoreFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "blocked" | "low_stock">("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [togglingBlockId, setTogglingBlockId] = useState<number | null>(null);
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
  const [deletingCategory, setDeletingCategory] = useState(false);
  const zoomSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function loadStores() {
    try {
      const res = await fetch("/api/admin/stores?limit=50");
      if (res.ok) {
        const data = await res.json();
        setStores(data.stores ?? []);
      }
    } catch {
      // non-fatal
    }
  }

  async function loadProducts(storeIdParam?: string) {
    const target = storeIdParam ?? selectedStoreFilter;
    const url = target === "all" ? "/api/admin/products?store_id=all" : `/api/admin/products?store_id=${target}`;
    const response = await fetch(url);
    const payload = (await response.json()) as { products: Product[]; categories?: string[] };
    setProducts(payload.products ?? []);

    const categoryMap = new Map<string, string>();
    categoryMap.set("general", "General");

    function addCategory(raw: string) {
      const normalized = normalizeCategory(String(raw ?? ""));
      if (!normalized) return;
      const key = normalized.toLowerCase();
      if (!categoryMap.has(key)) categoryMap.set(key, normalized);
    }

    for (const category of payload.categories ?? []) { addCategory(category); }
    for (const product of payload.products ?? []) { addCategory(product.category); }

    setCategoryOptions(Array.from(categoryMap.values()).sort((a, b) => a.localeCompare(b)));

    // Always refresh from the global categories table — it's the authoritative source
    try {
      const catRes = await fetch("/api/admin/categories");
      if (catRes.ok) {
        const catData = await catRes.json();
        const names: string[] = (catData.categories ?? []).map((c: { name: string }) => c.name);
        if (names.length > 0) {
          setCategoryOptions((prev) => {
            const merged = new Map<string, string>();
            for (const n of prev) merged.set(n.toLowerCase(), n);
            for (const n of names) merged.set(n.toLowerCase(), n);
            return Array.from(merged.values()).sort((a, b) => a.localeCompare(b));
          });
        }
      }
    } catch { /* non-fatal */ }
  }

  async function handleToggleBlock(productId: number, isCurrentlyBlocked: boolean) {
    setTogglingBlockId(productId);
    try {
      const res = await fetch(`/api/admin/products/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: isCurrentlyBlocked ? "unblock" : "block",
          reason: isCurrentlyBlocked ? null : "Blocked by administrator for moderation review",
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to change product status");
      }

      setStatus(isCurrentlyBlocked ? "✓ Product unblocked successfully." : "⚠️ Product blocked by Admin. It will not show on the public marketplace.");
      await loadProducts();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Failed to toggle product status.");
    } finally {
      setTogglingBlockId(null);
    }
  }

  async function loadUploadedImages() {
    const response = await fetch("/api/admin/upload?type=product");
    const payload = (await response.json().catch(() => null)) as
      | { images?: string[] }
      | null;

    if (response.ok) {
      setUploadedImages(payload?.images ?? []);
      return;
    }

    setUploadedImages([]);
  }

  useEffect(() => {
    const timeout = setTimeout(() => {
      void loadStores();
      void loadProducts();
      void loadUploadedImages();
    }, 0);

    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    return () => {
      if (zoomSaveTimerRef.current) {
        clearTimeout(zoomSaveTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!editingId) {
      return;
    }

    formSectionRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, [editingId]);

  async function applyImageSelection(imageUrl: string) {
    setForm((prev) => ({ ...prev, image: imageUrl }));

    if (!editingId) {
      setStatus("Image selected. Click Update Product to save changes.");
      return;
    }

    const saveResponse = await fetch(`/api/admin/products/${editingId}/image`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: imageUrl }),
    });

    if (!saveResponse.ok) {
      const savePayload = (await saveResponse.json().catch(() => null)) as
        | { error?: string }
        | null;
      throw new Error(savePayload?.error ?? "Failed to update product image");
    }

    setStatus("Product image updated.");
    await loadProducts();
  }

  async function uploadImage(file: File) {
    setUploadingImage(true);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const response = await fetch("/api/admin/upload?type=product", { method: "POST", body: fd });
      const payload = (await response.json()) as { imageUrl?: string; error?: string };

      if (!response.ok || !payload.imageUrl) {
        throw new Error(payload.error ?? "Upload failed");
      }

      setForm((prev) => ({ ...prev, image: payload.imageUrl ?? "" }));

      if (editingId) {
        const saveResponse = await fetch(`/api/admin/products/${editingId}/image`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: payload.imageUrl }),
        });

        if (!saveResponse.ok) {
          const savePayload = (await saveResponse.json().catch(() => null)) as
            | { error?: string }
            | null;
          throw new Error(savePayload?.error ?? "Image uploaded but product image was not updated");
        }

        setStatus("Image uploaded and product updated.");
        await loadProducts();
      } else {
        setStatus("Image uploaded. Click Create Product to save.");
      }

      await loadUploadedImages();
    } finally {
      setUploadingImage(false);
    }
  }

  async function saveImageZoomNow(zoomOverride?: number) {
    if (!editingId) {
      return;
    }

    const zoom = Math.max(80, Math.min(180, Number(zoomOverride ?? form.imageZoom) || 100));
    setSavingZoom(true);
    try {
      const response = await fetch(`/api/admin/products/${editingId}/image`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageZoom: zoom }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "Failed to save image zoom");
      }

      setStatus("Product image zoom updated.");
      await loadProducts();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Failed to save image zoom.");
    } finally {
      setSavingZoom(false);
    }
  }

  function scheduleZoomSave(nextZoom: string) {
    if (!editingId) {
      return;
    }

    if (zoomSaveTimerRef.current) {
      clearTimeout(zoomSaveTimerRef.current);
    }

    const zoomValue = Math.max(80, Math.min(180, Number(nextZoom) || 100));
    zoomSaveTimerRef.current = setTimeout(() => {
      void saveImageZoomNow(zoomValue);
    }, 300);
  }

  async function deleteSelectedCategory() {
    const category = normalizeCategory(form.category);
    if (!category || category.toLowerCase() === "general") {
      return;
    }

    const confirmed = confirm(
      `Delete category "${category}"? Products in this category will be moved to "General".`,
    );
    if (!confirmed) {
      return;
    }

    setDeletingCategory(true);
    try {
      const response = await fetch("/api/admin/products/categories", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, reassignTo: "General", storeId: 0 }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { error?: string; affectedRows?: number }
        | null;

      if (!response.ok) {
        throw new Error(payload?.error ?? "Failed to delete category.");
      }

      setForm((prev) => ({ ...prev, category: "General" }));
      setStatus(
        `Category "${category}" deleted. ${Number(payload?.affectedRows ?? 0)} product(s) moved to General.`,
      );
      await loadProducts();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Failed to delete category.");
    } finally {
      setDeletingCategory(false);
    }
  }

  async function submit() {
    if (savingProduct) {
      return;
    }

    const numericTransportFee = Number(form.transportFee);
    if (Number.isFinite(numericTransportFee) && numericTransportFee === 0) {
      const confirmed = confirm(
        "Transport fee is set to 0. This means delivery cost may be absorbed by the business. Do you want to continue?",
      );
      if (!confirmed) {
        setStatus("Save cancelled. Update transport fee or confirm to continue.");
        return;
      }
    }

    setSavingProduct(true);
    setStatus("");
    const normalizedCategory = normalizeCategory(form.category) || "General";
    const body = {
      name: form.name,
      price: Number(form.price),
      transportFee: numericTransportFee,
      image: form.image,
      imageZoom: Number(form.imageZoom),
      description: form.description,
      featured: Number(form.featured),
      category: normalizedCategory,
      packageName: form.packageName,
      unitType: form.unitType,
      unitValue: Number(form.unitValue),
      stockPackages: Number(form.stockPackages),
      storeId: 0,
    };

    const endpoint = editingId ? `/api/admin/products/${editingId}` : "/api/admin/products";
    const method = editingId ? "PUT" : "POST";

    try {
      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorPayload = (await response.json().catch(() => null)) as
          | { error?: string | { fieldErrors?: Record<string, string[]>; formErrors?: string[] } }
          | null;

        let message = "Failed to save product.";
        const apiError = errorPayload?.error;
        if (typeof apiError === "string" && apiError.trim()) {
          message = apiError;
        } else if (apiError && typeof apiError === "object") {
          const firstField = Object.values(apiError.fieldErrors ?? {}).flat()[0];
          const firstForm = apiError.formErrors?.[0];
          message = firstField || firstForm || message;
        }

        setStatus(message);
        return;
      }

      setStatus(editingId ? "Product updated." : "Product created.");
      setEditingId(null);
      setForm(defaultForm);
      await loadProducts();
    } catch {
      setStatus("Failed to save product. Please try again.");
    } finally {
      setSavingProduct(false);
    }
  }

  async function deleteProduct(id: number) {
    const response = await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
    if (response.ok) {
      setStatus("Product deleted.");
      await loadProducts();
      return;
    }

    setStatus("Failed to delete product.");
  }

  async function confirmDeleteProduct() {
    if (!deleteTarget) {
      return;
    }

    setDeletingId(deleteTarget.id);
    try {
      await deleteProduct(deleteTarget.id);
    } finally {
      setDeletingId(null);
      setDeleteTarget(null);
    }
  }

  const lowStockProducts = products.filter(
    (product) => Number(product.stockPackages) <= LOW_STOCK_THRESHOLD,
  );

  return (
    <div className="space-y-5">
      <section ref={formSectionRef} className="glass-card rounded-2xl p-5">
        <h2 className="text-xl font-bold text-brand-deep">{editingId ? "Edit Product" : "Add Product"}</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <input className="rounded-xl border border-border bg-white px-4 py-2 text-sm" placeholder="Product name" value={form.name} onChange={(e) => setForm((v) => ({ ...v, name: e.target.value }))} />
          <label className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="block text-xs font-semibold uppercase tracking-wide text-foreground/65">Product price (USD & CFA)</span>
              {Number(form.price) > 0 && (
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  ≈ {formatCurrency(Math.round(Number(form.price) * USD_TO_XAF), "XAF")} CFA
                </span>
              )}
            </div>
            <input
              type="number"
              min="0"
              step="0.01"
              className="w-full rounded-xl border border-border bg-white px-4 py-2 text-sm"
              placeholder="0.00"
              value={form.price}
              onChange={(e) => setForm((v) => ({ ...v, price: e.target.value }))}
            />
          </label>
          <label className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="block text-xs font-semibold uppercase tracking-wide text-foreground/65">Transport fee (USD & CFA)</span>
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
              className="w-full rounded-xl border border-border bg-white px-4 py-2 text-sm"
              placeholder="0.00"
              value={form.transportFee}
              onChange={(e) => setForm((v) => ({ ...v, transportFee: e.target.value }))}
            />
            {Number(form.transportFee) === 0 ? (
              <p className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700">
                Transport fee is 0. Delivery cost may be absorbed by the business.
              </p>
            ) : null}
          </label>
          <label className="space-y-1">
            <span className="block text-xs font-semibold uppercase tracking-wide text-foreground/65">Category</span>
            <select
              className="w-full rounded-xl border border-border bg-white px-4 py-2 text-sm"
              value={categoryOptions.includes(form.category) ? form.category : NEW_CATEGORY_VALUE}
              onChange={(e) => {
                const value = e.target.value;
                if (value === NEW_CATEGORY_VALUE) {
                  setForm((v) => ({ ...v, category: "" }));
                  return;
                }

                setForm((v) => ({ ...v, category: value }));
              }}
            >
              {categoryOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
              <option value={NEW_CATEGORY_VALUE}>+ Add new category</option>
            </select>
            {!categoryOptions.includes(form.category) ? (
              <input
                className="mt-2 w-full rounded-xl border border-border bg-white px-4 py-2 text-sm"
                placeholder="Enter new category"
                value={form.category}
                onChange={(e) => setForm((v) => ({ ...v, category: e.target.value }))}
              />
            ) : null}
            {categoryOptions.includes(form.category) && form.category.toLowerCase() !== "general" ? (
              <button
                type="button"
                onClick={() => void deleteSelectedCategory()}
                disabled={deletingCategory}
                className="mt-2 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 transition-colors hover:bg-red-100 disabled:opacity-60"
              >
                {deletingCategory ? "Deleting category..." : "Delete this category"}
              </button>
            ) : null}
          </label>
          <label className="space-y-1">
            <span className="block text-xs font-semibold uppercase tracking-wide text-foreground/65">Package name</span>
            <select
              className="w-full rounded-xl border border-border bg-white px-4 py-2 text-sm"
              value={form.packageName}
              onChange={(e) => setForm((v) => ({ ...v, packageName: e.target.value as ProductForm["packageName"] }))}
            >
              <option value="pack">pack</option>
              <option value="bag">bag</option>
              <option value="bundle">bundle</option>
              <option value="carton">carton</option>
            </select>
          </label>
          <label className="space-y-1">
            <span className="block text-xs font-semibold uppercase tracking-wide text-foreground/65">Unit type</span>
            <select
              className="w-full rounded-xl border border-border bg-white px-4 py-2 text-sm"
              value={form.unitType}
              onChange={(e) => setForm((v) => ({ ...v, unitType: e.target.value as ProductForm["unitType"] }))}
            >
              <option value="pcs">pieces (pcs)</option>
              <option value="kg">kilogram (kg)</option>
            </select>
          </label>
          <label className="space-y-1">
            <span className="block text-xs font-semibold uppercase tracking-wide text-foreground/65">Quantity per package</span>
            <input
              type="number"
              min="0.001"
              step="0.001"
              className="w-full rounded-xl border border-border bg-white px-4 py-2 text-sm"
              placeholder="1"
              value={form.unitValue}
              onChange={(e) => setForm((v) => ({ ...v, unitValue: e.target.value }))}
            />
          </label>
          <label className="space-y-1">
            <span className="block text-xs font-semibold uppercase tracking-wide text-foreground/65">Number of packages available</span>
            <input
              type="number"
              min="0"
              step="1"
              className="w-full rounded-xl border border-border bg-white px-4 py-2 text-sm"
              value={form.stockPackages}
              onChange={(e) => setForm((v) => ({ ...v, stockPackages: e.target.value }))}
            />
          </label>
          <label className="space-y-1">
            <span className="block text-xs font-semibold uppercase tracking-wide text-foreground/65">Featured status</span>
            <select
              className="w-full rounded-xl border border-border bg-white px-4 py-2 text-sm"
              value={form.featured}
              onChange={(e) => setForm((v) => ({ ...v, featured: e.target.value as "0" | "1" }))}
            >
              <option value="0">Not Featured</option>
              <option value="1">Featured</option>
            </select>
          </label>
          <label className="space-y-1">
            <span className="block text-xs font-semibold uppercase tracking-wide text-foreground/65">Image URL</span>
            <input
              className="w-full rounded-xl border border-border bg-white px-4 py-2 text-sm"
              placeholder="Image URL"
              value={form.image}
              onChange={(e) => setForm((v) => ({ ...v, image: e.target.value }))}
            />
          </label>
        </div>

        <p className="mt-2 text-xs text-foreground/65">
          Transport fee is saved for both new products and updates.
        </p>

        <div className="mt-4 rounded-2xl border border-border bg-surface p-3">
          <p className="text-sm font-semibold text-brand-deep">Upload image file</p>
          <p className="mt-1 text-xs text-foreground/70">
            Supported: PNG, JPG, WEBP (max 5MB)
          </p>
          <label className="mt-3 inline-flex cursor-pointer items-center rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-deep">
            {uploadingImage ? "Uploading..." : "Choose Image File"}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              disabled={uploadingImage}
              onChange={async (e) => {
                const inputElement = e.currentTarget;
                const file = e.target.files?.[0];
                if (!file) {
                  return;
                }

                setSelectedUploadName(file.name);

                try {
                  await uploadImage(file);
                } catch (err) {
                  setStatus(err instanceof Error ? err.message : "Image upload failed.");
                } finally {
                  inputElement.value = "";
                }
              }}
            />
          </label>
          <p className="mt-2 text-xs text-foreground/70">
            {selectedUploadName ? `Selected: ${selectedUploadName}` : "No file selected"}
          </p>
        </div>

        {uploadingImage ? (
          <p className="mt-2 text-sm text-foreground/70">Uploading image...</p>
        ) : null}

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-full border border-slate-300 bg-slate-100 px-4 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-200"
            onClick={() => {
              setShowImageLibrary((prev) => !prev);
            }}
          >
            {showImageLibrary ? "Hide uploaded images" : "Select from uploaded images"}
          </button>
          <button
            type="button"
            className="rounded-full border border-slate-300 bg-slate-100 px-4 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-200"
            onClick={() => void loadUploadedImages()}
          >
            Refresh image library
          </button>
        </div>

        {showImageLibrary ? (
          <div className="mt-3 rounded-xl border border-border bg-surface p-3">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-foreground/60">
              Uploaded images
            </p>
            {uploadedImages.length === 0 ? (
              <p className="text-sm text-foreground/70">No uploaded images found.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {uploadedImages.map((imageUrl) => {
                  const isSelected = form.image === imageUrl;
                  return (
                    <button
                      key={imageUrl}
                      type="button"
                      className={`overflow-hidden rounded-lg border ${
                        isSelected ? "border-brand ring-2 ring-brand/30" : "border-border"
                      }`}
                      onClick={async () => {
                        try {
                          await applyImageSelection(imageUrl);
                        } catch (err) {
                          setStatus(err instanceof Error ? err.message : "Failed to select image.");
                        }
                      }}
                    >
                      <img
                        src={imageUrl}
                        alt="Uploaded product image"
                        className="h-24 w-full object-cover"
                      />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ) : null}

        {form.image ? (
          <div className="mt-3 rounded-xl border border-border bg-surface p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-foreground/60">Current image preview</p>
            <div className="h-28 w-28 overflow-hidden rounded-lg border border-border">
              <img
                src={form.image}
                alt="Product preview"
                className="h-full w-full object-cover"
                style={{ transform: `scale(${Math.max(80, Math.min(180, Number(form.imageZoom) || 100)) / 100})` }}
              />
            </div>
            <p className="mt-2 truncate text-xs text-foreground/70">{form.image}</p>
          </div>
        ) : null}

        {editingId ? (
          <div className="mt-3 rounded-xl border border-border bg-surface p-3">
            <label className="block text-xs font-semibold uppercase tracking-wide text-foreground/65">
              Image Zoom on Product Page ({form.imageZoom}%)
            </label>
            <input
              type="range"
              min="80"
              max="180"
              step="1"
              value={form.imageZoom}
              onChange={(e) => {
                const nextZoom = e.target.value;
                setForm((v) => ({ ...v, imageZoom: nextZoom }));
                scheduleZoomSave(nextZoom);
              }}
              className="mt-2 w-full accent-brand"
            />
            <p className="mt-2 text-xs text-foreground/70">
              Default is 100%. Adjust only if this product image appears too zoomed-in on the product pages.
            </p>
            <div className="mt-2">
              <button
                type="button"
                className="rounded-full border border-border px-3 py-1 text-xs font-semibold"
                onClick={() => void saveImageZoomNow()}
                disabled={savingZoom}
              >
                {savingZoom ? "Saving zoom..." : "Save zoom now"}
              </button>
            </div>
          </div>
        ) : null}

        <textarea className="mt-3 min-h-28 w-full rounded-2xl border border-border bg-white px-4 py-2 text-sm" placeholder="Description" value={form.description} onChange={(e) => setForm((v) => ({ ...v, description: e.target.value }))} />

        <div className="mt-4 flex gap-2">
          <button type="button" onClick={submit} disabled={savingProduct} className="rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white disabled:opacity-60">
            {savingProduct ? "Saving..." : editingId ? "Update Product" : "Create Product"}
          </button>
          {editingId ? (
            <button type="button" onClick={() => { setEditingId(null); setForm(defaultForm); }} className="rounded-full border border-border px-5 py-2 text-sm font-semibold">
              Cancel
            </button>
          ) : null}
        </div>

        {status ? <p className="mt-3 text-sm">{status}</p> : null}
      </section>

      <section className="glass-card rounded-2xl p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border">
          <div>
            <h2 className="text-xl font-bold text-brand-deep">Manage & Moderate Products</h2>
            <p className="text-xs text-foreground/60 mt-0.5">
              Filter by store or status, update inventory, or block/unblock products across the marketplace.
            </p>
          </div>

          {/* Store Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-foreground/60 shrink-0">Store:</span>
            <select
              value={selectedStoreFilter}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedStoreFilter(val);
                void loadProducts(val);
              }}
              className="rounded-xl border border-border bg-white px-3 py-1.5 text-xs font-bold text-brand-deep shadow-sm outline-none"
            >
              <option value="all">🏬 All Stores (Platform-Wide)</option>
              <option value="0">⭐ Bushbuyer Flagship (Store #0)</option>
              {stores.map((s) => (
                <option key={s.id} value={String(s.id)}>
                  🏪 {s.name} (Store #{s.id})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className={`rounded-full px-3 py-1 text-xs font-bold transition-all ${
                statusFilter === "all"
                  ? "bg-brand text-white shadow-sm"
                  : "bg-surface text-foreground/70 hover:bg-surface-soft border border-border"
              }`}
            >
              All ({products.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("active")}
              className={`rounded-full px-3 py-1 text-xs font-bold transition-all ${
                statusFilter === "active"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "bg-surface text-foreground/70 hover:bg-surface-soft border border-border"
              }`}
            >
              Active ({products.filter((p) => p.status !== "blocked" && (p as any).admin_blocked !== 1).length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("blocked")}
              className={`rounded-full px-3 py-1 text-xs font-bold transition-all ${
                statusFilter === "blocked"
                  ? "bg-red-600 text-white shadow-sm"
                  : "bg-red-50 text-red-700 hover:bg-red-100 border border-red-200"
              }`}
            >
              ⚠️ Blocked by Admin ({products.filter((p) => p.status === "blocked" || (p as any).admin_blocked === 1).length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("low_stock")}
              className={`rounded-full px-3 py-1 text-xs font-bold transition-all ${
                statusFilter === "low_stock"
                  ? "bg-amber-600 text-white shadow-sm"
                  : "bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200"
              }`}
            >
              Low Stock ({lowStockProducts.length})
            </button>
          </div>

          <div className="w-full sm:w-64">
            <input
              type="search"
              placeholder="Filter by product name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-border bg-white px-3 py-1.5 text-xs outline-none"
            />
          </div>
        </div>

        {lowStockProducts.length > 0 && statusFilter === "all" ? (
          <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs text-red-700">
            <span className="font-bold">Low stock warning:</span> {lowStockProducts.length} product(s) have stock at or below {LOW_STOCK_THRESHOLD} packages.
          </div>
        ) : null}

        {/* Product Cards List */}
        <div className="mt-4 space-y-3">
          {(() => {
            const q = searchQuery.toLowerCase().trim();
            const displayed = products.filter((p) => {
              const matchesSearch = !q || p.name.toLowerCase().includes(q) || (p.category || "").toLowerCase().includes(q);
              const isBlocked = p.status === "blocked" || (p as any).admin_blocked === 1;
              const matchesStatus =
                statusFilter === "all" ||
                (statusFilter === "active" && !isBlocked) ||
                (statusFilter === "blocked" && isBlocked) ||
                (statusFilter === "low_stock" && Number(p.stockPackages) <= LOW_STOCK_THRESHOLD);
              return matchesSearch && matchesStatus;
            });

            if (displayed.length === 0) {
              return (
                <div className="rounded-xl border border-dashed border-border p-8 text-center text-xs text-foreground/50">
                  No products match the selected filters.
                </div>
              );
            }

            return displayed.map((product) => {
              const isBlocked = product.status === "blocked" || (product as any).admin_blocked === 1;
              const isToggling = togglingBlockId === product.id;

              return (
                <article
                  key={product.id}
                  className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3 transition-all ${
                    isBlocked
                      ? "border-red-300 bg-red-50/40"
                      : "border-border bg-white"
                  }`}
                >
                  <div className="flex min-w-44 flex-1 items-start gap-3">
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-border bg-surface/70">
                      {product.image ? (
                        <img
                          src={product.image}
                          alt={`${product.name} preview`}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center px-2 text-center text-[10px] font-semibold uppercase tracking-wide text-foreground/55">
                          No image
                        </div>
                      )}
                      {isBlocked && (
                        <div className="absolute inset-0 bg-red-900/60 flex items-center justify-center text-white text-[9px] font-black uppercase tracking-wider">
                          Blocked
                        </div>
                      )}
                    </div>

                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-bold text-brand-deep">{product.name}</p>

                        {/* Status Badges */}
                        {isBlocked ? (
                          <span className="rounded-full border border-red-300 bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">
                            🚫 Blocked by Admin
                          </span>
                        ) : (
                          <span className="rounded-full border border-emerald-300 bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                            ✓ Active
                          </span>
                        )}

                        {/* Store Tag */}
                        {product.storeName && (
                          <span className="rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                            🏪 {product.storeName}
                          </span>
                        )}

                        {Number(product.stockPackages) <= LOW_STOCK_THRESHOLD && !isBlocked ? (
                          <span className="rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">
                            Low stock
                          </span>
                        ) : null}
                      </div>

                      <p className="text-xs text-foreground/60 mt-1">
                        Category: <span className="font-semibold text-foreground/80">{product.category}</span> | Price: ${Number(product.price).toFixed(2)} ({formatCurrency(Math.round(Number(product.price) * USD_TO_XAF), "XAF")} CFA) per {product.packageName} ({Number(product.unitValue)} {product.unitType}) | Stock: {Number(product.stockPackages)} packages | ID: #{product.id}
                      </p>

                      {isBlocked && (
                        <p className="text-[11px] text-red-600 font-semibold mt-1">
                          Reason: {(product as any).admin_block_reason || "Product blocked by administrator. Seller sees: 'Product blocked. Contact admin.'"}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Block / Unblock Moderation Button */}
                    <button
                      type="button"
                      disabled={isToggling}
                      onClick={() => void handleToggleBlock(product.id, isBlocked)}
                      className={`rounded-full px-3.5 py-1 text-xs font-bold transition-all shadow-sm disabled:opacity-50 ${
                        isBlocked
                          ? "border border-emerald-300 bg-emerald-600 hover:bg-emerald-700 text-white"
                          : "border border-red-300 bg-red-50 hover:bg-red-100 text-red-700"
                      }`}
                      title={isBlocked ? "Unblock and show on marketplace" : "Block product from showing on public marketplace"}
                    >
                      {isToggling ? "Updating..." : isBlocked ? "✓ Unblock Product" : "🚫 Block Product"}
                    </button>

                    <button
                      type="button"
                      className="rounded-full border border-border px-3 py-1 text-xs font-semibold hover:bg-surface"
                      onClick={() => {
                        setEditingId(product.id);
                        setForm({
                          name: product.name,
                          price: String(product.price),
                          transportFee: String(product.transportFee ?? 0),
                          image: product.image,
                          imageZoom: String(product.imageZoom ?? 100),
                          description: product.description,
                          featured: product.featured ? "1" : "0",
                          category: product.category,
                          packageName: product.packageName,
                          unitType: product.unitType,
                          unitValue: String(product.unitValue),
                          stockPackages: String(product.stockPackages),
                        });
                      }}
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      className="rounded-full border border-red-200 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                      onClick={() => setDeleteTarget({ id: product.id, name: product.name })}
                    >
                      Delete
                    </button>
                  </div>
                </article>
              );
            });
          })()}
        </div>
      </section>

      {deleteTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-white p-5 shadow-xl">
            <h3 className="text-lg font-bold text-brand-deep">Confirm deletion</h3>
            <p className="mt-2 text-sm text-foreground/75">
              Do you really want to delete <span className="font-semibold">{deleteTarget.name}</span>?
              This action cannot be undone.
            </p>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                autoFocus
                className="rounded-full border border-slate-300 bg-slate-100 px-4 py-1.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-200"
                onClick={() => setDeleteTarget(null)}
                disabled={deletingId === deleteTarget.id}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-full border border-red-300 bg-red-50 px-4 py-1.5 text-sm font-semibold text-red-700 transition-colors hover:bg-red-100 disabled:opacity-60"
                onClick={() => void confirmDeleteProduct()}
                disabled={deletingId === deleteTarget.id}
              >
                {deletingId === deleteTarget.id ? "Deleting..." : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
