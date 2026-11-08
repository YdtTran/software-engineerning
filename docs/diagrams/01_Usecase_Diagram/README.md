# Usecase Diagram

Editable diagrams are in `drawio/`.

Open a `.drawio` file in diagrams.net or the Draw.io extension for VS Code to edit it.

| Diagram | Draw.io |
| --- | --- |
| UC01-Search_Mobility_Hub | [Edit](drawio/UC01-Search_Mobility_Hub.drawio) |
| UC02-View_Available_Vehicles | [Edit](drawio/UC02-View_Available_Vehicles.drawio) |
| UC03-Reserve_Vehicle | [Edit](drawio/UC03-Reserve_Vehicle.drawio) |
| UC04-Pick_Up_Vehicle | [Edit](drawio/UC04-Pick_Up_Vehicle.drawio) |
| UC05-Return_Vehicle | [Edit](drawio/UC05-Return_Vehicle.drawio) |
| UC06-S1 — Create Parking Reservation | [Edit](drawio/UC06-S1-Create_Parking_Reservation.drawio) |
| UC06-S2 — Check In Private Vehicle (legacy UC06A) | [Edit](drawio/UC06-S2-Check_In_Private_Vehicle.drawio) |
| UC06-S3 — Check Out Private Vehicle (legacy UC06B) | [Edit](drawio/UC06-S3-Check_Out_Private_Vehicle.drawio) |
| UC07-Request_Charging | [Edit](drawio/UC07-Request_Charging.drawio) |
| UC07A-Stop_Charging_Session | [Edit](drawio/UC07A-Stop_Charging_Session.drawio) |
| UC10-Redistribute_Vehicles | [Edit](drawio/UC10-Redistribute_Vehicles.drawio) |
| UC10A-Confirm_Transfer_Arrival | [Edit](drawio/UC10A-Confirm_Transfer_Arrival.drawio) |
| UC10B-Cancel_Transfer_Order | [Edit](drawio/UC10B-Cancel_Transfer_Order.drawio) |
| UC11-Handle_Operational_Incident | [Edit](drawio/UC11-Handle_Operational_Incident.drawio) |
| UC11A-Report_Trip_Incident | [Edit](drawio/UC11A-Report_Trip_Incident.drawio) |
| UC12-Manage_Charging_Schedule | [Edit](drawio/UC12-Manage_Charging_Schedule.drawio) |
| UC13-Run_What-if_Simulation | [Edit](drawio/UC13-Run_What-if_Simulation.drawio) |
| UC14-View_Simulation_Results | [Edit](drawio/UC14-View_Simulation_Results.drawio) |
| UC8-Monitor_Mobility_Hub_Network | [Edit](drawio/UC8-Monitor_Mobility_Hub_Network.drawio) |
| UC9-Manage_Mobility_Resources | [Edit](drawio/UC9-Manage_Mobility_Resources.drawio) |
| general_usecase_diagram | [Edit](drawio/general_usecase_diagram.drawio) |
| operator_usecases | [Edit](drawio/operator_usecases.drawio) |
| user_usecases | [Edit](drawio/user_usecases.drawio) |

## Overview consistency

The overall view is the union of the User and Operator views: 27 goals. User is the end-user role. Telemetry and Notification Service are supporting external actors. Lifecycle goals are separate interactions; cancellation is not an extension of the original booking transaction. Simulation results are reviewed independently or after a successful run; applying recommendations still requires live resource validation.

### user_usecases

[Editable SVG](drawio/user_usecases.drawio)

```plantuml
@startuml
left to right direction
actor "User" as actor_user
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
uc_UC04 -- actor_telemetry
uc_UC05 -- actor_telemetry
uc_UC07 -- actor_telemetry
uc_UC07A -- actor_telemetry
uc_UC03 -- actor_notification
uc_UC11A -- actor_notification
uc_UC06 -- actor_telemetry
uc_UC06 -- actor_notification
@enduml
```

```mermaid
flowchart LR
actor_user["User"]
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
uc_UC04 --- actor_telemetry
uc_UC05 --- actor_telemetry
uc_UC07 --- actor_telemetry
uc_UC07A --- actor_telemetry
uc_UC03 --- actor_notification
uc_UC11A --- actor_notification
uc_UC06 --- actor_telemetry
uc_UC06 --- actor_notification
```

### operator_usecases

[Editable SVG](drawio/operator_usecases.drawio)

```plantuml
@startuml
left to right direction
actor "Operator" as actor_operator
actor "IoT / Simulated Telemetry" as actor_telemetry
rectangle "Smart E-Mobility Hub System" {
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
uc_UC08 -- actor_telemetry
uc_UC10 -- actor_telemetry
uc_UC10A -- actor_telemetry
uc_UC11 -- actor_telemetry
uc_UC12 -- actor_telemetry
@enduml
```

```mermaid
flowchart LR
actor_operator["Operator"]
actor_telemetry["IoT / Simulated Telemetry"]
subgraph System["Smart E-Mobility Hub System"]
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
uc_UC08 --- actor_telemetry
uc_UC10 --- actor_telemetry
uc_UC10A --- actor_telemetry
uc_UC11 --- actor_telemetry
uc_UC12 --- actor_telemetry
```

### general_usecase_diagram

[Editable SVG](drawio/general_usecase_diagram.drawio)

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
uc_UC07 -- actor_telemetry
uc_UC07A -- actor_telemetry
uc_UC08 -- actor_telemetry
uc_UC10 -- actor_telemetry
uc_UC10A -- actor_telemetry
uc_UC11 -- actor_telemetry
uc_UC12 -- actor_telemetry
uc_UC03 -- actor_notification
uc_UC11A -- actor_notification
uc_UC06 -- actor_telemetry
uc_UC06 -- actor_notification
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
uc_UC07 --- actor_telemetry
uc_UC07A --- actor_telemetry
uc_UC08 --- actor_telemetry
uc_UC10 --- actor_telemetry
uc_UC10A --- actor_telemetry
uc_UC11 --- actor_telemetry
uc_UC12 --- actor_telemetry
uc_UC03 --- actor_notification
uc_UC11A --- actor_notification
uc_UC06 --- actor_telemetry
uc_UC06 --- actor_notification
```

| Quality check | Result |
|---|---|
| Overall goals equal union of role views | 27 goals |
| Primary actors left; supporting actors right | Applied |
| System boundary and separate relationship labels | Preserved |
| PlantUML, Mermaid, editable SVG and PNG | Generated |

- VS Code: double-click `.drawio` to edit.
- Draw.io: `+` → `Advanced` → `PlantUML`.
- VP Online: `File` → `Import` → `PlantUML...`.

[UC06 parent contract and lifecycle scenarios](LIFECYCLE_SCENARIOS.md). The overview shows the parent, and the detailed files use the current scenario IDs.
