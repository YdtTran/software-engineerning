# Executive Summary: Post-Merge Requirements Traceability & Architecture Consistency Audit

**Repository:** [Smart E-Mobility Hub](https://github.com/YdtTran/software-engineerning)  
**Target Branch:** `main`  
**Integration Commit:** [`ac21515`](https://github.com/YdtTran/software-engineerning/commit/ac21515ae299cbb61532faae6b8c2697d0d66e9d) (Merge PR #14 `feat/mobility-simulation-integrated`)  
**Preceding Merges:** PR #10 ([`d91740d`](https://github.com/YdtTran/software-engineerning/commit/d91740d)), PR #13 ([`7acce31`](https://github.com/YdtTran/software-engineerning/commit/7acce31))  
**Academic Course:** Software Engineering (CO3001) – HK261, VNU-HCM  
**Audit Date:** 2026-11-11  

---

## 1. Audit Context and Scope

Following the sequential integration of Pull Requests #10 (Operations module post-merge hardening and migrations 0008–0009), #13 (Operations architecture visualization), and #14 (Mobility lifecycle, simulation engine, SQLite migrations 0010–0011, and live web application), this audit evaluates whether the integrated system complies with:

1. The authoritative lecturer assignment specification ([`04_BTL_SoftwareEngineering_HK261.pdf`](file:///home/ydt/Documents/Workspace/software-engineerning/docs/references/04_BTL_SoftwareEngineering_HK261.pdf)).
2. The approved master requirements and business rules ([`PROJECT_SPECIFICATION.md`](file:///home/ydt/Documents/Workspace/software-engineerning/docs/requirements/PROJECT_SPECIFICATION.md) and [`LIFECYCLE_SCENARIOS.md`](file:///home/ydt/Documents/Workspace/software-engineerning/docs/diagrams/01_Usecase_Diagram/LIFECYCLE_SCENARIOS.md)).
3. Architectural decisions and API contracts ([`DECISION.md`](file:///home/ydt/Documents/Workspace/software-engineerning/docs/architecture/DECISION.md) and [`API_CONTRACTS.md`](file:///home/ydt/Documents/Workspace/software-engineerning/docs/architecture/API_CONTRACTS.md)).
4. The UML modeling deliverables across Submissions #1, #2, and #3 (Use Case, Sequence, Activity, Statechart, Class, Component, Package, and Deployment diagrams).
5. The working MVP demonstration, user interfaces, database persistence, and automated test suite.

This audit operates under strict non-destructive constraints: no implementation code was modified, no UI was redesigned, and no diagrams were arbitrarily rewritten.

---

## 2. Key Audit Highlights

| Audit Dimension | Evaluation Result | Key Repository Evidence |
|---|---|---|
| **Test Suite Baseline** | **144 / 144 PASS (100%)** | `npm test` across 25 test suites executes in ~4.5s with zero failures. |
| **Requirements Traceability** | **Core Mobility & Simulation Complete; Parking & Charging Absent** | UC01–UC05 and UC13–UC14 fully operational. UC08–UC11 backend operational (107 tests). UC06, UC07, UC12 lack backend implementation. |
| **Data Integrity & Concurrency** | **VERIFIED (High Assurance)** | SQLite transactional savepoints, foreign key cascades, idempotency tokens, and optimistic capacity contention guards verified by regression tests. |
| **Architecture Alignment** | **VERIFIED (Modular Monolith)** | Conforms to confirmed 5-layer modular monolith architecture (`app/src/modules/operations` & `app/src/modules/mobility-simulation`). |
| **UML Consistency** | **CONSISTENT CONCEPTUALLY; ABSTRACTION DIFFERENCES** | UML diagrams accurately capture the domain model, state transitions, and component boundaries. Object-oriented UML class inheritance is implemented via functional validation in JavaScript. |
| **UI/UX & Demonstration** | **READY FOR CORE WORKFLOWS WITH LIMITATIONS** | Complete operational journey for User Mobility (UC01–UC05), Incident Reporting (UC11A), and Operator Simulation (UC13–UC14). Operations management (UC08–UC11) exists in backend but is not wired into `live.js`. |
| **Assignment Deliverables** | **SUBMISSIONS #1–#3 SATISFIED; FINAL CONSOLIDATION PENDING** | Requirements, dynamic models, architecture views, and class catalogs are complete. Final single PDF compilation and GenAI declaration pending. |

---

## 3. High-Priority Findings Matrix

| Finding ID | Severity | Category | Description | Impact |
|---|---|---|---|---|
| **F-01** | **P1** | Scope Gaps | **Missing Backend for Parking (UC06) and Charging (UC07, UC12)** | While documented in `API_CONTRACTS.md` and modeled in UI mockups, no Express routers or services exist. Operations fails closed with `CHARGING_GUARD_UNAVAILABLE`. |
| **F-02** | **P1** | UI Integration | **Operator Management Endpoints (UC08–UC11) Not Wired in Live UI** | Backend endpoints for Hub monitoring, resource patching, transfer dispatch/arrival, and incident resolution exist and pass tests, but `live.js` only exposes What-if simulation. |
| **F-03** | **P1** | Data Model | **Missing Relational Tables for Parking & Charging Sessions** | SQLite only contains `parking_commitments` and `charging_points`. Entities `parking_reservations`, `parking_occupancies`, `charging_requests`, and `charging_sessions` are not modeled in SQL. |
| **F-04** | **P2** | Background Services | **Non-Interactive Background Daemons (FR-NI01–04) Are Not Running Active Timers** | Specification documents 30-second cron jobs for auto-expiry and telemetry degradation. Expiry is currently calculated on-demand or during tests rather than via an active daemon. |
| **F-05** | **P2** | UI Navigation | **Prototype Static Viewer vs. Live Demo Redirection Disconnect** | Requesting `/user-app.html` or `/operator-web.html` redirects to `/live.html`, hiding the 26-screen mockup viewer in `index.html`. Users cannot easily toggle between static mockups and live execution. |
| **F-06** | **P2** | Deliverables | **Final Submission PDF Consolidation Pending** | The lecturer requires 1 single consolidated PDF containing Submissions #1–#3, MVP demonstration sequence, and GenAI disclosure. |
| **F-07** | **P3** | Geolocation | **Hub Coordinates Are Null in Current Schema** | `mobility_hubs` lacks `latitude` and `longitude` columns, causing `location: null` across discovery API responses. |
| **F-08** | **P3** | Architecture | **OOP Class Model vs. Functional JS Implementation** | Domain classes in `CLASS_CATALOG.md` model classical inheritance (`ElectricBicycle extends ElectricVehicle`), whereas the runtime uses plain objects, SQL rows, and functional validators. |

---

## 4. Evaluation of System Strengths

1. **Robust Concurrency & Single-Winner Semantics:**
   The SQLite implementation uses strict transaction boundaries and savepoints. Concurrency tests (`src/modules/operations/tests/concurrency-regression.test.js` and `src/modules/mobility-simulation/tests/capacity-integration.test.js`) prove that simultaneous claims on vehicles or slots result in exactly one winner without corruption.
2. **Idempotency & Network Resilience:**
   Every business write requires an `Idempotency-Key` scoped to actor and payload. Replayed requests receive identical committed outcomes. Incomplete device commands return `503 DEVICE_UNCONFIRMED` and hold resources until reconciled.
3. **What-if Simulation Engine Fidelity:**
   The discrete-event simulation engine (`simulation-engine.js`) implements all 5 required scenarios (Metro surge, full parking, charging surge, port failure, vehicle clustering). It executes against an immutable network snapshot in 15–50 ms without mutating live database state.
4. **Clean Decoupling via Composition Interfaces:**
   `Operations` and `MobilitySimulation` interact through narrow interfaces (`inventoryInterface`, `tripReader`) injected during composition in [`app/src/app.js`](file:///home/ydt/Documents/Workspace/software-engineerning/app/src/app.js#L50-L65), avoiding circular module dependencies.

---

## 5. Audit Decisions

### IMPLEMENTATION READINESS: **READY WITH LIMITATIONS**

> **Rationale:**  
> The core student journey (UC01–UC05: Search, View Vehicles, Reserve, Pick Up, Return) and the primary operator simulation workflow (UC13–UC14: 5 What-if scenarios and transfer recommendation) are fully integrated, backed by SQLite persistence, covered by live browser end-to-end tests, and demonstrable immediately. The system is resilient to double-booking, network interruptions, and service restarts.  
> However, it is classified as *READY WITH LIMITATIONS* because Parking (UC06) and Charging (UC07, UC12) lack backend implementation, and the Operator live UI currently lacks screens for Hub monitoring (UC08) and Incident resolution (UC11).

---

### ASSIGNMENT SUBMISSION READINESS: **READY WITH DOCUMENTATION FIXES**

> **Rationale:**  
> All required engineering artifacts for Submissions #1, #2, and #3 exist in the repository with high fidelity: functional specifications, 11-field use case contracts, 7 sequence diagrams, 7 activity diagrams, 3 statechart diagrams, 26 UI mockup screens, Deployment and Development views, and a detailed 19-class catalog with method contracts.  
> To achieve final submission readiness, the team must:
> 1. Assemble the individual reports into a single consolidated PDF deliverable.
> 2. Complete and sign the Generative AI usage declaration form.
> 3. Document the explicit demarcation between the operational MVP demo (Mobility + Simulation) and the design-only modules (Parking + Charging).

---

## 6. Audit Report Directory

The detailed evidence, matrices, and analysis supporting this summary are available in the following audit reports:

- [`REQUIREMENTS_TRACEABILITY.md`](file:///home/ydt/Documents/Workspace/software-engineerning/docs/audits/post-merge/REQUIREMENTS_TRACEABILITY.md) — Comprehensive requirement-by-requirement traceability matrix.
- [`ARCHITECTURE_CONSISTENCY.md`](file:///home/ydt/Documents/Workspace/software-engineerning/docs/audits/post-merge/ARCHITECTURE_CONSISTENCY.md) — Cross-module interactions, transaction boundaries, and state invariant analysis.
- [`UML_CONSISTENCY.md`](file:///home/ydt/Documents/Workspace/software-engineerning/docs/audits/post-merge/UML_CONSISTENCY.md) — Detailed comparison of Use Case, Sequence, Activity, Statechart, Class, and Architecture diagrams against code.
- [`UI_MVP_COVERAGE.md`](file:///home/ydt/Documents/Workspace/software-engineerning/docs/audits/post-merge/UI_MVP_COVERAGE.md) — User and Operator journeys, mockup vs. live demo coverage, and error state handling.
- [`TEST_COVERAGE_GAPS.md`](file:///home/ydt/Documents/Workspace/software-engineerning/docs/audits/post-merge/TEST_COVERAGE_GAPS.md) — Analysis of the 144 automated tests, test layers, and unexercised edge cases.
- [`ASSIGNMENT_COMPLIANCE.md`](file:///home/ydt/Documents/Workspace/software-engineerning/docs/audits/post-merge/ASSIGNMENT_COMPLIANCE.md) — Deliverable-by-deliverable checklist against CO3001 syllabus and grading rubrics.
- [`REMEDIATION_ROADMAP.md`](file:///home/ydt/Documents/Workspace/software-engineerning/docs/audits/post-merge/REMEDIATION_ROADMAP.md) — Prioritized, dependency-ordered engineering remediation plan.
