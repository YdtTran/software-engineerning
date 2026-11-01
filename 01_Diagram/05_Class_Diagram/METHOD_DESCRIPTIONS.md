# Method descriptions

All 18 declared operations in the [catalog](CLASS_CATALOG.md) and [diagram sources](PLANTUML_CLASS.md) are specified here, including the abstract operation and its two overrides. These are language-neutral contracts, not executable code. Error names below denote failure categories; they do not choose exception versus error-result transport.

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
- **Output:** True when point is Available, idle and compatible; vehicle is at the point's hub, not traveling/faulty/in maintenance, and has no conflicting allocation or unresolved incident.
- **Preconditions:** Point/vehicle allocation and incident context is current. Private ownership is allowed.
- **Algorithm:** Compare connector identifiers and operational state; verify local availability and location. ChargingScheduler additionally checks request entitlement, neededBy and aggregate hub power before assignment.
- **Postconditions:** No power allocation/session creation. A compatible but faulty point returns false.
- **Errors:** InvalidVehicle/InconsistentState for invalid context; normal incompatibility/unavailability returns false.

## Reservation.cancel

- **Signature:** `+cancel() : void`
- **Purpose:** Cancel an active vehicle/parking hold (UC03/UC06).
- **Inputs:** No explicit arguments; owning service provides authenticated booker/operator context and hold references.
- **Output:** void.
- **Preconditions:** Cancellation is authorized. Status is Pending/Reserved or already Cancelled.
- **Algorithm:** Already Cancelled is an idempotent no-op. Otherwise atomically check active status, set Cancelled and release only the resource hold owned by this reservation. Trigger notification after commit.
- **Postconditions:** Reservation history remains; resource availability is recomputed against faults/occupancy and other allocations. Never free a resource already occupied by a fulfilled booking.
- **Errors:** Unauthorized at service boundary; InvalidTransition for Fulfilled/Expired; AllocationConflict if hold ownership changed. No partial cancellation/release.

## Reservation.expire

- **Signature:** `+expire(now : DateTime) : Boolean`
- **Purpose:** Apply the FR-NI01 overdue transition, distinct from calculating the deadline.
- **Inputs:** A valid current instant now.
- **Output:** True exactly when this call transitions an active hold to Expired; false otherwise.
- **Preconditions:** expiresAt was initialized from calculateExpiry(); ReservationHub invokes the background scan every 30 seconds with a consistent allocation view.
- **Algorithm:** If now < expiresAt or status is not Pending/Reserved, return false. Otherwise atomically recheck status/hold ownership, set Expired and release only that still-active hold. Notify after commit.
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

- **Signature:** `+stop(at : DateTime) : void`
- **Purpose:** Safely stop charging and retain session history (UC07/UC11/UC12).
- **Inputs:** Confirmed stop instant at; stopping reason/target status determined by calling service context.
- **Output:** void.
- **Preconditions:** Session is Active; at >= startedAt; stop/de-energization is confirmed by physical/simulated integration. Service knows whether requested charging completed or was interrupted.
- **Algorithm:** Atomically record stoppedAt; set Completed when demand is satisfied, otherwise Interrupted; release point/session power allocation and update request to Completed when satisfied, Cancelled for a user-requested early stop, or Queued for a technical interruption. A user cancellation must not automatically restart charging. Preserve a faulted point's isolation status.
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
- **Preconditions:** Status is Open/Investigating; at >= reportedAt; target XOR holds; authorized operator has verified recovery and required maintenance handling.
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
