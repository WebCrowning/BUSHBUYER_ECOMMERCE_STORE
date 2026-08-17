import { query } from "@/lib/db";
import { OrderStatus, OrderStatusHistory, PaymentStatus, Shipment } from "@/types/marketplace";

export interface OrderRow {
  id: number;
  public_order_id: string;
  master_order_id?: string | null;
  store_id: number;
  user_id: number;
  total_price: number;
  order_status: OrderStatus;
  payment_status: PaymentStatus;
  payment_gateway: string;
  commission_amount: number;
  vendor_payout_amount: number;
  address: string;
  phone: string;
  country: string;
  customer_name: string;
  customer_email: string;
  delivery_method_id?: number | null;
  delivery_status?: string | null;
  delivery_fee?: number | null;
  delivery_notes?: string | null;
  delivery_data_json?: string | null;
  payment_id?: string | null;
  paypal_order_id?: string | null;
  paypal_transaction_id?: string | null;
  received_confirmed_at?: string | null;
  created_at: string;
  store_name?: string;
  store_slug?: string;
}

export interface OrderItemRow {
  id: number;
  order_id: number;
  product_id: number;
  quantity_packages: number;
  unit_type: "pcs" | "kg";
  unit_value: number;
  package_name: string;
  price: number;
  transport_fee: number;
  product_name_snapshot: string;
  product_image_snapshot: string;
}

export class OrderRepository {
  static async findById(id: number): Promise<OrderRow | null> {
    const rows = await query<OrderRow[]>(
      `SELECT o.*, s.name AS store_name, s.slug AS store_slug
       FROM orders o
       LEFT JOIN stores s ON s.id = o.store_id
       WHERE o.id = ? LIMIT 1`,
      [id]
    );
    return rows[0] || null;
  }

  static async findByPublicId(publicId: string): Promise<OrderRow | null> {
    const rows = await query<OrderRow[]>(
      `SELECT o.*, s.name AS store_name, s.slug AS store_slug
       FROM orders o
       LEFT JOIN stores s ON s.id = o.store_id
       WHERE o.public_order_id = ? LIMIT 1`,
      [publicId]
    );
    return rows[0] || null;
  }

  static async listMasterOrders(masterOrderId: string): Promise<OrderRow[]> {
    return query<OrderRow[]>(
      `SELECT o.*, s.name AS store_name, s.slug AS store_slug
       FROM orders o
       LEFT JOIN stores s ON s.id = o.store_id
       WHERE o.master_order_id = ?`,
      [masterOrderId]
    );
  }

