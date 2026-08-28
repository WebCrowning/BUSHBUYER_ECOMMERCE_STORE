import { StoreRepository } from "@/repositories/store.repository";
import { ProductRepository } from "@/repositories/product.repository";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { FeaturedProductCard } from "@/components/featured-product-card";
import { StoreQrCode } from "@/components/store/store-qr-code";
import { FollowButton } from "@/components/store/follow-button";
import { ShareModal } from "@/components/share-modal";
import { notFound } from "next/navigation";
import { StoreAttributor } from "@/components/store-attributor";
import { StoreBannerHeader } from "@/components/store/store-banner-header";
import { StoreLocationCard } from "@/components/store/store-location-card";
import { query } from "@/lib/db";
import { ShieldCheck, Star, MapPin, Phone, Mail, Clock, ShoppingBag, Users, Calendar, CircleHelp, Globe } from "lucide-react";

type FaqRow = {
  id: number;
  question: string;
  answer: string;
  category: string;
  store_id: number | null;
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const store = await StoreRepository.findBySlug(slug);
  if (!store) return { title: "Store Not Found" };
  return {
    title: `${store.name} - Bushbuyer Marketplace`,
    description: store.description || `Browse products from ${store.name} on Bushbuyer Marketplace.`,
  };
}

export default async function StoreProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const store = await StoreRepository.findBySlug(slug);

  if (!store) {
    notFound();
  }

  const products = await ProductRepository.listProducts({ store_id: store.id, limit: 30 });
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";
  const storeUrl = `${siteUrl}/store/${store.slug}`;

  // FAQ: prefer store-specific FAQs, fall back to global (store_id IS NULL)
  let faqs: FaqRow[] = [];
  let faqIsGlobalFallback = false;
  try {
    const storeFaqs = await query<FaqRow[]>(
      "SELECT id, question, answer, category, store_id FROM faq WHERE store_id = ? ORDER BY category ASC, updated_at DESC",
      [store.id]
    );
    if (storeFaqs.length > 0) {
      faqs = storeFaqs;
    } else {
      faqs = await query<FaqRow[]>(
        "SELECT id, question, answer, category, store_id FROM faq WHERE store_id IS NULL ORDER BY category ASC, updated_at DESC"
      );
      faqIsGlobalFallback = true;
    }
  } catch {
    faqs = [];
  }

  // Group FAQs by category
  const faqGrouped = faqs.reduce<Record<string, FaqRow[]>>((acc, f) => {
    const cat = f.category?.trim() || "General";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(f);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-gray-50/50 flex flex-col">
      <StoreAttributor storeId={store.id} storeSlug={store.slug} />
      <SiteHeader />

      <main className="flex-1 pb-16">
        {/* Store Banner & Cover Image Customizer */}
        <StoreBannerHeader
          storeId={store.id}
          storeName={store.name}
          initialBanner={store.banner ?? null}
        />

        {/* Store Info Header Card */}
        <div className="container-shell -mt-20 relative z-10">
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-gray-100 flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-gray-100 border-4 border-white shadow-md overflow-hidden shrink-0 flex items-center justify-center font-bold text-2xl text-emerald-700">
                {store.logo ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={store.logo} alt={store.name} className="w-full h-full object-cover" />
                ) : (
                  store.name.substring(0, 2).toUpperCase()
                )}
              </div>

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">{store.name}</h1>
                  {store.verification_status === "verified" && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-full text-xs font-bold shadow-sm">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      Verified Store
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-gray-600 max-w-2xl">{store.description}</p>

                <div className="mt-4 flex items-center gap-6 flex-wrap text-xs font-semibold text-gray-600">
                  <div className="flex items-center gap-1.5 text-amber-500">
                    <Star className="w-4 h-4 fill-amber-400" />
                    <span className="text-gray-900 font-bold text-sm">{store.rating_avg}</span>
                    <span className="text-gray-500">({store.rating_count} reviews)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-emerald-600" />
                    <span>{store.followers_count} Followers</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <ShoppingBag className="w-4 h-4 text-teal-600" />
                    <span>{store.products_sold_count} Sold</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <FollowButton storeId={store.id} initialFollowersCount={store.followers_count} />
              <ShareModal title={store.name} url={storeUrl} description={store.description || ""} triggerLabel="Share Store" />
              <StoreQrCode storeName={store.name} storeUrl={storeUrl} />
            </div>
          </div>

          {/* Business Details Grid */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-3 text-xs text-gray-600">
              <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-600" /> Location & Address
              </h3>
              <p>{store.address || "Address available upon order placement"}</p>
              <p className="font-semibold text-gray-800">{store.city ? `${store.city}, ${store.country}` : store.country}</p>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-3 text-xs text-gray-600">
              <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                <Phone className="w-4 h-4 text-emerald-600" /> Contact Seller
              </h3>
              {store.phone && <p className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-gray-400" /> {store.phone}</p>}
              {store.email && <p className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-gray-400" /> {store.email}</p>}
              {store.whatsapp && <p className="font-semibold text-emerald-700">WhatsApp: {store.whatsapp}</p>}
            </div>

            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-3 text-xs text-gray-600">
              <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-600" /> Business Hours & Status
              </h3>
              <p className="inline-block px-2.5 py-1 bg-emerald-100 text-emerald-800 font-bold rounded-lg uppercase">
                Status: {store.store_status}
              </p>
              <p className="flex items-center gap-1.5 text-gray-500">
                <Calendar className="w-3.5 h-3.5" /> Open Monday - Saturday
              </p>
            </div>
          </div>

          {/* Interactive Google Map & Physical Store Tracking */}
          <div className="mt-8">
            <StoreLocationCard store={store} />
          </div>

          {/* Store Products Catalog */}
          <div className="mt-12">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="section-kicker">Store Catalog</p>
                <h2 className="text-2xl font-bold text-gray-900">Products from {store.name}</h2>
              </div>
              <span className="text-xs font-semibold text-gray-500 bg-white px-3 py-1.5 rounded-xl border border-gray-200">
                {products.length} Products Available
              </span>
            </div>

            {products.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 shadow-sm">
                <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-gray-700">No products published yet</h3>
                <p className="text-sm text-gray-500">Check back soon for new arrivals from this store.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {products.map((product) => {
                  let galleryImages: string[] = [];
                  try {
                    if (product.gallery_images) {
                      const parsed = JSON.parse(product.gallery_images);
                      if (Array.isArray(parsed)) galleryImages = parsed;
                    }
                  } catch { /* non-fatal */ }

                  return (
                    <FeaturedProductCard
                      key={product.id}
                      id={product.id}
                      name={product.name}
                      price={product.price}
                      image={product.image}
                      galleryImages={galleryImages}
                      category={product.category}
                      shortNote={product.description?.substring(0, 80) || "Authentic quality product"}
                    />
                  );
                })}
              </div>
            )}
          </div>

          {/* Store FAQ Section */}
          {faqs.length > 0 && (
            <div className="mt-14">
              {faqIsGlobalFallback ? (
                /* ── Platform FAQ: collapsed by default ── */
                <details className="group rounded-2xl border border-gray-200 bg-white shadow-sm">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-5 marker:hidden">
                    <div className="flex items-center gap-3">
                      <CircleHelp className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                      <div>
                        <p className="section-kicker mb-0.5">Platform FAQ</p>
                        <h2 className="text-lg font-bold text-gray-900 leading-tight">
                          Frequently Asked Questions
                        </h2>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="inline-flex items-center gap-1.5 rounded-xl border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700">
                        <Globe className="w-3.5 h-3.5" />
                        Platform-wide · {faqs.length} Q&amp;A
                      </span>
                      <span className="rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-xs font-semibold text-gray-500 transition-all group-open:rotate-180">
                        ▼
                      </span>
                    </div>
                  </summary>

                  <div className="border-t border-gray-100 px-6 pb-6 pt-4 space-y-4">
                    {Object.entries(faqGrouped).map(([cat, items]) => (
                      <div key={cat} className="rounded-2xl border border-gray-100 bg-gray-50 p-5">
                        <h3 className="mb-4 flex items-center justify-between text-base font-bold text-gray-900">
                          {cat}
                          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                            {items.length}
                          </span>
                        </h3>
                        <div className="space-y-2">
                          {items.map((faq) => (
                            <details
                              key={faq.id}
                              className="group/faq rounded-xl border border-gray-200 bg-white p-4 open:shadow-sm"
                            >
                              <summary className="cursor-pointer list-none pr-6 text-sm font-semibold text-gray-800 marker:hidden">
                                {faq.question}
                              </summary>
                              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-gray-700">
                                {faq.answer}
                              </p>
                            </details>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </details>
              ) : (
                /* ── Store-specific FAQ: always visible ── */
                <>
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <p className="section-kicker">Store FAQ</p>
                      <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <CircleHelp className="w-6 h-6 text-emerald-600" />
                        Frequently Asked Questions
                      </h2>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {Object.entries(faqGrouped).map(([cat, items]) => (
                      <div key={cat} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                        <h3 className="mb-4 flex items-center justify-between text-base font-bold text-gray-900">
                          {cat}
                          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                            {items.length}
                          </span>
                        </h3>
                        <div className="space-y-2">
                          {items.map((faq) => (
                            <details
                              key={faq.id}
                              className="group rounded-xl border border-gray-200 bg-gray-50 p-4 open:bg-white open:shadow-sm"
                            >
                              <summary className="cursor-pointer list-none pr-6 text-sm font-semibold text-gray-800 marker:hidden">
                                {faq.question}
                              </summary>
                              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-gray-700">
                                {faq.answer}
                              </p>
                            </details>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
