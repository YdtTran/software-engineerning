# Usecase Diagram

Editable diagrams are in `drawio/`.

The [11-field core scenarios](CORE_SCENARIOS.md) and [parking/lifecycle scenarios](LIFECYCLE_SCENARIOS.md) describe triggers, preconditions, outcomes and exceptions. The [version 2 review](../../requirements/VERSION_2_CONTRACT_REVIEW.md) distinguishes target behavior from the current demo.

Open a `.drawio` file in diagrams.net or the Draw.io extension for VS Code to edit it.

## System-wide overview

[Open the editable Draw.io overview](drawio/system_use_cases.drawio) for all 25 use cases, four actors, and their relationships on one canvas.

<details>
<summary>PlantUML source and Mermaid preview</summary>

```plantuml
@startuml
left to right direction
actor "User" as actor_user
actor "Operator" as actor_operator
actor "IoT / Simulated Telemetry" as actor_telemetry
actor "Notification Service" as actor_notification
rectangle "Smart E-Mobility Hub System" {
  usecase "Search Mobility Hub" as uc_UC01
  usecase "View Available Vehicles" as uc_UC02
  usecase "Reserve Vehicle" as uc_UC03
  usecase "Cancel Vehicle Reservation" as uc_UC03_uc_cancel
  usecase "Pick Up Vehicle" as uc_UC04
  usecase "Report Vehicle Damage" as uc_UC04_uc_ext
  usecase "Return Vehicle" as uc_UC05
  usecase "Report Trip Incident" as uc_UC11A
  usecase "Manage Parking Reservation" as uc_UC06
  usecase "Cancel Parking Reservation" as uc_UC06_uc_cancel
  usecase "Request Charging" as uc_UC07
  usecase "Cancel Charging Request" as uc_UC07_uc_cancel
  usecase "Stop Charging Session" as uc_UC07A
  usecase "Monitor Mobility Hub Network" as uc_UC08
  usecase "Manage Mobility Resources" as uc_UC09
  usecase "Redistribute Vehicles" as uc_UC10
  usecase "Confirm Transfer Arrival" as uc_UC10A
  usecase "Cancel Transfer Order" as uc_UC10B
  usecase "Handle Operational Incident" as uc_UC11
  usecase "Manage Charging Schedule" as uc_UC12
  usecase "Override Charging Schedule" as uc_UC12_uc_ext2
  usecase "Run What-if Simulation" as uc_UC13
  usecase "View Simulation Results" as uc_UC14
  usecase "Export Simulation Results" as uc_UC14_uc_ext1
  usecase "Apply Coordination Recommendations" as uc_UC14_uc_apply
}
actor_user -- uc_UC01
actor_user -- uc_UC02
actor_user -- uc_UC03
actor_user -- uc_UC03_uc_cancel
actor_user -- uc_UC04
uc_UC04_uc_ext ..> uc_UC04 : <<extend>>
actor_user -- uc_UC05
actor_user -- uc_UC11A
actor_user -- uc_UC06
actor_user -- uc_UC06_uc_cancel
actor_user -- uc_UC07
actor_user -- uc_UC07_uc_cancel
actor_user -- uc_UC07A
actor_operator -- uc_UC08
actor_operator -- uc_UC09
actor_operator -- uc_UC10
actor_operator -- uc_UC10A
actor_operator -- uc_UC10B
actor_operator -- uc_UC11
actor_operator -- uc_UC12
uc_UC12_uc_ext2 ..> uc_UC12 : <<extend>>
actor_operator -- uc_UC13
actor_operator -- uc_UC14
uc_UC14_uc_ext1 ..> uc_UC14 : <<extend>>
uc_UC14_uc_apply ..> uc_UC14 : <<extend>>
uc_UC04 -- actor_telemetry
uc_UC05 -- actor_telemetry
uc_UC06 -- actor_telemetry
uc_UC07 -- actor_telemetry
uc_UC07A -- actor_telemetry
uc_UC08 -- actor_telemetry
uc_UC10 -- actor_telemetry
uc_UC10A -- actor_telemetry
uc_UC11 -- actor_telemetry
uc_UC12 -- actor_telemetry
uc_UC03 -- actor_notification
uc_UC11A -- actor_notification
uc_UC06 -- actor_notification
uc_UC13 ..> uc_UC14 : <<include>>
@enduml
```

