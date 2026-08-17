import type { OrderStatus } from "@/types";

const statusClasses: Record<string, string> = {
  Pending: "bg-amber-100 text-amber-800",
  Paid: "bg-emerald-100 text-emerald-800",
  Shipped: "bg-blue-100 text-blue-800",
  Delivered: "bg-slate-800 text-white",
  "Pending Payment": "bg-amber-100 text-amber-800",
  "Payment Confirmed": "bg-emerald-100 text-emerald-800",
  "Awaiting Seller Confirmation": "bg-yellow-100 text-yellow-800",
  Accepted: "bg-blue-100 text-blue-800",
  Preparing: "bg-indigo-100 text-indigo-800",
  Packed: "bg-purple-100 text-purple-800",
  "Ready for Pickup": "bg-teal-100 text-teal-800",
  "In Transit": "bg-blue-100 text-blue-800",
  "Out for Delivery": "bg-cyan-100 text-cyan-800",
  Completed: "bg-emerald-800 text-white",
  Cancelled: "bg-red-100 text-red-800",
  Returned: "bg-orange-100 text-orange-800",
  Refunded: "bg-gray-200 text-gray-800",
};

export function OrderStatusBadge({ status }: { status: OrderStatus | string }) {
  const badgeStyle = statusClasses[status] || "bg-gray-100 text-gray-700";
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-bold ${badgeStyle}`}>
      {status}
    </span>
  );
}
