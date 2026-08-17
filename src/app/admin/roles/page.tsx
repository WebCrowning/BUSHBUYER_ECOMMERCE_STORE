"use client";

import { useCallback, useEffect, useState } from "react";
import {
  KeyRound,
  RefreshCw,
  ShieldCheck,
  Layers,
  CheckCircle,
  Lock,
} from "lucide-react";

interface RoleRow {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  is_system: boolean;
}

interface PermissionRow {
  id: number;
  name: string;
  slug: string;
  module: string;
  description: string | null;
}

const ROLE_COLORS: Record<string, string> = {
  super_admin: "bg-red-50 text-red-700 border-red-200",
  platform_admin: "bg-orange-50 text-orange-700 border-orange-200",
  finance_admin: "bg-amber-50 text-amber-700 border-amber-200",
  admin: "bg-purple-50 text-purple-700 border-purple-200",
  sub_admin: "bg-violet-50 text-violet-700 border-violet-200",
  store_owner: "bg-sky-50 text-sky-700 border-sky-200",
  store_manager: "bg-blue-50 text-blue-700 border-blue-200",
  inventory_officer: "bg-teal-50 text-teal-700 border-teal-200",
  sales_staff: "bg-emerald-50 text-emerald-700 border-emerald-200",
  customer_support: "bg-green-50 text-green-700 border-green-200",
  accountant: "bg-lime-50 text-lime-700 border-lime-200",
  customer: "bg-gray-100 text-gray-700 border-gray-200",
};

export default function AdminRolesPage() {
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [permissions, setPermissions] = useState<PermissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"roles" | "permissions">("roles");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/roles");
      if (res.ok) {
        const data = await res.json();
        setRoles(data.roles ?? []);
        setPermissions(data.permissions ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchData(); }, [fetchData]);

  // Group permissions by module
  const permissionsByModule = permissions.reduce<Record<string, PermissionRow[]>>((acc, p) => {
    const mod = p.module ?? "General";
    if (!acc[mod]) acc[mod] = [];
    acc[mod].push(p);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 md:text-2xl">Roles & Permissions</h1>
          <p className="mt-0.5 text-xs text-gray-500">
            View Bushbuyer&apos;s dynamic RBAC hierarchy, roles, and granular permissions.
          </p>
        </div>
        <button
          onClick={() => void fetchData()}
          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 shadow-sm"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {[
          {
            label: "Total Roles",
            value: roles.length,
            icon: <ShieldCheck size={18} />,
            color: "text-purple-700",
            bg: "bg-purple-50 border-purple-200",
          },
          {
            label: "Total Permissions",
            value: permissions.length,
            icon: <Lock size={18} />,
            color: "text-sky-700",
            bg: "bg-sky-50 border-sky-200",
          },
          {
            label: "Permission Modules",
            value: Object.keys(permissionsByModule).length,
            icon: <Layers size={18} />,
            color: "text-emerald-700",
            bg: "bg-emerald-50 border-emerald-200",
          },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl border p-3.5 shadow-sm ${s.bg}`}>
            <div className={`mb-1.5 ${s.color}`}>{s.icon}</div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500">{s.label}</p>
            <p className={`mt-0.5 text-2xl font-extrabold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 rounded-xl border border-gray-200 bg-gray-100 p-1 w-fit">
        {(["roles", "permissions"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`rounded-lg px-4 py-1.5 text-xs font-bold capitalize transition-colors ${
              activeTab === tab
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Roles Tab */}
      {activeTab === "roles" && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-28 animate-pulse rounded-xl bg-gray-100" />
              ))
            : roles.map((role) => (
                <div
                  key={role.id}
                  className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
                >
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-bold capitalize ${
                        ROLE_COLORS[role.slug] ?? "bg-gray-100 text-gray-700 border-gray-200"
                      }`}
                    >
                      <ShieldCheck size={11} />
                      {role.slug.replace(/_/g, " ")}
                    </span>
                    {role.is_system ? (
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-gray-500">
                        System
                      </span>
                    ) : null}
                  </div>
                  <p className="font-bold text-gray-900 text-sm">{role.name}</p>
                  {role.description && (
                    <p className="mt-1 text-xs text-gray-500">{role.description}</p>
                  )}
                </div>
              ))}
        </div>
      )}

      {/* Permissions Tab */}
      {activeTab === "permissions" && (
        <div className="space-y-4">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-40 animate-pulse rounded-xl bg-gray-100" />
              ))
            : Object.entries(permissionsByModule).map(([module, perms]) => (
                <div
                  key={module}
                  className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
                >
                  <div className="flex items-center gap-2 border-b border-gray-100 bg-gray-50 px-4 py-2.5">
                    <KeyRound size={14} className="text-emerald-600" />
                    <h3 className="font-bold capitalize text-gray-900 text-xs">{module}</h3>
                    <span className="ml-auto rounded-full bg-gray-200 px-2 py-0.5 text-[10px] font-bold text-gray-700">
                      {perms.length}
                    </span>
                  </div>
                  <div className="grid divide-y divide-gray-100 sm:grid-cols-2 sm:divide-y-0">
                    {perms.map((perm) => (
                      <div key={perm.id} className="flex items-start gap-2.5 px-4 py-2.5 border-b border-gray-100 last:border-b-0">
                        <CheckCircle size={13} className="mt-0.5 shrink-0 text-emerald-600" />
                        <div>
                          <p className="font-bold text-gray-900 text-xs">{perm.name}</p>
                          <p className="mt-0.5 font-mono text-[10px] text-gray-400">{perm.slug}</p>
                          {perm.description && (
                            <p className="mt-0.5 text-[11px] text-gray-500">{perm.description}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
        </div>
      )}
    </div>
  );
}
