import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AddToCartButton } from "@/components/add-to-cart-button";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { query } from "@/lib/db";
import { toId } from "@/lib/utils";
import type { Product } from "@/types";

import { ShareModal } from "@/components/share-modal";
import { StoreAttributor } from "@/components/store-attributor";
import { ProductPriceDisplay } from "@/components/product-price-display";
import { StoreLocationCard } from "@/components/store/store-location-card";
import { StoreRepository } from "@/repositories/store.repository";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const productId = toId(id);
  if (!productId) return { title: "Product Not Found | Bushbuyer" };

  try {
    const rows = await query<Product[]>(
      "SELECT id, name, price, description, image, category FROM products WHERE id = ? LIMIT 1",
      [productId]
    );
    const product = rows[0];
    if (!product) return { title: "Product Not Found | Bushbuyer" };

    const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://bushbuyer.com").replace(/\/$/, "");
    const title = `${product.name} | Bushbuyer Marketplace`;
    const description = product.description
      ? product.description.slice(0, 160)
      : `Buy authentic ${product.name} on Bushbuyer Marketplace. Direct from trusted African suppliers.`;

    return {
      title,
      description,
      alternates: {
        canonical: `${baseUrl}/products/${product.id}`,
      },
      openGraph: {
        title,
        description,
        url: `${baseUrl}/products/${product.id}`,
        images: product.image ? [{ url: product.image, alt: product.name }] : undefined,
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: product.image ? [product.image] : undefined,
      },
    };
  } catch {
    return { title: "Product Details | Bushbuyer" };
  }
}

export default async function ProductDetailsPage({ params }: Props) {

  const { id } = await params;
  const productId = toId(id);

  if (!productId) {
    notFound();
  }

  const rows = await query<(Product & { store_id?: number; status?: string; admin_blocked?: number })[]>(
    "SELECT id, name, price, transport_fee AS transportFee, image, image_zoom AS imageZoom, description, featured, category, package_name AS packageName, unit_type AS unitType, unit_value AS unitValue, stock_packages AS stockPackages, store_id, status, admin_blocked FROM products WHERE id = ? LIMIT 1",
    [productId],
  );

  const product = rows[0];
  if (!product || product.status === "blocked" || product.admin_blocked === 1) {
    notFound();
  }

  const zoom = Math.max(80, Math.min(180, Number(product.imageZoom ?? 100)));
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";
  const productUrl = `${siteUrl}/products/${product.id}`;

  // Fetch associated store for location display
  const store = product.store_id ? await StoreRepository.findById(product.store_id) : null;

  return (
    <div className="min-h-screen">
      {product.store_id ? <StoreAttributor storeId={product.store_id} /> : null}
      <SiteHeader />
      <main className="container-shell py-10">
        <div className="mb-5 flex items-center justify-between text-sm">
          <Link href="/products" className="font-semibold text-brand hover:text-brand-deep">
            Back to products
          </Link>
          <ShareModal title={product.name} url={productUrl} description={product.description || ""} triggerLabel="Share Product" />
        </div>

        <div className="glass-card grid gap-6 rounded-3xl p-6 md:grid-cols-2 md:p-8">
          <div className="h-[380px] w-full overflow-hidden rounded-2xl">
            {(() => {
              const zoom = Math.max(80, Math.min(180, Number(product.imageZoom ?? 100)));
              const isZoomOut = zoom < 100;
              return (
                <Image
                  src={product.image}
                  alt={product.name}
                  width={880}
                  height={640}
                  className={`h-[380px] w-full rounded-2xl ${isZoomOut ? "object-contain" : "object-cover"}`}
                  style={{
                    transform: `scale(${zoom / 100})`,
                    transformOrigin: "center center",
                    backgroundColor: isZoomOut ? "#f0efe8" : "transparent",
                  }}
                  unoptimized
                />
              );
            })()}
          </div>

          <div>
            <p className="section-kicker">{product.category}</p>
            <h1 className="mt-3 text-3xl font-bold text-brand-deep">{product.name}</h1>
            <p className="mt-4 text-sm leading-7 text-foreground/75">{product.description}</p>

            <div className="mt-6 flex items-center justify-between rounded-2xl border border-border bg-surface p-4">
              <span className="text-2xl font-bold text-brand-deep">
                <ProductPriceDisplay price={Number(product.price)} />
              </span>
              <span className="text-sm font-semibold text-foreground/70">
                Available: {Number(product.stockPackages)} packages ({Number(product.unitValue) * Number(product.stockPackages)} {product.unitType})
              </span>
            </div>

            <p className="mt-3 text-sm text-foreground/70">
              Sold per {product.packageName} ({Number(product.unitValue)} {product.unitType} per package)
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <AddToCartButton
                product={product}
                className="rounded-full bg-brand px-7 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-deep"
              />
              {store?.slug && (
                <Link
                  href={`/store/${store.slug}`}
                  className="inline-flex items-center gap-2 rounded-full border border-brand px-7 py-3 text-sm font-semibold text-brand transition-colors hover:bg-brand hover:text-white"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                    <polyline points="9 22 9 12 15 12 15 22"/>
                  </svg>
                  Visit Store
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Store Location Section */}
        {store && (
          <div className="mt-6">
            <div className="flex items-center gap-3 mb-3">
              <span className="flex-1 h-px bg-gray-200" />
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Store Location</span>
              <span className="flex-1 h-px bg-gray-200" />
            </div>
            <StoreLocationCard store={store} variant="compact" />
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
