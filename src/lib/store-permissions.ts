import { SystemRole } from "@/types/marketplace";

export type StorePermission =
  | "view_dashboard"
  | "edit_store_settings"
  | "manage_products"
  | "view_products"
  | "manage_inventory"
  | "view_orders"
  | "update_orders"
  | "view_wallet"
  | "withdraw_wallet"
  | "manage_delivery"
  | "manage_staff"
  | "view_messages"
  | "reply_messages"
  | "view_analytics"
  | "manage_faq"
  | "view_notifications";

export const STORE_ROLE_PERMISSIONS: Record<string, StorePermission[]> = {
  // Store Owner: Highest authority across all domains
  store_owner: [
    "view_dashboard",
    "edit_store_settings",
    "manage_products",
    "view_products",
    "manage_inventory",
    "view_orders",
    "update_orders",
    "view_wallet",
    "withdraw_wallet",
    "manage_delivery",
    "manage_staff",
    "view_messages",
    "reply_messages",
    "view_analytics",
    "manage_faq",
    "view_notifications",
  ],

  // Store Manager: Operational management (all operations, sub-delegated staff management)
  store_manager: [
    "view_dashboard",
    "edit_store_settings",
    "manage_products",
    "view_products",
    "manage_inventory",
    "view_orders",
    "update_orders",
    "view_wallet",
    "withdraw_wallet",
    "manage_delivery",
    "manage_staff",
    "view_messages",
    "reply_messages",
    "view_analytics",
    "manage_faq",
    "view_notifications",
  ],

  // Inventory Officer: Products, catalog & stock levels
  inventory_officer: [
    "view_dashboard",
    "manage_products",
    "view_products",
    "manage_inventory",
    "view_orders",
    "view_notifications",
  ],

  // Sales Staff: Orders, customer communications, sales conversion
  sales_staff: [
    "view_dashboard",
    "view_products",
    "view_orders",
    "update_orders",
    "view_messages",
    "reply_messages",
    "view_analytics",
    "view_notifications",
  ],

  // Customer Support: Customer enquiries, order status queries, live chat, FAQ
  customer_support: [
    "view_dashboard",
    "view_products",
    "view_orders",
    "update_orders",
    "view_messages",
    "reply_messages",
    "manage_faq",
    "view_notifications",
  ],

  // Accountant: Financials, earnings reports, wallet oversight & order audit
  accountant: [
    "view_dashboard",
    "view_orders",
    "view_wallet",
    "view_analytics",
    "view_notifications",
  ],
};

export const STORE_ROLE_META: Record<
  string,
  { label: string; description: string; badgeClass: string; authorityLevel: number }
> = {
  store_owner: {
    label: "Store Owner",
    description: "Full master authority over all store operations, finances, settings, and staff.",
    badgeClass: "bg-amber-50 text-amber-800 border-amber-300 ring-1 ring-amber-200",
    authorityLevel: 100,
  },
  store_manager: {
    label: "Store Manager",
    description: "Operational management authority across daily inventory, orders, deliveries, and staff.",
    badgeClass: "bg-sky-50 text-sky-800 border-sky-300 ring-1 ring-sky-200",
    authorityLevel: 80,
  },
  inventory_officer: {
    label: "Inventory Officer",
    description: "Manages catalog, adds/updates products, tracks low stock, and restocks inventory.",
    badgeClass: "bg-teal-50 text-teal-800 border-teal-300 ring-1 ring-teal-200",
    authorityLevel: 50,
  },
  sales_staff: {
    label: "Sales Staff",
    description: "Processes customer orders, manages order fulfillment statuses, and handles customer enquiries.",
    badgeClass: "bg-purple-50 text-purple-800 border-purple-300 ring-1 ring-purple-200",
    authorityLevel: 40,
  },
  customer_support: {
    label: "Customer Support",
    description: "Assists customers via messages & live chat, tracks order issues, and updates store FAQs.",
    badgeClass: "bg-rose-50 text-rose-800 border-rose-300 ring-1 ring-rose-200",
    authorityLevel: 30,
  },
  accountant: {
    label: "Accountant",
    description: "Audits store finances, inspects transaction ledgers, wallet balances, and performance metrics.",
    badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-300 ring-1 ring-emerald-200",
    authorityLevel: 40,
  },
};

/**
 * Checks if a given store role has the required permission.
 * Defaults to false if role is not recognized.
 */
export function hasStorePermission(
  role: string | null | undefined,
  permission: StorePermission
): boolean {
  if (!role) return false;
  // Super admin or admin fallback
  if (role === "super_admin" || role === "admin") return true;

  const permissions = STORE_ROLE_PERMISSIONS[role];
  if (!permissions) return false;
  return permissions.includes(permission);
}

/**
 * Check if the user is allowed to access a specific seller page route.
 */
export function canAccessSellerRoute(
  role: string | null | undefined,
  routePath: string
): boolean {
  if (!role) return false;
  if (role === "store_owner" || role === "super_admin" || role === "admin") return true;

  const cleanRoute = routePath.split("?")[0].replace(/\/$/, "");

  switch (cleanRoute) {
    case "/seller/dashboard":
      return hasStorePermission(role, "view_dashboard");
    case "/seller/notifications":
      return hasStorePermission(role, "view_notifications");
    case "/seller/location":
      return hasStorePermission(role, "edit_store_settings");
    case "/seller/products":
      return hasStorePermission(role, "manage_products") || hasStorePermission(role, "view_products");
    case "/seller/inventory":
      return hasStorePermission(role, "manage_inventory");
    case "/seller/orders":
      return hasStorePermission(role, "view_orders");
    case "/seller/wallets":
      return hasStorePermission(role, "view_wallet");
    case "/seller/delivery-settings":
      return hasStorePermission(role, "manage_delivery");
    case "/seller/staff":
      return hasStorePermission(role, "manage_staff");
    case "/seller/messages":
      return hasStorePermission(role, "view_messages");
    case "/seller/chat":
      return hasStorePermission(role, "view_messages");
    case "/seller/traffic":
      return hasStorePermission(role, "view_analytics");
    case "/seller/faq":
      return hasStorePermission(role, "manage_faq") || hasStorePermission(role, "view_messages");
    default:
      return true;
  }
}
