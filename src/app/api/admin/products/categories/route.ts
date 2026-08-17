import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireStoreOrAdminApi } from "@/lib/authz";

type DeleteCategoryPayload = {
  category?: string;
  reassignTo?: string;
  storeId?: number;
};

function normalizeCategory(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export async function DELETE(request: Request) {
  const access = await requireStoreOrAdminApi();
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const payload = (await request.json().catch(() => null)) as DeleteCategoryPayload | null;
  const rawCategory = String(payload?.category ?? "");
  const rawReassign = String(payload?.reassignTo ?? "General");
  const targetStoreId = !access.isSuperAdmin ? access.primaryStoreId : (payload?.storeId !== undefined && payload?.storeId !== null ? Number(payload.storeId) : 0);

  if (!targetStoreId) {
    return NextResponse.json({ error: "Forbidden: No valid store specified" }, { status: 403 });
  }

  const category = normalizeCategory(rawCategory);
  const reassignTo = normalizeCategory(rawReassign) || "General";

  if (!category) {
    return NextResponse.json({ error: "Category is required" }, { status: 400 });
  }

  if (category.toLowerCase() === "general") {
    return NextResponse.json({ error: "General category cannot be deleted" }, { status: 400 });
  }

  if (category.toLowerCase() === reassignTo.toLowerCase()) {
    return NextResponse.json({ error: "Reassignment category must be different" }, { status: 400 });
  }

  try {
    const result = await query<{ affectedRows: number }>(
      `UPDATE products
       SET category = ?
       WHERE store_id = ? AND LOWER(TRIM(category)) = LOWER(TRIM(?))`,
      [reassignTo, targetStoreId, category],
    );

    return NextResponse.json({
      ok: true,
      affectedRows: (result as unknown as { affectedRows: number }).affectedRows ?? 0,
      reassignTo,
    });
  } catch {
    return NextResponse.json({ error: "Failed to delete category" }, { status: 500 });
  }
}
