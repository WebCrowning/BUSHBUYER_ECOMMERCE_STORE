"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Store as StoreIcon, ChevronDown, Check, Plus, ShieldCheck, Sparkles } from "lucide-react";
import Link from "next/link";
import { Store } from "@/types/marketplace";

interface StoreSwitcherProps {
  stores: Store[];
  activeStoreId: number;
}

export function StoreSwitcher({ stores, activeStoreId }: StoreSwitcherProps) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const activeStore = stores.find((s) => s.id === activeStoreId) || stores[0];

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectStore = (storeId: number) => {
    setOpen(false);

    // Save selected store ID in cookie & localStorage
    const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toUTCString();
    document.cookie = `active_seller_store_id=${storeId}; expires=${expires}; path=/; SameSite=Lax`;
    try {
      localStorage.setItem("active_seller_store_id", String(storeId));
    } catch {
      // ignore storage errors
    }

    // Update URL parameter
    const params = new URLSearchParams(searchParams.toString());
    params.set("storeId", String(storeId));
    router.push(`${pathname}?${params.toString()}`);
  };

  if (!activeStore) return null;

  return (
    <div className="relative w-full" ref={dropdownRef}>
      {/* Active Store Display & Switcher Button */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`w-full text-left rounded-xl border p-3 transition-all flex items-center justify-between gap-3 ${
          open
            ? "border-emerald-500 bg-slate-800 ring-2 ring-emerald-500/20 shadow-lg"
            : "border-slate-700 bg-gradient-to-br from-slate-800 via-slate-900 to-slate-900 hover:border-slate-600 hover:bg-slate-800"
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0 font-bold text-emerald-400 text-sm overflow-hidden">
            {activeStore.logo ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={activeStore.logo} alt={activeStore.name} className="w-full h-full object-cover" />
            ) : (
              activeStore.name.substring(0, 2).toUpperCase()
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                Active Store
              </span>
              {stores.length > 1 && (
                <span className="px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 text-[9px] font-extrabold rounded-md">
                  {stores.length} Stores
                </span>
              )}
            </div>
            <p className="text-sm font-extrabold text-white truncate leading-tight mt-0.5">
              {activeStore.name}
            </p>
          </div>
        </div>
        <ChevronDown
          size={16}
          className={`text-slate-400 shrink-0 transition-transform duration-200 ${
            open ? "rotate-180 text-emerald-400" : ""
          }`}
        />
      </button>

      {/* Multi-Store Selection Dropdown */}
      {open && (
        <div className="absolute top-full left-0 right-0 mt-2 z-50 rounded-2xl border border-slate-700 bg-slate-900 p-2 shadow-2xl backdrop-blur-xl animate-in fade-in duration-150">
          <div className="px-3 py-2 border-b border-slate-800 flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Switch Store ({stores.length})
            </span>
            <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
              <Sparkles size={10} /> Multi-Store Owner
            </span>
          </div>

          <div className="max-h-60 overflow-y-auto py-1 space-y-1">
            {stores.map((s) => {
              const isCurrent = s.id === activeStore.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => handleSelectStore(s.id)}
                  className={`w-full text-left rounded-xl px-3 py-2.5 transition-all flex items-center justify-between gap-3 ${
                    isCurrent
                      ? "bg-emerald-950/60 border border-emerald-500/40 text-white"
                      : "hover:bg-slate-800 border border-transparent text-slate-200"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 overflow-hidden ${
                        isCurrent
                          ? "bg-emerald-500 text-white"
                          : "bg-slate-800 border border-slate-700 text-slate-300"
                      }`}
                    >
                      {s.logo ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={s.logo} alt={s.name} className="w-full h-full object-cover" />
                      ) : (
                        s.name.substring(0, 2).toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate">{s.name}</p>
                      <p className="text-[10px] text-slate-400 truncate">
                        {s.business_category || "General"} · ID #{s.id}
                      </p>
                    </div>
                  </div>

                  {isCurrent ? (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 text-[10px] font-bold shrink-0">
                      <Check size={12} /> Active
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-400 hover:text-white shrink-0 font-medium">
                      Select &rarr;
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-2 pt-2 border-t border-slate-800">
            <Link
              href="/store/apply"
              onClick={() => setOpen(false)}
              className="w-full rounded-xl border border-dashed border-slate-700 hover:border-emerald-500/50 bg-slate-800/50 hover:bg-slate-800 p-2.5 text-center text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-all flex items-center justify-center gap-1.5"
            >
              <Plus size={14} /> Apply for Another Store
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
