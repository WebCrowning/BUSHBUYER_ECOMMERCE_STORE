"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SessionProvider, signIn, signOut, useSession } from "next-auth/react";
import { useCart } from "@/context/cart-context";
import { useTranslation } from "@/hooks/use-translation";
import { Bell, ShoppingCart } from "lucide-react";

export function HeaderActions() {
  return (
    <SessionProvider>
      <HeaderActionsInner />
    </SessionProvider>
  );
}

function HeaderActionsInner() {
  const { data: session, status } = useSession();
  const { totalItems } = useCart();
  const { t } = useTranslation();
  const [unreadCount, setUnreadCount] = useState(0);
  const role = (session?.user as { role?: string } | undefined)?.role;
  const isAdmin = role === "admin" || role === "sub_admin";
  const dashboardHref = isAdmin ? "/admin" : "/dashboard";
  const notificationsHref = isAdmin ? "/admin/notifications" : "/notifications";

  useEffect(() => {
    if (!session?.user) {
      return;
    }

    let active = true;

    async function loadUnread() {
      try {
        const response = await fetch("/api/notifications", { cache: "no-store" });
        const payload = (await response.json().catch(() => null)) as { unreadCount?: number } | null;
        if (active && response.ok) {
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
  }, [session?.user]);

  return (
    <div className="flex items-center gap-2">
      <Link
        href="/cart"
        className="relative inline-flex items-center justify-center rounded-full border border-white/30 p-3 text-white transition-colors hover:bg-white/10"
        aria-label="Cart"
      >
        <ShoppingCart size={21} />
        {totalItems > 0 ? (
          <span className="absolute -right-1.5 -top-1.5 min-w-5 rounded-full bg-brand px-1.5 text-center text-[11px] font-bold text-white">
            <span suppressHydrationWarning>{totalItems > 99 ? "99+" : totalItems}</span>
          </span>
        ) : null}
      </Link>

      {status === "loading" ? (
        <span className="rounded-full border border-white/30 px-4 py-2 text-sm font-semibold text-white">
          {t("header_loading")}
        </span>
      ) : session?.user ? (
        <>
          <Link
            href={notificationsHref}
            className="relative inline-flex items-center gap-1 rounded-full border border-white/30 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            aria-label="Notifications"
          >
            <Bell size={16} />
            <span className="hidden sm:inline">{t("header_alerts")}</span>
            {unreadCount > 0 ? (
              <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-red-600 px-1 text-center text-[10px] font-bold text-white">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            ) : null}
          </Link>
          {isAdmin ? (
            <Link
              href="/admin"
              className="inline-flex rounded-full border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-700"
            >
              {t("header_admin_portal")}
            </Link>
          ) : (session?.user as { storeIds?: number[] })?.storeIds?.length ? (
            <Link
              href="/seller/dashboard"
              className="inline-flex rounded-full border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-sm font-bold text-emerald-400 transition-colors hover:bg-emerald-500/20"
            >
              {t("header_store_portal")}
            </Link>
          ) : (session?.user as { referredStoreSlug?: string })?.referredStoreSlug ? (
            <Link
              href={`/store/${(session.user as { referredStoreSlug?: string }).referredStoreSlug}`}
              className="inline-flex rounded-full border border-sky-500/40 bg-sky-500/10 px-4 py-2 text-sm font-bold text-sky-300 transition-colors hover:bg-sky-500/20"
            >
              {t("header_my_preferred_store")}
            </Link>
          ) : (
            <Link
              href="/dashboard"
              className="inline-flex rounded-full border border-white/30 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            >
              {t("header_dashboard")}
            </Link>
          )}
          {/* Sign Out — desktop only; mobile uses the hamburger menu */}
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/" })}
            className="hidden md:inline-flex rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-deep"
          >
            {t("header_sign_out")}
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={() => signIn(undefined, { callbackUrl: "/signin" })}
          className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-deep"
        >
          {t("header_sign_in")}
        </button>
      )}
    </div>
  );
}
