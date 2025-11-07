-- 1) Добавляем колонку (если уже есть — ничего не делаем)
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS password varchar(255);

-- 2) Заполняем пустые значения, чтобы дальше можно было поставить NOT NULL
UPDATE users SET password = '' WHERE password IS NULL;

-- 3) Делаем NOT NULL и дефолт (для совместимости с insert’ами без пароля — на время разработки)
ALTER TABLE users
    ALTER COLUMN password SET NOT NULL,
    ALTER COLUMN password SET DEFAULT '';
