-- Справочники поставщиков, категорий и товаров
CREATE TABLE suppliers (
                           id BIGSERIAL PRIMARY KEY,
                           name TEXT NOT NULL,
                           inn TEXT,
                           phone TEXT,
                           email TEXT,
                           address TEXT
);


CREATE TABLE categories (
                            id BIGSERIAL PRIMARY KEY,
                            name TEXT NOT NULL,
                            parent_id BIGINT REFERENCES categories(id) ON DELETE SET NULL
);


CREATE TABLE products (
                          id BIGSERIAL PRIMARY KEY,
                          sku TEXT NOT NULL UNIQUE,
                          name TEXT NOT NULL,
                          barcode TEXT UNIQUE,
                          category_id BIGINT REFERENCES categories(id) ON DELETE SET NULL,
                          unit TEXT NOT NULL DEFAULT 'pcs',
                          min_stock INT NOT NULL DEFAULT 0 CHECK (min_stock >= 0),
                          cost_price NUMERIC(12,2) NOT NULL DEFAULT 0,
                          image_url TEXT,
                          is_active BOOLEAN NOT NULL DEFAULT TRUE
);


-- Поиск
CREATE INDEX IF NOT EXISTS idx_products_name_trgm ON products USING gin (name gin_trgm_ops);