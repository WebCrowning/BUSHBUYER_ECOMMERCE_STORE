-- Migration: Create categories table for platform-agnostic category management
-- Categories are not food-specific — the platform supports any product type.

CREATE TABLE IF NOT EXISTS categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  slug VARCHAR(120) NOT NULL UNIQUE,
  icon VARCHAR(20) NULL DEFAULT '📦',
  description TEXT NULL,
  color VARCHAR(20) NOT NULL DEFAULT '#6B7280',
  sort_order INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_categories_active_sort (is_active, sort_order)
);

-- Optional: link products to categories
ALTER TABLE products ADD COLUMN IF NOT EXISTS category_id INT NULL;
UPDATE products p JOIN categories c ON LOWER(c.name) = LOWER(p.category) SET p.category_id = c.id WHERE p.category_id IS NULL;
