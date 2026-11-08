# Development / Implementation View — Agent Implementation Plan

**Status:** Complete — Phases 1–5 complete; native PlantUML/Draw.io renderer unavailable, with SVG layout inspected in the integrated browser.  
**Scope:** Produce the Development / Implementation View artifacts for Submission #3. This plan covers architecture documentation and diagrams, not backend coding or deployment.

## 1. Agent entry point

Before creating or editing deliverables, read these files in order:

1. `AGENTS.md` — workspace-wide constraints and UML precedence.
2. `docs/architecture/DECISION.md` — confirmed architecture choices; treat these as the project's current baseline.
3. `docs/standards/06_Development_Implementation_view.md` — detailed Development View rules and acceptance checklist.
4. `docs/standards/05_Architecture_4plus1_views.md` — boundary between Development and the other 4+1 views.
5. `docs/requirements/PROJECT_SPECIFICATION.md` §2, §3 and §5 — system scope, use cases, technical assumptions, and Submission #3 scope.
6. `docs/diagrams/05_Class_Diagram/CLASS_CATALOG.md` and `docs/diagrams/05_Class_Diagram/README.md` — domain entities, service responsibilities, atomicity expectations, and existing class-design context.
7. `app/prototype/` — inspect the existing user, Operator field, and Operator web prototypes only as needed to accurately label the Presentation layer.

If these sources conflict, follow the precedence in `AGENTS.md`. Do not infer backend implementation facts from design documents.

## 2. Goal and boundaries

Create a clear, internally consistent view of how Smart E-Mobility Hub is organized for developers:

- Five logical layers: **Presentation → API / Interface → Application → Domain → Infrastructure**.
- A **modular monolith** backend for the MVP.
- Target backend technology: **Node.js + Express**, with **SQLite** persistence behind a Repository abstraction.
- Existing prototype frontend: **HTML5, CSS3, Modern JavaScript**, without external libraries as documented.
- Cohesive business modules, interfaces, responsibilities, and dependency directions.

The deliverable is an architecture design, not proof that the proposed backend or package structure already exists.

**Out of scope:** implementing backend/frontend features, selecting any technology left open in `DECISION.md`, defining database schema/API contracts, drawing deployment topology, or redoing the class/domain model. Do not model logical modules as independently deployed microservices.

## 3. Requirements for this plan

These `DVR` IDs are plan-local acceptance requirements derived from the confirmed decision record and project rule. They are not existing course-specification `REQ-XXX` IDs.

| ID | Required outcome | Source |
| --- | --- | --- |
| DVR-01 | Show the confirmed five-layer modular-monolith architecture and the responsibility of each layer. | `docs/architecture/DECISION.md` (DV-01, DV-02); `docs/standards/06_Development_Implementation_view.md` |
| DVR-02 | Show cohesive business modules, their key responsibilities, and useful links to UC01–UC14/domain services. | `docs/standards/06_Development_Implementation_view.md`; `docs/requirements/PROJECT_SPECIFICATION.md`; `CLASS_CATALOG.md` |
| DVR-03 | Show component interfaces/dependencies, Repository abstraction, SQLite adapter, and external integration adapters without violating layer boundaries. | `docs/architecture/DECISION.md` (DV-03, DV-05); `CLASS_CATALOG.md` |
| DVR-04 | Provide a Package Diagram for the proposed source organization that agrees with the Component Diagram and is not misrepresented as existing code. | `docs/architecture/DECISION.md` (DV-06); `docs/standards/06_Development_Implementation_view.md` |
| DVR-05 | Identify confirmed, proposed/mock, and undecided technology accurately; do not invent frameworks, providers, protocols, or libraries. | `docs/architecture/DECISION.md`; `docs/requirements/PROJECT_SPECIFICATION.md` |
| DVR-06 | Deliver editable Draw.io diagrams, PlantUML sources, suitable Mermaid previews, and explanatory documentation in the agreed location. | `docs/architecture/DECISION.md` (DV-06, DV-07); UML Designer workflow |
| DVR-07 | Keep Development View distinct from Logical, Process, and Physical/Deployment Views and pass the project rule's final checklist. | `docs/standards/05_Architecture_4plus1_views.md`; `docs/standards/06_Development_Implementation_view.md` |

## 4. Deliverable layout

Create the following directory and files; use these names consistently in links and cross-references:

```text
docs/diagrams/
└── 06_Development_View/
    ├── README.md
    ├── DV01-Component_Diagram.puml
    ├── DV01-Component_Diagram.mmd
    ├── DV01-Component_Diagram.drawio
    ├── DV01-Component_Diagram.drawio.svg
    ├── DV02-Package_Diagram.puml
    ├── DV02-Package_Diagram.mmd
    ├── DV02-Package_Diagram.drawio
    └── DV02-Package_Diagram.drawio.svg
```

