"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useTranslation } from "@/hooks/use-translation";
import { FeaturedProductCard } from "@/components/featured-product-card";
import { HeroSlideshow } from "@/components/hero-slideshow";
import type { Product } from "@/types";

import { CategoryMultiStoreCard, CategoryShowcaseData } from "@/components/category-multi-store-card";

type FeaturedProduct = Pick<
  Product,
  "id" | "name" | "price" | "image" | "description" | "category"
> & { shortNote: string; swapImage: string | null; storeId?: number; storeName?: string; storeSlug?: string };

interface HomeClientProps {
  cards: FeaturedProduct[];
  heroSlides: string[];
  uploadedImages: string[];
  categoryShowcases?: CategoryShowcaseData[];
}

export function HomeClient({ cards, heroSlides, uploadedImages, categoryShowcases = [] }: HomeClientProps) {
  const { t } = useTranslation();
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status !== "authenticated" || !session?.user) return;
    const user = session.user as { role?: string; storeIds?: number[]; referredStoreSlug?: string | null };
    const role = user.role || "customer";
    const storeIds = user.storeIds || [];
    const referredStoreSlug = user.referredStoreSlug;

    if (role === "customer" && storeIds.length === 0 && referredStoreSlug) {
      router.replace(`/store/${referredStoreSlug}`);
    }
  }, [status, session, router]);

  const fallbackCategories = [
    { name: "Electronics & Computing", emoji: "💻", color: "from-violet-500/20 to-purple-500/20" },
    { name: "Phones & Gadgets", emoji: "📱", color: "from-indigo-500/20 to-blue-500/20" },
    { name: "Fashion & Clothing", emoji: "👗", color: "from-pink-500/20 to-rose-500/20" },
    { name: "Food & Groceries", emoji: "🛒", color: "from-amber-500/20 to-orange-500/20" },
    { name: "African Raw Foods & Spices", emoji: "🌿", color: "from-lime-500/20 to-emerald-500/20" },
    { name: "Beauty, Cosmetics & Hair", emoji: "💄", color: "from-emerald-500/20 to-teal-500/20" },
  ];

  const testimonials = [
    {
      name: "Amara Okonkwo",
      role: t("home_testimonial_1_role"),
      text: t("home_testimonial_1_text"),
      rating: 5,
    },
    {
      name: "James Kofi",
      role: t("home_testimonial_2_role"),
      text: t("home_testimonial_2_text"),
      rating: 5,
    },
    {
      name: "Yvette Mukondi",
      role: t("home_testimonial_3_role"),
      text: t("home_testimonial_3_text"),
      rating: 5,
    },
  ];

  return (
    <main>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-deep/5 via-background to-accent/5 py-20 md:py-32">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-96 h-96 bg-brand/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-accent/10 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4" />
        </div>

        <div className="container-shell relative z-10">
          <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-12">
            <div className="text-center lg:text-left">
              <p className="inline-flex items-center rounded-full border border-brand/20 bg-white/75 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-brand-deep mb-5">
                {t("home_badge")}
              </p>
              <h1 className="text-4xl md:text-6xl font-black leading-[1.05] tracking-tight text-brand-deep mb-5">
                {t("home_hero_title_1")}
                <span className="block text-accent">{t("home_hero_title_2")}</span>
              </h1>
              <p className="mx-auto text-base md:text-lg leading-relaxed text-foreground/75 mb-8 max-w-2xl lg:mx-0">
                {t("home_hero_desc")}
              </p>
            </div>

            <div className="mx-auto w-full max-w-xl lg:mx-0">
              <HeroSlideshow images={heroSlides} />
            </div>
          </div>

          <div className="mx-auto mt-12 max-w-4xl text-center">
            <div className="mb-8 flex flex-wrap justify-center gap-4">
              <Link
                href="/products"
                className="group relative px-8 py-3.5 bg-gradient-to-r from-brand to-brand-deep text-white font-bold rounded-full text-lg transition-all hover:shadow-lg hover:shadow-brand/30 active:scale-95"
              >
                {t("home_explore_products")}
              </Link>
              <Link
                href="/store/apply"
                className="px-8 py-3.5 border-2 border-brand text-brand font-bold rounded-full text-lg transition-all hover:bg-brand/5"
              >
                {t("home_create_store")}
              </Link>
            </div>

            <div className="grid grid-cols-1 gap-3 text-sm font-semibold text-foreground/80 sm:grid-cols-3 md:gap-6 md:text-base">
              <div className="flex items-center justify-center gap-2">
                <span className="text-2xl">✓</span>
                <span>{t("home_verified_sellers")}</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <span className="text-2xl">✓</span>
                <span>{t("home_secure_checkout")}</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <span className="text-2xl">✓</span>
                <span>{t("home_fast_shipping")}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Multi-Store Categories Showcase (Products from different stores organized by category) */}
      <section className="py-16 md:py-24 bg-gradient-to-b from-transparent via-slate-50/50 to-transparent">
        <div className="container-shell">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
            <div>
              <p className="section-kicker">{t("home_categories_kicker")}</p>
              <h2 className="section-title mt-2 text-brand-deep">
                Shop by Category &amp; Multi-Vendor Stores
              </h2>
              <p className="text-sm text-foreground/70 mt-1 max-w-2xl">
                Explore products and compare offerings from multiple verified Cameroon stores in every category.
              </p>
            </div>

            <Link
              href="/products"
              className="inline-flex items-center gap-2 text-sm font-bold text-emerald-700 hover:text-emerald-900 transition-colors"
            >
              Browse All Stores &amp; Categories →
            </Link>
          </div>

          {categoryShowcases.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {categoryShowcases.map((showcase) => (
                <CategoryMultiStoreCard key={showcase.slug || showcase.name} showcase={showcase} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              {fallbackCategories.map((cat) => (
                <Link
                  key={cat.name}
                  href={`/products?category=${encodeURIComponent(cat.name)}`}
                  className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br ${cat.color} border border-border p-8 transition-all hover:shadow-lg hover:scale-105`}
                >
                  <div className="relative z-10">
                    <div className="text-5xl mb-4">{cat.emoji}</div>
                    <h3 className="text-2xl font-bold text-foreground mb-2">{cat.name}</h3>
                    <p className="text-foreground/70 text-sm">{t("home_browse_collection")}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Featured Products */}
      <section className="container-shell pb-14">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <p className="section-kicker">{t("home_featured_kicker")}</p>
            <h2 className="section-title mt-2 text-brand-deep">{t("home_featured_title")}</h2>
          </div>
          <Link
            href="/products"
            className="inline-flex items-center gap-2 text-sm font-bold text-brand transition-colors hover:text-brand-deep"
          >
            {t("home_view_all")}
          </Link>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((product) => (
            <FeaturedProductCard key={product.id} {...product} />
          ))}
        </div>

        <div className="mt-10 text-center">
          <Link
            href="/products"
            className="inline-flex items-center justify-center rounded-full bg-brand px-8 py-3 text-sm font-bold text-white transition-all hover:bg-brand-deep"
          >
            {t("home_browse_all")}
          </Link>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 md:py-24 bg-gradient-to-br from-slate-50 to-slate-100/50">
        <div className="container-shell">
          <div className="text-center mb-16">
            <p className="section-kicker">{t("home_testimonials_kicker")}</p>
            <h2 className="section-title mt-2 text-brand-deep">{t("home_testimonials_title")}</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial) => (
              <div key={testimonial.name} className="glass-card rounded-2xl p-8">
                <div className="flex items-center gap-1 mb-4">
                  {Array.from({ length: testimonial.rating }).map((_, i) => (
                    <span key={i} className="text-lg">⭐</span>
                  ))}
                </div>
                <p className="text-foreground/80 leading-relaxed mb-6 italic">&quot;{testimonial.text}&quot;</p>
                <div>
                  <p className="font-bold text-foreground">{testimonial.name}</p>
                  <p className="text-sm text-foreground/60">{testimonial.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Seller Offer */}
      <section className="py-16 md:py-24">
        <div className="container-shell">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <p className="section-kicker">{t("home_offer_kicker")}</p>
              <h2 className="text-4xl md:text-5xl font-black text-brand-deep mb-4 leading-tight">
                {t("home_offer_title")}
              </h2>
              <p className="text-lg text-foreground/75 mb-6">
                {t("home_offer_desc")}
              </p>
              <ul className="space-y-3 mb-8 text-foreground/80">
                <li className="flex items-center gap-3">
                  <span className="text-accent text-xl">✓</span>
                  <span>{t("home_offer_li1")}</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="text-accent text-xl">✓</span>
                  <span>{t("home_offer_li2")}</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="text-accent text-xl">✓</span>
                  <span>{t("home_offer_li3")}</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="text-accent text-xl">✓</span>
                  <span>{t("home_offer_li4")}</span>
                </li>
              </ul>
              <Link
                href="/contact"
                className="inline-flex px-8 py-3.5 bg-gradient-to-r from-accent to-orange-600 text-white font-bold rounded-full text-lg transition-all hover:shadow-lg hover:shadow-accent/30"
              >
                {t("home_open_your_store")}
              </Link>
            </div>
            <div className="relative">
              <div className="grid grid-cols-2 gap-3">
                {uploadedImages.slice(0, 4).map((img, idx) => (
                  <div key={idx} className="aspect-square rounded-xl overflow-hidden shadow-lg hover:scale-105 transition-transform">
                    <img src={img} alt={`showcase-${idx}`} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Grow with us */}
      <section className="py-16 md:py-24 bg-gradient-to-br from-brand-deep to-brand-deep/90 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-accent rounded-full blur-3xl" />
        </div>
        <div className="container-shell relative z-10">
          <div className="max-w-3xl">
            <p className="inline-block px-4 py-2 bg-white/10 rounded-full text-sm font-bold mb-6">🏢 {t("home_grow_kicker")}</p>
            <h2 className="text-4xl md:text-5xl font-black mb-4 leading-tight">
              {t("home_grow_title")}
            </h2>
            <p className="text-lg text-white/80 mb-8 max-w-2xl">
              {t("home_grow_desc")}
            </p>
            <Link
              href="/contact"
              className="inline-flex px-8 py-3.5 bg-accent text-brand-deep font-bold rounded-full text-lg transition-all hover:bg-yellow-400 hover:shadow-lg"
            >
              {t("home_become_seller")}
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
