import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

type ProductResult = {
  id: number;
  name: string;
  price: number;
  discountPrice: number | null;
  transportFee: number;
  image: string;
  imageZoom: number;
  description: string;
  featured: number;
  category: string;
  packageName: string;
  unitType: string;
  unitValue: number;
  stockPackages: number;
  storeId: number;
  storeName: string | null;
  storeSlug: string | null;
  marketplace_enabled: number;
};

/**
 * GET /api/products
 *
 * Supports rich filtering for the public marketplace:
 *   ?q=<search text>           — searches name, description, category, brand, tags
 *   ?category=<name>           — exact category name or "All"
 *   ?store=<store_id|slug>     — filter by store
 *   ?minPrice=<number>         — minimum price
 *   ?maxPrice=<number>         — maximum price
 *   ?sort=newest|price_asc|price_desc|featured|name — sort order
 *   ?limit=<n>                 — default 100
 *   ?offset=<n>                — for pagination
 *   ?cross_store=true          — when true and q is set, shows results from ALL stores
 *                                (not just marketplace_enabled) so users can discover
 *                                products across the whole platform
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const q = searchParams.get("q")?.trim() ?? "";
    const category = searchParams.get("category")?.trim() ?? "All";
    const storeParam = searchParams.get("store")?.trim() ?? "";
    const minPrice = parseFloat(searchParams.get("minPrice") ?? "") || null;
    const maxPrice = parseFloat(searchParams.get("maxPrice") ?? "") || null;
    const sort = searchParams.get("sort") ?? "newest";
    const limit = Math.min(200, parseInt(searchParams.get("limit") ?? "100", 10) || 100);
    const offset = parseInt(searchParams.get("offset") ?? "0", 10) || 0;
    const crossStore = searchParams.get("cross_store") === "true";

    const params: unknown[] = [];
    const conditions: string[] = [
      "p.status = 'active'",
      "(p.admin_blocked IS NULL OR p.admin_blocked = 0)",
    ];

    // When no search query → only show marketplace-enabled products
    // When searching with cross_store → show from all stores so users can discover everything
    if (!q || !crossStore) {
      conditions.push("p.marketplace_enabled = 1");
    }

    // Full-text search: name, description, category, brand, tags
    if (q) {
      conditions.push(
        `(LOWER(p.name) LIKE ?
          OR LOWER(p.description) LIKE ?
          OR LOWER(p.category) LIKE ?
          OR LOWER(COALESCE(p.brand, '')) LIKE ?
          OR LOWER(COALESCE(p.tags, '')) LIKE ?)`
      );
      const term = `%${q.toLowerCase()}%`;
      params.push(term, term, term, term, term);
    }

    // Category filter
    if (category && category !== "All") {
      conditions.push("p.category = ?");
      params.push(category);
    }

    // Store filter — accepts store_id (number) or store slug
    if (storeParam) {
      const storeId = parseInt(storeParam, 10);
      if (!isNaN(storeId)) {
        conditions.push("p.store_id = ?");
        params.push(storeId);
      } else {
        // slug lookup
        conditions.push("s.slug = ?");
        params.push(storeParam);
      }
    }

    // Price range
    if (minPrice !== null) {
      conditions.push("p.price >= ?");
      params.push(minPrice);
    }
    if (maxPrice !== null) {
      conditions.push("p.price <= ?");
      params.push(maxPrice);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // Sort
    const sortMap: Record<string, string> = {
      newest:     "p.created_at DESC",
      price_asc:  "p.price ASC",
      price_desc: "p.price DESC",
      featured:   "p.featured DESC, p.created_at DESC",
      name:       "p.name ASC",
    };
    const orderBy = sortMap[sort] ?? sortMap.newest;

    // Count for pagination
    const [countRow] = await query<{ total: number }[]>(
      `SELECT COUNT(*) AS total
       FROM products p
       LEFT JOIN stores s ON s.id = p.store_id
       ${whereClause}`,
      params
    );

    const total = Number(countRow?.total ?? 0);

    // Main query
    const products = await query<ProductResult[]>(
      `SELECT
         p.id,
         p.name,
         p.price,
         p.discount_price   AS discountPrice,
         p.transport_fee    AS transportFee,
         p.image,
         p.image_zoom       AS imageZoom,
         p.description,
         p.featured,
         p.category,
         p.package_name     AS packageName,
         p.unit_type        AS unitType,
         p.unit_value       AS unitValue,
         p.stock_packages   AS stockPackages,
         p.store_id         AS storeId,
         p.marketplace_enabled,
         s.name             AS storeName,
         s.slug             AS storeSlug
       FROM products p
       LEFT JOIN stores s ON s.id = p.store_id
       ${whereClause}
       ORDER BY ${orderBy}
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    // Distinct categories for filter dropdown (from currently visible set)
    const categories = await query<{ category: string }[]>(
      `SELECT DISTINCT p.category
       FROM products p
       WHERE p.status = 'active' AND p.marketplace_enabled = 1
         AND p.category IS NOT NULL AND TRIM(p.category) != ''
       ORDER BY p.category ASC`
    );

    return NextResponse.json({
      products,
      total,
      categories: categories.map((c) => c.category),
      filters: { q, category, storeParam, minPrice, maxPrice, sort, crossStore },
    });
  } catch (err) {
    console.error("Products API error:", err);
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}
