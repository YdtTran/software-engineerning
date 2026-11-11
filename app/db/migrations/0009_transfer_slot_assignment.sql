-- Migration: 0009_transfer_slot_assignment.sql
-- Description: Add explicit persistent vehicle-to-slot assignment and ordering to transfers.
-- Conforms to: UC10, UC10A, LIFECYCLE_SCENARIOS.md, and PR #9 post-merge audit.

ALTER TABLE transfer_vehicles ADD COLUMN vehicle_order INTEGER;
ALTER TABLE transfer_destination_slots ADD COLUMN slot_order INTEGER;
ALTER TABLE transfer_destination_slots ADD COLUMN assigned_vehicle_id TEXT REFERENCES electric_vehicles(id);

-- Backfill deterministic ordering for existing transfers based on insertion rowid
UPDATE transfer_vehicles
SET vehicle_order = (
    SELECT COUNT(*) FROM transfer_vehicles tv2
    WHERE tv2.transfer_id = transfer_vehicles.transfer_id AND tv2.rowid <= transfer_vehicles.rowid
) - 1
WHERE vehicle_order IS NULL;

UPDATE transfer_destination_slots
SET slot_order = (
    SELECT COUNT(*) FROM transfer_destination_slots tds2
    WHERE tds2.transfer_id = transfer_destination_slots.transfer_id AND tds2.rowid <= transfer_destination_slots.rowid
) - 1
WHERE slot_order IS NULL;

-- Backfill explicitly known vehicle-to-slot assignments from actual physical parking records.
-- Never silently infer uncertain historical associations as verified facts for ambiguous legacy records.
UPDATE transfer_destination_slots
SET assigned_vehicle_id = (
    SELECT ps.parked_vehicle_id
    FROM parking_slots ps
    WHERE ps.occupancy_id = 'transfer:' || transfer_destination_slots.transfer_id || ':' || transfer_destination_slots.slot_id
      AND ps.parked_vehicle_id IN (
          SELECT tv.vehicle_id FROM transfer_vehicles tv WHERE tv.transfer_id = transfer_destination_slots.transfer_id
      )
)
WHERE assigned_vehicle_id IS NULL;
