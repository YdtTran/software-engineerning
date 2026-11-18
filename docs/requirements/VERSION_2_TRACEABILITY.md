# Version 2 demo and documentation traceability

This inventory describes the working-tree demo reviewed on 17 November 2026. “Version 2” is a documentation baseline, not a release number. The [assignment](../references/04_BTL_SoftwareEngineering_HK261.pdf) defines the project scope; the [specification](PROJECT_SPECIFICATION.md) and [lifecycle contracts](../diagrams/01_Usecase_Diagram/LIFECYCLE_SCENARIOS.md) record the team's requirements and policies. The diagrams are models of those requirements, not a promise that every modeled interaction has a dedicated screen.

The demo runs one Express application with Operations, Mobility/Simulation and Parking/Charging modules. The primary user interface is the [native Android app](../../android/README.md); live operator interfaces are `operator-web.html` and `operator-app.html`, described in the [demo guide](../architecture/MINH_DEMO_GUIDE.md). The web interface covers network monitoring, resource administration, transfers, incidents, charging schedules and simulations; the mobile operator interface covers the overview, simulations and transfer recommendations. The [offline design viewer](../../app/prototype/README.md) is a mockup. The additional [Flutter client](../../app/flutter_mobile/README.md) is not the primary demo client.

## Use cases and implementation

All UC requirements are in the [master specification](PROJECT_SPECIFICATION.md); the [use-case index](../diagrams/01_Usecase_Diagram/README.md) links each editable view. The table gives the principal dynamic views, where present. Sequence and activity diagrams cover selected flows, not every exception or interaction. Class and architecture views are shared across use cases and indexed [here](../diagrams/README.md).

| UC or interaction | Contract and main behavior | Dynamic views | Implementation and interface |
|---|---|---|---|
| UC01 | Search hubs | — | Mobility discovery API; Android search/map |
| UC02 | View available vehicles | — | Mobility discovery API; Android vehicle list |
| UC03 | Reserve or cancel a vehicle reservation | AD01, SQ01, SC03 | Mobility rental API; Android |
| UC04 | Pick up a reserved vehicle | AD02, SQ02, SC01, SC03 | Mobility rental API and simulated dock; Android |
| UC05 | Return a vehicle | AD03, SQ03, SC01, SC03 | Mobility rental API and simulated dock; Android |
| UC06 / UC06-S1 | Manage parking / create or cancel a parking reservation | AD04 | Parking API; Android |
| UC06-S2 | Check in a private vehicle; historical UC06A | AD04 | Parking API; Android |
| UC06-S3 | Check out a private vehicle; historical UC06B | AD04 | Parking API; Android |
| UC07 | Submit or cancel a charging request | AD04, SQ04, SC02 | Charging API; Android |
| UC07A | Stop a charging session | AD04, SC02 | Charging API; Android |
| UC08 | Monitor the hub network | — | Operations API; operator desktop and mobile overview |
| UC09 | Manage mobility resources | — | Operations API; operator desktop |
| UC10 / UC10A / UC10B | Create, confirm arrival of, or cancel a transfer | AD05, SQ05, SC01 | Operations API; operator desktop; mobile supports transfer recommendations |
| UC11 | Handle operational incidents | AD06, SQ06, SC01, SC02 | Operations API; operator desktop |
| UC11A | Report a trip incident | AD06 | Operations API; Android |
| UC12 | Manage charging schedule | AD04, SC02 | Charging API; operator desktop |
| UC13 | Run a what-if simulation | AD07, SQ07 | Simulation API; operator desktop and mobile |
| UC14 | View simulation results | AD07, SQ07 | Simulation API; operator desktop and mobile |

UC06-S1, S2 and S3 are independent interactions within the UC06 goal. A reservation commitment, physical occupancy and charging session are distinct concepts. The [lifecycle contracts](../diagrams/01_Usecase_Diagram/LIFECYCLE_SCENARIOS.md) specify their conditions and exceptions; the [API contracts](../architecture/API_CONTRACTS.md) describe HTTP integration. Presence of an API or a diagram does not by itself establish that every modeled alternative is exposed by each interface.

## Documentation status and continuation

