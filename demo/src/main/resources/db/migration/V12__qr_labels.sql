CREATE TABLE qr_labels (
                           id BIGSERIAL PRIMARY KEY,
                           entity_type TEXT NOT NULL CHECK (entity_type IN ('LOCATION','BATCH','PRODUCT')),
                           entity_id BIGINT NOT NULL,
                           payload TEXT NOT NULL,                     -- что кодируем в QR (обычно короткий токен)
                           created_at TIMESTAMP NOT NULL DEFAULT now(),
                           UNIQUE(entity_type, entity_id),
                           UNIQUE(payload)
);

-- удобные индексы
CREATE INDEX IF NOT EXISTS ix_qr_payload ON qr_labels(payload);
CREATE INDEX IF NOT EXISTS ix_qr_entity ON qr_labels(entity_type, entity_id);
