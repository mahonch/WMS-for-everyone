-- Добавляем поля для перемещений между складами
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS doc_type VARCHAR(20) DEFAULT 'RECEIPT';
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS from_warehouse_id BIGINT;

-- Добавляем внешний ключ
ALTER TABLE receipts 
    ADD CONSTRAINT fk_receipts_from_warehouse 
    FOREIGN KEY (from_warehouse_id) REFERENCES warehouses(id);

-- Индекс для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_receipts_doc_type ON receipts(doc_type);
CREATE INDEX IF NOT EXISTS idx_receipts_from_warehouse ON receipts(from_warehouse_id);
