# Four-module MVP development guide

Build one Express application with SQLite repository adapters. Treat the four modules as independently implementable and testable workstreams in the same deployment. Use the [HTTP contracts](API_CONTRACTS.md) for UI integration and the [Development View](DECISION.md) for layer responsibilities.

Minh's runnable UC01–05/UC13–14 implementation and desktop/mobile verification are documented in the [demo walkthrough](MINH_DEMO_GUIDE.md) and [stage plan](MINH_IMPLEMENTATION_PLAN.md).

| Module | Owner | Owns | Collaborates through |
|---|---|---|---|
| UX/UI | Ý | Mobile User, mobile Operator and desktop Operator experiences | HTTP contracts and mock responses |
| Mobility and Simulation | Minh | Hub discovery, vehicle reservations, pickups, trips and returns (UC01–05), plus scenario execution and saved results (UC13–14) | Inventory interface and immutable network snapshots |
| Parking and Charging | Triết | Parking reservations, occupancy, charging requests, allocations and sessions (UC06, UC07, UC12) | Inventory queries and mutations for physical resources, device verification and incident intake |
| Operations | Duy | Hub/vehicle/slot/port inventory, monitoring, transfers, incidents and maintenance (UC08–11) | Inventory interface for other modules and read-only status inputs for monitoring |

## Set up parallel development

1. Agree shared ID/time conventions, error codes, permission context and the inventory interface first. Keep fixtures for a provisioned user, an operator, compatible and incompatible slots, a low-battery vehicle and a faulted port.
2. Keep UX/UI in `app/prototype/`. Give each backend module its own proposed `app/src/modules/{mobility-simulation,parking-charging,operations}/` folder with HTTP handlers, application operations, domain rules and repository adapters. Compose the routers in one server entry point. Keep Express and SQLite calls at the edges.
3. Develop each workstream against isolated fixtures and injected interfaces. Mobility and Parking can use an in-memory inventory adapter. Operations monitoring can consume fixture read models. Simulation can use a fixed snapshot. At integration, wire the real adapters once in the server composition layer. Use in-process calls across modules.
4. Operations owns physical inventory writes. Mobility owns rental commitments and trips. Parking and Charging owns private commitments, occupancies and charging lifecycle records. Expose purpose-specific operations to reserve, release or move inventory, plus read-only projections. Keep table access inside the owning adapter. Build monitoring and simulation projections in the composition layer to avoid circular module imports.
5. Carry one SQLite transaction through calls that change both business state and inventory. For contested writes, acquire the write transaction before rechecking state, then commit the entire transition or roll back. Use database constraints where applicable. Keep hardware I/O outside the write transaction. Persist a pending command before sending it, then reconcile confirmation with the current state using the same command ID.
6. Use the existing [inventory scaffold](../../app/db/README.md) as demo data. Use a separate temporary SQLite file per integration test. Agree the application driver and migration tooling before writing schema migrations.

Operations requires authentication middleware to provide `req.user = { id, role }` or `{ id, roles }`; request headers are not identity. The local [demo backend](../../app/README.md) supplies server-side demo sessions; it does not decide production identity. Until Mobility is implemented, composition must supply `tripReader.getTrip(id, client)`, returning `{ id, userId, vehicleId, status }` by reading through the supplied client in the current transaction, for UC11A. Without that reader the endpoint returns 503 rather than accepting an unverified trip. This adapter is an integration boundary, not an authentication mechanism.

The Operations inventory interface requires the owning reservation ID for release and pickup, the trip ID for return, and the occupancy ID for checkout; see `inventory-interface.js` for signatures. These IDs must be verified by their owning module before invoking the interface. Migration 0004 reconstructs active transfer holds from transfer records; older reservation, trip or occupancy states without an identifiable owner remain unavailable until reconciled from authoritative records. Migration 0006 leaves legacy parking pools unassigned until configured. The owning parking module must calculate expiry, validate compatibility and ownership, run the expiry scan, and share its transaction with inventory. Charging transitions additionally need the device and allocation guards in the charging state chart; a status update alone does not establish those guards.

## Team and UX/UI ownership

Ý owns UX/UI and designs the mobile User, mobile Operator and desktop Operator experiences across the three backend modules. Use the [prototype screen inventory](../../app/prototype/README.md) for the existing flows and the [current HTTP contracts](API_CONTRACTS.md) for the data and actions each screen can use. The owner defines navigation, responsive layouts, and loading, empty, error and success states.

Minh can develop Simulation against a fixed snapshot while Duy builds the Operations inventory and monitoring interfaces. Integrate the live snapshot after both interfaces are ready.

For each workflow, Ý hands off the screen flow and its states, with links to the corresponding use case and HTTP contract. Module owners implement their endpoints and agree any contract changes with the UX/UI owner before wiring the screens. Review each workflow together on desktop or an emulated phone as appropriate.

## Wire the prototype

Serve the existing mobile user, mobile operator and desktop operator interfaces from the same origin as the API. Replace mock operations per workflow with HTTP calls. Show the server response and refresh after a conflict. Keep user and operator permissions enforced by the server. For a PC-only demo, use localhost with mobile browser emulation. For a phone demo, bind to a reachable interface and verify both devices can reach the host over the intended Wi-Fi.

## Acceptance checks

| Module | Verify through the module interface |
|---|---|
| UX/UI | Check navigation, responsive layouts and loading, empty, error and success states on desktop and emulated phones. |
| Mobility and Simulation | Concurrent reservation attempts yield one winner. Wrong and expired pickup codes leave state intact. Retried return closes one trip and consumes one destination slot. Fixed snapshots produce repeatable results. Invalid scenarios fail before persistence. Saved results reopen without changing live inventory. |
| Parking and Charging | Adjacent planned intervals succeed and overlapping ones conflict. Check-in creates one occupancy. A late vehicle preserves both commitments. Unconfirmed shutdown blocks checkout, and disconnect releases the port separately from parking. |
| Operations | Departure and cancellation have one winner. Partial arrival preserves the transfer and holds. Incident handling isolates resources safely and preserves active trips. |

Run integrated contention tests for parking, return and transfer against the same capacity. Exercise reconnect and idempotent retry, user ownership and operator permissions, and desktop and emulated mobile flows. The existing prototype suite tests mock UI behavior. Run the new integration cases once the API is implemented.