`README.md` is the handoff/report for these artifacts. It must state that this is a target design, summarize layers and modules, explain important dependency choices, and include a technology/status table with source references. If a format cannot faithfully represent a UML detail, record the limitation rather than silently changing the meaning.

## 5. Execution phases and tasks

Complete tasks in order. A task may be marked done only after its stated evidence exists and has been checked.

### Phase 1 — Source-grounded architecture inventory

- [x] T001 [Plan:1.1] Read the context sources in §1 and record a compact source-to-scope map in working context; distinguish confirmed facts, target design, and undecided items. Do not create a second architecture decision document.
- [x] T002 [Plan:1.2] Map Presentation clients, UC01–UC14, application service concepts, domain responsibilities, and technical adapters to the five confirmed layers using `docs/requirements/PROJECT_SPECIFICATION.md`, `CLASS_CATALOG.md`, `DECISION.md`, and the existing UI prototypes.
- [x] T003 [Plan:1.3] Confirm every technology/library label against `DECISION.md` or project documentation; explicitly list unresolved technologies for the README rather than selecting them.

#### Phase 1 inventory results

**Source-to-scope map**

| Source | Evidence relevant to this view | Classification / constraint |
| --- | --- | --- |
| `AGENTS.md` | Lecture slides have highest modeling authority; assignment/master specification establish project scope; workspace rules provide detailed conventions. | Precedence rule; do not let an implementation suggestion override the assignment or slides. |
| `docs/architecture/DECISION.md` | Modular monolith; five layers; Node.js + Express; SQLite; Repository abstraction and transaction use; both Component and Package Diagrams. | Confirmed target architecture for MVP, not evidence that backend code exists. |
| `docs/standards/05_Architecture_4plus1_views.md` | Development View describes source decomposition, modules, packages, layers and libraries; maps to Component and Package Diagrams. | Keep separate from Logical/Class, Process/Activity/Statechart, and Physical/Deployment views. |
| `docs/standards/06_Development_Implementation_view.md` | Layer responsibilities, proposed business-module grouping, dependency rules, technology-status labels, and acceptance checks. | Mandatory project-specific conventions for the deliverables. |
| `docs/requirements/PROJECT_SPECIFICATION.md` §§2–3, 5–6 | System scope and UC01–UC14; telemetry may be real or simulated; no hardware construction focus; MVP does not require complex backend persistence; UI prototype is pure HTML/CSS/JavaScript with no external library and has three role interfaces plus a design-preview shell. | Requirements and existing prototype facts. It does not mandate the confirmed backend stack. |
| `docs/diagrams/05_Class_Diagram/CLASS_CATALOG.md` | 19 proposed domain classes, UC traceability, seven named service concepts, and atomic resource-allocation expectations. | Proposed Logical View/domain design. Service concepts are not proof of implemented classes or a backend. |
| `docs/diagrams/05_Class_Diagram/README.md` | Class model is proposed for Submission #3; explicitly notes the UI prototype remains a mockup and the class documents do not implement a backend. | Supports target-design status; do not duplicate or redraw its class model. |
| `app/prototype/` prototypes | Three prototype experiences (User mobile, Operator field mobile, Operator web) are shown through the shared `index.html` preview shell, which references local `styles.css` and `app.js`. The three named entry HTML files redirect into that shell. | Presentation-layer context only; they are not independent implemented clients and are not connected to the proposed Express API. |

**Layer and responsibility map**

| Layer | Phase 1 inventory | UC/module mapping |
| --- | --- | --- |
| **Presentation** | User mobile, Operator field mobile, and Operator web are three prototype experiences rendered through a shared preview shell; their entry HTML files redirect into `index.html`. Keep this mockup viewer distinct from an operational system client. | User UC01–UC07; Operator UC08–UC14. |
| **API / Interface** | Target Express HTTP entry/controller layer; translate client requests and telemetry input into application operations. | API details and endpoint contract remain undecided. |
| **Application** | Coordinates use cases through cohesive modules: Accounts and Resources; Reservations and Trips; Charging; Operations; Simulation. | Accounts and Resources: UC01–UC02, UC08–UC09. Reservations and Trips: UC03–UC06. Charging: UC07, UC12. Operations: UC08–UC11. Simulation: UC13–UC14. Overlap is intentional where a use case needs data from more than one module. |
| **Domain** | Business concepts and invariants: `UserAccount`, `MobilityHub`, vehicle types, `ParkingSlot`, `ChargingPoint`, reservations, `Trip`, charging requests/sessions, `TransferOrder`, incidents, and simulation concepts. | Use `CLASS_CATALOG.md` as authority for the modeled domain; avoid expanding this view into a Class Diagram. |
| **Infrastructure** | SQLite-backed repository implementations; telemetry and notification adapters, with simulated/mock adapters possible for MVP. Transactions protect operations whose business rules require atomic allocation/state changes. | Real IoT protocol and production notification provider are not chosen. |

