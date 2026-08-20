"use client";

import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { useTranslation } from "@/hooks/use-translation";
import { PackageSearch, Home, ShoppingBag } from "lucide-react";

export default function NotFound() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand/5 via-white to-white flex flex-col">
      <SiteHeader />

      <main className="flex-1 container-shell flex items-center justify-center py-20">
        <div className="text-center max-w-lg w-full">
          {/* Big 404 */}
          <div className="relative mb-8 inline-block">
            <span className="text-[140px] font-black text-brand/10 leading-none select-none">
              404
            </span>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-brand/10 border border-brand/20">
                <PackageSearch className="h-10 w-10 text-brand" />
              </div>
            </div>
          </div>

          <h1 className="text-2xl font-extrabold text-brand-deep mb-3">
            {t("notfound_title")}
          </h1>
          <p className="text-foreground/60 text-sm leading-relaxed mb-8 max-w-sm mx-auto">
            {t("notfound_desc")}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-xl bg-brand px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-deep shadow-sm"
            >
              <Home size={15} />
              {t("notfound_go_home")}
            </Link>
            <Link
              href="/products"
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-white px-6 py-3 text-sm font-bold text-foreground/70 transition-colors hover:bg-surface-soft"
            >
              <ShoppingBag size={15} />
              {t("notfound_browse")}
            </Link>
          </div>

          <div className="mt-8 text-xs text-foreground/40">
            {t("notfound_lost")}{" "}
            <Link href="/faq" className="underline hover:text-brand">
              {t("notfound_faq")}
            </Link>{" "}
            {t("notfound_or")}{" "}
            <Link href="/contact" className="underline hover:text-brand">
              {t("notfound_contact")}
            </Link>
            .
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

