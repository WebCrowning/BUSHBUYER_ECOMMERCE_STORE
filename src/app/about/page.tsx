import Link from "next/link";
import type { Metadata } from "next";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { AboutClientContent } from "@/components/about-client-content";
import { query } from "@/lib/db";
import { defaultPageContent } from "@/lib/page-content";

export const metadata: Metadata = {
  title: "About Us | Bushbuyer",
  description: "Learn about Bushbuyer's mission connecting families with authentic African raw food ingredients.",
  alternates: {
    canonical: "https://bushbuyer.com/about",
  },
};

type CmsPageRow = {
  title: string;
  content_html: string;
};

export const dynamic = "force-dynamic";

export default async function AboutPage() {
  let rows: CmsPageRow[] = [];
  try {
    rows = await query<CmsPageRow[]>(
      "SELECT title, content_html FROM cms_pages WHERE slug = 'about' LIMIT 1",
    );
  } catch (err) {
    console.error("About page DB error:", err);
  }

  const pageTitle = rows[0]?.title || "About Us";
  const contentHtml = rows[0]?.content_html || defaultPageContent("about");

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <AboutClientContent pageTitle={pageTitle} contentHtml={contentHtml} />
      <SiteFooter />
    </div>
  );
}