- The [architecture decision](../architecture/DECISION.md) describes the target; [app/README.md](../../app/README.md) describes the running demo. The [development guide](../architecture/DEVELOPMENT_GUIDE.md) is a historical workstream guide. Submission reports and post-merge audits are historical snapshots.
- The specification's UI section describes the original mockup and its screen inventory. Use this page and the demo guides for current interface coverage.
- The class checker now reads lifeline headers from the seven editable sequence canvases, rather than the missing generated `PLANTUML_SEQUENCE.md`. Its mapping check covers 13 current names. The catalog's 19 classes, 18 methods, four generalizations and 31 associations pass its checks; the existing editable class drawing matches the generator's compact projection. No class diagram was regenerated.
- The assignment describes five what-if situations as examples. The specification now identifies them as examples and makes clear that recommendations do not themselves change live state; its UC13/UC14 contracts already require a separate UC10 or UC12 action. The assignment-to-UC scope and implementation route inventory were reviewed at a high level; a route's presence does not establish complete contract compliance.
- Source checks pass for 44 editable Draw.io files, including 23 use-case, 10 activity/state and seven sequence files; compact-projection corruption fixtures pass. These structural checks do not establish visual quality or complete semantic consistency.
- The [contract review](VERSION_2_CONTRACT_REVIEW.md) maps UC01–UC14 and lifecycle interactions to services and tests and records confirmed coverage limits. The [core scenarios](../diagrams/01_Usecase_Diagram/CORE_SCENARIOS.md) now provide 11-field contracts, with UC06 and later interactions in the lifecycle contracts. The old scenario generator data for UC06 and UC07 was aligned with the current lifecycle contracts. `npm test` passed with 169 successes and three skips; this is evidence for tested paths, not full contract coverage.
- The deployment canvas and [deployment guide](../diagrams/deployment/README-deployment.md) now describe the running Android/browser, Express and SQLite demo; target component/package views remain explicitly labeled as target models. The demo guide now uses the provisioned `user` account. Deployment was rendered and visually checked.
- AD05 and SQ05 now show the explicit source, destination, vehicle and slot choices, with one atomic plan commit and a separate departure commit. UC10A/UC10B clarify same-key replay versus a new request; 20 transfer/idempotency tests passed.
- AD02 and SQ02 now show reservation selection and vehicle-code validation; an unconfirmed unlock retains the claim and records an event. The pre-pickup damage report remains documented as a target capability outside the demo. Rental lifecycle tests: 11 passed.
- SQ04 now documents the Android private-vehicle request payload and places connector/power checks at allocation; AD04 identifies the service-only activation and unplug boundaries. Both updated canvases were rendered.
- SC02 now separates allocation, activation, power-off and unplug acknowledgement. Service tests cover these steps; the demo HTTP router does not expose activation, unplug, reconciliation or safety-check methods. See [API contracts](../architecture/API_CONTRACTS.md) and [statechart notes](../diagrams/04_Statechart_Diagram/README.md). Nine charging scheduling/session tests passed.
- SC01 and SC03 now distinguish an unconfirmed pickup from a vehicle fault, retain the pickup claim, and describe low-battery classification without implying an automatic charging request; [statechart notes](../diagrams/04_Statechart_Diagram/README.md) distinguish guarded domain paths from exposed demo workflows. Both canvases were rendered and visually checked.
- AD04 was rendered and visually sampled. SQ03 and AD03 now show the Android confirmation before the dock command, while still requiring dock evidence before completion; their editable canvases and previews were updated and rendered. UC13/UC14 now agree across the detailed and overview canvases: export and transfer recommendation review extend UC14, while UC13 includes UC14. JSON export and the transfer handoff match the current UI; other modeled export/filter/compare options are marked unimplemented.
- AD06, SQ06, UC11 and UC11A were reconciled with `IncidentService` and `incident-regression.test.js`: `SQ06` models `POST /incidents/:id/handle` assigning maintenance (`Investigating`) without claiming automatic physical isolation (`confirmIsolation` remains service-only); `AD06` is explicitly labeled as the target safety flow with its `Incident Service` lane restored; `LIFECYCLE_SCENARIOS.md`, `CORE_SCENARIOS.md` and `02_Sequence_Diagram/README.md` (now containing PlantUML and Mermaid previews for all seven `SQ01–SQ07` diagrams) distinguish demo photo/notification limits from target contracts.
- Remaining behavioral diagrams (`AD01`, `SQ01`, `AD07`, `SQ07`, and `SC02` with `charging-guard.js` and `InventoryService`) and all detailed use-case views (`UC01–UC14`) were audited against [the contract review](VERSION_2_CONTRACT_REVIEW.md), services and tests. Rendered geometry checks via Draw.io `viewer-static` in headless Chromium passed across all 23 use-case, 7 sequence, 7 activity and 3 statechart `.drawio` files after fixing `SQ06` `label_1` and `AD06` `lane_1`. Target component and package views (`DV01`, `DV02`) remain explicitly marked as target models; optional SQLite driver tests (`better-sqlite3`/`sqlite3`) and `LIVE_PLAYWRIGHT` UI tests remain environment-skipped.
