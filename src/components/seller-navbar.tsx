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
  type LucideIcon,
} from "lucide-react";

type SellerNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export default function SellerNavbar({ storeId, storeSlug }: { storeId?: number; storeSlug?: string }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [unreadCount, setUnreadCount] = useState(0);

  const userStoreIds = (session?.user as { storeIds?: number[] })?.storeIds || [];
  const activeStoreId = storeId || userStoreIds[0] || 1;

  const sellerNavItems: SellerNavItem[] = [
    { href: "/seller/dashboard", label: "Store Overview", icon: LayoutDashboard },
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

  const linkClass = (href: string) => {
    const isActive = pathname === href;

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
                return (
                  <Link key={item.href} href={item.href} className={linkClass(item.href)}>
                    <span className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-2">
                        <ItemIcon size={14} />
                        <span>{item.label}</span>
                      </span>
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
        <div className="mb-4 rounded-xl border border-slate-700 bg-gradient-to-br from-slate-800 via-slate-900 to-slate-900 px-3 py-3">
          <p className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-slate-400">Store Portal</p>
          <p className="mt-1 inline-flex items-center gap-2 text-sm font-extrabold text-white">
            <Store size={14} className="text-emerald-400" />
            Store Management
          </p>
          <p className="inline-flex items-center gap-1.5 text-xs text-slate-400">
            <Sparkles size={12} className="text-slate-500" />
            Store Owner Control Center
          </p>
        </div>

        <nav className="space-y-1.5">
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
            return (
              <Link key={item.href} href={item.href} className={linkClass(item.href)}>
                <span className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-2">
                    <ItemIcon size={14} />
                    <span>{item.label}</span>
                  </span>
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
