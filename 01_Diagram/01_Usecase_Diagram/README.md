# Usecase Diagram

Editable diagrams are in `drawio/`; PNG images are in `png/`.

Open a `.drawio` file in diagrams.net or the Draw.io extension for VS Code to edit it.

| Diagram | Draw.io | PNG |
| --- | --- | --- |
| UC01-Search_Mobility_Hub | [Edit](drawio/UC01-Search_Mobility_Hub.drawio) | [View](png/UC01-Search_Mobility_Hub.png) |
| UC02-View_Available_Vehicles | [Edit](drawio/UC02-View_Available_Vehicles.drawio) | [View](png/UC02-View_Available_Vehicles.png) |
| UC03-Reserve_Vehicle | [Edit](drawio/UC03-Reserve_Vehicle.drawio) | [View](png/UC03-Reserve_Vehicle.png) |
| UC04-Pick_Up_Vehicle | [Edit](drawio/UC04-Pick_Up_Vehicle.drawio) | [View](png/UC04-Pick_Up_Vehicle.png) |
| UC05-Return_Vehicle | [Edit](drawio/UC05-Return_Vehicle.drawio) | [View](png/UC05-Return_Vehicle.png) |
| UC06-Reserve_Parking_Space | [Edit](drawio/UC06-Reserve_Parking_Space.drawio) | [View](png/UC06-Reserve_Parking_Space.png) |
| UC06A-Check_In_Private_Vehicle | [Edit](drawio/UC06A-Check_In_Private_Vehicle.drawio) | [View](png/UC06A-Check_In_Private_Vehicle.png) |
| UC06B-Check_Out_Private_Vehicle | [Edit](drawio/UC06B-Check_Out_Private_Vehicle.drawio) | [View](png/UC06B-Check_Out_Private_Vehicle.png) |
| UC07-Request_Charging | [Edit](drawio/UC07-Request_Charging.drawio) | [View](png/UC07-Request_Charging.png) |
| UC07A-Stop_Charging_Session | [Edit](drawio/UC07A-Stop_Charging_Session.drawio) | [View](png/UC07A-Stop_Charging_Session.png) |
| UC10-Redistribute_Vehicles | [Edit](drawio/UC10-Redistribute_Vehicles.drawio) | [View](png/UC10-Redistribute_Vehicles.png) |
| UC10A-Confirm_Transfer_Arrival | [Edit](drawio/UC10A-Confirm_Transfer_Arrival.drawio) | [View](png/UC10A-Confirm_Transfer_Arrival.png) |
| UC10B-Cancel_Transfer_Order | [Edit](drawio/UC10B-Cancel_Transfer_Order.drawio) | [View](png/UC10B-Cancel_Transfer_Order.png) |
| UC11-Handle_Operational_Incident | [Edit](drawio/UC11-Handle_Operational_Incident.drawio) | [View](png/UC11-Handle_Operational_Incident.png) |
| UC11A-Report_Trip_Incident | [Edit](drawio/UC11A-Report_Trip_Incident.drawio) | [View](png/UC11A-Report_Trip_Incident.png) |
| UC12-Manage_Charging_Schedule | [Edit](drawio/UC12-Manage_Charging_Schedule.drawio) | [View](png/UC12-Manage_Charging_Schedule.png) |
| UC13-Run_What-if_Simulation | [Edit](drawio/UC13-Run_What-if_Simulation.drawio) | [View](png/UC13-Run_What-if_Simulation.png) |
| UC14-View_Simulation_Results | [Edit](drawio/UC14-View_Simulation_Results.drawio) | [View](png/UC14-View_Simulation_Results.png) |
| UC8-Monitor_Mobility_Hub_Network | [Edit](drawio/UC8-Monitor_Mobility_Hub_Network.drawio) | [View](png/UC8-Monitor_Mobility_Hub_Network.png) |
| UC9-Manage_Mobility_Resources | [Edit](drawio/UC9-Manage_Mobility_Resources.drawio) | [View](png/UC9-Manage_Mobility_Resources.png) |
| general_usecase_diagram | [Edit](drawio/general_usecase_diagram.drawio) | [View](png/general_usecase_diagram.png) |
| operator_usecases | [Edit](drawio/operator_usecases.drawio) | [View](png/operator_usecases.png) |
| user_usecases | [Edit](drawio/user_usecases.drawio) | [View](png/user_usecases.png) |

