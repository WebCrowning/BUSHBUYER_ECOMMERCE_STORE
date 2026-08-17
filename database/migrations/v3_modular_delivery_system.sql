-- V3 Modular Delivery Management System Migration

-- 1. GLOBAL DELIVERY METHODS REGISTRY
CREATE TABLE IF NOT EXISTS delivery_methods (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(60) NOT NULL UNIQUE,
  description TEXT NULL,
  active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed V1 Standard Delivery Methods
INSERT INTO delivery_methods (id, name, code, description, active) VALUES
  (1, 'Local Delivery', 'local_delivery', 'Delivery within local city or neighborhood by local dispatchers', 1),
  (2, 'Shipping', 'shipping', 'Standard regional or national courier shipping', 1),
  (3, 'Store Pickup', 'store_pickup', 'Customer collects order directly from store physical location', 1),
  (4, 'Digital Delivery', 'digital_delivery', 'Downloadable files, licenses, or instant digital content', 1)
ON DUPLICATE KEY UPDATE name=VALUES(name), description=VALUES(description);

-- 2. STORE DELIVERY METHOD CONFIGURATIONS
CREATE TABLE IF NOT EXISTS store_delivery_methods (
  id INT AUTO_INCREMENT PRIMARY KEY,
  store_id INT NOT NULL,
  delivery_method_id INT NOT NULL,
  enabled TINYINT(1) DEFAULT 1,
  is_default TINYINT(1) DEFAULT 0,
  configuration LONGTEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_store_delivery (store_id, delivery_method_id),
  FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
  FOREIGN KEY (delivery_method_id) REFERENCES delivery_methods(id) ON DELETE CASCADE
);

-- Seed Default Flagship Store (store_id = 1) Delivery Methods Configuration
INSERT INTO store_delivery_methods (store_id, delivery_method_id, enabled, is_default, configuration) VALUES
  (1, 1, 1, 1, '{"cities":["Douala","Yaounde","Bamenda"],"delivery_fee":3.00,"free_delivery_threshold":50.00,"estimated_time":"24-48 Hours","delivery_notes":"Dispatcher will call customer before delivery."}'),
  (1, 2, 1, 0, '{"shipping_regions":["Central Africa","Europe","North America"],"shipping_fee":10.00,"free_shipping_threshold":100.00,"courier_name":"Bushbuyer Express","tracking_enabled":true,"estimated_time":"3-5 Business Days"}'),
  (1, 3, 1, 0, '{"pickup_address":"Commercial Avenue, Suite 102, Douala","business_hours":"Mon-Sat: 8:00 AM - 6:00 PM","contact_phone":"+237 600 000 000","pickup_instructions":"Present Order Reference ID and ID card at pickup counter."}'),
  (1, 4, 1, 0, '{"download_limit":5,"expiration_days":30,"instructions":"Digital download link generated upon payment."}')
ON DUPLICATE KEY UPDATE enabled=VALUES(enabled), configuration=VALUES(configuration);

-- 3. ALTER ORDERS TABLE FOR MODULAR DELIVERY
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_method_id INT NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_status VARCHAR(60) DEFAULT 'Pending';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_fee DECIMAL(10,2) DEFAULT 0.00;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_notes TEXT NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_data_json LONGTEXT NULL;
