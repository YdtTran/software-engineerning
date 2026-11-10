# Mobility and Simulation — Minh

Stage 1 implements UC01–02 only. This branch builds on Operations commit `b78c4b6` from [PR #9](https://github.com/YdtTran/software-engineerning/pull/9), which was still open during the branch audit. Operations provides the demo server, authentication, SQLite adapter and physical inventory. Keep this dependency visible when reviewing or merging Minh's commits.

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

UC03–05, UC13–14 and frontend integration are subsequent stages. No Mobility schema migration or production driver decision is introduced in Stage 1.
