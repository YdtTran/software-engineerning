# Smart E-Mobility Hub — Development / Implementation View

This view describes the proposed source-code organization and logical dependencies for the MVP. It is a **target architecture**, not evidence that the backend or package structure has already been implemented. The backend is one modular monolith; the diagram layers and adapters are not deployment nodes.

## Deliverables

| Diagram | PlantUML source | Mermaid preview | Editable Draw.io | SVG with embedded editable graph |
| --- | --- | --- | --- | --- |
| DV01 — Component Architecture | [DV01-Component_Diagram.puml](DV01-Component_Diagram.puml) | [DV01-Component_Diagram.mmd](DV01-Component_Diagram.mmd) | [DV01-Component_Diagram.drawio](DV01-Component_Diagram.drawio) | [DV01-Component_Diagram.drawio.svg](DV01-Component_Diagram.drawio.svg) |
| DV02 — Proposed Package Organization | [DV02-Package_Diagram.puml](DV02-Package_Diagram.puml) | [DV02-Package_Diagram.mmd](DV02-Package_Diagram.mmd) | [DV02-Package_Diagram.drawio](DV02-Package_Diagram.drawio) | [DV02-Package_Diagram.drawio.svg](DV02-Package_Diagram.drawio.svg) |

PlantUML is the detailed UML source. Mermaid provides a readable preview; its notation does not encode UML component ports, interface realization, or package semantics as precisely. Draw.io files are editable. Each SVG embeds the corresponding editable mxGraph model in its `content` attribute.

## Layer responsibilities

| Layer | Responsibility and boundary |
| --- | --- |
| **Presentation** | Student mobile, Operator field mobile, and Operator web mockup experiences. The existing shared preview shell renders these views. Their API integration is planned, not implemented. |
| **API / Interface** | Target Express HTTP API and the telemetry inbound contract; translate external requests/events to application operations. |
| **Application** | Coordinate use cases, transaction boundaries, repositories, and outbound notification requests in cohesive modules within one backend. |
| **Domain** | Own business concepts, validations, invariants, and state transitions without depending on UI, Express, or SQLite. |
| **Infrastructure** | Implement persistence and external integration ports, including the SQLite repository adapter and MVP telemetry/notification adapters. |

## Module and requirement mapping

| Application module | Services / responsibilities | Traceability |
| --- | --- | --- |
| **Accounts & Resources** | `VehicleService`; resource queries, eligibility, lifecycle, and administration | UC01–02, UC08–09 |
| **Reservations & Trips** | `ReservationHub`; reservation holds, pickup/return, and trip coordination | UC03–06; FR-NI01 |
| **Charging** | `ChargingScheduler`; request validation and charging allocation | UC07, UC12 |
| **Operations** | `RedistributionService`, `IncidentService`, and `TelemetryService` | UC08–11; FR-NI02–04 |
| **Simulation** | `SimulationEngine`; scenario execution and recommendation/result workflows | UC13–14 |

A use case may cross module boundaries. The mapping is a responsibility guide, not a claim that each use case has a one-to-one module implementation.

## Dependency rules

- Requests flow from Presentation through API / Interface to Application operations and Domain rules.
- Application modules depend inward on Domain behavior and on abstractions (Repository and notification ports), not on concrete SQLite or web framework APIs.
- Infrastructure adapters implement application-owned ports. The SQLite repository adapter persists domain state and must use transaction boundaries for atomic allocation and state transitions.
- Telemetry enters through an interface; simulated telemetry and mock notification are MVP adapter options. Real protocols and providers remain undecided.
- The telemetry inbound port dispatches accepted events toward the Operations module; Operations does not depend outward on an API-layer port.
- To keep the diagrams readable, use-case-module dependencies on Domain, Repository, and Notification ports are aggregated at the `Use-case Modules` boundary. The module-to-UC/service table above retains module-level traceability; notifications are requested by Reservations & Trips and Operations.
- Prototype-to-API edges are target dependencies only. Do not treat the mockup viewer as an integrated backend client.
- Component/package boundaries are logical code organization, not microservices, servers, containers, network links, or hardware.

