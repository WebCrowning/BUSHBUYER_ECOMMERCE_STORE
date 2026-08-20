"use client";

import { useTranslation } from "@/hooks/use-translation";

type PublicFaq = {
  id: number;
  question: string;
  answer: string;
  question_fr?: string | null;
  answer_fr?: string | null;
  category: string;
  updated_at: string;
};

interface Props {
  faqs: PublicFaq[];
  grouped: Record<string, PublicFaq[]>;
  categories: string[];
}

export function FAQClientContent({ faqs, grouped, categories }: Props) {
  const { t, lang } = useTranslation();
  const totalFaqs = faqs.length;

  const isFr = lang === "fr";

  return (
    <main className="container-shell py-10">
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{t("faq_kicker")}</p>
        <h1 className="mt-2 text-4xl font-black tracking-tight text-slate-900">{t("faq_title")}</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          {t("faq_desc")}
        </p>
        <div className="mt-5 flex flex-wrap gap-3 text-xs font-semibold">
          <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">{totalFaqs} {t("faq_entries")}</span>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">{categories.length} {t("faq_categories")}</span>
        </div>
      </section>

      {totalFaqs === 0 ? (
        <section className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <h2 className="text-lg font-bold text-slate-800">{t("faq_empty_title")}</h2>
          <p className="mt-2 text-sm text-slate-600">
            {t("faq_empty_desc")}
          </p>
        </section>
      ) : (
        <section className="mt-6 space-y-6">
          {categories.map((category) => (
            <article key={category} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-xl font-bold text-slate-900">{category}</h2>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                  {grouped[category].length} {grouped[category].length > 1 ? t("faq_items") : t("faq_item")}
                </span>
              </div>

              <div className="space-y-3">
                {grouped[category].map((item) => {
                  const displayQuestion = isFr && item.question_fr?.trim() ? item.question_fr.trim() : item.question;
                  const displayAnswer = isFr && item.answer_fr?.trim() ? item.answer_fr.trim() : item.answer;

                  return (
                    <details
                      key={item.id}
                      className="group rounded-xl border border-slate-200 bg-slate-50 p-4 open:bg-white open:shadow-sm"
                    >
                      <summary className="cursor-pointer list-none pr-6 text-sm font-semibold text-slate-800 marker:hidden">
                        {displayQuestion}
                      </summary>
                      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{displayAnswer}</p>
                      <p className="mt-2 text-xs text-slate-500">
                        {t("faq_updated")} {new Date(item.updated_at).toLocaleDateString()}
                      </p>
                    </details>
                  );
                })}
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
