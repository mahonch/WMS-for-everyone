-- Decouple batches from locations; add per-item location on receipts
ALTER TABLE batches
    DROP CONSTRAINT IF EXISTS fk_batches_location,
    DROP COLUMN IF EXISTS location_id,
    DROP COLUMN IF EXISTS expiry_date;

DROP INDEX IF EXISTS ix_batches_location;

ALTER TABLE batches
    ADD COLUMN IF NOT EXISTS lot_number TEXT;

ALTER TABLE receipt_items
    ADD COLUMN IF NOT EXISTS location_id BIGINT;

ALTER TABLE receipt_items
    ADD CONSTRAINT fk_receipt_items_location FOREIGN KEY (location_id)
        REFERENCES locations(id) ON DELETE SET NULL;
