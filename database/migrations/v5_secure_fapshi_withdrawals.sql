-- Migration: V5 Secure Fapshi Payout & Disbursement System
-- Establishes system settings, enhanced withdrawals schema, and financial audit logs.

-- 1. System Settings Table
CREATE TABLE IF NOT EXISTS system_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  setting_key VARCHAR(100) NOT NULL UNIQUE,
  setting_value TEXT NOT NULL,
  description VARCHAR(255) NULL,
  updated_by INT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_settings_key (setting_key)
);

-- Seed System Settings (CRITICAL: Default withdrawal_mode is strictly MANUAL)
INSERT INTO system_settings (setting_key, setting_value, description) VALUES
  ('withdrawal_mode', 'MANUAL', 'Withdrawal execution mode: MANUAL (admin approval required) or AUTO (automatic Fapshi payout)'),
  ('min_withdrawal_amount', '500', 'Minimum withdrawal amount in currency units (e.g., 500 XAF)'),
  ('max_withdrawal_amount', '500000', 'Maximum single withdrawal amount in currency units (e.g., 500,000 XAF)'),
  ('withdrawal_fee_fixed', '0', 'Fixed fee deducted from withdrawal amount'),
  ('withdrawal_fee_percentage', '0', 'Percentage fee deducted from withdrawal amount (e.g., 1.5 for 1.5%)'),
  ('auto_max_amount', '50000', 'Maximum allowed single withdrawal for automatic payout when AUTO mode is enabled'),
  ('daily_user_limit', '100000', 'Maximum total automatic payout allowed per user per 24 hours'),
  ('daily_global_limit', '1000000', 'Maximum total automatic payout allowed across the platform per 24 hours')
ON DUPLICATE KEY UPDATE description = VALUES(description);

-- 2. Upgrade Withdrawals Table
ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS fee DECIMAL(12,2) NOT NULL DEFAULT 0.00;
ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS net_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00;
ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS currency VARCHAR(10) NOT NULL DEFAULT 'XAF';
ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS recipient_phone VARCHAR(40) NULL;
ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS recipient_name VARCHAR(120) NULL;
ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS recipient_email VARCHAR(190) NULL;
ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS fapshi_reference VARCHAR(120) NULL;
ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS fapshi_transaction_id VARCHAR(120) NULL;
ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(120) NULL;
ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS failure_reason TEXT NULL;
ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS requested_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP NULL;
ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP NULL;
ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- Modify status column to support complete state machine
ALTER TABLE withdrawals MODIFY COLUMN status VARCHAR(30) NOT NULL DEFAULT 'PENDING';

-- Add Indexes on withdrawals for performance & security
SET @idx_w_fapshi_ref = (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'withdrawals'
    AND INDEX_NAME = 'idx_w_fapshi_ref'
);
SET @sql_w_fapshi_ref = IF(@idx_w_fapshi_ref = 0, 'CREATE INDEX idx_w_fapshi_ref ON withdrawals (fapshi_reference)', 'SELECT 1');
PREPARE stmt_w_fapshi_ref FROM @sql_w_fapshi_ref; EXECUTE stmt_w_fapshi_ref; DEALLOCATE PREPARE stmt_w_fapshi_ref;

SET @idx_w_fapshi_trans = (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'withdrawals'
    AND INDEX_NAME = 'idx_w_fapshi_trans'
);
SET @sql_w_fapshi_trans = IF(@idx_w_fapshi_trans = 0, 'CREATE INDEX idx_w_fapshi_trans ON withdrawals (fapshi_transaction_id)', 'SELECT 1');
PREPARE stmt_w_fapshi_trans FROM @sql_w_fapshi_trans; EXECUTE stmt_w_fapshi_trans; DEALLOCATE PREPARE stmt_w_fapshi_trans;

SET @idx_w_idempotency = (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'withdrawals'
    AND INDEX_NAME = 'idx_w_idempotency'
);
SET @sql_w_idempotency = IF(@idx_w_idempotency = 0, 'CREATE UNIQUE INDEX idx_w_idempotency ON withdrawals (idempotency_key)', 'SELECT 1');
PREPARE stmt_w_idempotency FROM @sql_w_idempotency; EXECUTE stmt_w_idempotency; DEALLOCATE PREPARE stmt_w_idempotency;

-- 3. Withdrawal Financial Audit Logs Table
CREATE TABLE IF NOT EXISTS withdrawal_audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  withdrawal_id INT NULL,
  actor_id INT NULL,
  actor_role VARCHAR(50) NOT NULL DEFAULT 'system',
  action VARCHAR(100) NOT NULL,
  old_status VARCHAR(50) NULL,
  new_status VARCHAR(50) NULL,
  amount DECIMAL(12,2) NULL,
  metadata_json LONGTEXT NULL,
  ip_address VARCHAR(45) NULL,
  user_agent TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_audit_withdrawal (withdrawal_id),
  INDEX idx_audit_actor (actor_id),
  INDEX idx_audit_action (action)
);
