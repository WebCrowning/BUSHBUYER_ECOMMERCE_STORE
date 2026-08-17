import type { MetadataRoute } from "next";
import { query } from "@/lib/db";

interface Product {
  id: number;
  updated_at?: string;
}

/**
 * Sitemap for products with pagination
 * Handles large product catalogs by splitting into pages
 */
export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const pageSize = 40000; // Google sitemap limit
  const offset = (page - 1) * pageSize;

  try {
    // Get products for this page
    const products = await query<Product[]>(
      `SELECT id, updated_at FROM products WHERE store_id = 0 ORDER BY updated_at DESC LIMIT ? OFFSET ?`,
      [pageSize, offset],
    );

    if (products.length === 0) {
      return new Response(
        '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>',
        { headers: { "Content-Type": "application/xml; charset=utf-8" } },
      );
    }

    const baseUrl = "https://bushbuyer.com";
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${products
  .map(
    (product) => `
  <url>
    <loc>${baseUrl}/products/${product.id}</loc>
    <lastmod>${product.updated_at ? new Date(product.updated_at).toISOString() : new Date().toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`,
  )
  .join("")}
</urlset>`;

    return new Response(xml, {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (error) {
    console.error("Error generating products sitemap:", error);
    return new Response(
      '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>',
      { headers: { "Content-Type": "application/xml; charset=utf-8" } },
    );
  }
}
