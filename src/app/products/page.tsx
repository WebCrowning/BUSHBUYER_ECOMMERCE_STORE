import Link from "next/link";
import type { Metadata } from "next";
import { AddToCartButton } from "@/components/add-to-cart-button";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { query } from "@/lib/db";
import { formatCurrency } from "@/lib/utils";
import type { Product } from "@/types";
import { Store, Search, SlidersHorizontal, ArrowUpDown, ExternalLink } from "lucide-react";
import { ProductPriceDisplay } from "@/components/product-price-display";

export const metadata: Metadata = {
  title: "Marketplace | Bushbuyer — Shop Everything",
  description:
    "Browse products from all stores on the Bushbuyer marketplace. Search across categories — food, electronics, fashion, and more.",
  keywords: "marketplace, products, buy online, multi-store, African marketplace, shop",
  openGraph: {
    title: "Bushbuyer Marketplace",
    description: "Shop products from all stores in one place",
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
    store?: string;
    minPrice?: string;
    maxPrice?: string;
    sort?: string;
    page?: string;
  }>;
};

type ProductRow = Product & {
  storeId?: number;
  storeName?: string;
  storeSlug?: string;
  discountPrice?: number | null;
  marketplace_enabled?: number;
};

type CategoryRow = { id: number; name: string; slug: string; icon: string | null; color: string };
type StoreRow    = { id: number; name: string; slug: string };

const PAGE_SIZE = 12;

