"use client";

import { useCart } from "@/context/cart-context";
import { formatPrice } from "@/lib/utils";

interface Props {
  price: number;
  className?: string;
}

export function ProductPriceDisplay({ price, className }: Props) {
  const { currency } = useCart();
  return <span className={className}>{formatPrice(price, currency)}</span>;
}