```mermaid
flowchart LR
actor_user["User"]
actor_operator["Operator"]
actor_telemetry["IoT / Simulated Telemetry"]
actor_notification["Notification Service"]
subgraph System["Smart E-Mobility Hub System"]
  uc_UC01(["Search Mobility Hub"])
  uc_UC02(["View Available Vehicles"])
  uc_UC03(["Reserve Vehicle"])
  uc_UC03_uc_cancel(["Cancel Vehicle Reservation"])
  uc_UC04(["Pick Up Vehicle"])
  uc_UC04_uc_ext(["Report Vehicle Damage"])
  uc_UC05(["Return Vehicle"])
  uc_UC11A(["Report Trip Incident"])
  uc_UC06(["Manage Parking Reservation"])
  uc_UC06_uc_cancel(["Cancel Parking Reservation"])
  uc_UC07(["Request Charging"])
  uc_UC07_uc_cancel(["Cancel Charging Request"])
  uc_UC07A(["Stop Charging Session"])
  uc_UC08(["Monitor Mobility Hub Network"])
  uc_UC09(["Manage Mobility Resources"])
  uc_UC10(["Redistribute Vehicles"])
  uc_UC10A(["Confirm Transfer Arrival"])
  uc_UC10B(["Cancel Transfer Order"])
  uc_UC11(["Handle Operational Incident"])
  uc_UC12(["Manage Charging Schedule"])
  uc_UC12_uc_ext2(["Override Charging Schedule"])
  uc_UC13(["Run What-if Simulation"])
  uc_UC14(["View Simulation Results"])
  uc_UC14_uc_ext1(["Export Simulation Results"])
  uc_UC14_uc_apply(["Apply Coordination Recommendations"])
end
actor_user --- uc_UC01
actor_user --- uc_UC02
actor_user --- uc_UC03
actor_user --- uc_UC03_uc_cancel
actor_user --- uc_UC04
uc_UC04_uc_ext -. "extend" .-> uc_UC04
actor_user --- uc_UC05
actor_user --- uc_UC11A
actor_user --- uc_UC06
actor_user --- uc_UC06_uc_cancel
actor_user --- uc_UC07
actor_user --- uc_UC07_uc_cancel
actor_user --- uc_UC07A
actor_operator --- uc_UC08
actor_operator --- uc_UC09
actor_operator --- uc_UC10
actor_operator --- uc_UC10A
actor_operator --- uc_UC10B
actor_operator --- uc_UC11
actor_operator --- uc_UC12
uc_UC12_uc_ext2 -. "extend" .-> uc_UC12
actor_operator --- uc_UC13
actor_operator --- uc_UC14
uc_UC14_uc_ext1 -. "extend" .-> uc_UC14
uc_UC14_uc_apply -. "extend" .-> uc_UC14
uc_UC04 --- actor_telemetry
uc_UC05 --- actor_telemetry
uc_UC06 --- actor_telemetry
uc_UC07 --- actor_telemetry
uc_UC07A --- actor_telemetry
uc_UC08 --- actor_telemetry
uc_UC10 --- actor_telemetry
uc_UC10A --- actor_telemetry
uc_UC11 --- actor_telemetry
uc_UC12 --- actor_telemetry
uc_UC03 --- actor_notification
uc_UC11A --- actor_notification
uc_UC06 --- actor_notification
uc_UC13 -. "include" .-> uc_UC14
```

</details>

## Workflow diagrams

Together, these six diagrams cover 25 use cases, including UC01–UC14. Each use case appears in exactly one workflow. Actors appear wherever they participate.

| Workflow | Use cases | Draw.io |
| --- | ---: | --- |
| Vehicle Rental | 8 | [Edit](drawio/workflow_vehicle_rental.drawio) |
| Parking Reservation | 2 | [Edit](drawio/workflow_parking_reservation.drawio) |
| Charging | 5 | [Edit](drawio/workflow_charging.drawio) |
| Hub Operations | 3 | [Edit](drawio/workflow_hub_operations.drawio) |
| Vehicle Redistribution | 3 | [Edit](drawio/workflow_vehicle_redistribution.drawio) |
| What-if Simulation | 4 | [Edit](drawio/workflow_what_if_simulation.drawio) |

Open the files with the Draw.io extension in VS Code. To import the PlantUML, use **+ → Advanced → PlantUML** in Draw.io or **File → Import → PlantUML** in Visual Paradigm Online.

The [UC06 lifecycle scenarios](LIFECYCLE_SCENARIOS.md) document check-in and check-out in detail.

### Vehicle Rental

<details>
<summary>PlantUML source and Mermaid preview</summary>

