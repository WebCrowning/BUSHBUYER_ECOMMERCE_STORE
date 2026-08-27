export type SystemRole =
  | "super_admin"
  | "platform_admin"
  | "finance_admin"
  | "admin"
  | "sub_admin"
  | "user"
  | "store_owner"
  | "store_manager"
  | "inventory_officer"
  | "sales_staff"
  | "customer_support"
  | "accountant"
  | "customer";

export type PermissionSlug =
  | "manage_products"
  | "create_products"
  | "update_products"
  | "delete_products"
  | "manage_orders"
  | "refund_orders"
  | "approve_refunds"
  | "manage_customers"
  | "manage_inventory"
  | "manage_reviews"
  | "manage_staff"
  | "assign_users"
  | "manage_promotions"
  | "manage_coupons"
  | "manage_shipping"
  | "manage_payments"
  | "manage_analytics"
  | "manage_store_settings"
  | "view_reports";

export interface Role {
  id: number;
  name: string;
  slug: SystemRole;
  description?: string;
  is_system: boolean;
}

export interface Permission {
  id: number;
  name: string;
  slug: PermissionSlug;
  module: string;
  description?: string;
}

export interface Store {
  id: number;
  name: string;
  slug: string;
  logo?: string | null;
  banner?: string | null;
  description?: string | null;
  business_category: string;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  address?: string | null;
  country?: string | null;
  city?: string | null;
  quarter?: string | null;
  landmark?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  gps_coordinates?: string | null;
  is_location_verified?: boolean | number;
  location_verified_at?: string | null;
  location_accuracy_meters?: number | null;
  location_verification_method?: string | null;
  business_hours_json?: string | null;
  website?: string | null;
  facebook?: string | null;
  instagram?: string | null;
  tiktok?: string | null;
  youtube?: string | null;
  linkedin?: string | null;
  twitter?: string | null;
  verification_status: "unverified" | "pending" | "verified" | "rejected";
  store_status: "active" | "inactive" | "suspended";
  rating_avg: number;
  rating_count: number;
  followers_count: number;
  products_sold_count: number;
  created_at?: string;
  updated_at?: string;
}

export interface VisitedStore {
  store: Store;
  visit_count: number;
  last_visited_at: string;
}

export interface StoreUser {
  id: number;
  store_id: number;
  user_id: number;
  store_role: SystemRole;
  status: "active" | "invited" | "suspended";
  user_name?: string;
  user_email?: string;
  user_image?: string;
}

export type OrderStatus =
  | "Pending Payment"
  | "Payment Confirmed"
  | "Awaiting Seller Confirmation"
  | "Accepted"
  | "Preparing"
  | "Packed"
  | "Ready for Pickup"
  | "Shipped"
  | "In Transit"
  | "Out for Delivery"
  | "Delivered"
  | "Completed"
  | "Cancelled"
  | "Returned"
  | "Refunded";

export type PaymentStatus =
  | "Pending"
  | "Processing"
  | "Paid"
  | "Failed"
  | "Cancelled"
  | "Refunded"
  | "Partially Refunded";

export type PaymentGateway = "paypal" | "fapshi";

export interface Wallet {
  id: number;
  store_id: number;
  available_balance: number;
  pending_balance: number;
  total_withdrawals: number;
  total_refunds: number;
  total_commission_paid: number;
  total_sales: number;
  currency: string;
  updated_at?: string;
}

export interface WalletTransaction {
  id: number;
  wallet_id: number;
  store_id: number;
  amount: number;
  transaction_type: "sale" | "withdrawal" | "refund" | "commission" | "adjustment" | "payment_fee";
  reference_type?: string;
  reference_id?: string;
  description?: string;
  status: "pending" | "completed" | "cancelled";
  created_at?: string;
}

export interface Commission {
  id: number;
  level: "global" | "category" | "store";
  target_id?: string;
  rate_percentage: number;
  description?: string;
  is_active: boolean;
}

export interface OrderStatusHistory {
  id: number;
  order_id: number;
  user_id?: number;
  action: string;
  previous_status?: string;
  new_status: string;
  notes?: string;
  created_at: string;
  user_name?: string;
}

export interface Shipment {
  id: number;
  order_id: number;
  store_id: number;
  courier_name?: string;
  tracking_number?: string;
  tracking_url?: string;
  estimated_delivery?: string;
  shipped_at?: string;
  delivered_at?: string;
  status: string;
}

export interface ProductReview {
  id: number;
  product_id: number;
  store_id: number;
  customer_id: number;
  order_id?: number;
  rating: number;
  review_text?: string;
  photos_json?: string;
  videos_json?: string;
  seller_reply?: string;
  seller_replied_at?: string;
  created_at: string;
  customer_name?: string;
  customer_image?: string;
}

export interface FapshiPaymentRequest {
  amount: number;
  email: string;
  externalId: string;
  redirectUrl: string;
  message?: string;
}

export interface FapshiPaymentResponse {
  transId: string;
  link: string;
  message: string;
  statusCode: number;
}

export interface FapshiTransactionStatus {
  transId: string;
  status: "SUCCESSFUL" | "PENDING" | "FAILED" | "EXPIRED";
  amount: number;
  currency: string;
  externalId?: string;
  message?: string;
  dateInitiated?: string;
  dateConfirmed?: string;
}

export interface PaymentDashboardStats {
  totalRevenue: number;
  paypalVolume: number;
  paypalVolumeLast30: number;
  fapshiVolume: number;
  fapshiVolumeLast30: number;
  totalCommission: number;
  commissionLast30: number;
  totalSellerPayouts: number;
  pendingWithdrawalsCount: number;
  pendingWithdrawalsAmount: number;
  recentTransactions: PaymentTransactionRow[];
  gatewayBreakdown: { paypal: number; fapshi: number };
}

export interface PaymentTransactionRow {
  id: number;
  master_order_id: string;
  payment_gateway: string;
  payment_reference: string;
  transaction_status: string;
  amount: number;
  currency: string;
  customer_id: number;
  customer_name?: string;
  gateway_fee?: number;
  created_at: string;
}
