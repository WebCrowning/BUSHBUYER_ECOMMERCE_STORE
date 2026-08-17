"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Tag, Plus, Edit2, Trash2, RefreshCw, Check, X,
  Loader2, GripVertical, Eye, EyeOff, Info,
} from "lucide-react";

interface Category {
  id: number;
  name: string;
  slug: string;
  icon: string | null;
  description: string | null;
  color: string;
  sort_order: number;
  is_active: number;
  product_count?: number;
  created_at: string;
  updated_at: string;
}

const PRESET_COLORS = [
  "#6B7280","#10B981","#3B82F6","#EC4899","#8B5CF6",
  "#F59E0B","#EF4444","#06B6D4","#22C55E","#0EA5E9",
  "#DC2626","#16A34A","#7C3AED","#9333EA","#F97316",
];

const PRESET_ICONS = [
  "📦","🛒","💻","👗","💊","🏠","⚽","📚","🚗","🌿",
  "🦞","🥩","🥦","⬇️","🛠️","💎","🎮","🎵","✈️","🧴",
  "🔧","📱","🏋️","🎨","🌸","🍕","☕","🧸","💼","🔬",
];

function ColorDot({ color, size = 16 }: { color: string; size?: number }) {
  return (
    <span
      className="inline-block rounded-full border border-white/40 shadow-sm"
      style={{ width: size, height: size, backgroundColor: color, flexShrink: 0 }}
    />
  );
}

