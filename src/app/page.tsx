import { readdir } from "fs/promises";
import path from "path";
import Link from "next/link";
import type { Metadata } from "next";
import { FeaturedProductCard } from "@/components/featured-product-card";
import { HeroSlideshow } from "@/components/hero-slideshow";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { query } from "@/lib/db";
import type { Product } from "@/types";

type FeaturedProduct = Pick<
  Product,
  "id" | "name" | "price" | "image" | "description" | "category"
>;

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

const highlights = [
  "Verified seller network",
  "Quality-checked every order",
  "Fast support via WhatsApp and email",
];

async function getUploadedImages() {
  const uploadDir = path.join(process.cwd(), "public", "uploads");

  try {
    const files = await readdir(uploadDir, { withFileTypes: true });
    return files
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
      .filter((name) => /\.(png|jpg|jpeg|webp)$/i.test(name))
      .sort((a, b) => b.localeCompare(a))
      .map((name) => `/uploads/${name}`);
  } catch {
    return [] as string[];
  }
}

export const dynamic = "force-dynamic";

export default async function Home() {
  const [featuredProducts, uploadedImages] = await Promise.all([
    query<FeaturedProduct[]>(
      `SELECT id, name, price, image, description, category
       FROM products
       WHERE marketplace_enabled = 1 AND status = 'active'
       ORDER BY featured DESC, created_at DESC
       LIMIT 6`,
    ),
    getUploadedImages(),
  ]);

  const cards = featuredProducts.map((product, index) => {
    const swapImage = uploadedImages.find(
      (imagePath) => imagePath !== product.image && uploadedImages.indexOf(imagePath) % featuredProducts.length === index % Math.max(1, featuredProducts.length),
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

  const categories = [
    { name: "Seafood", emoji: "🦞", color: "from-blue-500/20 to-cyan-500/20" },
    { name: "Electronics", emoji: "💻", color: "from-violet-500/20 to-purple-500/20" },
    { name: "Fashion & Apparel", emoji: "👗", color: "from-pink-500/20 to-rose-500/20" },
    { name: "Health & Beauty", emoji: "💊", color: "from-emerald-500/20 to-teal-500/20" },
    { name: "African Raw Foods", emoji: "🌿", color: "from-lime-500/20 to-emerald-500/20" },
    { name: "Home & Living", emoji: "🏠", color: "from-amber-500/20 to-orange-500/20" },
  ];

  const testimonials = [
    {
      name: "Amara Okonkwo",
      role: "Store Owner, Lagos",
      text: "Setting up my store on Bushbuyer took minutes. My products are now reaching customers I never could have found on my own.",
      rating: 5,
    },
    {
      name: "James Kofi",
      role: "Online Shopper, Toronto",
      text: "Everything I need in one place — great sellers, fast delivery, and quality I can trust. Shopping here is effortless.",
      rating: 5,
    },
    {
      name: "Yvette Mukondi",
      role: "Small Business Owner, Paris",
      text: "The platform made it simple to list my products and connect with buyers worldwide. Sales have doubled since joining.",
      rating: 5,
    },
  ];

  const heroSlides = Array.from(
    new Set([
      ...uploadedImages.slice(0, 5),
      ...featuredProducts.map((product) => product.image).filter(Boolean),
    ]),
  ).slice(0, 6);

  return (
    <div className="min-h-screen">
      <SiteHeader />

      <main>
        <section className="relative overflow-hidden bg-gradient-to-br from-brand-deep/5 via-background to-accent/5 py-20 md:py-32">
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-0 right-0 w-96 h-96 bg-brand/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-accent/10 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4" />
          </div>

          <div className="container-shell relative z-10">
            <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-12">
              <div className="text-center lg:text-left">
                <p className="inline-flex items-center rounded-full border border-brand/20 bg-white/75 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-brand-deep mb-5">
                  Multi-Vendor Marketplace
                </p>
                <h1 className="text-4xl md:text-6xl font-black leading-[1.05] tracking-tight text-brand-deep mb-5">
                  Every store, every product,
                  <span className="block text-accent">one trusted marketplace.</span>
                </h1>
                <p className="mx-auto text-base md:text-lg leading-relaxed text-foreground/75 mb-8 max-w-2xl lg:mx-0">
                  Discover verified stores selling electronics, fashion, food, and more — all with quality-checked listings, secure checkout, and fast delivery to your door.
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
                  Explore Products
                </Link>
                <Link
                  href="/contact"
                  className="px-8 py-3.5 border-2 border-brand text-brand font-bold rounded-full text-lg transition-all hover:bg-brand/5"
                >
                  Get in Touch
                </Link>
              </div>

              <div className="grid grid-cols-1 gap-3 text-sm font-semibold text-foreground/80 sm:grid-cols-3 md:gap-6 md:text-base">
                <div className="flex items-center justify-center gap-2">
                  <span className="text-2xl">✓</span>
                  <span>Verified Sellers</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-2xl">✓</span>
                  <span>Secure Checkout</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-2xl">✓</span>
                  <span>Fast Worldwide Shipping</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 md:py-24">
          <div className="container-shell">
            <div className="text-center mb-12">
              <p className="section-kicker">Shop by Category</p>
              <h2 className="section-title mt-2 text-brand-deep">Browse What You Need</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              {categories.map((cat) => (
                <Link
                  key={cat.name}
                  href={`/products?category=${encodeURIComponent(cat.name)}`}
                  className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br ${cat.color} border border-border p-8 transition-all hover:shadow-lg hover:scale-105`}
                >
                  <div className="relative z-10">
                    <div className="text-5xl mb-4">{cat.emoji}</div>
                    <h3 className="text-2xl font-bold text-foreground mb-2">{cat.name}</h3>
                    <p className="text-foreground/70 text-sm">Browse collection →</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="container-shell pb-14">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <p className="section-kicker">Featured Products</p>
              <h2 className="section-title mt-2 text-brand-deep">Top Picks Across All Stores</h2>
            </div>
            <Link
              href="/products"
              className="inline-flex items-center gap-2 text-sm font-bold text-brand transition-colors hover:text-brand-deep"
            >
              View All →
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
              Browse All Products
            </Link>
          </div>
        </section>

        <section className="py-16 md:py-24 bg-gradient-to-br from-slate-50 to-slate-100/50">
          <div className="container-shell">
            <div className="text-center mb-16">
              <p className="section-kicker">Trusted by Thousands</p>
              <h2 className="section-title mt-2 text-brand-deep">What Our Community Says</h2>
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

        <section className="py-16 md:py-24">
          <div className="container-shell">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <p className="section-kicker">Limited Time</p>
                <h2 className="text-4xl md:text-5xl font-black text-brand-deep mb-4 leading-tight">
                  New Seller Launch Offer
                </h2>
                <p className="text-lg text-foreground/75 mb-6">
                  Open your store this week and get your first month free — no listing fees, no commission on your first 50 orders.
                </p>
                <ul className="space-y-3 mb-8 text-foreground/80">
                  <li className="flex items-center gap-3">
                    <span className="text-accent text-xl">✓</span>
                    <span>Free store setup in minutes</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="text-accent text-xl">✓</span>
                    <span>Reach buyers from day one</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="text-accent text-xl">✓</span>
                    <span>Built-in payments and delivery tools</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="text-accent text-xl">✓</span>
                    <span>Dedicated seller support</span>
                  </li>
                </ul>
                <Link
                  href="/contact"
                  className="inline-flex px-8 py-3.5 bg-gradient-to-r from-accent to-orange-600 text-white font-bold rounded-full text-lg transition-all hover:shadow-lg hover:shadow-accent/30"
                >
                  Open Your Store
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

        <section className="py-16 md:py-24 bg-gradient-to-br from-brand-deep to-brand-deep/90 text-white relative overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-96 h-96 bg-accent rounded-full blur-3xl" />
          </div>
          <div className="container-shell relative z-10">
            <div className="max-w-3xl">
              <p className="inline-block px-4 py-2 bg-white/10 rounded-full text-sm font-bold mb-6">🏢 Sellers & Brands</p>
              <h2 className="text-4xl md:text-5xl font-black mb-4 leading-tight">
                Grow Your Business With Us
              </h2>
              <p className="text-lg text-white/80 mb-8 max-w-2xl">
                List your products, reach a global audience, and manage everything from one powerful seller dashboard — built for stores of every size.
              </p>
              <Link
                href="/contact"
                className="inline-flex px-8 py-3.5 bg-accent text-brand-deep font-bold rounded-full text-lg transition-all hover:bg-yellow-400 hover:shadow-lg"
              >
                Become a Seller
              </Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
