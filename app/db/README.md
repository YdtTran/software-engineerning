# Local SQLite demo inventory

Install the `sqlite3` command-line tool and run these commands from the repository root.

```sh
./app/db/init.sh
sqlite3 app/db/.local/hub.sqlite 'PRAGMA quick_check;'
```

The initializer seeds four hubs, 62 electric vehicles, 39 parking slots, and nine charging points into an empty database. Repeat runs preserve local edits and deletions. Pass a database path as the first argument to create an isolated copy. The default database directory is ignored by Git.

`npm run db:init --prefix app` calls the same initializer; `init.sh` provides POSIX shell support with fallback to Node. Migrations run in numbered order with a separate transaction per step. Failed steps roll back without advancing `user_version`. Nonempty unversioned databases and future versions are rejected. Version 12 includes upstream incident-isolation verification (0008), persistent transfer slot assignment (0009), Mobility lifecycle (0010), simulation persistence (0011), and Parking & Charging schema + pool backfill (0012).

Earlier published Minh branch commits independently used version 8 for Mobility and 9 for Simulation. The initializer recognizes those complete schemas, applies the missing upstream isolation column and transfer slot assignments without inventing historical verification, and aligns their versions without recreating their tables. Tests preserve active trips, reservation codes, idempotency outcomes and saved simulation results. Other incomplete/unknown legacy schemas require reconciliation.

Query inventory counts per hub with SQLite.

```sql
SELECT h.name,
       (SELECT COUNT(*) FROM electric_vehicles WHERE hub_id = h.id) AS vehicles,
       (SELECT COUNT(*) FROM parking_slots WHERE hub_id = h.id) AS parking_slots,
       (SELECT COUNT(*) FROM charging_points WHERE hub_id = h.id) AS charging_points
FROM mobility_hubs AS h
ORDER BY h.name;
```

The [seed](seed.sql) contains fixed demo inventory counts. When opening a separate SQLite connection to edit the inventory, run `PRAGMA foreign_keys = ON;` before making changes. The initializer tracks the applied [migration](migrations/README.md) with SQLite's `user_version`.
