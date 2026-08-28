import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireStoreOrAdminApi } from "@/lib/authz";
import { StoreRepository } from "@/repositories/store.repository";

const DEVICE_CASE_SQL = `
  CASE
    WHEN user_agent LIKE '%iPad%' OR user_agent LIKE '%Tablet%' OR user_agent LIKE '%PlayBook%' OR user_agent LIKE '%Silk%' OR user_agent LIKE '%Kindle%' THEN 'Tablet'
    WHEN user_agent LIKE '%Mobile%' OR user_agent LIKE '%iPhone%' OR user_agent LIKE '%iPod%' OR user_agent LIKE '%Android%' OR user_agent LIKE '%BlackBerry%' OR user_agent LIKE '%webOS%' THEN 'Mobile'
    WHEN user_agent LIKE '%bot%' OR user_agent LIKE '%spider%' OR user_agent LIKE '%crawler%' OR user_agent LIKE '%lighthouse%' THEN 'Bot'
    WHEN user_agent IS NOT NULL AND user_agent <> '' AND user_agent <> 'unknown' THEN 'Desktop'
    ELSE 'Unknown'
  END
`;

const SUB_DEVICE_CASE_SQL = `
  CASE
    WHEN sub.user_agent LIKE '%iPad%' OR sub.user_agent LIKE '%Tablet%' OR sub.user_agent LIKE '%PlayBook%' OR sub.user_agent LIKE '%Silk%' OR sub.user_agent LIKE '%Kindle%' THEN 'Tablet'
    WHEN sub.user_agent LIKE '%Mobile%' OR sub.user_agent LIKE '%iPhone%' OR sub.user_agent LIKE '%iPod%' OR sub.user_agent LIKE '%Android%' OR sub.user_agent LIKE '%BlackBerry%' OR sub.user_agent LIKE '%webOS%' THEN 'Mobile'
    WHEN sub.user_agent LIKE '%bot%' OR sub.user_agent LIKE '%spider%' OR sub.user_agent LIKE '%crawler%' OR sub.user_agent LIKE '%lighthouse%' THEN 'Bot'
    WHEN sub.user_agent IS NOT NULL AND sub.user_agent <> '' AND sub.user_agent <> 'unknown' THEN 'Desktop'
    ELSE 'Unknown'
  END
`;

type TrafficRow = {
  path: string;
  pageViews: number;
  uniqueVisitors: number;
  avgLoadMs: number | null;
  topCountry: string | null;
  topDevice: string | null;
};

type DeviceRow = {
  device: string;
  views: number;
  visitors: number;
};

/**
 * GET /api/seller/traffic?storeId=<id>&days=<n|all>
 *
 * Returns traffic analytics scoped strictly to the seller's store paths:
 *   /store/<slug>
 *   /store/<slug>/*
 *   /products/<id> pages where the product belongs to this store
 *
 * Accessible by store owners/staff and platform admins.
 */
export async function GET(request: Request) {
  const access = await requireStoreOrAdminApi();
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { searchParams } = new URL(request.url);
  const overrideId = searchParams.get("storeId");
  const storeId = overrideId ? parseInt(overrideId, 10) : access.primaryStoreId;
  const daysParam = searchParams.get("days") ?? "30";

  if (!storeId || isNaN(storeId)) {
    return NextResponse.json({ error: "No store found for your account" }, { status: 400 });
  }

  if (!access.isSuperAdmin && !access.userStoreIds.includes(storeId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Resolve the store slug so we can filter by path prefix
  const store = await StoreRepository.findById(storeId);
  if (!store) {
    return NextResponse.json({ error: "Store not found" }, { status: 404 });
  }

  const storePathPrefix = `/store/${store.slug}`;
  const dateFilter =
    daysParam === "all"
      ? "1=1"
      : `created_at >= NOW() - INTERVAL ${parseInt(daysParam, 10) || 30} DAY`;

  try {
    // 1. Top pages for the store path
    const topPages = await query<TrafficRow[]>(
      `SELECT
         path,
         COUNT(*) AS pageViews,
         COUNT(DISTINCT session_key) AS uniqueVisitors,
         ROUND(AVG(load_ms)) AS avgLoadMs,
         (
           SELECT country
           FROM traffic_events sub
           WHERE sub.path = te.path
             AND sub.country IS NOT NULL
             AND ${dateFilter}
           GROUP BY country
           ORDER BY COUNT(*) DESC
           LIMIT 1
         ) AS topCountry,
         (
           SELECT ${SUB_DEVICE_CASE_SQL}
           FROM traffic_events sub
           WHERE sub.path = te.path
             AND sub.user_agent IS NOT NULL
             AND ${dateFilter}
           GROUP BY ${SUB_DEVICE_CASE_SQL}
           ORDER BY COUNT(*) DESC
           LIMIT 1
         ) AS topDevice
       FROM traffic_events te
       WHERE (path = ? OR path LIKE ?)
         AND ${dateFilter}
       GROUP BY path
       ORDER BY pageViews DESC
       LIMIT 50`,
      [storePathPrefix, `${storePathPrefix}/%`]
    );

    // 2. Summary totals
    const [summary] = await query<{
      totalPageViews: number;
      uniqueVisitors: number;
      avgLoadMs: number | null;
    }[]>(
      `SELECT
         COUNT(*) AS totalPageViews,
         COUNT(DISTINCT session_key) AS uniqueVisitors,
         ROUND(AVG(load_ms)) AS avgLoadMs
       FROM traffic_events
       WHERE (path = ? OR path LIKE ?)
         AND ${dateFilter}`,
      [storePathPrefix, `${storePathPrefix}/%`]
    );

    // 3. Daily breakdown for the last period (for a simple sparkline / trend)
    const dailyTrend = await query<{ date: string; views: number; visitors: number }[]>(
      `SELECT
         DATE(created_at) AS date,
         COUNT(*) AS views,
         COUNT(DISTINCT session_key) AS visitors
       FROM traffic_events
       WHERE (path = ? OR path LIKE ?)
         AND ${dateFilter}
       GROUP BY DATE(created_at)
       ORDER BY date ASC`,
      [storePathPrefix, `${storePathPrefix}/%`]
    );

    // 4. Top referrers to this store
    const topReferrers = await query<{ referrer: string; cnt: number }[]>(
      `SELECT
         COALESCE(referrer, 'Direct') AS referrer,
         COUNT(*) AS cnt
       FROM traffic_events
       WHERE (path = ? OR path LIKE ?)
         AND ${dateFilter}
       GROUP BY referrer
       ORDER BY cnt DESC
       LIMIT 10`,
      [storePathPrefix, `${storePathPrefix}/%`]
    );

    // 5. Device breakdown (Mobile, Desktop, Tablet, etc.)
    const devices = await query<DeviceRow[]>(
      `SELECT
         ${DEVICE_CASE_SQL} AS device,
         COUNT(*) AS views,
         COUNT(DISTINCT session_key) AS visitors
       FROM traffic_events
       WHERE (path = ? OR path LIKE ?)
         AND ${dateFilter}
       GROUP BY ${DEVICE_CASE_SQL}
       ORDER BY views DESC`,
      [storePathPrefix, `${storePathPrefix}/%`]
    );

    return NextResponse.json({
      storeSlug: store.slug,
      storeName: store.name,
      summary: summary ?? { totalPageViews: 0, uniqueVisitors: 0, avgLoadMs: null },
      topPages,
      dailyTrend,
      topReferrers,
      devices,
    });
  } catch (err) {
    console.error("Seller traffic GET error:", err);
    return NextResponse.json({ error: "Failed to fetch traffic data" }, { status: 500 });
  }
}
