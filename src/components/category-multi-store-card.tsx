"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Store as StoreIcon, ChevronRight, ArrowRight, ShoppingBag, ChevronLeft, RefreshCw } from "lucide-react";
import { USD_TO_XAF, formatCurrency } from "@/lib/utils";
import { ProductPriceDisplay } from "@/components/product-price-display";
import type { Product } from "@/types";

export interface CategoryShowcaseData {
  name: string;
  slug: string;
  icon?: string | null;
  emoji?: string;
  color?: string;
  description?: string;
  products: Product[];
  stores: Array<{ id: number; name: string; slug: string }>;
}

interface CategoryMultiStoreCardProps {
  showcase: CategoryShowcaseData;
}

const ITEMS_PER_VIEW = 4;
const AUTO_ROTATE_INTERVAL_MS = 4500;

export function CategoryMultiStoreCard({ showcase }: CategoryMultiStoreCardProps) {
  const { name, icon, emoji, description, products, stores } = showcase;
  const [currentPage, setCurrentPage] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isFading, setIsFading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const totalPages = Math.ceil(products.length / ITEMS_PER_VIEW);
  const storeNames = stores.map((s) => s.name);

  // Rotate between products from different stores every 4.5 seconds
  useEffect(() => {
    if (totalPages <= 1 || isPaused) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setIsFading(true);
      setTimeout(() => {
        setCurrentPage((prev) => (prev + 1) % totalPages);
        setIsFading(false);
      }, 250);
    }, AUTO_ROTATE_INTERVAL_MS);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [totalPages, isPaused]);

  function goToPage(pageIdx: number) {
    if (pageIdx === currentPage) return;
    setIsFading(true);
    setTimeout(() => {
      setCurrentPage(pageIdx);
      setIsFading(false);
    }, 200);
  }

  function handlePrev() {
    setIsFading(true);
    setTimeout(() => {
      setCurrentPage((prev) => (prev - 1 + totalPages) % totalPages);
      setIsFading(false);
    }, 200);
  }

  function handleNext() {
    setIsFading(true);
    setTimeout(() => {
      setCurrentPage((prev) => (prev + 1) % totalPages);
      setIsFading(false);
    }, 200);
  }

  const startIdx = currentPage * ITEMS_PER_VIEW;
  const currentProducts = products.slice(startIdx, startIdx + ITEMS_PER_VIEW);

  return (
    <article
      className="group relative rounded-3xl border border-border bg-white shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col justify-between"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Category Card Header */}
      <div className="p-5 pb-4 border-b border-gray-100 bg-gradient-to-br from-slate-50 to-white">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-2xl shadow-sm shrink-0">
              {icon || emoji || "📦"}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-brand-deep group-hover:text-emerald-700 transition-colors">
                  {name}
                </h3>
              </div>
              <p className="text-xs text-foreground/60 line-clamp-1 mt-0.5">
                {description || `Browse quality ${name.toLowerCase()} from verified local sellers`}
              </p>
            </div>
          </div>

          <Link
            href={`/products?category=${encodeURIComponent(name)}`}
            className="shrink-0 p-2 rounded-xl bg-surface hover:bg-emerald-50 text-foreground/60 hover:text-emerald-700 transition-colors"
            title={`View all ${name} products`}
          >
            <ChevronRight size={18} />
          </Link>
        </div>

        {/* Multi-Store Attribution Pill */}
        <div className="mt-3 flex items-center justify-between gap-2">
          {stores.length > 0 && (
            <div className="flex-1 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-800 bg-emerald-50/80 border border-emerald-200/70 px-3 py-1 rounded-xl truncate">
              <StoreIcon size={13} className="shrink-0 text-emerald-700" />
              <span className="truncate">
                {stores.length === 1
                  ? `Available from ${stores[0].name}`
                  : `From ${stores.length} stores: ${storeNames.slice(0, 2).join(", ")}${storeNames.length > 2 ? ` +${storeNames.length - 2}` : ""}`}
              </span>
            </div>
          )}

          {/* Auto-cycling indicator when multiple pages of store products exist */}
          {totalPages > 1 && (
            <div className="shrink-0 flex items-center gap-1 bg-gray-100/80 px-2 py-0.5 rounded-lg text-[10px] font-bold text-gray-600">
              <RefreshCw size={10} className={`text-emerald-600 ${!isPaused ? "animate-spin" : ""}`} style={{ animationDuration: "3s" }} />
              <span>{currentPage + 1}/{totalPages}</span>
            </div>
          )}
        </div>
      </div>

      {/* Products Showcase Grid with dynamic cycling across stores */}
      <div className="p-4 flex-1">
        {products.length === 0 ? (
          <div className="py-8 text-center text-xs text-foreground/50">
            <ShoppingBag size={24} className="mx-auto mb-1.5 text-foreground/30" />
            No products currently listed in this category.
          </div>
        ) : (
          <div
            className={`grid grid-cols-2 gap-3 transition-opacity duration-200 ${
              isFading ? "opacity-30 scale-[0.98]" : "opacity-100 scale-100"
            }`}
          >
            {currentProducts.map((product) => (
              <Link
                key={`${product.id}-${currentPage}`}
                href={`/products/${product.id}`}
                className="group/item flex flex-col justify-between rounded-2xl border border-gray-100 bg-surface/50 p-2.5 hover:border-emerald-300 hover:bg-emerald-50/30 transition-all shadow-none hover:shadow-sm"
              >
                {/* Thumbnail Image */}
                <div className="relative h-28 w-full rounded-xl overflow-hidden bg-white mb-2 border border-gray-100">
                  {product.image ? (
                    <img
                      src={product.image}
                      alt={product.name}
                      className="h-full w-full object-cover group-hover/item:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center font-bold text-foreground/30 text-xs">
                      No photo
                    </div>
                  )}

                  {/* Store Name Badge on thumbnail */}
                  {product.storeName && (
                    <span className="absolute bottom-1.5 left-1.5 right-1.5 rounded-md bg-black/75 backdrop-blur-xs px-1.5 py-0.5 text-[9px] font-bold text-white truncate text-center shadow-sm">
                      🏪 {product.storeName}
                    </span>
                  )}
                </div>

                {/* Product Title & Pricing */}
                <div>
                  <h4 className="text-xs font-bold text-gray-900 group-hover/item:text-emerald-700 line-clamp-1 leading-snug">
                    {product.name}
                  </h4>
                  <div className="mt-1 flex items-baseline justify-between gap-1">
                    <span className="text-xs font-extrabold text-brand-deep">
                      <ProductPriceDisplay price={Number(product.price)} />
                    </span>
                    <span className="text-[10px] font-semibold text-emerald-700">
                      {formatCurrency(Math.round(Number(product.price) * USD_TO_XAF), "XAF")} CFA
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Category Card Footer with Pagination Controls & Link */}
      <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handlePrev}
                className="p-1 rounded-lg border border-gray-200 bg-white hover:bg-emerald-50 text-gray-600 hover:text-emerald-700 transition-colors"
                title="Previous products"
              >
                <ChevronLeft size={12} />
              </button>
              {Array.from({ length: totalPages }).map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => goToPage(idx)}
                  className={`h-1.5 rounded-full transition-all ${
                    idx === currentPage ? "w-4 bg-emerald-600" : "w-1.5 bg-gray-300 hover:bg-gray-400"
                  }`}
                  title={`Page ${idx + 1}`}
                />
              ))}
              <button
                type="button"
                onClick={handleNext}
                className="p-1 rounded-lg border border-gray-200 bg-white hover:bg-emerald-50 text-gray-600 hover:text-emerald-700 transition-colors"
                title="Next products"
              >
                <ChevronRight size={12} />
              </button>
            </div>
          )}
          <span className="text-[11px] font-medium text-foreground/60">
            {products.length} product{products.length !== 1 ? "s" : ""}
          </span>
        </div>

        <Link
          href={`/products?category=${encodeURIComponent(name)}`}
          className="inline-flex items-center gap-1 text-xs font-extrabold text-emerald-700 hover:text-emerald-900 transition-colors"
        >
          <span>Shop {name}</span>
          <ArrowRight size={13} />
        </Link>
      </div>
    </article>
  );
}
