import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { query } from "@/lib/db";
import { FAQClientContent } from "@/components/faq-client-content";

export const metadata: Metadata = {
  title: "FAQ | Bushbuyer",
  description: "Find answers to common questions about African food products, shipping, and ordering.",
  alternates: {
    canonical: "https://bushbuyer.com/faq",
  },
};

export const dynamic = "force-dynamic";

type PublicFaq = {
  id: number;
  question: string;
  answer: string;
  question_fr?: string | null;
  answer_fr?: string | null;
  category: string;
  updated_at: string;
};

function normalizeCategory(value: string | null | undefined) {
  const trimmed = String(value ?? "").trim();
  return trimmed.length > 0 ? trimmed : "General";
}

export default async function FAQPage() {
  let faqs: PublicFaq[] = [];
  try {
    faqs = await query<PublicFaq[]>(
      `SELECT id, question, answer, question_fr, answer_fr, category, updated_at
       FROM faq
       ORDER BY category ASC, updated_at DESC`,
    );
  } catch (error) {
    console.error("FAQ page DB query error:", error);
    faqs = [];
  }

  const grouped = faqs.reduce<Record<string, PublicFaq[]>>((acc, item) => {
    const category = normalizeCategory(item.category);
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push({
      ...item,
      category,
    });
    return acc;
  }, {});

  const categories = Object.keys(grouped).sort((a, b) => a.localeCompare(b));

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />
      <FAQClientContent faqs={faqs} grouped={grouped} categories={categories} />
      <SiteFooter />
    </div>
  );
}
