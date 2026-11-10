-- Legacy holds without a known owner remain unavailable until reconciled.
ALTER TABLE electric_vehicles ADD COLUMN reservation_id TEXT;
ALTER TABLE electric_vehicles ADD COLUMN trip_id TEXT;
ALTER TABLE electric_vehicles ADD COLUMN transfer_hold_id TEXT REFERENCES transfers(id);
ALTER TABLE parking_slots ADD COLUMN reservation_id TEXT;
ALTER TABLE parking_slots ADD COLUMN transfer_hold_id TEXT REFERENCES transfers(id);
ALTER TABLE parking_slots ADD COLUMN occupancy_id TEXT;

CREATE TEMP TABLE transfer_hold_guard (valid INTEGER CHECK (valid = 1));
INSERT INTO transfer_hold_guard
SELECT NOT EXISTS (
  SELECT 1 FROM transfer_destination_slots d JOIN transfers t ON t.id = d.transfer_id
  WHERE lower(t.status) IN ('planned', 'intransit', 'in_transit')
  GROUP BY d.slot_id HAVING count(*) > 1
);
INSERT INTO transfer_hold_guard
SELECT NOT EXISTS (
  SELECT 1 FROM transfer_vehicles v JOIN transfers t ON t.id = v.transfer_id
  WHERE lower(t.status) IN ('planned', 'intransit', 'in_transit')
  GROUP BY v.vehicle_id HAVING count(*) > 1
);
UPDATE electric_vehicles SET transfer_hold_id = (
  SELECT v.transfer_id FROM transfer_vehicles v JOIN transfers t ON t.id = v.transfer_id
  WHERE v.vehicle_id = electric_vehicles.id AND lower(t.status) IN ('planned', 'intransit', 'in_transit')
) WHERE status IN ('TransferHeld', 'InTransit', 'in_transfer', 'Faulty', 'faulted') AND EXISTS (
  SELECT 1 FROM transfer_vehicles v JOIN transfers t ON t.id = v.transfer_id
  WHERE v.vehicle_id = electric_vehicles.id AND lower(t.status) IN ('planned', 'intransit', 'in_transit')
);
UPDATE parking_slots SET transfer_hold_id = (
  SELECT d.transfer_id FROM transfer_destination_slots d JOIN transfers t ON t.id = d.transfer_id
  WHERE d.slot_id = parking_slots.id AND lower(t.status) IN ('planned', 'intransit', 'in_transit')
) WHERE status IN ('Held', 'held_for_transfer', 'Suspended', 'blocked') AND EXISTS (
  SELECT 1 FROM transfer_destination_slots d JOIN transfers t ON t.id = d.transfer_id
  WHERE d.slot_id = parking_slots.id AND lower(t.status) IN ('planned', 'intransit', 'in_transit')
);
DROP TABLE transfer_hold_guard;
CREATE UNIQUE INDEX idx_vehicle_reservation ON electric_vehicles(reservation_id) WHERE reservation_id IS NOT NULL;
CREATE UNIQUE INDEX idx_vehicle_trip ON electric_vehicles(trip_id) WHERE trip_id IS NOT NULL;
CREATE UNIQUE INDEX idx_slot_reservation ON parking_slots(reservation_id) WHERE reservation_id IS NOT NULL;
CREATE UNIQUE INDEX idx_slot_occupancy ON parking_slots(occupancy_id) WHERE occupancy_id IS NOT NULL;
