-- Добавляем колонку location_id в batches, если её ещё нет
ALTER TABLE batches
    ADD COLUMN IF NOT EXISTS location_id BIGINT;

-- Добавляем внешний ключ на locations(id), если ещё нет
DO $$
    BEGIN
        IF NOT EXISTS (
            SELECT 1
            FROM information_schema.table_constraints tc
            WHERE tc.table_name = 'batches'
              AND tc.constraint_type = 'FOREIGN KEY'
              AND tc.constraint_name = 'fk_batches_location'
        ) THEN
            ALTER TABLE batches
                ADD CONSTRAINT fk_batches_location
                    FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE SET NULL;
        END IF;
    END $$;

-- Индекс по batches(location_id), если ещё нет
DO $$
    BEGIN
        IF NOT EXISTS (
            SELECT 1
            FROM pg_class c
                     JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE c.relkind = 'i'
              AND c.relname = 'ix_batches_location'
        ) THEN
            CREATE INDEX ix_batches_location ON batches(location_id);
        END IF;
    END $$;
