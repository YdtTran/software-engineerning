# Smart E-Mobility Hub demo

One Express application serves Operations, Mobility/Simulation (UC01–05, UC08–11A, UC13–14), Parking & Charging (UC06, UC07, UC07A, UC12), the User mobile interface, and Operator desktop/mobile interfaces. See the [Vietnamese demo walkthrough](../docs/architecture/MINH_DEMO_GUIDE.md) for setup and workflows.

## Run on Windows

Use Node.js 22 or 24 with `node` and `npm` on PATH. The demo uses Node's built-in SQLite adapter; a production driver is still a separate decision. No SQLite CLI is needed for initialization.

From the repository root:

```powershell
npm ci --prefix app
npm run db:init --prefix app
.\app\provision-demo.ps1

$env:DEMO_ACCOUNTS_FILE = (Resolve-Path app/db/.local/demo-accounts.json).Path
$env:DEMO_DB_PATH = (Resolve-Path app/db/.local/hub.sqlite).Path
$env:DEMO_INSECURE_HTTP = '1'
$env:DEMO_SIMULATED_DEVICES = '1'
npm start --prefix app
```

The provisioning script prompts privately for two passwords, creating `user` (User) and `operator` (Operator). It stores salted hashes only and refuses to overwrite an existing account file. Accounts and SQLite data are ignored by Git. Alternatively, provision accounts with `node app/src/hash-demo-account.js USERNAME ID user[,operator]`, supplying the password on standard input and combining emitted account objects into a JSON array outside Git.

Open these entry points at `http://127.0.0.1:3000`:

| Path | Experience |
|---|---|
| `/user-app.html` | User mobile layout: find/reserve/pickup/return, own history and trip incidents |
| `/operator-app.html` | Operator mobile layout: run/reopen simulations and review transfer recommendations |
| `/operator-web.html` | Operator desktop layout with the same permissions |
| `/index.html` | Original offline design viewer; mock behavior remains separate |

The demo binds to `127.0.0.1`; use browser mobile emulation for a PC-only demonstration. `DEMO_PORT` changes the port. Phone-over-Wi-Fi deployment and HTTPS configuration are not included in this local launcher.

## Identity, storage and devices

GET `/api/v1/session` restores identity, POST creates a session from username/password, and DELETE signs out. Sessions are held in server memory and expire after eight hours or restart. Cookies are HttpOnly and SameSite=Strict; cookie-authenticated writes require matching Origin. Business writes additionally require an Idempotency-Key. Actor headers and the selected UI experience never grant permission. User-owned reads are filtered by authenticated identity.

`DEMO_INSECURE_HTTP=1` allows local HTTP cookies and is rejected under `NODE_ENV=production`. Without it, Secure cookies require a suitable HTTPS deployment. This server does not configure TLS or production authentication.

The current database version is 12: upstream `0008` records incident-isolation verification and `0009` adds transfer slot assignments; `0010` adds Mobility lifecycle/command/outcome tables; `0011` persists simulations; and `0012` adds Parking & Charging tables plus deterministic slot pool backfill. The initializer upgrades databases from earlier draft versions 8/9 without deleting their records. SQL contents are preserved; see [database notes](db/migrations/README.md).

Device simulation is opt-in (`DEMO_SIMULATED_DEVICES=1` for Mobility dock actions; Parking & Charging uses `SimulatedDeviceAdapter` by default unless injected). Without a trusted Mobility device adapter, pickup/return fails closed. The demo confirms arrival/lock without actual IoT hardware and leaves distance null without a measured odometer. Uncertain commands preserve claims for trusted reconciliation. Background jobs scan overdue vehicle and parking reservations every 30 seconds; automatic external notification delivery is not implemented.

Mobility supplies the trusted trip reader for UC11A. Simulation uses a consistent, immutable network snapshot and never applies recommendations automatically. Reviewed transfer recommendations call the normal Operations API, which rechecks current resources and creates a Planned transfer. Parking & Charging APIs (`UC06`, `UC07`, `UC07A`, `UC12`) and `chargingGuard` (`SC02`) are wired into `app/src/app.js` alongside Operations and Mobility; real hardware/isolation verification (`isolationVerifier`) still requires a production provider, and the live UI (`live.html`) currently focuses on Mobility/Simulation/Transfers.

## Verify

```powershell
npm run test:mobility --prefix app
npm test --prefix app
```

For the browser test, set `LIVE_PLAYWRIGHT` to an installed Playwright module path; Edge is required. Without Playwright the browser test reports a skip. `LIVE_SCREENSHOT_DIR` optionally saves screenshots. The optional `better-sqlite3`/`sqlite3` driver tests skip when those packages are absent.

The full history and stage evidence are in [Minh's plan](../docs/architecture/MINH_IMPLEMENTATION_PLAN.md). Migration tests now run portably through Node, and the SQLite adapter distinguishes newer synchronous serialization APIs from callback drivers.

Final verification with Playwright enabled: 133 pass, zero failures and two optional-driver skips on both Node.js 22.13.1 and 24.19.0. The account provisioning helper was also checked with isolated fixture accounts, including password-hash verification.
