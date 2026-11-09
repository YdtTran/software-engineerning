-- Migration: 0002_operations_schema.sql
-- Description: Add operational states to resources, tables for vehicle transfers (UC10) and incidents (UC11).
-- Conforms to: CLASS_CATALOG.md, API_CONTRACTS.md, and LIFECYCLE_SCENARIOS.md.
-- Supports both canonical PascalCase (API contracts / UML) and lowercase aliases.

-- 1. Extend Resource Tables with Operational Status
ALTER TABLE electric_vehicles ADD COLUMN status TEXT NOT NULL DEFAULT 'Available' CHECK (
    status IN (
        'Available', 'Reserved', 'InUse', 'NeedsCharging', 'Charging', 'TransferHeld', 'InTransit', 'Faulty', 'Maintenance', 'Retired',
        'available', 'reserved', 'in_use', 'in_transfer', 'faulted', 'suspended', 'maintenance'
    )
);
ALTER TABLE electric_vehicles ADD COLUMN owner_id TEXT DEFAULT NULL;

ALTER TABLE parking_slots ADD COLUMN status TEXT NOT NULL DEFAULT 'Available' CHECK (
    status IN (
        'Available', 'Held', 'Occupied', 'Suspended',
        'available', 'reserved', 'occupied', 'held_for_transfer', 'blocked'
    )
);

ALTER TABLE charging_points ADD COLUMN status TEXT NOT NULL DEFAULT 'Available' CHECK (
    status IN (
        'Available', 'Idle', 'Reserved', 'Starting', 'Charging', 'Stopping', 'Complete', 'Fault', 'Repair', 'Retired',
        'available', 'occupied', 'charging', 'faulted', 'maintenance'
    )
);

-- 2. Vehicle Redistribution / Transfers (UC10, UC10A, UC10B)
CREATE TABLE IF NOT EXISTS transfers (
    id TEXT PRIMARY KEY,
    source_hub_id TEXT NOT NULL REFERENCES mobility_hubs(id),
    destination_hub_id TEXT NOT NULL REFERENCES mobility_hubs(id),
    status TEXT NOT NULL CHECK (
        status IN ('Planned', 'InTransit', 'Completed', 'Cancelled', 'planned', 'in_transit', 'completed', 'cancelled')
    ),
    created_at TEXT NOT NULL,
    departed_at TEXT,
    arrived_at TEXT,
    cancelled_at TEXT,
    cancel_reason TEXT,
    created_by TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS transfer_vehicles (
    transfer_id TEXT NOT NULL REFERENCES transfers(id) ON DELETE CASCADE,
    vehicle_id TEXT NOT NULL REFERENCES electric_vehicles(id),
    PRIMARY KEY (transfer_id, vehicle_id)
);

CREATE TABLE IF NOT EXISTS transfer_destination_slots (
    transfer_id TEXT NOT NULL REFERENCES transfers(id) ON DELETE CASCADE,
    slot_id TEXT NOT NULL REFERENCES parking_slots(id),
    PRIMARY KEY (transfer_id, slot_id)
);

-- 3. Operational Incidents & Maintenance (UC11, UC11A)
CREATE TABLE IF NOT EXISTS incidents (
    id TEXT PRIMARY KEY,
    reporter_id TEXT NOT NULL,
    reporter_role TEXT NOT NULL CHECK (reporter_role IN ('user', 'operator', 'system', 'User', 'Operator', 'System')),
    reported_trip_id TEXT,
    resource_kind TEXT NOT NULL CHECK (resource_kind IN ('vehicle', 'slot', 'charging_point', 'Vehicle', 'Slot', 'ChargingPoint')),
    resource_id TEXT NOT NULL,
    description TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('emergency', 'critical', 'standard', 'Emergency', 'Critical', 'Standard')),
    status TEXT NOT NULL CHECK (
        status IN ('Open', 'Investigating', 'Resolved', 'open', 'investigating', 'in_progress', 'resolved', 'closed')
    ),
    reported_at TEXT NOT NULL,
    resolved_at TEXT,
    resolution_notes TEXT,
    reported_location TEXT
);

CREATE TABLE IF NOT EXISTS maintenance_assignments (
    id TEXT PRIMARY KEY,
    incident_id TEXT NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    technician_id TEXT NOT NULL,
    scheduled_at TEXT NOT NULL,
    sla_deadline TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('assigned', 'on_site', 'completed', 'Assigned', 'OnSite', 'Completed'))
);

-- 4. Performance Indexes for Real-time Monitoring (UC08) and Fast Lookups
CREATE INDEX IF NOT EXISTS idx_vehicles_hub_status ON electric_vehicles(hub_id, status);
CREATE INDEX IF NOT EXISTS idx_slots_hub_status ON parking_slots(hub_id, status);
CREATE INDEX IF NOT EXISTS idx_points_hub_status ON charging_points(hub_id, status);
CREATE INDEX IF NOT EXISTS idx_transfers_status ON transfers(status);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_resource ON incidents(resource_id, resource_kind);
