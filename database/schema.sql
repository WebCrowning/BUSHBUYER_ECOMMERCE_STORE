CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  image TEXT NULL,
  provider VARCHAR(80) NOT NULL,
  password_hash VARCHAR(255) NULL,
  role ENUM('user','admin','sub_admin') DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS image TEXT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS provider VARCHAR(80) NOT NULL DEFAULT 'credentials';
ALTER TABLE users ADD COLUMN IF NOT EXISTS role ENUM('user','admin','sub_admin') DEFAULT 'user';
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_blocked TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS blocked_reason TEXT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS blocked_at TIMESTAMP NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS blocked_by INT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_country_code VARCHAR(8) NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_number VARCHAR(40) NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS default_country VARCHAR(80) NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS default_address_line1 VARCHAR(255) NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS default_address_line2 VARCHAR(255) NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS default_city VARCHAR(120) NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS default_state_province VARCHAR(120) NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS default_postal_code VARCHAR(30) NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS default_delivery_note TEXT NULL;

CREATE TABLE IF NOT EXISTS cms_pages (
  slug VARCHAR(64) PRIMARY KEY,
  title VARCHAR(180) NOT NULL,
  content_html LONGTEXT NOT NULL,
  updated_by VARCHAR(191) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT INTO cms_pages (slug, title, content_html)
VALUES
  ('about', 'About Us', '<h2>Who We Are</h2><p>Bushfaller connects families, chefs, and food businesses with authentic African raw food ingredients through trusted sourcing and dependable delivery.</p><h2>Our Mission</h2><p>Our mission is to make premium African ingredients accessible worldwide while supporting responsible sourcing partners.</p><h2>What Makes Us Different</h2><ul><li>Direct relationships with verified farmers and processors</li><li>Quality checks and careful packaging before dispatch</li><li>Fast customer support through email and chat</li></ul><h2>Contact</h2><p>For partnerships, bulk orders, or support, contact our team via the Contact page.</p>'),
  ('privacy', 'Privacy Policy', '<h2>1. Information We Collect</h2><p>We collect information needed to process orders, provide support, and improve your experience, including account, delivery, and communication details.</p><h2>2. How We Use Information</h2><ul><li>To process and deliver orders</li><li>To communicate order and support updates</li><li>To improve product and service quality</li></ul><h2>3. Payment and Security</h2><p>Payments are processed through trusted providers. We apply security best practices to protect account and order information.</p><h2>4. Your Rights</h2><p>You may request updates or deletion of your personal data by contacting support.</p><h2>5. Policy Updates</h2><p>We may update this policy periodically. Changes will be published on this page with an updated date.</p>')
ON DUPLICATE KEY UPDATE title = VALUES(title);

CREATE TABLE IF NOT EXISTS traffic_events (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  path VARCHAR(255) NOT NULL,
  referrer VARCHAR(255) NULL,
  user_agent VARCHAR(255) NULL,
  session_key CHAR(64) NOT NULL,
  country VARCHAR(60) NULL,
  load_ms INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_traffic_created_at (created_at),
  INDEX idx_traffic_path_created_at (path, created_at),
  INDEX idx_traffic_session_created_at (session_key, created_at)
);

CREATE TABLE IF NOT EXISTS products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(190) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  transport_fee DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  image TEXT NOT NULL,
  image_zoom INT NOT NULL DEFAULT 100,
  description TEXT NOT NULL,
  featured TINYINT(1) DEFAULT 0,
  category VARCHAR(80) DEFAULT 'General',
  package_name VARCHAR(50) NOT NULL DEFAULT 'pack',
  unit_type ENUM('pcs','kg') NOT NULL DEFAULT 'pcs',
  unit_value DECIMAL(10,3) NOT NULL DEFAULT 1.000,
  stock_packages INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  public_order_id VARCHAR(32) NOT NULL UNIQUE,
  user_id INT NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  status ENUM('Pending','Paid','Shipped','Delivered') DEFAULT 'Pending',
  address TEXT NOT NULL,
  phone VARCHAR(40) NOT NULL,
  country VARCHAR(80) NOT NULL,
  customer_name VARCHAR(120) NOT NULL,
  customer_email VARCHAR(190) NOT NULL,
  payment_id VARCHAR(120) NULL UNIQUE,
  received_confirmed_at TIMESTAMP NULL,
  paypal_order_id VARCHAR(120) NULL UNIQUE,
  paypal_transaction_id VARCHAR(120) NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

ALTER TABLE orders ADD COLUMN IF NOT EXISTS paypal_order_id VARCHAR(120) NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS paypal_transaction_id VARCHAR(120) NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS received_confirmed_at TIMESTAMP NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS public_order_id VARCHAR(32) NULL;
UPDATE orders
SET public_order_id = CONCAT(
  'BF-',
  DATE_FORMAT(COALESCE(created_at, NOW()), '%Y%m%d'),
  '-',
  UPPER(LEFT(REPLACE(UUID(), '-', ''), 10))
)
WHERE public_order_id IS NULL OR public_order_id = '';
ALTER TABLE orders MODIFY COLUMN public_order_id VARCHAR(32) NOT NULL;
ALTER TABLE orders ADD UNIQUE INDEX uq_orders_public_order_id (public_order_id);
ALTER TABLE orders ADD UNIQUE INDEX uq_orders_paypal_order_id (paypal_order_id);
ALTER TABLE orders ADD UNIQUE INDEX uq_orders_paypal_transaction_id (paypal_transaction_id);

CREATE TABLE IF NOT EXISTS paypal_checkout_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  paypal_order_id VARCHAR(120) NOT NULL UNIQUE,
  user_id INT NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'USD',
  verified_total DECIMAL(10,2) NOT NULL,
  items_json LONGTEXT NOT NULL,
  status ENUM('created','consumed','expired') NOT NULL DEFAULT 'created',
  consumed_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_paypal_checkout_user (user_id),
  INDEX idx_paypal_checkout_status_created (status, created_at)
);

