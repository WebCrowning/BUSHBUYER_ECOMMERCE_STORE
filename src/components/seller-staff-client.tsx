"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Users,
  UserPlus,
  Trash2,
  RefreshCw,
  ShieldCheck,
  User,
  Search,
  Share2,
  UserCheck,
  Loader2,
  Store,
  ArrowUpRight,
  CalendarDays,
  Tag,
  Ban,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";

interface StoreStaff {
  id: number;
  store_id: number;
  user_id: number;
  store_role: string;
  status: string;
  user_name?: string;
  user_email?: string;
  user_image?: string;
}

interface RegisteredUser {
  id: number;
  name: string;
  email: string;
  image?: string | null;
  role: string;
  created_at?: string;
}

const STORE_ROLES = [
  { value: "store_manager", label: "Store Manager" },
  { value: "inventory_officer", label: "Inventory Officer" },
  { value: "sales_staff", label: "Sales Staff" },
  { value: "customer_support", label: "Customer Support" },
  { value: "accountant", label: "Accountant" },
];

const ROLE_COLORS: Record<string, string> = {
  store_owner: "bg-amber-50 border-amber-200 text-amber-700",
  store_manager: "bg-sky-50 border-sky-200 text-sky-700",
  inventory_officer: "bg-teal-50 border-teal-200 text-teal-700",
  sales_staff: "bg-purple-50 border-purple-200 text-purple-700",
  customer_support: "bg-rose-50 border-rose-200 text-rose-700",
  accountant: "bg-orange-50 border-orange-200 text-orange-700",
};

