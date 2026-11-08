# DV01 — Component Diagram
[alt text](DV01-Component_Diagram_New.drawio)
## 1. Purpose and scope

This diagram describes the **target logical components** for the Smart E-Mobility Hub MVP. It focuses on component responsibilities, layer boundaries, interfaces, and dependencies for the Development / Implementation View.

The backend is designed as **one modular monolith**. The components inside its boundary are logical modules and adapters, not independently deployed services, processes, servers, containers, or hardware devices. This diagram does not claim that the target backend or these component implementations already exist.

The diagram is based on the canonical PlantUML source in the Development View:

- [DV01 Component Diagram — PlantUML source](README.md)
- [Editable Draw.io source](DV01-Component_Diagram_New.drawio)
- The project-specific rules are in [06_Development_Implementation_view.md](../../architecture/UML_DIAGRAM_STANDARDS_NOTE.md).

Use the PlantUML model and the Development View rules as the semantic reference when reviewing or updating this documentation. The Draw.io file is an editable format version of the diagram. PNG export can be placed in the `png` folder when that folder is added.

## 2. Architectural organization

The component model follows the five agreed logical layers:

1. **Presentation** — User and Operator user experiences.
2. **API / Interface** — target Express HTTP API and external-input translation.
3. **Application** — use-case modules and application-owned contracts.
4. **Domain** — business model, invariants, validation, and state transitions.
5. **Infrastructure** — persistence and external-system adapters.

The diagram groups the five application modules under a `Use-case Modules` boundary. This grouping keeps dependencies readable; it does not make the modules separate services or deployments.

## 3. Components and responsibilities

### Presentation — existing prototype, not integrated

| Component | Responsibility and status |
| --- | --- |
| **User Mobile experience** | Presents the User-facing prototype experience. Its HTTP dependency is planned; the current mockup is not wired to the target API. |
| **Operator Field Mobile experience** | Presents the field-operator prototype experience. API integration is planned, not established. |
| **Operator Web Dashboard experience** | Presents the operator web prototype. API integration is planned, not established. |
| **Shared Preview Shell (`index.html` + `app.js`)** | Renders the three mockup experiences for review. It is not a backend client or an implemented application service. |

### API / Interface — MVP target

| Component | Responsibility and status |
| --- | --- |
| **Express HTTP API** | Target HTTP entry point. It translates client requests and incoming telemetry into application-level operations. Node.js + Express are selected for the MVP target; endpoint contracts remain open. |

### Application — cohesive modules and ports

| Component or interface | Responsibility |
| --- | --- |
| **Accounts & Resources** | Resource queries, eligibility, lifecycle, and administration; `VehicleService` is a service concept. Traceability: UC01–02, UC08–09. |
| **Reservations & Trips** | Reservation holds, pickup/return, and trip coordination; `ReservationHub` is a service concept. Traceability: UC03–06, FR-NI01. |
| **Charging** | Charging request validation and allocation; `ChargingScheduler` is a service concept. Traceability: UC07, UC12. |
| **Operations** | Redistribution, incident handling, and telemetry responsibilities; `RedistributionService`, `IncidentService`, and `TelemetryService` are service concepts. Traceability: UC08–11, FR-NI02–04. |
| **Simulation** | Scenario execution, results, and recommendations; `SimulationEngine` is a service concept. Traceability: UC13–14. |
| **Persistence Ports** | Application-owned abstractions for resource, reservation, charging, operations, and simulation repositories. The concrete database API is kept behind an adapter. |
| **Notification Outbound Port** | Application-owned contract for outbound notification requests. A production provider is not selected. |
| **Telemetry Input Contract** | Application-owned input contract for accepted telemetry. Operations realizes this application-level contract; the API and simulated telemetry adapter depend on it. |

Service names and UC/FR mappings provide design traceability. They do not prove that the services have been implemented or that every Use Case maps one-to-one to a module.

### Domain — business rules

| Component | Responsibility |
| --- | --- |
| **Domain Model & Business Invariants** | Owns business concepts and rules for accounts, hubs, vehicles, parking slots, reservations, trips, charging, transfers, incidents, and simulations. It does not depend on UI, Express, or SQLite implementation details. |

### Infrastructure — adapters and persistence target

