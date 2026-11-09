#!/bin/sh
set -eu

script_dir=$(CDPATH='' cd -- "$(dirname -- "$0")" && pwd)
database=${1:-"$script_dir/.local/hub.sqlite"}
case "$database" in
    /*) database_file=$database ;;
    *) database_file=./$database ;;
esac

mkdir -p -- "$(dirname -- "$database_file")"
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
        ;;
    1)
        ops_sql=$(cat "$script_dir/migrations/0002_operations_schema.sql")
        sqlite3 -batch -bail -cmd '.timeout 5000' "$database_file" <<SQL
PRAGMA foreign_keys = ON;
BEGIN IMMEDIATE;
$ops_sql
PRAGMA user_version = 2;
COMMIT;
SQL
        ;;
    2) ;;
    *)
        printf 'Unsupported database version %s in %s\n' "$version" "$database" >&2
        exit 1
        ;;
esac

printf '%s\n' "$database"