```plantuml
@startuml
left to right direction
actor "User" as actor_user
actor "IoT / Simulated Telemetry" as actor_telemetry
actor "Notification Service" as actor_notification
rectangle "Smart E-Mobility Hub System — Vehicle Rental" {
  usecase "Search Mobility Hub" as uc_UC01
  usecase "View Available Vehicles" as uc_UC02
  usecase "Reserve Vehicle" as uc_UC03
  usecase "Cancel Vehicle Reservation" as uc_UC03_uc_cancel
  usecase "Report Vehicle Damage" as uc_UC04_uc_ext
  usecase "Pick Up Vehicle" as uc_UC04
  usecase "Report Trip Incident" as uc_UC11A
  usecase "Return Vehicle" as uc_UC05
}
actor_user -- uc_UC01
actor_user -- uc_UC02
actor_user -- uc_UC03
actor_user -- uc_UC03_uc_cancel
actor_user -- uc_UC04
uc_UC04_uc_ext ..> uc_UC04 : <<extend>>
actor_user -- uc_UC05
actor_user -- uc_UC11A
uc_UC04 -- actor_telemetry
uc_UC05 -- actor_telemetry
uc_UC03 -- actor_notification
uc_UC11A -- actor_notification
@enduml
```

```mermaid
flowchart LR
actor_user["User"]
actor_telemetry["IoT / Simulated Telemetry"]
actor_notification["Notification Service"]
subgraph System["Smart E-Mobility Hub System — Vehicle Rental"]
  uc_UC01(["Search Mobility Hub"])
  uc_UC02(["View Available Vehicles"])
  uc_UC03(["Reserve Vehicle"])
  uc_UC03_uc_cancel(["Cancel Vehicle Reservation"])
  uc_UC04_uc_ext(["Report Vehicle Damage"])
  uc_UC04(["Pick Up Vehicle"])
  uc_UC11A(["Report Trip Incident"])
  uc_UC05(["Return Vehicle"])
end
actor_user --- uc_UC01
actor_user --- uc_UC02
actor_user --- uc_UC03
actor_user --- uc_UC03_uc_cancel
actor_user --- uc_UC04
uc_UC04_uc_ext -. "extend" .-> uc_UC04
actor_user --- uc_UC05
actor_user --- uc_UC11A
uc_UC04 --- actor_telemetry
uc_UC05 --- actor_telemetry
uc_UC03 --- actor_notification
uc_UC11A --- actor_notification
```

</details>

### Parking Reservation

<details>
<summary>PlantUML source and Mermaid preview</summary>

```plantuml
@startuml
left to right direction
actor "User" as actor_user
actor "IoT / Simulated Telemetry" as actor_telemetry
actor "Notification Service" as actor_notification
rectangle "Smart E-Mobility Hub System — Parking Reservation" {
  usecase "Manage Parking Reservation" as uc_UC06
  usecase "Cancel Parking Reservation" as uc_UC06_uc_cancel
}
actor_user -- uc_UC06
actor_user -- uc_UC06_uc_cancel
uc_UC06 -- actor_telemetry
uc_UC06 -- actor_notification
@enduml
```

```mermaid
flowchart LR
actor_user["User"]
actor_telemetry["IoT / Simulated Telemetry"]
actor_notification["Notification Service"]
subgraph System["Smart E-Mobility Hub System — Parking Reservation"]
  uc_UC06(["Manage Parking Reservation"])
  uc_UC06_uc_cancel(["Cancel Parking Reservation"])
end
actor_user --- uc_UC06
actor_user --- uc_UC06_uc_cancel
uc_UC06 --- actor_telemetry
uc_UC06 --- actor_notification
```

</details>

### Charging

<details>
<summary>PlantUML source and Mermaid preview</summary>

```plantuml
@startuml
left to right direction
actor "User" as actor_user
actor "Operator" as actor_operator
actor "IoT / Simulated Telemetry" as actor_telemetry
rectangle "Smart E-Mobility Hub System — Charging" {
  usecase "Request Charging" as uc_UC07
  usecase "Cancel Charging Request" as uc_UC07_uc_cancel
  usecase "Manage Charging Schedule" as uc_UC12
  usecase "Override Charging Schedule" as uc_UC12_uc_ext2
  usecase "Stop Charging Session" as uc_UC07A
}
actor_user -- uc_UC07
actor_user -- uc_UC07_uc_cancel
actor_user -- uc_UC07A
actor_operator -- uc_UC12
uc_UC12_uc_ext2 ..> uc_UC12 : <<extend>>
uc_UC07 -- actor_telemetry
uc_UC07A -- actor_telemetry
uc_UC12 -- actor_telemetry
@enduml
```

```mermaid
flowchart LR
actor_user["User"]
actor_operator["Operator"]
actor_telemetry["IoT / Simulated Telemetry"]
subgraph System["Smart E-Mobility Hub System — Charging"]
  uc_UC07(["Request Charging"])
  uc_UC07_uc_cancel(["Cancel Charging Request"])
  uc_UC12(["Manage Charging Schedule"])
  uc_UC12_uc_ext2(["Override Charging Schedule"])
  uc_UC07A(["Stop Charging Session"])
end
actor_user --- uc_UC07
actor_user --- uc_UC07_uc_cancel
actor_user --- uc_UC07A
actor_operator --- uc_UC12
uc_UC12_uc_ext2 -. "extend" .-> uc_UC12
uc_UC07 --- actor_telemetry
uc_UC07A --- actor_telemetry
uc_UC12 --- actor_telemetry
```

