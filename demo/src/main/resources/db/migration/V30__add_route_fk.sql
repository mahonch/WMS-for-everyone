-- Добавление FK для route_id в tasks
ALTER TABLE tasks ADD CONSTRAINT fk_tasks_route_id FOREIGN KEY (route_id) REFERENCES routes(id);

-- Расширение LocationType: добавляем SHIPMENT (уже есть в enum, но убедимся)
-- LocationType: STORAGE, PICKING, RECEIPT, SHIPMENT, BIN
