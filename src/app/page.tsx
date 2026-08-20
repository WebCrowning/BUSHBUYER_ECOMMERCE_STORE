import { readdir } from "fs/promises";
import path from "path";
import type { Metadata } from "next";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { HomeClient } from "@/components/home-client";
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

async function getUploadedImages() {
  // Only read from the products subfolder so store owner banner images
  // (stored under /uploads/stores/) never appear on the main marketplace page.
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

  const heroSlides = Array.from(
    new Set([
      ...uploadedImages.slice(0, 5),
      ...featuredProducts.map((product) => product.image).filter(Boolean),
    ]),
  ).slice(0, 6);

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <HomeClient cards={cards} heroSlides={heroSlides} uploadedImages={uploadedImages} />
      <SiteFooter />
    </div>
  );
}
