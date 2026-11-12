# Proposal

## Why

The Smart E-Mobility Hub MVP backend (`app/`) currently mounts only the Operations module (`UC08`–`UC11`). Private-vehicle parking reservations, check-in/checkout lifecycles, charging requests, smart charging scheduling, background expiry/reprioritization jobs, and the `chargingGuard` transition verifier required by Operations are missing, leaving `updateChargingPointStatus` failing closed (`503 CHARGING_GUARD_UNAVAILABLE`) and seeded parking slots without pool assignments (`pool = NULL`).

## What Changes

- Implement the **Parking and Charging** backend module (`app/src/modules/parking-charging/`) following the 5-layer modular monolith architecture (`api`, `application`, `domain`, `infrastructure`, `tests`).
- Implement **UC06** (`UC06-S1`, `UC06-S2`, `UC06-S3`) private-vehicle parking availability, atomic immediate/advance reservations (`BR08`, `BR08a`), cancellation, verified arrival check-in, verified departure check-out with overstay fee calculation (`BR08b`), `LIM-01` overstay conflict detection and replacement ticket creation (preserving conflicted history), and **FR-NI01** overdue parking expiration scanning.
- Implement **UC07** and **UC07A** charging request intake, queue cancellation, and safe command-ID-based charging session activation/stop lifecycle with simulated hardware adapters (outside write transactions, up to 3 retries), separating power-off confirmation from connector-unplug release and keeping parking occupancy independent.
- Implement **UC12** and **FR-NI04** priority-based charging queue monitoring, port/power allocation within Hub `powerLimitKW` (`0.85 × ratedPowerKW` per `BR15`), urgent `<10%` reprioritization, `>=80%` priority yield, fault reassignment, and operator manual schedule overrides.
- Provide the `chargingGuard.assertTransition({ pointId, current, desired, client })` adapter required by Operations' `SQLiteInventoryRepository`.
- Add SQLite schema migrations (`0009+`) for Hub power/parking policies, slot pool backfill for seeded hubs, private vehicle/connector attributes, parking reservation/occupancy/LIM-01 records, charging requests/allocations/sessions, and durable device commands; update `app/db/init.sh` and `app/src/app.js` / `app/src/demo-server.js` composition wiring.
- Propose two additive endpoints in `docs/architecture/API_CONTRACTS.md` beyond the existing 13-route table for `UC07` charging request cancellation and `UC12` operator schedule override (coordinated with UX/UI), while keeping device/dock signals behind an internal Simulated Device Adapter and test harness.

## Capabilities

### New Capabilities
- `parking-reservations`: Private-vehicle parking availability queries, immediate and advance interval commitments, cancellation, verified arrival check-in, verified departure check-out with optional immediate `scheduledCheckoutTime` (`finalFee = null` when omitted), `BR08b` overstay fees, `LIM-01` conflict preservation with linked replacement tickets, and `FR-NI01` overdue hold expiry.
- `charging-sessions`: User charging request submission and cancellation, durable command-ID device activation and stop confirmations (`UC07`, `UC07A`), separation of power-off vs. connector-unplug release, 3-attempt fault escalation, and `SC02`-aligned `chargingGuard` transition verification for physical charging points.
- `charging-scheduling`: Hub charging queue prioritization (`<10%` urgent `FR-NI04`, low SoC, `neededBy`, FIFO), compatible connector and `BR15` Hub `powerLimitKW` allocation (`UC12`), `>=80%` priority yield, fault reassignment, and operator schedule override.

### Modified Capabilities
- None. The existing `openspec/specs/` capability catalog is empty.

## Impact

- **New module**: `app/src/modules/parking-charging/` (`api/`, `application/`, `domain/`, `infrastructure/`, `tests/`, `index.js`).
- **Composition & server**: `app/src/app.js`, `app/src/demo-server.js` (mount parking-charging routes, inject `chargingGuard`, accept updated `PRAGMA user_version`), plus `app/db/init.sh`.
- **Database**: New SQLite migrations (`0009+`) under `app/db/migrations/` and updates to test migration chains (`app/src/tests/demo-server.test.js`, `app/src/modules/operations/tests/migration-regression.test.js`).
- **Contracts & Docs**: Additive contract update in `docs/architecture/API_CONTRACTS.md` (charging request cancel & schedule override routes) and coordination note for `UC11` automatic fault incident reporting if Operations exposes an equipment-incident callback or composition adapter.
- **Out of scope**: Wiring or modifying `app/prototype/` UI screens (owned by UX/UI), Mobility (`UC01`–`UC05`) & Simulation (`UC13`–`UC14`), payment settlement, and physical IoT hardware protocols.