CREATE TABLE IF NOT EXISTS paypal_webhook_events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  event_id VARCHAR(120) NOT NULL UNIQUE,
  event_type VARCHAR(120) NOT NULL,
  resource_id VARCHAR(120) NULL,
  paypal_order_id VARCHAR(120) NULL,
  payload LONGTEXT NOT NULL,
  reconciliation_status ENUM('processed','unmatched') NOT NULL DEFAULT 'processed',
  matched_order_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  processed_at TIMESTAMP NULL,
  FOREIGN KEY (matched_order_id) REFERENCES orders(id) ON DELETE SET NULL,
  INDEX idx_paypal_webhook_event_type_created (event_type, created_at),
  INDEX idx_paypal_webhook_resource_id (resource_id)
);

CREATE TABLE IF NOT EXISTS order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity_packages INT NOT NULL,
  unit_type ENUM('pcs','kg') NOT NULL,
  unit_value DECIMAL(10,3) NOT NULL,
  package_name VARCHAR(50) NOT NULL DEFAULT 'pack',
  price DECIMAL(10,2) NOT NULL,
  transport_fee DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  product_name_snapshot VARCHAR(190) NOT NULL,
  product_image_snapshot TEXT NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id)
);

ALTER TABLE products ADD COLUMN IF NOT EXISTS transport_fee DECIMAL(10,2) NOT NULL DEFAULT 0.00;
ALTER TABLE products ADD COLUMN IF NOT EXISTS image_zoom INT NOT NULL DEFAULT 100;
ALTER TABLE products ADD COLUMN IF NOT EXISTS package_name VARCHAR(50) NOT NULL DEFAULT 'pack';
ALTER TABLE products ADD COLUMN IF NOT EXISTS unit_type ENUM('pcs','kg') NOT NULL DEFAULT 'pcs';
ALTER TABLE products ADD COLUMN IF NOT EXISTS unit_value DECIMAL(10,3) NOT NULL DEFAULT 1.000;
ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_packages INT NOT NULL DEFAULT 0;

UPDATE products
SET
  package_name = CASE
    WHEN unit = 'kg' THEN 'pack'
    WHEN unit = 'pcs' THEN 'bag'
    ELSE COALESCE(package_name, 'pack')
  END,
  unit_type = CASE
    WHEN unit = 'kg' THEN 'kg'
    WHEN unit = 'pcs' THEN 'pcs'
    ELSE COALESCE(unit_type, 'pcs')
  END,
  unit_value = CASE
    WHEN unit IN ('kg','pcs') THEN 1.000
    ELSE COALESCE(unit_value, 1.000)
  END,
  stock_packages = CASE
    WHEN stock IS NOT NULL THEN GREATEST(0, FLOOR(stock))
    ELSE COALESCE(stock_packages, 0)
  END
