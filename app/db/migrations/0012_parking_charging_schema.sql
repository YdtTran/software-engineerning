-- Migration: 0012_parking_charging_schema.sql
-- Description: Parking & Charging module schema (UC06, UC07, UC07A, UC12, FR-NI01, FR-NI04)
-- Plus Hub policy defaults, connector compatibility metadata, and deterministic parking slot pool backfill.

-- 1. Extend existing inventory tables for Hub policies and connector compatibility
ALTER TABLE mobility_hubs ADD COLUMN power_limit_kw REAL NOT NULL DEFAULT 22.0 CHECK (power_limit_kw > 0);
ALTER TABLE mobility_hubs ADD COLUMN immediate_hold_ttl_minutes INTEGER NOT NULL DEFAULT 15 CHECK (immediate_hold_ttl_minutes > 0);
ALTER TABLE mobility_hubs ADD COLUMN late_arrival_grace_minutes INTEGER NOT NULL DEFAULT 15 CHECK (late_arrival_grace_minutes >= 0);
ALTER TABLE mobility_hubs ADD COLUMN overstay_grace_minutes INTEGER NOT NULL DEFAULT 15 CHECK (overstay_grace_minutes >= 0);
ALTER TABLE mobility_hubs ADD COLUMN overstay_rate_per_hour REAL NOT NULL DEFAULT 20000 CHECK (overstay_rate_per_hour >= 0);

ALTER TABLE electric_vehicles ADD COLUMN connector_type TEXT NOT NULL DEFAULT 'type2';
ALTER TABLE charging_points ADD COLUMN connector_type TEXT NOT NULL DEFAULT 'type2';
ALTER TABLE charging_points ADD COLUMN rated_power_kw REAL NOT NULL DEFAULT 7.4 CHECK (rated_power_kw > 0);

-- Deterministically assign pool ('immediate' / 'advance') for legacy/seeded slots missing a pool.
-- For each hub ordered by slot code, the first ceil(total/2) slots become 'immediate' and the rest 'advance'.
UPDATE parking_slots
SET pool = CASE
    WHEN (
        SELECT count(*)
        FROM parking_slots p2
        WHERE p2.hub_id = parking_slots.hub_id AND p2.code < parking_slots.code
    ) < (
        (SELECT count(*) FROM parking_slots p3 WHERE p3.hub_id = parking_slots.hub_id) + 1
    ) / 2
    THEN 'immediate'
    ELSE 'advance'
END
WHERE pool IS NULL;

-- 2. Parking Reservations, Occupancies, and LIM-01 Conflicts (UC06)
CREATE TABLE IF NOT EXISTS parking_reservations (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    vehicle_id TEXT NOT NULL REFERENCES electric_vehicles(id),
    hub_id TEXT NOT NULL REFERENCES mobility_hubs(id),
    slot_id TEXT NOT NULL REFERENCES parking_slots(id),
    pool TEXT NOT NULL CHECK (pool IN ('immediate', 'advance')),
    ticket_code TEXT NOT NULL UNIQUE,
    planned_arrival TEXT,
    planned_checkout TEXT,
    expires_at TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('Reserved', 'Fulfilled', 'Cancelled', 'Expired')),
    assisted_by TEXT,
    replaces_reservation_id TEXT REFERENCES parking_reservations(id),
    created_at TEXT NOT NULL,
    cancelled_at TEXT
);

