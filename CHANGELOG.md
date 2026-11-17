# Changelog

## [2.0.0] - 2026-11-17

### Added
- **Unified Express + SQLite Backend (`app/`)**: Modular monolith integrating **Operations** (`UC08–11A`), **Mobility & Simulation** (`UC01–05`, `UC13–14`), and **Parking & Charging** (`UC06`, `UC07`, `UC07A`, `UC12`) over SQLite schema v12 (`app/db/migrations/0001..0012`) with atomic transactions, `Idempotency-Key` enforcement, and `chargingGuard` (`SC02`) safety checks.
- **Native Android User App (`android/`)**: Kotlin + Jetpack Compose client with MapLibre OpenFreeMap vector maps, OSRM routing, CameraX/ZXing QR pickup, shared EV rental/return (`UC01–05`), private parking reservations (`UC06-S1/S2/S3`), charging requests/stops (`UC07/UC07A`), and active-trip incident reporting (`UC11A`).
- **Live Operator Dashboards (`app/prototype/operator-web.html`, `operator-app.html`)**: Real API-connected desktop and mobile operator interfaces for BR10 network monitoring, resource CRUD, inter-hub transfers, incident/maintenance handling, smart charging priority scheduling (BR15 power budget), and 5 What-if DES simulations (`demo-des-v1`) with JSON export and live transfer handoff.
- **Production & Traceability Documentation**:
  - [Production Operations & Deployment Guide](docs/PRODUCTION_GUIDE.md)
  - [Core 11-Field Use Case Contracts](docs/diagrams/01_Usecase_Diagram/CORE_SCENARIOS.md) and [Lifecycle Scenarios](docs/diagrams/01_Usecase_Diagram/LIFECYCLE_SCENARIOS.md)
  - [Version 2 Contract Review](docs/requirements/VERSION_2_CONTRACT_REVIEW.md) and [Version 2 Traceability](docs/requirements/VERSION_2_TRACEABILITY.md)
  - Interactive walkthrough screenshots and demo video in [docs/assets/demo/](docs/assets/demo/)

### Changed
- **Documentation & UML Alignment**: Reconciled `UC01–UC14`, `SQ01–SQ07`, `AD01–AD07`, `SC01–SC03`, `DP01`, and `API_CONTRACTS.md` with the implemented services and regression suite, explicitly separating target architecture/capabilities from verified demo boundaries.
- **README Overhaul**: Archived course submission duty checklists to [docs/reports/SUBMISSION_PROGRESS_ARCHIVE.md](docs/reports/SUBMISSION_PROGRESS_ARCHIVE.md) and replaced the root [README.md](README.md) with a production-style system overview, visual guide, and quick-start runbook.

### Verified
- Node.js integration & unit test suite (`npm --prefix app test`): 172 tests (169 passed, 3 environment-skipped: optional `better-sqlite3`/`sqlite3` drivers and `LIVE_PLAYWRIGHT` browser test).
- Editable Draw.io UML checks & headless Chromium Draw.io `viewer-static` geometry verification across 23 use-case, 7 sequence, 7 activity, and 3 statechart canvases.