WHERE (unit IS NOT NULL OR stock IS NOT NULL)
  AND (package_name IS NULL OR unit_type IS NULL OR unit_value IS NULL OR stock_packages IS NULL OR stock_packages = 0);

ALTER TABLE products DROP COLUMN IF EXISTS unit;
ALTER TABLE products DROP COLUMN IF EXISTS min_step;
ALTER TABLE products DROP COLUMN IF EXISTS stock;

ALTER TABLE order_items ADD COLUMN IF NOT EXISTS transport_fee DECIMAL(10,2) NOT NULL DEFAULT 0.00;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS quantity_packages INT NOT NULL DEFAULT 1;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS unit_type ENUM('pcs','kg') NOT NULL DEFAULT 'pcs';
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS unit_value DECIMAL(10,3) NOT NULL DEFAULT 1.000;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS package_name VARCHAR(50) NOT NULL DEFAULT 'pack';

UPDATE order_items
SET quantity_packages = GREATEST(1, FLOOR(quantity))
WHERE quantity_packages IS NULL OR quantity_packages = 0;

ALTER TABLE order_items DROP COLUMN IF EXISTS quantity;

CREATE TABLE IF NOT EXISTS messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  customer_email VARCHAR(190) NULL,
  message TEXT NOT NULL,
  reply TEXT NULL,
  status ENUM('Open','Replied') DEFAULT 'Open',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

ALTER TABLE messages ADD COLUMN IF NOT EXISTS customer_email VARCHAR(190) NULL;

CREATE TABLE IF NOT EXISTS faq (
  id INT AUTO_INCREMENT PRIMARY KEY,
  question VARCHAR(500) NOT NULL,
  answer TEXT NOT NULL,
  category VARCHAR(100) NOT NULL DEFAULT 'General',
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_faq_category (category),
  INDEX idx_faq_created_at (created_at)
);

CREATE TABLE IF NOT EXISTS admin_chat_conversations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customer_id INT NOT NULL,
  assigned_admin_id INT NULL,
  status ENUM('open','taken','closed') DEFAULT 'open',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_admin_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_status (status),
  INDEX idx_assigned_admin (assigned_admin_id),
  INDEX idx_updated_at (updated_at)
);

CREATE TABLE IF NOT EXISTS admin_chat_messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  conversation_id INT NOT NULL,
  sender_id INT NOT NULL,
  sender_type ENUM('customer','admin') NOT NULL,
  message LONGTEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (conversation_id) REFERENCES admin_chat_conversations(id) ON DELETE CASCADE,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_conversation (conversation_id),
  INDEX idx_created_at (created_at)
);

CREATE TABLE IF NOT EXISTS admin_chat_ai_messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  conversation_id INT NOT NULL,
  message LONGTEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (conversation_id) REFERENCES admin_chat_conversations(id) ON DELETE CASCADE,
  INDEX idx_conversation_ai (conversation_id),
  INDEX idx_created_at_ai (created_at)
);

CREATE TABLE IF NOT EXISTS admin_online_status (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  status ENUM('online','offline') DEFAULT 'offline',
  last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  audience ENUM('user','admin') NOT NULL,
  type VARCHAR(60) NOT NULL DEFAULT 'general',
  title VARCHAR(190) NOT NULL,
  body TEXT NULL,
  link VARCHAR(255) NULL,
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  read_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_notifications_user_read_created (user_id, is_read, created_at),
  INDEX idx_notifications_audience_read_created (audience, is_read, created_at)
);

INSERT INTO products (name, price, transport_fee, image, description, featured, category, package_name, unit_type, unit_value, stock_packages)
VALUES
  ('Premium Dried Fish', 18.50, 3.00, 'https://images.unsplash.com/photo-1510130387422-82bed34b37e9?q=80&w=1200&auto=format&fit=crop', 'Sun-dried fish with rich flavor for soups and sauces.', 1, 'Seafood', 'bag', 'pcs', 20.000, 50),
  ('Fresh African Snails', 24.99, 4.50, 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?q=80&w=1200&auto=format&fit=crop', 'Carefully cleaned and packed giant snails for premium meals.', 1, 'Protein', 'pack', 'kg', 1.000, 35),
  ('Eru Leaves Bundle', 12.00, 2.00, 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?q=80&w=1200&auto=format&fit=crop', 'Authentic eru leaves, ready for your favorite traditional recipe.', 0, 'Vegetables', 'bundle', 'kg', 0.500, 80)
ON DUPLICATE KEY UPDATE name = VALUES(name);
