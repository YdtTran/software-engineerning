# Post-Merge Audit and Corrective Follow-up for PR #9 (Operations Module UC08–UC11)

This audit accompanies the corrective follow-up branch `codex/pr9-post-merge-fixes` following the merge of PR #9 into `main`. Requirements remain authoritative in `PROJECT_SPECIFICATION.md` and `LIFECYCLE_SCENARIOS.md`.

| Area | Evidence and current disposition |
| --- | --- |
| C1 migrations | Initialization applies versions 1–9 in order via `app/db/init.sh`; fresh init, repeated init, upgrades (v1→v9, v8→v9), and rollback are verified with the SQLite CLI. Migration 0009 adds explicit persistent vehicle-to-slot assignments (`vehicle_order`, `slot_order`, `assigned_vehicle_id`) with deterministic backfill for legacy transfers. |
| C2 authentication | Server-side demo sessions authenticate provisioned scrypt hashes, issue HttpOnly same-site cookies, and provide `req.user`. Controller enforces role boundaries ('operator' vs 'user') and rejects forged headers (`x-user-role`, `x-user-id`). Origin validation rejects cross-site requests on cookie writes. Negative tests verify 401/403. |
| C3 SQLite transactions | Explicit transactions and savepoints are tested across `node:sqlite`, `better-sqlite3`, and `sqlite3`. Same-connection operations are serialized; separate-connection contention is covered by worker thread concurrency tests. |
| C4 transfers | Conditional vehicle and slot claims, duplicate rejection, and atomic rollback are tested. Concurrent departure vs cancellation across separate SQLite connections exhibits single-winner semantics. Vehicle pickup claims block premature cancellation and expiration. |
| H1 monitoring | Monitoring aggregates vehicle availability, transfer holds, parking occupancy, and fault states across hubs. Alert calculation satisfies BR10 / FR-NI03 thresholds. |
| H2 arrival mapping | Migration 0009 and `sqlite-transfer-repo.js` guarantee explicit 1-to-1 persistent vehicle-to-slot mapping across transfer creation, departure, arrival, and destination replacement. Preserves retained slot mapping on partial reroutes; prevents alphabetical sorting from scrambling physical parking associations. Validated with deliberate unsorted and reordered arrival tests. |
| H3 resource lifecycle | Administrative updates cannot overwrite active lifecycle states (TransferHeld, Reserved, InTransit, InUse, Faulty). Deleting or relocating physically parked vehicles is rejected. Charging point transitions fail closed without an external charging safety guard. |
| H4 idempotency | SQLite persists operation outcomes atomically in `idempotency_outcomes`. Replays return identical cached responses, payload mismatches produce 409 Conflict, and requests without Idempotency-Key return 400. Serialized across worker threads. |
| H5 incidents | Trip incidents require an active trip matching the authenticated user; external trip validation fails closed with 503 if `tripReader` is unavailable. Equipment incidents isolate resources and enforce receipt-based 60-second emergency SLA. Isolation confirmation requires verified evidence before setting `isolation_verified_at`. |
| Request validation | All 11 Operations endpoints validate request bodies with `assertObject` and explicit type checks, returning 400 Bad Request (`INVALID_INPUT`, `INVALID_RESOURCE_KIND`, `INVALID_HUBS`, etc.) for null, missing, or malformed input instead of unhandled 500 errors. |
| Parking/charging integration | Inventory records pool-specific half-open commitments separately from physical occupancy. The external Parking and Charging modules are absent; charging transitions fail closed without a trusted guard (`CHARGING_GUARD_UNAVAILABLE`). |
| Frontend and application | Demo server mounts Operations with provisioned accounts. Full end-to-end integration remains pending until Mobility and Parking/Charging modules are implemented. |

Checks run from the isolated worktree:

```sh
NODE_PATH=/tmp/pr9-test-driver/node_modules npm test --prefix app
python3 app/src/modules/operations/tests/verify-operations.py
git diff --check
```

Results: 110 passed, 0 failed, 0 skipped.
Express is used in the demo server. The temporary `NODE_PATH` provides `better-sqlite3` and `sqlite3` for driver verification. The SQLite CLI (v3.46.1) was verified for migration execution.
