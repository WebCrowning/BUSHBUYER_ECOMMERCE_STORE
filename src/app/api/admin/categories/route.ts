import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdminApi } from "@/lib/authz";
import { z } from "zod";

export type CategoryRow = {
  id: number;
  name: string;
  slug: string;
  icon: string | null;
  description: string | null;
  color: string;
  sort_order: number;
  is_active: number;
  product_count?: number;
  created_at: string;
  updated_at: string;
};

const categorySchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(120),
  slug: z.string().min(2).max(120).regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers and hyphens only").optional(),
  icon: z.string().max(20).optional().default("📦"),
  description: z.string().max(500).optional().nullable(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Color must be a valid hex code").optional().default("#6B7280"),
  sort_order: z.number().int().min(0).optional().default(0),
  is_active: z.boolean().optional().default(true),
});

function toSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/**
 * GET /api/admin/categories
 * Public-readable: returns all active categories with product counts.
 * No auth required for GET (used by public products page and product forms).
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get("active") !== "false"; // default: only active

    const rows = await query<CategoryRow[]>(
      `SELECT c.*,
              COUNT(p.id) AS product_count
       FROM categories c
       LEFT JOIN products p ON p.category = c.name AND p.status = 'active' AND p.marketplace_enabled = 1
       ${activeOnly ? "WHERE c.is_active = 1" : ""}
       GROUP BY c.id
       ORDER BY c.sort_order ASC, c.name ASC`
    );

    return NextResponse.json({ categories: rows });
  } catch (err) {
    console.error("Categories GET error:", err);
    return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 });
  }
}

/**
 * POST /api/admin/categories
 * Creates a new category. Admin only.
 */
export async function POST(request: Request) {
  const access = await requireAdminApi();
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const body = await request.json().catch(() => null);
  const parsed = categorySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid data" }, { status: 400 });
  }

  const { name, icon, description, color, sort_order, is_active } = parsed.data;
  const slug = parsed.data.slug || toSlug(name);

  // Check uniqueness
  const [existing] = await query<{ id: number }[]>(
    "SELECT id FROM categories WHERE slug = ? OR LOWER(name) = LOWER(?) LIMIT 1",
    [slug, name]
  );
  if (existing) {
    return NextResponse.json({ error: "A category with this name or slug already exists" }, { status: 409 });
  }

  try {
    const result = await query<{ insertId: number }>(
      `INSERT INTO categories (name, slug, icon, description, color, sort_order, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [name, slug, icon ?? "📦", description ?? null, color ?? "#6B7280", sort_order ?? 0, is_active ? 1 : 0]
    );

    const [newRow] = await query<CategoryRow[]>("SELECT * FROM categories WHERE id = ? LIMIT 1", [result.insertId]);
    return NextResponse.json({ ok: true, category: newRow }, { status: 201 });
  } catch (err) {
    console.error("Categories POST error:", err);
    return NextResponse.json({ error: "Failed to create category" }, { status: 500 });
  }
}

/**
 * PUT /api/admin/categories
 * Updates an existing category by id. Admin only.
 * Body must include { id: number, ...fields }
 */
export async function PUT(request: Request) {
  const access = await requireAdminApi();
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const body = await request.json().catch(() => null);
  const id = parseInt(body?.id, 10);
  if (isNaN(id)) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const parsed = categorySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid data" }, { status: 400 });
  }

  const { name, icon, description, color, sort_order, is_active } = parsed.data;
  const slug = parsed.data.slug || toSlug(name);

  // Check slug uniqueness (exclude current row)
  const [conflict] = await query<{ id: number }[]>(
    "SELECT id FROM categories WHERE (slug = ? OR LOWER(name) = LOWER(?)) AND id != ? LIMIT 1",
    [slug, name, id]
  );
  if (conflict) {
    return NextResponse.json({ error: "Another category with this name or slug already exists" }, { status: 409 });
  }

  try {
    await query(
      `UPDATE categories SET name=?, slug=?, icon=?, description=?, color=?, sort_order=?, is_active=?, updated_at=NOW()
       WHERE id=?`,
      [name, slug, icon ?? "📦", description ?? null, color ?? "#6B7280", sort_order ?? 0, is_active ? 1 : 0, id]
    );

    // Sync products.category text field when category name changes
    await query("UPDATE products SET category = ? WHERE category_id = ?", [name, id]);

    const [updated] = await query<CategoryRow[]>("SELECT * FROM categories WHERE id = ? LIMIT 1", [id]);
    return NextResponse.json({ ok: true, category: updated });
  } catch (err) {
    console.error("Categories PUT error:", err);
    return NextResponse.json({ error: "Failed to update category" }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/categories?id=X
 * Soft-deletes (deactivates) a category. Products keep their category text.
 * Admin only.
 */
export async function DELETE(request: Request) {
  const access = await requireAdminApi();
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { searchParams } = new URL(request.url);
  const id = parseInt(searchParams.get("id") ?? "", 10);
  if (isNaN(id)) {
    return NextResponse.json({ error: "id query param required" }, { status: 400 });
  }

  // Cannot delete if it has active products
  const [inUse] = await query<{ cnt: number }[]>(
    "SELECT COUNT(*) AS cnt FROM products WHERE category_id = ? AND status = 'active'",
    [id]
  );
  if (Number(inUse?.cnt) > 0) {
    // Soft-deactivate instead of hard delete
    await query("UPDATE categories SET is_active = 0 WHERE id = ?", [id]);
    return NextResponse.json({ ok: true, softDeleted: true, message: "Category deactivated (has active products)" });
  }

  await query("DELETE FROM categories WHERE id = ?", [id]);
  return NextResponse.json({ ok: true, softDeleted: false });
}