**Technology and open-item audit**

| Item | Status after Phase 1 | Evidence / handling for later phases |
| --- | --- | --- |
| HTML5, CSS3, Modern JavaScript; no external frontend library | Existing prototype, as documented in `docs/requirements/PROJECT_SPECIFICATION.md` §6; `index.html` references local CSS/JS assets. | Show as the current mockup technology, not as a frontend already integrated with backend. |
| Node.js + Express | Confirmed target backend stack in `DECISION.md`. | Show as target for MVP API; runtime version and package versions are not selected here. |
| SQLite | Confirmed target persistence in `DECISION.md`. | Show behind the Repository abstraction; do not claim schema, database driver, or ORM has been chosen. |
| Repository abstraction and transactions | Confirmed architecture decision; transaction behavior is motivated by catalogued atomic allocation invariants. | Show the abstraction/adapter boundary and note atomicity, without inventing a locking or transaction library. |
| Simulated telemetry / mock notifications | Supported as MVP adapter choices, not a commitment to a specific protocol/provider. | Label explicitly as mock/simulated if included in diagrams. |
| API contract, endpoint paths/payloads, authentication implementation, SQLite schema, ORM/query and migration tools, validation/logging/test libraries, hosting/CI/CD, real IoT protocol, production notification provider | Not selected in the decision record or sources read for this phase. | List as unresolved in the eventual README; do not choose or depict named products. |

No contradiction requires changing a confirmed architecture decision. The course specification permits different MVP technologies and does not require complex backend persistence; the project owner has separately confirmed Node.js/Express/SQLite as the target architecture. Keep that distinction visible in all deliverables.

### Phase 2 — Component architecture

- [x] T004 [Plan:2.1] Create `docs/diagrams/06_Development_View/DV01-Component_Diagram.puml` with the five layers, modular-monolith boundary, major cohesive modules, named responsibilities, and only meaningful interfaces/dependencies.
- [x] T005 [Plan:2.2] Show the frontend prototypes as presentation clients without implying an existing backend connection; show Express at API / Interface, use-case coordination at Application, business invariants at Domain, and SQLite/repository plus telemetry/notification adapters at Infrastructure.
- [x] T006 [Plan:2.3] Show persistence behind a Repository abstraction and indicate that transaction boundaries protect atomic allocation/state transitions; do not expose SQLite implementation details to UI, Application, or Domain.
- [x] T007 [Plan:2.4] Label simulated/mock telemetry or notifications as MVP adapters where shown; do not add real IoT protocols, external providers, servers, containers, or hardware nodes.

Phase 2 output: [DV01-Component_Diagram.puml](../diagrams/06_Component_Diagram/README.md). Static boundary/source checks and `git diff --check` passed. No PlantUML renderer is installed, so rendering/syntax validation is deferred to Phase 4–5 if a local workspace renderer is available. Mermaid, editable Draw.io, SVG, and explanatory README are also deferred to later phases.

### Phase 3 — Proposed package organization

- [x] T008 [Plan:3.1] Create `docs/diagrams/06_Development_View/DV02-Package_Diagram.puml` for a proposed source/package layout using the five layers and cohesive modules from `DECISION.md` and the Development View rule.
- [x] T009 [Plan:3.2] Mark the package organization as proposed/target structure, not existing repository folders; ensure package names and dependency direction agree with DV01.

Phase 3 output: [DV02-Package_Diagram.puml](../diagrams/07_Package_Diagram/README.md). The package structure is explicitly proposed, keeps modules in a single backend boundary, and aligns layer/module names with DV01. Static checks completed; PlantUML rendering is deferred because no local renderer is installed.

### Phase 4 — Renderable and editable diagram formats

- [x] T010 [Plan:4.1] Create Mermaid previews `DV01-Component_Diagram.mmd` and `DV02-Package_Diagram.mmd`; retain the intended dependencies and add brief source comments/README notes for any UML notation Mermaid cannot express faithfully.
- [x] T011 [Plan:4.2] Create editable Draw.io XML files `DV01-Component_Diagram.drawio` and `DV02-Package_Diagram.drawio`, then produce corresponding `.drawio.svg` files using the workspace diagram workflow.
- [x] T012 [Plan:4.3] Check that the PlantUML, Mermaid, Draw.io, and SVG versions of each diagram agree in names, layers, modules, interfaces, and dependency direction; fix any drift.

