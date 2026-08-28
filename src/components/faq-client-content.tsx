"use client";

import { useState, useRef, useEffect } from "react";
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

const CATEGORY_ICONS: Record<string, string> = {
  General: "💬",
  Orders: "📦",
  Shipping: "🚚",
  Payments: "💳",
  Returns: "↩️",
  Sellers: "🏪",
  Accounts: "👤",
  Products: "🛒",
  Security: "🔒",
  Support: "🛟",
};

function AccordionItem({
  question,
  answer,
  updatedAt,
  isOpen,
  onToggle,
}: {
  question: string;
  answer: string;
  updatedAt: string;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (bodyRef.current) {
      setHeight(isOpen ? bodyRef.current.scrollHeight : 0);
    }
  }, [isOpen]);

  return (
    <div
      className={`faq-accordion-item ${isOpen ? "faq-open" : ""}`}
      onClick={onToggle}
    >
      <div className="faq-accordion-header">
        <span className="faq-question">{question}</span>
        <span className={`faq-chevron ${isOpen ? "rotated" : ""}`}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </span>
      </div>
      <div
        className="faq-accordion-body"
        style={{ height: `${height}px` }}
      >
        <div ref={bodyRef} className="faq-accordion-inner">
          <p className="faq-answer">{answer}</p>
          <span className="faq-updated">
            Updated {new Date(updatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
          </span>
        </div>
      </div>
    </div>
  );
}

export function FAQClientContent({ faqs, grouped, categories }: Props) {
  const { t, lang } = useTranslation();
  const isFr = lang === "fr";
  const totalFaqs = faqs.length;

  const [activeCategory, setActiveCategory] = useState<string>(categories[0] ?? "General");
  const [openId, setOpenId] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  const currentItems = grouped[activeCategory] ?? [];
  const filtered = search.trim()
    ? currentItems.filter((f) => {
        const q = isFr && f.question_fr ? f.question_fr : f.question;
        const a = isFr && f.answer_fr ? f.answer_fr : f.answer;
        const s = search.toLowerCase();
        return q.toLowerCase().includes(s) || a.toLowerCase().includes(s);
      })
    : currentItems;

  return (
    <main className="faq-root">
      <style>{`
        .faq-root {
          min-height: 80vh;
          padding-bottom: 4rem;
        }

        /* ── HERO ─────────────────────────────────────────── */
        .faq-hero {
          position: relative;
          overflow: hidden;
          padding: 5rem 1.5rem 4rem;
          text-align: center;
          background: linear-gradient(135deg, #0f1729 0%, #1a2744 40%, #0e2439 100%);
        }
        .faq-hero::before {
          content: "";
          position: absolute;
          inset: 0;
          background:
            radial-gradient(ellipse 70% 60% at 20% 40%, rgba(102,120,255,0.22) 0%, transparent 60%),
            radial-gradient(ellipse 50% 50% at 80% 70%, rgba(16,185,129,0.18) 0%, transparent 55%);
          pointer-events: none;
        }
        .faq-hero-grid {
          position: absolute;
          inset: 0;
          background-image: linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
          background-size: 40px 40px;
          pointer-events: none;
        }
        .faq-hero-inner {
          position: relative;
          z-index: 1;
          max-width: 680px;
          margin: 0 auto;
        }
        .faq-hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          background: rgba(102,120,255,0.15);
          border: 1px solid rgba(102,120,255,0.35);
          color: #a5b4fc;
          font-size: 0.7rem;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          padding: 0.35rem 1rem;
          border-radius: 999px;
          margin-bottom: 1.4rem;
        }
        .faq-hero h1 {
          font-size: clamp(2rem, 5vw, 3.2rem);
          font-weight: 900;
          line-height: 1.1;
          color: #fff;
          margin-bottom: 1rem;
        }
        .faq-hero h1 span {
          background: linear-gradient(90deg, #6678ff, #34d399);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .faq-hero p {
          color: rgba(255,255,255,0.6);
          font-size: 1rem;
          line-height: 1.7;
          max-width: 540px;
          margin: 0 auto 2rem;
        }
        .faq-stats {
          display: flex;
          justify-content: center;
          gap: 1.5rem;
          flex-wrap: wrap;
        }
        .faq-stat {
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 12px;
          padding: 0.6rem 1.2rem;
          color: rgba(255,255,255,0.7);
          font-size: 0.78rem;
          font-weight: 600;
        }
        .faq-stat strong {
          color: #fff;
          margin-right: 0.3rem;
        }

        /* ── SEARCH ───────────────────────────────────────── */
        .faq-search-wrap {
          max-width: 520px;
          margin: 0 auto 0;
          position: relative;
        }
        .faq-search-wrap svg {
          position: absolute;
          left: 1rem;
          top: 50%;
          transform: translateY(-50%);
          color: rgba(255,255,255,0.4);
          pointer-events: none;
        }
        .faq-search {
          width: 100%;
          padding: 0.85rem 1rem 0.85rem 2.8rem;
          border-radius: 999px;
          border: 1.5px solid rgba(255,255,255,0.15);
          background: rgba(255,255,255,0.07);
          color: #fff;
          font-size: 0.9rem;
          outline: none;
          transition: border-color 0.2s, background 0.2s;
          backdrop-filter: blur(8px);
        }
        .faq-search::placeholder { color: rgba(255,255,255,0.35); }
        .faq-search:focus {
          border-color: rgba(102,120,255,0.6);
          background: rgba(255,255,255,0.1);
        }

        /* ── BODY ─────────────────────────────────────────── */
        .faq-body {
          max-width: 860px;
          margin: 0 auto;
          padding: 2.5rem 1.25rem 0;
        }

        /* ── TABS ─────────────────────────────────────────── */
        .faq-tabs {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-bottom: 1.75rem;
        }
        .faq-tab {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.45rem 1.1rem;
          border-radius: 999px;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          border: 1.5px solid #e2e8f0;
          background: #fff;
          color: #64748b;
          transition: all 0.18s ease;
        }
        .faq-tab:hover {
          border-color: #6678ff;
          color: #6678ff;
        }
        .faq-tab.active {
          background: linear-gradient(135deg, #6678ff, #818cf8);
          border-color: transparent;
          color: #fff;
          box-shadow: 0 4px 14px rgba(102,120,255,0.35);
        }
        .faq-tab-count {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          font-size: 0.65rem;
          font-weight: 800;
          background: rgba(0,0,0,0.1);
        }
        .faq-tab.active .faq-tab-count {
          background: rgba(255,255,255,0.25);
        }

        /* ── ACCORDION ────────────────────────────────────── */
        .faq-list {
          display: flex;
          flex-direction: column;
          gap: 0.65rem;
        }
        .faq-accordion-item {
          border-radius: 14px;
          border: 1.5px solid #e8edf5;
          background: #fff;
          cursor: pointer;
          transition: border-color 0.2s, box-shadow 0.2s;
          overflow: hidden;
        }
        .faq-accordion-item:hover {
          border-color: #c7d0ff;
          box-shadow: 0 4px 20px rgba(102,120,255,0.08);
        }
        .faq-accordion-item.faq-open {
          border-color: #6678ff;
          box-shadow: 0 6px 24px rgba(102,120,255,0.13);
        }
        .faq-accordion-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          padding: 1.1rem 1.25rem;
        }
        .faq-question {
          font-size: 0.92rem;
          font-weight: 650;
          color: #1e293b;
          line-height: 1.45;
          flex: 1;
        }
        .faq-open .faq-question { color: #4f46e5; }
        .faq-chevron {
          flex-shrink: 0;
          color: #94a3b8;
          transition: transform 0.28s cubic-bezier(0.4,0,0.2,1), color 0.2s;
        }
        .faq-chevron.rotated { transform: rotate(180deg); color: #6678ff; }
        .faq-accordion-body {
          overflow: hidden;
          transition: height 0.32s cubic-bezier(0.4,0,0.2,1);
        }
        .faq-accordion-inner {
          padding: 0 1.25rem 1.25rem;
          border-top: 1px solid #f1f5f9;
          margin-top: 0;
        }
        .faq-answer {
          font-size: 0.875rem;
          line-height: 1.75;
          color: #475569;
          white-space: pre-wrap;
          margin-top: 1rem;
        }
        .faq-updated {
          display: block;
          margin-top: 0.75rem;
          font-size: 0.72rem;
          color: #94a3b8;
          font-style: italic;
        }

        /* ── EMPTY ────────────────────────────────────────── */
        .faq-empty {
          text-align: center;
          padding: 4rem 1rem;
          color: #94a3b8;
        }
        .faq-empty-icon {
          font-size: 3rem;
          margin-bottom: 1rem;
        }
        .faq-empty h3 {
          font-size: 1.1rem;
          font-weight: 700;
          color: #475569;
          margin-bottom: 0.5rem;
        }
        .faq-empty p { font-size: 0.875rem; }

        /* ── CTA BOTTOM ───────────────────────────────────── */
        .faq-cta {
          margin-top: 3.5rem;
          border-radius: 20px;
          background: linear-gradient(135deg, #0f1729, #1a2744);
          padding: 2.5rem 2rem;
          text-align: center;
          position: relative;
          overflow: hidden;
        }
        .faq-cta::before {
          content: "";
          position: absolute;
          inset: 0;
          background: radial-gradient(ellipse 60% 80% at 50% 110%, rgba(102,120,255,0.3) 0%, transparent 70%);
          pointer-events: none;
        }
        .faq-cta-inner { position: relative; z-index: 1; }
        .faq-cta h2 {
          font-size: 1.4rem;
          font-weight: 800;
          color: #fff;
          margin-bottom: 0.5rem;
        }
        .faq-cta p {
          color: rgba(255,255,255,0.55);
          font-size: 0.875rem;
          margin-bottom: 1.5rem;
        }
        .faq-cta-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 2rem;
          border-radius: 999px;
          background: linear-gradient(135deg, #6678ff, #34d399);
          color: #fff;
          font-size: 0.875rem;
          font-weight: 700;
          text-decoration: none;
          transition: opacity 0.2s, transform 0.2s;
          box-shadow: 0 6px 20px rgba(102,120,255,0.4);
        }
        .faq-cta-btn:hover { opacity: 0.9; transform: translateY(-1px); }
      `}</style>

      {/* ── Hero ── */}
      <div className="faq-hero">
        <div className="faq-hero-grid" />
        <div className="faq-hero-inner">
          <div className="faq-hero-badge">
            <span>❓</span> Help Center
          </div>
          <h1>
            Got <span>Questions?</span><br />We Have Answers.
          </h1>
          <p>
            Everything you need to know about Bushbuyer — orders, deliveries, payments, and more.
          </p>

          <div className="faq-search-wrap" style={{ marginBottom: "1.75rem" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              className="faq-search"
              placeholder="Search questions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="faq-stats">
            <div className="faq-stat"><strong>{totalFaqs}</strong> answers</div>
            <div className="faq-stat"><strong>{categories.length}</strong> categories</div>
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="faq-body">

        {/* Category Tabs */}
        {!search.trim() && (
          <div className="faq-tabs">
            {categories.map((cat) => (
              <button
                key={cat}
                className={`faq-tab${activeCategory === cat ? " active" : ""}`}
                onClick={() => { setActiveCategory(cat); setOpenId(null); }}
              >
                <span>{CATEGORY_ICONS[cat] ?? "📌"}</span>
                {cat}
                <span className="faq-tab-count">{grouped[cat].length}</span>
              </button>
            ))}
          </div>
        )}

        {/* Accordion Items */}
        {totalFaqs === 0 ? (
          <div className="faq-empty">
            <div className="faq-empty-icon">📭</div>
            <h3>No questions yet</h3>
            <p>Check back soon — we're adding answers all the time.</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="faq-empty">
            <div className="faq-empty-icon">🔍</div>
            <h3>No results found</h3>
            <p>Try a different search term or browse a category.</p>
          </div>
        ) : (
          <div className="faq-list">
            {filtered.map((item) => {
              const q = isFr && item.question_fr?.trim() ? item.question_fr : item.question;
              const a = isFr && item.answer_fr?.trim() ? item.answer_fr : item.answer;
              return (
                <AccordionItem
                  key={item.id}
                  question={q}
                  answer={a}
                  updatedAt={item.updated_at}
                  isOpen={openId === item.id}
                  onToggle={() => setOpenId(openId === item.id ? null : item.id)}
                />
              );
            })}
          </div>
        )}

        {/* CTA Bottom */}
        <div className="faq-cta">
          <div className="faq-cta-inner">
            <h2>Still have questions?</h2>
            <p>Our support team is ready to help you 24/7.</p>
            <a href="/contact" className="faq-cta-btn">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
              Contact Support
            </a>
          </div>
        </div>

      </div>
    </main>
  );
}
