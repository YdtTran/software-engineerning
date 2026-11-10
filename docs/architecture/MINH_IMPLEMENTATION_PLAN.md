# Minh — staged implementation

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
- [ ] Stage 3: UC13–14 simulation against fixed snapshots; five scenario types, agreed parameters/metrics, reproducible computation and saved results.
- [ ] Stage 4: Integrate remaining Mobility storage and live snapshots with module owners, then wire workflows with Ý. Verify cross-module capacity contention and desktop/emulated mobile behavior.

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
