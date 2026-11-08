# Submission #3 — Development / Implementation View Report Plan

**Status:** Markdown report draft completed and validated. Owner review, connector-routing confirmation, and final DOCX/PDF packaging remain pending.
**Purpose:** Plan a report presenting the Development / Implementation View for Submission #3. This is separate from `plan.md`, which governs the review and maintenance of the diagrams.

## 1. Goal and scope

Produce a clear, evidence-based report that explains the project's target Development / Implementation View: its five logical layers, modular-monolith organization, responsibilities and dependencies, module boundaries, technology decisions, diagram set, validation evidence, and unresolved implementation choices.

The report documents an **architecture target**, not a completed backend. It covers the Development View group-work deliverable from Submission #3. It does not replace or reproduce the separate Deployment View, individual Class Diagram and Method Descriptions, or the full requirements and UI reports. Those artifacts may be referenced for context and traceability.

### Report deliverable

- **Working source:** `docs/reports/DEVELOPMENT_IMPLEMENTATION_VIEW_REPORT.md`
- **Format:** Markdown, following the existing `docs/reports/SUBMISSION_1_REPORT.md` report conventions and retaining English UML/architecture terms where useful.
- **Figures:** Reference the existing editable DV01 Component Diagram and DV02 Package Diagram SVGs, with links to their PlantUML, Mermaid, and native Draw.io sources. Do not copy or independently redraw them.
- **Submission packaging:** Keep the report usable as a standalone chapter that can be merged into the team's Submission #3 report. Confirm the final DOCX/PDF packaging with the owner before exporting; the project specification accepts `.doc`, `.docx`, or `.pdf` milestone documents.

## 2. Source authority and facts to preserve

Use the following order when sources differ: course assignment/slides and `AGENTS.md`, confirmed owner decisions in `DECISION.md`, project-specific Development View rules, then supporting documentation. Surface a conflict rather than silently changing an approved decision.

| Topic | Source of truth | Report treatment |
| --- | --- | --- |
| Submission #3 scope | `docs/requirements/PROJECT_SPECIFICATION.md`, §5 | Identify Development / Implementation View as group work; distinguish the separate Deployment and individual Class Diagram/Method Description work. |
| Architecture decisions | `DECISION.md` | Preserve the five layers, modular monolith, Node.js + Express target, SQLite target, Repository abstraction, and transaction requirement. |
| Layer/module responsibilities and UML boundaries | `docs/standards/06_Development_Implementation_view.md` and `docs/standards/05_Architecture_4plus1_views.md` | Explain component/package purpose and avoid runtime/deployment or class-model claims. |
| Diagram semantics and current evidence | `docs/diagrams/06_Development_View/README.md` and the DV01/DV02 `.puml`, `.mmd`, `.drawio`, and `.drawio.svg` files | Reuse the canonical names, dependencies, status labels, and documented format limitations. |
| Domain/service responsibilities and traceability | `docs/diagrams/05_Class_Diagram/CLASS_CATALOG.md` and its README | Use only as supporting context; do not reproduce the class model or claim service concepts are implemented. |
| Existing presentation prototype | `app/prototype/README.md`, `docs/requirements/PROJECT_SPECIFICATION.md`, and the documented prototype files | Describe the HTML/CSS/JavaScript UI as an existing mockup with no established backend integration. |
| Existing report style | `docs/reports/SUBMISSION_1_REPORT.md` | Follow its formal Vietnamese report organization and front matter; do not copy its unrelated use-case content. |

### Fixed architectural statements

- The target backend is **one modular monolith** with **Presentation → API / Interface → Application → Domain → Infrastructure** logical layers.
- Application modules are **Accounts & Resources**, **Reservations & Trips**, **Charging**, **Operations**, and **Simulation**.
- The UI prototype exists, but its API integration is planned, not established.
- Application-owned ports/contracts separate use-case logic from SQLite, telemetry, and notification adapter details. The telemetry input contract is owned by Application; Operations realizes it.
- SQLite is a selected persistence technology, not a package or deployment node. Repository abstractions and transactions protect relevant allocation/state transitions.
- Real telemetry protocol, production notification provider, API contract, authentication implementation, schema/migration tool, ORM/query library, hosting, and CI/CD remain open unless an authoritative source is updated.
- Do not imply that diagrams prove source packages, backend services, API endpoints, infrastructure, or deployed components exist.

## 3. Proposed report structure

