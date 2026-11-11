# UML and Architecture Diagrams Consistency Audit

**Target Branch:** `main`  
**Integration Commit:** [`ac21515`](https://github.com/YdtTran/software-engineerning/commit/ac21515ae299cbb61532faae6b8c2697d0d66e9d)  
**Authoritative Standards:**  
- Lecture Slides: CO3001 Ch3 (Requirements), Ch6 (System Modeling), Ch7 (Architectural Design)  
- Standard Rules: [`docs/standards/`](file:///home/ydt/Documents/Workspace/software-engineerning/docs/standards/)  
- Class Model Work: [`.agent/class-diagram/CLASS_CATALOG.md`](file:///home/ydt/Documents/Workspace/software-engineerning/.agent/class-diagram/CLASS_CATALOG.md) and [`docs/diagrams/05_Class_Diagram/`](file:///home/ydt/Documents/Workspace/software-engineerning/docs/diagrams/05_Class_Diagram/)  

---

## 1. Summary of UML Diagram Asset Inventory

| Diagram Category | Storage Path | Formats Available | Source of Truth |
|---|---|---|---|
| **Use-Case Diagrams** | `docs/diagrams/01_Usecase_Diagram/drawio/` | `.drawio`, `.md` | `general_usecase_diagram.drawio`, `user_usecases.drawio`, `operator_usecases.drawio` |
| **Sequence Diagrams** | `docs/diagrams/02_Sequence_Diagram/drawio/` | `.drawio`, PlantUML/Mermaid in `README.md` | SQ01 through SQ07 |
| **Activity Diagrams** | `docs/diagrams/03_Activity_Diagram/drawio/` | `.drawio`, PlantUML/Mermaid in `ACTIVITY_PREVIEWS.md` | AD01 through AD07 |
| **Statechart Diagrams** | `docs/diagrams/04_Statechart_Diagram/drawio/` | `.drawio` | SC01 (Vehicle), SC02 (Charging Point), SC03 (Reservation & Trip) |
| **Class Diagrams** | `docs/diagrams/05_Class_Diagram/drawio/` | `.drawio`, `CLASS_CATALOG.md` | `smart_emobility_class_diagram.drawio` |
| **Component Diagram** | `docs/diagrams/06_Component_Diagram/` | `DV01-Component_Diagram_New.drawio` | Development View Component Model |
| **Package Diagram** | `docs/diagrams/07_Package_Diagram/` | `DV02-Package_Diagram_New.drawio` | Development View Package Hierarchy |
| **Deployment Diagram** | `docs/diagrams/deployment/` | `DP01-deployment.drawio` | Deployment View Node & Artifact Mapping |

---

## 2. Detailed Diagram-by-Diagram Audit

### 2.1. Use-Case Diagrams Audit

- **Files Examined:**
  - [`docs/diagrams/01_Usecase_Diagram/drawio/general_usecase_diagram.drawio`](file:///home/ydt/Documents/Workspace/software-engineerning/docs/diagrams/01_Usecase_Diagram/drawio/general_usecase_diagram.drawio)
  - [`docs/diagrams/01_Usecase_Diagram/drawio/user_usecases.drawio`](file:///home/ydt/Documents/Workspace/software-engineerning/docs/diagrams/01_Usecase_Diagram/drawio/user_usecases.drawio)
  - [`docs/diagrams/01_Usecase_Diagram/drawio/operator_usecases.drawio`](file:///home/ydt/Documents/Workspace/software-engineerning/docs/diagrams/01_Usecase_Diagram/drawio/operator_usecases.drawio)
  - 14 individual use case `.drawio` files (UC01 through UC14).

- **Conformance against Standards (CO3001 Ch3, Ch6; `docs/standards/00_Usecase_diagram.md`):**
  1. **Actor Placement:** Primary actors (`User`, `Operator`) are positioned on the LEFT outside the boundary; secondary/external actors (`IoT Sensor Stream`, `Notification Service`) are positioned on the RIGHT. Fully compliant.
  2. **System Boundary:** All 14 use cases are enclosed within `sys_boundary` rectangle with `fillColor=#e0f2fe;strokeColor=#0284c7;strokeWidth=2`. Fully compliant.
  3. **No Actor-to-Actor Associations:** Actors interact strictly with use cases, never directly with each other. Compliant.
  4. **Simulation Engine Boundary:** The What-if Simulation Engine is correctly modeled as an internal capability initiated by the Operator (`UC13`, `UC14`), not as an external actor. Fully compliant with lecturer guidelines.
  5. **Sub-use Cases Modeling:**
     - UC06 is modeled as *Manage Parking Reservation* with sub-scenarios UC06-S1 (*Create Reservation*), UC06-S2 (*Check In*), and UC06-S3 (*Check Out*).
     - UC10 includes UC10A (*Confirm Arrival*) and UC10B (*Cancel Transfer*).
     - UC11 includes UC11A (*Report Trip Incident*).

- **Implementation Alignment:**
  - Use cases UC01–UC05 and UC13–UC14 have direct runtime representations in Express routes and UI.
  - UC06, UC07, UC12 exist in use case diagrams as target functional requirements, but are not implemented in the backend. This is an intentional design boundary for MVP development.

---

### 2.2. Sequence Diagrams Audit

- **Files Examined:**
  - SQ01 (*Reserve Vehicle*), SQ02 (*Pick Up Vehicle*), SQ03 (*Return Vehicle*), SQ04 (*Request Charging*), SQ05 (*Redistribute Vehicles*), SQ06 (*Handle Operational Incident*), SQ07 (*Run What-if Simulation*).

- **Lifeline and Message Analysis:**
  1. **Lifelines & Notation (CO3001 Ch6 pp. 21–26):**
     - Actors on left, dashed lifelines, synchronous call arrows (filled triangle), dashed return arrows with return values. Activation bars properly nested.
  2. **Lifeline Mapping to Actual Classes:**
     - In **SQ01 (Reserve Vehicle):** Lifelines are `:User`, `:MobileApp`, `:RentalService`, `:Inventory`. In code: `rental-router.js` delegates to `RentalService`, which coordinates with `operations.inventoryInterface`. **Matches code.**
     - In **SQ02 (Pick Up Vehicle):** Lifelines are `:User`, `:MobileApp`, `:RentalService`, `:SimulatedDock`. In code: `RentalService.pickup` invokes `device.unlock()` (`SimulatedDock`). **Matches code.**
     - In **SQ03 (Return Vehicle):** Shows docking lock confirmation followed by user return confirmation. In code: `RentalService.returnTrip` receives dock evidence and completes trip atomically. **Matches code.**
     - In **SQ04 (Request Charging):** Lifelines show `:Charging`. In code: The Charging module is not implemented. SQ04 represents the design contract rather than working code.
     - In **SQ05 (Redistribute Vehicles):** Lifelines `:Operator`, `:OperatorUI`, `:TransferService`, `:Inventory`. In code: `transfer-service.js` creates `Planned` transfers. **Matches code.**
     - In **SQ06 (Handle Incident):** Lifelines `:Operator`, `:IncidentService`, `:Inventory`. In code: `incident-service.js` isolates resource and schedules maintenance. **Matches code.**
     - In **SQ07 (What-if Simulation):** Lifelines `:Operator`, `:SimulationService`, `:SimulationEngine`, `:SnapshotProvider`. In code: exact correspondence to `simulation-service.js` and `simulation-engine.js`. **Matches code.**
  3. **Transaction Boundaries:**
     - In SQ01, SQ02, SQ03, the database commit occurs prior to sending the HTTP response. Device communication occurs outside transaction boundaries, preventing hung database locks.

---

### 2.3. Activity Diagrams Audit

- **Files Examined:**
  - AD01 to AD07 in `docs/diagrams/03_Activity_Diagram/` and `ACTIVITY_PREVIEWS.md`.

- **Control Flow & Business Rule Enforcement:**
  1. **Partitioning (Swimlanes):** Clear separation between `User / App`, `Operator / App`, and `Backend`.
  2. **Decision Conditions & Guards:**
     - AD01 enforces guard `[Available, battery >=20%, no hold]`. Directly matches `isRentable()` in domain logic.
     - AD02 enforces valid reservation and undamaged vehicle check prior to unlock.
     - AD03 enforces return slot capacity availability and lock confirmation before trip termination.
     - AD05 enforces transfer cancellation only permitted in `[Planned]` state; departure requires verified vehicle readiness.
  3. **Exceptional Flows:**
     - Unavailability paths, expiration paths, and conflict branches lead to explicit rejection/stop nodes. Compliant with CO3001 Ch6.

---

### 2.4. Class Diagrams Audit

- **Files Examined:**
  - `docs/diagrams/05_Class_Diagram/drawio/smart_emobility_class_diagram.drawio`
  - `.agent/class-diagram/CLASS_CATALOG.md`
  - `.agent/class-diagram/build_class_diagram.py`

- **Model Structure (19 Domain Classes, 18 Operations, 31 Associations):**
  - **Inheritance Hierarchies:**
    - `ElectricVehicle` (Abstract) ⮜ `ElectricBicycle`, `ElectricMotorcycle`.
    - `Reservation` (Abstract) ⮜ `VehicleReservation`, `ParkingReservation`.
  - **Class Member Rules:**
    - Strict 3 attributes / 2 operations compact projection per class (preserves readability on diagrams as mandated by project standard).
    - Complete method signatures with argument and return types specified in `CLASS_CATALOG.md`.

- **Implementation Divergence Analysis (Intentional Abstraction vs. Inconsistency):**
  - **OOP Hierarchy vs. Relational JavaScript:**
    In the TypeScript/JavaScript runtime, `ElectricBicycle` and `ElectricMotorcycle` are not implemented as separate ES6 classes extending a base class. Instead, table `electric_vehicles` uses a discriminator column `vehicle_type IN ('electric_bicycle', 'electric_motorbike')`.
    *Audit Assessment:* This is a standard and acceptable **Object-Relational Mapping (ORM) Single-Table Inheritance design pattern**, not a defect.
  - **Abstract Reservation Base Class:**
    In database schema, `vehicle_reservations` and `parking_commitments` are separate tables rather than a unified table with a type column.
    *Audit Assessment:* Intentional design choice for modularity between rental operations and parking management.
  - **Restored Changes under `.agent/class-diagram/`:**
    Inspection of `.agent/class-diagram/CLASS_CATALOG.md` shows minor edits refining `ParkingSlot.pool`, `ChargingRequest.schedule`, `OperationalIncident.parkingConflict`, and incident XOR rules. These enhance model precision for edge cases (LIM-01 parking conflict).

---

### 2.5. Deployment View Audit

- **Files Examined:**
  - `docs/diagrams/deployment/DP01-deployment.drawio`
  - `docs/diagrams/deployment/README-deployment.md`

- **Architecture Mapping vs. Runtime Reality:**
  1. **Device Nodes:**
     - `User Device` (runs Web Browser)
     - `Operator Mobile Device` (runs Web Browser)
     - `Operator Workstation` (runs Web Browser)
     - `Application Host` (runs Node.js Runtime + SQLite Database)
  2. **Communication Protocols:**
     - HTTPS between Browser clients and Application Host. (In local demo mode, HTTP on port 3000 is used via `DEMO_INSECURE_HTTP=1`).
     - Local file I/O / SQLite C API between Backend Application and SQLite Database (`hub.sqlite`).
  3. **Artifact Placement:**
     - `Frontend Assets` served by Express via `express.static()`.
     - `Backend Application` running in single Node.js process.
  4. **Audit Conclusion:** The Deployment View diagram is **100% consistent** with the runtime execution model of `demo-server.js`.

---

### 2.6. Development / Implementation View Audit

- **Files Examined:**
  - `docs/diagrams/06_Component_Diagram/DV01-Component_Diagram_New.drawio`
  - `docs/diagrams/07_Package_Diagram/DV02-Package_Diagram_New.drawio`
  - `docs/reports/DEVELOPMENT_IMPLEMENTATION_VIEW_REPORT.md`

- **Layering & Dependencies:**
  1. **Component Diagram:**
     - Shows components: `Presentation`, `API / Interface`, `Application Services`, `Domain Core`, `Persistence & Adapters`.
     - Dependencies point inward toward the Domain Core.
  2. **Package Diagram:**
     - Shows proposed module organization: `accounts`, `mobility`, `charging`, `operations`, `simulation`.
  3. **Divergence:**
     - The package diagram illustrates 5 domain packages including `charging`. In actual code, `charging` is not yet a separate folder; its data points are managed through `operations/domain/resource.js`.
     - *Audit Assessment:* The Development View report explicitly states that the diagrams represent the **target architecture** for the whole system, not an assertion that every package is implemented in MVP.

---

## 3. Discrepancy Summary Table

| Diagram | Element | Modeled Concept | Actual Implementation | Audit Classification |
|---|---|---|---|---|
| **Class Diagram** | `ElectricVehicle` | Abstract parent with subclasses `ElectricBicycle`, `ElectricMotorcycle` | Single DB table `electric_vehicles` with column `vehicle_type` | **Intentional Design Abstraction** |
| **Class Diagram** | `ChargingRequest`, `ChargingSession` | Full domain classes with methods `isUrgent()`, `stop()` | Not implemented in code; table `charging_points` catalog only | **Documented Only (Scope Boundary)** |
| **Sequence Diagram** | SQ04 | `:Charging` lifeline handling requests and queue | Module absent; endpoints not registered | **Design Model Only** |
| **Package Diagram** | `charging` package | Independent package in Package Diagram | Folder absent from `app/src/modules/` | **Target Architecture vs. MVP Scope** |
| **Use Case Diagram** | UC06, UC07, UC12 | Core functional use cases in System Boundary | Only UI mockups exist in `index.html`; backend absent | **Scope Boundary (Documented Only)** |
| **Deployment Diagram**| Application Host | Modular monolith on Node.js with local SQLite | Identical to `demo-server.js` | **Fully Consistent** |
