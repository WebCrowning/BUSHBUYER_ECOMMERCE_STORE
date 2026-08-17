-- Migration: Add password_hash column to users for credentials-based admin auth
-- Date: 2026-08-08

ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255) NULL AFTER provider;
