# Operations demo backend

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

The server mounts Operations but does not implement Mobility, Parking/Charging or production identity. Trip reports and charging transitions fail closed until their trusted integrations are supplied to `createApp`. The existing frontend remains a prototype and is not wired to this server.

Run `npm test --prefix app`; tests for optional SQLite drivers are skipped unless the drivers are available. The detailed integration limits are documented in [Operations](src/modules/operations/README.md).
