# Test Coverage and Automated Verification Gap Audit

**Target Commit:** [`ac21515`](https://github.com/YdtTran/software-engineerning/commit/ac21515ae299cbb61532faae6b8c2697d0d66e9d)  
**Execution Command:** `npm test --prefix app`  
**Node.js Runtime:** v22.23.4 (with native `node:test` and native `node:sqlite`)  

---

## 1. Test Suite Execution Baseline

Independent test verification was executed against the exact merge commit `ac21515`. The results confirm the expected baseline:

```
✔ Total Test Suites:  25
✔ Total Test Cases:   144
✔ Passed:              144
✖ Failed:              0
⚠ Skipped:             0
⏱ Execution Duration:  ~4.5 seconds
```

### Breakdown of Test Distribution across Suites:

| Test Directory | File Name | Test Count | Primary Testing Scope |
|---|---|---|---|
| `app/src/tests/` | `database-initializer.test.js` | 2 | Migration sequence 0001–0011, backward compatibility, version guards |
| | `demo-auth.test.js` | 4 | Server-side sessions, scrypt hash checks, origin validation, cookie security |
| | `demo-server.test.js` | 2 | Server boot with credentials, persistence recovery across restart |
| | `live-browser.test.js` | 1 | Playwright E2E browser test: complete rental, retry, 5 simulation runs |
| | `reconnect-http.test.js` | 1 | Reconnection API, identity preservation, frontend asset serving |
| **Subtotal Core** | **5 files** | **10 tests** | **Application composition, auth, server lifecycle, browser E2E** |
| `src/modules/operations/tests/` | `concurrency-regression.test.js` | 2 | Concurrent worker threads, single-winner semantics, thread safety |
| | `http-regression.test.js` | 3 | Operations router error envelopes, 400/404 handling |
| | `idempotency-regression.test.js` | 4 | Scoped Idempotency-Key caching, payload hash mismatches (409) |
| | `incident-regression.test.js` | 14 | Incident reporting, resource isolation, technician scheduling, 60s emergency SLA |
| | `inventory-regression.test.js` | 26 | CRUD on resources, active lifecycle protection, deleting parked vehicles |
| | `migration-regression.test.js` | 4 | Upgrading legacy DB versions, legacy transfer hold preservation |
| | `monitoring-regression.test.js` | 3 | Hub metric aggregations, battery summaries, threshold alerts (FR-NI03) |
| | `operations.test.js` | 1 | Operations module composition and route registration |
| | `parking-commitment.test.js` | 14 | Half-open intervals, pool compatibility, arrival deadlines, overstay checks |
| | `security-regression.test.js` | 10 | Role enforcement (Operator vs User), header forgery prevention |
| | `transaction-regression.test.js` | 10 | Savepoint rollbacks, foreign keys, transaction callbacks across drivers |
| | `transfer-regression.test.js` | 16 | Transfer lifecycle, 1-to-1 vehicle-to-slot mapping, departure rollback |
| **Subtotal Operations** | **12 files** | **107 tests** | **Operations domain, concurrency, persistence, transactional integrity** |
| `src/modules/mobility-simulation/tests/` | `capacity-integration.test.js` | 2 | Contention between rental return, private parking, and transfer holds |
| | `discovery-http.test.js` | 2 | HTTP discovery queries, filters, role auth, error envelopes |
| | `discovery-integration.test.js` | 1 | Authenticated inventory discovery without database writes |
| | `discovery-service.test.js` | 3 | In-memory discovery, case-insensitive search, bad query handling |
| | `rental-http.test.js` | 1 | Session-authenticated HTTP rental lifecycle, ownership, idempotency |
| | `rental-lifecycle.test.js` | 11 | Reservation contention, rollback, pickup lock/reconciliation, low battery |
| | `simulation-http.test.js` | 1 | HTTP endpoint `/simulations`, Operator role check, snapshot provider |
| | `simulation.test.js` | 6 | 5 simulation scenarios, seed reproducibility, vehicle conservation |
| **Subtotal Mobility-Simulation** | **8 files** | **27 tests** | **Rental lifecycle, discovery, What-if simulation engine** |
| **GRAND TOTAL** | **25 files** | **144 tests** | **144 Passed (100%)** |

---

## 2. Coverage Matrix by Requirement and Testing Layer

| Requirement / Use Case | Unit Tests | Integration Tests | HTTP / API Tests | Browser E2E Tests | Concurrency & Faults | Requirements Coverage Rating |
|---|---|---|---|---|---|---|
| **UC01: Search Hub** | Yes | Yes | Yes | Yes | No | **COMPREHENSIVE (100%)** |
| **UC02: View Vehicles** | Yes | Yes | Yes | Yes | No | **COMPREHENSIVE (100%)** |
| **UC03: Reserve Vehicle** | Yes | Yes | Yes | Yes | Yes (Double-reserve race) | **COMPREHENSIVE (100%)** |
| **UC04: Pick Up Vehicle** | Yes | Yes | Yes | Yes | Yes (Device retry / 503) | **COMPREHENSIVE (100%)** |
| **UC05: Return Vehicle** | Yes | Yes | Yes | Yes | Yes (Capacity contention) | **COMPREHENSIVE (100%)** |
| **UC06: Parking Reservation** | Yes (DB only) | Yes (DB only) | **None** | **None** | Yes (Slot hold conflict) | **INCOMPLETE (Backend API missing)** |
| **UC07: Request Charging** | **None** | **None** | **None** | **None** | **None** | **ZERO (Module missing)** |
| **UC08: Hub Monitoring** | Yes | Yes | Yes | **None** | No | **BACKEND ONLY (UI unexercised)** |
| **UC09: Manage Resources** | Yes | Yes | Yes | **None** | Yes (Active state guard) | **BACKEND ONLY (UI unexercised)** |
| **UC10: Redistribute Vehicles**| Yes | Yes | Yes | Partial (create) | Yes (Departure contention) | **HIGH BACKEND / PARTIAL UI** |
| **UC11: Handle Incidents** | Yes | Yes | Yes | Partial (report) | Yes (Isolation check) | **HIGH BACKEND / PARTIAL UI** |
| **UC12: Charging Schedule** | **None** | **None** | **None** | **None** | **None** | **ZERO (Module missing)** |
| **UC13: What-if Simulation** | Yes | Yes | Yes | Yes | Yes (Vehicle conservation) | **COMPREHENSIVE (100%)** |
| **UC14: Simulation Results** | Yes | Yes | Yes | Yes | No | **COMPREHENSIVE (100%)** |

---

## 3. Analysis of Critical Test Coverage Gaps

While 144 passing tests represents an impressive volume of regression coverage for an academic project, the audit identifies several meaningful gaps:

### Gap T-01: Disconnect Between High Backend Test Count and UI Exposure
- **Observation:** The Operations module accounts for 107 of the 144 tests (74.3% of the total test suite). It tests intricate details such as nested savepoints across different SQLite drivers, deterministic vehicle ordering during transfers, and emergency SLA deadlines.
- **Gap:** Almost none of these capabilities are exercised through browser tests because `live.js` does not render UI views for Hub Monitoring, Resource Management, Transfer Execution, or Incident Resolution.
- **Risk:** High backend test volume may create a false sense of full system readiness, when in fact only Mobility and Simulation are demonstrable end-to-end in the UI.

### Gap T-02: Zero Automated Coverage for Parking and Charging Workflows
- **Observation:** No HTTP tests exist for `/parking-reservations` or `/charging-requests`.
- **Reason:** As established in Phase 2, the corresponding backend routers were never written.
- **Gap:** UC06, UC07, and UC12 have 0% runtime test coverage.

### Gap T-03: Non-Interactive Daemons (FR-NI01 – FR-NI04) Are Not Tested as Long-Running Background Jobs
- **Observation:** `rental-lifecycle.test.js` tests that a reservation expires when `calculateExpiry()` is reached. `monitoring-regression.test.js` tests threshold formulas when called.
- **Gap:** There are no tests verifying that an autonomous timer (`setInterval`) fires every 30 seconds to clean up expired reservations in a running server process without incoming HTTP requests.

### Gap T-04: Multi-User Real-Time Telemetry and WebSocket Absence
- **Observation:** All HTTP queries in `live-browser.test.js` are pull-based.
- **Gap:** There is no testing for live telemetry push streams, WebSocket updates, or multi-client concurrent browser interactions.

---

## 4. Verification Evidence Log

- **Test Execution Timestamp:** 2026-11-11T11:43:06+07:00
- **Test Command Output Excerpt:**
  ```
  ✔ composed app discovers live inventory through authenticated demo sessions without writes (535.58ms)
  ✔ session-authenticated HTTP lifecycle enforces ownership, roles, idempotency and trusted trip reports (476.60ms)
  ✔ all five scenarios produce reproducible persisted results without mutating a fixed snapshot or live inventory (47.56ms)
  ✔ vehicle conservation invariant: all vehicles remain accounted for throughout simulation without loss or duplication (24.43ms)
  ✔ live UI completes rental, lost-response retry and five simulations on mobile and desktop (3806.48ms)
  ℹ tests 144 | pass 144 | fail 0 | cancelled 0 | skipped 0
  ```
- **Integrity Check:** `git diff --check` executed with clean exit code 0.
