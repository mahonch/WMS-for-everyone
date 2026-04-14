-- ============================================
-- СХЕМА БАЗЫ ДАННЫХ WMS
-- ============================================

-- ВСЕ ТАБЛИЦЫ
\echo '=== ТАБЛИЦЫ ==='
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- СТРУКТУРА ТАБЛИЦ
\echo '=== СТРУКТУРА ТАБЛИЦ ==='
SELECT 
    table_name AS "Таблица",
    column_name AS "Колонка",
    data_type AS "Тип",
    is_nullable AS "NULL?"
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name NOT LIKE 'flyway%'
ORDER BY table_name, ordinal_position;

-- ВНЕШНИЕ КЛЮЧИ
\echo '=== ВНЕШНИЕ КЛЮЧИ ==='
SELECT
    tc.table_name AS "Таблица",
    kcu.column_name AS "Колонка",
    ccu.table_name AS "Ссылка на",
    ccu.column_name AS "Колонка ссылки"
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name;

-- КОЛИЧЕСТВО ЗАПИСЕЙ В ТАБЛИЦАХ
\echo '=== КОЛИЧЕСТВО ЗАПИСЕЙ ==='
SELECT 
    relname AS "Таблица",
    n_live_tup AS "Записей"
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY relname;
