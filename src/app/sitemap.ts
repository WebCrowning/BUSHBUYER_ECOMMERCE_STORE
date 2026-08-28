import type { MetadataRoute } from "next";
import { query } from "@/lib/db";

// Revalidate sitemap at most once every hour (3600 seconds) for high speed and fresh updates
export const revalidate = 3600;

interface StoreRow {
  slug: string;
  created_at?: string;
}

interface ProductRow {
  id: number;
  featured: number | boolean;
  created_at?: string;
}

interface CategoryRow {
  slug: string;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://bushbuyer.com").replace(/\/$/, "");

  // 1. Core Public Static Pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/products`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.95,
    },
    {
      url: `${baseUrl}/store/apply`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.85,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/faq`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/support`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.5,
    },
  ];

  try {
    // 2. Automatic Store Indexing: all active/verified stores dynamically
    const stores = await query<StoreRow[]>(
      `SELECT slug, created_at 
       FROM stores 
       WHERE slug IS NOT NULL AND slug != ''
       ORDER BY id DESC LIMIT 5000`
    );

    const storePages: MetadataRoute.Sitemap = stores.map((store) => {
      const lastModDate = store.created_at;
      return {
        url: `${baseUrl}/store/${encodeURIComponent(store.slug)}`,
        lastModified: lastModDate ? new Date(lastModDate) : new Date(),
        changeFrequency: "daily",
        priority: 0.9,
      };
    });

    // 3. Active Marketplace Products dynamically
    const products = await query<ProductRow[]>(
      `SELECT id, featured, created_at 
       FROM products 
       WHERE status = 'active' AND admin_blocked = 0 AND marketplace_enabled = 1
       ORDER BY featured DESC, id DESC LIMIT 20000`
    );

    const productPages: MetadataRoute.Sitemap = products.map((product) => {
      const lastModDate = product.created_at;
      const isFeatured = Boolean(product.featured);
      return {
        url: `${baseUrl}/products/${product.id}`,
        lastModified: lastModDate ? new Date(lastModDate) : new Date(),
        changeFrequency: isFeatured ? "daily" : "weekly",
        priority: isFeatured ? 0.9 : 0.8,
      };
    });

    // 4. Product Categories dynamically
    let categoryPages: MetadataRoute.Sitemap = [];
    try {
      const categories = await query<CategoryRow[]>(
        `SELECT slug 
         FROM categories 
         WHERE is_active = 1 AND slug IS NOT NULL AND slug != ''
         ORDER BY sort_order ASC, name ASC`
      );

      categoryPages = categories.map((cat) => ({
        url: `${baseUrl}/products?category=${encodeURIComponent(cat.slug)}`,
        lastModified: new Date(),
        changeFrequency: "weekly",
        priority: 0.85,
      }));
    } catch {
      // Fall back gracefully if categories table is empty
    }

    return [...staticPages, ...storePages, ...productPages, ...categoryPages];
  } catch (error) {
    console.error("[Sitemap Generation Error]:", error);
    return staticPages;
  }
}
