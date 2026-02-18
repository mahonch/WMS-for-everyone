-- Reason code enum string
ALTER TABLE issues
    ADD COLUMN IF NOT EXISTS reason_code VARCHAR(32) NOT NULL DEFAULT 'DAMAGE';

-- Backfill from existing reason text (optional simple mapping)
UPDATE issues SET reason_code = 'TRANSFER_OUT' WHERE lower(coalesce(reason,'')) like '%transfer%';
UPDATE issues SET reason_code = 'SALE' WHERE lower(coalesce(reason,'')) like '%sale%';
-- others remain DAMAGE
