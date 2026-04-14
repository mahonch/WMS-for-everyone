-- Добавляем ячейку отгрузки и флаг подтверждения в задачи
ALTER TABLE tasks
    ADD COLUMN shipment_location_id BIGINT NULL,
    ADD COLUMN shipment_confirmed BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE tasks
    ADD CONSTRAINT fk_tasks_shipment_location
    FOREIGN KEY (shipment_location_id) REFERENCES locations(id);
