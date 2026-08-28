import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { productSchema } from "@/lib/validation";
import { requireStoreOrAdminApi } from "@/lib/authz";
import { validateSameOrigin } from "@/lib/request-security";
import type { Product } from "@/types";

function normalizeCategory(category: string) {
  const normalized = category.trim().replace(/\s+/g, " ");
  return normalized.length > 0 ? normalized : "General";
}

export async function GET(request: Request) {
  const access = await requireStoreOrAdminApi();
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { searchParams } = new URL(request.url);
  const paramStoreId = searchParams.get("store_id") || searchParams.get("storeId");

  try {
    let sql = `
      SELECT p.id, p.store_id AS storeId, p.name, p.price, p.discount_price AS discountPrice,
             p.transport_fee AS transportFee, p.image, p.image_zoom AS imageZoom,
             p.gallery_images AS galleryImages,
             p.description, p.featured, p.category,
             p.package_name AS packageName, p.unit_type AS unitType, p.unit_value AS unitValue,
             p.stock_packages AS stockPackages, p.status, p.marketplace_enabled,
             p.admin_blocked, p.admin_block_reason,
             s.name AS storeName, s.slug AS storeSlug
      FROM products p
      LEFT JOIN stores s ON s.id = p.store_id
    `;
    const params: any[] = [];

    if (!access.isSuperAdmin) {
      // Non-super admins restricted to their store
      sql += " WHERE p.store_id = ?";
      params.push(access.primaryStoreId);
    } else if (paramStoreId === "all") {
      // All stores for super admin
    } else if (paramStoreId !== null && paramStoreId !== undefined && paramStoreId !== "") {
      sql += " WHERE p.store_id = ?";
      params.push(Number(paramStoreId));
    } else {
      // Default to all for admin overview, or 0 if explicitly legacy
      // (When paramStoreId is not provided, super admin sees all products by default)
    }

    sql += " ORDER BY p.id DESC";

    const products = await query<Product[]>(sql, params);

    const categoriesSql = !access.isSuperAdmin || (paramStoreId && paramStoreId !== "all")
      ? "SELECT DISTINCT category FROM products WHERE store_id = ? AND category IS NOT NULL AND TRIM(category) != '' ORDER BY category ASC"
      : "SELECT DISTINCT category FROM products WHERE category IS NOT NULL AND TRIM(category) != '' ORDER BY category ASC";
    const categoriesParams = !access.isSuperAdmin
      ? [access.primaryStoreId]
      : (paramStoreId && paramStoreId !== "all" ? [Number(paramStoreId)] : []);

    const categories = await query<Array<{ category: string }>>(categoriesSql, categoriesParams);

    return NextResponse.json({
      products,
      categories: categories.map((row) => row.category),
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const originError = validateSameOrigin(request);
  if (originError) return originError;

  const access = await requireStoreOrAdminApi();
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const payload = await request.json().catch(() => null);
  const parsed = productSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // Determine store_id: non-super admins are locked to their primaryStoreId and cannot create items in global catalog (0)
  if (!access.isSuperAdmin && (access.primaryStoreId === undefined || access.primaryStoreId === 0)) {
    return NextResponse.json({ error: "Forbidden: Main index page products can only be updated by Admin" }, { status: 403 });
  }

  const storeId = access.isSuperAdmin
    ? (payload.storeId !== undefined && payload.storeId !== null ? Number(payload.storeId) : 0)
    : access.primaryStoreId;

  try {
    const category = normalizeCategory(parsed.data.category);

    await query(
      `INSERT INTO products (store_id, name, price, transport_fee, image, image_zoom, gallery_images, description, featured, category, package_name, unit_type, unit_value, stock_packages)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        storeId,
        parsed.data.name,
        parsed.data.price,
        parsed.data.transportFee,
        parsed.data.image,
        parsed.data.imageZoom,
        JSON.stringify(parsed.data.galleryImages ?? []),
        parsed.data.description,
        parsed.data.featured,
        category,
        parsed.data.packageName,
        parsed.data.unitType,
        parsed.data.unitValue,
        parsed.data.stockPackages,
      ],
    );

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 });
  }
}