function CategoryForm({
  initial,
  onSave,
  onCancel,
  saving,
}: {
  initial?: Partial<Category>;
  onSave: (data: Omit<Category, "id" | "product_count" | "created_at" | "updated_at">) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [icon, setIcon] = useState(initial?.icon ?? "📦");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [color, setColor] = useState(initial?.color ?? "#6B7280");
  const [sortOrder, setSortOrder] = useState(initial?.sort_order ?? 0);
  const [isActive, setIsActive] = useState(initial?.is_active !== 0);
  const [customColor, setCustomColor] = useState(initial?.color ?? "#6B7280");
  const [slugEdited, setSlugEdited] = useState(!!initial?.slug);

  // Auto-generate slug from name
  useEffect(() => {
    if (!slugEdited && name) {
      setSlug(name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
    }
  }, [name, slugEdited]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({ name: name.trim(), slug: slug.trim(), icon, description: description.trim() || null, color, sort_order: sortOrder, is_active: isActive ? 1 : 0 });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-gray-500">Name *</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
            placeholder="e.g. Electronics" />
        </div>
        <div>
          <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-gray-500">Slug</label>
          <input value={slug} onChange={(e) => { setSlug(e.target.value); setSlugEdited(true); }}
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-mono focus:border-emerald-500 focus:outline-none"
            placeholder="auto-generated" />
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-gray-500">Description</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2}
          className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
          placeholder="Brief description of what this category contains" />
      </div>

      {/* Icon picker */}
      <div>
        <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-gray-500">
          Icon <span className="text-2xl ml-1">{icon}</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {PRESET_ICONS.map((ic) => (
            <button key={ic} type="button" onClick={() => setIcon(ic)}
              className={`rounded-lg p-1.5 text-xl transition-all ${icon === ic ? "bg-emerald-100 ring-2 ring-emerald-400" : "hover:bg-gray-100"}`}>
              {ic}
            </button>
          ))}
          <input type="text" value={icon} onChange={(e) => setIcon(e.target.value)}
            maxLength={4} placeholder="✏️"
            className="w-16 rounded-lg border border-gray-200 px-2 py-1 text-center text-sm focus:outline-none" />
        </div>
      </div>

      {/* Color picker */}
      <div>
        <label className="mb-1.5 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-gray-500">
          Color <ColorDot color={color} size={14} />
        </label>
        <div className="flex flex-wrap items-center gap-2">
          {PRESET_COLORS.map((c) => (
            <button key={c} type="button" onClick={() => { setColor(c); setCustomColor(c); }}
              className={`h-7 w-7 rounded-full border-2 transition-transform hover:scale-110 ${color === c ? "border-gray-900 scale-110" : "border-white shadow-sm"}`}
              style={{ backgroundColor: c }} />
          ))}
          <input type="color" value={customColor}
            onChange={(e) => { setCustomColor(e.target.value); setColor(e.target.value); }}
            className="h-7 w-7 cursor-pointer rounded-full border-0 p-0" title="Custom color" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-gray-500">Sort Order</label>
          <input type="number" min={0} value={sortOrder} onChange={(e) => setSortOrder(parseInt(e.target.value, 10) || 0)}
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none" />
        </div>
        <div className="flex items-end pb-1">
          <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-gray-700">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-emerald-600" />
            Active (visible to users)
          </label>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <button type="button" onClick={onCancel}
          className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-50">
          Cancel
        </button>
        <button type="submit" disabled={saving || !name.trim()}
          className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50">
          {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
          {saving ? "Saving…" : "Save Category"}
        </button>
      </div>
    </form>
  );
}

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  function flash(text: string, ok: boolean) {
    setMsg({ text, ok });
    setTimeout(() => setMsg(null), 4000);
  }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/categories?active=false");
      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories ?? []);
      }
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function handleCreate(data: Omit<Category, "id" | "product_count" | "created_at" | "updated_at">) {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) { flash(json.error ?? "Failed to create", false); return; }
      flash(`Category "${data.name}" created.`, true);
      setCreating(false);
      await load();
    } finally { setSaving(false); }
  }

  async function handleEdit(id: number, data: Omit<Category, "id" | "product_count" | "created_at" | "updated_at">) {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/categories", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...data }),
      });
      const json = await res.json();
      if (!res.ok) { flash(json.error ?? "Failed to update", false); return; }
      flash(`Category "${data.name}" updated.`, true);
      setEditingId(null);
      await load();
    } finally { setSaving(false); }
  }

  async function handleDelete(cat: Category) {
    if (!confirm(`${cat.product_count ? `This category has ${cat.product_count} active product(s). ` : ""}Delete "${cat.name}"?`)) return;
    setDeletingId(cat.id);
    try {
      const res = await fetch(`/api/admin/categories?id=${cat.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) { flash(json.error ?? "Failed to delete", false); return; }
      flash(json.softDeleted ? `"${cat.name}" deactivated (has active products).` : `"${cat.name}" deleted.`, true);
      await load();
    } finally { setDeletingId(null); }
  }

  async function handleToggleActive(cat: Category) {
    const res = await fetch("/api/admin/categories", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...cat, is_active: cat.is_active ? false : true }),
    });
    if (res.ok) { await load(); }
  }

  const activeCount = categories.filter((c) => c.is_active).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 md:text-2xl">Category Management</h1>
          <p className="mt-0.5 text-xs text-gray-500">
            {activeCount} active categories — platform-wide, not food-specific. Used across all stores and products.
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => void load()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-600 hover:bg-gray-50 shadow-sm">
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
          <button type="button" onClick={() => { setCreating(true); setEditingId(null); }}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 shadow-sm">
            <Plus size={13} /> New Category
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="flex items-start gap-2.5 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3">
        <Info size={14} className="mt-0.5 shrink-0 text-sky-500" />
        <p className="text-xs text-sky-800">
          Categories here are available across <strong>all stores and all product types</strong> — not just food.
          Sellers choose a category when listing a product. You can add Electronics, Fashion, Services, or anything else.
        </p>
      </div>

      {/* Status message */}
      {msg && (
        <div className={`flex items-center justify-between rounded-xl border px-4 py-2.5 text-xs font-semibold ${msg.ok ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}`}>
          {msg.text}
          <button type="button" onClick={() => setMsg(null)}><X size={12} className="ml-2" /></button>
        </div>
      )}

      {/* Create form */}
      {creating && (
        <div className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-gray-900">
            <Plus size={15} className="text-emerald-600" /> New Category
          </h2>
          <CategoryForm onSave={handleCreate} onCancel={() => setCreating(false)} saving={saving} />
        </div>
      )}

      {/* Categories table */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-left text-[11px] font-bold uppercase tracking-wider text-gray-500">
              <th className="px-4 py-3">Category</th>
              <th className="px-3 py-3 hidden sm:table-cell">Description</th>
              <th className="px-3 py-3 text-center">Products</th>
              <th className="px-3 py-3 text-center">Status</th>
              <th className="px-3 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}>{Array.from({ length: 5 }).map((__, j) => (
                  <td key={j} className="px-3 py-3"><div className="h-4 animate-pulse rounded bg-gray-100" /></td>
                ))}</tr>
              ))
            ) : categories.length === 0 ? (
              <tr><td colSpan={5} className="py-12 text-center text-gray-400">No categories yet.</td></tr>
            ) : (
              categories.map((cat) => (
                <>
                  <tr key={cat.id} className={`hover:bg-gray-50/60 ${!cat.is_active ? "opacity-50" : ""}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-lg shadow-sm"
                          style={{ backgroundColor: cat.color + "22", border: `1.5px solid ${cat.color}44` }}>
                          {cat.icon ?? "📦"}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">{cat.name}</p>
                          <p className="text-[10px] font-mono text-gray-400">{cat.slug}</p>
                        </div>
                        <ColorDot color={cat.color} size={10} />
                      </div>
                    </td>
                    <td className="hidden px-3 py-3 text-gray-500 max-w-[220px] truncate sm:table-cell">
                      {cat.description ?? "—"}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-bold text-gray-700">
                        {cat.product_count ?? 0}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <button type="button" onClick={() => void handleToggleActive(cat)}
                        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${cat.is_active ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-gray-200 bg-gray-50 text-gray-500"}`}>
                        {cat.is_active ? <><Eye size={10} /> Active</> : <><EyeOff size={10} /> Inactive</>}
                      </button>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button type="button"
                          onClick={() => { setEditingId(editingId === cat.id ? null : cat.id); setCreating(false); }}
                          className="rounded-lg border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-50 hover:text-gray-900">
                          <Edit2 size={13} />
                        </button>
                        <button type="button" onClick={() => void handleDelete(cat)}
                          disabled={deletingId === cat.id}
                          className="rounded-lg border border-gray-200 p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-40">
                          {deletingId === cat.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                  {editingId === cat.id && (
                    <tr key={`edit-${cat.id}`}>
                      <td colSpan={5} className="bg-gray-50/80 px-5 py-4">
                        <p className="mb-3 text-xs font-bold text-gray-700">Edit: {cat.name}</p>
                        <CategoryForm
                          initial={cat}
                          onSave={(data) => void handleEdit(cat.id, data)}
                          onCancel={() => setEditingId(null)}
                          saving={saving}
                        />
                      </td>
                    </tr>
                  )}
                </>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
