# Spec Delta

## Purpose

Manages user charging request intake and pre-connection cancellation, safe device-acknowledged charging session activation and stopping, separation of power release from connector unplugging, and safety transition verification for charging points.

## ADDED Requirements

### Requirement: Charging request validation and queueing
The system SHALL accept `POST /api/v1/charging-requests` only for an authenticated user who owns an active parking occupancy (or eligible parked vehicle) at the hub, validating `targetBatteryPercent` as an integer within `[batteryAtRequest, 100]` and strictly above `batteryAtRequest`, recording the demand as `Queued` without immediately creating an active session.

#### Scenario: Valid charging request enters queue
- **WHEN** an authenticated user with an active parking occupancy at 35% battery posts `POST /api/v1/charging-requests` with `targetBatteryPercent: 80` and `Idempotency-Key`
- **THEN** the system returns HTTP 201 with the `requestId` and status `Queued`, and does not create an active charging session

#### Scenario: Invalid target battery or unowned occupancy is rejected
- **WHEN** a user submits a charging request with `targetBatteryPercent` equal to or below current battery, above 100, or referencing another user's occupancy
- **THEN** the system returns HTTP 422 for invalid target battery or HTTP 403 for unowned occupancy

### Requirement: Pre-connection charging request cancellation
The system SHALL allow the owning user to cancel a charging request via `POST /api/v1/charging-requests/{id}/cancel` while its status is `Queued` and no physical charging session is energized, transitioning the request to `Cancelled` and releasing any non-energized reservation on a port while keeping parking occupancy active.

#### Scenario: Queued request is cancelled without ending parking
- **WHEN** the owning user cancels a `Queued` charging request that has not been energized
- **THEN** the system returns HTTP 200 with request status `Cancelled`, clears any pending unenergized port hold owned by that request, and leaves the parking occupancy `Occupied`

#### Scenario: Cancellation of an actively charging session via request cancel is rejected
- **WHEN** a user calls `POST /api/v1/charging-requests/{id}/cancel` while a charging session is `Active` or `Stopping`
- **THEN** the system returns HTTP 409 directing the caller to stop the active session via `UC07A`

### Requirement: Command-ID device activation and retry escalation
The system SHALL persist a durable `commandId` before issuing simulated or hardware power-on commands outside database write transactions, retry up to 3 attempts using the same `commandId`, create an `Active` charging session only upon matching power-on confirmation, and transition the point to `Fault` with an incident while retaining uncertain power allocation if 3 attempts fail.

#### Scenario: Matching power-on confirmation activates session
- **WHEN** an allocated charging point in `Starting` receives a matching `powerOnConfirmed` device acknowledgement within 3 command attempts
- **THEN** the system transitions the point to `Charging`, transitions the request to `Charging`, and creates one `Active` charging session

#### Scenario: Three power-on timeouts isolate point without creating session
- **WHEN** power-on fails to receive confirmation after 3 attempts with the same `commandId`
- **THEN** the system transitions the point to `Fault`, opens an operational incident, retains the uncertain allocation until reconciliation, and creates no `Active` session

### Requirement: Confirmed safe charging stop (UC07A)
The system SHALL handle `POST /api/v1/charging-sessions/{id}/stop` by issuing a power-off command with a durable `commandId` (up to 3 retries), releasing Hub power allocation only after power-off confirmation, setting session status to `Completed` if verified battery meets target or `Interrupted` otherwise, updating the request per stop reason, and keeping parking occupancy intact.

#### Scenario: User-requested early stop cancels request without automatic requeue
- **WHEN** the owning user stops an `Active` session before `targetBatteryPercent` is reached and the device confirms power-off
- **THEN** the system returns HTTP 200, sets the session to `Interrupted` with reason `UserStop`, updates the request to `Cancelled`, releases the allocated Hub power once, and leaves the parking slot `Occupied`

#### Scenario: Target reached or scheduler yield completes or requeues request
- **WHEN** power-off is confirmed with verified battery >= `targetBatteryPercent`, or after a `PriorityYield` / `TechnicalFault` interruption below target
- **THEN** the system sets the request to `Completed` when target is met or `Queued` for `PriorityYield` / `TechnicalFault`, while releasing the power allocation once

#### Scenario: Unconfirmed power-off fails with 503 and quarantines point
- **WHEN** power-off confirmation cannot be obtained after 3 attempts with the same `commandId`
- **THEN** the system returns HTTP 503 `DEVICE_UNCONFIRMED`, transitions the point to `Fault`, opens an incident, and does not report stop success or free power

### Requirement: Connector unplug separation
After power-off is confirmed (`Complete` / awaiting unplug), the system SHALL retain the connector ownership link until physical/simulated unplug confirmation arrives with no fault, releasing the charging point back to `Idle` / `Available` independently of parking checkout.

#### Scenario: Unplug releases charging point while parking remains occupied
- **WHEN** a stopped point in `Complete` receives `unplugConfirmed` with no active fault
- **THEN** the system clears connector ownership, transitions the point to `Available`, and leaves the vehicle's parking occupancy `Occupied` until parking check-out

### Requirement: Charging point transition safety guard
The system SHALL enforce `SC02` charging point lifecycle transitions for Operations inventory updates by verifying persisted device acknowledgement, connector ownership, absence of unresolved incidents on reactivation, and zero active allocation before permitting transitions to `Available`, `Reserved`, `Starting`, `Charging`, `Stopping`, `Complete`, `Fault`, `Repair`, or `Retired`.

#### Scenario: Guard blocks unauthorized reactivation without confirmed safety verification
- **WHEN** Operations attempts to transition a charging point from `Fault` or `Repair` to `Available` while an allocation or unresolved incident exists or safety test confirmation is missing
- **THEN** the charging safety guard rejects the transition inside the active transaction
