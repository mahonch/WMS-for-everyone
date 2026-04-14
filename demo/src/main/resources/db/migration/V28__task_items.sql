-- Позиции задач
CREATE TABLE IF NOT EXISTS task_items (
    id BIGSERIAL PRIMARY KEY,
    task_id BIGINT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    product_id BIGINT NOT NULL REFERENCES products(id),
    location_id BIGINT REFERENCES locations(id),
    qty_planned INT NOT NULL,
    qty_actual INT DEFAULT 0,
    confirmed BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_items_task_id ON task_items(task_id);
CREATE INDEX IF NOT EXISTS idx_task_items_confirmed ON task_items(confirmed);
