# Activity Diagram

Editable diagrams are in `drawio/`.

Open a `.drawio` file in diagrams.net or the Draw.io extension for VS Code to edit it.

| Diagram | Draw.io |
| --- | --- |
| AD01-Reserve_Vehicle | [Edit](drawio/AD01-Reserve_Vehicle.drawio) |
| AD02-Pick_Up_Vehicle | [Edit](drawio/AD02-Pick_Up_Vehicle.drawio) |
| AD03-Return_Vehicle | [Edit](drawio/AD03-Return_Vehicle.drawio) |
| AD04-Reserve_Parking_and_Charging | [Edit](drawio/AD04-Reserve_Parking_and_Charging.drawio) |
| AD05-Redistribute_Vehicles | [Edit](drawio/AD05-Redistribute_Vehicles.drawio) |
| AD06-Handle_Operational_Incident | [Edit](drawio/AD06-Handle_Operational_Incident.drawio) |
| AD07-Run_What_if_Simulation | [Edit](drawio/AD07-Run_What_if_Simulation.drawio) |

## Scope and traceability

These canvases show system-level activities. Read the [project specification](../../requirements/PROJECT_SPECIFICATION.md) and [lifecycle contracts](../01_Usecase_Diagram/LIFECYCLE_SCENARIOS.md) for retries, reconciliation, and other detailed exceptions. [PlantUML sources and Mermaid previews](ACTIVITY_PREVIEWS.md) follow the editable canvases.

| Activity | Use cases | Sequence | Statechart | Outcome and detailed exceptions |
| --- | --- | --- | --- | --- |
| AD01 | UC03 | SQ01 | SC01, SC03 | User confirms reservation. Check eligibility before holding the vehicle. UC03 and FR-NI01 cover contention and expiry. |
| AD02 | UC04 | SQ02 | SC01, SC03 | User selects a reservation and enters a vehicle code. Confirm unlock before starting the trip and releasing its slot. Unconfirmed unlock retains the claim for reconciliation. The pre-pickup damage report remains a target requirement outside the current demo flow. |
| AD03 | UC05 | SQ03 | SC01, SC03 | User confirms parking, then the system claims usable capacity and verifies lock and battery before closing the trip and occupying the slot. UC05 covers unavailable capacity and unconfirmed return. |
| AD04 | UC06-S1/S2/S3, UC07, UC12, UC07A | SQ04 for UC07 | SC02 for charging | Keep parking commitment, physical occupancy, and charging separate. BR08/BR08a/BR08b and the lifecycle contracts cover contention, overstay, safe stop, and checkout. |
| AD05 | UC10, UC10A/B | SQ05 for planning | SC01 | Plan holds vehicles and usable destination capacity. Departure and cancellation compete on Planned. UC10A/B cover partial arrival and cancellation. |
| AD06 | UC11, UC11A | SQ06 for initial handling | SC01, SC02, SC03 | Target safety flow: isolate first, then recover and accept a safe repair. Reporting leaves any active trip open. The current demo records an incident and assigns maintenance; it does not provide the complete physical-isolation verification flow through its public API. |
| AD07 | UC13, UC14; handoff to UC10/UC12 | SQ07 | — | Review a completed sandbox run. Target handoff supports UC10 or UC12 after live validation; the current demo UI exports JSON or opens a UC10 transfer draft with live resource selection and shows other recommendations for Operator review. |

AD04 shows allocation, activation and unplug as separate lifecycle responsibilities. The demo HTTP API exposes allocation and stopping an existing session; activation and unplug confirmation are currently service-level operations without public routes. See [API contracts](../../architecture/API_CONTRACTS.md) for the current boundary.

UC05, UC06 and UC10 share usable parking capacity. A hold does not establish physical occupancy, and a departure or cancellation releases only resources owned by that interaction. UC07 queue acknowledgment does not allocate capacity. UC12 allocates port, time and power. Safe power-off releases power, safe unplug releases the port, and confirmed checkout ends parking occupancy. The contract still leaves the scheduled checkout time for immediate parking open when calculating overstay fees.

Open the editable canvases with Draw.io Integration in VS Code. To import a PlantUML block, use **Advanced → PlantUML** in Draw.io or **File → Import → PlantUML** in Visual Paradigm Online.
