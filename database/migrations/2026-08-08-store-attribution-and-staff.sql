-- Migration: Store attribution column on users table
-- Date: 2026-08-08

ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by_store_id INT NULL AFTER blocked_by;
ALTER TABLE users ADD CONSTRAINT fk_users_referred_by_store FOREIGN KEY (referred_by_store_id) REFERENCES stores(id) ON DELETE SET NULL;
