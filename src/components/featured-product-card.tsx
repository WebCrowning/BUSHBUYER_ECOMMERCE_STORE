import Image from "next/image";
import Link from "next/link";
import { ProductPriceDisplay } from "@/components/product-price-display";

type FeaturedProductCardProps = {
  id: number;
  name: string;
  price: number | string;
  image: string;
  swapImage?: string | null;
  category?: string;
  shortNote: string;
};

export function FeaturedProductCard({
  id,
  name,
  price,
  image,
  swapImage,
  category,
  shortNote,
}: FeaturedProductCardProps) {
  const normalizedPrice = Number(price);

  return (
    <article className="group glass-card overflow-hidden rounded-2xl">
      <div className="relative h-52 overflow-hidden bg-surface-soft">
        <Image
          src={image}
          alt={name}
          width={720}
          height={460}
          className={`absolute inset-0 h-full w-full object-cover transition duration-700 ${
            swapImage ? "swap-primary" : "group-hover:scale-110"
          }`}
          unoptimized
        />
        {swapImage && (
          <Image
            src={swapImage}
            alt={`${name} alternate`}
            width={720}
            height={460}
            className="swap-secondary absolute inset-0 h-full w-full object-cover"
            unoptimized
          />
        )}
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/55 to-transparent" />
        {category && (
          <p className="absolute bottom-3 left-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-brand-deep">
            {category}
          </p>
        )}
      </div>
      <div className="space-y-3 p-5">
        <h3 className="text-lg font-bold text-foreground">{name}</h3>
        <p className="text-sm leading-6 text-foreground/70">{shortNote}</p>
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
