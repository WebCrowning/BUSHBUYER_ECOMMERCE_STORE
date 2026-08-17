"use client";

import { useEffect, useState } from "react";
import type { Store } from "@/types/marketplace";
import {
  CircleHelp,
  Plus,
  Trash2,
  Edit2,
  Loader2,
  ChevronDown,
  Globe,
  Store as StoreIcon,
  Info,
  X,
} from "lucide-react";

interface FaqItem {
  id: number;
  question: string;
  answer: string;
  category?: string;
  store_id: number | null;
  is_global: boolean;
  created_at?: string;
  updated_at?: string;
}

interface FaqApiResponse {
  faqs: FaqItem[];
  hasStoreFaqs: boolean;
  storeId: number;
}

export default function SellerFaqClient({ store }: { store: Store }) {
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [hasStoreFaqs, setHasStoreFaqs] = useState(false);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Form state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [category, setCategory] = useState("General");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ text: string; ok: boolean } | null>(null);

  function applyResponse(data: FaqApiResponse) {
    setFaqs(data.faqs ?? []);
    setHasStoreFaqs(data.hasStoreFaqs ?? false);
  }

  function flash(text: string, ok: boolean) {
    setStatusMsg({ text, ok });
    setTimeout(() => setStatusMsg(null), 4000);
  }

  async function loadFaqs() {
    setLoading(true);
    try {
      const res = await fetch("/api/seller/faq");
      if (res.ok) applyResponse(await res.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadFaqs(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function resetForm() {
    setEditingId(null);
    setQuestion("");
    setAnswer("");
    setCategory("General");
  }

  function startEdit(faq: FaqItem) {
    setEditingId(faq.id);
    setQuestion(faq.question);
    setAnswer(faq.answer);
    setCategory(faq.category ?? "General");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSave() {
    if (!question.trim() || !answer.trim()) return;
    setSaving(true);
    try {
      const endpoint = editingId
        ? `/api/seller/faq/${editingId}`
        : "/api/seller/faq";
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, answer, category }),
      });
      const data = await res.json();
      if (res.ok) {
        applyResponse(data);
        flash(editingId ? "FAQ updated successfully." : "FAQ created successfully.", true);
        resetForm();
      } else {
        flash(data.error ?? "Failed to save FAQ.", false);
      }
    } catch {
      flash("Network error. Please try again.", false);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this FAQ item? This cannot be undone.")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/seller/faq/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        applyResponse(data);
        flash("FAQ deleted.", true);
        if (editingId === id) resetForm();
      } else {
        flash(data.error ?? "Failed to delete FAQ.", false);
      }
    } finally {
      setDeletingId(null);
    }
  }

  const isEditing = editingId !== null;

  return (
    <div className="space-y-6">

      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-purple-200 bg-purple-50">
            <CircleHelp className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-brand-deep">Store FAQ</h1>
            <p className="mt-0.5 text-xs text-foreground/60">
              <span className="font-semibold text-foreground/80">{store.name}</span> — create
              custom Q&amp;As for your storefront. When none exist, the platform FAQ is shown as
              a fallback.
            </p>
          </div>
        </div>

        {/* Fallback notice */}
        {!loading && !hasStoreFaqs && (
          <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3">
            <Globe size={14} className="mt-0.5 shrink-0 text-sky-500" />
            <div>
              <p className="text-xs font-bold text-sky-800">Showing global platform FAQ</p>
              <p className="mt-0.5 text-[11px] text-sky-700">
                Your store has no custom FAQ yet. The items below are the platform&apos;s global FAQ
                shown as a preview — they appear on your store page until you add your own. Add
                an item above to create your store&apos;s own FAQ.
              </p>
            </div>
          </div>
        )}

        {!loading && hasStoreFaqs && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5">
            <StoreIcon size={13} className="shrink-0 text-emerald-600" />
            <p className="text-[11px] font-semibold text-emerald-700">
              Your store has <span className="font-extrabold">{faqs.length}</span> custom FAQ
              {faqs.length !== 1 ? "s" : ""} — these are displayed on your storefront instead of
              the global FAQ.
            </p>
          </div>
        )}
      </div>

      {/* ── Status Banner ───────────────────────────────────────────────────── */}
      {statusMsg && (
        <div
          className={`flex items-center justify-between rounded-xl border px-4 py-2.5 text-xs font-semibold ${
            statusMsg.ok
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          <span>{statusMsg.text}</span>
          <button type="button" onClick={() => setStatusMsg(null)} className="ml-3 opacity-60 hover:opacity-100">
            <X size={13} />
          </button>
        </div>
      )}

      {/* ── Add / Edit Form ──────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-border bg-white p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-brand-deep flex items-center gap-2">
            <Plus size={15} className="text-emerald-600" />
            {isEditing ? "Edit FAQ Item" : "Add New FAQ Item"}
          </h2>
          {isEditing && (
            <button
              type="button"
              onClick={resetForm}
              className="text-xs font-bold text-foreground/50 hover:text-foreground flex items-center gap-1"
            >
              <X size={12} /> Cancel editing
            </button>
          )}
        </div>

        <div className="grid gap-4">
          <div>
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-foreground/50">
              Question *
            </label>
            <input
              className="w-full rounded-xl border border-border bg-surface-soft px-4 py-2.5 text-xs text-foreground placeholder-foreground/40 focus:border-brand focus:bg-white focus:outline-none"
              placeholder="e.g. How long does delivery take?"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-foreground/50">
              Answer *
            </label>
            <textarea
              rows={4}
              className="w-full rounded-xl border border-border bg-surface-soft px-4 py-2.5 text-xs text-foreground placeholder-foreground/40 focus:border-brand focus:bg-white focus:outline-none"
              placeholder="Provide a clear and detailed answer..."
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-foreground/50">
              Category
            </label>
            <input
              className="w-full rounded-xl border border-border bg-surface-soft px-4 py-2.5 text-xs text-foreground placeholder-foreground/40 focus:border-brand focus:bg-white focus:outline-none"
              placeholder="e.g. Delivery, Returns, Products..."
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            />
          </div>
        </div>

        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving || !question.trim() || !answer.trim()}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:opacity-50"
          >
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
            {saving ? "Saving…" : isEditing ? "Update FAQ" : "Add FAQ"}
          </button>
          {isEditing && (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-xl border border-border bg-surface-soft px-4 py-2.5 text-xs font-bold text-foreground/70 transition-colors hover:bg-surface"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* ── FAQ List ─────────────────────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <div className="flex items-center gap-2">
            {hasStoreFaqs ? (
              <StoreIcon size={15} className="text-emerald-600" />
            ) : (
              <Globe size={15} className="text-sky-500" />
            )}
            <h2 className="text-sm font-bold text-brand-deep">
              {hasStoreFaqs ? "Your Store FAQ" : "Global FAQ (Fallback Preview)"}
            </h2>
          </div>
          <span className="text-[11px] font-medium text-foreground/50">
            {faqs.length} item{faqs.length !== 1 ? "s" : ""}
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-xs text-foreground/50">
            <Loader2 size={16} className="animate-spin" />
            Loading FAQ items…
          </div>
        ) : faqs.length === 0 ? (
          <div className="py-12 text-center">
            <CircleHelp size={32} className="mx-auto mb-2 text-foreground/20" />
            <p className="text-sm font-semibold text-foreground/50">No FAQ items yet.</p>
            <p className="mt-1 text-xs text-foreground/40">Add your first question above.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {faqs.map((faq) => (
              <div key={faq.id}>
                <div className="flex items-center gap-3 px-5 py-3.5">
                  {/* Accordion toggle */}
                  <button
                    type="button"
                    onClick={() => setExpandedId(expandedId === faq.id ? null : faq.id)}
                    className="flex min-w-0 flex-1 items-start gap-3 text-left"
                    aria-expanded={expandedId === faq.id}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-bold text-brand-deep">{faq.question}</p>
                        {faq.is_global && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-bold text-sky-600">
                            <Globe size={9} />
                            Global
                          </span>
                        )}
                      </div>
                      {faq.category && (
                        <span className="mt-0.5 inline-block rounded-md border border-border bg-surface px-2 py-0.5 text-[10px] font-medium text-foreground/60">
                          {faq.category}
                        </span>
                      )}
                    </div>
                    <ChevronDown
                      size={14}
                      className={`mt-0.5 shrink-0 text-foreground/40 transition-transform ${
                        expandedId === faq.id ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {/* Action buttons — only for store-owned FAQs */}
                  {!faq.is_global ? (
                    <div className="flex shrink-0 items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => startEdit(faq)}
                        className="rounded-lg border border-border bg-surface p-1.5 text-foreground/60 transition-colors hover:bg-surface-soft hover:text-brand-deep"
                        title="Edit"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDelete(faq.id)}
                        disabled={deletingId === faq.id}
                        className="rounded-lg border border-border bg-surface p-1.5 text-foreground/60 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                        title="Delete"
                      >
                        {deletingId === faq.id ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : (
                          <Trash2 size={13} />
                        )}
                      </button>
                    </div>
                  ) : (
                    <div
                      className="flex shrink-0 items-center gap-1 rounded-lg border border-sky-100 bg-sky-50 px-2 py-1"
                      title="Global FAQ — read only. Add your own FAQ above to override."
                    >
                      <Info size={11} className="text-sky-400" />
                      <span className="text-[10px] font-semibold text-sky-500">Read only</span>
                    </div>
                  )}
                </div>

                {expandedId === faq.id && (
                  <div className="border-t border-border bg-surface-soft/40 px-5 pb-4 pt-3">
                    <p className="text-xs leading-relaxed text-foreground/70">{faq.answer}</p>
                    {faq.updated_at && (
                      <p className="mt-2 text-[10px] text-foreground/40">
                        Last updated {new Date(faq.updated_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
