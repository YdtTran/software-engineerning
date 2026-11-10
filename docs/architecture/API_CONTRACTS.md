# MVP HTTP API contracts

Proposed implementation contract for the [Development View](DECISION.md). Business rules follow the [master specification](../requirements/PROJECT_SPECIFICATION.md) and [lifecycle scenarios](../diagrams/01_Usecase_Diagram/LIFECYCLE_SCENARIOS.md).

## Shared protocol

- Serve JSON under `/api/v1`. Success responses use `{"data": ...}`. Collections return arrays. IDs are opaque strings and timestamps use ISO 8601 with an offset. The server supplies authoritative event times.
- Each request uses a provisioned identity. `U` means User and `O` means operator. Check role and record ownership on the server. A ticket code identifies a record and still requires authorization. Production authentication remains open; the local demo uses server-provisioned accounts and `POST /session` / `DELETE /session` as documented in [app/README.md](../../app/README.md).
- `201` creates a record, `200` returns a read or completed transition. Errors use `{"error":{"code":"SLOT_UNAVAILABLE","message":"Choose another slot.","details":{}}}`. Use `400` for malformed input, `401` for missing identity, `403` for forbidden operations, `404` for missing records, `409` for conflicting state, and `422` for well-formed inputs that violate eligibility or scheduling rules. Use `503 DEVICE_UNCONFIRMED` when required device evidence is unavailable.
- Send `Idempotency-Key` on each business write. Scope it to actor and operation, bind it to the original payload, and return `409 IDEMPOTENCY_KEY_REUSED` for a different payload. Store committed outcomes atomically with the write. Retrying the same command after a timeout returns its recorded result or resumes its unresolved attempt. Concurrent attempts must share one execution. Use the relevant GET to refresh state after reconnecting. Demo session creation and logout are authentication operations and do not use an idempotency key.
- Route tables list request fields and minimum response fields. Fields in brackets are optional. Action names map to separate POST routes. Roles and use-case IDs apply to every operation in their row.

## 1. Mobility and Simulation

### Mobility

| UC | Role | Method and path | Request → response |
|---|---|---|---|
| UC01 | U, O | GET /hubs | Optional `q` → hub IDs, names and locations |
| UC02 | U, O | GET /hubs/{hubId}/vehicles | Optional `type` → available vehicle IDs, types and battery percentages |
| UC03 | U | POST /vehicle-reservations | `vehicleId, hubId` → reservation ID, vehicle ID, status, ticket code, expiry |
| UC03 | U | GET /vehicle-reservations/{id} | → reservation record |
| UC04 | U | POST /vehicle-reservations/{id}/pickup | `vehicleCode` → trip ID, vehicle ID, status, start time |
| UC05 | U | POST /trips/{id}/return | `hubId, slotId, confirmed` → trip ID, status, end time, distance |
| UC04–05 | U | GET /trips/{id} | → trip record |

Recheck vehicle availability at reservation and verify the unexpired reservation and matching vehicle at pickup. Return checks destination capacity and records the trip closure and vehicle placement together. Return can leave the vehicle `Needs Charging`. The trip carries no MVP rental charge.

### Simulation

| UC | Role | Method and path | Request → response |
|---|---|---|---|
| UC13 | O | POST /simulations | `scenario, hubIds, parameters` → result ID, status, input snapshot time |
| UC14 | O | GET /simulations/{id} | → inputs, baseline metrics, projected metrics, and recommendations |

Use the five scenarios from UC13. Validate scenario-specific parameters before running. Compute against a captured network snapshot and persist the result for later viewing. Applying recommendations requires normal operator actions through the owning module.

## 2. Parking and Charging

