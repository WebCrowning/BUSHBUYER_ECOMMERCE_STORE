"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  LayoutDashboard,
  Package,
  Boxes,
  ShoppingCart,
  Wallet,
  Truck,
  UserPlus,
  Mail,
  MessageSquare,
  BarChart3,
  CircleHelp,
  Store,
  Sparkles,
  Shield,
  Bell,
  ExternalLink,
  ShoppingBag,
  MapPin,
  type LucideIcon,
} from "lucide-react";
import { StoreSwitcher } from "@/components/store-switcher";
import { Store as StoreType } from "@/types/marketplace";
import { canAccessSellerRoute, STORE_ROLE_META } from "@/lib/store-permissions";

type SellerNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export default function SellerNavbar({
  storeId,
  storeSlug,
  stores,
  storeRole,
}: {
  storeId?: number;
  storeSlug?: string;
  stores?: StoreType[];
  storeRole?: string;
}) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [unreadCount, setUnreadCount] = useState(0);

  const userStoreIds = (session?.user as { storeIds?: number[] })?.storeIds || [];
  const activeStoreId = storeId || userStoreIds[0] || 1;
  const userStores = stores || [];

  const getLinkHref = (baseHref: string) => {
    if (userStores.length > 1 && activeStoreId) {
      return `${baseHref}?storeId=${activeStoreId}`;
    }
    return baseHref;
  };

  const allSellerNavItems: SellerNavItem[] = [
    { href: "/seller/dashboard", label: "Store Overview", icon: LayoutDashboard },
    { href: "/seller/notifications", label: "Notifications", icon: Bell },
    { href: "/seller/location", label: "Store Location & GPS", icon: MapPin },
    { href: "/seller/products", label: "Store Products", icon: Package },
    { href: "/seller/inventory", label: "Inventory Management", icon: Boxes },
    { href: "/seller/orders", label: "Store Orders", icon: ShoppingCart },
    { href: "/seller/wallets", label: "Wallets & Earnings", icon: Wallet },
    { href: "/seller/delivery-settings", label: "Delivery Settings", icon: Truck },
    { href: "/seller/staff", label: "Store Staff & Users", icon: UserPlus },
    { href: "/seller/messages", label: "Customer Messages", icon: Mail },
    { href: "/seller/chat", label: "Live Chat", icon: MessageSquare },
    { href: "/seller/traffic", label: "Traffic Analytics", icon: BarChart3 },
    { href: "/seller/faq", label: "Store FAQ", icon: CircleHelp },
  ];

  // Filter navigation items by role authority
  const sellerNavItems = storeRole
    ? allSellerNavItems.filter((item) => canAccessSellerRoute(storeRole, item.href))
    : allSellerNavItems;

  const roleMeta = storeRole ? STORE_ROLE_META[storeRole] : null;

  const viewStoreHref = storeSlug ? `/store/${storeSlug}` : null;

  const currentItem =
    sellerNavItems.find((item) => pathname === item.href)?.label ?? "Store Overview";

  useEffect(() => {
    let active = true;

    async function loadUnread() {
      try {
        const res = await fetch("/api/notifications", { cache: "no-store" });
        const payload = (await res.json().catch(() => null)) as { unreadCount?: number } | null;
        if (active && res.ok) {
          setUnreadCount(Number(payload?.unreadCount ?? 0));
        }
      } catch {
        if (active) {
          setUnreadCount(0);
        }
      }
    }

    void loadUnread();
    const timer = setInterval(() => {
      void loadUnread();
    }, 10000);

    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  const linkClass = (baseHref: string) => {
    const isActive = pathname === baseHref;

    return `block rounded-xl border px-3 py-2 text-sm font-semibold transition-all ${
      isActive
        ? "border-brand bg-brand text-white shadow-sm"
        : "border-transparent text-slate-200 hover:border-slate-600 hover:bg-slate-800"
    }`;
  };

  return (
    <>
      {/* Mobile Drawer */}
      <div className="mb-4 rounded-2xl border border-slate-700 bg-slate-900 p-3 text-white shadow-sm lg:hidden">
        {userStores.length > 0 && (
          <div className="mb-3">
            <StoreSwitcher stores={userStores} activeStoreId={activeStoreId} />
          </div>
        )}

        <details className="group">
          <summary className="flex cursor-pointer list-none items-center justify-between rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm font-bold text-white">
            <div>
              <p className="text-[0.65rem] uppercase tracking-[0.16em] text-slate-400">Store Navigation</p>
              <p className="text-sm font-bold text-white">{currentItem}</p>
            </div>
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-300 transition-transform group-open:rotate-180">▼</span>
          </summary>

          <div className="mt-3 space-y-2">
            <nav className="grid gap-1">
              {/* ── Shop as Buyer ── */}
              <Link
                href="/products"
                className="flex items-center gap-2 rounded-xl border border-violet-500/40 bg-violet-900/30 px-3 py-2 text-sm font-bold text-violet-300 transition-all hover:bg-violet-900/60"
              >
                <ShoppingBag size={14} className="text-violet-400" />
                <span className="flex-1">Shop &amp; Buy Products</span>
                <span className="rounded-md bg-violet-500/20 px-1.5 py-0.5 text-[10px] font-bold text-violet-400">
                  Buyer Mode
                </span>
              </Link>

              {viewStoreHref && (
                <Link
                  href={viewStoreHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between gap-2 rounded-xl border border-emerald-700/60 bg-emerald-900/40 px-3 py-2 text-sm font-semibold text-emerald-300 transition-all hover:bg-emerald-900/70"
                >
                  <span className="inline-flex items-center gap-2">
                    <Store size={14} className="text-emerald-400" />
                    View Storefront
                  </span>
                  <ExternalLink size={12} className="text-emerald-500" />
                </Link>
              )}
              {sellerNavItems.map((item) => {
                const ItemIcon = item.icon;
                const targetHref = getLinkHref(item.href);
                const isNotifications = item.href === "/seller/notifications";
                return (
                  <Link key={item.href} href={targetHref} className={linkClass(item.href)}>
                    <span className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-2">
                        <ItemIcon size={14} />
                        <span>{item.label}</span>
                      </span>
                      {isNotifications && unreadCount > 0 && (
                        <span className="min-w-5 rounded-full bg-brand px-1.5 py-0.5 text-center text-[10px] font-bold text-white">
                          {unreadCount > 99 ? "99+" : unreadCount}
                        </span>
                      )}
                    </span>
                  </Link>
                );
              })}
            </nav>

            <div className="mt-2 grid grid-cols-2 gap-2">
              <Link
                href="/"
                className="rounded-xl border border-slate-700 px-3 py-2 text-center text-sm font-semibold text-slate-200 transition-colors hover:bg-slate-800"
              >
                Store Front
              </Link>
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/" })}
                className="rounded-xl bg-brand px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-deep"
              >
                Sign Out
              </button>
            </div>
          </div>
        </details>
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden h-fit rounded-2xl border border-slate-700 bg-slate-900 p-4 text-white shadow-sm lg:sticky lg:top-6 lg:block">
        {userStores.length > 0 ? (
          <div className="mb-4 space-y-2">
            <StoreSwitcher stores={userStores} activeStoreId={activeStoreId} />
            {roleMeta && (
              <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Shield size={13} className="text-emerald-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Your Authority</p>
                    <p className="text-xs font-bold text-slate-100 truncate">{roleMeta.label}</p>
                  </div>
                </div>
                <span className="rounded-md bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400 shrink-0">
                  Lvl {roleMeta.authorityLevel}
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="mb-4 rounded-xl border border-slate-700 bg-gradient-to-br from-slate-800 via-slate-900 to-slate-900 px-3 py-3">
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-slate-400">Store Portal</p>
            <p className="mt-1 inline-flex items-center gap-2 text-sm font-extrabold text-white">
              <Store size={14} className="text-emerald-400" />
              Store Management
            </p>
            <p className="inline-flex items-center gap-1.5 text-xs text-slate-400">
              <Sparkles size={12} className="text-slate-500" />
              {roleMeta ? roleMeta.label : "Store Control Center"}
            </p>
          </div>
        )}

        <nav className="space-y-1.5">
          {/* ── Shop as Buyer ── */}
          <Link
            href="/products"
            className="flex items-center gap-2 rounded-xl border border-violet-500/40 bg-violet-900/30 px-3 py-2.5 text-sm font-bold text-violet-300 transition-all hover:bg-violet-900/60"
          >
            <ShoppingBag size={14} className="text-violet-400" />
            <span className="flex-1">Shop &amp; Buy Products</span>
            <span className="rounded-md bg-violet-500/20 px-1.5 py-0.5 text-[10px] font-bold text-violet-400">
              Buyer Mode
            </span>
          </Link>

          {viewStoreHref && (
            <Link
              href={viewStoreHref}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between gap-2 rounded-xl border border-emerald-700/60 bg-emerald-900/40 px-3 py-2 text-sm font-semibold text-emerald-300 transition-all hover:bg-emerald-900/70"
            >
              <span className="inline-flex items-center gap-2">
                <Store size={14} className="text-emerald-400" />
                View Storefront
              </span>
              <ExternalLink size={12} className="text-emerald-500" />
            </Link>
          )}
          {sellerNavItems.map((item) => {
            const ItemIcon = item.icon;
            const targetHref = getLinkHref(item.href);
            const isNotifications = item.href === "/seller/notifications";
            return (
              <Link key={item.href} href={targetHref} className={linkClass(item.href)}>
                <span className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-2">
                    <ItemIcon size={14} />
                    <span>{item.label}</span>
                  </span>
                  {isNotifications && unreadCount > 0 && (
                    <span className="min-w-5 rounded-full bg-brand px-1.5 py-0.5 text-center text-[10px] font-bold text-white">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-5 space-y-2 border-t border-slate-700 pt-4">
          <Link
            href="/"
            className="block rounded-xl border border-slate-700 px-3 py-2 text-center text-sm font-semibold text-slate-200 transition-colors hover:bg-slate-800"
          >
            Store Front
          </Link>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/" })}
            className="w-full rounded-xl bg-brand px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-deep"
          >
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}
