-- Типы документа
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'doc_status') THEN
        CREATE TYPE doc_status AS ENUM ('DRAFT','COMMITTED');
    END IF;
END $$;

-- Партии
CREATE TABLE batches (
                         id BIGSERIAL PRIMARY KEY,
                         product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
                         supplier_id BIGINT REFERENCES suppliers(id) ON DELETE SET NULL,
                         received_at TIMESTAMP NOT NULL DEFAULT now(),
                         buy_price NUMERIC(12,2) NOT NULL DEFAULT 0,
                         quantity INT NOT NULL CHECK (quantity >= 0),
                         available_qty INT NOT NULL CHECK (available_qty >= 0),
                         expiry_date DATE
);

-- Приёмка
CREATE TABLE receipts (
                          id BIGSERIAL PRIMARY KEY,
                          number TEXT NOT NULL UNIQUE,
                          created_at TIMESTAMP NOT NULL DEFAULT now(),
                          created_by BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
                          supplier_id BIGINT REFERENCES suppliers(id) ON DELETE SET NULL,
                          total_sum NUMERIC(14,2) NOT NULL DEFAULT 0,
                          status doc_status NOT NULL DEFAULT 'DRAFT'
);

CREATE TABLE receipt_items (
                               id BIGSERIAL PRIMARY KEY,
                               receipt_id BIGINT NOT NULL REFERENCES receipts(id) ON DELETE CASCADE,
                               product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
                               batch_id BIGINT REFERENCES batches(id) ON DELETE SET NULL,
                               qty INT NOT NULL CHECK (qty > 0),
                               price NUMERIC(12,2) NOT NULL CHECK (price >= 0)
);

-- Выдача/списание
CREATE TABLE issues (
                        id BIGSERIAL PRIMARY KEY,
                        number TEXT NOT NULL UNIQUE,
                        created_at TIMESTAMP NOT NULL DEFAULT now(),
                        created_by BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
                        reason TEXT,
                        status doc_status NOT NULL DEFAULT 'DRAFT'
);

CREATE TABLE issue_items (
                             id BIGSERIAL PRIMARY KEY,
                             issue_id BIGINT NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
                             product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
                             batch_id BIGINT REFERENCES batches(id) ON DELETE SET NULL,
                             qty INT NOT NULL CHECK (qty > 0),
                             cost_price NUMERIC(12,2) NOT NULL DEFAULT 0
);
