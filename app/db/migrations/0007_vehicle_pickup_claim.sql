-- Existing reserved vehicles have unknown expiry and require reconciliation.
ALTER TABLE electric_vehicles ADD COLUMN reservation_expires_at TEXT;
ALTER TABLE electric_vehicles ADD COLUMN pickup_claimed INTEGER NOT NULL DEFAULT 0 CHECK (pickup_claimed IN (0, 1));
