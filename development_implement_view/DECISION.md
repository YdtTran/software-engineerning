# Development / Implementation View — Decisions

**Status:** Confirmed by the project owner  
**Confirmed:** 2026-11-03  
**Scope:** Submission #3 Development / Implementation View for Smart E-Mobility Hub

This document records the agreed architectural choices for the Development View. It is a design baseline for the MVP, not a statement that the backend has already been implemented. The source documents describe the project requirements and domain model; choices below fill in the implementation architecture where those documents leave options open.

## Confirmed decisions

| ID | Decision | Rationale |
| --- | --- | --- |
| DV-01 | Use a **modular monolith** for the MVP backend: one backend application organized into cohesive modules, not independently deployed microservices. | Keeps the MVP and its development manageable while allowing module boundaries to be shown and maintained. |
| DV-02 | Use five logical layers: **Presentation → API / Interface → Application → Domain → Infrastructure**. | Makes the client boundary, use-case coordination, business rules, and technical integrations visible to developers. |
| DV-03 | Use **Node.js + Express** for the MVP backend API and **SQLite** for persistent storage. | Provides a lightweight backend and database choice compatible with a small MVP and the existing JavaScript prototype. |
| DV-04 | Keep the current prototype frontend technology: **HTML5, CSS3, and Modern JavaScript without external libraries**. Do not introduce a frontend framework as part of this decision. | This is the technology documented for the existing prototype in `PROJECT_SPECIFICATION.md`. |
| DV-05 | Use a **Repository abstraction** between application/domain logic and SQLite. Use database transactions where needed to preserve atomic resource-allocation and state-transition rules. Do not couple business logic directly to SQLite-specific APIs. | Keeps persistence replaceable and supports the domain model's atomic reservation, charging, and resource-allocation requirements. |
| DV-06 | Deliver both a **Component Diagram** and a **Package Diagram**, with a concise explanation of layer/module responsibilities and dependencies, under `01_Diagram/06_Development_View/`. | The project’s 4+1 rules map the Development View to Component and Package Diagrams. The Package Diagram describes intended code organization, not existing folders. |
| DV-07 | For these diagrams, provide editable Draw.io SVG files and corresponding PlantUML source and Mermaid previews, following the workspace UML workflow. | Keeps the deliverables consistent with the diagram workflow already used in this repository. |

## Intended layer and module boundaries

The following is the agreed architectural direction for the diagrams. These are logical components; they do not imply separate processes or deployments.

| Layer | Responsibility |
| --- | --- |
| Presentation | Student and Operator user interfaces. The current prototype has student, Operator field, and Operator web experiences. |
| API / Interface | Express HTTP endpoints and adapters that translate client requests and incoming telemetry into application operations. |
| Application | Coordinates use cases and application services, including reservation, vehicle, charging, redistribution, incident, telemetry, and simulation operations. |
| Domain | Owns business concepts, rules, validations, and state transitions for accounts, hubs, vehicles, parking, reservations, trips, charging, transfers, incidents, and simulations. |
| Infrastructure | Implements repositories using SQLite and adapters for telemetry input and notifications. It may provide a simulated telemetry or notification adapter for the MVP. |

Organize application code into cohesive modules around the domain and use cases, such as **Accounts and Resources**, **Reservations and Trips**, **Charging**, **Operations** (redistribution, incidents, and telemetry), and **Simulation**. Keep the module boundaries visible in the Package Diagram; do not model each module as a separately deployed service.

The dependency direction is from clients through the API and application layers toward domain rules. Infrastructure implements technical ports used by the application; domain and application business rules must not depend directly on Express or SQLite implementation details.

## Explicitly out of scope or still open

- Server, cloud, network, and physical IoT-node topology belong in the separate **Deployment View**.
- Real hardware protocols are not selected. The MVP may use simulated telemetry behind an adapter; a real IoT integration can replace it later.
- A production notification provider is not selected. The MVP may use a mock adapter.
- Authentication/authorization implementation details, API endpoint contract, SQLite schema and migration tool, ORM/query library, hosting, and CI/CD are not decided by this document.
- The architecture is a target design for the MVP; it does not claim that a backend implementation or the proposed package structure already exists.

## Sources

- `PROJECT_SPECIFICATION.md` — project scope, MVP constraints, prototype technologies, and Submission #3 requirements.
- `02_Rules/05_Architecture_4plus1_views.md` — Development View diagram mapping and 4+1 conventions.
- `01_Diagram/05_Class_Diagram/CLASS_CATALOG.md` — proposed domain classes, service responsibilities, and atomicity expectations.
- `01_Diagram/05_Class_Diagram/README.md` — class-design deliverable context.
