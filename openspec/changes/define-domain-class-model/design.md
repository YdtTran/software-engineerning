# Design

## Context

See `proposal.md` for motivation. Sources inspected:

- `04_BTL_SoftwareEngineering_HK261.pdf`: shared and private electric vehicles, limited parking/charging, operational coordination, five simulation scenarios; Submission #3 requires descriptions for all methods in the class diagram.
- `PROJECT_SPECIFICATION.md` sections 2–5: UC01–UC14, expiry rules, resource concurrency, charging priority, incidents, and isolated what-if evaluation.
- `00_Slides/06_Ch6 System Modeling_2025.pdf`, pages 28–35, and `02_Rules/03_Class_diagram.md`: structural modeling, class members, associations, and generalization. Text extraction cannot validate image-only notation; visual comparison of pages 30–34 is an apply acceptance step.
- `03_App/01_UI_UX/app.js`: UI mockup with literal hub records and in-memory workflow flags, not an implemented domain model.
- `01_Diagram/02_Sequence_Diagram/PLANTUML_SEQUENCE.md`: examples name `ReservationHub`, `VehicleService`, and a datastore; these denote orchestration/storage participants, not automatically domain entities.
- `.agent/scripts/diagram_builder.py` and existing diagram generators are available for reuse assessment. No class-specific generator or class-design directory was found in the inspected structure.

The existing `align-class-diagram-requirements-with-slides` change addresses notation. This change neither applies it nor changes UML guidance. No main OpenSpec specs currently exist. This documentation change deliberately skips delta specs.

## Goals / Non-Goals

**Goals:** Define a coherent, reviewable class model with justified inheritance, behavioral responsibilities, typed members, business cardinalities, and UC traceability. Keep the diagram small enough to read and provide descriptions for every method it shows.

**Non-Goals:** Implement a backend, choose an ORM or programming language, convert mockup flags into persisted state, specify authentication, add payment, or turn each use case/status into a subclass.

## Decisions

### 1. Use two abstract domain roots and distinguish orthogonal classifications

The following are proposed design choices, not classes already present in application code. A class can be abstract without declaring an abstract method: it represents an incomplete domain category and cannot be directly instantiated.

| Abstract class | Shared state and behavior | Concrete subclasses | Reason |
| --- | --- | --- | --- |
| `ElectricVehicle` | `-vehicleId : String`, `-batteryPercent : Integer`, `-status : VehicleStatus`, `-ownership : VehicleOwnership`; `+updateBattery(percent : Integer) : void`, `+isRentable() : Boolean` | `ElectricBicycle`, `ElectricMotorcycle` | Common vehicle lifecycle and validation; the assignment distinguishes physical vehicle types. Concrete types need not invent different algorithms or fields. |
| `Reservation` | `-reservationId : String`, `-status : ReservationStatus`, `-expiresAt : DateTime`; `+cancel() : void`, `+expire(now : DateTime) : Boolean`; abstract `+calculateExpiry() : DateTime` | `VehicleReservation`, `ParkingReservation` | Shared lifecycle with genuinely different expiry calculations and reserved resource types. |

`VehicleReservation` adds `-reservedAt : DateTime`; its expiry is reservation time + 15 minutes. `ParkingReservation` adds `-scheduledArrivalAt : DateTime`; its expiry is scheduled arrival + 30 minutes. Explain the distinction between calculating expiry and applying expiry, including the periodic background scan specified by FR-NI01. Expiry releases only a still-active hold and never an already occupied resource.

`VehicleOwnership` is an enum (`Shared`, `Private`) independent of bicycle/motorcycle type. A private motorcycle must remain a motorcycle, with a required owner association and no rental/redistribution eligibility. A shared vehicle has no student owner. Avoid separate `PrivateVehicle` and `SharedVehicle` inheritance branches, which mix physical type with ownership.

Use a concrete `UserAccount` with a non-empty set of `UserRole` values (`Student`, `Operator`) and identifiers; actor roles need no inheritance because their distinct workflow responsibilities already belong to services. Do not infer exclusive roles or invent an abstract account behavior merely to add more abstract classes. `SimulationScenario` is also concrete with a `ScenarioType` enum covering all five required scenarios; no five-subclass hierarchy is needed without distinct algorithms.

