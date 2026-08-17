import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireStoreOrAdminApi } from "@/lib/authz";
import { z } from "zod";
import { toId } from "@/lib/utils";

type Params = { params: Promise<{ id: string }> };

type FaqRow = {
  id: number;
  question: string;
  answer: string;
  category: string;
  store_id: number | null;
  created_by: number | null;
  created_at: string;
  updated_at: string;
};

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

/**
 * PUT /api/seller/faq/[id]
 * Updates a FAQ entry. Only allowed if the FAQ belongs to the seller's store.
 */
export async function PUT(request: Request, { params }: Params) {
  const access = await requireStoreOrAdminApi();
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { id } = await params;
  const faqId = toId(id);
  if (!faqId) {
    return NextResponse.json({ error: "Invalid FAQ id" }, { status: 400 });
  }

  // Verify ownership — FAQ must belong to one of the seller's stores
  const existing = await query<FaqRow[]>(
    "SELECT id, store_id FROM faq WHERE id = ? LIMIT 1",
    [faqId]
  );

  if (!existing[0]) {
    return NextResponse.json({ error: "FAQ not found" }, { status: 404 });
  }

  const isSuperAdmin = access.isSuperAdmin;
  const faqStoreId = existing[0].store_id;

  if (!isSuperAdmin) {
    // Sellers can only edit their own store's FAQs — not global FAQs
    if (faqStoreId === null || !access.userStoreIds.includes(faqStoreId)) {
      return NextResponse.json(
        { error: "You can only edit FAQ items that belong to your store" },
        { status: 403 }
      );
    }
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
    await query(
      "UPDATE faq SET question = ?, answer = ?, category = ?, updated_at = NOW() WHERE id = ?",
      [parsed.data.question, parsed.data.answer, parsed.data.category, faqId]
    );

    // Return updated list for the store
    const storeId = faqStoreId ?? access.primaryStoreId;
    const faqs = await query<FaqRow[]>(
      `SELECT id, question, answer, category, store_id, created_by, created_at, updated_at
       FROM faq WHERE store_id = ? ORDER BY category ASC, updated_at DESC`,
      [storeId]
    );

    return NextResponse.json({
      ok: true,
      faqs: faqs.map((f) => ({ ...f, is_global: false })),
      hasStoreFaqs: true,
      storeId,
    });
  } catch (err) {
    console.error("Seller FAQ PUT error:", err);
    return NextResponse.json({ error: "Failed to update FAQ" }, { status: 500 });
  }
}

/**
 * DELETE /api/seller/faq/[id]
 * Deletes a FAQ entry. Only allowed if it belongs to the seller's store.
 */
export async function DELETE(_request: Request, { params }: Params) {
  const access = await requireStoreOrAdminApi();
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { id } = await params;
  const faqId = toId(id);
  if (!faqId) {
    return NextResponse.json({ error: "Invalid FAQ id" }, { status: 400 });
  }

  const existing = await query<FaqRow[]>(
    "SELECT id, store_id FROM faq WHERE id = ? LIMIT 1",
    [faqId]
  );

  if (!existing[0]) {
    return NextResponse.json({ error: "FAQ not found" }, { status: 404 });
  }

  const isSuperAdmin = access.isSuperAdmin;
  const faqStoreId = existing[0].store_id;

  if (!isSuperAdmin) {
    if (faqStoreId === null || !access.userStoreIds.includes(faqStoreId)) {
      return NextResponse.json(
        { error: "You can only delete FAQ items that belong to your store" },
        { status: 403 }
      );
    }
  }

  try {
    const storeId = faqStoreId ?? access.primaryStoreId;
    await query("DELETE FROM faq WHERE id = ?", [faqId]);

    // Return updated list — may now fall back to global if last store FAQ was deleted
    const remaining = await query<FaqRow[]>(
      "SELECT id FROM faq WHERE store_id = ? LIMIT 1",
      [storeId]
    );

    if (remaining.length > 0) {
      const faqs = await query<FaqRow[]>(
        `SELECT id, question, answer, category, store_id, created_by, created_at, updated_at
         FROM faq WHERE store_id = ? ORDER BY category ASC, updated_at DESC`,
        [storeId]
      );
      return NextResponse.json({
        ok: true,
        faqs: faqs.map((f) => ({ ...f, is_global: false })),
        hasStoreFaqs: true,
        storeId,
      });
    }

    // Last store FAQ deleted — return global fallback
    const globalFaqs = await query<FaqRow[]>(
      `SELECT id, question, answer, category, store_id, created_by, created_at, updated_at
       FROM faq WHERE store_id IS NULL ORDER BY category ASC, updated_at DESC`
    );
    return NextResponse.json({
      ok: true,
      faqs: globalFaqs.map((f) => ({ ...f, is_global: true })),
      hasStoreFaqs: false,
      storeId,
    });
  } catch (err) {
    console.error("Seller FAQ DELETE error:", err);
    return NextResponse.json({ error: "Failed to delete FAQ" }, { status: 500 });
  }
}