| Component | Responsibility and status |
| --- | --- |
| **SQLite Repository Adapter** | Target implementation of the Repository Ports. It isolates database-specific operations from application and domain rules. |
| **SQLite Persistence** | Selected MVP persistence technology, not a deployment node or source package. Schema, driver, and migration approach remain open. |
| **Simulated Telemetry Adapter** | Permitted MVP option that submits telemetry through the Application-owned input contract. A real hardware protocol is undecided. |
| **Mock Notification Adapter** | Permitted MVP option that realizes the Notification Outbound Port. A production notification provider is undecided. |

## 4. Dependency and interface semantics

The PlantUML source uses UML 2 component notation (`componentStyle uml2`) and distinguishes components from interfaces. In the relationship descriptions below, an arrow points from the dependent/client element to the element it uses or realizes.

| Source | Target | Meaning |
| --- | --- | --- |
| User Mobile, Operator Field Mobile, Operator Web Dashboard | Express HTTP API | Planned HTTP dependencies only; current mockups are not integrated. |
| Express HTTP API | Use-case Modules | The API uses application operations. |
| Use-case Modules | Domain Model & Business Invariants | Application use cases use domain behavior. |
| Use-case Modules | Persistence Ports | Application modules use repository abstractions rather than a concrete database API. |
| Use-case Modules | Notification Outbound Port | Application modules request notifications through an abstraction. |
| Operations | Telemetry Input Contract | UML realization: Operations provides the Application-owned telemetry contract. |
| SQLite Repository Adapter | Persistence Ports | UML realization: the adapter implements repository abstractions. |
| SQLite Repository Adapter | SQLite Persistence | The adapter persists state using the selected technology. |
| Express HTTP API | Telemetry Input Contract | The API submits accepted telemetry into the application contract. |
| Simulated Telemetry Adapter | Telemetry Input Contract | The simulated source submits telemetry through the same contract. |
| Mock Notification Adapter | Notification Outbound Port | UML realization: the adapter provides the outbound notification contract. |

The distinction between **uses/dependency** and **realization** is intentional. A use dependency points to a supplier; realization indicates that an implementation fulfills an interface contract. The target architecture keeps repository and notification abstractions at the Application boundary and prevents business logic from depending on Express or SQLite details.

## 5. Technology and implementation status

| Area | Choice | Status |
| --- | --- | --- |
| Frontend | HTML5, CSS3, Modern JavaScript | Existing prototype technology; UI/API integration is not established. |
| Backend API | Node.js + Express | Confirmed MVP target; backend implementation is not established by this diagram. |
| Persistent storage | SQLite | Confirmed MVP target behind the Repository Adapter. |
| Repository abstraction and transaction boundaries | Repository Ports; transactions for applicable allocation and state transitions | Confirmed architectural requirements; concrete driver, schema, and migration tool remain open. |
| Telemetry | Simulated adapter is an MVP option | Real hardware protocol is undecided. |
| Notifications | Mock adapter is an MVP option | Production provider is undecided. |

## 6. Modeling rules and interpretation

- Read this as a Development View: components describe logical software responsibilities and contracts.
- Do not infer server, cloud, container, network, hardware, process, or deployment topology from component placement.
- Do not connect Presentation directly to SQLite or make Domain/Application depend on framework/database-specific implementations.
- Keep the planned status of frontend-to-API dependencies visible.
- Preserve the application ownership of telemetry input and the adapter direction shown in the PlantUML source.
- Use the class catalog for detailed domain classes; this component view intentionally groups those concepts into a Domain component.
- If an approved architecture decision changes, update the decision record and synchronize the PlantUML model, other diagram formats, and supporting documentation.

## 7. Quality checklist

- [x] Five logical layers are represented.
- [x] The backend is shown as one modular monolith, not as separate services.
- [x] Components, contracts, ordinary dependencies, and realizations are distinguished.
- [x] Repository/SQLite, telemetry, and notification boundaries are explicit.
- [x] Existing prototype, MVP target, optional adapter, and undecided integration statuses are not conflated.
- [x] UML semantics are documented from the canonical PlantUML source and the project Development View rules.
- [ ] PNG export: add the generated preview to the `png` folder when it is created.

## 8. Source references

- [Canonical DV01 PlantUML](README.md)
- [Development / Implementation View rules](../../architecture/UML_DIAGRAM_STANDARDS_NOTE.md)
- [Confirmed Development View decisions](../../architecture/DECISION.md)
- [Shared Development View deliverables and status](../README.md)
