-- Convert status columns to varchar for JPA string enums
ALTER TABLE receipts
    ALTER COLUMN status TYPE VARCHAR(20) USING status::text;

ALTER TABLE issues
    ALTER COLUMN status TYPE VARCHAR(20) USING status::text;

ALTER TABLE transfers
    ALTER COLUMN status TYPE VARCHAR(20) USING status::text;
