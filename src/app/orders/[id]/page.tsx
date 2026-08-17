import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { requireUserPage } from "@/lib/authz";
import { OrderRepository } from "@/repositories/order.repository";
import { formatCurrency } from "@/lib/utils";
import { ArrowLeft, Truck, Package, Clock, MapPin, CheckCircle2 } from "lucide-react";
import { ConfirmReceivedButton } from "@/components/confirm-received-button";
import { PaymentSuccessBanner } from "@/components/payment-success-banner";

type Params = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ payment?: string }>;
};

export default async function OrderDetailsPage({ params, searchParams }: Params) {
  const session = await requireUserPage();
  const { id } = await params;
  const { payment } = await searchParams;
  const orderRef = id.toUpperCase();
  const showPaymentSuccess = payment === "success";

  const order = await OrderRepository.findByPublicId(orderRef);
  if (!order) {
    notFound();
  }

  // Ensure customer or vendor staff or admin can view
  const userId = Number(session.user?.id || 0);
  const userRole = (session.user as { role?: string }).role || "customer";

  if (
    userRole !== "super_admin" &&
    userRole !== "platform_admin" &&
    order.user_id !== userId &&
    order.customer_email.toLowerCase() !== (session.user?.email || "").toLowerCase()
  ) {
    // Check if seller staff
    const userStores = (session.user as { storeIds?: number[] }).storeIds || [];
    if (!userStores.includes(order.store_id)) {
      notFound();
    }
  }

  const items = await OrderRepository.getOrderItems(order.id);
  const shipment = await OrderRepository.getShipment(order.id);
  const history = await OrderRepository.getOrderStatusHistory(order.id);

  return (
    <div className="min-h-screen bg-gray-50/50 flex flex-col">
      <SiteHeader />
      <main className="container-shell py-8 flex-1">
        <Link href="/orders" className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 hover:text-emerald-900 mb-6">
          <ArrowLeft className="h-4 w-4" /> Back to orders
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
              <h1 className="text-3xl font-extrabold text-gray-900">Order {order.public_order_id}</h1>
              <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-lg uppercase">
                {order.order_status}
              </span>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Placed on {new Date(order.created_at).toLocaleString()} &bull; Store: <span className="font-semibold text-gray-800">{order.store_name || "Flagship Store"}</span>
            </p>
          </div>

          <div className="text-right">
            <p className="text-xs text-gray-500 font-semibold uppercase">Total Amount</p>
            <p className="text-3xl font-extrabold text-gray-900">{formatCurrency(Number(order.total_price), "USD")}</p>
            <span className="inline-block mt-1 px-2.5 py-0.5 bg-gray-100 text-gray-700 text-xs font-semibold rounded">
              Payment: {order.payment_status} ({order.payment_gateway.toUpperCase()})
            </span>
          </div>
        </div>

        {/* Courier & Shipment Details Banner (if dispatched) */}
        {shipment && (
          <div className="bg-emerald-900 text-white rounded-3xl p-6 shadow-lg mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-800 flex items-center justify-center shrink-0">
                <Truck className="w-6 h-6 text-emerald-300" />
              </div>
              <div>
                <h3 className="font-bold text-base">Dispatched via {shipment.courier_name || "Express Delivery"}</h3>
                <p className="text-xs text-emerald-200">
                  Tracking Number: <span className="font-mono font-bold text-white">{shipment.tracking_number}</span>
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
                Track Shipment Live &rarr;
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
                <Clock className="w-5 h-5 text-emerald-600" /> Order Progress Timeline
              </h2>

              {history.length === 0 ? (
                <p className="text-xs text-gray-500">Awaiting status updates...</p>
              ) : (
                <div className="relative border-l-2 border-emerald-100 ml-4 space-y-6">
                  {history.map((log) => (
                    <div key={log.id} className="relative pl-6">
                      <div className="absolute -left-[9px] top-1.5 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white shadow" />
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-gray-900">{log.new_status}</span>
                        <span className="text-xs text-gray-400">&bull; {new Date(log.created_at).toLocaleString()}</span>
                      </div>
                      <p className="text-xs text-gray-600 mt-0.5">{log.action}: {log.notes}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Items List */}
            <section className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Package className="w-5 h-5 text-emerald-600" /> Purchased Items
              </h2>

              <div className="space-y-4">
                {items.map((item) => (
                  <div key={item.id} className="flex gap-4 p-4 rounded-2xl border border-gray-100 bg-gray-50/50">
                    <div className="w-20 h-20 rounded-xl bg-white border border-gray-200 overflow-hidden shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.product_image_snapshot} alt={item.product_name_snapshot} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-gray-900 text-sm">{item.product_name_snapshot}</h4>
                      <p className="text-xs text-gray-500 mt-1">
                        Quantity: <span className="font-semibold text-gray-800">{item.quantity_packages} {item.package_name}</span>
                      </p>
                      <p className="text-xs font-bold text-emerald-700 mt-2">${item.price} each</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Delivery & Address Column */}
          <div className="space-y-8">
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
              <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-600" /> Delivery Address
              </h3>
              <div className="text-xs text-gray-600 space-y-1">
                <p className="font-bold text-gray-900">{order.customer_name}</p>
                <p>{order.address}</p>
                <p className="font-semibold text-gray-800">{order.country}</p>
                <p className="font-mono text-gray-500 mt-2">Phone: {order.phone}</p>
                <p className="text-gray-500">Email: {order.customer_email}</p>
              </div>
            </div>

            {order.order_status === "Delivered" && !order.received_confirmed_at && (
              <div className="bg-emerald-50 rounded-3xl p-6 border border-emerald-200">
                <h4 className="font-bold text-emerald-950 text-sm mb-2">Confirm Package Receipt</h4>
                <p className="text-xs text-emerald-800 mb-4">Please confirm once you have safely received your delivered package.</p>
                <ConfirmReceivedButton orderId={order.public_order_id} />
              </div>
            )}
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
