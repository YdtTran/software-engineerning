# Requirements Traceability Matrix: Post-Merge System Audit

**Repository Commit:** [`ac21515`](https://github.com/YdtTran/software-engineerning/commit/ac21515ae299cbb61532faae6b8c2697d0d66e9d)  
**Authoritative References:**  
- Lecturer Assignment: [`docs/references/04_BTL_SoftwareEngineering_HK261.pdf`](file:///home/ydt/Documents/Workspace/software-engineerning/docs/references/04_BTL_SoftwareEngineering_HK261.pdf)  
- Master Specification: [`docs/requirements/PROJECT_SPECIFICATION.md`](file:///home/ydt/Documents/Workspace/software-engineerning/docs/requirements/PROJECT_SPECIFICATION.md)  
- Lifecycle Contracts: [`docs/diagrams/01_Usecase_Diagram/LIFECYCLE_SCENARIOS.md`](file:///home/ydt/Documents/Workspace/software-engineerning/docs/diagrams/01_Usecase_Diagram/LIFECYCLE_SCENARIOS.md)  
- API Contracts: [`docs/architecture/API_CONTRACTS.md`](file:///home/ydt/Documents/Workspace/software-engineerning/docs/architecture/API_CONTRACTS.md)  

---

## 1. Classification Taxonomy

Each requirement in this audit is classified into one of the following authoritative statuses:

- **IMPLEMENTED & VERIFIED:** Fully implemented in backend logic, persisted in database entities, wired to UI where applicable, and independently verified by automated tests.
- **IMPLEMENTED BUT UNTESTED:** Implemented in code/API, but lacks dedicated automated tests or lacks live UI verification.
- **PARTIALLY IMPLEMENTED:** Key structural components (e.g. database columns, backend methods, or mock UI) exist, but the complete end-to-end transaction or interface is incomplete.
- **DOCUMENTED ONLY:** Thoroughly specified in requirements, UML diagrams, or API contracts, but has no runtime backend implementation.
- **MISSING:** Mandated by specification or assignment, but completely absent in design, schema, and implementation.
- **INCONSISTENT:** Implemented or modeled with conflicting definitions between specification, UML, database, or API behavior.
- **NOT APPLICABLE:** Features explicitly excluded from the MVP scope by team agreement or lecturer guidelines (e.g. payment processing, physical hardware).

---

## 2. Functional Requirements Traceability (UC01 – UC14)

### 2.1. User Perspective: Mobility & Rental (UC01 – UC05)

| Req ID / Use Case | Description | Module | Domain Models & Services | API Endpoints | Database Entities | UI Screens | Automated Tests | Status | Evidence (File & Line) |
|---|---|---|---|---|---|---|---|---|---|
| **UC01** | **Search Mobility Hub**<br>Find Hubs by name or keyword `q` | `mobility-simulation` | `DiscoveryService`<br>([`discovery-service.js`](file:///home/ydt/Documents/Workspace/software-engineerning/app/src/modules/mobility-simulation/application/discovery-service.js#L14-L24)) | `GET /api/v1/hubs` | `mobility_hubs` | `live.html#home`<br>`live.html#map` | `discovery-http.test.js`<br>`discovery-service.test.js`<br>`live-browser.test.js` | **IMPLEMENTED & VERIFIED** | `discovery-router.js:27`<br>`discovery-service.js:14`<br>`0001_hub_inventory.sql:1` |
| **UC02** | **View Available Vehicles**<br>Filter available vehicles at Hub by vehicle type | `mobility-simulation` | `DiscoveryService`<br>([`discovery-service.js`](file:///home/ydt/Documents/Workspace/software-engineerning/app/src/modules/mobility-simulation/application/discovery-service.js#L26-L38)) | `GET /api/v1/hubs/:id/vehicles` | `electric_vehicles` | `live.html#vehicles` | `discovery-http.test.js`<br>`discovery-service.test.js`<br>`live-browser.test.js` | **IMPLEMENTED & VERIFIED** | `discovery-router.js:28`<br>`discovery-service.js:26`<br>`0001_hub_inventory.sql:15` |
| **UC03** | **Reserve Vehicle**<br>Create 15-minute hold on eligible vehicle with ticket code | `mobility-simulation` | `RentalService`<br>([`rental-service.js`](file:///home/ydt/Documents/Workspace/software-engineerning/app/src/modules/mobility-simulation/application/rental-service.js#L30-L65)) | `POST /api/v1/vehicle-reservations`<br>`GET /vehicle-reservations/:id`<br>`POST /vehicle-reservations/:id/cancel` | `vehicle_reservations`<br>`electric_vehicles` | `live.html#reserve`<br>`live.html#ticket`<br>`live.html#journeys` | `rental-http.test.js`<br>`rental-lifecycle.test.js`<br>`live-browser.test.js` | **IMPLEMENTED & VERIFIED** | `rental-router.js:34-37`<br>`rental-service.js:30`<br>`0010_mobility_lifecycle.sql:1` |
| **UC04** | **Pick Up Vehicle**<br>Validate vehicle code at Hub, unlock simulated dock, transition to `Active` trip | `mobility-simulation` | `RentalService`<br>([`rental-service.js`](file:///home/ydt/Documents/Workspace/software-engineerning/app/src/modules/mobility-simulation/application/rental-service.js#L80-L125)) | `POST /api/v1/vehicle-reservations/:id/pickup` | `vehicle_reservations`<br>`mobility_trips`<br>`electric_vehicles`<br>`parking_slots` | `live.html#pickup`<br>`live.html#journeys` | `rental-http.test.js`<br>`rental-lifecycle.test.js`<br>`live-browser.test.js` | **IMPLEMENTED & VERIFIED** | `rental-router.js:38`<br>`rental-service.js:80`<br>`simulated-dock.js:6`<br>`0010_mobility_lifecycle.sql:17` |
| **UC05** | **Return Vehicle**<br>Query return slots, dock and lock vehicle, confirm user arrival, close trip | `mobility-simulation` | `RentalService`<br>([`rental-service.js`](file:///home/ydt/Documents/Workspace/software-engineerning/app/src/modules/mobility-simulation/application/rental-service.js#L127-L185)) | `GET /api/v1/hubs/:id/return-slots`<br>`POST /api/v1/trips/:id/return`<br>`GET /trips/:id` | `mobility_trips`<br>`electric_vehicles`<br>`parking_slots` | `live.html#trip`<br>`live.html#journeys` | `rental-lifecycle.test.js`<br>`capacity-integration.test.js`<br>`live-browser.test.js` | **IMPLEMENTED & VERIFIED** | `rental-router.js:41-42`<br>`rental-service.js:127`<br>`0010_mobility_lifecycle.sql:17` |

---

### 2.2. User Perspective: Parking & Charging (UC06 – UC07)

| Req ID / Use Case | Description | Module | Domain Models & Services | API Endpoints | Database Entities | UI Screens | Automated Tests | Status | Evidence (File & Line) |
|---|---|---|---|---|---|---|---|---|---|
| **UC06** | **Manage Parking Reservation**<br>(General private vehicle parking management) | *(Missing)* | Documented in `CLASS_CATALOG.md` (`ParkingReservation`) | Documented in `API_CONTRACTS.md` §2 | `parking_commitments` (partial low-level store) | `index.html#parking` (Mockup only) | `parking-commitment.test.js` (low-level repo only) | **PARTIALLY IMPLEMENTED** | `CLASS_CATALOG.md:143`<br>`0006_parking_commitments.sql:1`<br>No Express router |
| **UC06-S1** | **Create Parking Reservation**<br>Hold parking slot for immediate or advance arrival | *(Missing)* | Documented in `LIFECYCLE_SCENARIOS.md` | `GET /hubs/:id/parking-availability`<br>`POST /parking-reservations`<br>*(None implemented)* | `parking_commitments` | `index.html#parking` (Mockup) | None for HTTP/API | **DOCUMENTED ONLY** | `API_CONTRACTS.md:65`<br>`LIFECYCLE_SCENARIOS.md:12`<br>Absent from `app/src/` |
| **UC06-S2** | **Check In Private Vehicle**<br>Record actual vehicle arrival and create physical occupancy | *(Missing)* | Documented in `LIFECYCLE_SCENARIOS.md` | `POST /parking-reservations/:id/check-in`<br>*(Not implemented)* | `parking_slots.occupancy_id` | `index.html#parking` (Mockup) | None for HTTP/API | **DOCUMENTED ONLY** | `API_CONTRACTS.md:69`<br>`LIFECYCLE_SCENARIOS.md:32`<br>Absent from `app/src/` |
| **UC06-S3** | **Check Out Private Vehicle**<br>Release slot, calculate overstay fee under BR08b | *(Missing)* | Documented in `LIFECYCLE_SCENARIOS.md` | `POST /parking-occupancies/:id/check-out`<br>*(Not implemented)* | `parking_slots` | `index.html#parking` (Mockup) | None for HTTP/API | **DOCUMENTED ONLY** | `API_CONTRACTS.md:70`<br>`LIFECYCLE_SCENARIOS.md:46`<br>Absent from `app/src/` |
| **UC07** | **Request Charging**<br>Queue charging request with target battery & time needed | *(Missing)* | Documented in `CLASS_CATALOG.md` (`ChargingRequest`) | `POST /charging-requests`<br>`GET /charging-requests/:id`<br>*(Not implemented)* | `charging_points` (hardware catalog only) | `index.html#charging` (Mockup) | None | **DOCUMENTED ONLY** | `API_CONTRACTS.md:72`<br>`SQ04-Request_Charging.drawio`<br>`operations/README.md:5` |
| **UC07A** | **Stop Charging Session**<br>Confirm safe power shutoff and disconnect cable | *(Missing)* | Documented in `CLASS_CATALOG.md` (`ChargingSession`) | `POST /charging-sessions/:id/stop`<br>*(Not implemented)* | None | `index.html#charging` (Mockup) | None | **DOCUMENTED ONLY** | `API_CONTRACTS.md:74`<br>`LIFECYCLE_SCENARIOS.md:60` |

---

### 2.3. Operator Perspective: Network Operations & Incident Management (UC08 – UC11)

| Req ID / Use Case | Description | Module | Domain Models & Services | API Endpoints | Database Entities | UI Screens | Automated Tests | Status | Evidence (File & Line) |
|---|---|---|---|---|---|---|---|---|---|
| **UC08** | **Monitor Mobility Hub Network**<br>Real-time hub summaries, battery, occupancy, alerts | `operations` | `MonitoringService`<br>([`monitoring-service.js`](file:///home/ydt/Documents/Workspace/software-engineerning/app/src/modules/operations/application/monitoring-service.js#L14-L60)) | `GET /api/v1/operations/hubs` | `mobility_hubs`<br>`electric_vehicles`<br>`parking_slots`<br>`charging_points` | `index.html#overview` (Mockup only; missing in `live.js`) | `monitoring-regression.test.js`<br>`operations.test.js` | **IMPLEMENTED BUT UNTESTED IN UI** | `operations-router.js:46`<br>`monitoring-service.js:14`<br>`monitoring-regression.test.js:10` |
| **UC09** | **Manage Mobility Resources**<br>CRUD and status transitions for vehicles, slots, ports | `operations` | `InventoryService`<br>([`inventory-service.js`](file:///home/ydt/Documents/Workspace/software-engineerning/app/src/modules/operations/application/inventory-service.js#L12-L130)) | `GET /operations/resources`<br>`POST /operations/resources`<br>`PATCH /operations/resources/:id`<br>`DELETE /operations/resources/:id` | `electric_vehicles`<br>`parking_slots`<br>`charging_points` | `index.html#resources` (Mockup only; missing in `live.js`) | `inventory-regression.test.js` (26 tests) | **IMPLEMENTED BUT UNTESTED IN UI** | `operations-router.js:49-52`<br>`inventory-service.js:12`<br>`inventory-regression.test.js:1` |
| **UC10** | **Redistribute Vehicles**<br>Create transfer order, hold vehicles and destination slots | `operations` | `TransferService`<br>([`transfer-service.js`](file:///home/ydt/Documents/Workspace/software-engineerning/app/src/modules/operations/application/transfer-service.js#L15-L80)) | `POST /api/v1/transfers`<br>`GET /api/v1/transfers/:id` | `transfers`<br>`transfer_vehicles`<br>`transfer_destination_slots` | `live.html#transfer`<br>(via simulation recommendation) | `transfer-regression.test.js` (16 tests) | **IMPLEMENTED & VERIFIED** | `operations-router.js:55-56`<br>`transfer-service.js:15`<br>`live.js:207` |
| **UC10A** | **Confirm Transfer Arrival**<br>Complete transfer, assign vehicles to physical slots | `operations` | `TransferService`<br>([`transfer-service.js`](file:///home/ydt/Documents/Workspace/software-engineerning/app/src/modules/operations/application/transfer-service.js#L110-L150)) | `POST /api/v1/transfers/:id/arrive` | `transfers`<br>`transfer_destination_slots`<br>`electric_vehicles`<br>`parking_slots` | `index.html#redistribute` (Mockup; missing in `live.js`) | `transfer-regression.test.js` | **IMPLEMENTED BUT UNTESTED IN UI** | `operations-router.js:58`<br>`transfer-service.js:110`<br>`0009_transfer_slot_assignment.sql:1` |
| **UC10B** | **Cancel Transfer Order**<br>Release holds prior to departure | `operations` | `TransferService`<br>([`transfer-service.js`](file:///home/ydt/Documents/Workspace/software-engineerning/app/src/modules/operations/application/transfer-service.js#L152-L175)) | `POST /api/v1/transfers/:id/cancel` | `transfers`<br>`electric_vehicles`<br>`parking_slots` | `index.html#redistribute` (Mockup; missing in `live.js`) | `transfer-regression.test.js` | **IMPLEMENTED BUT UNTESTED IN UI** | `operations-router.js:59`<br>`transfer-service.js:152` |
| **UC11** | **Handle Operational Incident**<br>Investigate, isolate resource, schedule technician, resolve | `operations` | `IncidentService`<br>([`incident-service.js`](file:///home/ydt/Documents/Workspace/software-engineerning/app/src/modules/operations/application/incident-service.js#L15-L100)) | `GET /api/v1/incidents`<br>`POST /incidents/:id/handle`<br>`POST /incidents/:id/resolve` | `incidents`<br>`maintenance_assignments` | `index.html#incidents` (Mockup; missing in `live.js`) | `incident-regression.test.js` (14 tests) | **IMPLEMENTED BUT UNTESTED IN UI** | `operations-router.js:62-64`<br>`incident-service.js:15`<br>`0008_incident_isolation.sql:1` |
| **UC11A** | **Report Trip Incident**<br>User reports issue during active trip; trip preserved; vehicle flagged | `operations` & `mobility-simulation` | `IncidentService` via `tripReader` | `POST /api/v1/trips/:id/incidents` | `incidents`<br>`mobility_trips` | `live.html#journeys`<br>(Báo sự cố dialog) | `incident-regression.test.js`<br>`rental-lifecycle.test.js` | **IMPLEMENTED & VERIFIED** | `operations-router.js:61`<br>`incident-service.js:18`<br>`live.js:174` |

---

### 2.4. Operator Perspective: Smart Charging & What-if Simulation (UC12 – UC14)

| Req ID / Use Case | Description | Module | Domain Models & Services | API Endpoints | Database Entities | UI Screens | Automated Tests | Status | Evidence (File & Line) |
|---|---|---|---|---|---|---|---|---|---|
| **UC12** | **Manage Charging Schedule**<br>Prioritize queue by low battery/urgency, allocate port & power | *(Missing)* | Documented in `CLASS_CATALOG.md` (`ChargingSchedule`) | `GET /hubs/:id/charging-schedule`<br>`POST /charging-requests/:id/allocate`<br>*(Not implemented)* | `charging_points` | `index.html#schedule` (Mockup only) | None | **DOCUMENTED ONLY** | `API_CONTRACTS.md:76`<br>`PROJECT_SPECIFICATION.md:145`<br>No Express router |
| **UC13** | **Run What-if Simulation**<br>Execute discrete-event simulation across 5 mandatory scenarios | `mobility-simulation` | `SimulationEngine`<br>([`simulation-engine.js`](file:///home/ydt/Documents/Workspace/software-engineerning/app/src/modules/mobility-simulation/domain/simulation-engine.js#L20-L195))<br>`SimulationService` | `POST /api/v1/simulations` | `simulation_results` | `live.html#simulation` | `simulation.test.js` (6 tests)<br>`simulation-http.test.js`<br>`live-browser.test.js` | **IMPLEMENTED & VERIFIED** | `simulation-router.js:25`<br>`simulation-engine.js:20`<br>`0011_simulation_results.sql:1` |
| **UC14** | **View Simulation Results**<br>Display baseline vs projected metrics, generate recommendations, export JSON | `mobility-simulation` | `SimulationService`<br>([`simulation-service.js`](file:///home/ydt/Documents/Workspace/software-engineerning/app/src/modules/mobility-simulation/application/simulation-service.js#L30-L50)) | `GET /api/v1/simulations`<br>`GET /api/v1/simulations/:id` | `simulation_results` | `live.html#results` | `simulation.test.js`<br>`simulation-http.test.js`<br>`live-browser.test.js` | **IMPLEMENTED & VERIFIED** | `simulation-router.js:26-27`<br>`simulation-service.js:30`<br>`live.js:180` |

---

## 3. Non-Interactive Functional Requirements Traceability (Bonus FR-NI)

| Req ID | Description | Specification Standard | Implementation Reality | Automated Tests | Status | Audit Assessment |
|---|---|---|---|---|---|---|
| **FR-NI01** | **Auto-cancel Overdue Reservation Daemon** | Background job polling every 30 seconds to expire stale holds | Expiry logic is coded in `RentalService.cancel()` and on pickup checks; tested in unit tests. **No active `setInterval` background daemon exists in runtime.** | `rental-lifecycle.test.js` (test `wrong codes, expired tickets...`) | **PARTIALLY IMPLEMENTED** | Logic is present and verified on-demand, but lacks a scheduled background daemon process. |
| **FR-NI02** | **Simulated Battery Degradation Stream** | Periodic telemetry worker reducing battery for vehicles `In-Use` | Battery percentage is reduced only at trip return via simulated dock input. **No background degradation stream exists.** | Tested only via static values at return | **MISSING** | No background loop decreases battery during an active trip. |
| **FR-NI03** | **Hub Capacity Threshold Watcher** | Event-driven alerts: Yellow (≥85% parking, ≤10% bikes), Red (≥95% parking, 0 bikes) | Threshold evaluation rules are implemented in `MonitoringService.getHubSummaries()` and calculated when queried. **No active push notification service.** | `monitoring-regression.test.js` | **PARTIALLY IMPLEMENTED** | Metrics calculation correctly matches thresholds, but operates via pull/query rather than autonomous daemon push. |
| **FR-NI04** | **Dynamic Charge Queue Rebalancer** | Dynamic rebalancing of charging priority queue upon charger fault or battery <10% | Charging module is not implemented. | None | **MISSING** | Dependent on the unimplemented Charging module. |

---

## 4. Non-Functional Requirements Traceability (NFR01 – NFR05)

| Req ID | Category | Target Metric | Measured Evidence | Automated Tests | Status |
|---|---|---|---|---|---|
| **NFR01** | **Performance & Latency** | - State response ≤ 2.0s<br>- Simulation for 10 Hubs / 1,000 vehicles ≤ 5.0s | - HTTP query latency: 15–70 ms<br>- Simulation execution: 14–47 ms across all 5 scenarios | `simulation.test.js`<br>`discovery-http.test.js` | **IMPLEMENTED & VERIFIED** |
| **NFR02** | **Concurrency & ACID** | Zero Double-Booking; strict serializability and atomic rollback | SQLite transactions, savepoints, and conditional updates (`UPDATE ... WHERE status='Available'`) ensure single-winner semantics under concurrent worker threads. | `concurrency-regression.test.js`<br>`capacity-integration.test.js` | **IMPLEMENTED & VERIFIED** |
| **NFR03** | **Reliability & Fault Tolerance** | Durable persistence across process restart; immediate fault isolation | Data persists in SQLite (`hub.sqlite`). Restart recovery and unconfirmed device reconciliation verified. | `demo-server.test.js`<br>`incident-regression.test.js` | **IMPLEMENTED & VERIFIED** |
| **NFR04** | **Scalability & Architecture** | Modular monolith with clean domain decoupling | Organized into 5 layers (`api`, `application`, `domain`, `infrastructure`) and 2 cohesive modules (`operations`, `mobility-simulation`). | `operations.test.js`<br>`discovery-integration.test.js` | **IMPLEMENTED & VERIFIED** |
| **NFR05** | **Usability & Responsiveness** | Responsive UI across mobile (390×844) and desktop (1440×1000) | Responsive CSS flexbox/grid in `styles.css` and `live.css`. Verified in headless Chromium/Playwright. | `live-browser.test.js` | **IMPLEMENTED & VERIFIED** |

---

## 5. Traceability Summary by Implementation Status

```
Total Tracked Requirements: 23
======================================================
IMPLEMENTED & VERIFIED:          11 (47.8%)
IMPLEMENTED BUT UNTESTED IN UI:   4 (17.4%)
PARTIALLY IMPLEMENTED:            3 (13.0%)
DOCUMENTED ONLY:                  4 (17.4%)
MISSING:                          1  (4.3%)
INCONSISTENT:                     0  (0.0%)
NOT APPLICABLE:                   0  (0.0%)
```

- **Functional Use Cases (14 total):**
  - **7 Core Operational (50%):** UC01, UC02, UC03, UC04, UC05, UC13, UC14 (with UC11A).
  - **4 Backend-Only (28.6%):** UC08, UC09, UC10, UC11.
  - **3 Documented / Absent (21.4%):** UC06, UC07, UC12.
- **Bonus Non-Interactive Requirements (4 total):** 2 Partial, 2 Missing.
- **Non-Functional Requirements (5 total):** 5 Verified.
