-- Добавим уникальный индекс на пару (warehouse_id, code), если его ещё нет.
DO $$
    BEGIN
        IF NOT EXISTS (
            SELECT 1
            FROM pg_class c
                     JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE c.relkind = 'i'
              AND c.relname = 'ux_locations_wh_code'
        ) THEN
            CREATE UNIQUE INDEX ux_locations_wh_code
                ON locations(warehouse_id, code);
        END IF;
    END $$;
