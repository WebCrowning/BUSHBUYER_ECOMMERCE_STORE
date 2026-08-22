import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { calculateDistanceKm, formatDistance, parseCoordinates } from "@/lib/location-utils";
import { Store } from "@/types/marketplace";

export interface StoreWithDetails extends Store {
  distanceKm?: number | null;
  distanceFormatted?: string;
  productCount?: number;
  previewProducts?: Array<{
    id: number;
    name: string;
    price: number;
    image: string;
    category: string;
  }>;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim() || "";
    const category = searchParams.get("category")?.trim() || "All";
    const city = searchParams.get("city")?.trim() || "";
    const quarter = searchParams.get("quarter")?.trim() || "";
    const buyerLatStr = searchParams.get("lat");
    const buyerLngStr = searchParams.get("lng");
    const sort = searchParams.get("sort") || "nearest";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "30", 10)));

    const buyerCoords =
      buyerLatStr && buyerLngStr
        ? { lat: parseFloat(buyerLatStr), lng: parseFloat(buyerLngStr) }
        : null;

    const conditions: string[] = ["s.store_status = 'active'"];
    const params: unknown[] = [];

    if (category && category !== "All") {
      conditions.push("(s.business_category = ? OR s.id IN (SELECT DISTINCT store_id FROM products WHERE category = ?))");
      params.push(category, category);
    }

    if (city && city !== "All") {
      conditions.push("LOWER(s.city) = LOWER(?)");
      params.push(city);
    }

    if (quarter && quarter !== "All") {
      conditions.push("LOWER(s.quarter) = LOWER(?)");
      params.push(quarter);
    }

    if (q) {
      const term = `%${q.toLowerCase()}%`;
      conditions.push(
        `(LOWER(s.name) LIKE ? OR LOWER(s.description) LIKE ? OR LOWER(s.business_category) LIKE ? OR LOWER(COALESCE(s.city,'')) LIKE ? OR LOWER(COALESCE(s.quarter,'')) LIKE ? OR LOWER(COALESCE(s.landmark,'')) LIKE ? OR s.id IN (SELECT DISTINCT store_id FROM products WHERE LOWER(name) LIKE ? OR LOWER(description) LIKE ? OR LOWER(category) LIKE ?))`
      );
      params.push(term, term, term, term, term, term, term, term, term);
    }

    const whereClause = `WHERE ${conditions.join(" AND ")}`;

    // Fetch matching stores
    const stores = await query<Store[]>(
      `SELECT s.*
       FROM stores s
       ${whereClause}
       ORDER BY s.rating_avg DESC, s.id ASC`,
      params
    );

    // Fetch product counts and preview products for stores
    const storeIds = stores.map((s) => s.id);
    let previewMap: Record<number, Array<{ id: number; name: string; price: number; image: string; category: string }>> = {};
    let countMap: Record<number, number> = {};

    if (storeIds.length > 0) {
      const placeholders = storeIds.map(() => "?").join(",");
      
      const counts = await query<Array<{ store_id: number; total: number }>>(
        `SELECT store_id, COUNT(*) AS total
         FROM products
         WHERE store_id IN (${placeholders}) AND status = 'active'
         GROUP BY store_id`,
        storeIds
      );
      counts.forEach((c) => {
        countMap[c.store_id] = Number(c.total);
      });

      const prods = await query<Array<{ id: number; store_id: number; name: string; price: number; image: string; category: string }>>(
        `SELECT id, store_id, name, price, image, category
         FROM products
         WHERE store_id IN (${placeholders}) AND status = 'active'
         ORDER BY featured DESC, id DESC`,
        storeIds
      );

      prods.forEach((p) => {
        if (!previewMap[p.store_id]) {
          previewMap[p.store_id] = [];
        }
        if (previewMap[p.store_id].length < 3) {
          previewMap[p.store_id].push({
            id: p.id,
            name: p.name,
            price: Number(p.price),
            image: p.image,
            category: p.category,
          });
        }
      });
    }

    // Compute distance for each store if buyer coordinates are provided
    let results: StoreWithDetails[] = stores.map((store) => {
      const storeCoords = parseCoordinates(store.latitude, store.longitude, store.gps_coordinates);
      let distanceKm: number | null = null;

      if (buyerCoords && storeCoords && !isNaN(buyerCoords.lat) && !isNaN(buyerCoords.lng)) {
        distanceKm = calculateDistanceKm(
          buyerCoords.lat,
          buyerCoords.lng,
          storeCoords.lat,
          storeCoords.lng
        );
      }

      return {
        ...store,
        distanceKm,
        distanceFormatted: distanceKm !== null ? formatDistance(distanceKm) : undefined,
        productCount: countMap[store.id] || 0,
        previewProducts: previewMap[store.id] || [],
      };
    });

    // Apply sorting
    if (buyerCoords && sort === "nearest") {
      results.sort((a, b) => {
        const distA = a.distanceKm ?? null;
        const distB = b.distanceKm ?? null;
        if (distA !== null && distB !== null) {
          return distA - distB;
        }
        if (distA !== null) return -1;
        if (distB !== null) return 1;
        return (Number(b.rating_avg) || 0) - (Number(a.rating_avg) || 0);
      });
    } else if (sort === "rating") {
      results.sort((a, b) => (Number(b.rating_avg) || 0) - (Number(a.rating_avg) || 0));
    } else if (sort === "products") {
      results.sort((a, b) => (b.productCount || 0) - (a.productCount || 0));
    } else if (sort === "name") {
      results.sort((a, b) => a.name.localeCompare(b.name));
    }

    const total = results.length;
    const offset = (page - 1) * limit;
    const paginated = results.slice(offset, offset + limit);

    return NextResponse.json({
      stores: paginated,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      buyerLocation: buyerCoords,
    });
  } catch (err) {
    console.error("Public stores GET error:", err);
    return NextResponse.json({ error: "Failed to load stores" }, { status: 500 });
  }
}