Phase 4 evidence: Both Mermaid previews state their UML limitations. The native Draw.io and embedded SVG graphs parse as XML; the 39-cell component graph and 44-cell package graph each contain 12 edges. Validation confirms native/embedded graph parity, route endpoints and waypoints, orthogonal routes, node clearance, zero connector crossings, and vertices within the 2100×1420 canvas. The SVGs were inspected at fit zoom; dependencies are aggregated at the Use-case Modules boundary to prevent crossed port wiring, and the telemetry inbound port dispatches toward Operations. No standalone PlantUML or Draw.io renderer was available.

### Phase 5 — Handoff documentation and acceptance

- [x] T013 [Plan:5.1] Create `docs/diagrams/06_Development_View/README.md` with purpose/scope, status as target architecture, layer responsibilities, module-to-UC/service mapping, dependency rules, technology/status table, unresolved decisions, and links to all diagram formats and source documents.
- [x] T014 [Plan:5.2] Run the checklist in `docs/standards/06_Development_Implementation_view.md`; verify internal relative links, file existence, readable labels/layout, editable Draw.io sources, and no Deployment/Logical/Process View content leakage.
- [x] T015 [Plan:5.3] Run `git diff --check` and any already-available diagram syntax/render validation. Do not install tools solely for this documentation task; report unavailable validation explicitly instead of claiming it passed.

Phase 5 evidence: The README covers scope, target status, layers, UC/service mappings, dependency rules, technology states and sources, unresolved decisions, deliverables, and opening guidance. Its relative links and all deliverable files were checked. The rule checklist passes; full SVG layouts show no clipped or overlapping boxes. `git diff --check` passes. Renderer-specific PlantUML/Draw.io validation was unavailable and is not claimed.

### Post-completion wiring correction

The fit-zoom review showed that module-to-domain and module-to-port wires crossed one another around the Application Repository/Notification ports. The Draw.io views now show those dependencies at the enclosing Use-case Modules boundary, with module-level responsibilities and the Notification consumers documented in the README. Repository and Notification adapters now route to distinct right-side port anchors; actor dependencies enter the API at separate points. The API-layer Telemetry Inbound Port points to Operations, rather than Operations depending outward on the API layer. The native Draw.io models, embedded SVG graph and artwork, PlantUML, Mermaid, and README were updated together and revalidated for route parity, node clearance, and connector crossings.

## 6. Dependency and parallelism notes

- T001–T003 are prerequisites for diagram design.
- T004–T007 produce the component architecture and must be completed before T008–T009 so both diagrams share the same boundaries.
- T010–T012 depend on the corresponding PlantUML sources being stable.
- T013 depends on the diagrams and technology inventory; T014–T015 are final gates.
- This is a deliberately sequential architecture task. Avoid parallel edits to diagram sources before layer/module names and dependency direction are agreed.

## 7. Requirement mapping and completion evidence

| Requirement | Plan items | Evidence expected |
| --- | --- | --- |
| DVR-01 | 1.1, 2.1, 2.2 | Five named layer boundaries and responsibilities in both diagrams/README; one modular-monolith backend boundary. |
| DVR-02 | 1.2, 2.1, 3.1, 5.1 | Modules and UC/service traceability visible in diagrams and README. |
| DVR-03 | 2.1–2.3, 3.1 | Component diagram shows Repository/interface, SQLite adapter, relevant dependencies, and atomicity note. |
| DVR-04 | 3.1–3.2, 4.3 | Package diagram is explicitly proposed and agrees with Component Diagram. |
| DVR-05 | 1.3, 2.4, 5.1 | Technology table clearly distinguishes existing prototype, confirmed MVP target, mock/proposed adapter, and undecided items. |
| DVR-06 | 4.1–4.3, 5.1 | All expected files in §4 exist, are linked, editable/renderable, and mutually consistent. |
| DVR-07 | 2.1–2.4, 3.1–3.2, 5.2 | Rule checklist passes; no deployment topology or class/sequence/activity model is substituted for Development View. |

**Done when:** T001–T015 are checked; every DVR has evidence; all required deliverables in §4 exist; the final checks pass or any unavailable diagram validation is clearly reported.

## 8. Agent handoff instruction

When asked to execute this plan, start with §1 and follow the phases without revisiting settled decisions. Treat `DECISION.md` as the architecture baseline and the specialized rule as mandatory. Do not implement application code. If a contradiction or a new architectural decision is required, stop before changing the baseline and ask the project owner; otherwise proceed, preserve unrelated work, and report completed task IDs, deliverable paths, validation results, and remaining gaps.
