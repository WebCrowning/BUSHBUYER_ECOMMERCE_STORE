-- Migration: Add store_id to faq table for per-store FAQ support
-- NULL store_id = global/platform FAQ (visible on /faq and as fallback on all store pages)
-- Non-NULL store_id = belongs to that store only

ALTER TABLE faq ADD COLUMN IF NOT EXISTS store_id INT NULL DEFAULT NULL;
ALTER TABLE faq ADD CONSTRAINT IF NOT EXISTS fk_faq_store_id FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_faq_store_id ON faq (store_id);

-- All existing FAQs are global (store_id stays NULL — no data change needed)
