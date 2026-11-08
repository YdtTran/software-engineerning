# DV02 — Package Diagram
[alt text](DV02-Package_Diagram_New.drawio)
## 1. Purpose and scope

This diagram describes a **proposed source/package organization** for the Smart E-Mobility Hub MVP. Its purpose is to show logical grouping by layer and business module, together with package dependency direction.

The packages are a target design, **not a statement that these source folders or packages already exist**. The five backend layers belong to one modular monolith; they are not independently deployed services. This package view does not specify runtime interactions, infrastructure topology, servers, containers, or hardware.

The diagram is based on the canonical PlantUML source in the Development View:

- [DV02 Package Diagram — PlantUML source](README.md)
- [Editable Draw.io source](DV02-Package_Diagram_New.drawio)
- The project-specific rules are in [06_Development_Implementation_view.md](../../architecture/UML_DIAGRAM_STANDARDS_NOTE.md).

Use the PlantUML model and the Development View rules as the semantic reference when reviewing or updating this documentation. The Draw.io file is an editable format version of the diagram. PNG export can be placed in the `png` folder when that folder is added.

## 2. Proposed package hierarchy

### Smart E-Mobility Hub — proposed source/package structure

#### Presentation

- **User Mobile Experience** — proposed grouping for the User-facing UI experience; the existing UI is a mockup.
- **Operator Field Mobile Experience** — proposed grouping for the field-operator UI experience.
- **Operator Web Dashboard Experience** — proposed grouping for the operator web experience.
- **Shared Preview Shell** — the existing mockup viewer grouping; it is not an implemented backend client.

Presentation-to-API package dependencies are target-only. The current mockups are not wired to the target API.

#### API / Interface

- **Express HTTP API** — target API package for client request and external-input translation. Node.js + Express are confirmed MVP target technology; the API contract/endpoints remain undecided.

#### Application

- **Use-case Modules**
  - **Accounts & Resources** — resource queries, eligibility, lifecycle, and administration.
  - **Reservations & Trips** — reservation, pickup/return, and trip coordination.
  - **Charging** — charging request handling and allocation/scheduling.
  - **Operations** — redistribution, incidents, and telemetry responsibilities.
  - **Simulation** — scenario execution and recommendation/result workflows.
- **Application Ports**
  - **Repository Ports** — abstractions for persistence operations.
  - **Notification Outbound Port** — abstraction for outbound notification requests.
  - **Telemetry Input Contract** — application-owned input contract used by API/operations/telemetry source packages.

#### Domain

- **Accounts & Resources Domain**
- **Reservations & Trips Domain**
- **Charging Domain**
- **Operations Domain**
- **Simulation Domain**

These are proposed package groupings for domain concepts and rules. They are not separate deployables and do not replace the detailed Class Diagram.

#### Infrastructure

- **SQLite Repository Adapter** — target adapter implementing Repository Ports.
- **Simulated Telemetry Adapter** — permitted MVP option; real protocol is undecided.
- **Mock Notification Adapter** — permitted MVP option; production provider is undecided.

SQLite itself is intentionally not shown as a source package. It is the selected persistence technology behind the repository adapter, not a package, server, or deployment node in this diagram.

## 3. Package dependency relationships

Package dependencies use a dashed UML dependency arrow directed from the **client/source package** to the **supplier/used package**. In the PlantUML source, each dependency is labeled `<<access>>`. These represent source-level package relationships, not method calls, runtime dispatch, or interface realization.

| Client/source package | Supplier/used package | Meaning in the proposed structure |
| --- | --- | --- |
| User Mobile Experience | Express HTTP API | Planned access to the target API; not implemented by the current mockup. |
| Operator Field Mobile Experience | Express HTTP API | Planned access to the target API; not implemented by the current mockup. |
| Operator Web Dashboard Experience | Express HTTP API | Planned access to the target API; not implemented by the current mockup. |
| Express HTTP API | Use-case Modules | API package depends on application use-case packages. |
| Express HTTP API | Telemetry Input Contract | Incoming telemetry is submitted through the application-owned contract. |
| Operations | Telemetry Input Contract | Operations depends on the contract it provides/realizes in the Component Diagram. |
| Use-case Modules | Domain | Application use cases depend inward on domain behavior. |
| Use-case Modules | Repository Ports | Persistence is accessed through application-level abstractions. |
| Use-case Modules | Notification Outbound Port | Outbound notifications are requested through an application-level abstraction. |
| SQLite Repository Adapter | Repository Ports | Infrastructure adapter depends on the persistence abstraction it implements. |
| Simulated Telemetry Adapter | Telemetry Input Contract | Optional simulated source submits data through the application-owned contract. |
| Mock Notification Adapter | Notification Outbound Port | Optional adapter depends on the outbound contract it implements. |