CREATE TABLE IF NOT EXISTS parking_occupancies (
    id TEXT PRIMARY KEY,
    reservation_id TEXT NOT NULL UNIQUE REFERENCES parking_reservations(id),
    user_id TEXT NOT NULL,
    vehicle_id TEXT NOT NULL REFERENCES electric_vehicles(id),
    hub_id TEXT NOT NULL REFERENCES mobility_hubs(id),
    slot_id TEXT NOT NULL REFERENCES parking_slots(id),
    actual_checkin_at TEXT NOT NULL,
    scheduled_checkout_at TEXT,
    actual_checkout_at TEXT,
    final_fee REAL,
    assisted_by TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS parking_conflicts (
    id TEXT PRIMARY KEY,
    blocked_reservation_id TEXT NOT NULL REFERENCES parking_reservations(id),
    blocking_occupancy_id TEXT,
    hub_id TEXT NOT NULL REFERENCES mobility_hubs(id),
    slot_id TEXT NOT NULL REFERENCES parking_slots(id),
    replacement_reservation_id TEXT REFERENCES parking_reservations(id),
    incident_id TEXT,
    status TEXT NOT NULL CHECK (status IN ('Open', 'Resolved')),
    created_at TEXT NOT NULL,
    resolved_at TEXT
);

-- 3. Charging Requests, Allocations, Sessions, and Durable Device Commands (UC07, UC07A, UC12)
CREATE TABLE IF NOT EXISTS charging_requests (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    vehicle_id TEXT NOT NULL REFERENCES electric_vehicles(id),
    occupancy_id TEXT REFERENCES parking_occupancies(id),
    hub_id TEXT NOT NULL REFERENCES mobility_hubs(id),
    battery_at_request INTEGER NOT NULL CHECK (battery_at_request BETWEEN 0 AND 100),
    target_battery_percent INTEGER NOT NULL CHECK (target_battery_percent BETWEEN 0 AND 100),
    needed_by TEXT NOT NULL,
    requested_start TEXT,
    manual_priority_rank INTEGER,
    status TEXT NOT NULL CHECK (status IN ('Queued', 'Charging', 'Completed', 'Cancelled')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    CHECK (target_battery_percent > battery_at_request)
);

CREATE TABLE IF NOT EXISTS charging_allocations (
    allocation_id TEXT PRIMARY KEY,
    point_id TEXT NOT NULL REFERENCES charging_points(id),
    request_id TEXT NOT NULL REFERENCES charging_requests(id),
    hub_id TEXT NOT NULL REFERENCES mobility_hubs(id),
    start_at TEXT NOT NULL,
    end_at TEXT NOT NULL,
    allocated_power_kw REAL NOT NULL CHECK (allocated_power_kw >= 0),
    reserved_power_kw REAL NOT NULL CHECK (reserved_power_kw >= 0),
    state TEXT NOT NULL CHECK (state IN ('Reserved', 'Starting', 'Charging', 'Stopping', 'Complete', 'FaultUncertain')),
    created_at TEXT NOT NULL,
    released_at TEXT,
    CHECK (start_at < end_at)
);

CREATE TABLE IF NOT EXISTS charging_sessions (
    id TEXT PRIMARY KEY,
    request_id TEXT NOT NULL REFERENCES charging_requests(id),
    allocation_id TEXT NOT NULL REFERENCES charging_allocations(allocation_id),
    point_id TEXT NOT NULL REFERENCES charging_points(id),
    started_at TEXT NOT NULL,
    stopped_at TEXT,
    allocated_power_kw REAL NOT NULL CHECK (allocated_power_kw > 0),
    status TEXT NOT NULL CHECK (status IN ('Active', 'Completed', 'Interrupted')),
    stop_reason TEXT CHECK (stop_reason IS NULL OR stop_reason IN ('UserStop', 'TargetReached', 'PriorityYield', 'TechnicalFault'))
);

CREATE TABLE IF NOT EXISTS device_commands (
    command_id TEXT PRIMARY KEY,
    target_kind TEXT NOT NULL CHECK (target_kind IN ('charging_point', 'parking_slot')),
    target_id TEXT NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('power_on', 'power_off', 'unplug', 'safety_check', 'verify_arrival', 'verify_departure')),
    reference_id TEXT NOT NULL,
    attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count BETWEEN 0 AND 3),
    status TEXT NOT NULL CHECK (status IN ('Pending', 'Acked', 'Failed')),
    last_error TEXT,
    consumed_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- 4. Uniqueness & Lookup Indexes
CREATE INDEX IF NOT EXISTS idx_parking_reservations_status_exp ON parking_reservations(status, expires_at);
CREATE INDEX IF NOT EXISTS idx_parking_reservations_vehicle ON parking_reservations(vehicle_id, status);
CREATE INDEX IF NOT EXISTS idx_parking_occupancies_active ON parking_occupancies(slot_id, actual_checkout_at);
CREATE INDEX IF NOT EXISTS idx_parking_conflicts_blocked ON parking_conflicts(blocked_reservation_id, status);

CREATE INDEX IF NOT EXISTS idx_charging_requests_hub_status ON charging_requests(hub_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_active_allocation_point ON charging_allocations(point_id) WHERE released_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_active_allocation_request ON charging_allocations(request_id) WHERE released_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_charging_allocations_hub_state ON charging_allocations(hub_id, state) WHERE released_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_active_session_point ON charging_sessions(point_id) WHERE status = 'Active';
CREATE UNIQUE INDEX IF NOT EXISTS idx_active_session_request ON charging_sessions(request_id) WHERE status = 'Active';
CREATE INDEX IF NOT EXISTS idx_device_commands_target_action ON device_commands(target_kind, target_id, action, status);

PRAGMA user_version = 12;
