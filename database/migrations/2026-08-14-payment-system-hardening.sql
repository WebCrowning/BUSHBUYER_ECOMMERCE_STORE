-- Migration: Payment system hardening
-- Adds admin metadata to withdrawals, holding period to commissions,
-- and payout_details exposure on wallet_transactions.

-- 1. Withdrawals: track who processed, admin notes, payout reference
ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS processed_by INT NULL;
ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS admin_notes TEXT NULL;
ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS payout_reference VARCHAR(120) NULL;
ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS min_withdrawal_amount DECIMAL(10,2) NOT NULL DEFAULT 10.00;

-- FK for processed_by
SET @fk_exists = (
  SELECT COUNT(*) FROM information_schema.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'withdrawals'
    AND COLUMN_NAME = 'processed_by' AND REFERENCED_TABLE_NAME = 'users'
);
SET @fk_sql = IF(@fk_exists = 0,
  'ALTER TABLE withdrawals ADD CONSTRAINT fk_withdrawals_processed_by FOREIGN KEY (processed_by) REFERENCES users(id) ON DELETE SET NULL',
  'SELECT 1'
);
PREPARE fk_stmt FROM @fk_sql; EXECUTE fk_stmt; DEALLOCATE PREPARE fk_stmt;

-- 2. Commissions: holding period (days before available_balance is released)
ALTER TABLE commissions ADD COLUMN IF NOT EXISTS holding_period_days INT NOT NULL DEFAULT 0;
ALTER TABLE commissions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP;
ALTER TABLE commissions ADD COLUMN IF NOT EXISTS updated_by INT NULL;

-- 3. wallet_transactions: admin note field for manual adjustments
ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS admin_note TEXT NULL;
ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS balance_snapshot DECIMAL(12,2) NULL;

-- 4. Ensure store_id index on payment_transactions for cross-store queries
SET @pt_idx = (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payment_transactions'
    AND INDEX_NAME = 'idx_pt_store_id'
);
SET @pt_sql = IF(@pt_idx = 0,
  'CREATE INDEX idx_pt_store_id ON payment_transactions (store_id)',
  'SELECT 1'
);
PREPARE pt_stmt FROM @pt_sql; EXECUTE pt_stmt; DEALLOCATE PREPARE pt_stmt;

-- 5. master_order_id index on orders for webhook reconciliation
SET @oi_idx = (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders'
    AND INDEX_NAME = 'idx_orders_master_order_id'
);
SET @oi_sql = IF(@oi_idx = 0,
  'CREATE INDEX idx_orders_master_order_id ON orders (master_order_id)',
  'SELECT 1'
);
PREPARE oi_stmt FROM @oi_sql; EXECUTE oi_stmt; DEALLOCATE PREPARE oi_stmt;
