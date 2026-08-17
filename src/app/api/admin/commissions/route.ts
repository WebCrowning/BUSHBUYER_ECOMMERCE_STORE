import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdminApi } from "@/lib/authz";
import { z } from "zod";

const commissionSchema = z.object({
  level: z.enum(["global", "category", "store"]),
  target_id: z.string().trim().max(120).optional().nullable(),
  rate_percentage: z.number().min(0).max(100),
  description: z.string().max(500).optional().nullable(),
  holding_period_days: z.number().int().min(0).max(90).optional().default(0),
  is_active: z.boolean().optional().default(true),
});

type CommissionRow = {
  id: number;
  level: "global" | "category" | "store";
  target_id: string | null;
  rate_percentage: number;
  description: string | null;
  holding_period_days: number;
  is_active: number;
  created_at: string;
  updated_at: string | null;
  updated_by: number | null;
  updated_by_name: string | null;
  // Resolved names for display
  store_name?: string | null;
};

/**
 * GET /api/admin/commissions
 * Returns all commission rules with resolved store/category names.
 */
export async function GET() {
  const access = await requireAdminApi();
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  try {
    const rows = await query<CommissionRow[]>(
      `SELECT
         c.*,
         u.name AS updated_by_name,
         CASE WHEN c.level = 'store' THEN s.name ELSE NULL END AS store_name
       FROM commissions c
       LEFT JOIN users u ON u.id = c.updated_by
       LEFT JOIN stores s ON s.id = CASE WHEN c.level = 'store' THEN CAST(c.target_id AS UNSIGNED) ELSE NULL END
       ORDER BY
         FIELD(c.level, 'global', 'category', 'store'),
         c.rate_percentage ASC`
    );

    // Global effective rate (first active global rule)
    const globalRate = rows.find((r) => r.level === "global" && r.is_active)?.rate_percentage ?? 5.0;

    return NextResponse.json({ commissions: rows, globalRate });
  } catch (err) {
    console.error("Admin commissions GET error:", err);
    return NextResponse.json({ error: "Failed to fetch commission rates" }, { status: 500 });
  }
}

/**
 * POST /api/admin/commissions
 * Creates a new commission rule.
 */
export async function POST(request: Request) {
  const access = await requireAdminApi();
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const body = await request.json().catch(() => null);
  const parsed = commissionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid data" }, { status: 400 });
  }

  const { level, target_id, rate_percentage, description, holding_period_days, is_active } = parsed.data;
  const adminId = Number(access.session.user.id);

  // For global — deactivate existing global rules to enforce single active global rate
  if (level === "global" && is_active) {
    await query("UPDATE commissions SET is_active = 0 WHERE level = 'global' AND is_active = 1");
  }

  try {
    const result = await query<{ insertId: number }>(
      `INSERT INTO commissions (level, target_id, rate_percentage, description, holding_period_days, is_active, updated_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [level, target_id || null, rate_percentage, description || null, holding_period_days, is_active ? 1 : 0, adminId]
    );

    const [newRow] = await query<CommissionRow[]>(
      "SELECT * FROM commissions WHERE id = ? LIMIT 1",
      [result.insertId]
    );

    return NextResponse.json({ ok: true, commission: newRow }, { status: 201 });
  } catch (err) {
    console.error("Admin commissions POST error:", err);
    return NextResponse.json({ error: "Failed to create commission rule" }, { status: 500 });
  }
}

/**
 * PUT /api/admin/commissions
 * Updates an existing commission rule by id.
 * Body: { id: number, ...commissionSchema fields }
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

  const parsed = commissionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid data" }, { status: 400 });
  }

  const { level, target_id, rate_percentage, description, holding_period_days, is_active } = parsed.data;
  const adminId = Number(access.session.user.id);

  // For global — deactivate other global rules when enabling this one
  if (level === "global" && is_active) {
    await query("UPDATE commissions SET is_active = 0 WHERE level = 'global' AND is_active = 1 AND id != ?", [id]);
  }

  try {
    await query(
      `UPDATE commissions
       SET level = ?, target_id = ?, rate_percentage = ?, description = ?,
           holding_period_days = ?, is_active = ?, updated_by = ?, updated_at = NOW()
       WHERE id = ?`,
      [level, target_id || null, rate_percentage, description || null, holding_period_days, is_active ? 1 : 0, adminId, id]
    );

    const [updated] = await query<CommissionRow[]>(
      "SELECT * FROM commissions WHERE id = ? LIMIT 1",
      [id]
    );

    return NextResponse.json({ ok: true, commission: updated });
  } catch (err) {
    console.error("Admin commissions PUT error:", err);
    return NextResponse.json({ error: "Failed to update commission rule" }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/commissions?id=X
 * Soft-deletes (deactivates) a commission rule. Global rules cannot be deleted, only deactivated.
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

  try {
    const [row] = await query<{ level: string }[]>(
      "SELECT level FROM commissions WHERE id = ? LIMIT 1",
      [id]
    );

    if (!row) return NextResponse.json({ error: "Commission rule not found" }, { status: 404 });

    // Hard delete non-global rules; soft-deactivate global
    if (row.level === "global") {
      await query("UPDATE commissions SET is_active = 0 WHERE id = ?", [id]);
    } else {
      await query("DELETE FROM commissions WHERE id = ?", [id]);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Admin commissions DELETE error:", err);
    return NextResponse.json({ error: "Failed to delete commission rule" }, { status: 500 });
  }
}
