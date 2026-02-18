-- Restore location columns after shrink
ALTER TABLE locations
    ADD COLUMN IF NOT EXISTS warehouse_id BIGINT,
    ADD COLUMN IF NOT EXISTS parent_id BIGINT,
    ADD COLUMN IF NOT EXISTS type location_type DEFAULT 'BIN' NOT NULL;

-- Fill defaults
UPDATE locations SET type = 'BIN' WHERE type IS NULL;

-- FKs
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_locations_warehouse'
          AND table_name = 'locations') THEN
        ALTER TABLE locations
            ADD CONSTRAINT fk_locations_warehouse
                FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_locations_parent'
          AND table_name = 'locations') THEN
        ALTER TABLE locations
            ADD CONSTRAINT fk_locations_parent
                FOREIGN KEY (parent_id) REFERENCES locations(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Unique index on (warehouse_id, code)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
         WHERE c.relkind = 'i' AND c.relname = 'ux_locations_wh_code') THEN
        CREATE UNIQUE INDEX ux_locations_wh_code ON locations(warehouse_id, code);
    END IF;
END $$;
