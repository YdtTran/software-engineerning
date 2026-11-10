CREATE TABLE idempotency_outcomes (
    scope TEXT PRIMARY KEY,
    payload_hash TEXT NOT NULL,
    status_code INTEGER NOT NULL,
    response_body TEXT NOT NULL,
    expires_at INTEGER NOT NULL
);
CREATE INDEX idempotency_outcomes_expiry ON idempotency_outcomes(expires_at);
