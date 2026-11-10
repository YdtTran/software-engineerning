-- Existing occupied slots have no reliable vehicle mapping and remain unchanged.
ALTER TABLE parking_slots ADD COLUMN parked_vehicle_id TEXT REFERENCES electric_vehicles(id);
CREATE UNIQUE INDEX idx_slot_parked_vehicle ON parking_slots(parked_vehicle_id) WHERE parked_vehicle_id IS NOT NULL;