| UC | Role | Method and path | Request → response |
|---|---|---|---|
| UC06-S1 | U | GET /hubs/{hubId}/parking-availability | `privateVehicleId, pool, [plannedArrival, plannedCheckout]` → compatible slot IDs |
| UC06-S1 | U | POST /parking-reservations | `hubId, slotId, privateVehicleId, pool, [plannedArrival, plannedCheckout]` → reservation ID, status, ticket code, arrival deadline and applicable hold expiry or planned interval |
| UC06-S1 | U | POST /parking-reservations/{id}/cancel | → reservation ID and status |
| UC06 | U, O | GET /parking-reservations/{id} | → reservation record and associated occupancy ID when present |
| UC06-S2 | U, O | POST /parking-reservations/{id}/check-in | `hubId, ticketCode` → reservation ID, status, occupancy ID, actual check-in time |
| UC06-S3 | U, O | POST /parking-occupancies/{id}/check-out | `[cancelQueuedCharging]` → occupancy ID, actual checkout time, final fee if calculable |
| UC06-S3 | U, O | GET /parking-occupancies/{id} | → occupancy record |
| UC07 | U | POST /charging-requests | `occupancyId, targetBatteryPercent, [requestedStart]` → request ID and status |
| UC07 | U, O | GET /charging-requests/{id} | → request status and allocation/session IDs when present |
| UC07A | U | POST /charging-sessions/{id}/stop | → session ID, status, stop time, request status |
| UC07A | U, O | GET /charging-sessions/{id} | → session status and connector status |
| UC12 | O | GET /hubs/{hubId}/charging-schedule | → queue, time windows, port and power allocations |
| UC12 | O | POST /charging-requests/{id}/allocate | `portId, startAt, endAt, powerKw` → allocation ID and request status |

- BR08 and BR08a govern interval conflicts, pool compatibility, arrival and cancellation windows. Check-in moves the reservation to `Fulfilled` and creates exactly one occupancy after verified arrival. Record the operator identity on assisted actions.
- Use `409 SLOT_OCCUPIED` for LIM-01. Preserve occupancy and commitments. Report the conflict to Operations and return compatible alternatives when available. Checkout requires verified departure and safe charging disconnection. End only the current occupancy, preserve future commitments and record BR08b fees when calculable.
- UC07 records demand. UC12 checks priority, compatibility, time, port availability and hub power limits. Device activation confirmation creates the active session. Stop requires power-off confirmation before releasing power and disconnection confirmation before releasing the port. Parking occupancy persists. Reuse the same device command ID for the lifecycle's three-attempt limit and escalate an unconfirmed stop. Technical interruption can requeue the request under BR09.

## 3. Operations

| UC | Role | Method and path | Request → response |
|---|---|---|---|
| UC08 | O | GET /operations/hubs | → hub IDs, capacity, battery and charging summaries, alerts and observation times |
| UC09 | O | GET /operations/resources | Optional `hubId, kind` → resource IDs, kinds and operational states |
| UC09 | O | POST /operations/resources | `kind, hubId, attributes` → resource record |
| UC09 | O | PATCH /operations/resources/{id} | Kind-specific mutable attributes → resource record |
| UC10 | O | POST /transfers | `sourceHubId, destinationHubId, vehicleIds, destinationSlotIds` → transfer ID and `Planned` status |
| UC10 | O | GET /transfers/{id} | → transfer state, vehicle IDs and destination holds |
| UC10 | O | POST /transfers/{id}/depart | → transfer ID and `InTransit` status |
| UC10A | O | POST /transfers/{id}/arrive | `observedVehicleIds, [replacementDestinationHubId, replacementSlotIds]` → transfer ID and `Completed` status |
| UC10B | O | POST /transfers/{id}/cancel | `reason` → transfer ID and `Cancelled` status |
| UC11A | U | POST /trips/{id}/incidents | `description` → incident ID and status |
| UC11 | O | GET /incidents | Optional `status, hubId` → incident records |
| UC11 | O | POST /incidents/{id}/handle | `resourceId, technicianId, scheduledAt` → incident and maintenance assignment IDs and statuses |

Reserve eligible vehicles and compatible destination capacity when planning a transfer. Recheck readiness at departure. Cancel and depart compete on `Planned`. Arrival requires the complete vehicle set. A valid replacement moves destination holds atomically with arrival. A report from an active trip preserves the trip and blocks unsafe reallocation. Incident handling records isolation and maintenance assignment, with physical intervention gated by safe state.

## Remaining schema decisions

This is a Markdown contract for team implementation. Before freezing a machine-readable schema, agree the authentication mechanism, UC09 kind-specific fields, UC13 parameter and metric schemas, status enums not defined in the domain sources, and idempotency retention. The lifecycle leaves the expected checkout time for immediate parking open. Keep device verification behind simulated adapters until a hardware protocol is selected.
