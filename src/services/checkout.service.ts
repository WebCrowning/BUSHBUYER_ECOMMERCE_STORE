import { OrderRepository, OrderRow } from "@/repositories/order.repository";
import { ProductRepository } from "@/repositories/product.repository";
import { WalletRepository } from "@/repositories/wallet.repository";
import { OrderStatus, PaymentGateway } from "@/types/marketplace";

export interface CheckoutCartItem {
  product_id: number;
  quantity_packages: number;
  price: number;
  transport_fee?: number;
  package_name?: string;
  unit_type?: "pcs" | "kg";
  unit_value?: number;
  store_id?: number;
  product_name_snapshot?: string;
  product_image_snapshot?: string;
}

export interface CheckoutRequest {
  user_id: number;
  customer_name: string;
  customer_email: string;
  phone: string;
  address: string;
  country: string;
  items: CheckoutCartItem[];
  payment_gateway: PaymentGateway;
  delivery_method_id?: number;
  delivery_fee?: number;
  delivery_notes?: string;
  delivery_data_json?: string;
}

export interface SplitStoreOrderGroup {
  store_id: number;
  items: CheckoutCartItem[];
  subtotal: number;
  transport_fee: number;
  total_price: number;
  commission_rate: number;
  commission_amount: number;
  vendor_payout_amount: number;
}

export interface MasterCheckoutResult {
  master_order_id: string;
  sub_orders: OrderRow[];
  total_amount: number;
}

export class CheckoutService {
  static async prepareSplitOrders(items: CheckoutCartItem[]): Promise<Map<number, SplitStoreOrderGroup>> {
    const storeMap = new Map<number, SplitStoreOrderGroup>();

    for (const item of items) {
      const product = await ProductRepository.findById(item.product_id);
      const storeId = product ? product.store_id : item.store_id || 1;

      if (!storeMap.has(storeId)) {
        const commRate = await WalletRepository.getCommissionRate(storeId, product?.category);
        storeMap.set(storeId, {
          store_id: storeId,
          items: [],
          subtotal: 0,
          transport_fee: 0,
          total_price: 0,
          commission_rate: commRate,
          commission_amount: 0,
          vendor_payout_amount: 0,
        });
      }

      const group = storeMap.get(storeId)!;
      const itemPrice = product ? Number(product.discount_price || product.price) : Number(item.price);
      const transportFee = product ? Number(product.transport_fee) : Number(item.transport_fee || 0);

      const itemTotal = itemPrice * item.quantity_packages;
      group.items.push({
        ...item,
        store_id: storeId,
        price: itemPrice,
        transport_fee: transportFee,
        product_name_snapshot: product ? product.name : item.product_name_snapshot || "Product",
        product_image_snapshot: product ? product.image : item.product_image_snapshot || "",
      });

      group.subtotal += itemTotal;
      group.transport_fee += transportFee * item.quantity_packages;
    }

    // Finalize totals & commissions per seller
    for (const group of Array.from(storeMap.values())) {
      group.total_price = Number((group.subtotal + group.transport_fee).toFixed(2));
      group.commission_amount = Number(((group.subtotal * group.commission_rate) / 100).toFixed(2));
      group.vendor_payout_amount = Number((group.total_price - group.commission_amount).toFixed(2));
    }

    return storeMap;
  }

  static async createMasterOrder(request: CheckoutRequest): Promise<MasterCheckoutResult> {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const randomHex = Math.random().toString(36).substring(2, 10).toUpperCase();
    const masterOrderId = `BB-${dateStr}-${randomHex}`;

    const storeGroups = await this.prepareSplitOrders(request.items);
    const subOrders: OrderRow[] = [];
    let grandTotal = 0;

    let groupIndex = 1;
    for (const group of Array.from(storeGroups.values())) {
      const publicOrderId = storeGroups.size > 1 ? `${masterOrderId}-${groupIndex}` : masterOrderId;
      groupIndex++;

      const subOrder = await OrderRepository.createOrder({
        public_order_id: publicOrderId,
        master_order_id: masterOrderId,
        store_id: group.store_id,
        user_id: request.user_id,
        total_price: group.total_price + (request.delivery_fee || 0),
        order_status: "Pending Payment",
        payment_status: "Pending",
        payment_gateway: request.payment_gateway,
        commission_amount: group.commission_amount,
        vendor_payout_amount: group.vendor_payout_amount,
        address: request.address,
        phone: request.phone,
        country: request.country,
        customer_name: request.customer_name,
        customer_email: request.customer_email,
        delivery_method_id: request.delivery_method_id,
        delivery_fee: request.delivery_fee || 0.0,
        delivery_notes: request.delivery_notes,
        delivery_data_json: request.delivery_data_json,
      });

      for (const item of group.items) {
        await OrderRepository.createOrderItem({
          order_id: subOrder.id,
          product_id: item.product_id,
          quantity_packages: item.quantity_packages,
          unit_type: item.unit_type || "pcs",
          unit_value: item.unit_value || 1.0,
          package_name: item.package_name || "pack",
          price: item.price,
          transport_fee: item.transport_fee || 0,
          product_name_snapshot: item.product_name_snapshot!,
          product_image_snapshot: item.product_image_snapshot!,
        });
      }

      subOrders.push(subOrder);
      grandTotal += group.total_price;
    }

    return {
      master_order_id: masterOrderId,
      sub_orders: subOrders,
      total_amount: Number(grandTotal.toFixed(2)),
    };
  }
}
