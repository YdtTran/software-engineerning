# Design

## Context

See [proposal.md](proposal.md) for motivation and scope.

In the current codebase (`app/`):
- Operations (`app/src/modules/operations/`) owns physical writes on `mobility_hubs`, `electric_vehicles`, `parking_slots`, and `charging_points` via [`InventoryInterface`](../../../app/src/modules/operations/domain/inventory-interface.js) and [`SQLiteInventoryRepository`](../../../app/src/modules/operations/infrastructure/sqlite-inventory-repo.js).
- Parking commitment primitives (`getAvailableSlots`, `holdSlotForReservation`, `releaseSlotHold`, `expireSlotHold`, `occupySlot`, `vacateSlot`) and `parking_commitments` (`0006_parking_commitments.sql`) already exist in Operations, **but all 39 seeded `parking_slots` have `pool = NULL`**.
- `SQLiteInventoryRepository.updateChargingPointStatus` fails closed (`503 CHARGING_GUARD_UNAVAILABLE`) unless `chargingGuard.assertTransition({ pointId, current, desired, client })` is injected into `createOperationsModule` / `createApp`.
- `SQLiteClient` (`app/src/modules/operations/infrastructure/sqlite-client.js`) serializes queries and uses `AsyncLocalStorage` to support nested transactions (`BEGIN IMMEDIATE` + `SAVEPOINT`).
- `electric_vehicles` already has `owner_id TEXT DEFAULT NULL` (`0002_operations_schema.sql`), and Operations filters `owner_id IS NULL` for shared-fleet rentals and transfers.
- `app/src/demo-server.js` and `app/src/modules/operations/tests/migration-regression.test.js` explicitly assert `PRAGMA user_version === 8`.

## Goals / Non-Goals

**Goals:**
- Deliver `app/src/modules/parking-charging/` structured in 5 layers (`api`, `application`, `domain`, `infrastructure`, `tests`) matching `DECISION.md` (`DV01`/`DV02`) and Operations' conventions.
- Share one atomic SQLite transaction across module business records and `InventoryInterface` calls to eliminate double-booking and race conditions across `UC05`, `UC06`, `UC10`, and `UC12`.
- Keep all hardware/simulated device I/O outside SQLite write transactions using durable `device_commands` (`command_id`, max 3 retries).
- Provide `chargingGuard` and wire `parking-charging` into `app/src/app.js` without circular imports with Operations.
- Provide deterministic simulated dock/charger adapters and isolated + multi-connection concurrency tests.

**Non-Goals:**
- Implementing or modifying `app/prototype/` UI screens (owned by Ý; only backend endpoints and contract updates are covered).
- Implementing Mobility (`UC01`–`UC05`), Simulation (`UC13`–`UC14`), payment processing, or real hardware protocols (OCPP/MQTT).
- Rewriting Operations' internal `InventoryInterface` semantics except where `app/src/app.js`, `demo-server.js`, `init.sh`, and migration tests require wiring and `user_version` progression.

## Decisions

