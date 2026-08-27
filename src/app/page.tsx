import { readdir } from "fs/promises";
import path from "path";
import type { Metadata } from "next";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { HomeClient } from "@/components/home-client";
import { query } from "@/lib/db";
import type { Product } from "@/types";
import type { CategoryShowcaseData } from "@/components/category-multi-store-card";

type FeaturedProduct = Pick<
  Product,
  "id" | "name" | "price" | "image" | "description" | "category"
> & { storeId?: number; storeName?: string; storeSlug?: string };

type DbProductWithStore = Product & {
  storeId?: number;
  storeName?: string;
  storeSlug?: string;
};

type DbCategory = {
  id: number;
  name: string;
  slug: string;
  icon: string | null;
  color: string;
  description?: string | null;
};

export const metadata: Metadata = {
  title: "Bushbuyer | Multi-Vendor Marketplace — Shop Everything",
  description:
    "Discover products from verified stores worldwide. Browse electronics, fashion, food, and more — all in one trusted marketplace with fast shipping.",
  keywords: "online marketplace, multi-vendor store, shop online, verified sellers, worldwide shipping, buy products online",
  openGraph: {
    title: "Bushbuyer | Your Multi-Vendor Marketplace",
    description: "Shop from verified stores worldwide — one marketplace, every product type",
    url: "https://bushbuyer.com",
    type: "website",
    images: [
      {
        url: "/og-home.jpg",
        width: 1200,
        height: 630,
        alt: "Bushbuyer Marketplace Homepage",
      },
    ],
  },
  alternates: {
    canonical: "https://bushbuyer.com",
  },
};

async function getUploadedImages() {
  const uploadDir = path.join(process.cwd(), "public", "uploads", "products");

  try {
    const files = await readdir(uploadDir, { withFileTypes: true });
    return files
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
      .filter((name) => /\.(png|jpg|jpeg|webp)$/i.test(name))
      .sort((a, b) => b.localeCompare(a))
      .map((name) => `/uploads/products/${name}`);
  } catch {
    return [] as string[];
  }
}

export const dynamic = "force-dynamic";

export default async function Home() {
  const [featuredProducts, allStoreProducts, categoriesMeta, uploadedImages] = await Promise.all([
    // 1. Featured products across all active stores (omitting blocked products)
    query<FeaturedProduct[]>(
      `SELECT p.id, p.name, p.price, p.image, p.description, p.category, p.store_id AS storeId,
              s.name AS storeName, s.slug AS storeSlug
       FROM products p
       LEFT JOIN stores s ON s.id = p.store_id
       WHERE p.status = 'active' AND (p.admin_blocked IS NULL OR p.admin_blocked = 0)
       ORDER BY p.featured DESC, p.id DESC
       LIMIT 6`,
    ),
    // 2. All active store owner products for category showcases
    query<DbProductWithStore[]>(
      `SELECT p.id, p.name, p.price, p.transport_fee AS transportFee, p.image,
              p.image_zoom AS imageZoom, p.description, p.featured, p.category,
              p.package_name AS packageName, p.unit_type AS unitType, p.unit_value AS unitValue,
              p.stock_packages AS stockPackages, p.store_id AS storeId,
              s.name AS storeName, s.slug AS storeSlug
       FROM products p
       LEFT JOIN stores s ON s.id = p.store_id
       WHERE p.status = 'active' AND (p.admin_blocked IS NULL OR p.admin_blocked = 0)
         AND p.category IS NOT NULL AND TRIM(p.category) != ''
       ORDER BY p.featured DESC, p.id DESC
       LIMIT 200`,
    ),
    // 3. Category metadata
    query<DbCategory[]>(
      `SELECT id, name, slug, icon, color, description
       FROM categories
       WHERE is_active = 1
       ORDER BY sort_order ASC, name ASC`,
    ).catch(() => [] as DbCategory[]),
    getUploadedImages(),
  ]);

  // Build Multi-Store Category Showcases
  const categoryMap = new Map<string, {
    meta?: DbCategory;
    products: DbProductWithStore[];
    storeMap: Map<number, { id: number; name: string; slug: string }>;
  }>();

  // Initialize with official categories
  for (const cat of categoriesMeta) {
    categoryMap.set(cat.name.toLowerCase(), {
      meta: cat,
      products: [],
      storeMap: new Map(),
    });
  }

  // Populate with products from all store owners
  for (const prod of allStoreProducts) {
    const rawCat = (prod.category || "General").trim();
    const key = rawCat.toLowerCase();
    if (!categoryMap.has(key)) {
      categoryMap.set(key, {
        products: [],
        storeMap: new Map(),
      });
    }

    const group = categoryMap.get(key)!;
    group.products.push(prod);

    if (prod.storeId !== undefined && prod.storeName) {
      group.storeMap.set(prod.storeId, {
        id: prod.storeId,
        name: prod.storeName,
        slug: prod.storeSlug || `store-${prod.storeId}`,
      });
    }
  }

  // Convert to CategoryShowcaseData array, only keeping categories with at least 1 product
  const defaultEmojis: Record<string, string> = {
    "electronics & computing": "💻",
    "electronics": "💻",
    "phones & gadgets": "📱",
    "african raw foods & spices": "🌿",
    "african raw foods": "🌿",
    "fashion & clothing": "👗",
    "fashion & apparel": "👗",
    "food & groceries": "🛒",
    "groceries": "🛒",
    "beauty, cosmetics & hair": "💄",
    "health & beauty": "💄",
    "building materials & hardware": "🔨",
    "home appliances & furniture": "🏠",
    "home & living": "🏠",
    "auto & motorbike parts": "🚗",
    "seafood": "🦞",
    "vegetables": "🥬",
    "protein": "🥩",
  };

  const categoryShowcases: CategoryShowcaseData[] = Array.from(categoryMap.entries())
    .filter(([_, group]) => group.products.length > 0)
    .map(([key, group]) => {
      const displayName = group.meta?.name || group.products[0]?.category || "General";
      const slug = group.meta?.slug || displayName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const emoji = defaultEmojis[key] || group.meta?.icon || "📦";

      return {
        name: displayName,
        slug,
        icon: group.meta?.icon,
        emoji,
        color: group.meta?.color,
        description: group.meta?.description || `Explore ${displayName.toLowerCase()} from verified Cameroon & international stores`,
        products: group.products,
        stores: Array.from(group.storeMap.values()),
      };
    })
    .sort((a, b) => b.products.length - a.products.length);

  const cards = featuredProducts.map((product, index) => {
    const swapImage = uploadedImages.find(
      (imagePath) => imagePath !== product.image && uploadedImages.indexOf(imagePath) % Math.max(1, featuredProducts.length) === index % Math.max(1, featuredProducts.length),
    ) ?? uploadedImages.find((imagePath) => imagePath !== product.image) ?? null;

    return {
      ...product,
      shortNote:
        product.description.length > 92
          ? `${product.description.slice(0, 89).trimEnd()}...`
          : product.description,
      swapImage,
    };
  });

  const heroSlides = Array.from(
    new Set([
      ...uploadedImages.slice(0, 5),
      ...featuredProducts.map((product) => product.image).filter(Boolean),
    ]),
  ).slice(0, 6);

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <HomeClient
        cards={cards}
        heroSlides={heroSlides}
        uploadedImages={uploadedImages}
        categoryShowcases={categoryShowcases}
      />
      <SiteFooter />
    </div>
  );
}