Alternatives: one generic vehicle/reservation class with nullable fields loses resource-specific meaning; a universal `Resource` parent introduces lifecycle/status contracts not established for vehicles, slots, and chargers. Neither is needed.

### 2. Keep a focused concrete class catalog

Apply will expand these seeds into a catalog with complete typed members and purpose/input/output/precondition/postcondition/error descriptions for every displayed operation. Supporting enums/value types must be defined in the catalog rather than left as unexplained identifiers.

| Concrete class | Responsibility / representative operation | Traceability |
| --- | --- | --- |
| `UserAccount` | Student/operator identity and role membership; `hasRole(role : UserRole) : Boolean` | UC01–UC14 participants |
| `ElectricBicycle`, `ElectricMotorcycle` | Instantiable electric-vehicle types inheriting the vehicle contract | UC02–UC07, UC09–UC12 |
| `MobilityHub` | Location and resource inventory; `availableParkingCount() : Integer` | UC01, UC02, UC08, UC10 |
| `ParkingSlot` | Current occupancy/hold state; `canAccept(vehicle : ElectricVehicle) : Boolean` | UC05, UC06, UC09 |
| `ChargingPoint` | Availability and supported charging connection; `canServe(vehicle : ElectricVehicle) : Boolean` | UC07–UC09, UC11, UC12 |
| `VehicleReservation`, `ParkingReservation` | Hold a specific eligible vehicle or parking slot and calculate expiry | UC03, UC06, FR-NI01 |
| `Trip` | Shared-vehicle pickup/return record; `complete(at : DateTime) : void` | UC04, UC05 |
| `ChargingRequest` | Requested vehicle, battery/needed-by input and queue status; `isUrgent() : Boolean` | UC07, UC12 |
| `ChargingSession` | Actual charger assignment and charging lifecycle; `stop(at : DateTime) : void` | UC07, UC11, UC12 |
| `TransferOrder` | Shared vehicles, source/destination hubs and dispatch lifecycle; `complete(at : DateTime) : void` | UC10 |
| `OperationalIncident` | Affected vehicle or charging point and incident status; `resolve(at : DateTime) : void` | UC11 |
| `SimulationScenario` | Scenario type, parameters and validation; `validate() : Boolean` | UC13 |
| `SimulationRun` | Scenario execution against a captured network snapshot; `complete(result : SimulationResult) : void` | UC13 |
| `SimulationResult` | Service success rate, average wait, rejected-trip count and recommendation records | UC14 |
| `CoordinationRecommendation` | Transfer, schedule adjustment or redirection suggestion and acceptance state | UC13, UC14 |

Keep the primary diagram focused on these domain classes. Document concrete service responsibilities in the catalog: `ReservationHub` orchestrates holds and expiry; `VehicleService` checks rental eligibility and trip transitions; `ChargingScheduler` allocates compatible points by battery and needed-by time; `RedistributionService` validates transfer eligibility/capacity; `IncidentService` isolates failed resources; `TelemetryService` validates and applies observations; `SimulationEngine` evaluates snapshots and produces results. They are services, not subclasses of domain entities. External notification and telemetry sources remain external collaborators. Do not create a class for an actor stick figure, screen, database icon, status, or every message verb.

Provide an explicit mapping of all current sequence lifeline names to domain/service/external/UI/storage concepts in `CLASS_CATALOG.md`; keep sequence files unchanged. Service methods omitted from the domain diagram can stay responsibility prose, avoiding an unnecessary second detailed service diagram.

### 3. Make associations and invariants explicit

