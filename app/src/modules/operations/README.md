# Operations module integration

Initialize the SQLite database with `app/db/init.sh` before mounting the module. Pass a SQLite connection to `createOperationsModule({ db, tripReader })` and mount its router at `/api/v1` after trusted authentication middleware. Middleware must set `req.user` to the authenticated `{ id, role }`; request headers do not establish identity. Every write requires `Idempotency-Key`.

The Mobility integration must provide `tripReader.getTrip(id)` returning trusted `{ id, userId, vehicleId, status }`; UC11A returns 503 without it. Check ownership, lifecycle, expiry and vehicle compatibility in the owning module before invoking the inventory interface, and supply the reservation, hub, trip and occupancy IDs described in `domain/inventory-interface.js`. The parking module computes the configured arrival deadline, supplies the interval and expiry, and runs expiry processing; inventory stores commitments separately from physical occupancy. The owning module must use the same SQLite client transaction for its records and inventory changes. Charging point transitions require a trusted `chargingGuard.assertTransition({ pointId, current, desired, client })` supplied at composition; without one they fail closed. The guard must verify and update device acknowledgement, connector ownership and hub power allocation using the supplied client in that transaction. No such charging module is included here.

Migrations 0004 and 0005 recover active transfer holds when the existing records identify one owner. Older reservation, trip and occupancy states without reliable identities are retained and require reconciliation before the corresponding operation can proceed. Existing occupied slots have no inferred parked-vehicle association; migration 0006 leaves existing pool assignments unknown until configured from authoritative data. Transfer arrivals pair the loaded vehicle list with the destination slot list and record that association; operators must confirm the physical placements match. Return and transfer do not have an agreed expected checkout time, so they do not claim a slot with any future commitment.

Run the JavaScript checks with Node.js 22 or newer:

```sh
node --test app/src/modules/operations/tests/*.test.js
python3 app/src/modules/operations/tests/verify-operations.py
```

The JavaScript suite uses `node:sqlite` and skips Express, `better-sqlite3`, and `sqlite3` driver integration tests when those optional packages are not installed. The project has not selected a production SQLite driver or authentication implementation.
