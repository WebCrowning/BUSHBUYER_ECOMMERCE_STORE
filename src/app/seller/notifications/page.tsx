"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Trash2, Check, X, Archive, Bell, RefreshCw } from "lucide-react";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import SellerNavbar from "@/components/seller-navbar";

export const dynamic = "force-dynamic";

type Notification = {
  id: number;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  isRead: boolean;
  createdAt: string;
};

type NotificationResponse = {
  notifications: Notification[];
  unreadCount: number;
};

const typeColors: Record<string, string> = {
  order: "bg-blue-100 text-blue-700 border-blue-200",
  message: "bg-purple-100 text-purple-700 border-purple-200",
  payment: "bg-emerald-100 text-emerald-700 border-emerald-200",
  chat: "bg-indigo-100 text-indigo-700 border-indigo-200",
  product: "bg-amber-100 text-amber-700 border-amber-200",
  system: "bg-slate-100 text-slate-700 border-slate-200",
  general: "bg-brand/10 text-brand border-brand/20",
  escalation: "bg-red-100 text-red-700 border-red-200",
};

function getActionLabel(notification: Notification): string {
  if (!notification.link) return "Open";
  if (notification.link.includes("/seller/orders")) return "View Order";
  if (notification.link.includes("/seller/messages")) return "View Message";
  if (notification.link.includes("/seller/chat")) return "Open Chat";
  return "Open";
}

