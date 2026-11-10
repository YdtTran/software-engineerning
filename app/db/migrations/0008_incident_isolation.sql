-- No historical event is inferred: existing incidents remain unverified.
ALTER TABLE incidents ADD COLUMN isolation_verified_at TEXT;
