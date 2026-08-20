"use client";

import Link from "next/link";
import { OrderStatusBadge } from "@/components/order-status-badge";
import { useCart } from "@/context/cart-context";
import { useTranslation } from "@/hooks/use-translation";
import { formatPrice } from "@/lib/utils";
import type { Order } from "@/types";

interface Props {
  orders: Order[];
}

export function OrdersClientContent({ orders }: Props) {
  const { t } = useTranslation();
  const { currency } = useCart();

  return (
    <main className="container-shell py-10">
      <p className="section-kicker">{t("orders_kicker")}</p>
      <h1 className="section-title mt-2 text-brand-deep">{t("orders_title")}</h1>

      <div className="mt-6 space-y-4">
        {orders.length === 0 ? (
          <div className="glass-card rounded-2xl p-8 text-center text-sm">{t("orders_no_orders")}</div>
        ) : (
          orders.map((order) => {
            const status = order.order_status || order.status || "Pending";
            return (
              <article key={order.id} className="glass-card rounded-2xl p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground/75">
                      {t("orders_order_label")} {order.public_order_id}
                    </p>
                    <p className="text-xs text-foreground/60">{new Date(order.created_at).toLocaleString()}</p>
                  </div>
                  <OrderStatusBadge status={status} />
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">
                      {t("orders_total_label")} {formatPrice(Number(order.total_price), currency)}
                    </p>
                    {status === "Delivered" ? (
                      <p className="text-xs text-foreground/60">
                        {t("orders_received_confirmation")}{" "}
                        {order.received_confirmed_at ? t("orders_confirmed") : t("orders_pending")}
                      </p>
                    ) : null}
                  </div>
                <Link
                  href={`/orders/${order.public_order_id}`}
                  className="inline-flex items-center justify-center rounded-full bg-slate-200 px-4 py-2 text-xs font-bold uppercase tracking-wide text-slate-800 transition-colors hover:bg-slate-300"
                >
                  {t("orders_view_details")}
                </Link>
              </div>
            </article>
          );
        })
        )}
      </div>
    </main>
  );
}
