-- Pool assignment for existing slots is intentionally left unknown for reconciliation.
ALTER TABLE parking_slots ADD COLUMN pool TEXT CHECK (pool IN ('immediate', 'advance'));
CREATE TABLE parking_commitments (
    reservation_id TEXT PRIMARY KEY,
    slot_id TEXT NOT NULL REFERENCES parking_slots(id),
    pool TEXT NOT NULL CHECK (pool IN ('immediate', 'advance')),
    starts_at TEXT NOT NULL,
    ends_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    occupancy_id TEXT,
    released_at TEXT,
    status TEXT NOT NULL CHECK (status IN ('Reserved', 'Fulfilled', 'Cancelled', 'Expired')),
    CHECK (starts_at < ends_at)
);
CREATE INDEX idx_parking_commitments_slot_interval ON parking_commitments(slot_id, status, starts_at, ends_at);
