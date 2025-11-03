-- Расширения
CREATE EXTENSION IF NOT EXISTS pg_trgm;


-- Роли/пользователи
CREATE TABLE roles (
                       id BIGSERIAL PRIMARY KEY,
                       code TEXT UNIQUE NOT NULL,
                       name TEXT NOT NULL
);


CREATE TABLE users (
                       id BIGSERIAL PRIMARY KEY,
                       username TEXT UNIQUE NOT NULL,
                       email TEXT UNIQUE,
                       password_hash TEXT NOT NULL,
                       status TEXT NOT NULL DEFAULT 'ACTIVE',
                       created_at TIMESTAMP NOT NULL DEFAULT now()
);


CREATE TABLE user_roles (
                            user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                            role_id BIGINT NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
                            PRIMARY KEY (user_id, role_id)
);


-- Базовые роли
INSERT INTO roles(code, name) VALUES
                                  ('ADMIN','Администратор'),
                                  ('STOREKEEPER','Кладовщик'),
                                  ('MANAGER','Менеджер'),
                                  ('GUEST','Гость');