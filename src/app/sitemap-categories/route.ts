import { query } from "@/lib/db";

interface Category {
  category: string;
}

/**
 * Sitemap for product categories
 * This helps search engines discover category pages
 */
export async function GET(): Promise<Response> {
  const baseUrl = "https://bushbuyer.com";

  try {
    // Get all unique categories
    const categories = await query<Category[]>(
      `SELECT DISTINCT category FROM products WHERE store_id = 0 AND category IS NOT NULL AND category != '' ORDER BY category ASC`,
    );

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${categories
  .map(
    (cat) => `
  <url>
    <loc>${baseUrl}/products?category=${encodeURIComponent(cat.category)}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.85</priority>
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
    console.error("Error generating category sitemap:", error);
    return new Response(
      '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>',
      { headers: { "Content-Type": "application/xml; charset=utf-8" } },
    );
  }
}
