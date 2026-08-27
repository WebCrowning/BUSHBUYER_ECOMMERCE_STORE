export type CurrencyCode = "XAF" | "USD";

export type Product = {
  id: number;
  storeId?: number;
  storeName?: string;
  storeSlug?: string;
  name: string;
  price: number;
  discountPrice?: number | null;
  transportFee: number;
  image: string;
  imageZoom?: number;
  description: string;
  featured: number;
  category: string;
  packageName: "pack" | "bag" | "bundle" | "carton";
  unitType: "pcs" | "kg";
  unitValue: number;
  stockPackages: number;
  status?: "active" | "draft" | "archived" | "blocked" | string;
  marketplace_enabled?: number;
  admin_blocked?: number;
  admin_block_reason?: string | null;
};

export type CartItem = {
  productId: number;
  storeId?: number;
  storeName?: string;
  name: string;
  price: number;
  transportFee: number;
  image: string;
  quantityPackages: number;
  packageName: "pack" | "bag" | "bundle" | "carton";
  unitType: "pcs" | "kg";
  unitValue: number;
};

export type OrderStatus =
  | "Pending"
  | "Paid"
  | "Shipped"
  | "Delivered"
  | "Pending Payment"
  | "Payment Confirmed"
  | "Awaiting Seller Confirmation"
  | "Accepted"
  | "Preparing"
  | "Packed"
  | "Ready for Pickup"
  | "In Transit"
  | "Out for Delivery"
  | "Completed"
  | "Cancelled"
  | "Returned"
  | "Refunded";

export type Order = {
  id: number;
  public_order_id: string;
  master_order_id?: string;
  store_id?: number;
  user_id: number;
  total_price: number;
  status: OrderStatus;
  order_status?: OrderStatus;
  payment_status?: string;
  address: string;
  phone: string;
  country: string;
  customer_name: string;
  customer_email: string;
  payment_id: string | null;
  received_confirmed_at: string | null;
  created_at: string;
};

export type OrderItem = {
  id: number;
  order_id: number;
  product_id: number;
  quantity_packages: number;
  unit_type: "pcs" | "kg";
  unit_value: number;
  package_name?: string;
  price: number;
  transport_fee?: number;
  name: string;
  image: string;
};

export type ContactMessage = {
  id: number;
  user_id: number | null;
  customer_email: string;
  message: string;
  reply: string | null;
  status: "Open" | "Replied";
  created_at: string;
};
