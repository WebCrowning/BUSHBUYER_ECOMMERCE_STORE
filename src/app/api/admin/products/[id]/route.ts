import { NextResponse } from "next/server";
import { productSchema } from "@/lib/validation";
import { query } from "@/lib/db";
import { toId } from "@/lib/utils";
import { requireStoreOrAdminApi } from "@/lib/authz";

type DbResult = {
  affectedRows: number;
};

function normalizeCategory(category: string) {
  const normalized = category.trim().replace(/\s+/g, " ");
  return normalized.length > 0 ? normalized : "General";
}

type Params = {
  params: Promise<{ id: string }>;
};

export async function PUT(request: Request, { params }: Params) {
  const access = await requireStoreOrAdminApi();
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { id } = await params;
  const productId = toId(id);
  if (!productId) {
    return NextResponse.json({ error: "Invalid product id" }, { status: 400 });
  }

  // For non-super admins, verify the product belongs to their store and is not global index catalog (0)
  if (!access.isSuperAdmin) {
    const existing = await query<Array<{ store_id: number }>>(
      "SELECT store_id FROM products WHERE id = ?",
      [productId]
    );
    if (!existing.length || existing[0].store_id === 0 || !access.userStoreIds.includes(existing[0].store_id)) {
      return NextResponse.json({ error: "Forbidden: Store roles can only manage items in their specified store" }, { status: 403 });
    }
  }

  const payload = await request.json().catch(() => null);
  const parsed = productSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const category = normalizeCategory(parsed.data.category);

    const result = await query<DbResult>(
      `UPDATE products
       SET name = ?, price = ?, transport_fee = ?, image = ?, image_zoom = ?, description = ?, featured = ?, category = ?, package_name = ?, unit_type = ?, unit_value = ?, stock_packages = ?
       WHERE id = ?`,
      [
        parsed.data.name,
        parsed.data.price,
        parsed.data.transportFee,
        parsed.data.image,
        parsed.data.imageZoom,
        parsed.data.description,
        parsed.data.featured,
        category,
        parsed.data.packageName,
        parsed.data.unitType,
        parsed.data.unitValue,
        parsed.data.stockPackages,
        productId,
      ],
    );

    if ((result as unknown as DbResult).affectedRows === 0) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: Params) {
  const access = await requireStoreOrAdminApi();
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { id } = await params;
  const productId = toId(id);
  if (!productId) {
    return NextResponse.json({ error: "Invalid product id" }, { status: 400 });
  }

  // Check product existence and permissions
  const existing = await query<Array<{ id: number; store_id: number; status: string }>>(
    "SELECT id, store_id, status FROM products WHERE id = ?",
    [productId]
  );
  if (!existing.length) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  // Non-super admins can only edit their store's products and cannot unblock if blocked by admin
  if (!access.isSuperAdmin) {
    if (existing[0].store_id === 0 || !access.userStoreIds.includes(existing[0].store_id)) {
      return NextResponse.json({ error: "Forbidden: You do not have permission to manage this product" }, { status: 403 });
    }
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
  }

  try {
    const updates: string[] = [];
    const paramsList: any[] = [];

    // Admin blocking / unblocking moderation
    if (body.action === "block" || body.status === "blocked" || body.isBlocked === true || body.admin_blocked === 1) {
      if (!access.isSuperAdmin) {
        return NextResponse.json({ error: "Only platform administrators can block or unblock products" }, { status: 403 });
      }
      updates.push("status = 'blocked'", "marketplace_enabled = 0", "admin_blocked = 1");
      if (body.reason !== undefined) {
        updates.push("admin_block_reason = ?");
        paramsList.push(String(body.reason || "Violates platform policy or guidelines"));
      }
    } else if (body.action === "unblock" || (body.status === "active" && body.isBlocked === false)) {
      if (!access.isSuperAdmin) {
        return NextResponse.json({ error: "Only platform administrators can unblock products" }, { status: 403 });
      }
      updates.push("status = 'active'", "marketplace_enabled = 1", "admin_blocked = 0", "admin_block_reason = NULL");
    } else {
      // Normal partial updates
      if (body.status !== undefined) {
        updates.push("status = ?");
        paramsList.push(body.status);
      }
      if (body.marketplace_enabled !== undefined) {
        updates.push("marketplace_enabled = ?");
        paramsList.push(body.marketplace_enabled ? 1 : 0);
      }
      if (body.featured !== undefined) {
        updates.push("featured = ?");
        paramsList.push(body.featured ? 1 : 0);
      }
      if (body.stockPackages !== undefined) {
        updates.push("stock_packages = ?");
        paramsList.push(Number(body.stockPackages));
      }
      if (body.imageZoom !== undefined) {
        updates.push("image_zoom = ?");
        paramsList.push(Number(body.imageZoom));
      }
      if (body.image !== undefined) {
        updates.push("image = ?");
        paramsList.push(String(body.image));
      }
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    paramsList.push(productId);
    await query(`UPDATE products SET ${updates.join(", ")} WHERE id = ?`, paramsList);

    const updated = await query<Array<Record<string, any>>>(
      "SELECT id, name, status, marketplace_enabled, admin_blocked, admin_block_reason FROM products WHERE id = ?",
      [productId]
    );

    return NextResponse.json({ ok: true, product: updated[0] });
  } catch (err) {
    console.error("Product patch error:", err);
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: Params) {
  const access = await requireStoreOrAdminApi();
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { id } = await params;
  const productId = toId(id);
  if (!productId) {
    return NextResponse.json({ error: "Invalid product id" }, { status: 400 });
  }

  // For non-super admins, verify the product belongs to their store and is not global index catalog (0)
  if (!access.isSuperAdmin) {
    const existing = await query<Array<{ store_id: number }>>(
      "SELECT store_id FROM products WHERE id = ?",
      [productId]
    );
    if (!existing.length || existing[0].store_id === 0 || !access.userStoreIds.includes(existing[0].store_id)) {
      return NextResponse.json({ error: "Forbidden: Store roles can only manage items in their specified store" }, { status: 403 });
    }
  }

  try {
    await query("DELETE FROM products WHERE id = ?", [productId]);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete product" }, { status: 500 });
  }
}
