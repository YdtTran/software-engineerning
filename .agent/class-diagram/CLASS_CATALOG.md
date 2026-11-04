# Smart E-Mobility Hub — domain class catalog

This is a proposed design for Submission #3, not an implemented backend. Associations describe business objects, not database foreign keys. The full member blocks below define the canonical model. Compact exports show only the explicit selection; hidden members remain part of the model and retain their method contracts. Services remain responsibility prose outside the domain diagram.

## Sources

- **A:** [Assignment](../../04_BTL_SoftwareEngineering_HK261.pdf), PDF pp. 1–4 (domain), pp. 5–6 (Submission #3).
- **M:** [Master specification](../../PROJECT_SPECIFICATION.md), §§2–5, especially UC01–UC14 and FR-NI01–04. Numeric thresholds come from M/current SQ01, not the assignment.
- **L:** [Lecture Ch6](../../00_Slides/06_Ch6%20System%20Modeling_2025.pdf), pp. 28–35; [project class convention](../../02_Rules/03_Class_diagram.md).
- **S:** [Sequence sources](../../01_Diagram/02_Sequence_Diagram/PLANTUML_SEQUENCE.md), SQ01–SQ07. Sequence assumptions do not add requirements to A/M.
- **D:** [Approved change design](../../openspec/changes/define-domain-class-model/design.md). Class names, enum names, signatures and internal transitions below are design choices implementing A/M.

## Compact display selection

At most three attributes and two operations per class; names select the unchanged typed signatures in the complete blocks below. Empty compartments remain editable. Inherited members stay on their declaring class. See [method contracts](#method-contracts) for all 18 contracts, including hidden updateBattery and expire.

| Class | Displayed attributes | Displayed operations |
| --- | --- | --- |
| UserAccount | accountId, roles | hasRole |
| ElectricVehicle (abstract) | batteryPercent, status, ownership | isRentable |
| ElectricBicycle | none | none |
| ElectricMotorcycle | none | none |
| MobilityHub | name, location, powerLimitKW | availableParkingCount |
| ParkingSlot | slotId, status | canAccept |
| ChargingPoint | status, connector, allocatedPowerKW | canServe |
| Reservation (abstract) | status, expiresAt | cancel, calculateExpiry (abstract) |
| VehicleReservation | reservedAt, pickupClaimed | calculateExpiry |
| ParkingReservation | scheduledArrivalAt | calculateExpiry |
| Trip | status, pickedUpAt, returnedAt | complete |
| ChargingRequest | targetBatteryPercent, neededBy, status | isUrgent |
| ChargingSession | status, allocatedPowerKW | stop |
| TransferOrder | status | complete |
| OperationalIncident | status, description, reportedLocation | resolve |
| SimulationScenario | type, parameters | validate |
| SimulationRun | status, snapshot | complete |
| SimulationResult | serviceSuccessRate, averageWaitMinutes, rejectedTripCount | none |
| CoordinationRecommendation | type, details, status | none |

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

See [six supporting scenarios](../../01_Diagram/01_Usecase_Diagram/README.md#lifecycle-scenarios). VehicleService confirms private-vehicle check-in/check-out atomically, preserves fulfilled reservation history and releases occupancy only after departure; checkout is blocked by active charging/pending requests. Operator records field confirmations in the MVP. Accounts/private vehicles are provisioned; payment/reputation and technician apps are excluded. UC11A records a trip-linked incident without automatically completing the trip or physically locking a moving vehicle.

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
-allocatedPowerKW : Real = 0
-commandId : OptionalString
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
-pickupClaimed : Boolean = false
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
-targetBatteryPercent : Integer
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
-stopReason : OptionalChargingStopReason
--
+stop(at : DateTime, reason : ChargingStopReason) : void
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
-description : String
-reportedLocation : OptionalGeoLocation
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

These are value types/enums, not additional domain entities. All IDs are non-empty stable strings. Integer is integral; Real is finite; Boolean is true/false; void returns no value. DateTime is an instant with timezone/offset, compared as an instant; OptionalDateTime is DateTime or absent. OptionalString, OptionalGeoLocation and OptionalChargingStopReason are the corresponding type or absent. reportedLocation is an immutable report-time location snapshot (GPS or manually supplied), not the vehicle's changing current location. GeoLocation is a value `(latitude : Real, longitude : Real)`, bounded to [-90,90]/[-180,180]. ConnectorType is a non-empty registered connection identifier shared by vehicle and point; no hardware standard is chosen. UserRoleSet is a non-empty mathematical set of UserRole, allowing both roles.

| Enum | Values / meaning |
| --- | --- |
| UserRole | Student, Operator |
| VehicleOwnership | Shared, Private |
| VehicleStatus | Available, Reserved, InUse, NeedsCharging, Charging, TransferHeld, InTransit, Faulty, Maintenance, Retired |
| ParkingStatus | Available, Held, Occupied, Suspended |
| ChargingPointStatus | Idle, Reserved, Starting, Charging, Stopping, Complete, Fault, Repair, Retired; Complete means stopped and awaiting unplug |
| ReservationStatus | Pending, Reserved, Fulfilled, Cancelled, Expired; Pending/Reserved are active holds |
| TripStatus | Active, Completed |
| ChargingRequestStatus | Queued, Charging, Completed, Cancelled; interrupted work returns to Queued |
| ChargingSessionStatus | Active, Completed, Interrupted |
| ChargingStopReason | UserStop, TargetReached, PriorityYield, TechnicalFault |
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
| VehicleReservation | 1 | booking | Trip | 0..1 | resultingTrip | association |
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
| ElectricVehicle | 1 | parkedVehicle | ParkingReservation | 0..* | parkingReservations | association |
| ParkingSlot | 0..* | heldDestinationSlots | TransferOrder | 0..1 | holdingTransfer | association |
| ChargingRequest | 0..1 | allocationOwner | ChargingPoint | 0..1 | allocatedPoint | association |
| Trip | 0..1 | reportedTrip | OperationalIncident | 0..* | incidents | association |
| UserAccount | 0..1 | reporter | OperationalIncident | 0..* | reportedIncidents | association |

Recommendation records belong exclusively to their result; removing that result removes its recommendation records. A live TransferOrder created after acceptance is independent and is not deleted with a simulation result. No hub/resource cascading deletion semantics are established, so those links remain associations. Generalization has no multiplicities; dependency arrows are unnecessary in this domain-only view.

## Allocation and lifecycle invariants

1. **Ownership:** Private implies exactly one owner with Student role; Shared implies no owner. ElectricMotorcycle(Private, owner=S) is still a motorcycle, may park/charge, and cannot rent or transfer. The same rule applies to private bicycles. Roles are not mutually exclusive.
2. **Location:** Current hub and slot may both be absent while a vehicle travels (InUse or InTransit). A slot occupant has currentSlot equal to that slot and currentHub equal to its hub. A slot has at most one current occupant; an occupied slot cannot also be held for another arrival.
3. **Rental/transfer:** isRentable() requires Shared, Available, battery >=20% (current SQ01), an operable pickup location, no active vehicle hold, trip, charging session, transfer or unresolved incident. UC10 separately requires battery >=80%, shared ownership, distinct source/destination, no reservation/active trip/session/order/incident and sufficient held destination capacity. A 50% battery can pass rental checks but fails transfer checks.
4. **Historical versus active:** A vehicle/slot can have arbitrarily many historical reservations, but at most one conflicting active vehicle hold or overlapping parking allocation. A vehicle can have many historical trips/orders but at most one active trip/transfer and never both. All check-and-allocate/release transitions must be atomic across related records; a query such as isRentable() is not an allocation lock.
5. **Expiry:** calculateExpiry() is pure; initialize immutable expiresAt from it when creating a hold. Vehicle reservation at 10:00 expires at 10:15; parking scheduled for 10:00 expires at 10:30. FR-NI01 scans every 30 seconds; expire(now) only transitions Pending/Reserved at now >= expiresAt. Release only the associated still-held resource atomically and notify after commit. VehicleReservation.pickupClaimed is set atomically before unlock, serializing with cancellation/expiry. A claimed pickup cannot be expired or cancelled until lock/location reconciliation settles it. A completed pickup/check-in is Fulfilled, so a delayed scan cannot free its vehicle or occupied slot. Cancellation has the same guarded release rule. Each ParkingReservation identifies exactly one parkedVehicle owned by its booker; check-in must match that vehicle, Hub and held slot.
6. **Trip:** Rider has Student role; rented vehicle is shared. Pickup retains pickupHub/pickedUpAt and fulfills the required booking; booker/rider and reservedVehicle/vehicle must agree. ReturnHub/returnedAt are absent until completed. Confirm a valid parking allocation and physical/simulated return before complete(); then update location, occupancy, trip and eligibility atomically. The Trip booking association is mandatory (1), including retained history. UC04 requires an active unexpired reservation belonging to the rider; direct pickup without a reservation is outside the MVP.
7. **Charging:** Each request has one student requester and vehicle; targetBatteryPercent is an integer in [0,100], not below batteryAtRequest when submitted. Equal target/current battery requires no power allocation. Completion requires verified current batteryPercent >= request.targetBatteryPercent; an 80% priority yield with target 100% is Interrupted with remaining work Queued, not Completed; queued requests have zero sessions initially. At most one active session per point, request and vehicle. An interrupted session remains attached to its original point/request; mark it Interrupted and record stoppedAt and stopReason only after matching power-off confirmation. UserStop before target cancels the request without requeue; TargetReached completes it; PriorityYield and TechnicalFault retain remaining demand Queued. Keep the connector held until unplug and parking Occupied until physical departure. A later session can use another point. One interrupted and one active session in the same request is valid history. Match connector and location, reject faulty/maintenance resources and inconsistent held/traveling states, and keep summed allocatedPowerKW <= hub.powerLimitKW (the operational budget already set to 85% of rated hub power) and each allocation <= point.ratedPowerKW. Point.allocatedPowerKW reserves budget already in Reserved/Starting, before any active session exists. allocationOwner/allocatedPoint is a current 0..1-to-0..1 association, set atomically with the port/power claim. Every positive or uncertain retained power allocation has exactly one owning request, including before session creation; any active session must reference that same request and point. Cancellation/reconciliation releases only the owner's allocation. Keep this ownership link while a stopped request still holds the connector, even if power is zero or the request is Cancelled; clear it only after verified unplug or verified safe connector release. Idle points have no owner or allocation. Sum point allocations across Reserved/Starting/Charging/Stopping and uncertain Fault states; do not count an active session a second time. Use the same commandId for retries (at most 3); uncertain starts/stops retain allocation until confirmed isolation and reconciliation. Rank low battery and nearest neededBy; <10% triggers immediate FR-NI04 reprioritization. No unsupported weighting formula is imposed.
8. **Incident XOR:** Exactly one of affectedVehicle/affectedPoint exists, although each link individually permits 0..1. Isolate that target before any new allocation; preserve reservations/sessions as history and explicitly release/reassign their active holds. assignedOperator is absent or has Operator role. reportedTrip and reporter are optional for the general incident type: a Student trip report requires both, with reporter equal to the trip rider and affectedVehicle equal to its vehicle. Save the report-time description and GPS/manual reportedLocation; later trips or vehicle movement never change these historical references. Pre-pickup damage and charger alerts need no Trip; automatic alerts may omit reporter and location when unavailable. assignedOperator and reporter are separate roles. Resolution requires confirmed maintenance/recovery and does not itself bypass normal reactivation checks. Example: faulty point interrupts its session; the expired scan cannot reactivate the faulty point.
9. **Transfer:** Source and destination differ; vehicles form a non-empty set and originate at sourceHub. Create Planned with vehicle and destination-slot holds; heldDestinationSlots explicitly records current order-owned slot holds, one per assigned vehicle while Planned/InTransit, zero after completion/cancellation. No held slot may also be occupied or held by a parking reservation. Recheck Operator, Planned, battery >=80%, vehicle eligibility and destination holds atomically at departure; failure cannot dispatch or free source slots; cancellation is allowed only while Planned and releases only its own holds. Confirm actual departure before InTransit and release source occupancy atomically. InTransit removes current hub/slot for traveling vehicles; complete() requires confirmed arrival/capacity and records their destination location and completedAt. Any failed check leaves the order and inventory unchanged.
10. **Simulation:** Each run has one immutable snapshot and scenario. Pending/Running/Failed have no result; Completed has exactly one result, and each result belongs to exactly one run. Success rate is in [0,1], average wait >=0, rejected count >=0. Zero attempts gives rate 0 and zero waits gives average 0 (chosen reporting convention). Failures preserve the run/snapshot without fabricated zero-valued results. Recommendations are advisory; accepting one rechecks live eligibility/capacity through the relevant service and only then records Accepted. Simulation never mutates live inventory.

These are acceptance examples for the design, not claims that the UI prototype enforces the rules.

## Sequence lifeline mapping

Derived from the current seven [sequence declarations](../../01_Diagram/02_Sequence_Diagram/PLANTUML_SEQUENCE.md). These are responsibility mappings, not new classes or operations.

| Exact sequence name | Kind | Domain/service interpretation |
| --- | --- | --- |
| User | domain role | UserAccount with Student role (the sequence calls this actor User). |
| Operator | domain role | UserAccount with Operator role. |
| :MobileApp | UI | Presentation boundary outside the domain model. |
| :OperatorDashboard | UI | Operator presentation boundary outside the domain model. |
| :SimulationUI | UI | Simulation presentation boundary outside the domain model. |
| :Reservation | coordination | Coordinates VehicleReservation, ElectricVehicle and UserAccount; an aggregate responsibility, never an instance of abstract Reservation. |
| :Pickup | coordination | Coordinates VehicleReservation, Trip, ElectricVehicle, ParkingSlot and MobilityHub. |
| :Return | coordination | Coordinates Trip, VehicleReservation, ElectricVehicle, ParkingSlot and MobilityHub. |
| :Charging | coordination | Coordinates ChargingRequest, ChargingSession and ChargingPoint with account, vehicle and Hub constraints. |
| :Transfer | coordination | Coordinates TransferOrder, shared vehicles and distinct source/destination MobilityHub roles. |
| :Incident | coordination | Coordinates OperationalIncident and resource isolation/maintenance. |
| :Simulation | coordination | Coordinates SimulationScenario, SimulationRun, SimulationResult and CoordinationRecommendation. |
| :SimulatedDock | device adapter | External simulated dock adapter; no new domain class. |
| :SimulatedCharger | device adapter | External simulated charger adapter; no new domain class. |

User/Student denote the same student account role; the existing enum is unchanged. Sequence messages do not mandate matching domain methods. UC and lifecycle references below remain authoritative.

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

## Method contracts

All 18 declared operations in the [catalog](CLASS_CATALOG.md) and [diagram sources](README.md) are specified here, including the abstract operation and its two overrides. These are language-neutral contracts, not executable code. Error names below denote failure categories; they do not choose exception versus error-result transport.

Read predicates do not reserve resources. Services must recheck authorization, live state and cross-object invariants atomically when committing a transition. Mutating methods require a consistent loaded aggregate/context; failed validation leaves domain state unchanged. Notification happens after a successful state change and does not roll it back.

## UserAccount.hasRole

- **Signature:** `+hasRole(role : UserRole) : Boolean`
- **Purpose:** Check workflow role membership (UC01–UC14).
- **Inputs:** One declared UserRole.
- **Output:** Boolean membership result; both Student and Operator can return true.
- **Preconditions:** Account exists with a non-empty valid roles set.
- **Algorithm:** Test whether roles contains role.
- **Postconditions:** No mutation.
- **Errors:** InvalidRole for an undeclared value; account authorization belongs to the service boundary.

## ElectricVehicle.updateBattery

- **Signature:** `+updateBattery(percent : Integer) : void`
- **Purpose:** Apply a validated battery observation (UC08/UC09, FR-NI02).
- **Inputs:** Integral percent in [0,100].
- **Output:** void.
- **Preconditions:** Vehicle exists; TelemetryService has checked identity, timestamp freshness/order and observation authority.
- **Algorithm:** Reject out-of-range/non-integral input, then set batteryPercent. Notify scheduling/alert services if their threshold conditions change.
- **Postconditions:** batteryPercent equals percent. Ownership, allocations and lifecycle status are unchanged by the battery setter itself.
- **Errors:** InvalidBattery for invalid input; StaleObservation is handled by TelemetryService before calling this method; no partial update.

## ElectricVehicle.isRentable

- **Signature:** `+isRentable() : Boolean`
- **Purpose:** Determine candidate rental eligibility (UC02/UC03).
- **Inputs:** No explicit arguments; current vehicle and associated allocation/incident/location state.
- **Output:** True only if all rental invariants hold.
- **Preconditions:** A consistent current resource/allocation view is available.
- **Algorithm:** Require Shared ownership, Available status, battery >=20%, operable pickup location, no conflicting hold/trip/session/transfer and no unresolved incident.
- **Postconditions:** No mutation or hold. A private motorcycle returns false, even at 100% battery. The UC10 transfer threshold remains 80% and is checked separately. Pickup of an already reserved vehicle validates the rider's own active hold through VehicleService; it does not use this unheld-candidate predicate to reject that booking.
- **Errors:** InconsistentState if required context is unavailable/inconsistent; ordinary ineligibility returns false. ReservationHub repeats checks in its atomic hold operation.

## MobilityHub.availableParkingCount

- **Signature:** `+availableParkingCount() : Integer`
- **Purpose:** Expose presently allocatable parking capacity (UC01/UC08/UC10).
- **Inputs:** No explicit arguments; hub slots and their current occupancy/hold view.
- **Output:** Non-negative count of available, unoccupied, unheld, unsuspended slots.
- **Preconditions:** A consistent slot/allocation view is available; no future-time availability is implied.
- **Algorithm:** Count only slots passing those predicates. Active transfer destination capacity holds count as held.
- **Postconditions:** No mutation; returned count alone does not grant a parking allocation.
- **Errors:** InconsistentState if inventory cannot be read consistently. Services recheck capacity inside the committing transaction.

## ParkingSlot.canAccept

- **Signature:** `+canAccept(vehicle : ElectricVehicle) : Boolean`
- **Purpose:** Check an unheld slot as a candidate for parking (UC05/UC06/UC09).
- **Inputs:** One existing electric vehicle (shared or private).
- **Output:** True if status is Available, no occupant/active conflicting allocation exists and the vehicle has no different occupied slot.
- **Preconditions:** Vehicle, slot and hub/allocation context are valid and current.
- **Algorithm:** Check availability and current occupancy consistency. A service fulfilling this user's existing parking hold validates that hold separately, atomically; it does not use this unheld-candidate predicate to reject its own hold.
- **Postconditions:** No check-in, slot acquisition or trip completion.
- **Errors:** InvalidVehicle or InconsistentState for missing/inconsistent context; ordinary unavailable capacity returns false.

## ChargingPoint.canServe

- **Signature:** `+canServe(vehicle : ElectricVehicle) : Boolean`
- **Purpose:** Check point-level charging eligibility (UC07/UC12).
- **Inputs:** One existing electric vehicle and its current location/state.
- **Output:** True when point is Idle, has no power/connector allocation, and is compatible; vehicle is at the point's hub, not traveling/faulty/in maintenance, and has no conflicting allocation or unresolved incident.
- **Preconditions:** Point/vehicle allocation and incident context is current. Private ownership is allowed.
- **Algorithm:** Compare connector identifiers and operational state; verify local availability and location. ChargingScheduler additionally checks request entitlement, neededBy and aggregate hub power before assignment.
- **Postconditions:** No power allocation/session creation. A compatible but faulty point returns false.
- **Errors:** InvalidVehicle/InconsistentState for invalid context; normal incompatibility/unavailability returns false.

## Reservation.cancel

- **Signature:** `+cancel() : void`
- **Purpose:** Cancel an active vehicle/parking hold (UC03/UC06).
- **Inputs:** No explicit arguments; owning service provides authenticated booker/operator context and hold references.
- **Output:** void.
- **Preconditions:** Cancellation is authorized. Status is Pending/Reserved or already Cancelled. For a VehicleReservation, pickupClaimed is false, or verified reconciliation has settled the pickup before cancellation.
- **Algorithm:** Already Cancelled is an idempotent no-op. Otherwise atomically check active status, set Cancelled and release only the resource hold owned by this reservation. Trigger notification after commit.
- **Postconditions:** Reservation history remains; resource availability is recomputed against faults/occupancy and other allocations. Never free a resource already occupied by a fulfilled booking.
- **Errors:** Unauthorized at service boundary; InvalidTransition for Fulfilled/Expired; AllocationConflict if hold ownership changed. No partial cancellation/release.

## Reservation.expire

- **Signature:** `+expire(now : DateTime) : Boolean`
- **Purpose:** Apply the FR-NI01 overdue transition, distinct from calculating the deadline.
- **Inputs:** A valid current instant now.
- **Output:** True exactly when this call transitions an active hold to Expired; false otherwise.
- **Preconditions:** expiresAt was initialized from calculateExpiry(); ReservationHub invokes the background scan every 30 seconds with a consistent allocation view.
- **Algorithm:** If now < expiresAt, status is not Pending/Reserved, or a VehicleReservation pickupClaimed is true, return false. Otherwise atomically recheck status/hold ownership, set Expired and release only that still-active hold. Notify after commit.
- **Postconditions:** On true, no hold remains for this reservation and history persists. On false, state is unchanged; a delayed scan cannot release a fulfilled pickup or occupied slot. An unavailable/faulty resource stays unavailable after hold release.
- **Errors:** InvalidTime for malformed instant; AllocationConflict/InconsistentState for conflicting state. Roll back the transition if the guarded release cannot complete.

## Reservation.calculateExpiry

- **Signature:** `+calculateExpiry() : DateTime` (**abstract**)
- **Purpose:** Define the resource-specific pure expiry contract (UC03/UC06, FR-NI01).
- **Inputs:** No explicit arguments; specialization's immutable booking-time inputs.
- **Output:** Exact deadline as an instant.
- **Preconditions:** Concrete specialization has valid time inputs.
- **Algorithm:** Dispatch to the concrete override; there is no base implementation.
- **Postconditions:** No mutation/release/notification. The creating service stores this value in expiresAt once; expire(now) later applies the transition.
- **Errors:** InvalidTime or TimeOverflow if no representable deadline can be calculated; direct abstract instantiation is prohibited.

## VehicleReservation.calculateExpiry

- **Signature:** `+calculateExpiry() : DateTime` (override)
- **Purpose:** Specialize [Reservation.calculateExpiry](#reservationcalculateexpiry) for UC03.
- **Inputs:** reservedAt : DateTime from this reservation.
- **Output:** reservedAt + 15 minutes.
- **Preconditions:** Base contract and a valid immutable reservedAt.
- **Algorithm:** Add a duration of 15 minutes to the instant; 10:00 -> 10:15.
- **Postconditions:** Base purity contract; result equals expiresAt after creation, including exactly at the deadline.
- **Errors:** InvalidTime/TimeOverflow; no state change.

## ParkingReservation.calculateExpiry

- **Signature:** `+calculateExpiry() : DateTime` (override)
- **Purpose:** Specialize [Reservation.calculateExpiry](#reservationcalculateexpiry) for UC06/BR08.
- **Inputs:** scheduledArrivalAt : DateTime from this reservation.
- **Output:** scheduledArrivalAt + 30 minutes.
- **Preconditions:** Base contract and valid immutable scheduledArrivalAt.
- **Algorithm:** Add 30 minutes to scheduled arrival, regardless of booking creation time; arrival 10:00 -> 10:30.
- **Postconditions:** Base purity contract; result equals expiresAt after creation. Never use the vehicle-hold 15-minute formula.
- **Errors:** InvalidTime/TimeOverflow; no state change.

## Trip.complete

- **Signature:** `+complete(at : DateTime) : void`
- **Purpose:** Record confirmed shared-vehicle return (UC05).
- **Inputs:** Confirmed return instant at; service-provided returnHub and validated parking allocation.
- **Output:** void.
- **Preconditions:** Trip is Active, at >= pickedUpAt, shared vehicle and rider are consistent; physical/simulated return is confirmed and destination parking is held/available for this return.
- **Algorithm:** VehicleService atomically validates capacity/confirmation, sets returnHub/returnedAt/status=Completed, occupies the slot and updates vehicle hub/slot and lifecycle according to remaining incident/charging state.
- **Postconditions:** Exactly one completed trip history entry; no active trip remains for the vehicle. Current occupancy agrees with hub; availability is not restored if another constraint blocks it.
- **Errors:** InvalidTime, InvalidTransition, ReturnNotConfirmed or CapacityConflict; preserve the active trip and all prior allocation state on failure.

## ChargingRequest.isUrgent

- **Signature:** `+isUrgent() : Boolean`
- **Purpose:** Identify the emergency battery trigger in FR-NI04 (UC07/UC12).
- **Inputs:** No explicit arguments; batteryAtRequest captured/validated for this request.
- **Output:** True for batteryAtRequest <10%, false otherwise.
- **Preconditions:** batteryAtRequest is an integer in [0,100].
- **Algorithm:** Compare against 10; 9 -> true, 10 -> false. ChargingScheduler separately ranks neededBy and current telemetry, so this predicate is not the complete priority algorithm.
- **Postconditions:** No queue/session mutation. New low-battery observations prompt scheduler reevaluation.
- **Errors:** InvalidBattery for corrupt stored input; no mutation.

## ChargingSession.stop

- **Signature:** `+stop(at : DateTime, reason : ChargingStopReason) : void`
- **Purpose:** Safely stop charging and retain session history (UC07/UC11/UC12).
- **Inputs:** Confirmed stop instant at and explicit reason from ChargingStopReason; target satisfaction and a matching acknowledgement are verified in service context.
- **Output:** void.
- **Preconditions:** Session is Active; at >= startedAt; stop/de-energization is confirmed by physical/simulated integration. Service compares verified current battery with request.targetBatteryPercent and validates the explicit stop reason; it does not infer completion solely from an 80% scheduler yield.
- **Algorithm:** Atomically record stoppedAt; set Completed only when verified batteryPercent >= request.targetBatteryPercent, otherwise Interrupted; release the point power allocation exactly once (session power is historical, not a second allocation) and update request to Completed when satisfied, Cancelled for a user-requested early stop, or Queued for a technical interruption or scheduler priority yield. Persist stopReason; retain the connector until unplug and keep parking occupied until departure. A user cancellation must not automatically restart charging. Preserve a faulted point's isolation status.
- **Postconditions:** Old session remains attached to its request and point; it is no longer active. Reassignment creates a new session rather than overwriting history.
- **Errors:** InvalidTime, InvalidTransition or StopNotConfirmed; do not falsely declare power/resource released when physical/simulated stop has not been confirmed. IncidentService keeps the point isolated during recovery.

## TransferOrder.complete

- **Signature:** `+complete(at : DateTime) : void`
- **Purpose:** Record confirmed redistribution arrival (UC10).
- **Inputs:** Arrival instant at and service-confirmed vehicle arrivals/held destination slots.
- **Output:** void.
- **Preconditions:** Order is InTransit, dispatchedAt exists and at >= dispatchedAt; distinct hubs, non-empty assigned shared vehicles and destination capacity remain valid. The 80% battery threshold is checked at selection/dispatch, not as a reason to refuse recording a confirmed arrival.
- **Algorithm:** RedistributionService atomically confirms all arrivals, assigns each destination slot/hub, releases the order's transfer/capacity holds and sets Completed/completedAt. Eligibility was checked at assignment and is rechecked for safe arrival handling.
- **Postconditions:** Vehicles are located at destination with consistent occupancy, no active transfer remains; history persists. Unresolved faults still block availability.
- **Errors:** InvalidTime, InvalidTransition, ArrivalNotConfirmed or CapacityConflict; retain order/holds for recovery, with no partial all-vehicles completion.

## OperationalIncident.resolve

- **Signature:** `+resolve(at : DateTime) : void`
- **Purpose:** Close a verified repair/recovery case (UC11).
- **Inputs:** Resolution instant at and IncidentService's verified maintenance evidence/context.
- **Output:** void.
- **Preconditions:** Status is Open/Investigating; at >= reportedAt; target XOR holds; isolation and required safety tests are confirmed; authorized operator has verified recovery and required maintenance handling.
- **Algorithm:** Set status=Resolved and resolvedAt after evidence validation. IncidentService separately authorizes reactivation, checks other unresolved incidents and restores only consistent eligible state.
- **Postconditions:** Incident history remains, including interrupted sessions/reservations. Resolution alone does not unconditionally make the target Available.
- **Errors:** InvalidTime, InvalidTransition, RecoveryNotVerified or InvalidTarget; no reactivation/partial resolution on error.

## SimulationScenario.validate

- **Signature:** `+validate() : Boolean`
- **Purpose:** Validate one of the five UC13 scenario input shapes.
- **Inputs:** No explicit arguments; type/parameters and the candidate captured snapshot supplied by SimulationEngine's validation context.
- **Output:** Boolean indicating structurally and referentially valid scenario input.
- **Preconditions:** Snapshot context is available for target IDs, point counts and fleet size.
- **Algorithm:** Require a declared ScenarioType, existing hub, positive duration and exactly the matching bounded parameter described in the catalog. Check partial failures are non-empty and fewer than all target-hub points; validate all referenced IDs against the snapshot.
- **Postconditions:** No execution or live-state changes; validation covers MetroSurge, FullParking, ChargingDemandSurge, PartialChargerFailure and VehicleClustering.
- **Errors:** Invalid input yields false with validation diagnostics at the service boundary; MissingSnapshotContext is a service/context error rather than a fabricated valid scenario.

## SimulationRun.complete

- **Signature:** `+complete(result : SimulationResult) : void`
- **Purpose:** Attach validated metrics/recommendations to successful isolated execution (UC13/UC14).
- **Inputs:** One result with finite success rate [0,1], non-negative average wait/count and exclusively owned recommendation records.
- **Output:** void.
- **Preconditions:** Run is Running with one validated scenario and immutable snapshot, no existing result; supplied result is not attached to another run.
- **Algorithm:** Validate metric bounds and ownership; atomically attach result to this run and set Completed. Zero attempts/waits use the catalog's zero reporting convention. Failed execution follows the SimulationEngine failure path, sets Failed and never calls complete().
- **Postconditions:** Completed run has exactly one result; Pending/Failed runs still have none. Snapshot/live resources remain unchanged. Recommendation acceptance requires separate live-service validation.
- **Errors:** InvalidResult, ResultAlreadyOwned or InvalidTransition; retain prior run state on validation failure; execution failure preserves run/snapshot with no result.

## Inherited operations and intentional empty compartments

| Concrete class | Inherited operation descriptions |
| --- | --- |
| ElectricBicycle | [updateBattery](#electricvehicleupdatebattery), [isRentable](#electricvehicleisrentable); no override |
| ElectricMotorcycle | [updateBattery](#electricvehicleupdatebattery), [isRentable](#electricvehicleisrentable); no override |
| VehicleReservation | [cancel](#reservationcancel), [expire](#reservationexpire); calculateExpiry is overridden above |
| ParkingReservation | [cancel](#reservationcancel), [expire](#reservationexpire); calculateExpiry is overridden above |

SimulationResult and CoordinationRecommendation select no methods. No constructor, getter, setter, service API or support-value operation is silently implied to be displayed.

## Review corrections — 2026-11-03

- Trip requires one retained VehicleReservation; a reservation still yields at most one Trip.
- ParkingReservation identifies its booked vehicle, independently of current slot occupancy.
- TransferOrder owns explicit current destination-slot holds; cancellation never releases another owner's allocation.
- ChargingPoint records power held before activation and during uncertain stop/start; session power is historical and never double counted.
- ChargingSession.stop accepts an explicit reason; UserStop does not automatically requeue.
- VehicleReservation.pickupClaimed blocks expiry/cancellation races until reconciliation. Supporting enum values follow SC01–SC03.

## Reviewed gap acceptance cases

| Case | Required model behavior |
|---|---|
| Requests for 80% and 100%, both starting at 40% | Persist distinct targetBatteryPercent values; battery 80 satisfies only the first. |
| Reserved port, allocated power, zero sessions | allocationOwner identifies the request; a different request cannot cancel or release that allocation. |
| Start/stop outcome uncertain | Retain owner and budget until physical state is reconciled; retries do not create a second owner. |
| Owner stopped, unplug not yet confirmed | Power may be zero and request Cancelled; preserve ownership of the connector until safe release. |
| Trip incident followed by another trip on the same vehicle | Preserve reportedTrip, reporter, description and reportedLocation from the original report. |
| Charger sensor alert or pre-pickup damage | No Trip is required; automatic alerts may have no reporter. |
