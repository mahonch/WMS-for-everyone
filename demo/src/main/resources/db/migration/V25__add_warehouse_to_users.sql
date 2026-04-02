-- Добавление поля warehouse_id в таблицу users
ALTER TABLE users ADD COLUMN warehouse_id BIGINT;

-- Добавление внешнего ключа на таблицу warehouses
ALTER TABLE users 
    ADD CONSTRAINT fk_users_warehouse 
    FOREIGN KEY (warehouse_id) 
    REFERENCES warehouses(id) 
    ON DELETE SET NULL;

-- Комментарий
COMMENT ON COLUMN users.warehouse_id IS 'Основной склад пользователя';