## Overview consistency

The overall view is the union of the User and Operator views: 27 goals. User is the end-user role. Telemetry and Notification Service are supporting external actors. Lifecycle goals are separate interactions; cancellation is not an extension of the original booking transaction. Simulation results are reviewed independently or after a successful run; applying recommendations still requires live resource validation.

### user_usecases

[Editable SVG](svg/user_usecases.drawio.svg)

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
usecase "Reserve Parking Space" as uc_UC06
usecase "Cancel Parking Reservation" as uc_UC06_uc_cancel
usecase "Check In Private Vehicle" as uc_UC06A
usecase "Check Out Private Vehicle" as uc_UC06B
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
actor_user -- uc_UC06A
actor_user -- uc_UC06B
actor_user -- uc_UC07
actor_user -- uc_UC07_uc_cancel
actor_user -- uc_UC07A
uc_UC04 -- actor_telemetry
uc_UC05 -- actor_telemetry
uc_UC06A -- actor_telemetry
uc_UC06B -- actor_telemetry
uc_UC07 -- actor_telemetry
uc_UC07A -- actor_telemetry
uc_UC03 -- actor_notification
uc_UC11A -- actor_notification
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
uc_UC06(["Reserve Parking Space"])
uc_UC06_uc_cancel(["Cancel Parking Reservation"])
uc_UC06A(["Check In Private Vehicle"])
uc_UC06B(["Check Out Private Vehicle"])
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
actor_user --- uc_UC06A
actor_user --- uc_UC06B
actor_user --- uc_UC07
actor_user --- uc_UC07_uc_cancel
actor_user --- uc_UC07A
uc_UC04 --- actor_telemetry
uc_UC05 --- actor_telemetry
uc_UC06A --- actor_telemetry
uc_UC06B --- actor_telemetry
uc_UC07 --- actor_telemetry
uc_UC07A --- actor_telemetry
uc_UC03 --- actor_notification
uc_UC11A --- actor_notification
uc_UC06 --- actor_notification
```

### operator_usecases

[Editable SVG](svg/operator_usecases.drawio.svg)

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
uc_UC13 ..> uc_UC14 : <<include>>
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
uc_UC13 -. "include" .-> uc_UC14
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

[Editable SVG](svg/general_usecase_diagram.drawio.svg)

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
usecase "Reserve Parking Space" as uc_UC06
usecase "Cancel Parking Reservation" as uc_UC06_uc_cancel
usecase "Check In Private Vehicle" as uc_UC06A
usecase "Check Out Private Vehicle" as uc_UC06B
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
actor_user -- uc_UC06A
actor_user -- uc_UC06B
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
uc_UC13 ..> uc_UC14 : <<include>>
actor_operator -- uc_UC14
uc_UC14_uc_ext1 ..> uc_UC14 : <<extend>>
uc_UC14_uc_apply ..> uc_UC14 : <<extend>>
uc_UC04 -- actor_telemetry
uc_UC05 -- actor_telemetry
uc_UC06A -- actor_telemetry
uc_UC06B -- actor_telemetry
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
uc_UC06(["Reserve Parking Space"])
uc_UC06_uc_cancel(["Cancel Parking Reservation"])
uc_UC06A(["Check In Private Vehicle"])
uc_UC06B(["Check Out Private Vehicle"])
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
actor_user --- uc_UC06A
actor_user --- uc_UC06B
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
uc_UC13 -. "include" .-> uc_UC14
actor_operator --- uc_UC14
uc_UC14_uc_ext1 -. "extend" .-> uc_UC14
uc_UC14_uc_apply -. "extend" .-> uc_UC14
uc_UC04 --- actor_telemetry
uc_UC05 --- actor_telemetry
uc_UC06A --- actor_telemetry
uc_UC06B --- actor_telemetry
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
```

| Quality check | Result |
|---|---|
| Overall goals equal union of role views | 27 goals |
| Primary actors left; supporting actors right | Applied |
| System boundary and separate relationship labels | Preserved |
| PlantUML, Mermaid, editable SVG and PNG | Generated |

- VS Code: double-click `.drawio.svg` to edit.
- Draw.io: `+` → `Advanced` → `PlantUML`.
- VP Online: `File` → `Import` → `PlantUML...`.
