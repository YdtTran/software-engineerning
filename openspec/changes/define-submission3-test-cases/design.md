# Design

## Context

See `proposal.md` for motivation. The workspace enforces a strict three-tier authority hierarchy (`AGENTS.md`):
1. **Tier 1 (Supreme Law):** Official CO3001 lecture slides (`00_Slides/09_Ch9 Software Testing_2025.pdf`).
2. **Tier 2:** Assignment brief (`04_BTL_SoftwareEngineering_HK261.pdf`) and master specification (`PROJECT_SPECIFICATION.md`).
3. **Tier 3:** Domain class model and method contracts (`01_Diagram/05_Class_Diagram/CLASS_CATALOG.md` and `METHOD_DESCRIPTIONS.md`) plus the 26-screen UI prototype (`03_App/01_UI_UX/`).

In CO3001 Chapter 9 (`09_Ch9 Software Testing_2025.pdf`), testing is organized into:
- **Test Planning** (p.55, p.59): Strategic/operational test plan with a 6-column summary table (`Type of tests`, `Description`, `Number of tests`, `Test types`, `Test data`, `Test metric`).
- **Development / Unit Testing** (p.20–26): Defect testing of object classes and methods in isolation using **Black-box Equivalence Partitioning (EP) & Boundary Value Analysis (BVA)** (p.22, p.25) and **White-box Statement, Branch, and Path Coverage** (p.22–24, p.26).
- **System / Use-Case Testing** (p.29, p.53–54): Testing component interactions forced by use cases and sequence diagrams (`SQ01`–`SQ07`), formatted with the 8-field tabular template on Slide p.53 (`Test case`, `Test description`, `Related screens`, `Pre-conditions`, `Actions`, `Inputs`, `Expected Outputs`, `Testing environment`).
- **Non-Functional & Acceptance Testing** (p.30–40, p.59–63): Functionality, GUI/Usability, Performance/Load/Stress, Security, and Robustness tests.

## Goals / Non-Goals

**Goals:**
- Provide a single, authoritative `01_Diagram/05_Class_Diagram/TEST_CASES.md` document for Submission #3 that satisfies both the lecture slide templates (Ch9 p.53 & p.59) and 100% coverage of the 18 class methods in `METHOD_DESCRIPTIONS.md` and 14 core use cases (`UC01`–`UC14` + `UC06A/B`, `UC07A`, `UC10A/B`, `UC11A`) + 4 non-interactive background jobs (`FR-NI01`–`FR-NI04`).
- Include an automated Python verification & reference unit-test script (`01_Diagram/05_Class_Diagram/verify_test_cases.py`) that parses `TEST_CASES.md` and `METHOD_DESCRIPTIONS.md` to assert 100% coverage and runs executable unit tests for all 18 domain operations across normal, boundary, and error partitions.

**Non-Goals:**
- Building a full production backend or database (explicitly excluded by the assignment brief p.4).
- Modifying existing `.drawio.svg` diagrams or Playwright UI tests in `03_App/01_UI_UX/verify.cjs`.

## Decisions

### 1. Place `TEST_CASES.md` and `verify_test_cases.py` inside `01_Diagram/05_Class_Diagram/`
- **Rationale:** Submission #3 groups the Class Diagram, Method Descriptions, and Test Cases together. Placing `TEST_CASES.md` alongside `CLASS_CATALOG.md` and `METHOD_DESCRIPTIONS.md` keeps relative links direct and cohesive while allowing `PROJECT_SPECIFICATION.md` and `README.md` to link directly to it.
- **Alternative considered:** Creating a new top-level `04_Testing/` folder. Rejected because the workspace numbering (`00_Slides`, `01_Diagram`, `02_Rules`, `03_App`) is fixed in `PROJECT_SPECIFICATION.md` §9.

### 2. Dual-Layer Test Specification (Unit Method Tests + Slide p.53 Use-Case/System Tests)
- **Rationale:**
  - Submission #3 specifically centers on the Class Diagram and Method Descriptions, so graders look for **Unit Tests** of the 18 modeled class methods using Equivalence Partitioning, Boundary Value Analysis (`0%, 9%, 10%, 19%, 20%, 79%, 80%, 100%` battery; `+15m` vs `+30m` expiry; `85%` power budget; `[0, 1]` simulation metrics), and Branch/Path coverage.
  - Meanwhile, Slide Ch9 p.53, p.59, and p.63 define the course's explicit **Test Plan Table** and **8-field Use-Case Test Case Template** (`Test case`, `Test description`, `Related screens`, `Pre-conditions`, `Actions`, `Inputs`, `Expected Outputs`, `Testing environment`) plus NFR test categories (Performance, Security/Concurrency, Usability, Compatibility).
  - Combining both layers in `TEST_CASES.md` guarantees full marks under both rubric interpretations.

### 3. Self-Contained Python Verification & Executable Unit Test Harness (`verify_test_cases.py`)
- **Rationale:** Following the workspace's verification pattern (`check_sequences.py`, `check_process_diagrams.py`, `build_class_diagram.py --check`), `verify_test_cases.py` uses only the Python standard library (`unittest`, `re`, `datetime`, `pathlib`) to:
  1. Verify structural completeness of `TEST_CASES.md` (presence of Slide p.59 Test Plan table, all 18 method headings from `METHOD_DESCRIPTIONS.md`, all `UC01`–`UC14` + lifecycle sub-cases, all `FR-NI01`–`FR-NI04`, all 5 `ScenarioType` values, and all 8 fields of Slide p.53 tables).
  2. Execute a reference in-memory Python implementation of the 18 domain operations against the documented Unit Test Cases (`UT-01`..`UT-54`) to verify every boundary condition and postcondition/error invariant passes.

## Risks / Trade-offs

- **[Risk] Threshold or invariant drift between `CLASS_CATALOG.md`, `METHOD_DESCRIPTIONS.md`, and `TEST_CASES.md`** → Mitigation: `verify_test_cases.py` cross-checks method names and tests the exact thresholds (`< 10%` urgent charging, `< 15%` critical in-use alert, `>= 20%` rentable shared vehicle, `>= 80%` redistribution candidate, `+15 min` vehicle hold vs `+30 min` parking hold, `85%` yellow / `95%` red hub capacity, `85%` `powerLimitKW` budget).