export default function SellerNotificationsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [interacting, setInteracting] = useState(false);
  const [filter, setFilter] = useState<"all" | "unread" | "read">("all");
  const [unreadCount, setUnreadCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/signin?callbackUrl=/seller/notifications");
    }
  }, [status, router]);

  async function fetchNotifications(options?: { silent?: boolean }) {
    const silent = options?.silent ?? false;
    if (!silent) setLoading(true);
    try {
      const response = await fetch("/api/notifications", { cache: "no-store" });
      if (!response.ok) return;
      const data = (await response.json()) as NotificationResponse;
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch (error) {
      console.error("Failed to fetch notifications", error);
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => {
    void fetchNotifications();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (
        document.visibilityState !== "visible" ||
        interacting ||
        submitting ||
        selectedIds.size > 0
      ) {
        return;
      }
      void fetchNotifications({ silent: true });
    }, 20000);
    return () => clearInterval(interval);
  }, [interacting, selectedIds.size, submitting]);

  async function manualRefresh() {
    setRefreshing(true);
    await fetchNotifications({ silent: true });
    setRefreshing(false);
  }

  async function toggleRead(id: number, isRead: boolean) {
    await fetch("/api/notifications/read", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(isRead ? { notificationId: id, unmark: true } : { notificationId: id }),
    });
    await fetchNotifications({ silent: true });
  }

  async function deleteNotifications(ids: number[]) {
    setSubmitting(true);
    try {
      await fetch("/api/notifications/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationIds: ids }),
      });
      setSelectedIds(new Set());
      await fetchNotifications({ silent: true });
    } finally {
      setSubmitting(false);
    }
  }

  async function markAllRead() {
    setSubmitting(true);
    try {
      await fetch("/api/notifications/read", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAll: true }),
      });
      setSelectedIds(new Set());
      await fetchNotifications({ silent: true });
    } finally {
      setSubmitting(false);
    }
  }

  async function clearAll() {
    if (!confirm("Are you sure you want to clear all notifications? This cannot be undone.")) return;
    setSubmitting(true);
    try {
      await fetch("/api/notifications/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clearAll: true }),
      });
      setSelectedIds(new Set());
      await fetchNotifications({ silent: true });
    } finally {
      setSubmitting(false);
    }
  }

  const filtered = notifications.filter((n) => {
    if (filter === "unread") return !n.isRead;
    if (filter === "read") return n.isRead;
    return true;
  });

  const allSelected = filtered.length > 0 && filtered.every((n) => selectedIds.has(n.id));

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((n) => n.id)));
    }
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-surface-soft text-foreground flex flex-col">
        <SiteHeader />
        <main className="container-shell py-8 flex-1 flex items-center justify-center">
          <p className="text-foreground/60">Loading notifications&hellip;</p>
        </main>
        <SiteFooter />
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="min-h-screen bg-surface-soft text-foreground flex flex-col">
      <SiteHeader />

      <main className="container-shell py-8 flex-1">
        <div className="grid gap-8 lg:grid-cols-[280px_1fr] lg:items-start">
          {/* Sidebar */}
          <SellerNavbar />

          {/* Content */}
          <div className="space-y-6">
            {/* Page Header */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand">
                  <Bell size={20} />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-brand-deep">Notifications</h1>
                  <p className="text-sm text-foreground/60">
                    {unreadCount > 0
                      ? `${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}`
                      : "All caught up!"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => void manualRefresh()}
                disabled={refreshing}
                className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground/70 hover:bg-surface transition-colors disabled:opacity-50"
              >
                <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
                Refresh
              </button>
            </div>

            {/* Filter & Action Bar */}
            <div className="rounded-2xl border border-border bg-surface-soft p-4">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                {/* Filter Tabs */}
                <div className="flex flex-wrap items-center gap-2">
                  {(["all", "unread", "read"] as const).map((tab) => {
                    const count =
                      tab === "all"
                        ? notifications.length
                        : tab === "unread"
                        ? unreadCount
                        : notifications.length - unreadCount;
                    return (
                      <button
                        key={tab}
                        onClick={() => setFilter(tab)}
                        className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all capitalize ${
                          filter === tab
                            ? "bg-brand text-white shadow-sm"
                            : "border border-border bg-surface hover:bg-surface-soft"
                        }`}
                      >
                        {tab} ({count})
                      </button>
                    );
                  })}
                </div>

                {/* Bulk Actions */}
                <div className="flex gap-2 flex-wrap">
                  {unreadCount > 0 && (
                    <button
                      onClick={() => void markAllRead()}
                      disabled={submitting}
                      className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold border border-brand text-brand hover:bg-brand/5 disabled:opacity-50 transition-colors"
                    >
                      <Check size={14} />
                      Mark all read
                    </button>
                  )}
                  {notifications.length > 0 && (
                    <button
                      onClick={() => void clearAll()}
                      disabled={submitting}
                      className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold border border-red-300 text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
                    >
                      <Trash2 size={14} />
                      Clear all
                    </button>
                  )}
                </div>
              </div>

              {/* Select All */}
              {filtered.length > 0 && (
                <div className="mt-3 pt-3 border-t border-border flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="select-all-notifs"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                    className="rounded"
                  />
                  <label
                    htmlFor="select-all-notifs"
                    className="text-sm text-foreground/70 cursor-pointer select-none"
                  >
                    Select all {filtered.length} notification{filtered.length === 1 ? "" : "s"}
                  </label>
                </div>
              )}
            </div>

            {/* Notification List */}
            {loading ? (
              <div className="rounded-2xl border border-border bg-surface p-12 text-center text-foreground/70">
                <RefreshCw size={24} className="mx-auto mb-3 animate-spin text-brand/50" />
                Loading notifications&hellip;
              </div>
            ) : filtered.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-surface p-12 text-center">
                <Archive size={40} className="mx-auto mb-3 text-foreground/30" />
                <p className="font-semibold text-foreground/60">
                  {filter === "unread" && "No unread notifications"}
                  {filter === "read" && "No read notifications"}
                  {filter === "all" && "No notifications yet"}
                </p>
                <p className="mt-1 text-sm text-foreground/40">
                  Order updates, messages, and store alerts will appear here.
                </p>
              </div>
            ) : (
              <div
                className="space-y-3"
                onMouseEnter={() => setInteracting(true)}
                onMouseLeave={() => setInteracting(false)}
                onFocusCapture={() => setInteracting(true)}
                onBlurCapture={() => setInteracting(false)}
              >
                {filtered.map((notification) => {
                  const isSelected = selectedIds.has(notification.id);
                  const typeColor = typeColors[notification.type] ?? typeColors.general;
                  const createdDate = new Date(notification.createdAt);
                  const isRecent = Date.now() - createdDate.getTime() < 86400000;

                  return (
                    <div
                      key={notification.id}
                      className={`rounded-xl border-2 p-4 transition-all ${
                        isSelected
                          ? "border-brand bg-brand/5"
                          : notification.isRead
                          ? "border-border bg-surface hover:border-brand/30"
                          : "border-brand/40 bg-brand/5 hover:border-brand/60"
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            const newSet = new Set(selectedIds);
                            if (e.target.checked) {
                              newSet.add(notification.id);
                            } else {
                              newSet.delete(notification.id);
                            }
                            setSelectedIds(newSet);
                          }}
                          className="mt-1.5 rounded"
                        />

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold border capitalize ${typeColor}`}
                            >
                              {notification.type}
                            </span>
                            {!notification.isRead && (
                              <span className="inline-block w-2 h-2 rounded-full bg-brand" />
                            )}
                            {isRecent && (
                              <span className="text-xs text-brand font-bold">NEW</span>
                            )}
                          </div>

                          <h3 className="text-sm font-bold text-foreground mt-2">
                            {notification.title}
                          </h3>

                          {notification.body && (
                            <p className="text-sm text-foreground/70 mt-1 line-clamp-2">
                              {notification.body}
                            </p>
                          )}

                          <div className="flex items-center gap-4 mt-2 text-xs text-foreground/50">
                            <span>{createdDate.toLocaleString()}</span>
                            {notification.link && (
                              <Link
                                href={notification.link}
                                className="text-brand font-semibold hover:text-brand-deep"
                              >
                                {getActionLabel(notification)}
                              </Link>
                            )}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => void toggleRead(notification.id, notification.isRead)}
                            className="p-2 rounded-full hover:bg-surface border border-border transition-colors"
                            title={notification.isRead ? "Mark as unread" : "Mark as read"}
                          >
                            {notification.isRead ? (
                              <X size={15} className="text-amber-600" />
                            ) : (
                              <Check size={15} className="text-emerald-600" />
                            )}
                          </button>
                          <button
                            onClick={() => void deleteNotifications([notification.id])}
                            disabled={submitting}
                            className="p-2 rounded-full hover:bg-red-50 border border-border transition-colors disabled:opacity-50"
                            title="Delete"
                          >
                            <Trash2 size={15} className="text-red-500" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Sticky Bulk Action Bar */}
            {selectedIds.size > 0 && (
              <div className="sticky bottom-4 mx-auto max-w-xl rounded-2xl border border-border bg-white shadow-xl p-4 flex items-center justify-between gap-4 z-10">
                <p className="text-sm font-semibold text-foreground">
                  {selectedIds.size} selected
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => void markAllRead()}
                    disabled={submitting}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border border-brand text-brand hover:bg-brand/5 disabled:opacity-50 transition-colors"
                  >
                    <Check size={14} />
                    Mark read
                  </button>
                  <button
                    onClick={() => void deleteNotifications(Array.from(selectedIds))}
                    disabled={submitting}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border border-red-300 text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
                  >
                    <Trash2 size={14} />
                    Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
