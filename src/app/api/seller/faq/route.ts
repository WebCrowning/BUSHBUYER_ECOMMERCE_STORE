import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireStoreOrAdminApi } from "@/lib/authz";
import { z } from "zod";

const faqSchema = z.object({
  question: z.string().min(5, "Question must be at least 5 characters").max(500),
  answer: z.string().min(10, "Answer must be at least 10 characters").max(5000),
  category: z
    .string()
    .trim()
    .max(100)
    .optional()
    .transform((v) => (v && v.length >= 2 ? v : "General")),
});

type FaqRow = {
  id: number;
  question: string;
  answer: string;
  category: string;
  store_id: number | null;
  created_by: number | null;
  created_at: string;
  updated_at: string;
  is_global: boolean;
};

/**
 * GET /api/seller/faq
 *
 * Returns FAQs for the seller's primary store.
 * If the store has its own FAQ entries, those are returned.
 * Otherwise falls back to global FAQs (store_id IS NULL).
 *
 * Response:
 *   { faqs: FaqRow[], hasStoreFaqs: boolean, storeId: number }
 *
 * hasStoreFaqs = true  → these are the store's own FAQs (editable)
 * hasStoreFaqs = false → these are global fallback FAQs (read-only in store context)
 */
export async function GET(request: Request) {
  const access = await requireStoreOrAdminApi();
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { searchParams } = new URL(request.url);
  // Allow explicit storeId override for super admins managing a specific store
  const overrideStoreId = searchParams.get("storeId");
  const storeId = overrideStoreId
    ? parseInt(overrideStoreId, 10)
    : access.primaryStoreId;

  if (!storeId || isNaN(storeId)) {
    return NextResponse.json({ error: "No store associated with your account" }, { status: 400 });
  }

  try {
    // 1. Try to fetch store-specific FAQs
    const storeFaqs = await query<FaqRow[]>(
      `SELECT id, question, answer, category, store_id, created_by, created_at, updated_at
       FROM faq
       WHERE store_id = ?
       ORDER BY category ASC, updated_at DESC`,
      [storeId]
    );

    if (storeFaqs.length > 0) {
      return NextResponse.json({
        faqs: storeFaqs.map((f) => ({ ...f, is_global: false })),
        hasStoreFaqs: true,
        storeId,
      });
    }

    // 2. Fall back to global FAQs (store_id IS NULL)
    const globalFaqs = await query<FaqRow[]>(
      `SELECT id, question, answer, category, store_id, created_by, created_at, updated_at
       FROM faq
       WHERE store_id IS NULL
       ORDER BY category ASC, updated_at DESC`
    );

    return NextResponse.json({
      faqs: globalFaqs.map((f) => ({ ...f, is_global: true })),
      hasStoreFaqs: false,
      storeId,
    });
  } catch (err) {
    console.error("Seller FAQ GET error:", err);
    return NextResponse.json({ error: "Failed to fetch FAQs" }, { status: 500 });
  }
}

/**
 * POST /api/seller/faq
 * Creates a new FAQ entry scoped to the seller's store.
 */
export async function POST(request: Request) {
  const access = await requireStoreOrAdminApi();
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { searchParams } = new URL(request.url);
  const overrideStoreId = searchParams.get("storeId");
  const storeId = overrideStoreId
    ? parseInt(overrideStoreId, 10)
    : access.primaryStoreId;

  if (!storeId || isNaN(storeId)) {
    return NextResponse.json({ error: "No store associated with your account" }, { status: 400 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = faqSchema.safeParse(payload);

  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return NextResponse.json(
      { error: firstIssue?.message ?? "Invalid FAQ data" },
      { status: 400 }
    );
  }

  try {
    const userId = Number(access.session.user.id);
    await query(
      "INSERT INTO faq (question, answer, category, store_id, created_by) VALUES (?, ?, ?, ?, ?)",
      [parsed.data.question, parsed.data.answer, parsed.data.category, storeId, userId]
    );

    // Return updated list
    const faqs = await query<FaqRow[]>(
      `SELECT id, question, answer, category, store_id, created_by, created_at, updated_at
       FROM faq WHERE store_id = ? ORDER BY category ASC, updated_at DESC`,
      [storeId]
    );

    return NextResponse.json(
      { ok: true, faqs: faqs.map((f) => ({ ...f, is_global: false })), hasStoreFaqs: true, storeId },
      { status: 201 }
    );
  } catch (err) {
    console.error("Seller FAQ POST error:", err);
    return NextResponse.json({ error: "Failed to create FAQ" }, { status: 500 });
  }
}
