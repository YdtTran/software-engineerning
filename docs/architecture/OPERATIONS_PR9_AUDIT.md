# PR #9 Operations audit — work in progress

This audit accompanies the correction work on `codex/pr9-operations-fixes`. It is not a merge approval. Requirements remain authoritative in `PROJECT_SPECIFICATION.md` and `LIFECYCLE_SCENARIOS.md`.

| Area | Evidence and current disposition |
| --- | --- |
| C1 migrations | Initialization now applies versions 1–7 in order; fresh, repeated, v1 upgrade, failed v2 rollback, and future-version rejection are checked. Legacy commitments without recoverable identities are not guessed. |
| C2 authentication | The controller accepts identity only from trusted `req.user`, requires roles and rejects forged role/identity headers. Express integration uses a test middleware. No application authentication implementation or composition root exists on this branch; production provisioning is unverified. |
| C3 SQLite transactions | Explicit transactions and savepoints are covered with `node:sqlite`, `better-sqlite3`, and callback `sqlite3`. Same-connection operations are serialized; separate-connection contention is covered by worker tests. |
| C4 transfers | Conditional vehicle and slot claims, duplicate rejection and rollback are tested, including two SQLite connections. Departure versus cancellation is tested using separate connections. A vehicle pickup claim also excludes cancellation and expiration until reconciliation. |
| H1 monitoring | Mixed canonical and legacy resource status counts are covered. Threshold unit checks exist; full end-to-end monitoring for all cross-module events is still incomplete. |
| H2 arrival | Replacement holds and mappings are updated atomically, including rollback and partial slot reuse. Physical slot/vehicle association is recorded after arrival; the existing API supplies vehicle and slot lists rather than an explicit observed vehicle-to-slot mapping. |
| H3 resource lifecycle | Admin and inventory guards protect several active states, identities and parked vehicles. Charging-device safety and allocation guards remain incomplete. |
| H4 idempotency | SQLite stores the outcome and operation in one transaction; replay, conflict, expiry, retry, actor scope, and separate-connection concurrency are tested. |
| H5 incidents | A trusted trip reader is required; vehicle/trip association is checked during persistence. No actual Mobility module is present for integration testing. Emergency deadline uses receipt time; recording a deadline is not proof that physical isolation occurred within 60 seconds. |
| Parking/charging integration | Inventory now records pool-specific half-open commitments separately from physical occupancy and checks them atomically against return and transfer; overlapping claims were exercised with separate connections. Pool assignments for existing slots require reconciliation, and the absent parking module still must validate ownership, compatibility and expiry policy, run expiration, and share the transaction. **Blocking:** charging transitions fail closed without a trusted guard, but the actual charging module that must validate connector ownership, power budget and hardware acknowledgement is absent. Full module integration is unverified. |
| Frontend and application | The branch contains the prototype and Operations module, but no actual backend server, Mobility module or Parking/Charging module. Production mounting and frontend compatibility have not been established. |

Checks run from the isolated worktree:

```sh
NODE_PATH=/tmp/pr9-test-driver/node_modules node --test app/src/modules/operations/tests/*.test.js
python3 app/src/modules/operations/tests/verify-operations.py
git diff --check
```

The temporary `NODE_PATH` provides Express, `better-sqlite3`, and `sqlite3` solely for verification; it does not select a project production driver. The Python script tests its own SQL scenarios, not the full JavaScript application. The SQLite CLI used for migration verification was extracted to `/tmp`, outside the repository.
