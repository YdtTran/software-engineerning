#!/bin/sh
set -eu

script_dir=$(CDPATH='' cd -- "$(dirname -- "$0")" && pwd)
database=${1:-"$script_dir/.local/hub.sqlite"}
case "$database" in
    /*) database_file=$database ;;
    *) database_file=./$database ;;
esac

mkdir -p -- "$(dirname -- "$database_file")"

if ! command -v sqlite3 >/dev/null 2>&1; then
    exec node "$script_dir/initialize.js" "$@"
fi

version=$(sqlite3 -batch -bail "$database_file" 'PRAGMA user_version;')

case "$version" in
    0)
        inventory_sql=$(cat "$script_dir/migrations/0001_hub_inventory.sql" "$script_dir/seed.sql")
        sqlite3 -batch -bail -cmd '.timeout 5000' "$database_file" <<SQL
PRAGMA foreign_keys = ON;
BEGIN IMMEDIATE;
CREATE TEMP TABLE initialization_guard (
    empty_database INTEGER CONSTRAINT expected_empty_database CHECK (empty_database = 1)
);
INSERT INTO initialization_guard
SELECT NOT EXISTS (SELECT 1 FROM main.sqlite_schema)
       AND user_version = 0
FROM pragma_user_version;
$inventory_sql
PRAGMA user_version = 1;
COMMIT;
SQL
        version=1
        ;;
    1|2|3|4|5|6|7|8|9|10|11) ;;
    *)
        printf 'Unsupported database version %s in %s\n' "$version" "$database" >&2
        exit 1
        ;;
esac

case "$version" in
    1)
        ops_sql=$(cat "$script_dir/migrations/0002_operations_schema.sql")
        sqlite3 -batch -bail -cmd '.timeout 5000' "$database_file" <<SQL
PRAGMA foreign_keys = ON;
BEGIN IMMEDIATE;
$ops_sql
PRAGMA user_version = 2;
COMMIT;
SQL
        version=2
        ;;
    2|3|4|5|6|7|8|9|10|11) ;;
    *)
        printf 'Unsupported database version %s in %s\n' "$version" "$database" >&2
        exit 1
        ;;
esac

case "$version" in
    2)
        idempotency_sql=$(cat "$script_dir/migrations/0003_idempotency.sql")
        sqlite3 -batch -bail -cmd '.timeout 5000' "$database_file" <<SQL
PRAGMA foreign_keys = ON;
BEGIN IMMEDIATE;
$idempotency_sql
PRAGMA user_version = 3;
COMMIT;
SQL
        version=3
        ;;
    3|4|5|6|7|8|9|10|11) ;;
esac

case "$version" in
    3)
        ownership_sql=$(cat "$script_dir/migrations/0004_inventory_ownership.sql")
        sqlite3 -batch -bail -cmd '.timeout 5000' "$database_file" <<SQL
PRAGMA foreign_keys = ON;
BEGIN IMMEDIATE;
$ownership_sql
PRAGMA user_version = 4;
COMMIT;
SQL
        version=4
        ;;
    4|5|6|7|8|9|10|11) ;;
esac

case "$version" in
    4)
        parking_sql=$(cat "$script_dir/migrations/0005_parked_vehicle.sql")
        sqlite3 -batch -bail -cmd '.timeout 5000' "$database_file" <<SQL
PRAGMA foreign_keys = ON;
BEGIN IMMEDIATE;
$parking_sql
PRAGMA user_version = 5;
COMMIT;
SQL
        version=5
        ;;
    5|6|7|8|9|10|11) ;;
esac

case "$version" in
    5)
        commitment_sql=$(cat "$script_dir/migrations/0006_parking_commitments.sql")
        sqlite3 -batch -bail -cmd '.timeout 5000' "$database_file" <<SQL
PRAGMA foreign_keys = ON;
BEGIN IMMEDIATE;
$commitment_sql
PRAGMA user_version = 6;
COMMIT;
SQL
        version=6
        ;;
    6|7|8|9|10|11) ;;
esac

case "$version" in
    6)
        pickup_sql=$(cat "$script_dir/migrations/0007_vehicle_pickup_claim.sql")
        sqlite3 -batch -bail -cmd '.timeout 5000' "$database_file" <<SQL
PRAGMA foreign_keys = ON;
BEGIN IMMEDIATE;
$pickup_sql
PRAGMA user_version = 7;
COMMIT;
SQL
        version=7
        ;;
    7|8|9|10|11) ;;
esac

case "$version" in
    7)
        isolation_sql=$(cat "$script_dir/migrations/0008_incident_isolation.sql")
        sqlite3 -batch -bail -cmd '.timeout 5000' "$database_file" <<SQL
PRAGMA foreign_keys = ON;
BEGIN IMMEDIATE;
$isolation_sql
PRAGMA user_version = 8;
COMMIT;
SQL
        version=8
        ;;
    8|9|10|11) ;;
esac

case "$version" in
    8)
        slot_assignment_sql=$(cat "$script_dir/migrations/0009_transfer_slot_assignment.sql")
        sqlite3 -batch -bail -cmd '.timeout 5000' "$database_file" <<SQL
PRAGMA foreign_keys = ON;
BEGIN IMMEDIATE;
$slot_assignment_sql
PRAGMA user_version = 9;
COMMIT;
SQL
        version=9
        ;;
    9|10|11) ;;
esac

case "$version" in
    9)
        mobility_sql=$(cat "$script_dir/migrations/0010_mobility_lifecycle.sql")
        sqlite3 -batch -bail -cmd '.timeout 5000' "$database_file" <<SQL
PRAGMA foreign_keys = ON;
BEGIN IMMEDIATE;
$mobility_sql
PRAGMA user_version = 10;
COMMIT;
SQL
        version=10
        ;;
    10|11) ;;
esac

case "$version" in
    10)
        sim_sql=$(cat "$script_dir/migrations/0011_simulation_results.sql")
        sqlite3 -batch -bail -cmd '.timeout 5000' "$database_file" <<SQL
PRAGMA foreign_keys = ON;
BEGIN IMMEDIATE;
$sim_sql
PRAGMA user_version = 11;
COMMIT;
SQL
        version=11
        ;;
    11) ;;
esac

printf '%s\n' "$database"
