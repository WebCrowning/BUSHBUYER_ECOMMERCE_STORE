import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { query } from "@/lib/db";

type Params = { params: Promise<{ storeId: string }> };

type StoreProductRow = {
  id: number;
  store_id: number;
  name: string;
  price: number;
  discount_price: number | null;
  image: string;
  category: string;
  status: string;
  stock_packages: number;
  featured: number;
  marketplace_enabled: number;
  created_at: string;
  store_name: string;
  store_slug: string;
};

/** Only platform-level admins may toggle marketplace visibility */
function isPlatformAdmin(role?: string) {
  return (
    role === "admin" ||
    role === "sub_admin" ||
    role === "super_admin" ||
    role === "platform_admin"
  );
}

/**
 * GET /api/admin/stores/[storeId]/products
 * Returns all products for a given store with their marketplace_enabled status.
 * Accessible by platform admins only.
 */
export async function GET(
  _request: Request,
  { params }: Params
) {
  try {
    const session = await auth();
    const role = (session?.user as { role?: string })?.role;

    if (!session?.user?.id || !isPlatformAdmin(role)) {
      return NextResponse.json({ error: "Forbidden — admin access required" }, { status: 403 });
    }

    const { storeId } = await params;
    const id = parseInt(storeId, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid store ID" }, { status: 400 });
    }

    const products = await query<StoreProductRow[]>(
      `SELECT p.id, p.store_id, p.name, p.price, p.discount_price,
              p.image, p.category, p.status, p.stock_packages,
              p.featured, p.marketplace_enabled, p.created_at,
              s.name AS store_name, s.slug AS store_slug
       FROM products p
       LEFT JOIN stores s ON s.id = p.store_id
       WHERE p.store_id = ?
       ORDER BY p.marketplace_enabled DESC, p.created_at DESC`,
      [id]
    );

    // Summary counts
    const total = products.length;
    const enabled = products.filter((p) => p.marketplace_enabled === 1).length;

    return NextResponse.json({ products, total, enabled });
  } catch (err) {
    console.error("Store products GET error:", err);
    return NextResponse.json({ error: "Failed to fetch store products" }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/stores/[storeId]/products
 * Body: { productId: number, marketplace_enabled: boolean }
 *
 * Toggles a single product's marketplace visibility.
 * Only platform admins can do this — store owners/staff cannot.
 */
export async function PATCH(
  request: Request,
  { params }: Params
) {
  try {
    const session = await auth();
    const role = (session?.user as { role?: string })?.role;

    if (!session?.user?.id || !isPlatformAdmin(role)) {
      return NextResponse.json({ error: "Forbidden — admin access required" }, { status: 403 });
    }

    const { storeId } = await params;
    const id = parseInt(storeId, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid store ID" }, { status: 400 });
    }

    const body = await request.json().catch(() => null);
    const productId = parseInt(body?.productId, 10);
    const enabled = body?.marketplace_enabled;

    if (isNaN(productId) || typeof enabled !== "boolean") {
      return NextResponse.json(
        { error: "productId (number) and marketplace_enabled (boolean) are required" },
        { status: 400 }
      );
    }

    // Verify the product belongs to this store (prevents cross-store tampering)
    const [product] = await query<{ id: number; store_id: number; name: string }[]>(
      "SELECT id, store_id, name FROM products WHERE id = ? LIMIT 1",
      [productId]
    );

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    if (product.store_id !== id) {
      return NextResponse.json(
        { error: "Product does not belong to this store" },
        { status: 400 }
      );
    }

    await query(
      "UPDATE products SET marketplace_enabled = ? WHERE id = ?",
      [enabled ? 1 : 0, productId]
    );

    // Return the updated product list
    const products = await query<{ id: number; marketplace_enabled: number }[]>(
      `SELECT p.id, p.store_id, p.name, p.price, p.discount_price,
              p.image, p.category, p.status, p.stock_packages,
              p.featured, p.marketplace_enabled, p.created_at,
              s.name AS store_name, s.slug AS store_slug
       FROM products p
       LEFT JOIN stores s ON s.id = p.store_id
       WHERE p.store_id = ?
       ORDER BY p.marketplace_enabled DESC, p.created_at DESC`,
      [id]
    );

    const total = products.length;
    const enabledCount = products.filter((p) => (p as any).marketplace_enabled === 1).length;

    return NextResponse.json({
      ok: true,
      productId,
      marketplace_enabled: enabled,
      products,
      total,
      enabled: enabledCount,
    });
  } catch (err) {
    console.error("Store products PATCH error:", err);
    return NextResponse.json({ error: "Failed to update product visibility" }, { status: 500 });
  }
}

/**
 * POST /api/admin/stores/[storeId]/products/bulk
 * Body: { productIds: number[], marketplace_enabled: boolean }
 * Enables or disables marketplace for multiple products at once.
 */
export async function POST(
  request: Request,
  { params }: Params
) {
  try {
    const session = await auth();
    const role = (session?.user as { role?: string })?.role;

    if (!session?.user?.id || !isPlatformAdmin(role)) {
      return NextResponse.json({ error: "Forbidden — admin access required" }, { status: 403 });
    }

    const { storeId } = await params;
    const id = parseInt(storeId, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid store ID" }, { status: 400 });
    }

    const body = await request.json().catch(() => null);
    const productIds: number[] = Array.isArray(body?.productIds)
      ? body.productIds.map((x: unknown) => parseInt(String(x), 10)).filter((n: number) => !isNaN(n))
      : [];
    const enabled = body?.marketplace_enabled;

    if (productIds.length === 0 || typeof enabled !== "boolean") {
      return NextResponse.json(
        { error: "productIds (non-empty array) and marketplace_enabled (boolean) are required" },
        { status: 400 }
      );
    }

    if (productIds.length > 100) {
      return NextResponse.json({ error: "Maximum 100 products per bulk operation" }, { status: 400 });
    }

    // Verify all belong to this store
    const placeholders = productIds.map(() => "?").join(",");
    const existing = await query<{ id: number }[]>(
      `SELECT id FROM products WHERE id IN (${placeholders}) AND store_id = ?`,
      [...productIds, id]
    );

    if (existing.length !== productIds.length) {
      return NextResponse.json(
        { error: "One or more products do not belong to this store" },
        { status: 400 }
      );
    }

    await query(
      `UPDATE products SET marketplace_enabled = ? WHERE id IN (${placeholders}) AND store_id = ?`,
      [enabled ? 1 : 0, ...productIds, id]
    );

    return NextResponse.json({
      ok: true,
      updated: productIds.length,
      marketplace_enabled: enabled,
    });
  } catch (err) {
    console.error("Store products bulk PATCH error:", err);
    return NextResponse.json({ error: "Failed to bulk update product visibility" }, { status: 500 });
  }
}
