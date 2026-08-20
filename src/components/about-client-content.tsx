"use client";

import Link from "next/link";
import { useTranslation } from "@/hooks/use-translation";

interface Props {
  pageTitle: string;
  contentHtml: string;
}

export function AboutClientContent({ pageTitle, contentHtml }: Props) {
  const { t } = useTranslation();

  return (
    <main className="container-shell py-10 md:py-14">
      <section className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-brand-deep via-brand-deep to-brand p-7 text-white shadow-[0_20px_45px_rgba(31,75,51,0.28)] md:p-10">
        <div className="pointer-events-none absolute -left-16 -top-12 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-20 right-0 h-64 w-64 rounded-full bg-accent/20 blur-3xl" />

        <div className="relative z-10 grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
          <div>
            <p className="inline-block rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-white/90">
              {t("about_story_kicker")}
            </p>
            <h1 className="mt-4 text-3xl font-black leading-tight tracking-tight md:text-5xl">{pageTitle}</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/85 md:text-base">
              {t("about_desc")}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur-sm">
              <p className="text-xs uppercase tracking-[0.08em] text-white/80">{t("about_verified_suppliers")}</p>
              <p className="mt-1 text-2xl font-bold">100%</p>
            </div>
            <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur-sm">
              <p className="text-xs uppercase tracking-[0.08em] text-white/80">{t("about_customer_support")}</p>
              <p className="mt-1 text-2xl font-bold">{t("about_fast_response")}</p>
            </div>
            <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur-sm">
              <p className="text-xs uppercase tracking-[0.08em] text-white/80">{t("about_delivery_coverage")}</p>
              <p className="mt-1 text-2xl font-bold">{t("about_local_global")}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-7 grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="glass-card rounded-3xl p-6 md:p-10">
          <article
            className="prose prose-slate max-w-none text-[15px] leading-7 text-foreground/85 prose-headings:font-extrabold prose-headings:text-brand-deep prose-h2:mt-8 prose-h2:border-l-4 prose-h2:border-brand prose-h2:pl-3 prose-p:text-foreground/80 prose-strong:text-brand-deep prose-li:my-1.5 prose-li:marker:text-brand"
            dangerouslySetInnerHTML={{ __html: contentHtml }}
          />
        </div>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-brand">{t("about_stand_for_kicker")}</p>
            <h2 className="mt-2 text-lg font-bold text-brand-deep">{t("about_stand_for_title")}</h2>
            <p className="mt-2 text-sm leading-6 text-foreground/70">
              {t("about_stand_for_desc")}
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-surface-soft p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-brand">{t("about_need_help_kicker")}</p>
            <p className="mt-2 text-sm leading-6 text-foreground/75">
              {t("about_need_help_desc")}
            </p>
            <Link
              href="/contact"
              className="mt-4 inline-block rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-deep"
            >
              {t("about_send_message")}
            </Link>
          </div>
        </aside>
      </section>
    </main>
  );
}
