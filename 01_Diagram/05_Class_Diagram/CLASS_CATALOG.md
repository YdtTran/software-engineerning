# Smart E-Mobility Hub — domain class catalog

This is a proposed design for Submission #3, not an implemented backend. Associations describe business objects, not database foreign keys. Only the members listed here are selected for display. Services remain responsibility prose outside the domain diagram.

## Sources

- **A:** [Assignment](../../04_BTL_SoftwareEngineering_HK261.pdf), PDF pp. 1–4 (domain), pp. 5–6 (Submission #3).
- **M:** [Master specification](../../PROJECT_SPECIFICATION.md), §§2–5, especially UC01–UC14 and FR-NI01–04. Numeric thresholds come from M/current SQ01, not the assignment.
- **L:** [Lecture Ch6](../../00_Slides/06_Ch6%20System%20Modeling_2025.pdf), pp. 28–35; [project class convention](../../02_Rules/03_Class_diagram.md).
- **S:** [Sequence sources](../02_Sequence_Diagram/PLANTUML_SEQUENCE.md), SQ01–SQ07. Sequence assumptions do not add requirements to A/M.
- **D:** [Approved change design](../../openspec/changes/define-domain-class-model/design.md). Class names, enum names, signatures and internal transitions below are design choices implementing A/M.

## Class inventory

| Class | Kind | Purpose | UC/source mapping |
| --- | --- | --- | --- |
| UserAccount | concrete | Identity and a non-empty set of student/operator roles; a user may have both roles. | UC01–UC14; A, M §3.1 |
| ElectricVehicle | abstract | Shared vehicle identity, battery validation, physical connection and rental eligibility. Never directly instantiated. | UC02–UC07, UC09–UC12; A, M §§2–3 |
| ElectricBicycle | concrete | Instantiable bicycle, inheriting the complete vehicle contract. | UC02–UC07, UC09–UC12; A |
| ElectricMotorcycle | concrete | Instantiable motorcycle, including privately owned motorcycles. | UC02–UC07, UC09–UC12; A |
| MobilityHub | concrete | Location, parking inventory and charging power budget. | UC01, UC02, UC08, UC10; A, M §2.1 |
| ParkingSlot | concrete | Current parking occupancy/hold eligibility. | UC05, UC06, UC09; A, M §3.3 |
| ChargingPoint | concrete | Connection compatibility, operational availability and power rating. | UC07–UC09, UC11, UC12; A, M §3.4 |
| Reservation | abstract | Common cancellation/expiry lifecycle; resource-specific expiry is abstract. | UC03, UC06, FR-NI01; M §3.6 |
| VehicleReservation | concrete | A hold on exactly one eligible shared vehicle. | UC03, UC04, FR-NI01; M §3.3 |
| ParkingReservation | concrete | A hold on exactly one parking slot for an arrival. | UC05, UC06, FR-NI01; M §3.3 |
| Trip | concrete | Historical shared-vehicle pickup/return and one active journey. | UC04, UC05; A, M §3.3 |
| ChargingRequest | concrete | Charging demand, battery-at-request and needed-by input for scheduling. | UC07, UC12; A, M §§3.3–3.4 |
| ChargingSession | concrete | Actual charger assignment and retained interrupted/completed session history. | UC07, UC11, UC12; A, M §3.4 |
| TransferOrder | concrete | Dispatch shared vehicles between distinct hubs with capacity checks. | UC10; A, M §3.4 |
| OperationalIncident | concrete | Isolate a failed vehicle or charging point and track resolution. | UC11; A, M §3.4 |
| SimulationScenario | concrete | One of five scenario types and its validated parameters. | UC13; A, M §3.5 |
| SimulationRun | concrete | Execution on one captured network snapshot without live mutations. | UC13; A, M §3.5 |
| SimulationResult | concrete | Service impact metrics and result-owned recommendation records. | UC14; A, M §3.5 |
| CoordinationRecommendation | concrete | Proposed transfer, charging adjustment or hub redirection with acceptance state. | UC13, UC14; A, M §3.5 |

## Generalizations

| Child | Parent | Is-a justification |
| --- | --- | --- |
| ElectricBicycle | ElectricVehicle | Every electric bicycle has the battery, status and eligibility contract of an electric vehicle. No artificial override is needed. |
| ElectricMotorcycle | ElectricVehicle | Every electric motorcycle has that same contract; ownership does not change its physical type. |
| VehicleReservation | Reservation | Every vehicle hold can be cancelled/expired and specializes expiry to reservedAt + 15 minutes. |
| ParkingReservation | Reservation | Every parking hold can be cancelled/expired and specializes expiry to scheduledArrivalAt + 30 minutes. |

No inheritance is introduced for account roles, ownership, status or simulation scenario types. Abstractness means incomplete instantiable category, not merely having subclasses. ElectricVehicle has concrete shared methods; Reservation additionally declares an abstract operation.

## Lifecycle supplement

See [six supporting scenarios](../01_Usecase_Diagram/LIFECYCLE_SCENARIOS.md). VehicleService confirms private-vehicle check-in/check-out atomically, preserves fulfilled reservation history and releases occupancy only after departure; checkout is blocked by active charging/pending requests. Operator records field confirmations in the MVP. Accounts/private vehicles are provisioned; payment/reputation and technician apps are excluded. UC11A records a trip-linked incident without automatically completing the trip or physically locking a moving vehicle.

## Service responsibilities

All seven are **concrete service concepts**, not domain subclasses or a claim of existing backend code. Service operations are not selected for the domain diagram.

| Service | Responsibility | UC/source mapping |
| --- | --- | --- |
| ReservationHub | Atomically check and reserve; authorize booking/cancellation; calculate/store expiry; scan every 30 seconds and release only still-active holds, then notify. | UC03, UC06, FR-NI01; M §§3.3, 3.6 |
| VehicleService | Query rental eligibility, atomically pick up/return, confirm parking and keep vehicle/slot/hub/trip state consistent; manage resource registration/suspension/reactivation with operator authorization. | UC02, UC04, UC05, UC09; M §§3.3–3.4 |
| ChargingScheduler | Validate requests, atomically allocate compatible points within hub power capacity; prioritize low battery and upcoming use; retain interrupted sessions and requeue on technical failure; allow pre-connection cancellation and confirmed user-requested stopping without automatic requeue. | UC07, UC07A, UC12, FR-NI04; A, M §§3.3–3.7 |
| RedistributionService | Check shared ownership, battery >=80%, no reservation/trip/active order and destination capacity; hold capacity and assign transfers atomically. | UC10; M §3.4 |
| IncidentService | Isolate a failed resource before further allocation, assign maintenance, interrupt/requeue charging where appropriate, preserve history, and only reactivate after verified recovery. | UC11; M §3.4 |
| TelemetryService | Validate resource identity, timestamp/order and battery range; apply observations without bypassing allocation invariants; update network views and threshold alerts. | UC08, FR-NI02–03; M §§3.4, 3.6 |
| SimulationEngine | Validate scenario inputs, capture an immutable network snapshot, evaluate all five scenario types, preserve pending/failed runs, produce metrics/recommendations; acceptance delegates to normal live services with fresh checks. | UC13, UC14; A, M §3.5 |

Atomicity is a business contract across each check-and-allocate transition. No database, lock technology, payment system, authentication design or hardware protocol is chosen here.

## Selected members

Private attributes use `-`; public operations use `+`. `--` separates attribute and operation compartments. Empty compartments are intentional. Inherited members are not repeated; VehicleReservation and ParkingReservation override the abstract expiry operation. Each association below supplies its named reference(s), avoiding duplicate reference attributes. Types not drawn as domain classes are defined under Supporting types.

### UserAccount
```text
-accountId : String
-roles : UserRoleSet
--
+hasRole(role : UserRole) : Boolean
```

### ElectricVehicle
```text
-vehicleId : String
-batteryPercent : Integer
-status : VehicleStatus
-ownership : VehicleOwnership
-connector : ConnectorType
--
+updateBattery(percent : Integer) : void
+isRentable() : Boolean
```

### ElectricBicycle
```text
--
```

### ElectricMotorcycle
```text
--
```

### MobilityHub
```text
-hubId : String
-name : String
-location : GeoLocation
-powerLimitKW : Real
--
+availableParkingCount() : Integer
```

### ParkingSlot
```text
-slotId : String
-status : ParkingStatus
--
+canAccept(vehicle : ElectricVehicle) : Boolean
```

### ChargingPoint
```text
-pointId : String
-status : ChargingPointStatus
-connector : ConnectorType
-ratedPowerKW : Real
--
+canServe(vehicle : ElectricVehicle) : Boolean
```

### Reservation
```text
-reservationId : String
-status : ReservationStatus
-expiresAt : DateTime
--
+cancel() : void
+expire(now : DateTime) : Boolean
+calculateExpiry() : DateTime
```

### VehicleReservation
```text
-reservedAt : DateTime
--
+calculateExpiry() : DateTime
```

### ParkingReservation
```text
-scheduledArrivalAt : DateTime
--
+calculateExpiry() : DateTime
```

### Trip
```text
-tripId : String
-status : TripStatus
-pickedUpAt : DateTime
-returnedAt : OptionalDateTime
--
+complete(at : DateTime) : void
```

### ChargingRequest
```text
-requestId : String
-batteryAtRequest : Integer
-neededBy : DateTime
-status : ChargingRequestStatus
--
+isUrgent() : Boolean
```

### ChargingSession
```text
-sessionId : String
-startedAt : DateTime
-stoppedAt : OptionalDateTime
-status : ChargingSessionStatus
-allocatedPowerKW : Real
--
+stop(at : DateTime) : void
```

### TransferOrder
```text
-orderId : String
-status : TransferStatus
-dispatchedAt : OptionalDateTime
-completedAt : OptionalDateTime
--
+complete(at : DateTime) : void
```

### OperationalIncident
```text
-incidentId : String
-status : IncidentStatus
-reportedAt : DateTime
-resolvedAt : OptionalDateTime
--
+resolve(at : DateTime) : void
```

### SimulationScenario
```text
-scenarioId : String
-type : ScenarioType
-parameters : ScenarioParameters
--
+validate() : Boolean
```

### SimulationRun
```text
-runId : String
-status : SimulationRunStatus
-snapshot : NetworkSnapshot
--
+complete(result : SimulationResult) : void
```

### SimulationResult
```text
-resultId : String
-serviceSuccessRate : Real
-averageWaitMinutes : Real
-rejectedTripCount : Integer
--
```

### CoordinationRecommendation
```text
-recommendationId : String
-type : RecommendationType
-details : String
-status : RecommendationStatus
--
```

## Supporting types

These are value types/enums, not additional domain entities. All IDs are non-empty stable strings. Integer is integral; Real is finite; Boolean is true/false; void returns no value. DateTime is an instant with timezone/offset, compared as an instant; OptionalDateTime is DateTime or absent. GeoLocation is a value `(latitude : Real, longitude : Real)`, bounded to [-90,90]/[-180,180]. ConnectorType is a non-empty registered connection identifier shared by vehicle and point; no hardware standard is chosen. UserRoleSet is a non-empty mathematical set of UserRole, allowing both roles.

| Enum | Values / meaning |
| --- | --- |
| UserRole | Student, Operator |
| VehicleOwnership | Shared, Private |
| VehicleStatus | Available, Reserved, InUse, Charging, InTransfer, Faulty, Maintenance |
| ParkingStatus | Available, Held, Occupied, Suspended |
| ChargingPointStatus | Available, InUse, Faulty, Maintenance |
| ReservationStatus | Pending, Reserved, Fulfilled, Cancelled, Expired; Pending/Reserved are active holds |
| TripStatus | Active, Completed |
| ChargingRequestStatus | Queued, Charging, Completed, Cancelled; interrupted work returns to Queued |
| ChargingSessionStatus | Active, Completed, Interrupted |
| TransferStatus | Planned, InTransit, Completed, Cancelled |
| IncidentStatus | Open, Investigating, Resolved |
| ScenarioType | MetroSurge, FullParking, ChargingDemandSurge, PartialChargerFailure, VehicleClustering |
| SimulationRunStatus | Pending, Running, Completed, Failed |
| RecommendationType | TransferVehicles, AdjustChargingSchedule, RedirectHub |
| RecommendationStatus | Proposed, Accepted, Rejected |

ScenarioParameters is a validated value, not an untyped object: `targetHubId : String`, `durationMinutes : Integer (>0)` and exactly the parameter selected by ScenarioType below. All target IDs must exist in the captured snapshot. These input shapes are design choices; the numerical examples in M §3.5 are sample configurations, not hard-coded constants.

| ScenarioType | Selected parameter | Required bounds / evaluation |
| --- | --- | --- |
| MetroSurge | arrivalsPerHour : Integer | >=0; extra arrival demand at the Metro hub |
| FullParking | occupancyPercent : Integer | exactly 100; unavailable destination parking |
| ChargingDemandSurge | chargingRequestsPerHour : Integer | >=0; charging queue and power pressure |
| PartialChargerFailure | failedPointIds : StringSet | non-empty, distinct existing points at targetHubId; fewer than its total points |
| VehicleClustering | clusteredVehicleCount : Integer | >=0 and <= snapshot fleet size; redistribution demand |

StringSet is a set of non-empty strings. NetworkSnapshot is an immutable value containing `capturedAt : DateTime`, copies of hub/vehicle/slot/point states, active allocations and demand inputs sufficient to initialize an isolated run. IDs reference copied objects inside that snapshot; they do not grant mutable access to live resources. Parameters and snapshot contents have no domain methods selected for display.

## Associations

Each row defines both endpoint roles and multiplicities. The multiplicity next to A counts A instances per B and vice versa. All are ordinary associations except the explicitly justified result/recommendation composition. Named references are part of the model even though they are represented as associations rather than repeated attributes.

| A | At A | Role at A | B | At B | Role at B | Kind |
| --- | --- | --- | --- | --- | --- | --- |
| MobilityHub | 1 | hub | ParkingSlot | 0..* | slots | association |
| MobilityHub | 1 | hub | ChargingPoint | 0..* | points | association |
| MobilityHub | 0..1 | currentHub | ElectricVehicle | 0..* | currentVehicles | association |
| ParkingSlot | 0..1 | currentSlot | ElectricVehicle | 0..1 | occupant | association |
| UserAccount | 0..1 | owner | ElectricVehicle | 0..* | privateVehicles | association |
| UserAccount | 1 | booker | Reservation | 0..* | reservations | association |
| ElectricVehicle | 1 | reservedVehicle | VehicleReservation | 0..* | vehicleReservations | association |
| ParkingSlot | 1 | reservedSlot | ParkingReservation | 0..* | parkingReservations | association |
| UserAccount | 1 | rider | Trip | 0..* | trips | association |
| ElectricVehicle | 1 | vehicle | Trip | 0..* | trips | association |
| VehicleReservation | 0..1 | booking | Trip | 0..1 | resultingTrip | association |
| MobilityHub | 1 | pickupHub | Trip | 0..* | departures | association |
| MobilityHub | 0..1 | returnHub | Trip | 0..* | returns | association |
| UserAccount | 1 | requester | ChargingRequest | 0..* | chargingRequests | association |
| ElectricVehicle | 1 | vehicle | ChargingRequest | 0..* | chargingRequests | association |
| ChargingRequest | 1 | request | ChargingSession | 0..* | sessions | association |
| ChargingPoint | 1 | point | ChargingSession | 0..* | sessions | association |
| MobilityHub | 1 | sourceHub | TransferOrder | 0..* | outgoingOrders | association |
| MobilityHub | 1 | destinationHub | TransferOrder | 0..* | incomingOrders | association |
| ElectricVehicle | 1..* | vehicles | TransferOrder | 0..* | transfers | association |
| ElectricVehicle | 0..1 | affectedVehicle | OperationalIncident | 0..* | vehicleIncidents | association |
| ChargingPoint | 0..1 | affectedPoint | OperationalIncident | 0..* | pointIncidents | association |
| UserAccount | 0..1 | assignedOperator | OperationalIncident | 0..* | assignedIncidents | association |
| SimulationScenario | 1 | scenario | SimulationRun | 0..* | runs | association |
| SimulationRun | 1 | run | SimulationResult | 0..1 | result | association |
| SimulationResult | 1 | result | CoordinationRecommendation | 0..* | recommendations | composition |

Recommendation records belong exclusively to their result; removing that result removes its recommendation records. A live TransferOrder created after acceptance is independent and is not deleted with a simulation result. No hub/resource cascading deletion semantics are established, so those links remain associations. Generalization has no multiplicities; dependency arrows are unnecessary in this domain-only view.

## Allocation and lifecycle invariants

1. **Ownership:** Private implies exactly one owner with Student role; Shared implies no owner. ElectricMotorcycle(Private, owner=S) is still a motorcycle, may park/charge, and cannot rent or transfer. The same rule applies to private bicycles. Roles are not mutually exclusive.
2. **Location:** Current hub and slot may both be absent while a vehicle travels (InUse or InTransfer). A slot occupant has currentSlot equal to that slot and currentHub equal to its hub. A slot has at most one current occupant; an occupied slot cannot also be held for another arrival.
3. **Rental/transfer:** isRentable() requires Shared, Available, battery >=20% (current SQ01), an operable pickup location, no active vehicle hold, trip, charging session, transfer or unresolved incident. UC10 separately requires battery >=80%, shared ownership, distinct source/destination, no reservation/active trip/session/order/incident and sufficient held destination capacity. A 50% battery can pass rental checks but fails transfer checks.
4. **Historical versus active:** A vehicle/slot can have arbitrarily many historical reservations, but at most one conflicting active vehicle hold or overlapping parking allocation. A vehicle can have many historical trips/orders but at most one active trip/transfer and never both. All check-and-allocate/release transitions must be atomic across related records; a query such as isRentable() is not an allocation lock.
5. **Expiry:** calculateExpiry() is pure; initialize immutable expiresAt from it when creating a hold. Vehicle reservation at 10:00 expires at 10:15; parking scheduled for 10:00 expires at 10:30. FR-NI01 scans every 30 seconds; expire(now) only transitions Pending/Reserved at now >= expiresAt. Release only the associated still-held resource atomically and notify after commit. A completed pickup/check-in is Fulfilled, so a delayed scan cannot free its vehicle or occupied slot. Cancellation has the same guarded release rule.
6. **Trip:** Rider has Student role; rented vehicle is shared. Pickup retains pickupHub/pickedUpAt and fulfills the required booking; booker/rider and reservedVehicle/vehicle must agree. ReturnHub/returnedAt are absent until completed. Confirm a valid parking allocation and physical/simulated return before complete(); then update location, occupancy, trip and eligibility atomically. UC04 requires an active unexpired reservation belonging to the rider; direct pickup without a reservation is outside the MVP.
7. **Charging:** Each request has one student requester and vehicle; queued requests have zero sessions initially. At most one active session per point, request and vehicle. An interrupted session remains attached to its original point/request; mark it Interrupted, record stoppedAt, release power and requeue remaining work. A later session can use another point. One interrupted and one active session in the same request is valid history. Match connector and location, reject faulty/maintenance resources and inconsistent held/traveling states, and keep summed allocatedPowerKW <= hub.powerLimitKW (the operational budget already set to 85% of rated hub power) and each allocation <= point.ratedPowerKW. Rank low battery and nearest neededBy; <10% triggers immediate FR-NI04 reprioritization. No unsupported weighting formula is imposed.
8. **Incident XOR:** Exactly one of affectedVehicle/affectedPoint exists, although each link individually permits 0..1. Isolate that target before any new allocation; preserve reservations/sessions as history and explicitly release/reassign their active holds. assignedOperator is absent or has Operator role. Resolution requires confirmed maintenance/recovery and does not itself bypass normal reactivation checks. Example: faulty point interrupts its session; the expired scan cannot reactivate the faulty point.
9. **Transfer:** Source and destination differ; vehicles form a non-empty set and originate at sourceHub. Create Planned with vehicle and destination-slot holds; cancellation is allowed only while Planned and releases only its own holds. Confirm actual departure before InTransit and release source occupancy atomically. InTransit removes current hub/slot for traveling vehicles; complete() requires confirmed arrival/capacity and records their destination location and completedAt. Any failed check leaves the order and inventory unchanged.
10. **Simulation:** Each run has one immutable snapshot and scenario. Pending/Running/Failed have no result; Completed has exactly one result, and each result belongs to exactly one run. Success rate is in [0,1], average wait >=0, rejected count >=0. Zero attempts gives rate 0 and zero waits gives average 0 (chosen reporting convention). Failures preserve the run/snapshot without fabricated zero-valued results. Recommendations are advisory; accepting one rechecks live eligibility/capacity through the relevant service and only then records Accepted. Simulation never mutates live inventory.

These are acceptance examples for the design, not claims that the UI prototype enforces the rules.

## Sequence lifeline mapping

All distinct declarations in S are mapped below; leading `:` means an anonymous instance, not a different type. Actor declarations are mapped to domain role concepts without adding actor subclasses. These mappings allocate responsibilities; they do not assert identical implemented APIs.

| Exact sequence name | Kind | Domain/service interpretation |
| --- | --- | --- |
| User | domain role | UserAccount with Student role; UC03–UC07 |
| Operator | domain role | UserAccount with Operator role; UC10 |
| Technician | domain role | Operator acting on maintenance under UC11; no extra account subclass/role enum |
| Planner | domain role | Operator configuring UC13/UC14; no extra account subclass/role enum |
| :MobileApp | UI | Student boundary for reservations, pickup/return and charging |
| :ReservationHub | service | ReservationHub orchestrates Reservation and its resource-specific subclasses |
| :VehicleService | service | VehicleService checks ElectricVehicle eligibility and coordinates Trip transitions |
| <<datastore>> Database | storage | Persistence concept for domain history/state; not a domain class or a chosen database technology |
| :PickupController | service/boundary | UC04 entry to VehicleService; Trip, VehicleReservation and occupancy updates |
| :StationIoTDock | external | Physical/simulated dock integration; observations feed TelemetryService, confirmed actions drive VehicleService/IncidentService; no additional domain Dock class |
| :ReturnController | service/boundary | UC05 entry to VehicleService; confirm slot, return location and Trip completion |
| :TelemetryService | service | TelemetryService validates and applies observed resource state |
| :ChargingController | service/boundary | Entry to ChargingScheduler; ChargingRequest and ChargingSession |
| :SmartChargerIoT | external | Physical/simulated charging control/observation for ChargingPoint |
| :OperatorDashboard | UI | Network inventory and transfer workflow boundary |
| :RebalanceController | service/boundary | Entry to RedistributionService; TransferOrder orchestration |
| :OptimizationEngine | service | Planning responsibility within RedistributionService; no domain inheritance |
| :FieldStaffApp | UI | Dispatch acknowledgement/arrival boundary; live checks remain in RedistributionService |
| :MonitoringDashboard | UI | Incident monitoring boundary |
| :IncidentController | service/boundary | Entry to IncidentService; OperationalIncident and resource isolation |
| :SimulationWebUI | UI | Scenario input/result presentation boundary |
| :SimulationController | service/boundary | Entry to SimulationEngine; SimulationScenario, SimulationRun and SimulationResult |
| :SimulationEngine | service | SimulationEngine evaluates captured snapshots and emits CoordinationRecommendation records |

S includes wallet/subscription checks, power tiers, specific dataset sizes, Monte Carlo/AI wording and datastore self-calls for rerouting. Those are sequence scenario assumptions, not additional requirements or classes. This model follows A/M: no payment/authentication design, no mandated simulation algorithm; rerouting remains a service responsibility rather than database behavior. Existing sequence/prototype files are unchanged by this change.

## UC traceability

| UC | Domain concepts | Service/read responsibility |
| --- | --- | --- |
| UC01 | MobilityHub, ParkingSlot, ElectricVehicle | Search hub location/resource views |
| UC02 | ElectricVehicle, ElectricBicycle, ElectricMotorcycle, MobilityHub | VehicleService availability/read views |
| UC03 | UserAccount, Reservation, VehicleReservation, ElectricVehicle | ReservationHub holds |
| UC04 | UserAccount, VehicleReservation, Trip, ElectricVehicle, ParkingSlot | VehicleService pickup |
| UC05 | Trip, MobilityHub, ParkingSlot, ParkingReservation, ElectricVehicle | VehicleService confirmed return |
| UC06 | UserAccount, Reservation, ParkingReservation, ParkingSlot | ReservationHub parking holds |
| UC07 | UserAccount, ElectricVehicle, ChargingRequest, ChargingSession, ChargingPoint | ChargingScheduler registration/allocation |
| UC08 | MobilityHub, ElectricVehicle, ParkingSlot, ChargingPoint | TelemetryService and read projections |
| UC09 | ElectricVehicle, ParkingSlot, ChargingPoint, MobilityHub | VehicleService/operator resource administration |
| UC10 | TransferOrder, ElectricVehicle, MobilityHub | RedistributionService |
| UC11 | OperationalIncident, ElectricVehicle, ChargingPoint, ChargingSession, UserAccount | IncidentService |
| UC12 | ChargingRequest, ChargingSession, ChargingPoint, MobilityHub | ChargingScheduler |
| UC13 | SimulationScenario, SimulationRun, CoordinationRecommendation | SimulationEngine |
| UC14 | SimulationRun, SimulationResult, CoordinationRecommendation | SimulationEngine result views and checked recommendation acceptance |