## Technology and implementation status

| Area | Technology / choice | Status | Role | Source / decision |
| --- | --- | --- | --- | --- |
| Existing frontend prototype | HTML5, CSS3, Modern JavaScript without external libraries | Existing project prototype; mockup, not yet integrated with the target API | Student and Operator presentation experiences | [Project specification](../../PROJECT_SPECIFICATION.md) |
| Backend runtime and API | Node.js + Express | Confirmed MVP target; implementation not established by this view | HTTP API / interface layer | [DECISION.md](../../development_implement_view/DECISION.md) |
| Persistent storage | SQLite | Confirmed MVP target | Persistence technology behind the repository adapter | [DECISION.md](../../development_implement_view/DECISION.md) |
| Persistence boundary | Repository abstraction and transaction boundaries | Confirmed architectural decision; concrete driver, schema, and migration mechanism are open | Keep business rules independent of SQLite; protect atomic allocation and state transitions | [DECISION.md](../../development_implement_view/DECISION.md), [class catalog](../05_Class_Diagram/CLASS_CATALOG.md) |
| Telemetry | Simulated adapter for MVP; real protocol TBD | Permitted target option, not a selected hardware integration | Isolate incoming telemetry behind an interface | [DECISION.md](../../development_implement_view/DECISION.md) |
| Notifications | Mock adapter for MVP; production provider TBD | Permitted target option, not a selected provider | Isolate outbound notification requests behind an interface | [DECISION.md](../../development_implement_view/DECISION.md) |
| Other implementation tooling | API contract, authentication implementation, query/ORM library, validation/logging/testing tools, hosting, and CI/CD | Not selected | To be decided before implementation as needed | [DECISION.md](../../development_implement_view/DECISION.md) |

## Unresolved decisions

Before implementation, select the API contract and endpoint details; authentication/authorization approach; SQLite driver, schema, and migration strategy; validation, logging, and testing libraries; hosting and CI/CD; real telemetry protocol if required; and production notification provider if required. Do not infer named products for these items from the diagrams.

## Quality checklist

- [x] Both diagrams use the five agreed layers and show a single modular-monolith backend boundary.
- [x] Component and package/module names, key dependencies, adapter boundaries, and UC/service traceability are aligned.
- [x] The package layout is explicitly proposed, not described as existing repository structure.
- [x] Frontend/API integration and backend technologies are distinguished as planned targets versus implemented prototype behavior.
- [x] Repository abstraction, SQLite adapter, and transaction/atomicity requirements are shown without coupling business rules to SQLite.
- [x] Mock/simulated adapters and unresolved integrations are labeled.
- [x] No deployment topology, process/runtime behavior, or domain class model is substituted for this Development View.
- [x] PlantUML, Mermaid, native Draw.io, and editable SVG artifacts are provided for each diagram.
- [x] XML structure, graph references, and native/SVG model parity were checked after generation.
- [x] Both SVGs were inspected at fit zoom; no overlapping boxes or clipping were visible. A native Draw.io/PlantUML renderer is not installed, so those editor-specific render checks were unavailable.

## Source documents

- [DECISION.md](../../development_implement_view/DECISION.md) — confirmed architecture decisions and open items.
- [plan.md](../../development_implement_view/plan.md) — execution plan, source inventory, tasks, and acceptance criteria.
- [Development View rules](../../02_Rules/06_Development_Implementation_view.md) and [4+1 View rules](../../02_Rules/05_Architecture_4plus1_views.md).
- [Project specification](../../PROJECT_SPECIFICATION.md) — project scope, use cases, and prototype technology.
- [Domain class catalog](../05_Class_Diagram/CLASS_CATALOG.md) — proposed domain and service responsibilities.

## Opening and editing

- Open a `.drawio` file or its matching `.drawio.svg` in Draw.io for VS Code to inspect and edit the graph.
- The `.puml` files can be imported in tools that support PlantUML; the `.mmd` files can be previewed in Mermaid-compatible Markdown viewers.
- Editing the native `.drawio` file is the most direct way to change the mxGraph model; keep source and export variants synchronized after changes.
