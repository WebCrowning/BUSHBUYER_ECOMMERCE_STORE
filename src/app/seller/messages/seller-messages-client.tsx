"use client";

import { useEffect, useState } from "react";
import type { Store } from "@/types/marketplace";
import { Mail, CheckCircle, AlertCircle, Loader2, MessageSquare, X } from "lucide-react";

interface ContactMessage {
  id: number;
  user_id?: number | null;
  customer_email: string;
  message: string;
  reply?: string | null;
  status: string;
  created_at?: string;
}

export default function SellerMessagesClient({ store }: { store: Store }) {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [replyMap, setReplyMap] = useState<Record<number, string>>({});
  const [sendingId, setSendingId] = useState<number | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [loading, setLoading] = useState(true);

  function flash(text: string, ok: boolean) {
    setStatusMsg({ text, ok });
    setTimeout(() => setStatusMsg(null), 4000);
  }

  async function loadMessages() {
    setLoading(true);
    try {
      // Scoped to this store's attributed customers via storeId query param
      const res = await fetch(`/api/seller/messages?storeId=${store.id}`);
      if (res.ok) {
        const payload = await res.json() as { messages: ContactMessage[] };
        setMessages(payload.messages ?? []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadMessages(); }, [store.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function sendReply(id: number) {
    const reply = (replyMap[id] ?? "").trim();
    if (reply.length < 2) {
      flash("Reply must be at least 2 characters.", false);
      return;
    }
    setSendingId(id);
    try {
      const res = await fetch(`/api/admin/messages/${id}/reply`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reply }),
      });
      if (res.ok) {
        flash(`Reply sent for message #${id}.`, true);
        setReplyMap((prev) => ({ ...prev, [id]: "" }));
        await loadMessages();
      } else {
        flash(`Failed to send reply for message #${id}.`, false);
      }
    } finally {
      setSendingId(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50">
            <Mail className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-brand-deep">Customer Messages</h1>
            <p className="mt-0.5 text-xs text-foreground/60">
              Messages from customers attributed to{" "}
              <span className="font-semibold text-foreground/80">{store.name}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Status Banner */}
      {statusMsg && (
        <div
          className={`flex items-center justify-between rounded-xl border px-4 py-2.5 text-xs font-semibold ${
            statusMsg.ok
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          <span className="flex items-center gap-2">
            {statusMsg.ok ? <CheckCircle size={13} /> : <AlertCircle size={13} />}
            {statusMsg.text}
          </span>
          <button type="button" onClick={() => setStatusMsg(null)}>
            <X size={13} className="opacity-60 hover:opacity-100" />
          </button>
        </div>
      )}

      {/* Message List */}
      {loading ? (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-white py-12 text-xs text-foreground/50">
          <Loader2 className="animate-spin" size={18} />
          Loading messages…
        </div>
      ) : messages.length === 0 ? (
        <div className="rounded-2xl border border-border bg-white p-12 text-center">
          <MessageSquare size={36} className="mx-auto mb-2 text-foreground/20" />
          <p className="text-sm font-semibold text-foreground/50">No customer messages yet.</p>
          <p className="mt-1 text-xs text-foreground/40">
            Messages from customers who registered through your store link will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {messages.map((msg) => (
            <article
              key={msg.id}
              className="rounded-2xl border border-border bg-white p-5 shadow-sm space-y-3"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-bold text-brand-deep">Message #{msg.id}</p>
                <div className="flex items-center gap-2">
                  {msg.created_at && (
                    <span className="text-[10px] text-foreground/40">
                      {new Date(msg.created_at).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  )}
                  <span
                    className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold capitalize ${
                      msg.status?.toLowerCase() === "replied"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-amber-200 bg-amber-50 text-amber-700"
                    }`}
                  >
                    {msg.status}
                  </span>
                </div>
              </div>

              <p className="text-xs text-foreground/60">
                From:{" "}
                <span className="font-semibold text-foreground/80">{msg.customer_email}</span>
              </p>

              <div className="rounded-xl border border-border bg-surface-soft p-3">
                <p className="text-xs leading-relaxed text-foreground/80">{msg.message}</p>
              </div>

              {msg.reply && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                    Reply Sent
                  </p>
                  <p className="text-xs text-emerald-800">{msg.reply}</p>
                </div>
              )}

              <div className="space-y-2 pt-1">
                <textarea
                  rows={3}
                  className="w-full rounded-xl border border-border bg-surface-soft px-3 py-2.5 text-xs text-foreground placeholder-foreground/40 focus:border-brand focus:bg-white focus:outline-none"
                  placeholder={msg.reply ? "Send a follow-up reply…" : "Type your reply here…"}
                  value={replyMap[msg.id] ?? ""}
                  onChange={(e) =>
                    setReplyMap((prev) => ({ ...prev, [msg.id]: e.target.value }))
                  }
                />
                <button
                  type="button"
                  onClick={() => void sendReply(msg.id)}
                  disabled={sendingId === msg.id || !(replyMap[msg.id] ?? "").trim()}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
                >
                  {sendingId === msg.id ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <Mail size={12} />
                  )}
                  {sendingId === msg.id ? "Sending…" : "Send Reply"}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
