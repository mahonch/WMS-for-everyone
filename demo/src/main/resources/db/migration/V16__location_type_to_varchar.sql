-- Convert locations.type to plain varchar for JPA enum mapping
ALTER TABLE locations
    ALTER COLUMN type TYPE VARCHAR(16) USING type::text,
    ALTER COLUMN type SET DEFAULT 'BIN',
    ALTER COLUMN type SET NOT NULL;
