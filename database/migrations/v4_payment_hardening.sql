-- V4 Payment Hardening Migration
-- Hardens payment idempotency, adds Fapshi order linking,
-- and extends wallet_transactions to support payment_fee ledger entries.

-- 1. Add Fapshi transaction ID to orders for idempotent order linking
ALTER TABLE orders ADD COLUMN IF NOT EXISTS fapshi_trans_id VARCHAR(120) NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method VARCHAR(60) DEFAULT 'paypal';

-- Add unique index (only if not already present)
SET @idx_exists = (
  SELECT COUNT(*)
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'orders'
    AND index_name = 'uq_orders_fapshi_trans_id'
);
SET @sql = IF(@idx_exists = 0,
  'ALTER TABLE orders ADD UNIQUE INDEX uq_orders_fapshi_trans_id (fapshi_trans_id)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2. Extend wallet_transactions transaction_type to include payment_fee
-- First alter to the expanded ENUM
ALTER TABLE wallet_transactions
  MODIFY COLUMN transaction_type
    ENUM('sale','withdrawal','refund','commission','adjustment','payment_fee')
    NOT NULL;

-- 3. Ensure payment_webhooks has unique constraint on event_id (should exist from v2 but verify)
-- This is idempotent — will error silently if already exists in most MySQL setups
SET @wh_idx = (
  SELECT COUNT(*)
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'payment_webhooks'
    AND index_name = 'event_id'
);
SET @wh_sql = IF(@wh_idx = 0,
  'ALTER TABLE payment_webhooks ADD UNIQUE INDEX uq_payment_webhooks_event_id (event_id)',
  'SELECT 1'
);
PREPARE wh_stmt FROM @wh_sql;
EXECUTE wh_stmt;
DEALLOCATE PREPARE wh_stmt;

-- 4. Add a Fapshi checkout sessions table (mirrors paypal_checkout_sessions pattern)
CREATE TABLE IF NOT EXISTS fapshi_checkout_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  trans_id VARCHAR(120) NOT NULL UNIQUE,
  user_id INT NOT NULL,
  master_order_id VARCHAR(64) NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'XAF',
  verified_total DECIMAL(12,2) NOT NULL,
  items_json LONGTEXT NOT NULL,
  delivery_data_json LONGTEXT NULL,
  status ENUM('created','consumed','expired','failed') NOT NULL DEFAULT 'created',
  consumed_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_fapshi_session_user (user_id),
  INDEX idx_fapshi_session_status (status, created_at)
);
