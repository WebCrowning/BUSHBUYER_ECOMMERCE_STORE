"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CurrencyToggle } from "@/components/currency-toggle";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { useCart } from "@/context/cart-context";
import { useTranslation } from "@/hooks/use-translation";
import { formatCurrency } from "@/lib/utils";

const USD_TO_XAF = 600;

type InventoryRow = {
  id: number;
  stockPackages: number;
  unitType: "pcs" | "kg";
  unitValue: number;
  packageName: "pack" | "bag" | "bundle" | "carton";
};

export default function CartPage() {
  const router = useRouter();
  const { items, currency, subtotal, updateQuantity, removeItem, whatsappText } = useCart();
  const { t } = useTranslation();
  const [inventoryByProduct, setInventoryByProduct] = useState<Record<number, InventoryRow>>({});
  const [inventoryChecked, setInventoryChecked] = useState(false);
  const [stockPopupOpen, setStockPopupOpen] = useState(false);
  const [stockPopupTitle, setStockPopupTitle] = useState("");
  const [stockPopupMessage, setStockPopupMessage] = useState("");
  const transportTotalUsd = items.reduce(
    (sum, item) => sum + item.transportFee * item.quantityPackages,
    0,
  );
  const grandTotalUsd = subtotal + transportTotalUsd;

  const convertedSubtotal = currency === "USD" ? subtotal : subtotal * USD_TO_XAF;
  const convertedTransport = currency === "USD" ? transportTotalUsd : transportTotalUsd * USD_TO_XAF;
  const convertedTotal = currency === "USD" ? grandTotalUsd : grandTotalUsd * USD_TO_XAF;

  useEffect(() => {
    let active = true;

    async function loadInventory() {
      try {
        const response = await fetch("/api/products", { cache: "no-store" });
        if (!response.ok) {
          return;
        }

        const payload = (await response.json().catch(() => null)) as
          | { products?: Array<{ id: number; stockPackages: number; unitType: "pcs" | "kg"; unitValue: number; packageName: "pack" | "bag" | "bundle" | "carton" }> }
          | null;

        if (!active) {
          return;
        }

        const nextMap: Record<number, InventoryRow> = {};
        for (const product of payload?.products ?? []) {
          nextMap[Number(product.id)] = {
            id: Number(product.id),
            stockPackages: Number(product.stockPackages ?? 0),
            unitType: product.unitType === "kg" ? "kg" : "pcs",
            unitValue: Number(product.unitValue ?? 1),
            packageName: product.packageName ?? "pack",
          };
        }
        setInventoryByProduct(nextMap);
      } catch {
        // Keep cart usable even if inventory fetch fails.
      } finally {
        if (active) {
          setInventoryChecked(true);
        }
      }
    }

    void loadInventory();

    return () => {
      active = false;
    };
  }, []);

  function openStockPopup(title: string, message: string) {
    setStockPopupTitle(title);
    setStockPopupMessage(message);
    setStockPopupOpen(true);
  }

  function handleProceedToCheckout() {
    if (!inventoryChecked) {
      openStockPopup(
        "Checking stock availability",
        "Please wait a moment while we verify the latest stock levels.",
      );
      return;
    }

    const stockIssues = items
      .map((item) => {
        const availablePackages = Number(inventoryByProduct[item.productId]?.stockPackages ?? 0);
        return {
          item,
          availablePackages,
        };
      })
      .filter(({ item, availablePackages }) => item.quantityPackages > availablePackages);

    if (stockIssues.length > 0) {
      const details = stockIssues
        .map(
          ({ item, availablePackages }) =>
            `${item.name}: requested ${item.quantityPackages}, available ${availablePackages}`,
        )
        .join(" | ");

      openStockPopup(
        "Low stock detected",
        `One or more items are low on stock. ${details}. Please reduce quantity or contact admin before payment.`,
      );
      return;
    }

    router.push("/checkout");
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="container-shell py-10">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="section-kicker">{t("cart_kicker")}</p>
            <h1 className="section-title mt-2 text-brand-deep">{t("cart_title")}</h1>
          </div>
          <CurrencyToggle />
        </div>

        {items.length === 0 ? (
          <div className="glass-card rounded-2xl p-8 text-center">
            <p className="text-lg font-semibold">{t("cart_empty")}</p>
            <Link href="/products" className="mt-4 inline-block rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white">
              {t("cart_browse")}
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            <div className="space-y-4">
              {items.map((item) => (
                <article key={item.productId} className="glass-card flex flex-wrap items-center gap-4 rounded-2xl p-4">
                  <Image
                    src={item.image}
                    alt={item.name}
                    width={160}
                    height={160}
                    className="h-20 w-20 rounded-xl object-cover"
                  />
                  <div className="min-w-44 flex-1">
                    <h2 className="text-base font-bold">{item.name}</h2>
                    <p className="text-sm text-foreground/70">{formatCurrency(item.price, "USD")}</p>
                    <p className="text-xs text-foreground/60">{t("cart_transport")} {formatCurrency(item.transportFee, "USD")} / {item.packageName}</p>
                    <p className="text-xs text-foreground/60">{t("cart_package")} {item.packageName} ({Number(item.unitValue)} {item.unitType})</p>
                    <p className="text-xs text-foreground/60">
                      {t("cart_available")} {Number(inventoryByProduct[item.productId]?.stockPackages ?? 0)} {t("cart_packages")}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.productId, item.quantityPackages - 1)}
                      className="h-8 w-8 rounded-full border border-border"
                    >
                      -
                    </button>
                    <span className="w-44 text-center text-sm font-semibold">{item.quantityPackages} {item.packageName}{item.quantityPackages > 1 ? "s" : ""} ({Number(item.quantityPackages) * Number(item.unitValue)} {item.unitType} total)</span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.productId, item.quantityPackages + 1)}
                      className="h-8 w-8 rounded-full border border-border"
                    >
                      +
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeItem(item.productId)}
                    className="rounded-full border border-red-200 px-3 py-1 text-xs font-semibold text-red-600"
                  >
                    {t("cart_remove")}
                  </button>
                </article>
              ))}
            </div>

            <aside className="glass-card h-fit rounded-2xl p-5">
              <h3 className="text-lg font-bold text-brand-deep">{t("cart_order_summary")}</h3>
              <div className="mt-4 flex items-center justify-between text-sm">
                <span>{t("cart_total_items")}</span>
                <span className="font-semibold">{items.reduce((sum, i) => sum + i.quantityPackages, 0)}</span>
              </div>
              <div className="mt-3 flex items-center justify-between text-sm">
                <span>{t("cart_subtotal")}</span>
                <span className="font-semibold">{formatCurrency(convertedSubtotal, currency)}</span>
              </div>
              <div className="mt-3 flex items-center justify-between text-sm">
                <span>{t("cart_transport_fees")}</span>
                <span className="font-semibold">{formatCurrency(convertedTransport, currency)}</span>
              </div>
              <div className="mt-3 flex items-center justify-between text-sm font-bold">
                <span>{t("cart_grand_total")}</span>
                <span>{formatCurrency(convertedTotal, currency)}</span>
              </div>

              <button
                type="button"
                onClick={handleProceedToCheckout}
                className="mt-6 block w-full rounded-full bg-brand px-4 py-2 text-center text-sm font-semibold text-white"
              >
                {t("cart_checkout")}
              </button>

              <a
                href={`https://wa.me/237676068533?text=${encodeURIComponent(whatsappText)}`}
                target="_blank"
                rel="noreferrer"
                className="mt-3 block rounded-full border border-border px-4 py-2 text-center text-sm font-semibold"
              >
                {t("cart_whatsapp")}
              </a>
            </aside>
          </div>
        )}
      </main>
      <SiteFooter />

      {stockPopupOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4">
          <div className="w-full max-w-lg rounded-2xl border border-red-200 bg-white p-5 shadow-2xl">
            <h3 className="text-lg font-bold text-red-700">{stockPopupTitle}</h3>
            <p className="mt-2 text-sm text-foreground/80">{stockPopupMessage}</p>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <Link
                href="/chat"
                className="rounded-full border border-brand px-4 py-1.5 text-sm font-semibold text-brand hover:bg-brand/5"
              >
                {t("cart_stock_contact")}
              </Link>
              <button
                type="button"
                className="rounded-full bg-red-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-red-700"
                onClick={() => setStockPopupOpen(false)}
              >
                {t("cart_stock_ok")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