1. **Cover and document control** — Submission #3, project/course, report scope, version/date.
2. **Executive summary** — target architecture and the key distinction between existing prototype and planned backend.
3. **Purpose, scope, and evidence** — Development View definition under 4+1; included/excluded artifacts and source authority.
4. **Confirmed architecture decisions** — modular monolith, five layers, technology choices, and rationale from `DECISION.md`.
5. **Layered architecture** — responsibility, boundaries, and dependency rules for each layer; include a concise layer table.
6. **Component architecture (DV01)** — embed/reference the diagram; explain major components, interfaces/ports, adapter realization, telemetry ingress, and planned UI-to-API dependencies.
7. **Proposed package organization (DV02)** — embed/reference the diagram; explain package grouping, package dependency direction, and the fact that the organization is proposed.
8. **Application modules and traceability** — module responsibilities, relevant service concepts, UC/FR mappings, and a note that mappings are not implementation evidence.
9. **Technology and implementation status** — table of technology/boundary, decision, status, role, and source. Separate existing prototype, confirmed target, optional MVP adapter, and undecided choices.
10. **Quality, validation, and limitations** — checklist summary and reproducible evidence; distinguish XML/model validation from renderer/editor visual validation.
11. **Open decisions and risks** — unresolved implementation choices and their owners/decision gates; do not select products in the report.
12. **Conclusion and references** — concise architectural outcome and linked primary sources/diagram files.

## 4. Work plan

| ID | Task | Dependencies | Completion evidence | Status |
| --- | --- | --- | --- | --- |
| RPT-01 | Freeze the source/status baseline using §2; confirm whether `plan.md` has received the owner's routing completion/waiver. | — | Architecture facts are fixed; connector routing remains explicitly pending. | Done |
| RPT-02 | Build a report outline and map each planned section to its authoritative source and evidence. | RPT-01 | Every architecture claim has a source; excluded Submission #3 deliverables are identified. | Done |
| RPT-03 | Draft the architecture narrative: purpose, decisions, layer boundaries, components, packages, dependencies, and module traceability. | RPT-02 | Narrative agrees with `DECISION.md`, README, and both diagram source models. | Done |
| RPT-04 | Add the technology/status table, linked figures, captions, glossary as needed, and source references. | RPT-03 | Links point to the existing matching artifacts; no duplicate/stale diagrams are introduced. | Done |
| RPT-05 | Add validation evidence, known format/tool limitations, unresolved decisions, and the current owner action without claiming unverified acceptance. | RPT-01, RPT-04 | Report distinguishes checked facts, unavailable checks, and pending owner work. | Done |
| RPT-06 | Review report completeness, terminology, traceability, links, and cross-artifact consistency; correct discrepancies in the report or raise them for owner decision. | RPT-05 | 27 local report links/images resolve; `git diff --check` passes. | Done |
| RPT-07 | Obtain owner review, confirm standalone-versus-merged placement and final DOCX/PDF packaging, then export only if requested/available. | RPT-06 | Owner decisions are recorded; any export is checked for readable figures, links/references, and pagination. | Pending |

RPT-03 through RPT-06 may be drafted while the owner adjusts connectors, but the report must state the current visual status. RPT-07 cannot claim final visual acceptance until the owner confirms the routing work is complete or explicitly waives it.

## 5. Acceptance checklist

- [ ] Report scope matches the Submission #3 Development / Implementation View group deliverable.
- [ ] Five layers, modular-monolith boundary, module names, and confirmed technologies match `DECISION.md`.
- [ ] Existing prototype, MVP target, optional adapters, and undecided technologies are explicitly distinguished.
- [ ] Component and package explanations match DV01/DV02 semantics and clarify Mermaid's approximation limits.
- [ ] UI/API integration is not presented as implemented; package structure is labeled proposed.
- [ ] Repository/SQLite, transaction, telemetry, and notification boundaries are accurate; no direct UI-to-SQLite or business-rule-to-framework dependency is implied.
- [ ] Service and UC/FR mappings are traceability aids, not claims about implemented code or one-to-one use-case ownership.
- [ ] Deployment topology and detailed class/method design remain outside this report's scope.
- [ ] Validation claims cite existing evidence and do not imply renderer/editor checks that were unavailable.
- [ ] All local report links and image references resolve; figures remain readable in the selected submission format.
- [ ] Outstanding owner routing work is either confirmed complete/waived or reported as pending.
- [ ] Owner approves the report's final placement and DOCX/PDF packaging before final export.

## 6. Risks and decision gates

| Risk / open point | Handling |
| --- | --- |
| The exact Submission #3 report format and whether this is a standalone section are not specified by the Development View sources. | Draft a standalone Markdown chapter designed for merge; confirm final placement/export with the owner in RPT-07. |
| Owner connector cleanup is not yet confirmed in the current handoff record. | Do not infer completion from unrelated messages; preserve pending status until explicit confirmation or waiver. |
| Renderer/editor availability may limit independent visual verification. | Report the checks actually run and distinguish them from owner visual review. |
| Architecture target may be confused with implemented software. | Repeat target/existing/proposed labels in the summary, figures, technology table, and conclusion. |
| New technology details may be requested for a fuller report. | Do not invent them; update `DECISION.md` first if the owner makes a decision, then synchronize report and diagrams. |
