"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import type { Store } from "@/types/marketplace";
import { Loader, MessageSquare, UserCheck, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

interface Conversation {
  id: number;
  customer_id: number;
  customer_name: string;
  customer_email: string;
  assigned_admin_id: number | null;
  admin_name?: string;
  status: string;
  message_count: number;
  created_at: string;
  updated_at: string;
}

interface ChatMessage {
  id: string;
  sender_id: number;
  sender_type: "customer" | "admin" | "bot";
  sender_name: string;
  message: string;
  created_at: string;
}

function SellerChatInner({ store }: { store: Store }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<"open" | "taken" | "all">("open");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<{ pages: number; total: number } | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [taking, setTaking] = useState(false);
  const [closing, setClosing] = useState(false);
  const targetConvId = Number(searchParams.get("conversationId") ?? 0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchConversations();
  }, [status, page]);

  useEffect(() => {
    if (selectedConv?.id) {
      const interval = setInterval(() => {
        void fetchMessages(selectedConv.id);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [selectedConv?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function fetchConversations() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin-chat/admin-conversations?status=${status}&page=${page}&limit=20`);
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations ?? []);
        setPagination(data.pagination ?? null);
      }
    } finally {
      setLoading(false);
    }
  }

  async function fetchMessages(convId: number) {
    try {
      const res = await fetch(`/api/admin-chat/conversations/${convId}/messages`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages ?? []);
      }
    } catch { /* ignore */ }
  }

  function openConversation(conv: Conversation) {
    setSelectedConv(conv);
    void fetchMessages(conv.id);
    router.replace(`/seller/chat?conversationId=${conv.id}`);
  }

  async function handleTakeConversation() {
    if (!selectedConv?.id) return;
    setTaking(true);
    try {
      await fetch(`/api/admin-chat/conversations/${selectedConv.id}/take`, { method: "POST" });
      await fetchConversations();
      setSelectedConv((prev) => prev ? { ...prev, status: "taken" } : prev);
    } finally {
      setTaking(false);
    }
  }

  async function handleCloseConversation() {
    if (!selectedConv?.id || !confirm("Close this conversation?")) return;
    setClosing(true);
    try {
      await fetch(`/api/admin-chat/conversations/${selectedConv.id}/close`, { method: "POST" });
      setSelectedConv(null);
      setMessages([]);
      await fetchConversations();
    } finally {
      setClosing(false);
    }
  }

  async function handleSendMessage() {
    if (!input.trim() || !selectedConv?.id) return;
    setSending(true);
    try {
      await fetch(`/api/admin-chat/conversations/${selectedConv.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input }),
      });
      setInput("");
      await fetchMessages(selectedConv.id);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-white shadow-sm overflow-hidden" style={{ height: "calc(100vh - 160px)", minHeight: "500px" }}>
      <div className="flex h-full">
        {/* Conversations List */}
        <div className="w-80 border-r border-border flex flex-col shrink-0">
          <div className="p-4 border-b border-border space-y-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-emerald-600" />
              <h2 className="text-sm font-bold text-brand-deep">Live Chat</h2>
            </div>
            <div className="flex gap-1.5">
              {(["open", "taken", "all"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => { setStatus(s); setPage(1); }}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all capitalize ${
                    status === s ? "bg-brand text-brand-deep" : "bg-surface text-foreground/70 hover:bg-surface-soft"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center p-6">
                <Loader className="animate-spin text-foreground/60" size={24} />
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-6 text-center text-xs text-foreground/50">No conversations found.</div>
            ) : (
              conversations.map((conv) => (
                <button
                  key={conv.id}
                  type="button"
                  onClick={() => openConversation(conv)}
                  className={`w-full p-4 border-b border-border/60 text-left hover:bg-surface transition-colors ${
                    selectedConv?.id === conv.id ? "bg-surface" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-brand-deep truncate">{conv.customer_name}</p>
                      <p className="text-xs text-foreground/60 truncate">{conv.customer_email}</p>
                      <p className="text-[11px] text-foreground/50 mt-0.5">{conv.message_count} messages</p>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      conv.status === "open" ? "bg-amber-50 text-amber-600 border border-amber-200"
                        : conv.status === "taken" ? "bg-sky-50 text-sky-600 border border-sky-500/30"
                        : "bg-slate-700 text-foreground/60 border border-slate-600"
                    }`}>
                      {conv.status}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>

          {pagination && pagination.pages > 1 && (
            <div className="p-3 border-t border-border flex gap-2 justify-center">
              <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="px-3 py-1 rounded-lg bg-surface text-foreground/70 text-xs disabled:opacity-50">Prev</button>
              <span className="px-2 py-1 text-xs text-foreground/60">{page}/{pagination.pages}</span>
              <button onClick={() => setPage(Math.min(pagination.pages, page + 1))} disabled={page >= pagination.pages} className="px-3 py-1 rounded-lg bg-surface text-foreground/70 text-xs disabled:opacity-50">Next</button>
            </div>
          )}
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {selectedConv ? (
            <>
              <div className="p-4 border-b border-border flex items-center justify-between bg-white">
                <div>
                  <h3 className="text-sm font-bold text-brand-deep">{selectedConv.customer_name}</h3>
                  <p className="text-xs text-foreground/60">{selectedConv.customer_email}</p>
                </div>
                <div className="flex gap-2">
                  {selectedConv.status === "open" && (
                    <button onClick={handleTakeConversation} disabled={taking}
                      className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-brand-deep rounded-xl text-xs font-bold flex items-center gap-1.5 disabled:opacity-50">
                      {taking ? <Loader size={12} className="animate-spin" /> : <UserCheck size={12} />}
                      {taking ? "Taking..." : "Take Chat"}
                    </button>
                  )}
                  {selectedConv.status === "taken" && (
                    <button onClick={handleCloseConversation} disabled={closing}
                      className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-brand-deep rounded-xl text-xs font-bold flex items-center gap-1.5 disabled:opacity-50">
                      {closing ? <Loader size={12} className="animate-spin" /> : <X size={12} />}
                      {closing ? "Closing..." : "Close Chat"}
                    </button>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-surface-soft/50">
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.sender_type === "customer" ? "justify-start" : "justify-end"}`}>
                    <div className={`max-w-xs px-4 py-2.5 rounded-2xl text-xs ${
                      msg.sender_type === "customer"
                        ? "bg-surface border border-border text-foreground/80 rounded-bl-sm"
                        : msg.sender_type === "admin"
                        ? "bg-brand text-brand-deep rounded-br-sm"
                        : "bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-br-sm"
                    }`}>
                      <p className={`text-[10px] font-bold mb-1 ${
                        msg.sender_type === "customer" ? "text-foreground/60"
                          : msg.sender_type === "admin" ? "text-brand-deep/70"
                          : "text-emerald-600"
                      }`}>
                        {msg.sender_type === "customer" ? msg.sender_name : msg.sender_type === "admin" ? "You" : "AI Assistant"}
                      </p>
                      <p>{msg.message}</p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              <div className="p-4 border-t border-border bg-white">
                {selectedConv.status === "closed" ? (
                  <div className="text-center text-xs text-foreground/50">This chat is closed.</div>
                ) : selectedConv.status === "open" ? (
                  <div className="text-center text-xs text-foreground/50">Take this chat to start responding.</div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyPress={(e) => { if (e.key === "Enter") void handleSendMessage(); }}
                      placeholder="Type a message..."
                      className="flex-1 rounded-xl border border-border bg-surface px-4 py-2 text-xs text-brand-deep placeholder-foreground/40 focus:border-brand focus:outline-none"
                      disabled={sending}
                    />
                    <button
                      onClick={() => void handleSendMessage()}
                      disabled={sending || !input.trim()}
                      className="rounded-xl bg-brand hover:bg-brand-deep text-brand-deep px-4 py-2 text-xs font-bold disabled:opacity-50"
                    >
                      {sending ? "..." : "Send"}
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-foreground/50">
                <MessageSquare size={36} className="mx-auto mb-2 text-foreground/40" />
                <p className="text-sm font-medium">Select a conversation to start chatting</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SellerChatClient({ store }: { store: Store }) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-emerald-600" />
          <h1 className="text-xl font-extrabold text-brand-deep">Live Chat — {store.name}</h1>
        </div>
        <p className="mt-1 text-xs text-foreground/60">Manage real-time customer chat conversations for your store.</p>
      </div>
      <Suspense fallback={<div className="text-foreground/60 text-sm p-6 text-center">Loading chat...</div>}>
        <SellerChatInner store={store} />
      </Suspense>
    </div>
  );
}
