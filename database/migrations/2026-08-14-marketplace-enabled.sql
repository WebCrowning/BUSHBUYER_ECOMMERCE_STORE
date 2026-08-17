-- Migration: Add marketplace_enabled to products
-- Controls whether a vendor's product appears on the public /products page.
-- Only platform admins can toggle this flag — store owners cannot.

ALTER TABLE products ADD COLUMN IF NOT EXISTS marketplace_enabled TINYINT(1) NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_products_marketplace ON products (marketplace_enabled, status);

-- Existing store_id=0 (global catalog) products are enabled automatically
-- to preserve backward compatibility with the existing public catalog.
UPDATE products SET marketplace_enabled = 1 WHERE store_id = 0 AND marketplace_enabled = 0;
