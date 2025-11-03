DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'location_type') THEN
CREATE TYPE location_type AS ENUM ('ZONE','RACK','SHELF','BIN');
END IF;
END $$;


CREATE TABLE warehouses (
                            id BIGSERIAL PRIMARY KEY,
                            name TEXT NOT NULL,
                            code TEXT UNIQUE,
                            address TEXT,
                            is_active BOOLEAN NOT NULL DEFAULT TRUE
);


CREATE TABLE locations (
                           id BIGSERIAL PRIMARY KEY,
                           warehouse_id BIGINT NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
                           code TEXT NOT NULL,
                           name TEXT,
                           parent_id BIGINT REFERENCES locations(id) ON DELETE SET NULL,
                           type location_type NOT NULL DEFAULT 'BIN'
);


-- Остатки по локациям и партиям (партийность опциональна)
CREATE TABLE stock (
                       product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
                       location_id BIGINT NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
                       batch_id BIGINT REFERENCES batches(id) ON DELETE SET NULL,
                       qty INT NOT NULL DEFAULT 0,
                       PRIMARY KEY(product_id, location_id, batch_id)
);


-- Перемещения
CREATE TABLE transfers (
                           id BIGSERIAL PRIMARY KEY,
                           number TEXT NOT NULL UNIQUE,
                           created_at TIMESTAMP NOT NULL DEFAULT now(),
                           created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
                           from_location_id BIGINT REFERENCES locations(id) ON DELETE SET NULL,
                           to_location_id BIGINT NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
                           status doc_status NOT NULL DEFAULT 'DRAFT'
);


CREATE TABLE transfer_items (
                                id BIGSERIAL PRIMARY KEY,
                                transfer_id BIGINT NOT NULL REFERENCES transfers(id) ON DELETE CASCADE,
                                product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
                                batch_id BIGINT REFERENCES batches(id) ON DELETE SET NULL,
                                qty INT NOT NULL CHECK (qty > 0)
);


-- Представления для отчётов
CREATE MATERIALIZED VIEW mv_stock_by_product AS
SELECT p.id AS product_id,
       SUM(s.qty) AS qty
FROM products p
         LEFT JOIN stock s ON s.product_id = p.id
GROUP BY p.id;


CREATE INDEX ON mv_stock_by_product(product_id);