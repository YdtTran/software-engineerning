CREATE TABLE vehicle_reservations (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    vehicle_id TEXT NOT NULL REFERENCES electric_vehicles(id),
    hub_id TEXT NOT NULL REFERENCES mobility_hubs(id),
    status TEXT NOT NULL CHECK (status IN ('Reserved', 'PickupClaimed', 'PickupUncertain', 'Fulfilled', 'Cancelled', 'Expired')),
    ticket_code TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    trip_id TEXT UNIQUE
);
CREATE INDEX vehicle_reservations_expiry ON vehicle_reservations(status, expires_at);

CREATE TABLE mobility_trips (
    id TEXT PRIMARY KEY,
    reservation_id TEXT NOT NULL UNIQUE REFERENCES vehicle_reservations(id),
    user_id TEXT NOT NULL,
    vehicle_id TEXT NOT NULL REFERENCES electric_vehicles(id),
    status TEXT NOT NULL CHECK (status IN ('Active', 'Completed')),
    started_at TEXT NOT NULL,
    ended_at TEXT,
    destination_hub_id TEXT REFERENCES mobility_hubs(id),
    destination_slot_id TEXT REFERENCES parking_slots(id),
    final_battery_percent INTEGER CHECK (final_battery_percent BETWEEN 0 AND 100),
    distance REAL CHECK (distance >= 0),
    CHECK ((status = 'Active' AND ended_at IS NULL) OR (status = 'Completed' AND ended_at IS NOT NULL))
);
CREATE UNIQUE INDEX mobility_active_vehicle ON mobility_trips(vehicle_id) WHERE status = 'Active';

CREATE TABLE mobility_outcomes (
    scope TEXT PRIMARY KEY,
    payload_hash TEXT NOT NULL,
    status_code INTEGER NOT NULL,
    response_json TEXT NOT NULL
);

CREATE TABLE mobility_commands (
    id TEXT PRIMARY KEY,
    scope TEXT NOT NULL UNIQUE,
    payload_hash TEXT NOT NULL,
    kind TEXT NOT NULL CHECK (kind IN ('pickup', 'return')),
    aggregate_id TEXT NOT NULL,
    request_json TEXT NOT NULL,
    trip_id TEXT NOT NULL,
    state TEXT NOT NULL CHECK (state IN ('Pending', 'Confirmed', 'Uncertain', 'Completed')),
    attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 3),
    lease_token TEXT,
    lease_until INTEGER NOT NULL DEFAULT 0,
    evidence_json TEXT
);
CREATE UNIQUE INDEX mobility_pending_command ON mobility_commands(kind, aggregate_id) WHERE state <> 'Completed';

CREATE TABLE mobility_events (
    id TEXT PRIMARY KEY,
    kind TEXT NOT NULL,
    record_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    payload_json TEXT NOT NULL
);
