# Architecture and Cross-Module Consistency Audit

**Integration Commit:** [`ac21515`](https://github.com/YdtTran/software-engineerning/commit/ac21515ae299cbb61532faae6b8c2697d0d66e9d)  
**Modules Audited:**  
- `Operations` (`app/src/modules/operations/`)  
- `Mobility-Simulation` (`app/src/modules/mobility-simulation/`)  
- Core Server & Composition (`app/src/app.js`, `app/src/demo-server.js`)  
- Database Persistence (`app/db/migrations/`, SQLite)  

---

## 1. Architectural Style & Layering Conformance

The system conforms to the confirmed architectural decisions recorded in [`docs/architecture/DECISION.md`](file:///home/ydt/Documents/Workspace/software-engineerning/docs/architecture/DECISION.md):

1. **Modular Monolith (DV-01):** The application runs as a unified single-process Node.js runtime, organized into two distinct, high-cohesion business modules (`operations` and `mobility-simulation`).
2. **Five Logical Layers (DV-02):**
   - **Presentation:** Served static prototype assets (`app/prototype/`) and dynamic live UI (`live.html`, `live.js`).
   - **API / Interface:** Express routers (`operations-router.js`, `discovery-router.js`, `rental-router.js`, `simulation-router.js`) enforcing HTTP status codes, validation, and session auth.
   - **Application:** Domain orchestrators (`inventory-service.js`, `monitoring-service.js`, `transfer-service.js`, `incident-service.js`, `discovery-service.js`, `rental-service.js`, `simulation-service.js`).
   - **Domain:** Pure business rules, validations, error types, and simulation calculations (`resource.js`, `transfer.js`, `incident.js`, `rental.js`, `simulation-engine.js`).
   - **Infrastructure:** SQLite repositories (`sqlite-inventory-repo.js`, `sqlite-transfer-repo.js`, `sqlite-incident-repo.js`, `sqlite-rental-repository.js`, `sqlite-client.js`).
3. **Decoupled Cross-Module Composition:**
   `Operations` and `Mobility-Simulation` avoid cyclic package dependencies. Cross-module collaboration is achieved through explicit injection in [`app/src/app.js`](file:///home/ydt/Documents/Workspace/software-engineerning/app/src/app.js#L50-L65):
   - `operations.inventoryInterface` is passed into `createMobilitySimulationModule()`.
   - `verifiedTripReader` (reading via `mobility.rentalRepository.getTrip`) is passed into `createOperationsModule()`.

---

## 2. In-Depth Cross-Module Consistency Verification

### 2.1. Consistent Lifecycle States Across Modules

The system models multiple overlapping entity lifecycles. We audited how states are shared between modules:

| Entity | Supported States in DB Schema (`CHECK` constraint) | Operations Module Handling | Mobility-Simulation Handling | Consistency Assessment |
|---|---|---|---|---|
| **ElectricVehicle** | `Available`, `Reserved`, `InUse`, `NeedsCharging`, `Charging`, `TransferHeld`, `InTransit`, `Faulty`, `Maintenance`, `Retired` | Prevents administrative mutations on active states (`TransferHeld`, `InTransit`, `InUse`, `Reserved`, `Faulty`). | Transitions `Available` → `Reserved` → `InUse` → `Available` (or `NeedsCharging`). | **CONSISTENT:** Both modules recognize the same state vocabulary and honor each other's locks. |
| **ParkingSlot** | `Available`, `Held`, `Occupied`, `Suspended` | Distinguishes between transfer holds (`transfer_hold_id`), reservation holds, and physical occupancy (`parked_vehicle_id`). | Checks both physical occupancy and commitment reservations before allowing return. | **CONSISTENT:** Explicit columns (`transfer_hold_id`, `reservation_id`, `occupancy_id`, `parked_vehicle_id`) eliminate ambiguity. |
| **ChargingPoint** | `Available`, `Idle`, `Reserved`, `Starting`, `Charging`, `Stopping`, `Complete`, `Fault`, `Repair`, `Retired` | Requires `chargingGuard` for transitions. Fails closed with `503 CHARGING_GUARD_UNAVAILABLE` when missing. | Does not transition charging points directly. Simulation models port failures hypothetically. | **SAFE (FAILS CLOSED):** Guard prevents unauthorized state corruption. |
| **Transfers** | `Planned`, `InTransit`, `Completed`, `Cancelled` | Full state machine enforced: Planned → InTransit → Completed. Cancellation allowed only in Planned. | Recommends transfers from What-if simulations; creates `Planned` transfers. | **CONSISTENT:** Single direction of control. |
| **VehicleReservation**| `Reserved`, `PickupClaimed`, `PickupUncertain`, `Fulfilled`, `Cancelled`, `Expired` | Respects `pickup_claimed=1` to prevent premature cancellation/release during device communication. | Atomically sets `pickup_claimed` prior to unlocking hardware dock. | **CONSISTENT:** Race conditions between pickup and cancellation are prevented. |

---

### 2.2. Shared Resource Ownership and Contention Handling

A critical software engineering challenge in this project is shared capacity at Mobility Hubs:
1. **Destination Parking Contention:**
   - A vehicle returning from a rental (UC05), a private vehicle reservation (UC06), and an inbound redistribution transfer (UC10) all compete for physical parking slots.
   - **Verification Evidence:** [`app/src/modules/mobility-simulation/tests/capacity-integration.test.js`](file:///home/ydt/Documents/Workspace/software-engineerning/app/src/modules/mobility-simulation/tests/capacity-integration.test.js#L9-L45) tests this contention:
     - Test 1: `return and private-parking reservation compete for the same physical destination` proves that an active parking commitment in `parking_commitments` blocks vehicle returns from consuming that slot.
     - Test 2: `return and Operations transfer cannot both consume the same destination capacity` proves that transfer holds in `transfer_destination_slots` prevent returns from seizing transfer capacity.
2. **Vehicle Reservation Contention:**
   - If two users simultaneously attempt to reserve the same electric vehicle (UC03):
   - The query uses conditional SQL execution:
     ```sql
     UPDATE electric_vehicles SET status='Reserved', reservation_id=? WHERE id=? AND status='Available'
     ```
   - Only 1 row is updated (`changes === 1`). The second caller receives `409 VEHICLE_NOT_AVAILABLE`. Verified in `rental-lifecycle.test.js:15`.
3. **Departure vs. Cancellation Contention:**
   - In `transfer-service.js`, `departTransfer` and `cancelTransfer` compete on `Planned` status using optimistic row updates. One transitions to `InTransit`, the other fails with `409 TRANSFER_NOT_PLANNED`. Verified in `transfer-regression.test.js`.

---

### 2.3. Transactional Consistency & Concurrency Safety

1. **Transactional Boundaries:**
   Both modules share the SQLite transactional wrapper [`sqlite-client.js`](file:///home/ydt/Documents/Workspace/software-engineerning/app/src/modules/operations/infrastructure/sqlite-client.js).
   - All multi-table writes (e.g. creating a reservation + updating vehicle status; closing a trip + updating slot + updating vehicle battery) execute inside an atomic `client.transaction(async () => { ... })`.
   - SQLite savepoints are used for nested operations. If persistence fails midway, the entire operation rolls back to the prior state.
2. **Decoupling Device I/O from Database Transactions:**
   - External device calls (unlocking/locking docks via `SimulatedDock`) are explicitly executed **outside** the SQLite transaction.
   - Before calling the hardware/adapter, a claim (`pickup_claimed = 1` or `mobility_commands` record) is persisted.
   - If device communication fails or times out, the transaction is not left open hanging. The claim remains in place for subsequent reconciliation.

---

### 2.4. Idempotency and Retry Semantics

1. **Operations Module:**
   - Enforces `Idempotency-Key` header on all writes (`POST /transfers`, `POST /incidents`, etc.).
   - Table `idempotency_outcomes` stores `(scope, payload_hash, status_code, response_body, expires_at)`.
   - If a request is retried with the identical key and payload, the stored response is returned immediately (`200` or `201`).
   - If the payload differs, `409 IDEMPOTENCY_KEY_REUSED` is returned.
2. **Mobility-Simulation Module:**
   - Enforces `Idempotency-Key` on `/vehicle-reservations`, `/trips/:id/return`, `/simulations`.
   - Table `mobility_outcomes` stores committed responses.
   - In addition, pending commands are tracked in `mobility_commands` with lease tokens to prevent concurrent double-execution of the same command.
3. **Client-Side Resilience:**
   - In `live.js`, pending operations are recorded in `localStorage.getItem('mobility-pending:userId')`.
   - If network connection drops or returns a 503, the UI presents a **"Thử lại yêu cầu trước"** button which re-transmits the exact stored key and payload, avoiding duplicate bookings.

---

### 2.5. Behavior After Failures & Self-Healing

1. **Database Restart:**
   - SQLite files (`hub.sqlite`) persist all committed trips, reservations, incidents, transfers, and simulation results.
   - Verified by [`app/src/tests/demo-server.test.js`](file:///home/ydt/Documents/Workspace/software-engineerning/app/src/tests/demo-server.test.js): restarting the server preserves all business records without data loss.
2. **Lost Device Responses (`503 DEVICE_UNCONFIRMED`):**
   - When a dock fails to confirm a lock or unlock command within the retry threshold (max 3 attempts), the system transitions the command to `Uncertain`.
   - The vehicle remains held; it is NOT returned to the available pool. An operator or reconciliation scan resolves the discrepancy safely.
3. **Low Battery Quarantine:**
   - If a returned vehicle has battery `< 20%`, `RentalService.returnTrip` sets its status to `NeedsCharging` rather than `Available`.
   - The vehicle cannot be reserved by subsequent users until recharged. Verified in `rental-lifecycle.test.js:160`.

---

## 3. Cross-Module Architectural Inconsistencies & Gaps

Despite the strong architectural foundation, the audit confirmed the following discrepancies:

### Inconsistency A-01: Null Geolocation Coordinates
- **Documented Expectation:** `PROJECT_SPECIFICATION.md` §3.3 (UC01) specifies displaying distance to Hubs (e.g. "250 m").
- **Actual Behavior:** Table `mobility_hubs` only contains `(id, name)`. There are no `latitude`, `longitude` columns.
- **Evidence:** `API_CONTRACTS.md:40` notes: *"The current inventory schema has no geographic coordinates, so location is null."*
- **Impact:** Distance calculations cannot be performed dynamically from GPS coordinates; the UI relies on static strings.

### Inconsistency A-02: Missing Charging Module & Fail-Closed State
- **Documented Expectation:** UC07 and UC12 specify active charging requests, session start/stop, and priority scheduling.
- **Actual Behavior:** The `Charging` module does not exist in `app/src/modules/`. `Operations` requires `chargingGuard` to update charging point statuses.
- **Evidence:** `app/src/app.js:52` passes `chargingGuard: null`. Attempting to modify a charging point via `PATCH /operations/resources/:id` returns `503 CHARGING_GUARD_UNAVAILABLE`.

### Inconsistency A-03: Asymmetry in Operator UI Exposure
- **Documented Expectation:** The Operator UI provides monitoring, resource management, transfer dispatching, and incident resolution.
- **Actual Behavior:** The backend provides 11 operational endpoints (`operations-router.js`) covered by 107 passing tests. However, `live.js` does NOT provide screens for UC08 (Hub monitoring), UC09 (Resources), or UC11 (Incidents). It only exposes UC13/UC14 (Simulation) and transfer creation.
- **Impact:** A human evaluator testing the live application cannot execute or demo the Operations module workflows through the web browser.

---

## 4. Summary Matrix of Cross-Module Quality Invariants

| Invariant | Target Standard | Enforced Mechanism | Audit Status |
|---|---|---|---|
| **Vehicle Conservation** | Total fleet size remains constant across all movements | Single-row state transitions; strict transfer hold accounting | **PASSED** |
| **Atomic Inventory Rollback** | DB operations and inventory holds succeed or fail together | SQLite client transactions and savepoints | **PASSED** |
| **Safe Incident Reporting** | Rider reporting an incident does not terminate active trip | Incident created with `reported_trip_id`; trip status remains `Active` | **PASSED** |
| **Simulation Isolation** | Simulation runs must never alter live inventory | Captured snapshot memory model; results written only to `simulation_results` | **PASSED** |
| **Authentication & Origin Guard** | Cookie writes require same-origin; endpoints check roles | Middleware validates `Origin` header and compares against `req.protocol + host` | **PASSED** |
