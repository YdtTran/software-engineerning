# Spec Delta

## Purpose

Manages hub charging queue monitoring, priority ranking, dynamic urgent and fault-triggered reprioritization, compatible port and Hub power-budget allocation under BR15, priority yield, and operator schedule overrides.

## ADDED Requirements

### Requirement: Hub charging schedule visibility
The system SHALL allow an authenticated operator to query `GET /api/v1/hubs/{hubId}/charging-schedule`, returning the hub's configured `powerLimitKW`, current allocated power total, prioritized queue of `Queued` requests, time windows, and active or reserved charging point allocations.

#### Scenario: Operator retrieves hub schedule and power usage
- **WHEN** an authenticated operator requests `GET /api/v1/hubs/{hubId}/charging-schedule`
- **THEN** the system returns HTTP 200 with the hub's queue ordered by priority, port statuses, active allocations, and `powerLimitKW` utilization

#### Scenario: Non-operator role is forbidden from viewing hub schedule
- **WHEN** a user without the `Operator` role requests `GET /api/v1/hubs/{hubId}/charging-schedule`
- **THEN** the system returns HTTP 403 `FORBIDDEN_OPERATION`

### Requirement: Priority queue ranking and dynamic reprioritization (FR-NI04)
The system SHALL rank queued charging requests by urgency (`batteryAtRequest < 10%` highest, then `< 20%`, shared fleet with upcoming reservation, and private vehicles ordered by earliest `neededBy`), preserve submission order on equal priority, and trigger immediate queue reprioritization when a `< 10%` request is submitted or a charging point enters `Fault`.

#### Scenario: Critical battery request jumps ahead of normal queue
- **WHEN** a user submits a charging request with `batteryAtRequest: 8` while requests at `45%` are queued
- **THEN** dynamic reprioritization places the `8%` urgent request ahead of normal requests in the hub queue

#### Scenario: Tie-breaking preserves FIFO admission order
- **WHEN** two private-vehicle charging requests have equal priority level and identical `neededBy` timestamp
- **THEN** the earlier submitted request ranks ahead of the later request

### Requirement: Atomic port and power budget allocation (BR15)
The system SHALL allow an operator (or scheduler) via `POST /api/v1/charging-requests/{id}/allocate` to atomically assign a compatible idle point at the same hub for a valid window `[startAt, endAt)` and `powerKw <= point.ratedPowerKW`, provided summed allocations across `Reserved`, `Starting`, `Charging`, `Stopping`, and uncertain `Fault` points at that hub do not exceed `hub.powerLimitKW` (`0.85 * ratedPowerKW`), without double-counting active sessions.

#### Scenario: Valid allocation claims port and power budget atomically
- **WHEN** an operator posts `POST /api/v1/charging-requests/{id}/allocate` with a compatible `Idle`/`Available` port at the same hub and `powerKw` within both point rating and remaining `hub.powerLimitKW`
- **THEN** the system returns HTTP 200 with the `allocationId` and transitions the point to `Reserved` with the owning `requestId` bound to it

#### Scenario: Over-budget or incompatible connector allocation is rejected
- **WHEN** an allocation would cause summed active/reserved/uncertain point power at the hub to exceed `hub.powerLimitKW`, exceeds `point.ratedPowerKW`, or selects an incompatible or faulted port
- **THEN** the system rejects the request with HTTP 409 or HTTP 422 without modifying port status or Hub power allocations

#### Scenario: Concurrent allocations competing for remaining Hub power or same port
- **WHEN** two allocations concurrently attempt to claim the same idle port or the last remaining kW of `hub.powerLimitKW`
- **THEN** exactly one allocation commits and the conflicting attempt fails with HTTP 409

### Requirement: Priority yield at 80 percent and fault reassignment
When urgent charging demand arrives with insufficient free port capacity or power budget, the system SHALL initiate a `PriorityYield` stop on an eligible active session whose verified battery is at least 80% only after power-off confirmation, retain unfinished demand as `Queued`, and reassign interrupted `Queued` demand to safe compatible ports when a faulted point is replaced.

#### Scenario: Eligible session yields at 80 percent without losing unfinished demand
- **WHEN** an active session targeting 100% reaches 80% battery while an urgent `< 10%` request is waiting and no idle port or budget is available
- **THEN** the scheduler issues a `PriorityYield` power-off command, transitions the yielded session to `Interrupted` upon ACK, returns remaining demand to `Queued`, and frees power for the urgent request

#### Scenario: Faulted point triggers incident and requeues interrupted demand
- **WHEN** a charging point experiences an electrical fault during `Starting` or `Charging`
- **THEN** the point enters `Fault`, the interrupted request returns to `Queued`, and the scheduler only allocates an alternative compatible safe point

### Requirement: Operator manual schedule override
The system SHALL allow an authenticated operator via `POST /api/v1/hubs/{hubId}/charging-schedule/override` to manually adjust queued request priority ordering for emergency handling while continuing to enforce connector compatibility, point safety state, and `hub.powerLimitKW` limits during allocation.

#### Scenario: Operator overrides queue order without bypassing power safety limits
- **WHEN** an authenticated operator submits a manual priority override for queued requests at a hub
- **THEN** the system returns HTTP 200 with the updated queue ordering and continues to reject any subsequent allocation that violates connector compatibility or `hub.powerLimitKW`
