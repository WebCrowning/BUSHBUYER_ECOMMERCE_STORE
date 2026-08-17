import { OrderRepository } from "@/repositories/order.repository";
import { OrderStatus } from "@/types/marketplace";

export class OrderTrackingService {
  static async updateStatus(
    orderId: number,
    newStatus: OrderStatus,
    operatorUserId: number,
    reasonNote?: string
  ): Promise<void> {
    const order = await OrderRepository.findById(orderId);
    if (!order) {
      throw new Error(`Order #${orderId} not found`);
    }

    await OrderRepository.updateOrderStatus(
      orderId,
      newStatus,
      operatorUserId,
      "Order Status Updated",
      reasonNote || `Status changed to ${newStatus}`
    );
  }

  static async assignShippingTracking(
    orderId: number,
    storeId: number,
    courierName: string,
    trackingNumber: string,
    estimatedDelivery?: string,
    trackingUrl?: string
  ): Promise<void> {
    await OrderRepository.upsertShipment({
      order_id: orderId,
      store_id: storeId,
      courier_name: courierName,
      tracking_number: trackingNumber,
      tracking_url: trackingUrl,
      estimated_delivery: estimatedDelivery,
      shipped_at: new Date().toISOString().slice(0, 19).replace("T", " "),
      status: "Shipped",
    });

    await OrderRepository.updateOrderStatus(
      orderId,
      "Shipped",
      undefined,
      "Courier Dispatch",
      `Dispatched via ${courierName} (Tracking #${trackingNumber})`
    );
  }
}
