# Reviewed use-case diagrams

All 15 original diagrams from `refs/uc_uml/USE_CASE/` have been redrawn as native editable `.drawio` files, editable `.drawio.svg` previews, and PNG exports. The original reference PNGs are preserved. Each existing diagram filename is retained in its original STUDENTS, OPERATOR, or GENERAL folder.

## Resolved conflicts

1. UC06 uses **Reserve Parking Space**, correcting the original “Reverse” label.
2. Student and Operator are primary actors outside the system boundary on the **left**, including the overview.
3. UC11 **includes** Isolate Faulty Resource and Schedule Maintenance. They are required by its main flow and postcondition.
4. Vehicle holds expire at `Reservation_Time + 15 minutes`; parking reservations expire at `ScheduledArrivalTime + 30 minutes` if not checked in. The expiry job uses `Current_Time >= ExpiresAt` only for `Pending/Reserved` records.
5. The simulation engine is an internal component, not a supporting actor. The report and master specification have been updated.

## Files

| Diagram | Edit | Preview | PNG |
|---|---|---|---|
| general_usecase_diagram | [Draw.io](GENERAL/general_usecase_diagram.drawio) | [Editable SVG](GENERAL/general_usecase_diagram.drawio.svg) | [PNG](GENERAL/general_usecase_diagram.png) |
| UC10-Redistribute_Vehicles | [Draw.io](OPERATOR/UC10-Redistribute_Vehicles.drawio) | [Editable SVG](OPERATOR/UC10-Redistribute_Vehicles.drawio.svg) | [PNG](OPERATOR/UC10-Redistribute_Vehicles.png) |
| UC11-Handle_Operational_Incident | [Draw.io](OPERATOR/UC11-Handle_Operational_Incident.drawio) | [Editable SVG](OPERATOR/UC11-Handle_Operational_Incident.drawio.svg) | [PNG](OPERATOR/UC11-Handle_Operational_Incident.png) |
| UC12-Manage_Charging_Schedule | [Draw.io](OPERATOR/UC12-Manage_Charging_Schedule.drawio) | [Editable SVG](OPERATOR/UC12-Manage_Charging_Schedule.drawio.svg) | [PNG](OPERATOR/UC12-Manage_Charging_Schedule.png) |
| UC13-Run_What-if_Simulation | [Draw.io](OPERATOR/UC13-Run_What-if_Simulation.drawio) | [Editable SVG](OPERATOR/UC13-Run_What-if_Simulation.drawio.svg) | [PNG](OPERATOR/UC13-Run_What-if_Simulation.png) |
| UC14-View_Simulation_Results | [Draw.io](OPERATOR/UC14-View_Simulation_Results.drawio) | [Editable SVG](OPERATOR/UC14-View_Simulation_Results.drawio.svg) | [PNG](OPERATOR/UC14-View_Simulation_Results.png) |
| UC8-Monitor_Mobility_Hub_Network | [Draw.io](OPERATOR/UC8-Monitor_Mobility_Hub_Network.drawio) | [Editable SVG](OPERATOR/UC8-Monitor_Mobility_Hub_Network.drawio.svg) | [PNG](OPERATOR/UC8-Monitor_Mobility_Hub_Network.png) |
| UC9-Manage_Mobility_Resources | [Draw.io](OPERATOR/UC9-Manage_Mobility_Resources.drawio) | [Editable SVG](OPERATOR/UC9-Manage_Mobility_Resources.drawio.svg) | [PNG](OPERATOR/UC9-Manage_Mobility_Resources.png) |
| UC01-Search_Mobility_Hub | [Draw.io](STUDENTS/UC01-Search_Mobility_Hub.drawio) | [Editable SVG](STUDENTS/UC01-Search_Mobility_Hub.drawio.svg) | [PNG](STUDENTS/UC01-Search_Mobility_Hub.png) |
| UC02-View_Available_Vehicles | [Draw.io](STUDENTS/UC02-View_Available_Vehicles.drawio) | [Editable SVG](STUDENTS/UC02-View_Available_Vehicles.drawio.svg) | [PNG](STUDENTS/UC02-View_Available_Vehicles.png) |
| UC03-Reserve_Vehicle | [Draw.io](STUDENTS/UC03-Reserve_Vehicle.drawio) | [Editable SVG](STUDENTS/UC03-Reserve_Vehicle.drawio.svg) | [PNG](STUDENTS/UC03-Reserve_Vehicle.png) |
| UC04-Pick_Up_Vehicle | [Draw.io](STUDENTS/UC04-Pick_Up_Vehicle.drawio) | [Editable SVG](STUDENTS/UC04-Pick_Up_Vehicle.drawio.svg) | [PNG](STUDENTS/UC04-Pick_Up_Vehicle.png) |
| UC05-Return_Vehicle | [Draw.io](STUDENTS/UC05-Return_Vehicle.drawio) | [Editable SVG](STUDENTS/UC05-Return_Vehicle.drawio.svg) | [PNG](STUDENTS/UC05-Return_Vehicle.png) |
| UC06-Reserve_Parking_Space | [Draw.io](STUDENTS/UC06-Reserve_Parking_Space.drawio) | [Editable SVG](STUDENTS/UC06-Reserve_Parking_Space.drawio.svg) | [PNG](STUDENTS/UC06-Reserve_Parking_Space.png) |
| UC07-Request_Charging | [Draw.io](STUDENTS/UC07-Request_Charging.drawio) | [Editable SVG](STUDENTS/UC07-Request_Charging.drawio.svg) | [PNG](STUDENTS/UC07-Request_Charging.png) |

[PlantUML and Mermaid source blocks for all 15 diagrams](PLANTUML_ALL.md). Mermaid is a flowchart approximation; the Draw.io exports are the checked layout reference.

## Quality checklist

| Check | Result |
|---|---|
| 14 core use cases preserved in the overview | PASS |
| Actors outside the system, primary actors on the left | PASS |
| Correct include, extend, and generalization directions | PASS |
| Light ocean blue boundary and dynamic 60/55/50 px padding | PASS |
| Separate edgeLabel cells for relationship labels | PASS |
| Rendered edges: no crossings, T junctions, or overlapping segments | PASS |
| No edges through unrelated shapes; no label collisions or clipping | PASS |
| Native Draw.io XML structural validation | PASS: 15 files, 0 errors, 0 warnings |
| SVG exports contain the editable source XML | PASS |

Geometry is checked from the installed Draw.io renderer’s actual cell states and edge paths, not inferred from screenshots. Associations sharing an actor endpoint are intentional; they share no edge segments. See [verification.json](verification.json) for per-diagram results.

## Open and import

1. **VS Code:** double-click a `.drawio.svg` file with the Draw.io Integration extension installed.
2. **Draw.io:** open a `.drawio` file, or paste a PlantUML block using `+` → `Advanced` → `PlantUML`.
3. **VP Online:** use `File` → `Import` → `PlantUML...` and paste the corresponding block.

## Regenerate

From the repository root, run `.agent/scripts/generate_all.py` with Python. It regenerates the native files and source catalog, then runs `render_usecases.cjs` to check geometry and export SVG/PNG. The generator retains the existing semantic IDs.

Requires Graphviz `dot`, the drawio-skill scripts (default `~/.agents/skills/drawio-skill`, override `DRAWIO_SKILL`), Node.js, Playwright, Edge, and the installed Draw.io VS Code extension. Renderer paths can be overridden with `DRAWIO_PLAYWRIGHT` and `DRAWIO_VIEWER`. No application UI or runtime behavior was changed.
