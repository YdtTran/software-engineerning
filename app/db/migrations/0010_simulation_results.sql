CREATE TABLE simulation_results (
    id TEXT PRIMARY KEY,
    operator_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    snapshot_json TEXT NOT NULL,
    result_json TEXT NOT NULL
);
