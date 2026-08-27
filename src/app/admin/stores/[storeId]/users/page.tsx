"use client";

import { use, useCallback, useEffect, useState } from "react";
import {
  Users,
  UserPlus,
  Trash2,
  RefreshCw,
  ArrowLeft,
  ShieldCheck,
  User,
  Search,
  Check,
  Share2,
  UserCheck,
  Loader2,
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
  { value: "store_owner", label: "Store Owner" },
  { value: "store_manager", label: "Store Manager" },
  { value: "inventory_officer", label: "Inventory Officer" },
  { value: "sales_staff", label: "Sales Staff" },
  { value: "customer_support", label: "Customer Support" },
  { value: "accountant", label: "Accountant" },
];

export default function AdminStoreUsersPage({
  params,
}: {
  params: Promise<{ storeId: string }>;
}) {
  const { storeId } = use(params);
  const [staff, setStaff] = useState<StoreStaff[]>([]);
  const [attributedUsers, setAttributedUsers] = useState<RegisteredUser[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & User Picker state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<RegisteredUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<RegisteredUser | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);

  // Pre-loaded email dropdown (most recent users)
  const [allUsers, setAllUsers] = useState<RegisteredUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [dropdownFilter, setDropdownFilter] = useState("");
  const [showEmailDropdown, setShowEmailDropdown] = useState(false);

  const [selectedRole, setSelectedRole] = useState("store_manager");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const fetchStaffAndUsers = useCallback(async () => {
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
    void fetchStaffAndUsers();
  }, [fetchStaffAndUsers]);

  // Load recent users for dropdown on mount
  useEffect(() => {
    async function loadAllUsers() {
      setLoadingUsers(true);
      try {
        const res = await fetch("/api/admin/users?limit=200&page=1");
        if (res.ok) {
          const data = await res.json();
          // already ordered by created_at DESC from the API
          setAllUsers(data.users ?? []);
        }
      } catch {
        // non-fatal
      } finally {
        setLoadingUsers(false);
      }
    }
    void loadAllUsers();
  }, []);

  // Debounced search query fetch
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/admin/users?query=${encodeURIComponent(searchQuery)}&limit=15`);
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
        setError(data.error ?? "Failed to assign staff");
      } else {
        setStaff(data.staff ?? []);
        if (data.attributedUsers) setAttributedUsers(data.attributedUsers);
        setSuccessMsg(`Successfully assigned ${selectedUser.name} as ${selectedRole.replace(/_/g, " ")}.`);
        setSelectedUser(null);
        setSearchQuery("");
      }
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveStaff = async (userId: number) => {
    if (!confirm("Are you sure you want to remove this staff member from the store?")) return;
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
      // Ignore
    }
  };

  return (
    <div className="space-y-6">
      {/* Back Button & Header */}
      <div>
        <Link
          href="/admin/stores"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-gray-900 mb-2"
        >
          <ArrowLeft size={14} /> Back to Stores
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900 md:text-2xl">Store Staff & User Management</h1>
            <p className="mt-0.5 text-xs text-gray-500">
              Assign staff, configure store roles, and manage users attributed to Store #{storeId}.
            </p>
          </div>
          <button
            onClick={() => void fetchStaffAndUsers()}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 shadow-sm"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>
      </div>

      {/* Add Staff Form with Registered User Search */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <UserPlus size={18} className="text-emerald-600" />
          <h2 className="font-bold text-gray-900 text-sm">Assign Registered User to Store</h2>
        </div>

        {error && (
          <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs text-red-700 font-medium">
            {error}
          </div>
        )}

        {successMsg && (
          <div className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs text-emerald-700 font-medium">
            {successMsg}
          </div>
        )}

        <form onSubmit={handleAddStaff} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
            {/* User Selection — Email Dropdown + Search */}
            <div className="relative md:col-span-2 space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wide text-gray-500">
                Select / Search Registered User *
              </label>

              {selectedUser ? (
                <div className="flex items-center justify-between rounded-xl border border-emerald-300 bg-emerald-50/60 p-2.5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white font-bold text-xs">
                      {selectedUser.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-900">{selectedUser.name}</p>
                      <p className="text-[11px] text-gray-500">{selectedUser.email} · ID #{selectedUser.id}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setSelectedUser(null); setSearchQuery(""); setDropdownFilter(""); }}
                    className="ml-3 shrink-0 text-xs font-semibold text-red-500 hover:text-red-700 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <>
                  {/* ── Option A: Email Dropdown ── */}
                  <div className="relative">
                    <p className="mb-1 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Option A — Pick from recent users</p>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowEmailDropdown((v) => !v)}
                        className="flex w-full items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-xs text-gray-700 hover:border-emerald-400 hover:bg-white transition-all focus:outline-none"
                      >
                        <span className="flex items-center gap-2">
                          <User size={13} className="text-gray-400" />
                          {loadingUsers ? "Loading users…" : "Select a user by email (most recent first)"}
                        </span>
                        <svg className={`w-4 h-4 text-gray-400 transition-transform ${showEmailDropdown ? "rotate-180" : ""}`} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" /></svg>
                      </button>

                      {showEmailDropdown && (
                        <div className="absolute left-0 right-0 top-full z-30 mt-1 rounded-xl border border-gray-200 bg-white shadow-xl">
                          {/* Filter inside dropdown */}
                          <div className="sticky top-0 border-b border-gray-100 bg-white px-3 py-2">
                            <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5">
                              <Search size={13} className="text-gray-400 shrink-0" />
                              <input
                                type="text"
                                autoFocus
                                value={dropdownFilter}
                                onChange={(e) => setDropdownFilter(e.target.value)}
                                placeholder="Filter by name or email…"
                                className="flex-1 bg-transparent text-xs text-gray-800 placeholder-gray-400 outline-none"
                              />
                              {dropdownFilter && (
                                <button type="button" onClick={() => setDropdownFilter("")} className="text-gray-400 hover:text-gray-600">
                                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5"><path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" /></svg>
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="max-h-56 overflow-y-auto p-1">
                            {loadingUsers ? (
                              <div className="flex items-center justify-center gap-2 py-6 text-xs text-gray-400">
                                <Loader2 size={14} className="animate-spin" /> Loading users…
                              </div>
                            ) : (
                              (() => {
                                const filtered = allUsers.filter((u) => {
                                  if (!dropdownFilter.trim()) return true;
                                  const q = dropdownFilter.toLowerCase();
                                  return (
                                    u.email.toLowerCase().includes(q) ||
                                    u.name.toLowerCase().includes(q) ||
                                    String(u.id).includes(q)
                                  );
                                });
                                if (filtered.length === 0) {
                                  return <div className="py-5 text-center text-xs text-gray-400">No users match &ldquo;{dropdownFilter}&rdquo;</div>;
                                }
                                return filtered.map((u) => (
                                  <button
                                    key={u.id}
                                    type="button"
                                    onClick={() => {
                                      setSelectedUser(u);
                                      setShowEmailDropdown(false);
                                      setDropdownFilter("");
                                    }}
                                    className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-xs hover:bg-emerald-50 transition-colors"
                                  >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 font-bold text-indigo-700 text-[11px]">
                                        {u.name ? u.name.charAt(0).toUpperCase() : "U"}
                                      </div>
                                      <div className="min-w-0">
                                        <p className="font-bold text-gray-900 truncate">{u.name}</p>
                                        <p className="text-[10px] text-gray-500 truncate">{u.email}</p>
                                      </div>
                                    </div>
                                    <div className="shrink-0 flex flex-col items-end gap-0.5">
                                      <span className="rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-500">#{u.id}</span>
                                      {u.created_at && (
                                        <span className="text-[9px] text-gray-400">
                                          {new Date(u.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                                        </span>
                                      )}
                                    </div>
                                  </button>
                                ));
                              })()
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ── Divider ── */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-px bg-gray-200" />
                    <span className="text-[10px] font-bold text-gray-400 uppercase">or search manually</span>
                    <div className="flex-1 h-px bg-gray-200" />
                  </div>

                  {/* ── Option B: Text Search ── */}
                  <div className="relative">
                    <p className="mb-1 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Option B — Search by name / email / ID</p>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                        {searching ? <Loader2 size={14} className="animate-spin text-emerald-600" /> : <Search size={14} />}
                      </div>
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => { setSearchQuery(e.target.value); setShowDropdown(true); }}
                        onFocus={() => setShowDropdown(true)}
                        placeholder="Type name, email or user ID…"
                        className="w-full rounded-xl border border-gray-200 bg-gray-50 pl-9 pr-4 py-2.5 text-xs text-gray-900 placeholder-gray-400 focus:border-emerald-500 focus:bg-white focus:outline-none"
                      />

                      {showDropdown && searchQuery.trim().length > 0 && (
                        <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-60 overflow-y-auto rounded-xl border border-gray-200 bg-white p-1 shadow-lg">
                          {searching ? (
                            <div className="p-3 text-center text-xs text-gray-400">Searching…</div>
                          ) : searchResults.length === 0 ? (
                            <div className="p-3 text-center text-xs text-gray-400">No users found for &ldquo;{searchQuery}&rdquo;</div>
                          ) : (
                            searchResults.map((u) => (
                              <button
                                key={u.id}
                                type="button"
                                onClick={() => { setSelectedUser(u); setShowDropdown(false); }}
                                className="flex w-full items-center justify-between rounded-lg p-2 text-left text-xs hover:bg-emerald-50 transition-colors"
                              >
                                <div className="flex items-center gap-2.5">
                                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 font-bold text-gray-600 text-[11px]">
                                    {u.name ? u.name.charAt(0).toUpperCase() : "U"}
                                  </div>
                                  <div>
                                    <p className="font-bold text-gray-900">{u.name}</p>
                                    <p className="text-[10px] text-gray-500">{u.email}</p>
                                  </div>
                                </div>
                                <span className="rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600">#{u.id}</span>
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Role Selection */}
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-500">
                Store Role *
              </label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-xs font-medium text-gray-800 focus:border-emerald-600 focus:outline-none"
              >
                {STORE_ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={saving || !selectedUser}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-xs font-bold text-white disabled:opacity-50 hover:bg-emerald-700 transition-colors shadow-sm"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <UserCheck size={14} />}
              <span>{saving ? "Assigning..." : "Assign Selected User"}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Staff List Table */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-sky-600" />
            <h2 className="font-bold text-gray-900 text-sm">Assigned Store Staff ({staff.length})</h2>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50 text-left font-bold uppercase tracking-wide text-gray-500">
                <th className="px-4 py-3">User</th>
                <th className="px-3 py-3">Email</th>
                <th className="px-3 py-3">Store Role</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 5 }).map((__, j) => (
                      <td key={j} className="px-3 py-3">
                        <div className="h-4 animate-pulse rounded bg-gray-100" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : staff.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center">
                    <Users size={32} className="mx-auto mb-2 text-gray-300" />
                    <p className="text-gray-500">No staff members assigned to this store yet.</p>
                  </td>
                </tr>
              ) : (
                staff.map((member) => (
                  <tr key={member.id} className="hover:bg-gray-50/60">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100 text-gray-500 font-bold">
                          <User size={14} />
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">{member.user_name || `User #${member.user_id}`}</p>
                          <p className="text-[10px] text-gray-400">ID: #{member.user_id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-gray-600">{member.user_email || "—"}</td>
                    <td className="px-3 py-3">
                      <span className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[11px] font-bold text-sky-700 capitalize">
                        <ShieldCheck size={11} />
                        {member.store_role.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 capitalize">
                        {member.status}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <button
                        onClick={() => handleRemoveStaff(member.user_id)}
                        className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                        title="Remove from store"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Attributed Customers Section */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Share2 size={16} className="text-purple-600" />
            <h2 className="font-bold text-gray-900 text-sm">Attributed Customers ({attributedUsers.length})</h2>
          </div>
          <span className="text-[11px] font-medium text-gray-500">
            Registered via store referral/product link
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50 text-left font-bold uppercase tracking-wide text-gray-500">
                <th className="px-4 py-3">Customer</th>
                <th className="px-3 py-3">Email</th>
                <th className="px-3 py-3">Registered Date</th>
                <th className="px-3 py-3">Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                Array.from({ length: 2 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 4 }).map((__, j) => (
                      <td key={j} className="px-3 py-3">
                        <div className="h-4 animate-pulse rounded bg-gray-100" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : attributedUsers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center">
                    <Users size={28} className="mx-auto mb-1.5 text-gray-300" />
                    <p className="text-gray-500 font-medium">No attributed customers yet.</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      Share your store or product links! When users register after visiting your link, they appear here.
                    </p>
                  </td>
                </tr>
              ) : (
                attributedUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50/60">
                    <td className="px-4 py-3 font-bold text-gray-900">
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-100 text-purple-700 font-bold text-[11px]">
                          {user.name ? user.name.charAt(0).toUpperCase() : "C"}
                        </div>
                        <span>{user.name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-gray-600">{user.email}</td>
                    <td className="px-3 py-3 text-gray-500">
                      {user.created_at ? new Date(user.created_at).toLocaleDateString() : "Recently"}
                    </td>
                    <td className="px-3 py-3">
                      <span className="inline-flex items-center rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-bold text-purple-700 border border-purple-200 capitalize">
                        {user.role}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
