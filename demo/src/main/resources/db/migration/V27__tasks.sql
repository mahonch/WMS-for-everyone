-- Таблица задач для кладовщиков и сборщиков
CREATE TABLE IF NOT EXISTS tasks (
    id BIGSERIAL PRIMARY KEY,
    number VARCHAR(50) NOT NULL UNIQUE, -- TASK-2026-0001
    type VARCHAR(20) NOT NULL, -- RECEIPT, PICKING, TRANSFER, INVENTORY
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- PENDING, ASSIGNED, IN_PROGRESS, COMPLETED, CANCELLED
    warehouse_id BIGINT NOT NULL REFERENCES warehouses(id),
    assignee_id BIGINT REFERENCES users(id),
    created_by BIGINT NOT NULL REFERENCES users(id),
    related_receipt_id BIGINT REFERENCES receipts(id),
    related_issue_id BIGINT REFERENCES issues(id),
    route_id BIGINT,
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    assigned_at TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_type ON tasks(type);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_warehouse ON tasks(warehouse_id);
