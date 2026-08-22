import type { Metadata } from "next";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { query } from "@/lib/db";
import type { Product } from "@/types";
import { StoreMarketplaceClient } from "@/components/store-marketplace-client";
import { StoreWithDetails } from "@/app/api/stores/route";
import { Store } from "@/types/marketplace";

export const metadata: Metadata = {
  title: "Cameroon Stores & Products Marketplace | Bushbuyer",
  description:
    "Find and explore verified stores in Douala, Yaoundé, Buea, Bamenda, Bafoussam and Limbe. Browse electronics, phones, fashion, groceries and building hardware by location.",
  keywords: "Cameroon marketplace, stores in Douala, shops in Yaounde, Buea electronics, Bamenda market, buy online Cameroon",
  openGraph: {
    title: "Cameroon Stores & Products Marketplace | Bushbuyer",
    description: "Discover nearest stores in Cameroon by category and location with live GPS matching.",
    type: "website",
  },
  alternates: {
    canonical: "https://bushbuyer.com/products",
  },
};

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{
    q?: string;
    category?: string;
    city?: string;
    quarter?: string;
    store?: string;
  }>;
};

type ProductRow = Product & {
  storeId?: number;
  storeName?: string;
  storeSlug?: string;
  storeCity?: string;
  storeQuarter?: string;
  storeLatitude?: number | null;
  storeLongitude?: number | null;
  storeGps?: string | null;
  discountPrice?: number | null;
  marketplace_enabled?: number;
};

type CategoryRow = {
  id: number;
  name: string;
  slug: string;
  icon: string | null;
  color: string;
};

export default async function ProductsPage({ searchParams }: PageProps) {
  const {
    q = "",
    category = "All",
    city = "",
    quarter = "",
  } = await searchParams;

  // 1. Fetch Categories
  const categories = await query<CategoryRow[]>(
    `SELECT c.id, c.name, c.slug, c.icon, c.color
     FROM categories c
     WHERE c.is_active = 1
     ORDER BY c.sort_order ASC, c.name ASC`
  );

  // 2. Fetch Active Stores
  const stores = await query<Store[]>(
    `SELECT s.*
     FROM stores s
     WHERE s.store_status = 'active'
     ORDER BY s.rating_avg DESC, s.id ASC`
  );

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

  const initialStores: StoreWithDetails[] = stores.map((s) => ({
    ...s,
    productCount: countMap[s.id] || 0,
    previewProducts: previewMap[s.id] || [],
  }));

  // 3. Fetch Active Marketplace Products
  const products = await query<ProductRow[]>(
    `SELECT p.id, p.name, p.price, p.discount_price AS discountPrice,
            p.transport_fee AS transportFee, p.image, p.image_zoom AS imageZoom,
            p.description, p.featured, p.category,
            p.package_name AS packageName, p.unit_type AS unitType,
            p.unit_value AS unitValue, p.stock_packages AS stockPackages,
            p.store_id AS storeId, p.marketplace_enabled,
            s.name AS storeName, s.slug AS storeSlug, s.city AS storeCity,
            s.quarter AS storeQuarter, s.latitude AS storeLatitude,
            s.longitude AS storeLongitude, s.gps_coordinates AS storeGps
     FROM products p
     LEFT JOIN stores s ON s.id = p.store_id
     WHERE p.status = 'active'
     ORDER BY p.featured DESC, p.id DESC
     LIMIT 100`
  );

  return (
    <div className="min-h-screen bg-surface-soft flex flex-col">
      <SiteHeader />

      <main className="container-shell py-8 flex-1">
        <StoreMarketplaceClient
          initialStores={initialStores}
          categories={categories}
          initialProducts={products}
          initialCategory={category}
          initialQuery={q}
          initialCity={city}
          initialQuarter={quarter}
        />
      </main>

      <SiteFooter />
    </div>
  );
}
