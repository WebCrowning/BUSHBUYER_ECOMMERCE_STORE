import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdminApi } from "@/lib/authz";
import { z } from "zod";

const faqSchema = z.object({
  question: z.string().min(5).max(500),
  answer: z.string().min(10).max(5000),
  question_fr: z.string().max(500).optional().nullable().transform((v) => (v && v.trim().length > 0 ? v.trim() : null)),
  answer_fr: z.string().max(5000).optional().nullable().transform((v) => (v && v.trim().length > 0 ? v.trim() : null)),
  category: z
    .string()
    .trim()
    .max(100)
    .optional()
    .transform((value) => (value && value.length >= 2 ? value : "General")),
});

type FAQ = {
  id: number;
  question: string;
  answer: string;
  question_fr?: string | null;
  answer_fr?: string | null;
  category: string;
  created_by: number | null;
  created_at: string;
  updated_at: string;
};

export async function GET() {
  const access = await requireAdminApi();
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  try {
    const faqs = await query<FAQ[]>(
      "SELECT id, question, answer, question_fr, answer_fr, category, created_by, created_at, updated_at FROM faq ORDER BY created_at DESC",
    );
    return NextResponse.json({ faqs });
  } catch {
    return NextResponse.json({ error: "Failed to fetch FAQs" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const access = await requireAdminApi();
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const payload = await request.json().catch(() => null);
  const parsed = faqSchema.safeParse(payload);

  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return NextResponse.json(
      { error: firstIssue?.message ?? "Invalid FAQ payload" },
      { status: 400 },
    );
  }

  try {
    const rawUserId = Number(access.session.user.id);
    const createdBy = Number.isInteger(rawUserId) && rawUserId > 0 ? rawUserId : null;

    await query(
      "INSERT INTO faq (question, answer, question_fr, answer_fr, category, created_by) VALUES (?, ?, ?, ?, ?, ?)",
      [
        parsed.data.question,
        parsed.data.answer,
        parsed.data.question_fr ?? null,
        parsed.data.answer_fr ?? null,
        parsed.data.category,
        createdBy,
      ],
    );
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    console.error("Failed to create FAQ:", error);
    return NextResponse.json({ error: "Failed to create FAQ" }, { status: 500 });
  }
}
