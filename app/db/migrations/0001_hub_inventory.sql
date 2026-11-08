CREATE TABLE mobility_hubs (
    id TEXT NOT NULL PRIMARY KEY,
    name TEXT NOT NULL
);

CREATE TABLE electric_vehicles (
    id TEXT NOT NULL PRIMARY KEY,
    hub_id TEXT NOT NULL REFERENCES mobility_hubs(id),
    vehicle_type TEXT NOT NULL CHECK (vehicle_type IN ('electric_bicycle', 'electric_motorbike')),
    battery_percent INTEGER NOT NULL CHECK (
        typeof(battery_percent) = 'integer' AND battery_percent BETWEEN 0 AND 100
    )
);

CREATE TABLE parking_slots (
    id TEXT NOT NULL PRIMARY KEY,
    hub_id TEXT NOT NULL REFERENCES mobility_hubs(id),
    code TEXT NOT NULL,
    UNIQUE (hub_id, code)
);

CREATE TABLE charging_points (
    id TEXT NOT NULL PRIMARY KEY,
    hub_id TEXT NOT NULL REFERENCES mobility_hubs(id),
    code TEXT NOT NULL,
    UNIQUE (hub_id, code)
);
