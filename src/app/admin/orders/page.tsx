"use client";

import { useEffect, useState } from "react";
import { OrderStatusBadge } from "@/components/order-status-badge";
import { CheckCircle, Clock, Truck, Package, AlertCircle } from "lucide-react";

type AdminOrder = {
  id: number;
  public_order_id: string;
  customer_name: string;
  customer_email: string;
  total_price: number;
  order_status: string;
  payment_status: string;
  payment_gateway: string;
  received_confirmed_at: string | null;
  created_at: string;
  country: string;
  phone: string;
  address: string;
  store_name?: string;
};

// Map API order_status to the legacy status tab keys used for filtering
type StatusTab = "Pending" | "Paid" | "Shipped" | "Delivered";
const statuses: StatusTab[] = ["Pending", "Paid", "Shipped", "Delivered"];

// Broader matching — order_status values from the DB may be verbose like "Payment Confirmed"
function matchesTab(order: AdminOrder, tab: StatusTab): boolean {
  const s = order.order_status ?? "";
  switch (tab) {
    case "Pending":  return s === "Pending" || s === "Pending Payment" || s === "Awaiting Seller Confirmation";
    case "Paid":     return s === "Paid" || s === "Payment Confirmed" || s === "Accepted" || s === "Preparing" || s === "Packed";
    case "Shipped":  return s === "Shipped" || s === "In Transit" || s === "Out for Delivery" || s === "Ready for Pickup";
    case "Delivered":return s === "Delivered" || s === "Completed";
    default:         return false;
  }
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<number | null>(null);
  const [activeView, setActiveView] = useState<"all" | "new" | "awaiting" | "confirmed">("new");

  async function loadOrders() {
    try {
      const response = await fetch("/api/admin/orders");
      const payload = (await response.json()) as { orders: AdminOrder[] };
      setOrders(payload.orders ?? []);
    } catch (error) {
      console.error("Failed to load orders:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadOrders();
  }, []);

  async function updateOrderStatus(orderId: number, nextStatus: StatusTab) {
    setUpdating(orderId);
    try {
      const response = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });

      if (response.ok) {
        const currentOrder = orders.find((order) => order.id === orderId);
        const orderRef = currentOrder?.public_order_id ?? `#${orderId}`;
        setStatus(`✓ Order ${orderRef} updated to ${nextStatus}`);
        await loadOrders();
        setTimeout(() => setStatus(""), 3000);
      } else {
        const currentOrder = orders.find((order) => order.id === orderId);
        const orderRef = currentOrder?.public_order_id ?? `#${orderId}`;
        setStatus(`✗ Failed to update order ${orderRef}`);
      }
    } catch (error) {
      console.error("Error updating order:", error);
      const currentOrder = orders.find((order) => order.id === orderId);
      const orderRef = currentOrder?.public_order_id ?? `#${orderId}`;
      setStatus(`✗ Error updating order ${orderRef}`);
    } finally {
      setUpdating(null);
    }
  }

  const newAndInProgressOrders = orders.filter(
    (o) => !matchesTab(o, "Delivered") && !matchesTab(o, "Shipped")
  );
  const deliveredAwaitingConfirmation = orders.filter(
    (o) => matchesTab(o, "Delivered") && !o.received_confirmed_at,
  );
  const customerConfirmedOrders = orders.filter(
    (o) => matchesTab(o, "Delivered") && Boolean(o.received_confirmed_at),
  );

  function renderOrderCard(order: AdminOrder) {
    const statusConfig: Record<StatusTab, { icon: React.ReactNode; color: string; bgColor: string }> = {
      Pending:  { icon: <Clock className="h-4 w-4" />,       color: "text-gray-600",  bgColor: "bg-gray-100"  },
      Paid:     { icon: <CheckCircle className="h-4 w-4" />, color: "text-yellow-600",bgColor: "bg-yellow-100"},
      Shipped:  { icon: <Truck className="h-4 w-4" />,       color: "text-blue-600",  bgColor: "bg-blue-100"  },
      Delivered:{ icon: <Package className="h-4 w-4" />,     color: "text-green-600", bgColor: "bg-green-100" },
    };

    return (
      <div key={order.id} className="rounded-2xl border border-border/50 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h3 className="text-xl font-bold text-brand-deep">Order {order.public_order_id}</h3>
              <OrderStatusBadge status={order.order_status} />
              {order.payment_status && (
                <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold capitalize ${
                  order.payment_status === "Paid" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"
                }`}>
                  {order.payment_status}
                </span>
              )}
              {order.store_name && (
                <span className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-bold text-sky-700">
                  {order.store_name}
                </span>
              )}
            </div>
            <p className="mt-2 text-sm text-foreground/60">
              {order.customer_name} • {order.customer_email}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-foreground/50 mb-1">Amount</p>
            <p className="text-2xl font-bold text-brand-deep">${Number(order.total_price).toFixed(2)}</p>
          </div>
        </div>

        <div className="mb-6 grid gap-3 sm:grid-cols-2 text-sm">
          <div className="rounded-lg bg-surface/50 p-3">
            <p className="text-xs font-semibold uppercase text-foreground/50">Delivery Address</p>
            <p className="mt-1 font-medium text-foreground/80">{order.address}</p>
            <p className="text-foreground/60">{order.country}</p>
          </div>
          <div className="rounded-lg bg-surface/50 p-3">
            <p className="text-xs font-semibold uppercase text-foreground/50">Contact</p>
            <p className="mt-1 font-medium text-foreground/80">{order.phone}</p>
            <p className="text-sm text-foreground/60">{new Date(order.created_at).toLocaleDateString()}</p>
            {matchesTab(order, "Delivered") ? (
              <div className="mt-2">
                {order.received_confirmed_at ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700">
                    <CheckCircle className="h-3.5 w-3.5 fill-green-600 text-white" />
                    User confirmation: Confirmed
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-700">
                    User confirmation: Pending
                  </span>
                )}
              </div>
            ) : null}
          </div>
        </div>

        <div>
          <p className="mb-3 text-xs font-semibold uppercase text-foreground/50">Update Status</p>
          <div className="flex flex-wrap gap-2">
            {statuses.map((item) => {
              const isActive = matchesTab(order, item);
              const config = statusConfig[item];
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => { if (!isActive) void updateOrderStatus(order.id, item); }}
                  disabled={updating === order.id}
                  className={`flex items-center gap-2 rounded-lg px-4 py-2.5 font-semibold text-sm transition-all ${
                    isActive
                      ? `${config.bgColor} ${config.color} border-2 border-current`
                      : "border-2 border-border/30 bg-white text-foreground/60 hover:border-brand/30 hover:bg-surface/50 cursor-pointer"
                  } ${updating === order.id ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  {config.icon}
                  {item}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  function renderSection(
    title: string,
    subtitle: string,
    list: AdminOrder[],
    emptyText: string,
  ) {
    return (
      <section className="rounded-2xl border border-border/40 bg-white/70 p-5">
        <div className="mb-4 flex items-center justify-between gap-2">
          <div>
            <h3 className="text-lg font-bold text-brand-deep">{title}</h3>
            <p className="text-xs text-foreground/60">{subtitle}</p>
          </div>
          <span className="rounded-full bg-surface px-3 py-1 text-xs font-semibold text-foreground/70">
            {list.length}
          </span>
        </div>

        {list.length === 0 ? (
          <div className="rounded-xl border border-border/40 bg-surface/30 p-4 text-sm text-foreground/60">
            {emptyText}
          </div>
        ) : (
          <div className="space-y-4">{list.map((order) => renderOrderCard(order))}</div>
        )}
      </section>
    );
  }

  const selectorOptions: Array<{
    key: "all" | "new" | "awaiting" | "confirmed";
    label: string;
    count: number;
  }> = [
    { key: "new", label: "New / In Progress", count: newAndInProgressOrders.length },
    {
      key: "awaiting",
      label: "Delivered Awaiting Confirmation",
      count: deliveredAwaitingConfirmation.length,
    },
    { key: "confirmed", label: "Customer Confirmed", count: customerConfirmedOrders.length },
    { key: "all", label: "All Orders", count: orders.length },
  ];

  if (loading) {
    return (
      <div className="rounded-2xl border border-border/50 bg-white p-8 text-center">
        <p className="text-foreground/60">Loading orders...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-brand-deep">Order Management</h2>
        <p className="mt-1 text-foreground/60">Update order status and track deliveries</p>
      </div>

      {status && (
        <div className={`mb-6 flex items-center gap-3 rounded-lg px-4 py-3 ${status.startsWith("✓") ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
          {status.startsWith("✓") ? <CheckCircle className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
          <p className="font-semibold">{status}</p>
        </div>
      )}

      <div className="mb-5 rounded-2xl border border-border/40 bg-white p-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-foreground/60">View Selector</p>
        <div className="flex flex-wrap gap-2">
          {selectorOptions.map((option) => {
            const isActive = activeView === option.key;
            return (
              <button
                key={option.key}
                type="button"
                onClick={() => setActiveView(option.key)}
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                  isActive
                    ? "border-brand bg-brand/10 text-brand-deep"
                    : "border-border/40 bg-white text-foreground/70 hover:border-brand/30 hover:bg-surface/60"
                }`}
              >
                <span>{option.label}</span>
                <span className="rounded-full bg-white px-2 py-0.5 text-[11px] text-foreground/70 border border-border/40">
                  {option.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-5">
        {orders.length === 0 ? (
          <div className="rounded-2xl border border-border/50 bg-white p-8 text-center">
            <Package className="mx-auto h-12 w-12 text-foreground/30 mb-3" />
            <p className="text-foreground/60">No orders yet</p>
          </div>
        ) : (
          <>
            {(activeView === "new" || activeView === "all") && renderSection(
              "New / In Progress",
              "Pending, paid, and shipped orders that still need active handling.",
              newAndInProgressOrders,
              "No new or in-progress orders.",
            )}
            {(activeView === "awaiting" || activeView === "all") && renderSection(
              "Delivered (Awaiting Customer Confirmation)",
              "Admin marked as delivered, waiting for customer receipt confirmation.",
              deliveredAwaitingConfirmation,
              "No delivered orders awaiting customer confirmation.",
            )}
            {(activeView === "confirmed" || activeView === "all") && renderSection(
              "Customer Confirmed",
              "Delivered orders where customer has confirmed package receipt.",
              customerConfirmedOrders,
              "No customer-confirmed deliveries yet.",
            )}
          </>
        )}
      </div>
    </div>
  );
}
