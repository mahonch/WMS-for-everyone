-- Добавляем колонку active и приводим данные
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS active boolean;

-- проставим true для существующих записей, где NULL
UPDATE users SET active = true WHERE active IS NULL;

-- сделаем ограничение NOT NULL и дефолт
ALTER TABLE users
    ALTER COLUMN active SET NOT NULL,
    ALTER COLUMN active SET DEFAULT true;
