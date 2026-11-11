# Mobility and Simulation — staged implementation

Scope follows [DEVELOPMENT_GUIDE.md](DEVELOPMENT_GUIDE.md): Mobility UC01–05 and Simulation UC13–14. Implement and verify one stage at a time, then commit and push that stage to the personal fork.

## Branch audit — 2026-11-10

Fetched the original repository and fork before implementation. Counts below describe the audited refs, not a permanent statement of GitHub state.

| Ref | Finding | Action |
|---|---|---|
| Local `main` / `origin/main` | Both at `37ba67b` | No local synchronization needed |
| `fork/main` | Six commits behind, no unique commits | Fast-forwarded from `9b49509` to `37ba67b` |
| `origin/uc08_11` | Eight commits ahead of main, tip `b78c4b6`; open PR #9 | Use as the dependency base for `minh/mobility-simulation` |
| `origin/Triet`, `codex/complete-mobility-lifecycle-diagrams`, `codex/mvp-development-guide`, `codex/seed-sqlite-demo-inventory`, `dev_view_2`, `feat/diagrams` | Tips already ancestors of main | No additional merge needed |
| `origin/dev_view` | Eight unique commits on an older diagram branch | Keep separate from backend work |
| `origin/feat/submission-3-test-cases` | One unique commit using the old document layout | Keep separate; evaluate when updating submission test documents |

Operations PR #9 supplies Express, local demo identity, the SQLite adapter, migrations and inventory. Minh's branch depends on those unmerged commits; it does not merge them into upstream main. Recheck the dependency before opening or retargeting a PR. Preserve the existing `deployment-view` branch.

## Stages

- [x] Stage 1: UC01–02 discovery module, injected in-memory fixture, real inventory composition, permission checks and tests.
- [x] Stage 2: UC03–05 reservations, expiry, pickup and return; durable idempotency and shared transactions; device confirmation through an adapter.
- [x] Stage 3: UC13–14 simulation against fixed snapshots; five scenario types, versioned demo parameters/metrics, reproducible computation and saved results.
- [x] Stage 4: Integrate Mobility storage/live snapshots against Operations, wire implemented desktop/mobile workflows, and verify shared-capacity contention and reconnect behavior.

## Stage 1 delivery

Implemented `GET /api/v1/hubs?q=...` and `GET /api/v1/hubs/:hubId/vehicles?type=...`. Both require a provisioned User or Operator identity. Discovery delegates live vehicle eligibility to Operations, reads through its interface and makes no inventory writes. The only Operations contract change declares `listHubs` and `getHubById`, which its SQLite provider already implemented.

`location: null` explicitly represents missing location data in the current Hub schema. Verified coordinates and their response shape remain an Operations/UX/UI integration decision. Production authentication, SQLite driver selection and Mobility schema design remain open as described in the architecture sources.

### Verification

- Node.js 22.13.1: all six new discovery tests pass, including HTTP/session/SQLite integration with a separate temporary database.
- Existing Operations/demo suite on the working branch: 99 pass, two fail, two skip.
- Unmodified Operations commit `b78c4b6`, exported and run separately: the same 99 pass, two fail, two skip. Both failures are the existing native-Windows tests that spawn the Unix `init.sh`; optional `better-sqlite3` and `sqlite3` integration cases are skipped because those packages are absent.
- Combined `npm test --prefix app` after Stage 1: 105 pass, the same two fail, the same two skip (109 total). No new regression failures were observed.
- The Operations adapter also misidentifies `node:sqlite` on Node.js 24.19.0 as a callback driver. Use the verified Node.js 22 runtime for this stage; fixing that inherited adapter compatibility is separate work.
- Run `npm run test:mobility --prefix app` for the stage and `npm test --prefix app` for all JavaScript checks. Run `git diff --check` before committing.

The prototype is not yet connected to the API; no UI acceptance claim is made in Stage 1.

## Stage 2 delivery

UC03–05 now use persisted reservations and trips, atomic inventory transitions and durable payload-bound idempotency. Pickup/cancel/expiry are serialized. Device commands are recorded before I/O, share one execution per process, carry a durable execution lease and allow three attempts with the same ID. Confirmed evidence is persisted before the final transition, so retry can recover from a failed database write without repeating physical I/O. Missing or uncertain evidence preserves claims and returns 503.

