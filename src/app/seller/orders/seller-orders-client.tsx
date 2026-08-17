"use client";

import { useState } from "react";
import type { Store } from "@/types/marketplace";
import { OrderStatusBadge } from "@/components/order-status-badge";
import { CheckCircle, AlertCircle, ShoppingCart } from "lucide-react";
import Link from "next/link";

type OrderItem = {
  id: number;
  public_order_id: string;
  customer_name: string;
  customer_email: string;
  total_price: number;
  order_status: string;
  payment_status: string;
  received_confirmed_at?: string | null;
  created_at: string;
  country: string;
  phone: string;
  address: string;
};

export default function SellerOrdersClient({
  store,
  initialOrders,
}: {
  store: Store;
  initialOrders: OrderItem[];
}) {
  const [orders, setOrders] = useState<OrderItem[]>(initialOrders);
  const [statusMsg, setStatusMsg] = useState("");
  const [updating, setUpdating] = useState<number | null>(null);
  const [activeView, setActiveView] = useState<"all" | "new" | "awaiting" | "confirmed">("new");

  async function reloadOrders() {
    try {
      const res = await fetch(`/api/admin/orders?storeId=${store.id}`);
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders ?? []);
      }
    } catch {
      // Ignore
    }
  }

  async function updateOrderStatus(orderId: number, nextStatus: string) {
    setUpdating(orderId);
    try {
      const response = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });

      if (response.ok) {
        setStatusMsg(`✓ Order status updated to ${nextStatus}`);
        await reloadOrders();
        setTimeout(() => setStatusMsg(""), 3000);
      } else {
        setStatusMsg(`✗ Failed to update order status`);
      }
    } catch {
      setStatusMsg(`✗ Error updating order status`);
    } finally {
      setUpdating(null);
    }
  }

  const newAndInProgressOrders = orders.filter((o) => o.order_status !== "Delivered" && o.order_status !== "Completed");
  const deliveredAwaitingConfirmation = orders.filter(
    (o) => o.order_status === "Delivered" && !o.received_confirmed_at
  );
  const customerConfirmedOrders = orders.filter(
    (o) => o.order_status === "Completed" || (o.order_status === "Delivered" && Boolean(o.received_confirmed_at))
  );

  const statuses = ["Pending", "Paid", "Shipped", "Delivered"];

  function renderOrderCard(order: OrderItem) {
    return (
      <div key={order.id} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-bold text-slate-900">Order {order.public_order_id}</h3>
              <OrderStatusBadge status={order.order_status} />
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {order.customer_name} &bull; {order.customer_email}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Total</p>
            <p className="text-2xl font-extrabold text-slate-900">${Number(order.total_price).toFixed(2)}</p>
          </div>
        </div>

        <div className="mb-6 grid gap-3 sm:grid-cols-2 text-xs">
          <div className="rounded-lg bg-slate-50 border border-slate-100 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Delivery Address</p>
            <p className="mt-1 font-medium text-slate-700">{order.address}</p>
            <p className="text-slate-500">{order.country}</p>
          </div>
          <div className="rounded-lg bg-slate-50 border border-slate-100 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Contact & Confirmation</p>
            <p className="mt-1 font-medium text-slate-700">{order.phone}</p>
            <p className="text-slate-500">{new Date(order.created_at).toLocaleDateString()}</p>
            {order.order_status === "Delivered" && (
              <div className="mt-2">
                {order.received_confirmed_at ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-bold">
                    <CheckCircle className="h-3 w-3" /> Customer Confirmed Receipt
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-0.5 text-[10px] font-medium">
                    Awaiting Customer Confirmation
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        <div>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Update Order Status</p>
          <div className="flex flex-wrap gap-2">
            {statuses.map((st) => {
              const isActive = order.order_status === st;
              return (
                <button
                  key={st}
                  type="button"
                  onClick={() => {
                    if (!isActive) void updateOrderStatus(order.id, st);
                  }}
                  disabled={updating === order.id}
                  className={`rounded-lg px-3.5 py-1.5 font-bold text-xs transition-all ${
                    isActive
                      ? "bg-slate-900 text-white shadow-sm"
                      : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                  } ${updating === order.id ? "opacity-50" : ""}`}
                >
                  {st}
                </button>
              );
            })}
            <Link
              href={`/orders/${order.public_order_id}`}
              className="ml-auto rounded-lg bg-blue-600 hover:bg-blue-700 px-4 py-1.5 text-xs font-bold text-white transition-colors"
            >
              Order Details &rarr;
            </Link>
          </div>
        </div>
      </div>
    );
  }

  function renderSection(title: string, subtitle: string, list: OrderItem[], emptyText: string) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900">{title}</h3>
            <p className="text-xs text-slate-500">{subtitle}</p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
            {list.length}
          </span>
        </div>

        {list.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400 font-medium">{emptyText}</div>
        ) : (
          <div className="space-y-4">{list.map((o) => renderOrderCard(o))}</div>
        )}
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-blue-600" />
            <h1 className="text-xl font-extrabold text-slate-900">Store Order Management</h1>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Fulfill and track customer purchases for <span className="font-bold text-slate-900">{store.name}</span>
          </p>
        </div>
      </div>

      {statusMsg && (
        <div className={`rounded-lg border px-4 py-3 text-xs font-bold flex items-center gap-2 ${
          statusMsg.startsWith("✓") ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"
        }`}>
          {statusMsg.startsWith("✓") ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          <span>{statusMsg}</span>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-2 flex flex-wrap gap-1 shadow-sm">
        {[
          { label: "New / In Progress", count: newAndInProgressOrders.length, val: "new" },
          { label: "Delivered (Awaiting)", count: deliveredAwaitingConfirmation.length, val: "awaiting" },
          { label: "Confirmed", count: customerConfirmedOrders.length, val: "confirmed" },
          { label: "All Orders", count: orders.length, val: "all" },
        ].map((tab) => (
          <button
            key={tab.val}
            onClick={() => setActiveView(tab.val as any)}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              activeView === tab.val ? "bg-blue-600 text-white shadow-sm" : "bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            <span>{tab.label}</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeView === tab.val ? "bg-blue-700" : "bg-slate-100"}`}>{tab.count}</span>
          </button>
        ))}
      </div>

      <div className="space-y-6">
        {orders.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-500">
            <ShoppingCart size={36} className="mx-auto mb-2 text-slate-300" />
            <p className="font-bold text-slate-700">No orders received for your store yet</p>
          </div>
        ) : (
          <>
            {(activeView === "new" || activeView === "all") &&
              renderSection("New / In Progress Orders", "Orders requiring processing or shipping", newAndInProgressOrders, "No in-progress orders.")}
            {(activeView === "awaiting" || activeView === "all") &&
              renderSection("Delivered (Awaiting Confirmation)", "Delivered packages awaiting customer receipt confirmation", deliveredAwaitingConfirmation, "No orders awaiting confirmation.")}
            {(activeView === "confirmed" || activeView === "all") &&
              renderSection("Customer Confirmed Deliveries", "Completed orders with confirmed delivery", customerConfirmedOrders, "No confirmed deliveries yet.")}
          </>
        )}
      </div>
    </div>
  );
}