  static async listOrders(options: {
    userId?: number;
    storeId?: number;
    orderStatus?: OrderStatus;
    paymentStatus?: PaymentStatus;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<OrderRow[]> {
    const { userId, storeId, orderStatus, paymentStatus, search, limit = 50, offset = 0 } = options;

    let sql = `
      SELECT o.*, s.name AS store_name, s.slug AS store_slug
      FROM orders o
      LEFT JOIN stores s ON s.id = o.store_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (userId) {
      sql += " AND o.user_id = ?";
      params.push(userId);
    }

    if (storeId) {
      sql += " AND o.store_id = ?";
      params.push(storeId);
    }

    if (orderStatus) {
      sql += " AND o.order_status = ?";
      params.push(orderStatus);
    }

    if (paymentStatus) {
      sql += " AND o.payment_status = ?";
      params.push(paymentStatus);
    }

    if (search) {
      sql += " AND (o.public_order_id LIKE ? OR o.customer_name LIKE ? OR o.customer_email LIKE ? OR o.phone LIKE ?)";
      const term = `%${search}%`;
      params.push(term, term, term, term);
    }

    sql += " ORDER BY o.id DESC LIMIT ? OFFSET ?";
    params.push(limit, offset);

    return query<OrderRow[]>(sql, params);
  }

  static async createOrder(data: Partial<OrderRow>): Promise<OrderRow> {
    const res = await query<{ insertId: number }>(
      `INSERT INTO orders (
        public_order_id, master_order_id, store_id, user_id, total_price, order_status, payment_status,
        payment_gateway, commission_amount, vendor_payout_amount, address, phone, country, customer_name, customer_email,
        delivery_method_id, delivery_status, delivery_fee, delivery_notes, delivery_data_json,
        payment_id, paypal_order_id, paypal_transaction_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.public_order_id,
        data.master_order_id || data.public_order_id,
        data.store_id || 1,
        data.user_id,
        data.total_price,
        data.order_status || "Pending Payment",
        data.payment_status || "Pending",
        data.payment_gateway || "paypal",
        data.commission_amount || 0.0,
        data.vendor_payout_amount || 0.0,
        data.address,
        data.phone,
        data.country,
        data.customer_name,
        data.customer_email,
        data.delivery_method_id || null,
        data.delivery_status || "Pending",
        data.delivery_fee || 0.0,
        data.delivery_notes || null,
        data.delivery_data_json || null,
        data.payment_id || null,
        data.paypal_order_id || null,
        data.paypal_transaction_id || null,
      ]
    );

    const created = await this.findById(res.insertId);
    return created!;
  }

  static async createOrderItem(item: Partial<OrderItemRow>): Promise<void> {
    await query(
      `INSERT INTO order_items (
        order_id, product_id, quantity_packages, unit_type, unit_value, package_name, price, transport_fee, product_name_snapshot, product_image_snapshot
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        item.order_id,
        item.product_id,
        item.quantity_packages,
        item.unit_type || "pcs",
        item.unit_value || 1.0,
        item.package_name || "pack",
        item.price,
        item.transport_fee || 0.0,
        item.product_name_snapshot,
        item.product_image_snapshot,
      ]
    );
  }

  static async getOrderItems(orderId: number): Promise<OrderItemRow[]> {
    return query<OrderItemRow[]>("SELECT * FROM order_items WHERE order_id = ?", [orderId]);
  }

  static async updateOrderStatus(
    orderId: number,
    newStatus: OrderStatus,
    userId?: number,
    actionReason?: string,
    notes?: string
  ): Promise<void> {
    const current = await this.findById(orderId);
    if (!current) return;

    await query("UPDATE orders SET order_status = ? WHERE id = ?", [newStatus, orderId]);

    // Record audit timeline
    await query(
      `INSERT INTO order_status_history (order_id, user_id, action, previous_status, new_status, notes)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [orderId, userId || null, actionReason || "Status Update", current.order_status, newStatus, notes || null]
    );
  }

  static async updatePaymentStatus(
    orderId: number,
    paymentStatus: PaymentStatus,
    paymentId?: string
  ): Promise<void> {
    await query(
      "UPDATE orders SET payment_status = ?, payment_id = COALESCE(?, payment_id) WHERE id = ?",
      [paymentStatus, paymentId || null, orderId]
    );
  }

  static async getOrderStatusHistory(orderId: number): Promise<OrderStatusHistory[]> {
    return query<OrderStatusHistory[]>(
      `SELECT osh.*, u.name AS user_name
       FROM order_status_history osh
       LEFT JOIN users u ON u.id = osh.user_id
       WHERE osh.order_id = ?
       ORDER BY osh.id ASC`,
      [orderId]
    );
  }

  static async getShipment(orderId: number): Promise<Shipment | null> {
    const rows = await query<Shipment[]>("SELECT * FROM shipments WHERE order_id = ? LIMIT 1", [orderId]);
    return rows[0] || null;
  }

  static async upsertShipment(data: Partial<Shipment>): Promise<void> {
    await query(
      `INSERT INTO shipments (order_id, store_id, courier_name, tracking_number, tracking_url, estimated_delivery, shipped_at, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
        courier_name = VALUES(courier_name),
        tracking_number = VALUES(tracking_number),
        tracking_url = VALUES(tracking_url),
        estimated_delivery = VALUES(estimated_delivery),
        shipped_at = VALUES(shipped_at),
        status = VALUES(status)`,
      [
        data.order_id,
        data.store_id,
        data.courier_name || null,
        data.tracking_number || null,
        data.tracking_url || null,
        data.estimated_delivery || null,
        data.shipped_at || null,
        data.status || "Preparing",
      ]
    );
  }
}