For readability, application-to-domain dependencies are aggregated at the `Use-case Modules` and `Domain` layer boundaries. The diagram does not claim every internal module has an identical dependency set or add direct package dependencies that are not in the PlantUML model.

## 4. Relationship to the Component Diagram

The package diagram uses the same layer and module names as DV01, but its elements are **packages** rather than components or interfaces. The package view explains organization of source code; the component view explains logical component responsibilities and interface/realization relationships.

| Package view | Corresponding component-view concept |
| --- | --- |
| Presentation experience packages | User and Operator presentation components plus shared preview shell |
| API / Interface → Express HTTP API | Express HTTP API component |
| Application → Use-case Modules | Five application module components, grouped under `Use-case Modules` |
| Application → Application Ports | Persistence, notification, and telemetry interfaces |
| Domain packages | Domain Model & Business Invariants component |
| Infrastructure adapter packages | SQLite Repository, Simulated Telemetry, and Mock Notification adapter components |

An application-owned interface remains an interface contract in the component view; a similarly named source package is only an organizational container. Package dependency and interface realization must not be conflated.

## 5. Technology and implementation status

| Area | Choice | Status and interpretation |
| --- | --- | --- |
| Presentation | HTML5, CSS3, Modern JavaScript | Existing prototype/mockup technology; integration with the target API is not established. |
| Backend API | Node.js + Express | Confirmed MVP target; not evidence of an implemented backend. |
| Persistent storage | SQLite | Confirmed MVP target behind the Repository Adapter; not represented as a package. |
| Package layout | Five layers and five Application modules | Proposed source organization; not an existing repository tree. |
| Telemetry adapter | Simulated telemetry | Permitted MVP option; real hardware protocol is not selected. |
| Notification adapter | Mock notification | Permitted MVP option; production provider is not selected. |
| API contract, authentication implementation, schema/migrations, driver/ORM, validation/logging/testing, hosting and CI/CD | Not selected | Remain open; no specific library or deployment technology is inferred by this diagram. |

## 6. Modeling rules and interpretation

- Package names represent stable layer/module groupings, not individual Use Cases, screens, classes, or deployed services.
- Dependency direction is client package → supplier package.
- `<<access>>` is used as the dependency stereotype in the source model; it does not mean runtime call or implementation/realization.
- Repository, notification, and telemetry port packages belong to the Application boundary; infrastructure adapters depend on those abstractions.
- Do not add a direct UI-to-SQLite dependency or a business-layer dependency on Express/SQLite implementation details.
- Do not infer network, process, cloud, server, database-server, or hardware deployment topology.
- If the architecture decision changes, update the confirmed decision record first, then synchronize both diagram models and their supporting documentation.

## 7. Quality checklist

- [x] The diagram is explicitly described as proposed source/package structure.
- [x] Five layers and Application modules align with the confirmed target architecture.
- [x] Dashed package dependencies point from client/source to supplier/used packages.
- [x] Package dependencies are distinguished from runtime calls and component interface realization.
- [x] SQLite is treated as persistence technology rather than a source package or deployment node.
- [x] Presentation/API status, optional adapters, and undecided technologies remain explicit.
- [x] Documentation is based on the PlantUML source and the Development View rules.
- [ ] PNG export: add the generated preview to the `png` folder when it is created.

## 8. Source references

- [Canonical DV02 PlantUML](README.md)
- [Development / Implementation View rules](../../architecture/UML_DIAGRAM_STANDARDS_NOTE.md)
- [Confirmed Development View decisions](../../architecture/DECISION.md)
- [Shared Development View deliverables and status](../README.md)
