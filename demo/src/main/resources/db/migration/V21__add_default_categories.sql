-- Добавление категорий по умолчанию
INSERT INTO categories (name, parent_id) VALUES 
    ('Электроника', NULL),
    ('Бытовая техника', NULL),
    ('Продукты', NULL),
    ('Хозтовары', NULL),
    ('Строительство', NULL),
    ('Одежда', NULL),
    ('Автозапчасти', NULL),
    ('Канцтовары', NULL),
    ('Игрушки', NULL),
    ('Спорт', NULL)
ON CONFLICT DO NOTHING;