function RoleBadge({ role }: { role: string }) {
  const color = ROLE_COLORS[role] ?? "bg-gray-50 border-gray-200 text-gray-700";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold capitalize ${color}`}
    >
      <ShieldCheck size={10} />
      {role.replace(/_/g, " ")}
    </span>
  );
}

export default function SellerStaffClient({
  storeId,
  storeName,
  canAssign = false,
}: {
  storeId: number;
  storeName: string;
  canAssign?: boolean;
}) {
  const [staff, setStaff] = useState<StoreStaff[]>([]);
  const [attributedUsers, setAttributedUsers] = useState<RegisteredUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"staff" | "customers">("staff");

  // User search / picker
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<RegisteredUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<RegisteredUser | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedRole, setSelectedRole] = useState("store_manager");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // ── Fetch staff + attributed users ────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/stores/${storeId}/users`);
      if (res.ok) {
        const data = await res.json();
        setStaff(data.staff ?? []);
        setAttributedUsers(data.attributedUsers ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  // ── Debounced user search ──────────────────────────────────────────────────
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `/api/admin/users?query=${encodeURIComponent(searchQuery)}&limit=10`
        );
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data.users ?? []);
        }
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // ── Assign staff ──────────────────────────────────────────────────────────
  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    if (!selectedUser) {
      setError("Please search and select a registered user first.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/stores/${storeId}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selectedUser.id, storeRole: selectedRole }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to assign staff member.");
      } else {
        setStaff(data.staff ?? []);
        if (data.attributedUsers) setAttributedUsers(data.attributedUsers);
        setSuccessMsg(
          `${selectedUser.name} has been assigned as ${selectedRole.replace(/_/g, " ")}.`
        );
        setSelectedUser(null);
        setSearchQuery("");
        setActiveTab("staff");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // ── Remove staff ──────────────────────────────────────────────────────────
  const handleRemoveStaff = async (userId: number, userName?: string) => {
    if (
      !confirm(
        `Remove ${userName ?? "this member"} from your store? They will lose store access.`
      )
    )
      return;
    try {
      const res = await fetch(`/api/admin/stores/${storeId}/users?userId=${userId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        const data = await res.json();
        setStaff(data.staff ?? []);
        if (data.attributedUsers) setAttributedUsers(data.attributedUsers);
      }
    } catch {
      // silent
    }
  };

  // ── Block / unblock staff ─────────────────────────────────────────────────
  const handleToggleBlock = async (userId: number, currentStatus: string, userName?: string) => {
    const nextStatus = currentStatus === "suspended" ? "active" : "suspended";
    const action = nextStatus === "suspended" ? "suspend" : "reactivate";
    if (
      !confirm(
        `${action === "suspend" ? "Suspend" : "Reactivate"} ${userName ?? "this member"}? ${
          action === "suspend"
            ? "They will immediately lose access to your store."
            : "They will regain store access."
        }`
      )
    )
      return;
    try {
      const res = await fetch(`/api/admin/stores/${storeId}/users`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, status: nextStatus }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to update staff status.");
      } else {
        setStaff(data.staff ?? []);
        if (data.attributedUsers) setAttributedUsers(data.attributedUsers);
        setSuccessMsg(
          `${userName ?? "Member"} has been ${nextStatus === "suspended" ? "suspended" : "reactivated"}.`
        );
      }
    } catch {
      setError("Network error. Please try again.");
    }
  };

  // ── Skeleton rows ─────────────────────────────────────────────────────────
  const SkeletonRows = ({ cols, rows = 3 }: { cols: number; rows?: number }) => (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i}>
          {Array.from({ length: cols }).map((__, j) => (
            <td key={j} className="px-4 py-3">
              <div className="h-4 animate-pulse rounded-lg bg-border" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );

  return (
    <div className="space-y-6">
      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-purple-200 bg-purple-50 text-purple-600">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-brand-deep md:text-2xl">
                Staff &amp; Users
              </h1>
              <p className="mt-0.5 text-xs text-foreground/60">
                <span className="font-semibold text-foreground/80">{storeName}</span> — manage your
                team and view customers acquired through your store links.
              </p>
            </div>
          </div>
          <button
            onClick={() => void fetchData()}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-3.5 py-2 text-xs font-bold text-foreground/70 shadow-sm transition-colors hover:bg-surface-soft"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        {/* ── Stats bar ─────────────────────────────────────────────────────── */}
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-border bg-surface-soft px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-foreground/50">
              Team Members
            </p>
            <p className="mt-1 text-xl font-extrabold text-brand-deep">{staff.length}</p>
          </div>
          <div className="rounded-xl border border-border bg-surface-soft px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-foreground/50">
              Referred Customers
            </p>
            <p className="mt-1 text-xl font-extrabold text-brand-deep">{attributedUsers.length}</p>
          </div>
          <div className="col-span-2 flex items-center gap-2 rounded-xl border border-border bg-surface-soft px-4 py-3 sm:col-span-1">
            <Store size={14} className="shrink-0 text-emerald-600" />
            <p className="truncate text-xs font-semibold text-foreground/70">
              Store ID: <span className="font-extrabold text-brand-deep">#{storeId}</span>
            </p>
          </div>
        </div>
      </div>

      {/* ── Assign Staff Form (admin only) ───────────────────────────────────── */}
      {canAssign && (
      <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <UserPlus size={17} className="text-emerald-600" />
          <h2 className="text-sm font-bold text-brand-deep">Assign Team Member</h2>
        </div>

        {error && (
          <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-medium text-red-700">
            {error}
          </div>
        )}
        {successMsg && (
          <div className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-medium text-emerald-700">
            {successMsg}
          </div>
        )}

        <form onSubmit={handleAddStaff} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:items-start">
            {/* User search */}
            <div className="relative md:col-span-2">
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-foreground/50">
                Search &amp; Select User *
              </label>

              {selectedUser ? (
                <div className="flex items-center justify-between rounded-xl border border-emerald-300 bg-emerald-50/60 p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-xs font-extrabold text-white">
                      {selectedUser.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground">{selectedUser.name}</p>
                      <p className="text-[11px] text-foreground/60">
                        {selectedUser.email} · ID #{selectedUser.id}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedUser(null);
                      setSearchQuery("");
                    }}
                    className="rounded-lg px-2.5 py-1 text-xs font-bold text-red-500 hover:bg-red-50 hover:text-red-700"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-foreground/40">
                    {searching ? (
                      <Loader2 size={14} className="animate-spin text-emerald-600" />
                    ) : (
                      <Search size={14} />
                    )}
                  </span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setShowDropdown(true);
                    }}
                    onFocus={() => setShowDropdown(true)}
                    placeholder="Search by name, email or user ID…"
                    className="w-full rounded-xl border border-border bg-surface-soft py-2.5 pl-9 pr-4 text-xs text-foreground placeholder-foreground/40 focus:border-emerald-500 focus:bg-white focus:outline-none"
                  />

                  {showDropdown && searchQuery.trim().length > 0 && (
                    <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-56 overflow-y-auto rounded-xl border border-border bg-white p-1 shadow-lg">
                      {searching ? (
                        <div className="p-3 text-center text-xs text-foreground/50">
                          Searching…
                        </div>
                      ) : searchResults.length === 0 ? (
                        <div className="p-3 text-center text-xs text-foreground/50">
                          No users found for &ldquo;{searchQuery}&rdquo;
                        </div>
                      ) : (
                        searchResults.map((u) => (
                          <button
                            key={u.id}
                            type="button"
                            onClick={() => {
                              setSelectedUser(u);
                              setShowDropdown(false);
                            }}
                            className="flex w-full items-center justify-between rounded-lg p-2 text-left text-xs transition-colors hover:bg-emerald-50"
                          >
                            <div className="flex items-center gap-2.5">
                              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-surface font-bold text-foreground/60 text-xs">
                                {u.name ? u.name.charAt(0).toUpperCase() : "U"}
                              </div>
                              <div>
                                <p className="font-bold text-foreground">{u.name}</p>
                                <p className="text-[10px] text-foreground/50">{u.email}</p>
                              </div>
                            </div>
                            <span className="rounded-md bg-surface px-2 py-0.5 text-[10px] font-medium text-foreground/60">
                              #{u.id}
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Role picker */}
            <div>
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-foreground/50">
                Store Role *
              </label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="w-full rounded-xl border border-border bg-surface-soft px-3 py-2.5 text-xs font-medium text-foreground focus:border-emerald-500 focus:outline-none"
              >
                {STORE_ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving || !selectedUser}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:opacity-50"
            >
              {saving ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <UserCheck size={13} />
              )}
              {saving ? "Assigning…" : "Assign Member"}
            </button>
          </div>
        </form>
      </div>
      )}

      {/* ── Feedback banners (shown when assign form is hidden) ───────────────── */}
      {!canAssign && (error || successMsg) && (
        <div>
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-medium text-red-700">
              {error}
            </div>
          )}
          {successMsg && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-medium text-emerald-700">
              {successMsg}
            </div>
          )}
        </div>
      )}

      {/* ── Tab Switcher ─────────────────────────────────────────────────────── */}
      <div className="flex rounded-2xl border border-border bg-white p-1.5 shadow-sm">
        <button
          onClick={() => setActiveTab("staff")}
          className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition-all ${
            activeTab === "staff"
              ? "bg-brand text-white shadow-sm"
              : "text-foreground/60 hover:text-foreground"
          }`}
        >
          <ShieldCheck size={13} />
          Team Members
          <span
            className={`rounded-full px-1.5 py-0.5 text-[10px] font-extrabold ${
              activeTab === "staff" ? "bg-white/20" : "bg-surface"
            }`}
          >
            {staff.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab("customers")}
          className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition-all ${
            activeTab === "customers"
              ? "bg-brand text-white shadow-sm"
              : "text-foreground/60 hover:text-foreground"
          }`}
        >
          <Share2 size={13} />
          Referred Customers
          <span
            className={`rounded-full px-1.5 py-0.5 text-[10px] font-extrabold ${
              activeTab === "customers" ? "bg-white/20" : "bg-surface"
            }`}
          >
            {attributedUsers.length}
          </span>
        </button>
      </div>

      {/* ── Team Members Table ────────────────────────────────────────────────── */}
      {activeTab === "staff" && (
        <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
            <div className="flex items-center gap-2">
              <ShieldCheck size={15} className="text-sky-600" />
              <h2 className="text-sm font-bold text-brand-deep">
                Assigned Team Members
              </h2>
            </div>
            <span className="text-[11px] font-medium text-foreground/50">
              {staff.length} member{staff.length !== 1 ? "s" : ""}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-surface-soft/60 text-left text-[11px] font-bold uppercase tracking-wider text-foreground/50">
                  <th className="px-5 py-3">Member</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <SkeletonRows cols={5} rows={3} />
                ) : staff.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center">
                      <Users size={32} className="mx-auto mb-2 text-foreground/20" />
                      <p className="font-semibold text-foreground/50">
                        No team members assigned yet.
                      </p>
                      <p className="mt-0.5 text-[11px] text-foreground/40">
                        Use the form above to search for a registered user and assign them a role.
                      </p>
                    </td>
                  </tr>
                ) : (
                  staff.map((member) => (
                    <tr key={member.id} className="transition-colors hover:bg-surface-soft/50">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface font-bold text-foreground/50">
                            <User size={13} />
                          </div>
                          <div>
                            <p className="font-bold text-foreground">
                              {member.user_name ?? `User #${member.user_id}`}
                            </p>
                            <p className="text-[10px] text-foreground/40">ID #{member.user_id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-foreground/70">
                        {member.user_email ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <RoleBadge role={member.store_role} />
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold capitalize ${
                            member.status === "active"
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : member.status === "suspended"
                              ? "border-amber-200 bg-amber-50 text-amber-700"
                              : "border-border bg-surface text-foreground/60"
                          }`}
                        >
                          {member.status === "suspended" && <Ban size={10} />}
                          {member.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {member.store_role !== "store_owner" && (
                          <div className="inline-flex items-center gap-1">
                            {/* Block / Unblock */}
                            <button
                              onClick={() =>
                                handleToggleBlock(
                                  member.user_id,
                                  member.status,
                                  member.user_name
                                )
                              }
                              className={`rounded-lg p-1.5 transition-colors ${
                                member.status === "suspended"
                                  ? "text-emerald-500 hover:bg-emerald-50 hover:text-emerald-700"
                                  : "text-foreground/30 hover:bg-amber-50 hover:text-amber-600"
                              }`}
                              title={
                                member.status === "suspended"
                                  ? "Reactivate member"
                                  : "Suspend member"
                              }
                            >
                              {member.status === "suspended" ? (
                                <CheckCircle2 size={14} />
                              ) : (
                                <Ban size={14} />
                              )}
                            </button>
                            {/* Remove */}
                            <button
                              onClick={() =>
                                handleRemoveStaff(member.user_id, member.user_name)
                              }
                              className="rounded-lg p-1.5 text-foreground/30 transition-colors hover:bg-red-50 hover:text-red-600"
                              title="Remove from store"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Referred Customers Table ──────────────────────────────────────────── */}
      {activeTab === "customers" && (
        <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
            <div className="flex items-center gap-2">
              <Share2 size={15} className="text-purple-600" />
              <h2 className="text-sm font-bold text-brand-deep">Referred Customers</h2>
            </div>
            <span className="text-[11px] font-medium text-foreground/50">
              Registered via your store or product links
            </span>
          </div>

          {/* Info banner */}
          {attributedUsers.length === 0 && !loading && (
            <div className="mx-5 mt-4 flex items-start gap-3 rounded-xl border border-purple-100 bg-purple-50 px-4 py-3">
              <Share2 size={14} className="mt-0.5 shrink-0 text-purple-500" />
              <div>
                <p className="text-xs font-bold text-purple-800">
                  How to get referred customers
                </p>
                <p className="mt-0.5 text-[11px] text-purple-700">
                  Share your store link{" "}
                  <code className="rounded bg-purple-100 px-1 py-0.5 font-mono text-[10px]">
                    ?ref={storeId}
                  </code>{" "}
                  or any product URL. When a visitor signs up through that link, they appear
                  here automatically.
                </p>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-surface-soft/60 text-left text-[11px] font-bold uppercase tracking-wider text-foreground/50">
                  <th className="px-5 py-3">Customer</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays size={11} />
                      Joined
                    </span>
                  </th>
                  <th className="px-4 py-3">
                    <span className="inline-flex items-center gap-1">
                      <Tag size={11} />
                      Role
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <SkeletonRows cols={4} rows={3} />
                ) : attributedUsers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center">
                      <Users size={32} className="mx-auto mb-2 text-foreground/20" />
                      <p className="font-semibold text-foreground/50">
                        No referred customers yet.
                      </p>
                    </td>
                  </tr>
                ) : (
                  attributedUsers.map((user) => (
                    <tr key={user.id} className="transition-colors hover:bg-surface-soft/50">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-purple-100 text-[11px] font-extrabold text-purple-700">
                            {user.name ? user.name.charAt(0).toUpperCase() : "C"}
                          </div>
                          <div>
                            <p className="font-bold text-foreground">{user.name}</p>
                            <p className="text-[10px] text-foreground/40">ID #{user.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-foreground/70">{user.email}</td>
                      <td className="px-4 py-3 text-foreground/60">
                        {user.created_at
                          ? new Date(user.created_at).toLocaleDateString("en-GB", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center rounded-full border border-purple-200 bg-purple-50 px-2 py-0.5 text-[10px] font-bold capitalize text-purple-700">
                          {user.role}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {attributedUsers.length > 0 && (
            <div className="border-t border-border px-5 py-3 text-right">
              <Link
                href="/seller/dashboard"
                className="inline-flex items-center gap-1 text-xs font-bold text-brand hover:underline"
              >
                Back to Dashboard <ArrowUpRight size={12} />
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
