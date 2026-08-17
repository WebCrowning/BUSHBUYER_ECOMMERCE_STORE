-- V2 Multi-Vendor Marketplace Migration Script

-- 1. ROLES & PERMISSIONS (RBAC)
CREATE TABLE IF NOT EXISTS roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(60) NOT NULL UNIQUE,
  slug VARCHAR(60) NOT NULL UNIQUE,
  description TEXT NULL,
  is_system TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS permissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  slug VARCHAR(100) NOT NULL UNIQUE,
  module VARCHAR(60) NOT NULL DEFAULT 'general',
  description TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id INT NOT NULL,
  permission_id INT NOT NULL,
  PRIMARY KEY (role_id, permission_id),
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_permissions (
  user_id INT NOT NULL,
  permission_id INT NOT NULL,
  is_granted TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (user_id, permission_id),
  FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
);

-- Seed System Roles
INSERT INTO roles (id, name, slug, description, is_system) VALUES
  (1, 'Super Admin', 'super_admin', 'Full platform control and unlimited access', 1),
  (2, 'Platform Admin', 'platform_admin', 'Manages users, stores, and platform content', 1),
  (3, 'Finance Admin', 'finance_admin', 'Manages payments, payouts, refunds, and financial reporting', 1),
  (4, 'Store Owner', 'store_owner', 'Primary owner of a vendor store', 1),
  (5, 'Store Manager', 'store_manager', 'Manages store operations, staff, orders, and products', 1),
  (6, 'Inventory Officer', 'inventory_officer', 'Manages store products, stock, and catalog', 1),
  (7, 'Sales Staff', 'sales_staff', 'Manages store order processing and fulfillment', 1),
  (8, 'Customer Support', 'customer_support', 'Handles customer messages, support tickets, and disputes', 1),
  (9, 'Accountant', 'accountant', 'Views financial analytics and sales reports', 1),
  (10, 'Customer', 'customer', 'Standard shopper account', 1)
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- Seed System Permissions
INSERT INTO permissions (name, slug, module, description) VALUES
  ('Manage Products', 'manage_products', 'products', 'Create, update, and delete products'),
  ('Create Products', 'create_products', 'products', 'Create new products'),
  ('Update Products', 'update_products', 'products', 'Modify existing products'),
  ('Delete Products', 'delete_products', 'products', 'Delete products'),
  ('Manage Orders', 'manage_orders', 'orders', 'View and update customer orders'),
  ('Refund Orders', 'refund_orders', 'orders', 'Initiate order refunds'),
  ('Approve Refunds', 'approve_refunds', 'orders', 'Approve pending refund requests'),
  ('Manage Customers', 'manage_customers', 'customers', 'View and manage customer details'),
  ('Manage Inventory', 'manage_inventory', 'inventory', 'Adjust product stock levels'),
  ('Manage Reviews', 'manage_reviews', 'reviews', 'Moderate and reply to reviews'),
  ('Manage Staff', 'manage_staff', 'stores', 'Manage store team members'),
  ('Assign Users', 'assign_users', 'stores', 'Assign roles to store staff'),
  ('Manage Promotions', 'manage_promotions', 'marketing', 'Create and edit store promotions'),
  ('Manage Coupons', 'manage_coupons', 'marketing', 'Create and edit discount coupons'),
  ('Manage Shipping', 'manage_shipping', 'fulfillment', 'Manage shipping methods and tracking'),
  ('Manage Payments', 'manage_payments', 'finance', 'Manage payment gateways and payouts'),
  ('Manage Analytics', 'manage_analytics', 'analytics', 'Access store and platform reports'),
  ('Manage Store Settings', 'manage_store_settings', 'stores', 'Configure store profiles and policies'),
  ('View Reports', 'view_reports', 'analytics', 'View financial and sales reports')
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- 2. STORES & STORE USERS
CREATE TABLE IF NOT EXISTS stores (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(190) NOT NULL,
  slug VARCHAR(190) NOT NULL UNIQUE,
  logo TEXT NULL,
  banner TEXT NULL,
  description TEXT NULL,
  business_category VARCHAR(100) NOT NULL DEFAULT 'General',
  email VARCHAR(190) NULL,
  phone VARCHAR(40) NULL,
  whatsapp VARCHAR(40) NULL,
  address TEXT NULL,
  country VARCHAR(80) NULL,
  city VARCHAR(100) NULL,
  gps_coordinates VARCHAR(100) NULL,
  business_hours_json LONGTEXT NULL,
  website VARCHAR(255) NULL,
  facebook VARCHAR(255) NULL,
  instagram VARCHAR(255) NULL,
  tiktok VARCHAR(255) NULL,
  youtube VARCHAR(255) NULL,
  linkedin VARCHAR(255) NULL,
  twitter VARCHAR(255) NULL,
  verification_status ENUM('unverified','pending','verified','rejected') DEFAULT 'verified',
  store_status ENUM('active','inactive','suspended') DEFAULT 'active',
  rating_avg DECIMAL(3,2) DEFAULT 5.00,
  rating_count INT DEFAULT 0,
  followers_count INT DEFAULT 0,
  products_sold_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS store_users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  store_id INT NOT NULL,
  user_id INT NOT NULL,
  store_role VARCHAR(60) NOT NULL DEFAULT 'store_owner',
  status ENUM('active','invited','suspended') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_store_user (store_id, user_id),
  FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Seed Default Flagship Store for legacy products
INSERT INTO stores (id, name, slug, description, business_category, verification_status, store_status)
VALUES (1, 'Bushbuyer Flagship Store', 'bushbuyer-flagship', 'Official Bushbuyer premier store offering authentic quality products directly.', 'General', 'verified', 'active')
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- 3. STORE FOLLOWERS & REVIEWS
CREATE TABLE IF NOT EXISTS store_followers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  store_id INT NOT NULL,
  user_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_store_follower (store_id, user_id),
  FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS store_reviews (
  id INT AUTO_INCREMENT PRIMARY KEY,
  store_id INT NOT NULL,
  customer_id INT NOT NULL,
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review_text TEXT NULL,
  reply_text TEXT NULL,
  replied_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
  FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS product_reviews (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  store_id INT NOT NULL,
  customer_id INT NOT NULL,
  order_id INT NULL,
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review_text TEXT NULL,
  photos_json LONGTEXT NULL,
  videos_json LONGTEXT NULL,
  seller_reply TEXT NULL,
  seller_replied_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
  FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 4. COLLECTIONS
CREATE TABLE IF NOT EXISTS collections (
  id INT AUTO_INCREMENT PRIMARY KEY,
  store_id INT NOT NULL,
  name VARCHAR(190) NOT NULL,
  slug VARCHAR(190) NOT NULL,
  description TEXT NULL,
  image TEXT NULL,
  is_featured TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_store_collection_slug (store_id, slug),
  FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS collection_products (
  collection_id INT NOT NULL,
  product_id INT NOT NULL,
  PRIMARY KEY (collection_id, product_id),
  FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- 5. WALLETS & COMMISSIONS
CREATE TABLE IF NOT EXISTS wallets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  store_id INT NOT NULL UNIQUE,
  available_balance DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  pending_balance DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  total_withdrawals DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  total_refunds DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  total_commission_paid DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  total_sales DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  currency VARCHAR(10) NOT NULL DEFAULT 'USD',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
);

-- Ensure Flagship store wallet exists
INSERT INTO wallets (store_id, available_balance) VALUES (1, 0.00)
ON DUPLICATE KEY UPDATE store_id = VALUES(store_id);

CREATE TABLE IF NOT EXISTS wallet_transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  wallet_id INT NOT NULL,
  store_id INT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  transaction_type ENUM('sale','withdrawal','refund','commission','adjustment') NOT NULL,
  reference_type VARCHAR(60) NULL,
  reference_id VARCHAR(120) NULL,
  description TEXT NULL,
  status ENUM('pending','completed','cancelled') DEFAULT 'completed',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (wallet_id) REFERENCES wallets(id) ON DELETE CASCADE,
  FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS commissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  level ENUM('global','category','store') NOT NULL DEFAULT 'global',
  target_id VARCHAR(120) NULL,
  rate_percentage DECIMAL(5,2) NOT NULL DEFAULT 5.00,
  description TEXT NULL,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO commissions (level, target_id, rate_percentage, description)
VALUES ('global', 'default', 5.00, 'Global standard 5% platform commission rate')
ON DUPLICATE KEY UPDATE rate_percentage=VALUES(rate_percentage);

CREATE TABLE IF NOT EXISTS withdrawals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  store_id INT NOT NULL,
  user_id INT NOT NULL,
  wallet_id INT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  payment_method VARCHAR(60) NOT NULL DEFAULT 'Mobile Money',
  payout_details_json LONGTEXT NOT NULL,
  status ENUM('pending','approved','processed','rejected') DEFAULT 'pending',
  reference VARCHAR(120) NULL,
  notes TEXT NULL,
  processed_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (wallet_id) REFERENCES wallets(id) ON DELETE CASCADE
);

-- 6. PAYMENTS & WEBHOOKS
CREATE TABLE IF NOT EXISTS payment_transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  master_order_id VARCHAR(64) NOT NULL,
  payment_gateway VARCHAR(50) NOT NULL DEFAULT 'paypal',
  payment_reference VARCHAR(190) NOT NULL UNIQUE,
  transaction_status ENUM('pending','completed','failed','refunded') DEFAULT 'pending',
  amount DECIMAL(12,2) NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'USD',
  store_id INT NULL,
  customer_id INT NOT NULL,
  gateway_fee DECIMAL(10,2) DEFAULT 0.00,
  metadata_json LONGTEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS payment_webhooks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  gateway VARCHAR(50) NOT NULL,
  event_id VARCHAR(120) NOT NULL UNIQUE,
  event_type VARCHAR(120) NOT NULL,
  payload_json LONGTEXT NOT NULL,
  status ENUM('received','processed','failed') DEFAULT 'received',
  processed_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. AUDIT LOGS & SHIPMENTS
CREATE TABLE IF NOT EXISTS audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  store_id INT NULL,
  action VARCHAR(120) NOT NULL,
  entity_type VARCHAR(60) NOT NULL,
  entity_id VARCHAR(120) NOT NULL,
  previous_state_json LONGTEXT NULL,
  new_state_json LONGTEXT NULL,
  ip_address VARCHAR(45) NULL,
  user_agent TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_audit_user (user_id),
  INDEX idx_audit_store (store_id),
  INDEX idx_audit_entity (entity_type, entity_id)
);

CREATE TABLE IF NOT EXISTS order_status_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  user_id INT NULL,
  action VARCHAR(100) NOT NULL,
  previous_status VARCHAR(60) NULL,
  new_status VARCHAR(60) NOT NULL,
  notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS shipments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL UNIQUE,
  store_id INT NOT NULL,
  courier_name VARCHAR(120) NULL,
  tracking_number VARCHAR(120) NULL,
  tracking_url TEXT NULL,
  estimated_delivery DATE NULL,
  shipped_at TIMESTAMP NULL,
  delivered_at TIMESTAMP NULL,
  status VARCHAR(60) DEFAULT 'Preparing',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
);

-- 8. PROMOTIONS, COUPONS & WISHLISTS
CREATE TABLE IF NOT EXISTS promotions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  store_id INT NOT NULL,
  name VARCHAR(190) NOT NULL,
  type ENUM('percentage','fixed_amount','flash_sale') DEFAULT 'percentage',
  discount_value DECIMAL(10,2) NOT NULL,
  min_order_amount DECIMAL(10,2) DEFAULT 0.00,
  start_date DATETIME NOT NULL,
  end_date DATETIME NOT NULL,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS coupons (
  id INT AUTO_INCREMENT PRIMARY KEY,
  store_id INT NOT NULL,
  code VARCHAR(50) NOT NULL,
  discount_type ENUM('percentage','fixed') DEFAULT 'percentage',
  discount_value DECIMAL(10,2) NOT NULL,
  max_uses INT DEFAULT 100,
  current_uses INT DEFAULT 0,
  expires_at DATETIME NULL,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_store_coupon (store_id, code),
  FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS wishlists (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  product_id INT NOT NULL,
  store_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_user_wishlist_product (user_id, product_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
);

-- 9. ALTER EXISTING PRODUCTS TABLE
ALTER TABLE products ADD COLUMN IF NOT EXISTS store_id INT NOT NULL DEFAULT 1;
ALTER TABLE products ADD COLUMN IF NOT EXISTS sku VARCHAR(100) NULL;
ALTER TABLE products ADD COLUMN IF NOT EXISTS barcode VARCHAR(100) NULL;
ALTER TABLE products ADD COLUMN IF NOT EXISTS discount_price DECIMAL(10,2) NULL;
ALTER TABLE products ADD COLUMN IF NOT EXISTS videos_json LONGTEXT NULL;
ALTER TABLE products ADD COLUMN IF NOT EXISTS specifications_json LONGTEXT NULL;
ALTER TABLE products ADD COLUMN IF NOT EXISTS weight_kg DECIMAL(10,3) DEFAULT 0.000;
ALTER TABLE products ADD COLUMN IF NOT EXISTS dimensions_cm VARCHAR(60) NULL;
ALTER TABLE products ADD COLUMN IF NOT EXISTS warranty_info VARCHAR(255) NULL;
ALTER TABLE products ADD COLUMN IF NOT EXISTS subcategory VARCHAR(80) NULL;
ALTER TABLE products ADD COLUMN IF NOT EXISTS tags VARCHAR(255) NULL;
ALTER TABLE products ADD COLUMN IF NOT EXISTS brand VARCHAR(100) NULL;
ALTER TABLE products ADD COLUMN IF NOT EXISTS meta_title VARCHAR(190) NULL;
ALTER TABLE products ADD COLUMN IF NOT EXISTS meta_description TEXT NULL;
ALTER TABLE products ADD COLUMN IF NOT EXISTS status ENUM('active','draft','archived') DEFAULT 'active';
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_digital TINYINT(1) DEFAULT 0;

-- 10. ALTER EXISTING ORDERS TABLE
ALTER TABLE orders ADD COLUMN IF NOT EXISTS master_order_id VARCHAR(64) NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS store_id INT NOT NULL DEFAULT 1;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_status VARCHAR(60) DEFAULT 'Pending Payment';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status VARCHAR(60) DEFAULT 'Pending';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_gateway VARCHAR(50) DEFAULT 'paypal';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS commission_amount DECIMAL(10,2) DEFAULT 0.00;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS vendor_payout_amount DECIMAL(10,2) DEFAULT 0.00;

UPDATE orders SET master_order_id = public_order_id WHERE master_order_id IS NULL OR master_order_id = '';
