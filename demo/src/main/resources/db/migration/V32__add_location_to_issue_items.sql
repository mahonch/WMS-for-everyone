-- Добавляем локацию к позициям списания
ALTER TABLE issue_items ADD COLUMN IF NOT EXISTS location_id BIGINT REFERENCES locations(id);

CREATE INDEX IF NOT EXISTS idx_issue_items_location ON issue_items(location_id);
