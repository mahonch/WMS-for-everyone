-- Add warehouse to receipts (nullable for legacy data)
ALTER TABLE receipts
    ADD COLUMN IF NOT EXISTS warehouse_id BIGINT REFERENCES warehouses(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS ix_receipts_warehouse ON receipts(warehouse_id);
