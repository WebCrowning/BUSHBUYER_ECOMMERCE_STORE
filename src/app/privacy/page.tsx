import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { query } from "@/lib/db";
import { defaultPageContent, sanitizePageContent } from "@/lib/page-content";

export const metadata: Metadata = {
  title: "Privacy Policy | Bushbuyer",
  description: "Read Bushbuyer's privacy policy to understand how we collect and protect your information.",
  alternates: {
    canonical: "https://bushbuyer.com/privacy",
  },
};

type CmsPageRow = {
  title: string;
  content_html: string;
  updated_at: string;
};

export const dynamic = "force-dynamic";

export default async function PrivacyPage() {
  let rows: CmsPageRow[] = [];
  try {
    rows = await query<CmsPageRow[]>(
      "SELECT title, content_html, updated_at FROM cms_pages WHERE slug = 'privacy' LIMIT 1",
    );
  } catch (err) {
    console.error("Privacy page DB error:", err);
  }

  const pageTitle = rows[0]?.title || "Privacy Policy";
  const rawHtml = rows[0]?.content_html || defaultPageContent("privacy");
  const contentHtml = sanitizePageContent(rawHtml);


  return (
    <div className="min-h-screen">
      <SiteHeader />

      <main className="container-shell py-10 md:py-14">
        <section className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-brand-deep via-brand-deep to-brand p-7 text-white shadow-[0_20px_45px_rgba(31,75,51,0.28)] md:p-10">
          <div className="pointer-events-none absolute -left-16 -top-10 h-52 w-52 rounded-full bg-white/10 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-20 right-0 h-60 w-60 rounded-full bg-accent/20 blur-3xl" />

          <div className="relative z-10">
            <div>
              <p className="inline-block rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-white/90">
                Legal and Privacy
              </p>
              <h1 className="mt-4 text-3xl font-black leading-tight tracking-tight md:text-5xl">{pageTitle}</h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-white/85 md:text-base">
                Transparency matters. This page explains what data we collect, how we use it, and the controls you
                have over your information.
              </p>
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
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-brand">Your control</p>
              <h2 className="mt-2 text-lg font-bold text-brand-deep">Privacy choices and support</h2>
              <p className="mt-2 text-sm leading-6 text-foreground/70">
                If you need clarification, updates, or deletion requests, contact our team and we will assist promptly.
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-surface-soft p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-brand">Need help?</p>
              <p className="mt-2 text-sm leading-6 text-foreground/75">
                Reach our support team for any privacy-related request.
              </p>
              <Link
                href="/contact"
                className="mt-4 inline-block rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-deep"
              >
                Contact Support
              </Link>
            </div>
          </aside>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
