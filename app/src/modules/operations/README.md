# Operations module integration

Initialize the SQLite database with `app/db/init.sh` before mounting the module. Pass a SQLite connection to `createOperationsModule({ db, tripReader })` and mount its router at `/api/v1` after trusted authentication middleware. Middleware must set `req.user` to the authenticated `{ id, role }`; request headers do not establish identity. Every write requires `Idempotency-Key`.

The Mobility integration must provide `tripReader.getTrip(id)` returning trusted `{ id, userId, vehicleId, status }`; UC11A returns 503 without it. Check ownership, lifecycle and expiry in the owning module before invoking the inventory interface, and supply the reservation, hub, trip and occupancy IDs described in `domain/inventory-interface.js`. The parking pool argument cannot currently be verified against the scaffold and is rejected rather than ignored. Charging point state updates do not implement device acknowledgement, connector ownership or hub power allocation. Integrating a charging scheduler requires those guards and a shared transaction boundary.

Migrations 0004 and 0005 recover active transfer holds when the existing records identify one owner. Older reservation, trip and occupancy states without reliable identities are retained and require reconciliation before the corresponding operation can proceed. Existing occupied slots have no inferred parked-vehicle association. Transfer arrivals pair the loaded vehicle list with the destination slot list and record that association; operators must confirm the physical placements match.

Run the JavaScript checks with Node.js 22 or newer:

```sh
node --test app/src/modules/operations/tests/*.test.js
python3 app/src/modules/operations/tests/verify-operations.py
```

The JavaScript suite uses `node:sqlite` and skips Express, `better-sqlite3`, and `sqlite3` driver integration tests when those optional packages are not installed. The project has not selected a production SQLite driver or authentication implementation.