export default async function ProductsPage({ searchParams }: PageProps) {
  const {
    q = "",
    category = "All",
    store: storeFilter = "",
    minPrice: minPriceStr = "",
    maxPrice: maxPriceStr = "",
    sort = "newest",
    page = "1",
  } = await searchParams;

  const currentPage = Math.max(1, parseInt(page, 10) || 1);
  const offset      = (currentPage - 1) * PAGE_SIZE;
  const minPrice    = parseFloat(minPriceStr) || null;
  const maxPrice    = parseFloat(maxPriceStr) || null;

  // When a search query is present, show cross-store results (all stores)
  // When browsing without a query, show only marketplace-enabled products
  const isSearching = q.trim().length > 0;

  // ── Build SQL ─────────────────────────────────────────────────────────────
  const conditions: string[] = ["p.status = 'active'"];
  const params: unknown[] = [];

  if (!isSearching) {
    conditions.push("p.marketplace_enabled = 1");
  }

  if (q) {
    conditions.push(
      `(LOWER(p.name) LIKE ? OR LOWER(p.description) LIKE ? OR LOWER(p.category) LIKE ?
        OR LOWER(COALESCE(p.brand,'')) LIKE ? OR LOWER(COALESCE(p.tags,'')) LIKE ?)`
    );
    const t = `%${q.toLowerCase()}%`;
    params.push(t, t, t, t, t);
  }

  if (category && category !== "All") {
    conditions.push("p.category = ?");
    params.push(category);
  }

  if (storeFilter) {
    const sid = parseInt(storeFilter, 10);
    if (!isNaN(sid)) {
      conditions.push("p.store_id = ?");
      params.push(sid);
    } else {
      conditions.push("s.slug = ?");
      params.push(storeFilter);
    }
  }

  if (minPrice !== null) { conditions.push("p.price >= ?"); params.push(minPrice); }
  if (maxPrice !== null) { conditions.push("p.price <= ?"); params.push(maxPrice); }

  const whereClause = `WHERE ${conditions.join(" AND ")}`;

  const sortMap: Record<string, string> = {
    newest:     "p.featured DESC, p.created_at DESC",
    price_asc:  "p.price ASC, p.name ASC",
    price_desc: "p.price DESC, p.name ASC",
    featured:   "p.featured DESC, p.created_at DESC",
    name:       "p.name ASC",
  };
  const orderBy = sortMap[sort] ?? sortMap.newest;

  // Parallel data fetching
  const [countResult, productResult, categoriesResult, storesResult] = await Promise.all([
    query<{ total: number }[]>(
      `SELECT COUNT(*) AS total FROM products p LEFT JOIN stores s ON s.id = p.store_id ${whereClause}`,
      params
    ),
    query<ProductRow[]>(
      `SELECT p.id, p.name, p.price, p.discount_price AS discountPrice,
              p.transport_fee AS transportFee, p.image, p.image_zoom AS imageZoom,
              p.description, p.featured, p.category,
              p.package_name AS packageName, p.unit_type AS unitType,
              p.unit_value AS unitValue, p.stock_packages AS stockPackages,
              p.store_id AS storeId, p.marketplace_enabled,
              s.name AS storeName, s.slug AS storeSlug
       FROM products p LEFT JOIN stores s ON s.id = p.store_id
       ${whereClause}
       ORDER BY ${orderBy}
       LIMIT ? OFFSET ?`,
      [...params, PAGE_SIZE, offset]
    ),
    query<CategoryRow[]>(
      `SELECT c.id, c.name, c.slug, c.icon, c.color
       FROM categories c
       WHERE c.is_active = 1
       ORDER BY c.sort_order ASC, c.name ASC`
    ),
    query<StoreRow[]>(
      `SELECT DISTINCT s.id, s.name, s.slug
       FROM stores s
       JOIN products p ON p.store_id = s.id
       WHERE p.marketplace_enabled = 1 AND p.status = 'active'
         AND s.store_status = 'active'
       ORDER BY s.name ASC`
    ),
  ]);

  const totalProducts = Number(countResult[0]?.total ?? 0);
  const totalPages    = Math.max(1, Math.ceil(totalProducts / PAGE_SIZE));

  function href(overrides: Record<string, string | number | undefined>) {
    const p = new URLSearchParams();
    const merged = { q, category, store: storeFilter, minPrice: minPriceStr, maxPrice: maxPriceStr, sort, page, ...overrides };
    if (merged.q)                           p.set("q", String(merged.q));
    if (merged.category && merged.category !== "All") p.set("category", String(merged.category));
    if (merged.store)                       p.set("store", String(merged.store));
    if (merged.minPrice)                    p.set("minPrice", String(merged.minPrice));
    if (merged.maxPrice)                    p.set("maxPrice", String(merged.maxPrice));
    if (merged.sort && merged.sort !== "newest") p.set("sort", String(merged.sort));
    if (merged.page && Number(merged.page) > 1)  p.set("page", String(merged.page));
    const qs = p.toString();
    return qs ? `/products?${qs}` : "/products";
  }

  const prevPage = Math.max(1, currentPage - 1);
  const nextPage = Math.min(totalPages, currentPage + 1);

  const sortOptions = [
    { value: "newest",     label: "Newest" },
    { value: "featured",   label: "Featured" },
    { value: "price_asc",  label: "Price: Low → High" },
    { value: "price_desc", label: "Price: High → Low" },
    { value: "name",       label: "A → Z" },
  ];

  return (
    <div className="min-h-screen bg-surface-soft">
      <SiteHeader />

      <main className="container-shell py-8">

        {/* ── Page Header ── */}
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="section-kicker">Marketplace</p>
            <h1 className="section-title mt-1 text-brand-deep">
              {isSearching ? `Results for "${q}"` : "All Products"}
            </h1>
            {isSearching && (
              <p className="mt-1 text-xs text-foreground/60">
                Searching across all stores —{" "}
                <span className="font-semibold text-foreground/80">{totalProducts} product{totalProducts !== 1 ? "s" : ""} found</span>
              </p>
            )}
          </div>
          <Link href="/cart" className="rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white shadow-sm">
            View Cart
          </Link>
        </div>

        {/* ── Filter Bar ── */}
        <form method="GET" action="/products"
          className="glass-card mb-6 rounded-2xl p-4 space-y-3">

          {/* Search row */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={15} className="pointer-events-none absolute inset-y-0 left-3.5 my-auto text-foreground/40" />
              <input
                type="search"
                name="q"
                defaultValue={q}
                placeholder="Search all products, brands, categories…"
                className="w-full rounded-xl border border-border bg-surface py-2.5 pl-9 pr-4 text-sm outline-none focus:border-brand"
              />
            </div>
            <button type="submit"
              className="rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-deep">
              Search
            </button>
          </div>

          {/* Filter chips row */}
          <div className="flex flex-wrap gap-2 items-center">
            {/* Category */}
            <select name="category" defaultValue={category}
              className="rounded-xl border border-border bg-surface px-3 py-2 text-xs font-semibold text-foreground outline-none focus:border-brand">
              <option value="All">All Categories</option>
              {categoriesResult.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.icon ? `${c.icon} ` : ""}{c.name}
                </option>
              ))}
            </select>

            {/* Store filter */}
            <select name="store" defaultValue={storeFilter}
              className="rounded-xl border border-border bg-surface px-3 py-2 text-xs font-semibold text-foreground outline-none focus:border-brand">
              <option value="">All Stores</option>
              {storesResult.map((s) => (
                <option key={s.id} value={s.slug}>{s.name}</option>
              ))}
            </select>

            {/* Price range */}
            <div className="flex items-center gap-1.5">
              <input type="number" name="minPrice" defaultValue={minPriceStr} min={0} placeholder="Min $"
                className="w-20 rounded-xl border border-border bg-surface px-2 py-2 text-xs outline-none focus:border-brand" />
              <span className="text-foreground/40 text-xs">–</span>
              <input type="number" name="maxPrice" defaultValue={maxPriceStr} min={0} placeholder="Max $"
                className="w-20 rounded-xl border border-border bg-surface px-2 py-2 text-xs outline-none focus:border-brand" />
            </div>

            {/* Sort */}
            <select name="sort" defaultValue={sort}
              className="rounded-xl border border-border bg-surface px-3 py-2 text-xs font-semibold text-foreground outline-none focus:border-brand">
              {sortOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>

            {/* Clear filters */}
            {(q || category !== "All" || storeFilter || minPriceStr || maxPriceStr || sort !== "newest") && (
              <Link href="/products"
                className="rounded-xl border border-border bg-white px-3 py-2 text-xs font-semibold text-foreground/60 hover:bg-surface">
                Clear filters ×
              </Link>
            )}
          </div>
        </form>

        {/* ── Category Pills ── */}
        {!isSearching && (
          <div className="mb-5 flex flex-wrap gap-2">
            <Link href={href({ category: "All", page: "1" })}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-bold transition-all ${category === "All" ? "border-brand bg-brand text-white shadow-sm" : "border-border bg-white text-foreground/70 hover:border-brand/30 hover:bg-surface"}`}>
              All
            </Link>
            {categoriesResult.map((c) => (
              <Link key={c.id} href={href({ category: c.name, page: "1" })}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-bold transition-all ${category === c.name ? "border-brand bg-brand text-white shadow-sm" : "border-border bg-white text-foreground/70 hover:border-brand/30 hover:bg-surface"}`}
                style={category === c.name ? {} : { borderColor: c.color + "55" }}>
                {c.icon && <span>{c.icon}</span>}
                {c.name}
              </Link>
            ))}
          </div>
        )}

        {/* ── Results Meta ── */}
        <div className="mb-4 flex items-center justify-between text-xs text-foreground/60">
          <p>
            {totalProducts === 0 ? "No products found" :
             `Showing ${offset + 1}–${Math.min(offset + PAGE_SIZE, totalProducts)} of ${totalProducts} product${totalProducts !== 1 ? "s" : ""}`}
            {isSearching && <span className="ml-1 text-brand font-semibold">(cross-store search)</span>}
          </p>
          <span className="hidden sm:block">{totalPages > 1 ? `Page ${currentPage} of ${totalPages}` : ""}</span>
        </div>

        {/* ── Product Grid ── */}
        {productResult.length === 0 ? (
          <div className="glass-card rounded-2xl border border-brand/20 bg-brand/5 p-10 text-center">
            <p className="text-sm font-semibold uppercase tracking-wide text-brand/80">Nothing found</p>
            <h2 className="mt-2 text-xl font-bold text-brand-deep">
              {isSearching ? "No products match your search" : "No products in this category yet"}
            </h2>
            <p className="mx-auto mt-2 max-w-sm text-sm text-foreground/60">
              {isSearching
                ? "Try different keywords, remove filters, or request this product from our team."
                : "Check back soon or browse all products."}
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <Link href="/products" className="rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white">
                Browse All
              </Link>
              <Link href="/contact" className="rounded-full border border-border px-5 py-2 text-sm font-semibold text-foreground/80 hover:bg-surface">
                Request a Product
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {productResult.map((product) => {
              const zoom = Math.max(80, Math.min(180, Number(product.imageZoom ?? 100)));
              const isZoomOut = zoom < 100;
              const hasDiscount = product.discountPrice && product.discountPrice < product.price;
              const displayPrice = hasDiscount ? product.discountPrice! : product.price;
              const isFromOtherStore = isSearching && product.marketplace_enabled !== 1;

              return (
                <article key={product.id}
                  className="glass-card group flex flex-col overflow-hidden rounded-2xl transition-shadow hover:shadow-md">

                  {/* Image */}
                  <div className="relative h-48 w-full overflow-hidden bg-surface-soft">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={product.image}
                      alt={product.name}
                      className={`h-full w-full transition-transform duration-300 group-hover:scale-105 ${isZoomOut ? "object-contain p-2" : "object-cover"}`}
                      style={{ backgroundColor: isZoomOut ? "#f0efe8" : undefined }}
                    />
                    {hasDiscount && (
                      <span className="absolute left-2 top-2 rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white shadow">
                        SALE
                      </span>
                    )}
                    {isFromOtherStore && (
                      <span className="absolute right-2 top-2 rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-bold text-sky-700">
                        Store product
                      </span>
                    )}
                  </div>

                  {/* Body */}
                  <div className="flex flex-1 flex-col gap-2 p-4">
                    {/* Category + Store */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-brand/70">
                        {product.category}
                      </span>
                      {product.storeName && (
                        <Link
                          href={`/store/${product.storeSlug ?? ""}`}
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-2 py-0.5 text-[10px] font-semibold text-foreground/60 hover:border-brand/30 hover:text-brand transition-colors"
                          title={`View ${product.storeName}`}
                        >
                          <Store size={9} />
                          {product.storeName}
                        </Link>
                      )}
                    </div>

                    {/* Name */}
                    <h2 className="line-clamp-2 text-sm font-bold text-foreground leading-snug">
                      {product.name}
                    </h2>

                    {/* Description */}
                    <p className="line-clamp-2 text-xs leading-relaxed text-foreground/60 flex-1">
                      {product.description}
                    </p>

                    {/* Unit info */}
                    <p className="text-[10px] text-foreground/50">
                      per {product.packageName} · {Number(product.unitValue)} {product.unitType}
                      {product.transportFee > 0 && (
                        <span className="ml-1">· +${Number(product.transportFee).toFixed(2)} shipping</span>
                      )}
                    </p>

                    {/* Price + CTA */}
                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/50">
                      <div>
                        <span className="text-base font-extrabold text-brand-deep">
                          <ProductPriceDisplay price={displayPrice} />
                        </span>
                        {hasDiscount && (
                          <span className="ml-1.5 text-xs text-foreground/40 line-through">
                            <ProductPriceDisplay price={product.price} />
                          </span>
                        )}
                      </div>
                      <AddToCartButton product={product} />
                    </div>

                    {/* View details */}
                    <Link href={`/products/${product.id}`}
                      className="mt-1 text-xs font-semibold text-brand hover:text-brand-deep hover:underline">
                      View details →
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* ── Pagination ── */}
        {totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-2">
            <Link href={href({ page: prevPage })}
              className={`rounded-full border px-5 py-2 text-sm font-semibold shadow-sm transition-colors ${currentPage <= 1 ? "pointer-events-none border-border/30 bg-surface text-foreground/30" : "border-border bg-white text-foreground/80 hover:bg-surface"}`}>
              ← Prev
            </Link>

            {/* Page numbers */}
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const start = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
              const pg = start + i;
              if (pg > totalPages) return null;
              return (
                <Link key={pg} href={href({ page: pg })}
                  className={`rounded-full border px-3.5 py-1.5 text-sm font-bold transition-colors ${pg === currentPage ? "border-brand bg-brand text-white" : "border-border bg-white text-foreground/70 hover:bg-surface"}`}>
                  {pg}
                </Link>
              );
            })}

            <Link href={href({ page: nextPage })}
              className={`rounded-full border px-5 py-2 text-sm font-semibold shadow-sm transition-colors ${currentPage >= totalPages ? "pointer-events-none border-border/30 bg-surface text-foreground/30" : "border-border bg-white text-foreground/80 hover:bg-surface"}`}>
              Next →
            </Link>
          </div>
        )}

      </main>

      <SiteFooter />
    </div>
  );
}