### 1. Module layout and cross-module transaction sharing
- **Decision:** Structure `app/src/modules/parking-charging/` into `api/`, `application/`, `domain/`, `infrastructure/`, `tests/`, and `index.js` (`createParkingChargingModule`), accepting the shared `SQLiteClient` (or `db`), `inventoryInterface`, optional `incidentReporter`, `deviceAdapter`, and `idempotencyStore` (reusing Operations' `SQLiteIdempotencyStore` / `SQLiteClient` or compatible shared interface).
- **Rationale:** Because `SQLiteClient` tracks active transactions via `AsyncLocalStorage` on the client instance, sharing the same `SQLiteClient` instance between `parking-charging` and `operations` ensures `client.transaction(async () => { ... await inventoryInterface.holdSlotForReservation(...); })` runs inside one `BEGIN IMMEDIATE` + `SAVEPOINT` unit and rolls back both modules cleanly on any failure.
- **Alternatives considered:** Instantiating a second `SQLiteClient` over the same `db` handle — rejected because separate `pending` queues and `AsyncLocalStorage` contexts would bypass nested savepoints and risk `SQLITE_BUSY` / non-atomic commits.

### 2. Private vehicles and Hub/Point schema extension (Migration `0012_parking_charging_schema.sql`)
- **Decision:** Keep private vehicles in `electric_vehicles` using the existing `owner_id` column (`owner_id IS NOT NULL` for private vehicles) and add `connector_type TEXT NOT NULL DEFAULT 'type2'` to both `electric_vehicles` and `charging_points`, plus `rated_power_kw REAL NOT NULL DEFAULT 7.4` on `charging_points`, and hub configuration columns on `mobility_hubs` (`power_limit_kw REAL NOT NULL DEFAULT 22.0`, `immediate_hold_ttl_minutes INTEGER NOT NULL DEFAULT 15`, `late_arrival_grace_minutes INTEGER NOT NULL DEFAULT 15`, `overstay_grace_minutes INTEGER NOT NULL DEFAULT 15`, `overstay_rate_per_hour REAL NOT NULL DEFAULT 20000`). Backfill `pool` for the 39 seeded `parking_slots` deterministically (e.g., first half/designated codes `'immediate'`, remainder `'advance'`) only where `pool IS NULL`.
- **Rationale:** Matches `CLASS_CATALOG.md` (single `ElectricVehicle` hierarchy distinguished by ownership and `connectorType`) and avoids breaking Operations queries that already guard `owner_id IS NULL`. Storing `power_limit_kw` already derated (`0.85 × rated`) directly enforces `BR15` without risking double multiplication.
- **Alternatives considered:** Creating a separate `private_vehicles` table — rejected because `parking_slots.parked_vehicle_id` already has `REFERENCES electric_vehicles(id)` (`0005_parked_vehicle.sql`), and `charging_requests` must support both private vehicles (`UC07`) and shared vehicles needing charge (`UC12`).
- **Backfill caveat:** Existing `0006_parking_commitments.sql` intentionally left `pool = NULL` for manual reconciliation; migration `0012` assigns deterministic pools for the 4 seeded hubs (`WHERE pool IS NULL` with `id IN (...)` or per-hub split) and documents the mapping so non-seed test databases remain predictable.

### 3. Parking reservation, occupancy, LIM-01, and BR08b data model
- **Decision:** Add three owned tables in `0009`:
  - `parking_reservations`: `id`, `user_id`, `vehicle_id`, `hub_id`, `slot_id`, `pool`, `ticket_code` (unique), `planned_arrival`, `planned_checkout`, `expires_at`, `status` (`Reserved|Fulfilled|Cancelled|Expired`), `assisted_by`, `replaces_reservation_id`, `created_at`, `cancelled_at`.
  - `parking_occupancies`: `id`, `reservation_id` (unique), `user_id`, `vehicle_id`, `hub_id`, `slot_id`, `actual_checkin_at`, `scheduled_checkout_at` (nullable for immediate visits), `actual_checkout_at`, `final_fee` (nullable), `assisted_by`, `created_at`.
  - `parking_conflicts`: `id`, `blocked_reservation_id`, `blocking_occupancy_id`, `hub_id`, `slot_id`, `replacement_reservation_id`, `status` (`Open|Resolved`), `created_at`, `resolved_at`.
- **Rationale:** Keeps private business history (`ticket_code`, `user_id`, `final_fee`, `assisted_by`, `LIM-01` linkage) decoupled from Operations' minimal `parking_commitments` lock table while referencing the exact same `reservation_id` and `occupancy_id`. Setting `scheduled_checkout_at = NULL` when omitted for immediate parking satisfies `LIFECYCLE_SCENARIOS.md` (`final_fee = NULL` at checkout).
- **LIM-01 flow:** When `occupySlot` or pre-check physical occupancy detects an overstayed occupant (`parked_vehicle_id` or `occupancy_id` present on target slot while reservation itself is valid), record a `parking_conflicts` row, query compatible free alternatives via `inventoryInterface.getAvailableSlots`, optionally raise an escalation alert via `incidentReporter`, and return HTTP `409 SLOT_OCCUPIED` with `details: { conflictId, alternatives }`.

### 4. Charging lifecycle, durable device commands, and `chargingGuard`
- **Decision:** Add four owned tables in `0009`:
  - `charging_requests`: `id`, `user_id`, `vehicle_id`, `occupancy_id` (nullable for shared fleet), `hub_id`, `battery_at_request`, `target_battery_percent`, `needed_by`, `requested_start`, `manual_priority_rank` (nullable for operator override), `status` (`Queued|Charging|Completed|Cancelled`), `created_at`, `updated_at`.
  - `charging_allocations`: `point_id` (PK / unique active ownership), `request_id` (unique active), `allocation_id`, `hub_id`, `start_at`, `end_at`, `allocated_power_kw`, `state` (`Reserved|Starting|Charging|Stopping|Complete|FaultUncertain`), `created_at`, `released_at`.
  - `charging_sessions`: `id`, `request_id`, `allocation_id`, `point_id`, `started_at`, `stopped_at`, `allocated_power_kw`, `status` (`Active|Completed|Interrupted`), `stop_reason` (`UserStop|TargetReached|PriorityYield|TechnicalFault`).
  - `device_commands`: `command_id` (PK), `target_kind` (`charging_point|parking_slot`), `target_id`, `action` (`power_on|power_off|unplug|verify_arrival|verify_departure`), `reference_id` (request/session/reservation/occupancy), `attempt_count` (`<= 3`), `status` (`Pending|Acked|Failed`), `last_error`, `created_at`, `updated_at`.
- **Two-phase command execution (no I/O inside write locks):**
  1. **Phase 1 (TX1):** Validate ownership/state, upsert or persist `Pending` `device_commands` row with stable `command_id`, transition point to `Starting` or `Stopping` via `inventoryInterface.updateChargingPointStatus`.
  2. **Phase 2 (No TX):** Call `deviceAdapter` (up to 3 attempts with the same `command_id`).
  3. **Phase 3 (TX2):** If ACK succeeds, mark command `Acked` and transition `Starting -> Charging` (creating `Active` `charging_sessions`) or `Stopping -> Complete` (recording `Completed`/`Interrupted`, updating `charging_requests`, freeing `allocated_power_kw` while keeping `point_id <-> request_id` ownership until unplug). If 3 attempts fail, mark command `Failed`, move point to `Fault` (retaining uncertain allocation), open operational incident, and return `503 DEVICE_UNCONFIRMED`.
- **`chargingGuard.assertTransition({ pointId, current, desired, client })`:** Reads `charging_allocations`, `device_commands`, `charging_points`, `mobility_hubs`, and `incidents` via the passed `client` (staying inside Operations' current transaction) to verify `SC02` preconditions before allowing `charging_points.status` changes. Operations unit tests (`inventory-regression.test.js`) with mocked `chargingGuard` remain unaffected; `createApp` wires the real `chargingGuard` automatically.

### 5. Priority queue, BR15 power budget, and background jobs (`FR-NI01`, `FR-NI04`)
- **Decision:** Implement `ChargingSchedulerService.computePriorityOrder` as pure domain ranking: urgent tier (`battery_at_request < 10`), emergency tier (`< 20`), shared vehicle with active/upcoming reservation, private vehicle sorted by ascending `needed_by`, then FIFO (`created_at ASC, rowid ASC`); `manual_priority_rank` from operator override (`POST /hubs/:hubId/charging-schedule/override`) pins explicit ordering within safe bounds. Power budget check sums `allocated_power_kw` across `charging_allocations` where `state IN ('Reserved', 'Starting', 'Charging', 'Stopping', 'FaultUncertain')`, ensuring `sum + requestedKw <= hub.power_limit_kw` and `requestedKw <= point.rated_power_kw`.
- **Background jobs (`FR-NI01`, `FR-NI04`):** Expose deterministic `runExpiryScan(now)` (every 30s in `demo-server.js` when enabled, and callable directly in tests) and event-driven `rebalanceHubQueue(hubId)` triggered synchronously/in-process on `<10%` submission, `PriorityYield` threshold (`>= 80%`), or point `Fault`. Keeping periodic timers opt-in/unreffed (`timer.unref()`) prevents hanging Node test processes.

### 6. Additive API contracts & cross-module incident bridge
- **Decision:** Implement all 13 routes in `docs/architecture/API_CONTRACTS.md` §2 plus the 2 agreed additive routes:
  - `POST /api/v1/charging-requests/:id/cancel` (`U`, idempotent)
  - `POST /api/v1/hubs/:hubId/charging-schedule/override` (`O`, idempotent)
  Keep hardware signals (`plug`, `powerOnAck`, `powerOffAck`, `unplug`, `fault`, dock `arrival`/`departure`) inside `SimulatedDeviceAdapter` and internal service hooks rather than adding dev-only HTTP routes.
- **Incident bridge:** Inject an `incidentReporter` adapter in `app/src/app.js` connecting `parking-charging` to Operations' `incidentService.reportEquipmentIncident` (with `reporterRole: 'system'` and trusted module identity) for 3-retry charging faults and unresolvable `LIM-01` escalations.

## Risks / Trade-offs

- **Updating `PRAGMA user_version` from 11 to 12 breaks existing strict version checks** → Update `app/db/init.sh`, `app/src/demo-server.js`, `app/src/tests/demo-server.test.js`, `app/src/tests/database-initializer.test.js`, and `app/src/modules/operations/tests/migration-regression.test.js` together in the same change and run the full test suite (`npm test --prefix app`) to verify all modules stay green.
- **Prototype `app/prototype/` remains unwired and does not yet include S2/S3/UC07A screens** → Document the 2 additive API contracts cleanly in `docs/architecture/API_CONTRACTS.md` so Ý can wire `#parking`, `#charging`, `#schedule` and add S2/S3/UC07A flows without further backend changes.
- **In-process event triggers (`FR-NI04`) vs background timers in SQLite** → Background `FR-NI01` interval timers could contend with tests if started unconditionally in `createApp` → Start periodic `setInterval` only in `demo-server.js` (with `.unref()` and shutdown cleanup) while exposing `runExpiryScan()` as an explicit application method for tests.
- **Shared `electric_vehicles` table with private vehicles (`owner_id != NULL`)** → Ensure every Mobility/Operations query continues filtering `owner_id IS NULL` (already present in `sqlite-inventory-repo.js`) and add a regression test verifying private vehicles never appear in `getAvailableVehicles`.

## Migration Plan

1. Add `app/db/migrations/0012_parking_charging_schema.sql` adding Hub/point/vehicle columns, `pool` backfill for seeded slots where `pool IS NULL`, and the 7 new module tables + indexes.
2. Extend `app/db/init.sh` (`version 11 -> 12`), update `app/src/demo-server.js` (`user_version !== 12`), and update existing test migration lists (`demo-server.test.js`, `database-initializer.test.js`, `migration-regression.test.js`).
3. Implement `app/src/modules/parking-charging/` incrementally (Domain -> Infrastructure + `chargingGuard` + `SimulatedDeviceAdapter` -> Application Services -> API Router/Controller), then wire into `app/src/app.js`.
4. **Rollback:** If deployment fails before production usage, revert `0012` migration, restore `init.sh` / `demo-server.js` to `user_version = 11`, and drop the unmounted router in `app/src/app.js`.
