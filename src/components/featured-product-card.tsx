"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ProductPriceDisplay } from "@/components/product-price-display";

const INTERVAL_MS = 3000;

type FeaturedProductCardProps = {
  id: number;
  name: string;
  price: number | string;
  image: string;
  galleryImages?: string[];
  swapImage?: string | null;
  category?: string;
  storeName?: string;
  storeSlug?: string;
  shortNote: string;
};

export function FeaturedProductCard({
  id,
  name,
  price,
  image,
  galleryImages = [],
  category,
  storeName,
  shortNote,
}: FeaturedProductCardProps) {
  const normalizedPrice = Number(price);

  // Combine main image + gallery into one ordered list
  const allImages = [image, ...galleryImages.filter(Boolean)];
  const hasMultiple = allImages.length > 1;

  const [activeIdx, setActiveIdx] = useState(0);
  const [prevIdx, setPrevIdx] = useState<number | null>(null);
  const [fading, setFading] = useState(false);
  const [paused, setPaused] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const goTo = (next: number) => {
    if (next === activeIdx) return;
    setPrevIdx(activeIdx);
    setFading(true);
    setTimeout(() => {
      setActiveIdx(next);
      setFading(false);
      setPrevIdx(null);
    }, 350);
  };

  useEffect(() => {
    if (!hasMultiple || paused) return;
    intervalRef.current = setInterval(() => {
      setActiveIdx((cur) => {
        const next = (cur + 1) % allImages.length;
        setPrevIdx(cur);
        setFading(true);
        setTimeout(() => {
          setFading(false);
          setPrevIdx(null);
        }, 350);
        return next;
      });
    }, INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMultiple, paused, allImages.length]);

  const currentImage = allImages[activeIdx] || image;

  return (
    <article className="group glass-card overflow-hidden rounded-2xl">
      <div
        className="relative h-52 overflow-hidden bg-surface-soft select-none"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {/* Previous image fading out */}
        {prevIdx !== null && (
          <img
            src={allImages[prevIdx] || image}
            alt={name}
            className="absolute inset-0 h-full w-full object-cover"
            style={{ opacity: fading ? 0 : 1, transition: "opacity 350ms ease" }}
            draggable={false}
          />
        )}

        {/* Current image */}
        <img
          src={currentImage}
          alt={name}
          className={`absolute inset-0 h-full w-full object-cover ${
            !hasMultiple ? "group-hover:scale-110 transition-transform duration-700" : ""
          }`}
          style={{ opacity: fading ? 0 : 1, transition: "opacity 350ms ease" }}
          draggable={false}
        />

        {/* Gradient overlay */}
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />

        {/* Category pill */}
        {category && (
          <p className="absolute bottom-3 left-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-brand-deep shadow-xs pointer-events-none">
            {category}
          </p>
        )}

        {/* Store badge */}
        {storeName && (
          <p className="absolute top-3 right-3 rounded-full bg-black/75 backdrop-blur-xs px-2.5 py-0.5 text-[10px] font-bold text-white shadow-xs truncate max-w-[160px] pointer-events-none">
            🏪 {storeName}
          </p>
        )}

        {/* Gallery count badge */}
        {hasMultiple && (
          <div className="absolute top-3 left-3 flex items-center gap-1 rounded-full bg-black/60 backdrop-blur-sm px-2 py-0.5 pointer-events-none">
            <span className="text-[9px] font-bold text-white/90">
              📷 {activeIdx + 1}/{allImages.length}
            </span>
          </div>
        )}

        {/* Dot indicators — clickable */}
        {hasMultiple && (
          <div className="absolute bottom-3 right-3 flex items-center gap-1 z-10">
            {allImages.map((_, i) => (
              <button
                key={i}
                aria-label={`View image ${i + 1}`}
                onClick={(e) => { e.preventDefault(); goTo(i); }}
                className={`rounded-full transition-all duration-300 ${
                  i === activeIdx
                    ? "w-4 h-1.5 bg-white shadow"
                    : "w-1.5 h-1.5 bg-white/50 hover:bg-white/80"
                }`}
              />
            ))}
          </div>
        )}
      </div>

      <div className="space-y-3 p-5">
        <h3 className="text-lg font-bold text-foreground">{name}</h3>
        <p className="text-sm leading-6 text-foreground/70 line-clamp-2">{shortNote}</p>
        <div className="flex items-center justify-between">
          <ProductPriceDisplay price={normalizedPrice} className="text-base font-bold text-brand-deep" />
          <Link
            href={`/products/${id}`}
            className="rounded-full border border-brand/30 px-3 py-1.5 text-sm font-semibold text-brand transition-colors hover:bg-brand hover:text-white"
          >
            View
          </Link>
        </div>
      </div>
    </article>
  );
}

