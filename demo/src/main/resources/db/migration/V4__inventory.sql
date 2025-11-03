DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'inventory_status') THEN
CREATE TYPE inventory_status AS ENUM ('OPEN','CLOSED');
END IF;
END $$;


CREATE TABLE inventory_sessions (
                                    id BIGSERIAL PRIMARY KEY,
                                    started_at TIMESTAMP NOT NULL DEFAULT now(),
                                    finished_at TIMESTAMP,
                                    created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
                                    status inventory_status NOT NULL DEFAULT 'OPEN'
);


CREATE TABLE inventory_items (
                                 id BIGSERIAL PRIMARY KEY,
                                 session_id BIGINT NOT NULL REFERENCES inventory_sessions(id) ON DELETE CASCADE,
                                 product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
                                 system_qty INT NOT NULL,
                                 actual_qty INT NOT NULL,
                                 diff_qty INT GENERATED ALWAYS AS (actual_qty - system_qty) STORED
);


-- Корректировки по результатам инвентаризации
CREATE TABLE adjustments (
                             id BIGSERIAL PRIMARY KEY,
                             session_id BIGINT NOT NULL REFERENCES inventory_sessions(id) ON DELETE CASCADE,
                             created_at TIMESTAMP NOT NULL DEFAULT now(),
                             created_by BIGINT REFERENCES users(id) ON DELETE SET NULL
);


CREATE TABLE adjustment_items (
                                  id BIGSERIAL PRIMARY KEY,
                                  adjustment_id BIGINT NOT NULL REFERENCES adjustments(id) ON DELETE CASCADE,
                                  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
                                  batch_id BIGINT REFERENCES batches(id) ON DELETE SET NULL,
                                  qty_delta INT NOT NULL
);