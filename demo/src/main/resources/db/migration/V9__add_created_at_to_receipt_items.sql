-- Добавляем колонку для @CreationTimestamp в ReceiptItem
ALTER TABLE receipt_items
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT now();
