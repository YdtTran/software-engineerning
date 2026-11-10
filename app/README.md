# Operations and Mobility demo backend

The demo server uses Express and Node's built-in `node:sqlite` adapter. This is a local demo adapter, not a decision on the project's production SQLite driver. Node.js 22 or newer and the `sqlite3` CLI are required.

```sh
npm ci --prefix app
./app/db/init.sh
```

Provision at least one account outside Git. The helper accepts a password on standard input, writes only a salted scrypt hash, and emits a one-account JSON array. For example, supply the password from a secure input source and restrict the output file permissions:

```sh
mkdir -p app/db/.local
(umask 077; node app/src/hash-demo-account.js demo-operator op-1 operator < /path/to/password-source > app/db/.local/demo-accounts.json)
```

For multiple accounts, combine the generated account objects in one JSON array. Roles are `user` and `operator`; an account may have both. Never commit credentials or password sources. No demo account or password is created by default.

For HTTP on the local machine only:

```sh
DEMO_ACCOUNTS_FILE=app/db/.local/demo-accounts.json \
DEMO_DB_PATH=app/db/.local/hub.sqlite \
DEMO_INSECURE_HTTP=1 node app/src/demo-server.js
```

The server binds to `127.0.0.1` and defaults to port 3000; `DEMO_PORT` changes the port. `DEMO_INSECURE_HTTP=1` disables the Secure cookie attribute for local HTTP and is rejected when `NODE_ENV=production`. Without it, cookies have the Secure attribute and require a suitable HTTPS deployment. The demo server does not configure TLS. Demo sessions are held in server memory and expire after eight hours or restart. POST `/api/v1/session` with JSON `{ "username": "...", "password": "..." }`; DELETE the same path to sign out. Protected operations use the resulting HttpOnly, SameSite=Strict cookie and do not trust actor headers. Cookie-authenticated writes require a matching `Origin`; business writes also require `Idempotency-Key`.

The server mounts Operations and Mobility/Simulation (UC01–05, UC13–14), using the same provisioned sessions and inventory adapter. Mobility provides the trusted trip reader for UC11A. Simulation captures a consistent read projection at composition and changes only private model state. Parking/Charging and production identity remain unimplemented. Charging transitions fail closed until their trusted integration is supplied to `createApp`. The existing frontend remains a prototype and is not wired to this server. See the [Mobility module](src/modules/mobility-simulation/README.md) for its current scope and focused test command.

Migration 0008 adds the Mobility lifecycle and command/outcome tables, and 0009 persists simulation snapshots/results; initialize or upgrade to version 9 before starting the server. Set `DEMO_SIMULATED_DEVICES=1` to opt in to local lock/arrival confirmation simulation. Without a trusted device adapter, pickup/return fails closed. The demo server scans overdue, unclaimed vehicle reservations every 30 seconds and persists expiry/uncertain-device events in a local outbox; an external notification provider is not selected.

Run `npm test --prefix app`; tests for optional SQLite drivers are skipped unless the drivers are available. The detailed integration limits are documented in [Operations](src/modules/operations/README.md).

Stage 1 is verified on Node.js 22.13.1. The inherited Operations driver detection misclassifies Node.js 24.19.0's SQLite API as a callback driver; use Node.js 22 for this demo until that adapter is updated. On native Windows the two inherited migration tests that spawn `init.sh` fail; the remaining regression results and baseline comparison are recorded in the [Minh implementation plan](../docs/architecture/MINH_IMPLEMENTATION_PLAN.md).
