"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Truck,
  Package,
  Clock,
  MapPin,
  Star,
  Store,
  CheckCircle2,
} from "lucide-react";
import { ConfirmReceivedButton } from "@/components/confirm-received-button";
import { PaymentSuccessBanner } from "@/components/payment-success-banner";
import { ReviewModal } from "@/components/reviews/review-modal";
import { useCart } from "@/context/cart-context";
import { useTranslation } from "@/hooks/use-translation";
import { formatPrice } from "@/lib/utils";
import type { OrderRow, OrderItemRow } from "@/repositories/order.repository";
import type { Shipment, OrderStatusHistory } from "@/types/marketplace";

interface Props {
  order: OrderRow;
  showPaymentSuccess: boolean;
  items: OrderItemRow[];
  shipment: Shipment | null;
  history: OrderStatusHistory[];
}

interface ModalState {
  isOpen: boolean;
  type: "product" | "store";
  targetId: number;
  title: string;
  subtitle?: string;
  image?: string;
}

export function OrderDetailsClientContent({
  order,
  showPaymentSuccess,
  items,
  shipment,
  history,
}: Props) {
  const { t } = useTranslation();
  const { currency } = useCart();

  // Review status states
  const [productReviews, setProductReviews] = useState<
    Record<number, { rating: number; reviewText: string | null }>
  >({});
  const [storeReview, setStoreReview] = useState<{
    reviewed: boolean;
    rating?: number;
    reviewText?: string | null;
  }>({ reviewed: false });

  // Modal State
  const [modalState, setModalState] = useState<ModalState | null>(null);

  // Fetch reviews already submitted for this order
  const loadReviewStatus = async () => {
    try {
      const res = await fetch(`/api/reviews/order-status?orderId=${order.id}`);
      if (res.ok) {
        const data = await res.json();
        if (data.productReviews) setProductReviews(data.productReviews);
        if (data.storeReview) setStoreReview(data.storeReview);
      }
    } catch (err) {
      console.error("Failed to load review status:", err);
    }
  };

  useEffect(() => {
    loadReviewStatus();
  }, [order.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const openProductReview = (item: OrderItemRow) => {
    setModalState({
      isOpen: true,
      type: "product",
      targetId: item.product_id,
      title: item.product_name_snapshot,
      subtitle: `${item.quantity_packages} ${item.package_name}`,
      image: item.product_image_snapshot,
    });
  };

  const openStoreReview = () => {
    if (!order.store_id) return;
    setModalState({
      isOpen: true,
      type: "store",
      targetId: order.store_id,
      title: order.store_name || "Store",
      subtitle: "Seller Service, Delivery & Communication",
    });
  };

  const handleReviewSuccess = (rating: number, text: string) => {
    if (modalState?.type === "product") {
      setProductReviews((prev) => ({
        ...prev,
        [modalState.targetId]: { rating, reviewText: text },
      }));
    } else if (modalState?.type === "store") {
      setStoreReview({ reviewed: true, rating, reviewText: text });
    }
  };

  return (
    <main className="container-shell py-8 flex-1">
      <Link
        href="/orders"
        className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 hover:text-emerald-900 mb-6"
      >
        <ArrowLeft className="h-4 w-4" /> {t("orders_back_to_orders")}
      </Link>

      {showPaymentSuccess && (
        <PaymentSuccessBanner
          orderId={order.public_order_id}
          gateway={order.payment_gateway}
          amount={Number(order.total_price)}
        />
      )}

      {/* Master Order Info Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100 mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-extrabold text-gray-900">
              {t("orders_order_label")} {order.public_order_id}
            </h1>
            <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-lg uppercase">
              {order.order_status}
            </span>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            {t("orders_placed_on")} {new Date(order.created_at).toLocaleString()} &bull;{" "}
            {t("orders_store")}{" "}
            <span className="font-semibold text-gray-800">
              {order.store_name || t("orders_flagship")}
            </span>
          </p>
        </div>

        <div className="text-right">
          <p className="text-xs text-gray-500 font-semibold uppercase">{t("orders_total_amount")}</p>
          <p className="text-3xl font-extrabold text-gray-900">
            {formatPrice(Number(order.total_price), currency)}
          </p>
          <span className="inline-block mt-1 px-2.5 py-0.5 bg-gray-100 text-gray-700 text-xs font-semibold rounded">
            {t("orders_payment")} {order.payment_status} ({order.payment_gateway.toUpperCase()})
          </span>
        </div>
      </div>

      {/* Courier & Shipment Details Banner */}
      {shipment && (
        <div className="bg-emerald-900 text-white rounded-3xl p-6 shadow-lg mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-800 flex items-center justify-center shrink-0">
              <Truck className="w-6 h-6 text-emerald-300" />
            </div>
            <div>
              <h3 className="font-bold text-base">
                {t("orders_dispatched_via")} {shipment.courier_name || "Express Delivery"}
              </h3>
              <p className="text-xs text-emerald-200">
                {t("orders_tracking_number")}{" "}
                <span className="font-mono font-bold text-white">{shipment.tracking_number}</span>
              </p>
            </div>
          </div>

          {shipment.tracking_url && (
            <a
              href={shipment.tracking_url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-emerald-400 hover:bg-emerald-300 text-emerald-950 font-bold text-xs rounded-xl transition-colors shrink-0"
            >
              {t("orders_track_live")}
            </a>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Order Details Column */}
        <div className="lg:col-span-2 space-y-8">
          {/* Timeline Audit History */}
          <section className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Clock className="w-5 h-5 text-emerald-600" /> {t("orders_progress_timeline")}
            </h2>

            {history.length === 0 ? (
              <p className="text-xs text-gray-500">{t("orders_awaiting_updates")}</p>
            ) : (
              <div className="relative border-l-2 border-emerald-100 ml-4 space-y-6">
                {history.map((log) => (
                  <div key={log.id} className="relative pl-6">
                    <div className="absolute -left-[9px] top-1.5 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white shadow" />
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-gray-900">{log.new_status}</span>
                      <span className="text-xs text-gray-400">
                        &bull; {new Date(log.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 mt-0.5">
                      {log.action}: {log.notes}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Purchased Items with Individual Product Review Buttons */}
          <section className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Package className="w-5 h-5 text-emerald-600" /> {t("orders_purchased_items")}
              </h2>
              <span className="text-xs text-gray-400 font-semibold">
                Rate items to help other buyers
              </span>
            </div>

            <div className="space-y-4">
              {items.map((item) => {
                const existingProductReview = productReviews[item.product_id];

                return (
                  <div
                    key={item.id}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl border border-gray-100 bg-gray-50/50"
                  >
                    <div className="flex gap-4 items-center min-w-0">
                      <div className="w-20 h-20 rounded-xl bg-white border border-gray-200 overflow-hidden shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.product_image_snapshot}
                          alt={item.product_name_snapshot}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-gray-900 text-sm truncate">
                          {item.product_name_snapshot}
                        </h4>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {t("orders_quantity")}:{" "}
                          <span className="font-semibold text-gray-800">
                            {item.quantity_packages} {item.package_name}
                          </span>
                        </p>
                        <p className="text-xs font-bold text-emerald-700 mt-1">
                          {formatPrice(Number(item.price), currency)} {t("orders_each")}
                        </p>
                      </div>
                    </div>

                    {/* Review Button or Rated Badge */}
                    <div className="w-full sm:w-auto flex justify-end shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-200">
                      {existingProductReview ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold shadow-sm">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          Rated {existingProductReview.rating}★
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => openProductReview(item)}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white hover:bg-emerald-50 text-emerald-700 hover:text-emerald-800 border border-emerald-300 font-bold text-xs shadow-sm transition-all active:scale-95"
                        >
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          Review Product
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        {/* Delivery, Address & Store Review Column */}
        <div className="space-y-6">
          {/* Store Experience Card */}
          {order.store_id && (
            <div className="bg-gradient-to-br from-emerald-950 to-slate-900 text-white rounded-3xl p-6 shadow-md border border-emerald-800/30 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-300">
                  <Store className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">
                    Vendor Experience
                  </span>
                  <h4 className="font-extrabold text-white text-base">
                    {order.store_name || "Store"}
                  </h4>
                </div>
              </div>

              <p className="text-xs text-emerald-100/80 leading-relaxed">
                How was the seller&apos;s responsiveness, packaging, and dispatch speed? Rate your overall store experience.
              </p>

              {storeReview.reviewed ? (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-900/60 border border-emerald-500/30 text-emerald-300 text-xs font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Store Rated {storeReview.rating}★ — Thank You!
                </div>
              ) : (
                <button
                  type="button"
                  onClick={openStoreReview}
                  className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 active:scale-95"
                >
                  <Star className="w-3.5 h-3.5 fill-slate-950" />
                  Rate &amp; Review Store
                </button>
              )}
            </div>
          )}

          {/* Delivery Address Card */}
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
            <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-600" /> {t("orders_delivery_address")}
            </h3>
            <div className="text-xs text-gray-600 space-y-1">
              <p className="font-bold text-gray-900">{order.customer_name}</p>
              <p>{order.address}</p>
              <p className="font-semibold text-gray-800">{order.country}</p>
              <p className="font-mono text-gray-500 mt-2">
                {t("orders_phone")} {order.phone}
              </p>
              <p className="text-gray-500">
                {t("orders_email")} {order.customer_email}
              </p>
            </div>
          </div>

          {/* Confirm Receipt Action */}
          {order.order_status === "Delivered" && !order.received_confirmed_at && (
            <div className="bg-emerald-50 rounded-3xl p-6 border border-emerald-200">
              <h4 className="font-bold text-emerald-950 text-sm mb-2">
                {t("orders_confirm_receipt")}
              </h4>
              <p className="text-xs text-emerald-800 mb-4">{t("orders_confirm_receipt_desc")}</p>
              <ConfirmReceivedButton orderId={order.public_order_id} />
            </div>
          )}
        </div>
      </div>

      {/* Interactive Review Modal */}
      {modalState && (
        <ReviewModal
          isOpen={modalState.isOpen}
          onClose={() => setModalState(null)}
          type={modalState.type}
          targetId={modalState.targetId}
          orderId={order.id}
          title={modalState.title}
          subtitle={modalState.subtitle}
          image={modalState.image}
          onSuccess={handleReviewSuccess}
        />
      )}
    </main>
  );
}
