import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { requireUserPage } from "@/lib/authz";
import { OrderRepository } from "@/repositories/order.repository";
import { OrderDetailsClientContent } from "@/components/order-details-client-content";

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
      <OrderDetailsClientContent
        order={order}
        showPaymentSuccess={showPaymentSuccess}
        items={items}
        shipment={shipment}
        history={history}
      />
      <SiteFooter />
    </div>
  );
}
