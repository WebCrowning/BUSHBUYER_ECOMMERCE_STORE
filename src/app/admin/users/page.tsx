"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Lock, Unlock, Loader, Trash2, Search, X, Users, RefreshCw } from "lucide-react";

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  is_blocked: number;
  blocked_reason: string | null;
  created_at: string;
}

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

interface ApiResponse {
  users?: User[];
  pagination?: PaginationData;
  error?: string;
}

export default function UsersManagementPage() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "active" | "blocked">("all");
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationData | null>(null);
  const [blockingUserId, setBlockingUserId] = useState<number | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<number | null>(null);
  const [blockReason, setBlockReason] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Debounce search input by 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    fetchUsers();
  }, [filter, page, searchQuery]);

  async function fetchUsers() {
    setLoading(true);
    try {
      let blockedParam = "";
      if (filter === "active") blockedParam = "&blocked=false";
      else if (filter === "blocked") blockedParam = "&blocked=true";

      const queryParam = searchQuery.trim()
        ? `&q=${encodeURIComponent(searchQuery.trim())}`
        : "";

      const res = await fetch(`/api/admin/users?page=${page}&limit=20${blockedParam}${queryParam}`);
      if (!res.ok) {
        const data = (await res.json()) as ApiResponse;
        throw new Error(data.error || "Failed to load users");
      }
      const data = (await res.json()) as ApiResponse;
      setUsers(data.users || []);
      setPagination(data.pagination || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users");
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  }

  async function handleBlockUser(userId: number) {
    if (!blockReason.trim()) {
      alert("Please enter a reason for blocking");
      return;
    }

    try {
      const res = await fetch("/api/admin/users/block", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, reason: blockReason }),
      });

      const data = (await res.json()) as ApiResponse & { message?: string };

      if (!res.ok) {
        throw new Error(data.error || "Failed to block user");
      }

      setSuccess("User blocked successfully!");
      setBlockingUserId(null);
      setBlockReason("");
      await fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to block user");
    }
  }

  async function handleUnblockUser(userId: number) {
    if (!confirm("Unblock this user?")) return;

    try {
      const res = await fetch(`/api/admin/users/block?id=${userId}`, {
        method: "DELETE",
      });

      const data = (await res.json()) as ApiResponse & { message?: string };

      if (!res.ok) {
        throw new Error(data.error || "Failed to unblock user");
      }

      setSuccess("User unblocked successfully!");
      await fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to unblock user");
    }
  }

  async function handleDeleteUser(userId: number) {
    setIsDeleting(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/admin/users?id=${userId}`, {
        method: "DELETE",
      });

      const data = (await res.json()) as ApiResponse & { message?: string };

      if (!res.ok) {
        throw new Error(data.error || "Failed to delete user");
      }

      setSuccess(data.message || "User deleted successfully!");
      setDeletingUserId(null);
      await fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete user");
    } finally {
      setIsDeleting(false);
    }
  }

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="flex justify-center py-20">
          <Loader className="animate-spin text-gray-400" size={32} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
            <p className="text-sm text-gray-500 mt-1">
              Search, filter, manage permissions, or block users across the platform.
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex justify-between items-center">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-red-700 font-bold ml-4">✕</button>
          </div>
        )}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6 flex justify-between items-center">
            <span>{success}</span>
            <button onClick={() => setSuccess(null)} className="text-green-700 font-bold ml-4">✕</button>
          </div>
        )}

        {/* Search Bar & Filter Controls */}
        <div className="mb-6 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          {/* Search Input */}
          <div className="relative flex-1 max-w-lg">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search users by name, email, or user ID..."
              className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-gray-300 bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm transition-all"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => {
                  setSearchInput("");
                  setSearchQuery("");
                  setPage(1);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
                title="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filter Tabs & Refresh */}
          <div className="flex items-center gap-2 flex-wrap">
            {(["all", "active", "blocked"] as const).map((f) => (
              <button
                key={f}
                onClick={() => {
                  setFilter(f);
                  setPage(1);
                }}
                className={`px-4 sm:px-5 py-2 rounded-xl text-sm font-semibold transition-all ${
                  filter === f
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                }`}
              >
                {f === "all"
                  ? "All Users"
                  : f === "active"
                    ? "Active"
                    : "Blocked"}
              </button>
            ))}

            <button
              type="button"
              onClick={() => fetchUsers()}
              disabled={loading}
              title="Refresh users"
              className="p-2.5 bg-white border border-gray-300 rounded-xl text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-blue-600" : ""}`} />
            </button>
          </div>
        </div>

        {/* Users List */}
        <div className="bg-white rounded-xl shadow-md border border-gray-200/80 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
              {filter === "all"
                ? "All Users"
                : filter === "active"
                  ? "Active Users"
                  : "Blocked Users"}{" "}
              <span className="text-gray-500 font-normal">({pagination?.total || 0})</span>
            </h2>
            {searchQuery && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  Search: &ldquo;{searchQuery}&rdquo;
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setSearchInput("");
                    setSearchQuery("");
                    setPage(1);
                  }}
                  className="text-xs text-blue-600 hover:underline font-semibold"
                >
                  Clear filter
                </button>
              </div>
            )}
          </div>

          {loading ? (
            <div className="px-6 py-12 text-center text-gray-500 flex flex-col items-center justify-center gap-2">
              <Loader className="w-6 h-6 animate-spin text-blue-600" />
              <p className="text-sm">Searching users...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-600">
              <Users className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="font-semibold text-gray-700">No users found</p>
              <p className="text-xs text-gray-500 mt-1">
                {searchQuery
                  ? `No user matches "${searchQuery}". Try searching by another name, email, or user ID.`
                  : "No users found in this category."}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {users.map((user) => (
                <div key={user.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900">{user.name}</h3>
                        {user.role && user.role !== "user" && user.role !== "customer" && (
                          <span className="px-2 py-0.5 text-xs font-semibold rounded bg-purple-100 text-purple-800 uppercase">
                            {user.role}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{user.email}</p>
                      {user.is_blocked ? (
                        <div className="mt-2">
                          <p className="text-xs font-semibold text-red-600 mb-1">
                            🚫 Blocked
                          </p>
                          {user.blocked_reason && (
                            <p className="text-xs text-gray-600">
                              Reason: {user.blocked_reason}
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-green-600 mt-2 font-semibold">
                          ✓ Active
                        </p>
                      )}
                      <p className="text-xs text-gray-500 mt-2">
                        Joined: {new Date(user.created_at).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="flex gap-2 ml-4 flex-shrink-0 items-start">
                      {deletingUserId === user.id ? (
                        <div className="w-64 bg-white border border-red-300 rounded-lg p-3 shadow-lg">
                          <p className="text-sm font-semibold text-red-700 mb-1">Delete User?</p>
                          <p className="text-xs text-gray-600 mb-3">
                            Are you sure you want to permanently delete <strong>{user.name}</strong>? This action cannot be undone.
                          </p>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleDeleteUser(user.id)}
                              disabled={isDeleting}
                              className="flex-1 px-3 py-1 bg-red-600 text-white rounded text-sm font-medium hover:bg-red-700 disabled:opacity-50"
                            >
                              {isDeleting ? "Deleting..." : "Confirm Delete"}
                            </button>
                            <button
                              onClick={() => setDeletingUserId(null)}
                              disabled={isDeleting}
                              className="flex-1 px-3 py-1 bg-gray-300 text-gray-700 rounded text-sm font-medium hover:bg-gray-400 disabled:opacity-50"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : blockingUserId === user.id ? (
                        <div className="w-64 bg-white border border-gray-300 rounded-lg p-3 shadow-lg">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Block Reason
                          </label>
                          <textarea
                            value={blockReason}
                            onChange={(e) => setBlockReason(e.target.value)}
                            placeholder="Enter reason for blocking..."
                            className="w-full border border-gray-300 rounded px-2 py-1 text-sm mb-2 resize-none"
                            rows={3}
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleBlockUser(user.id)}
                              className="flex-1 px-3 py-1 bg-red-600 text-white rounded text-sm font-medium hover:bg-red-700"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => {
                                setBlockingUserId(null);
                                setBlockReason("");
                              }}
                              className="flex-1 px-3 py-1 bg-gray-300 text-gray-700 rounded text-sm font-medium hover:bg-gray-400"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          {user.is_blocked ? (
                            <button
                              onClick={() => handleUnblockUser(user.id)}
                              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 text-sm font-medium"
                              title="Unblock user"
                            >
                              <Unlock size={16} />
                              Unblock
                            </button>
                          ) : (
                            <button
                              onClick={() => setBlockingUserId(user.id)}
                              disabled={
                                user.email === session?.user?.email ||
                                user.role === "admin" ||
                                user.role === "super_admin" ||
                                user.role === "platform_admin"
                              }
                              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center gap-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                              title={
                                user.email === session?.user?.email
                                  ? "Cannot block yourself"
                                  : user.role === "admin" || user.role === "super_admin" || user.role === "platform_admin"
                                  ? "Cannot block admin users"
                                  : "Block user"
                              }
                            >
                              <Lock size={16} />
                              Block
                            </button>
                          )}

                          <button
                            onClick={() => setDeletingUserId(user.id)}
                            disabled={
                              user.email === session?.user?.email ||
                              user.role === "admin" ||
                              user.role === "super_admin" ||
                              user.role === "platform_admin"
                            }
                            className="px-3 py-2 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg transition-colors flex items-center gap-1.5 text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed border border-red-200"
                            title={
                              user.email === session?.user?.email
                                ? "Cannot delete yourself"
                                : user.role === "admin" || user.role === "super_admin" || user.role === "platform_admin"
                                ? "Cannot delete admin users"
                                : "Delete user"
                            }
                          >
                            <Trash2 size={16} />
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {pagination && pagination.pages > 1 && (
          <div className="mt-6 flex justify-center gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  page === p
                    ? "bg-blue-600 text-white"
                    : "border border-gray-300 hover:bg-gray-50"
                }`}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => setPage(Math.min(pagination.pages, page + 1))}
              disabled={page === pagination.pages}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
