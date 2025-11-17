ALTER TABLE locations DROP CONSTRAINT IF EXISTS fk_locations_warehouse;
ALTER TABLE locations DROP CONSTRAINT IF EXISTS fk_locations_parent;

ALTER TABLE locations
    DROP COLUMN IF EXISTS warehouse_id,
    DROP COLUMN IF EXISTS parent_id,
    DROP COLUMN IF EXISTS type;
