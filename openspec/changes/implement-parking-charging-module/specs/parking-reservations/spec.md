# Spec Delta

## Purpose

Manages private-vehicle parking slot availability queries, immediate and advance interval commitments, reservation cancellations, verified check-in and check-out lifecycles, overstay fee calculation, overstay conflict handling, and automated hold expiration.

## ADDED Requirements

### Requirement: Compatible parking slot availability query
The system SHALL return compatible parking slots at a requested hub filtered by the requested pool (`immediate` or `advance`) and, for advance bookings, a valid half-open interval `[plannedArrival, plannedCheckout)` with `plannedArrival` at or after the current server time and `plannedCheckout` strictly after `plannedArrival`.

#### Scenario: Advance availability permits adjacent non-overlapping intervals
- **WHEN** an authenticated user queries `GET /api/v1/hubs/{hubId}/parking-availability` for pool `advance` with `[11:00, 12:00)` on a hub where a slot already holds an active commitment for `[10:00, 11:00)`
- **THEN** the system returns HTTP 200 and includes that slot as available

#### Scenario: Overlapping interval or invalid time range is excluded or rejected
- **WHEN** an authenticated user queries advance availability with `[10:30, 11:30)` on a slot committed for `[10:00, 11:00)`
- **THEN** the system excludes that slot from available results, and if `plannedCheckout <= plannedArrival` returns HTTP 422

### Requirement: Atomic parking reservation creation
The system SHALL allow an authenticated user who owns the specified private vehicle to reserve one compatible slot in the requested pool atomically, transitioning the ticket to `Reserved`, issuing a ticket code and server-computed arrival deadline, and rejecting conflicting or duplicate concurrent requests without partial writes.

#### Scenario: Successful immediate reservation
- **WHEN** an authenticated vehicle owner posts `POST /api/v1/parking-reservations` for an available `immediate` slot with an `Idempotency-Key`
- **THEN** the system returns HTTP 201 with status `Reserved`, a ticket code, and `holdExpiresAt`, holds the slot without starting physical occupancy, and replays the exact 201 payload if retried with the same `Idempotency-Key` and body

#### Scenario: Concurrent overlapping reservation conflict
- **WHEN** two users concurrently submit `POST /api/v1/parking-reservations` for overlapping intervals on the same advance slot
- **THEN** exactly one request commits with HTTP 201 and the competing request fails with HTTP 409 without modifying the winning commitment

#### Scenario: Unowned private vehicle or pool mismatch
- **WHEN** a user submits a parking reservation for a private vehicle they do not own or specifies a slot belonging to the opposite pool
- **THEN** the system rejects the request with HTTP 403 for unowned vehicles or HTTP 422 for pool mismatch

### Requirement: Pre-check-in reservation cancellation
The system SHALL allow the owning user to cancel a `Reserved` parking reservation that has not checked in, enforcing a minimum 10-minute lead time before `plannedArrival` for advance reservations, releasing only that reservation's hold while retaining history and incurring zero cancellation fee.

#### Scenario: Valid cancellation releases hold and preserves history
- **WHEN** the owning user calls `POST /api/v1/parking-reservations/{id}/cancel` on an unfulfilled `immediate` reservation or an `advance` reservation more than 10 minutes before `plannedArrival`
- **THEN** the system returns HTTP 200 with status `Cancelled`, releases only that reservation's slot commitment, and keeps the reservation record

#### Scenario: Advance cancellation inside 10-minute cutoff is rejected
- **WHEN** the owning user attempts to cancel an `advance` reservation less than 10 minutes before `plannedArrival`
- **THEN** the system rejects the request with HTTP 422 and keeps the reservation `Reserved`

### Requirement: Verified private-vehicle check-in
The system SHALL allow the owning user or an assisting operator (recording operator identity) to check in a `Reserved` reservation within its arrival window (`holdExpiresAt` for immediate, or `[plannedArrival, min(plannedArrival + lateArrivalGrace, plannedCheckout))` for advance) after physical/simulated arrival verification, atomically marking the reservation `Fulfilled` and creating exactly one active parking occupancy.

