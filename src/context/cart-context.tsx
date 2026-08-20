"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { CartItem, CurrencyCode, Product } from "@/types";

type CartContextValue = {
  items: CartItem[];
  currency: CurrencyCode;
  setCurrency: (currency: CurrencyCode) => void;
  addItem: (product: Product, quantity: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  removeItem: (productId: number) => void;
  clearCart: () => void;
  totalItems: number;
  subtotal: number;
  whatsappText: string;
};

const CartContext = createContext<CartContextValue | null>(null);

const CART_STORAGE_KEY = "Bushbuyer_cart";
const CURRENCY_STORAGE_KEY = "Bushbuyer_currency";

function normalizePackageQuantity(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return 1;
  }
  return Math.max(1, Math.round(value));
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [currency, setCurrencyState] = useState<CurrencyCode>("USD");
  const [storageReady, setStorageReady] = useState(false);

  useEffect(() => {
    try {
      const savedItems = window.localStorage.getItem(CART_STORAGE_KEY);
      if (savedItems) {
        const parsed = JSON.parse(savedItems) as Array<Partial<CartItem>>;
        setItems(
          parsed.map((item) => ({
            productId: Number(item.productId ?? 0),
            storeId: item.storeId ? Number(item.storeId) : 1,
            storeName: item.storeName ? String(item.storeName) : "Flagship Store",
            name: String(item.name ?? ""),
            price: Number(item.price ?? 0),
            transportFee: Number(item.transportFee ?? 0),
            image: String(item.image ?? ""),
            quantityPackages: normalizePackageQuantity(Number(item.quantityPackages ?? 1)),
            packageName: ((item.packageName as string) || "pack") as CartItem["packageName"],
            unitType: item.unitType === "kg" ? "kg" : "pcs",
            unitValue: Math.max(0.001, Number(item.unitValue ?? 1)),
          })),
        );
      }

      const savedCurrency = window.localStorage.getItem(CURRENCY_STORAGE_KEY);
      if (savedCurrency === "XAF" || savedCurrency === "USD") {
        setCurrencyState(savedCurrency);
      } else {
        try {
          const tz = typeof Intl !== "undefined" && Intl.DateTimeFormat ? Intl.DateTimeFormat().resolvedOptions().timeZone || "" : "";
          const lang = typeof navigator !== "undefined" ? navigator.language || "" : "";
          const isCameroon =
            tz.includes("Douala") ||
            tz.includes("Cameroon") ||
            lang.toLowerCase().includes("cm") ||
            lang.toLowerCase() === "fr-cm" ||
            lang.toLowerCase() === "en-cm";
          if (isCameroon) {
            setCurrencyState("XAF");
          }
        } catch {
          // Default to USD
        }
      }
    } catch {
      // Ignore storage parsing errors and keep safe defaults.
    } finally {
      setStorageReady(true);
    }
  }, []);

  useEffect(() => {
    if (!storageReady) {
      return;
    }
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  }, [items, storageReady]);

  useEffect(() => {
    if (!storageReady) {
      return;
    }
    localStorage.setItem(CURRENCY_STORAGE_KEY, currency);
  }, [currency, storageReady]);

  function addItem(product: Product, quantity: number) {
    setItems((prev) => {
      const normalizedQuantity = normalizePackageQuantity(quantity);

      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        return prev.map((item) =>
          item.productId === product.id
            ? {
                ...item,
                quantityPackages: normalizePackageQuantity(item.quantityPackages + normalizedQuantity),
              }
            : item,
        );
      }

      return [
        ...prev,
        {
          productId: product.id,
          storeId: product.storeId || 1,
          storeName: product.storeName || "Flagship Store",
          name: product.name,
          price: Number(product.price),
          transportFee: Number(product.transportFee ?? 0),
          image: product.image,
          quantityPackages: normalizedQuantity,
          packageName: product.packageName,
          unitType: product.unitType,
          unitValue: Number(product.unitValue),
        },
      ];
    });
  }

  function updateQuantity(productId: number, quantity: number) {
    if (quantity <= 0) {
      removeItem(productId);
      return;
    }

    setItems((prev) =>
      prev.map((item) =>
        item.productId === productId
          ? {
              ...item,
              quantityPackages: normalizePackageQuantity(Math.min(10000, quantity)),
            }
          : item,
      ),
    );
  }

  function removeItem(productId: number) {
    setItems((prev) => prev.filter((item) => item.productId !== productId));
  }

  function clearCart() {
    setItems([]);
  }

  function setCurrency(currencyCode: CurrencyCode) {
    setCurrencyState(currencyCode);
  }

  const totalItems = useMemo(
    () => items.reduce((sum, item) => sum + item.quantityPackages, 0),
    [items],
  );

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.price * item.quantityPackages, 0),
    [items],
  );

  const whatsappText = useMemo(() => {
    if (items.length === 0) {
      return "Hello Bushbuyer, I need help placing my order.";
    }

    const lines = items.map((item, index) => {
      const quantityLabel = `${item.quantityPackages} ${item.packageName}${item.quantityPackages > 1 ? "s" : ""}`;
      const itemTotal = item.price * item.quantityPackages;
      const transportTotalForItem = item.transportFee * item.quantityPackages;

      return `${index + 1}. ${item.name}\n   Qty: ${quantityLabel}\n   Item total: $${itemTotal.toFixed(2)}\n   Transport: $${transportTotalForItem.toFixed(2)}`;
    });

    const transportTotal = items.reduce(
      (sum, item) => sum + item.transportFee * item.quantityPackages,
      0,
    );

    return [
      "Hello Bushbuyer, I want to place this order:",
      "",
      "Order items:",
      ...lines,
      "",
      "Order summary:",
      `Products subtotal: $${subtotal.toFixed(2)}`,
      `Transport fees: $${transportTotal.toFixed(2)}`,
      `Grand total: $${(subtotal + transportTotal).toFixed(2)}`,
      "",
      "Please confirm availability and next steps. Thank you.",
    ].join("\n");
  }, [items, subtotal]);

  return (
    <CartContext.Provider
      value={{
        items,
        currency,
        setCurrency,
        addItem,
        updateQuantity,
        removeItem,
        clearCart,
        totalItems,
        subtotal,
        whatsappText,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart must be used within CartProvider");
  }
  return ctx;
}
