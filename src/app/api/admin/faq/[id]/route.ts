import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdminApi } from "@/lib/authz";
import { z } from "zod";
import { toId } from "@/lib/utils";

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

type Params = {
  params: Promise<{ id: string }>;
};

export async function PUT(request: Request, { params }: Params) {
  const access = await requireAdminApi();
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { id } = await params;
  const faqId = toId(id);
  if (!faqId) {
    return NextResponse.json({ error: "Invalid FAQ id" }, { status: 400 });
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
    await query(
      "UPDATE faq SET question = ?, answer = ?, question_fr = ?, answer_fr = ?, category = ?, updated_at = NOW() WHERE id = ?",
      [
        parsed.data.question,
        parsed.data.answer,
        parsed.data.question_fr ?? null,
        parsed.data.answer_fr ?? null,
        parsed.data.category,
        faqId,
      ],
    );
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to update FAQ" }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: Params) {
  const access = await requireAdminApi();
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { id } = await params;
  const faqId = toId(id);
  if (!faqId) {
    return NextResponse.json({ error: "Invalid FAQ id" }, { status: 400 });
  }

  try {
    await query("DELETE FROM faq WHERE id = ?", [faqId]);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete FAQ" }, { status: 500 });
  }
}
