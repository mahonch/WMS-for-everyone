-- Allow write-off to another warehouse/location
ALTER TABLE issues
    ADD COLUMN IF NOT EXISTS target_warehouse_id BIGINT REFERENCES warehouses(id),
    ADD COLUMN IF NOT EXISTS target_location_id BIGINT REFERENCES locations(id);