- Each `ParkingSlot` and `ChargingPoint` belongs to exactly one `MobilityHub`; each hub has `0..*` of each. Use association initially: the assignment does not establish cascading deletion semantics. A vehicle's current hub and current slot are each `0..1` because it may be traveling. A slot accommodates `0..1` current vehicle, and any occupied slot must agree with the vehicle's hub.
- Each reservation has one booking account; an account has `0..*` historical reservations. Each concrete reservation references exactly one resource; each resource has `0..*` historical reservations. An additional invariant permits at most one conflicting active vehicle hold or overlapping parking allocation; historical multiplicities alone cannot encode this.
- Each vehicle has `0..1` student owner; an account owns `0..*` private vehicles. Ownership enum/association consistency is mandatory. `isRentable()` requires shared ownership, available state, sufficient battery per UC03 (20% in the current SQ01), and no conflicting active hold/trip. Do not treat transfer eligibility's 80% threshold as rental eligibility's threshold.
- A trip references one shared vehicle and one rider; each can have `0..*` historical trips, with at most one active trip per vehicle. Retain pickup and return hubs and times; the return hub/time is optional until completion. A reservation has `0..1` resulting trip. Return needs valid parking and confirmation before trip completion.
- A charging request references one account and one vehicle. It has `0..*` sessions to retain interrupted/reassigned history. Each session references one request and one charging point; a point has `0..*` historical sessions and at most one active session. Queueing need not have a point assigned yet. Respect charger compatibility and hub power/capacity; low battery and upcoming use determine priority. Faulty points cannot receive new sessions.
- A transfer order references one source and one different destination hub and `1..*` shared vehicles; vehicles may occur on `0..*` historical orders. Active orders must not conflict. UC10 requires battery >=80%, no reservation, and sufficient destination capacity before assignment.
- An incident references either one vehicle or one charging point, expressed as two `0..1` associations with an XOR constraint. It has `0..1` assigned operator. Isolate the affected resource before new allocation and preserve existing reservation/session history.
- Each simulation run references one scenario, one snapshot value, and `0..1` result (absent while pending or failed). A scenario has `0..*` runs. Each result has `0..*` recommendation records and belongs to one run. Simulation does not mutate live resources; accepting a recommendation passes through normal eligibility/capacity checks.

Document atomic check-and-reserve and transitions as service responsibilities, with no database/locking technology decision. Avoid attaching multiplicities to generalization or dependency. Use composition only where lifetime ownership is established (for example result-owned recommendation records), with an explanation; ordinary associations are the default.

### 4. Produce one consistent set of design artifacts

Write `CLASS_CATALOG.md`, `METHOD_DESCRIPTIONS.md`, `PLANTUML_CLASS.md` (PlantUML and Mermaid blocks), editable `smart_emobility_class_diagram.drawio.svg`, and a `README.md` checklist/editing guide in `01_Diagram/05_Class_Diagram/`. The detailed model uses the project's full three-compartment presentation with typed visible members; do not invent members to populate a compartment. Abstract class/operation names are italicized and generalization points to the parent.

Reuse existing SVG/mxGraph helpers if they support class compartments and editable labels; inspect their actual APIs before using them. If unsupported, author the small diagram directly as editable mxGraph with a matching SVG visual, without modifying the shared sequence generator. Verify both embedded graph and visible SVG preserve the same names, members, connections and labels. Compare the exported rendering visually with slides 30–34 and inspect for clipping/overlap. Mermaid is a preview; record any inability to reproduce abstract italics/shared-tree geometry without changing UML semantics.

Use Case-specific actor attachments and use-case bounding-box calculations have no objects to operate on in a class diagram. Preserve the workspace's applicable export styling/readability requirements, and record this distinction in the checklist. Add the three required instructions: double-click SVG in VS Code; Draw.io `+ > Advanced > PlantUML`; VP Online `File > Import > PlantUML`. Do not claim those imports were tested unless executed.

## Risks / Trade-offs

- [Over-modeling] → Keep two abstract roots, ownership/role/scenario enums, and a domain-focused diagram; add no generic repositories or framework inheritance.
- [Prototype or sequence names mistaken for implemented contracts] → Label all classes proposed and map lifeline terminology explicitly without claiming backend existence.
- [Historical multiplicities mistaken for concurrency guarantees] → State active-allocation invariants and transactional service responsibilities separately.
- [Image-only lecture notation and editable SVG diverge] → Inspect lecture images and both export representations during apply; text extraction alone is insufficient.
- [Notation proposal is still pending and local convention edits exist] → Follow current authoritative slides and user instructions, reference the notation change, and preserve unrelated edits.

## Migration Plan

Apply adds only design documents/diagram assets and the master-specification link. Review traceability and method coverage, then inspect rendered output and editable mxGraph. There is no deployment or data migration. Rollback removes only these new deliverables and their added link, preserving all existing user edits.