#### Scenario: Valid check-in starts occupancy without initiating charging
- **WHEN** an authorized user or assisting operator calls `POST /api/v1/parking-reservations/{id}/check-in` with matching `hubId` and `ticketCode` inside the valid arrival window and arrival is confirmed
- **THEN** the system returns HTTP 200, transitions the reservation to `Fulfilled`, records `actualCheckInTime`, creates one active occupancy on the slot, and records the operator ID when assisted

#### Scenario: Early or expired check-in is rejected
- **WHEN** a user attempts to check in before `plannedArrival` or after the arrival deadline
- **THEN** the system rejects the check-in with HTTP 409 or HTTP 422 and leaves both the reservation and slot capacity intact

### Requirement: Overstay conflict handling under LIM-01
When a check-in target slot is still physically occupied by an overstaying vehicle, the system SHALL reject the check-in with `409 SLOT_OCCUPIED`, preserve the existing occupancy and both reservations, return compatible alternative slot or hub suggestions when available, and escalate to operations when no alternative exists; if an operator later issues a replacement booking, the system SHALL retain the conflicted ticket and create a linked replacement reservation.

#### Scenario: Slot occupied by overstaying vehicle triggers LIM-01 response
- **WHEN** a valid reservation attempts check-in on a slot still occupied past the previous occupant's interval
- **THEN** the system returns HTTP 409 with error code `SLOT_OCCUPIED`, keeps the existing occupancy and both reservations unchanged, records the conflict event, and includes compatible alternative slots/hubs or marks the conflict for operator follow-up

#### Scenario: Operator replacement preserves original conflicted reservation
- **WHEN** an operator resolves a `LIM-01` conflict by assigning an alternative compatible slot
- **THEN** the system retains the original reservation with its conflict marker and creates a new replacement reservation linked to the original reservation ID

### Requirement: Verified parking check-out and BR08b overstay fee
The system SHALL allow the owning user or an assisting operator to check out an active occupancy only after verifying charging is stopped and unplugged and the vehicle has physically departed, atomically ending the occupancy, computing `extraFee` under `BR08b` when `scheduledCheckoutTime` is present (and setting `finalFee` to `null` for immediate visits lacking `scheduledCheckoutTime`), and preserving `Fulfilled` history and future slot commitments.

#### Scenario: Blocked checkout while charging is active or request is queued
- **WHEN** a user requests `POST /api/v1/parking-occupancies/{id}/check-out` while an active or stopping charging session exists on the vehicle or while a queued charging request exists without `cancelQueuedCharging = true`
- **THEN** the system rejects checkout with HTTP 409, keeps the slot `Occupied`, and instructs the caller to stop charging or confirm cancellation of the queued request

#### Scenario: Advance checkout calculates BR08b overstay fee and preserves future bookings
- **WHEN** an advance occupancy with `scheduledCheckoutTime` of 10:00 and 15-minute overstay grace checks out with verified departure at 10:16 while another future reservation exists on the same slot
- **THEN** the system returns HTTP 200, records `actualCheckoutTime` and 1 hour of `overstayRatePerHour` as `finalFee`, ends only the current occupancy, and leaves future reservations intact

#### Scenario: Immediate checkout without scheduledCheckoutTime returns null finalFee
- **WHEN** an immediate parking occupancy created without an agreed `scheduledCheckoutTime` completes verified checkout
- **THEN** the system ends the occupancy and returns HTTP 200 with `finalFee: null`

### Requirement: Automated expiration of overdue unfulfilled holds (FR-NI01)
The system SHALL periodically scan unfulfilled `Reserved` parking reservations whose `expiresAt` has elapsed (`now >= expiresAt`), transition them to `Expired`, and release only their own slot commitment without modifying any active physical occupancy or other future reservations.

#### Scenario: Overdue reservation expires without affecting physical occupancy
- **WHEN** the expiry scan runs at `now >= expiresAt` for an unfulfilled reservation on a slot that is currently occupied by another visit or holds a later commitment
- **THEN** the system marks only the overdue reservation `Expired` and leaves the active occupancy and later commitments untouched
