CREATE TABLE audit_log (
                           id BIGSERIAL PRIMARY KEY,
                           actor_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
                           action TEXT NOT NULL,
                           entity TEXT NOT NULL,
                           entity_id BIGINT,
                           before_json JSONB,
                           after_json JSONB,
                           ts TIMESTAMP NOT NULL DEFAULT now()
);


CREATE INDEX IF NOT EXISTS idx_audit_entity_ts ON audit_log(entity, ts DESC);