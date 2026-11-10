# Mobility and Simulation — Minh

Stages 1–3 implement UC01–05 and UC13–14. This branch builds on Operations commit `b78c4b6` from [PR #9](https://github.com/YdtTran/software-engineerning/pull/9), which was still open during the branch audit. Operations provides the demo server, authentication, SQLite adapter and physical inventory. Keep this dependency visible when reviewing or merging Minh's commits.

## Discovery API

Mount the module at `/api/v1`, after trusted authentication middleware:

| Method | Path | Query | Response |
|---|---|---|---|
| GET | `/hubs` | Optional `q` | `{data: [{id, name, location}]}` |
| GET | `/hubs/:hubId/vehicles` | Optional `type` | `{data: [{id, vehicleType, batteryPercent}]}` |

Both User and Operator can read these endpoints. The demo app uses session cookies; actor headers are never authentication. No Idempotency-Key is needed for these read-only requests.

`q` searches hub names and IDs, ignores case, trims surrounding whitespace and normalizes Unicode. Missing or blank `q` returns all hubs. No matches, or an existing hub with no eligible vehicles, returns `200` with `{data: []}`. An unknown hub returns `404 HUB_NOT_FOUND`.

`type` accepts `electric_bicycle` or `electric_motorbike`. Repeated parameters, non-string queries and unsupported types return `400 INVALID_INPUT`. Errors use the shared `{error: {code, message, details}}` envelope.

The current Hub schema stores only ID and name. `location` is therefore `null` until Operations supplies verified location data. Do not invent coordinates or infer them from prototype map positions. Location schema and map integration remain open.

## Module boundary

`createMobilitySimulationModule({inventory})` accepts a read-only inventory interface exposing `listHubs()`, `getHubById(id)` and `getAvailableVehicles(hubId, type)`.

- `domain/discovery.js` validates discovery input and defines module errors.
- `application/discovery-service.js` coordinates reads and projects public response fields.
- `api/discovery-router.js` adapts HTTP, enforces User/Operator access and maps expected errors.
- `index.js` composes the module without importing Operations implementations.

The server composition root creates Operations once and injects its inventory interface into Mobility. Vehicle eligibility, active holds and incident isolation remain Operations' responsibility. Mobility issues no direct SQL against physical inventory.

For independent development, `tests/fixtures/discovery-fixtures.js` provides an in-memory read adapter. The integration test uses the real Operations adapter, a separate temporary SQLite file and real demo sessions.

## Verify

From the repository root, with Node.js 22 installed:

```powershell
npm ci --prefix app
npm run test:mobility --prefix app
```

The six tests cover standalone discovery, Vietnamese query normalization, filters, missing hubs, empty results, malformed queries, User/Operator permissions, forged headers and real inventory eligibility. The composed test also checks logout, Operations role separation and that discovery leaves vehicle inventory unchanged.

Run `npm test --prefix app` for the combined suite. See the [implementation plan](../../../../docs/architecture/MINH_IMPLEMENTATION_PLAN.md) for baseline failures and remaining stages.

## Rental lifecycle — Stage 2

Migration 0008 adds reservations, trips, durable idempotency outcomes, device commands and local outbox events, using the existing demo SQLite client. This extends the demo implementation; it does not select a production driver or a notification provider.

The owning User can create/read/cancel a reservation, pick up the reserved vehicle and read/return the trip through the [HTTP contracts](../../../../docs/architecture/API_CONTRACTS.md). The same SQLite transaction includes business records, inventory changes and successful idempotency outcomes. Input hashes ignore JSON property order. Outcomes are retained without an automatic deletion policy.

Pickup persists a command and claims the reservation before unlock. Return claims destination capacity before arrival/lock I/O. Both perform I/O outside the write transaction, use the original command ID for at most three execute attempts and persist confirmation before finalizing. Uncertain commands keep their claims. GET includes the pending command ID; retrying the original payload/key uses recorded confirmation or read-only `device.inspect(command)` for reconciliation. A device adapter must return matching command/vehicle/Hub IDs, plus unlock confirmation for pickup, or arrival/lock/slot/battery evidence for return. Optional measured `distanceKm` becomes the trip distance; otherwise distance is `null`.

The explicit local `SimulatedDock` provides demo acknowledgements without physical hardware. Enable it on the demo server with `DEMO_SIMULATED_DEVICES=1`. Do not expose device acknowledgements as client-controlled HTTP fields.

The server scans unclaimed reservations every 30 seconds. Expiry and uncertain-device events are committed to `mobility_events`; a future notification/incident-outbox consumer must deduplicate by command/record ID. Pickup claims are never released just because the original ticket expires. Unresolved physical ambiguity still requires trusted reconciliation; there is no public endpoint to force-release a claim.

Operations now receives a trusted trip reader at composition, so UC11A verifies real trip ownership without circular module imports. Purpose-specific `claimVehicleReturn` and `confirmVehicleReturn` protect the shared destination capacity without consuming private parking commitments.

The lifecycle tests cover contention, rollback, ownership, cancellation versus pickup, expiry, device retries/reconciliation, duplicate returns, future parking commitments, low-battery classification and the complete authenticated HTTP workflow including incident reporting.

## Simulation — Stage 3

Operators can POST `/api/v1/simulations` and reopen a result using GET `/api/v1/simulations/:id`. Each POST requires an Idempotency-Key. Results include inputs, snapshot time, baseline/projected metrics, recommendations, model version and assumptions. Migration 0009 persists both the immutable input snapshot and the result. The engine is a bounded discrete-event demo with seeded request arrivals; it does not mutate live inventory or automatically apply recommendations.

The composition root supplies `snapshotProvider.capture()`, reading inventory, rental eligibility and usable capacity in one shared SQLite transaction. Independent tests inject a fixed snapshot through the same port. The snapshot explicitly includes `availableVehicleIds` and `availableSlotIds` so the engine cannot mistake a private, committed or faulted resource for usable capacity.

### Parameter schema: demo-des-v1

These are explicit demo modeling choices. They do not change business eligibility or physical resource policies.

| Parameter | Range / default |
|---|---|
| `durationMinutes` | Required integer 1–240 |
| `demandPerHour` | Required 0–1000 rental requests per selected Hub per hour |
| `seed` | Integer 0–4294967295; default 1 |
| `tripMinutes` | 1–240; default 15 |
| `chargeMinutes` | 1–240; default 45 |
| `batteryDrainPerTrip` | 0–100 percentage points; default 10 |

Select one to ten distinct `hubIds`. Additional required fields depend on `scenario`:

| Scenario | Required parameters | Change relative to baseline |
|---|---|---|
| `metro` | `demandMultiplier`: 1–10 | Multiply rental demand at selected Hubs |
| `parking` | `occupiedPercent`: 0–100 | Reduce initial free capacity to the requested occupancy floor |
| `charging-demand` | `chargingMultiplier`: 1–10; `chargingRequestsPerHour`: 0–1000; `powerBudgetKw`: 0–1000; `portPowerKw`: 0.1–100 | Increase external charging demand |
| `charging` | `failedPorts`: integer 0–100, not exceeding available ports at each Hub; same charging rate/power fields as above | Remove those ports from simulated capacity |
| `clustering` | `targetHubId`: selected Hub; `returnBias`: 0–1 | Bias trip destinations toward that Hub |

Power budget is a scenario input because the current inventory schema has no electrical rating. The simultaneous charging limit is the smaller of usable ports and floor(power budget / port power). Other scenarios report `peakPowerKw: null` rather than inventing an electrical value. Unknown parameters are rejected. Expected arrival count is capped at 40,000; the event loop also has a hard processing ceiling.

Rental waiting time is averaged over served rentals; unserved requests at the end of the horizon are reported as rejected trips. Full destinations reject modeled returns. Existing active trips and charging completion times are not forecast because their authoritative time data is unavailable. Geographic travel times, private-parking charging interactions and calibrated arrival distributions remain outside this model. All stored results retain these assumptions.

Recommendations are data only: redistribute vehicles, reroute to another Hub, inspect failed ports or reschedule charging. Their application requires normal live checks by Operations/Parking and Charging. Frontend integration is the next stage.
