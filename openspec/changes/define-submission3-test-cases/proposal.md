# Proposal

## Why

Submission #3 of the Smart E-Mobility Hub capstone project (`04_BTL_SoftwareEngineering_HK261.pdf` page 5 and `PROJECT_SPECIFICATION.md` §5) includes a bonus **Test Case specification** deliverable alongside the Class Diagram and Method Descriptions. While the 19-class domain model and 18 method contracts are already complete in `01_Diagram/05_Class_Diagram/`, the project lacks a slide-compliant Test Plan and Test Case specification grounded in CO3001 Chapter 9 (`00_Slides/09_Ch9 Software Testing_2025.pdf`).

## What Changes

- Create a comprehensive Submission #3 Test Case specification (`01_Diagram/05_Class_Diagram/TEST_CASES.md`) structured strictly after the CO3001 Chapter 9 Software Testing slides:
  - **Test Plan & Strategy** (Slide Ch9 p.55 & p.59): Test object, test objectives, testing methods/techniques (Black-box Equivalence Partitioning & Boundary Value Analysis, White-box Statement/Branch/Path Coverage, System/Use-Case Testing, Concurrency/Performance/Usability Testing), required infrastructure, success/failure criteria, and the 6-column **Test Plan Summary Table** (`Type of tests`, `Description`, `Number of tests`, `Test types`, `Test data`, `Test metric`).
  - **Unit Test Suite for All 18 Domain Class Methods** (Slide Ch9 p.20–26): Equivalence partitioning, boundary value analysis (`batteryPercent` at `0, 9, 10, 19, 20, 79, 80, 100`, reservation expiry at `+15 min` vs `+30 min`, `powerLimitKW` at `85%`, partial charger failure bounds, simulation result bounds `[0, 1]`), and branch coverage test cases for every operation in `METHOD_DESCRIPTIONS.md` (including abstract dispatch and overrides).
  - **Use-Case / System Test Cases (`UC01`–`UC14` + `FR-NI01`–`FR-NI04`)** using the exact 8-field **Slide Ch9 p.53 Tabular Template** (`Test case`, `Test description`, `Related screens`, `Pre-conditions`, `Actions`, `Inputs`, `Expected Outputs`, `Testing environment`) linked to the 26 screens in `03_App/01_UI_UX/`.
  - **Non-Functional Test Cases** (Slide Ch9 p.30, 39, 40, 59, 63): Performance (`<= 2s` telemetry, `<= 5s` What-if simulation for 1,000 vehicles / 10 hubs), Concurrency / Anti-Double-Booking, Security/Authorization, and Usability tests.
- Add an executable assert-based Python verification script (`01_Diagram/05_Class_Diagram/verify_test_cases.py`) that validates 100% traceability across the 18 methods in `METHOD_DESCRIPTIONS.md`, `UC01`–`UC14`, `FR-NI01`–`FR-NI04`, the 5 What-if scenarios, and executes a reference domain model unit-test harness to prove all boundary/partition assertions pass.
- Update `01_Diagram/05_Class_Diagram/README.md`, `PROJECT_SPECIFICATION.md`, and `README.md` to link the Test Cases deliverable and sync Submission #3 progress checkboxes.

## Capabilities

### New Capabilities

None. This change documents the Submission #3 test specification and verification script for existing requirements and method contracts; `skip_specs: true` marks this documentation/verification change.

### Modified Capabilities

None. The main OpenSpec capability inventory is empty, and existing system requirements remain unchanged.

## Impact

- New files: `01_Diagram/05_Class_Diagram/TEST_CASES.md` and `01_Diagram/05_Class_Diagram/verify_test_cases.py`.
- Updated documentation links and progress trackers: `01_Diagram/05_Class_Diagram/README.md`, `PROJECT_SPECIFICATION.md`, and `README.md`.
- No changes to existing UML diagrams (`.drawio`, `.drawio.svg`, `.png`) or UI prototype code (`03_App/01_UI_UX/`).