Migration 0008 extends the existing demo SQL migration sequence. The server requires version 8 and opts into simulated devices only through explicit configuration. Expiry scans run every 30 seconds, committing local notification/uncertainty events. Production driver selection, automatic outbox delivery, command reconciliation protocols and idempotency retention remain integration decisions. Trip distance stays null without an actual measurement.

Operations exposes purpose-specific return claim/confirmation operations using the existing capacity ownership fields. The composition root shares its SQLite client and injects Mobility's trusted trip reader for UC11A.

Verification: 18 Mobility tests and six existing demo server/authentication tests pass on Node.js 22.13.1. This includes complete authenticated HTTP reservation/pickup/incident/return, durable retry, transactional rollback, incorrect/expired codes, ownership, low battery and protected parking commitments. Full combined suite: 117 pass, the same two Windows shell migration failures and two optional-driver skips (121 total). The inherited shell migration limitation remains until the portable initializer work.

## Stage 3 delivery

Implemented all five scenario families with a seeded, bounded discrete-event engine. A versioned demo parameter schema records assumptions rather than claiming calibrated forecasts. A single composition-layer snapshot includes eligible rental vehicles and usable parking capacity. The engine changes private model state, and migration 0009 stores the full input snapshot and result for later viewing. Operator-only HTTP routes return baseline/projected metrics and recommendations; applying a recommendation is deliberately a separate live operation through the owning module.

Verification includes fixed-snapshot reproducibility across all five scenarios, parameter sensitivity, finite charging power, malformed/oversized scenario rejection before capture, impossible port-failure rejection before persistence, durable same-key replay, saved-result retrieval without a snapshot provider, no live inventory mutation and Operator-only HTTP access. Mobility plus demo-server tests: 29 pass on Node.js 22.13.1. Combined suite: 122 pass, the same two native-Windows migration failures and two optional-driver skips (126 total).

## Stage 4 delivery and upstream synchronization

Upstream changed during implementation: `origin/main` advanced to `3611831`, merging PR #9 and `42d43f0` (verified emergency isolation and receipt-based deadlines). The final stage incorporates that main, preserves the new `isolationVerifier` composition argument, and no longer depends on an unmerged Operations branch.

Upstream independently allocated migration 0008 to incident isolation. Minh's not-yet-merged migration files are now 0009 (Mobility) and 0010 (Simulation), with unchanged SQL contents. The portable initializer recognizes databases created from earlier Minh-only versions 8/9 and preserves trips, tickets, idempotency outcomes and saved results while adding the upstream isolation column and aligning version 10. Tests cover both earlier branch versions, fresh initialization, repeat safety, rollback and rejection of unknown databases.

The live User/Operator interfaces call same-origin APIs for Minh's workflows. Reconnect restores server identity and own records; pending requests preserve their original key/payload/path through reload. Transfer recommendations open a review step using current resources and call Operations to create a Planned command. The offline mock remains available separately. A PowerShell provisioning helper prompts for passwords and stores only salted hashes outside Git.

Native Windows migration failures are resolved by using the Node initializer. Newer Node SQLite serialization no longer triggers callback-driver misclassification. Capacity tests exercise simultaneous return/private-parking/transfer use of the same slot. Browser verification covers the full rental lifecycle, wrong code, lost response followed by reload and safe replay, all five simulations, saved-result reopening, reviewed transfer creation, and desktop/mobile rendering with no horizontal overflow or JavaScript errors.

Run instructions are in [MINH_DEMO_GUIDE.md](MINH_DEMO_GUIDE.md). The complete Parking/Charging HTTP implementation, real IoT protocols, external notification delivery, calibrated forecasting and production identity remain outside Minh's implemented scope. Parking contention is verified through the existing shared inventory interface, not a claim that UC06's HTTP module exists.

Final verification after merging upstream: **135 tests, 133 pass, zero failures, two optional-driver skips** on both Node.js 22.13.1 and 24.19.0, with the browser test enabled through Playwright/Edge. The PowerShell provisioning helper produces two valid accounts with verified salted hashes in an isolated fixture. Local Markdown links and `git diff --check` pass; no merge conflict markers remain. The renamed Mobility/Simulation SQL blobs match their original committed contents.