</details>

### Hub Operations

<details>
<summary>PlantUML source and Mermaid preview</summary>

```plantuml
@startuml
left to right direction
actor "Operator" as actor_operator
actor "IoT / Simulated Telemetry" as actor_telemetry
rectangle "Smart E-Mobility Hub System — Hub Operations" {
  usecase "Monitor Mobility Hub Network" as uc_UC08
  usecase "Manage Mobility Resources" as uc_UC09
  usecase "Handle Operational Incident" as uc_UC11
}
actor_operator -- uc_UC08
actor_operator -- uc_UC09
actor_operator -- uc_UC11
uc_UC08 -- actor_telemetry
uc_UC11 -- actor_telemetry
@enduml
```

```mermaid
flowchart LR
actor_operator["Operator"]
actor_telemetry["IoT / Simulated Telemetry"]
subgraph System["Smart E-Mobility Hub System — Hub Operations"]
  uc_UC08(["Monitor Mobility Hub Network"])
  uc_UC09(["Manage Mobility Resources"])
  uc_UC11(["Handle Operational Incident"])
end
actor_operator --- uc_UC08
actor_operator --- uc_UC09
actor_operator --- uc_UC11
uc_UC08 --- actor_telemetry
uc_UC11 --- actor_telemetry
```

</details>

### Vehicle Redistribution

<details>
<summary>PlantUML source and Mermaid preview</summary>

```plantuml
@startuml
left to right direction
actor "Operator" as actor_operator
actor "IoT / Simulated Telemetry" as actor_telemetry
rectangle "Smart E-Mobility Hub System — Vehicle Redistribution" {
  usecase "Redistribute Vehicles" as uc_UC10
  usecase "Confirm Transfer Arrival" as uc_UC10A
  usecase "Cancel Transfer Order" as uc_UC10B
}
actor_operator -- uc_UC10
actor_operator -- uc_UC10A
actor_operator -- uc_UC10B
uc_UC10 -- actor_telemetry
uc_UC10A -- actor_telemetry
@enduml
```

```mermaid
flowchart LR
actor_operator["Operator"]
actor_telemetry["IoT / Simulated Telemetry"]
subgraph System["Smart E-Mobility Hub System — Vehicle Redistribution"]
  uc_UC10(["Redistribute Vehicles"])
  uc_UC10A(["Confirm Transfer Arrival"])
  uc_UC10B(["Cancel Transfer Order"])
end
actor_operator --- uc_UC10
actor_operator --- uc_UC10A
actor_operator --- uc_UC10B
uc_UC10 --- actor_telemetry
uc_UC10A --- actor_telemetry
```

</details>

### What-if Simulation

<details>
<summary>PlantUML source and Mermaid preview</summary>

```plantuml
@startuml
left to right direction
actor "Operator" as actor_operator
rectangle "Smart E-Mobility Hub System — What-if Simulation" {
  usecase "Run What-if Simulation" as uc_UC13
  usecase "View Simulation Results" as uc_UC14
  usecase "Export Simulation Results" as uc_UC14_uc_ext1
  usecase "Apply Coordination Recommendations" as uc_UC14_uc_apply
}
actor_operator -- uc_UC13
actor_operator -- uc_UC14
uc_UC14_uc_ext1 ..> uc_UC14 : <<extend>>
uc_UC14_uc_apply ..> uc_UC14 : <<extend>>
uc_UC13 ..> uc_UC14 : <<include>>
@enduml
```

```mermaid
flowchart LR
actor_operator["Operator"]
subgraph System["Smart E-Mobility Hub System — What-if Simulation"]
  uc_UC13(["Run What-if Simulation"])
  uc_UC14(["View Simulation Results"])
  uc_UC14_uc_ext1(["Export Simulation Results"])
  uc_UC14_uc_apply(["Apply Coordination Recommendations"])
end
actor_operator --- uc_UC13
actor_operator --- uc_UC14
uc_UC14_uc_ext1 -. "extend" .-> uc_UC14
uc_UC14_uc_apply -. "extend" .-> uc_UC14
uc_UC13 -. "include" .-> uc_UC14
```

</details>

## UC13–UC14: current simulation interactions

The [core scenarios](CORE_SCENARIOS.md) describe scenario selection, execution and result display. After a successful run, UC13 includes UC14. An Operator may also open UC14 independently. From a result, the live demo exports JSON locally or opens a transfer recommendation for review; creating the transfer uses UC10 and checks live resources. Other recommendations remain informational. Filtering by Hub/time, comparing separate runs and CSV/PDF export are optional capabilities outside the current demo.
