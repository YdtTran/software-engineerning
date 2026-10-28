# Use-case diagrams: PlantUML and Mermaid

Source: original PNGs in `refs/uc_uml/USE_CASE/`. Native Draw.io files and editable SVG exports use checked, separate edge routes. Mermaid is a flowchart approximation of UML notation; Draw.io is the layout reference.

## general_usecase_diagram

[Editable Draw.io](GENERAL/general_usecase_diagram.drawio) | [SVG preview](GENERAL/general_usecase_diagram.drawio.svg)

```plantuml
@startuml
left to right direction
skinparam shadowing false
skinparam rectangleBackgroundColor #e0f2fe
skinparam rectangleBorderColor #0284c7
actor "Student" as actor_left
actor "Operator" as actor_right
rectangle "Smart E-Mobility Hub System" {
  usecase "Search Mobility Hub" as uc_s1
  usecase "View Available Vehicles" as uc_s2
  usecase "Reserve Vehicle" as uc_s3
  usecase "Pick Up Vehicle" as uc_s4
  usecase "Return Vehicle" as uc_s5
  usecase "Reserve Parking Space" as uc_s6
  usecase "Request Charging" as uc_s7
  usecase "Monitor Mobility Hub Network" as uc_o1
  usecase "Manage Mobility Resources" as uc_o2
  usecase "Redistribute Vehicles" as uc_o3
  usecase "Handle Operational Incident" as uc_o4
  usecase "Manage Charging Schedule" as uc_o5
  usecase "Run What-if Simulation" as uc_o6
  usecase "View Simulation Results" as uc_o7
}
actor_left -right- uc_s1
actor_left -right- uc_s2
actor_left -right- uc_s3
actor_left -right- uc_s4
actor_left -right- uc_s5
actor_left -right- uc_s6
actor_left -right- uc_s7
actor_right -right- uc_o1
actor_right -right- uc_o2
actor_right -right- uc_o3
actor_right -right- uc_o4
actor_right -right- uc_o5
actor_right -right- uc_o6
actor_right -right- uc_o7
@enduml
```

```mermaid
flowchart LR
  actor_left["Student"]
  actor_right["Operator"]
  subgraph sys_boundary["Smart E-Mobility Hub System"]
    uc_s1(["Search Mobility Hub"])
    uc_s2(["View Available Vehicles"])
    uc_s3(["Reserve Vehicle"])
    uc_s4(["Pick Up Vehicle"])
    uc_s5(["Return Vehicle"])
    uc_s6(["Reserve Parking Space"])
    uc_s7(["Request Charging"])
    uc_o1(["Monitor Mobility Hub<br/>Network"])
    uc_o2(["Manage Mobility<br/>Resources"])
    uc_o3(["Redistribute Vehicles"])
    uc_o4(["Handle Operational<br/>Incident"])
    uc_o5(["Manage Charging<br/>Schedule"])
    uc_o6(["Run What-if<br/>Simulation"])
    uc_o7(["View Simulation<br/>Results"])
  end
  actor_left --- uc_s1
  actor_left --- uc_s2
  actor_left --- uc_s3
  actor_left --- uc_s4
  actor_left --- uc_s5
  actor_left --- uc_s6
  actor_left --- uc_s7
  actor_right --- uc_o1
  actor_right --- uc_o2
  actor_right --- uc_o3
  actor_right --- uc_o4
  actor_right --- uc_o5
  actor_right --- uc_o6
  actor_right --- uc_o7
  style sys_boundary fill:#e0f2fe,stroke:#0284c7,stroke-width:2px
```

## UC01-Search_Mobility_Hub

[Editable Draw.io](STUDENTS/UC01-Search_Mobility_Hub.drawio) | [SVG preview](STUDENTS/UC01-Search_Mobility_Hub.drawio.svg)

```plantuml
@startuml
left to right direction
skinparam shadowing false
skinparam rectangleBackgroundColor #e0f2fe
skinparam rectangleBorderColor #0284c7
actor "Student" as actor_left
rectangle "Smart E-Mobility Hub System" {
  usecase "Search Mobility Hub" as uc_base
  usecase "Filter by Vehicle Type" as uc_ext1
  usecase "Filter by Distance" as uc_ext2
}
actor_left -right- uc_base
uc_ext1 ..> uc_base : <<extend>>
uc_ext2 ..> uc_base : <<extend>>
@enduml
```

```mermaid
flowchart LR
  actor_left["Student"]
  subgraph sys_boundary["Smart E-Mobility Hub System"]
    uc_base(["Search Mobility Hub"])
    uc_ext1(["Filter by Vehicle Type"])
    uc_ext2(["Filter by Distance"])
  end
  actor_left --- uc_base
  uc_ext1 -. "&lt;&lt;extend&gt;&gt;" .-> uc_base
  uc_ext2 -. "&lt;&lt;extend&gt;&gt;" .-> uc_base
  style sys_boundary fill:#e0f2fe,stroke:#0284c7,stroke-width:2px
```

## UC02-View_Available_Vehicles

[Editable Draw.io](STUDENTS/UC02-View_Available_Vehicles.drawio) | [SVG preview](STUDENTS/UC02-View_Available_Vehicles.drawio.svg)

```plantuml
@startuml
left to right direction
skinparam shadowing false
skinparam rectangleBackgroundColor #e0f2fe
skinparam rectangleBorderColor #0284c7
actor "Student" as actor_left
rectangle "Smart E-Mobility Hub System" {
  usecase "View Available Vehicles" as uc_base
  usecase "View Vehicle Details" as uc_ext
}
actor_left -right- uc_base
uc_ext ..> uc_base : <<extend>>
@enduml
```

```mermaid
flowchart LR
  actor_left["Student"]
  subgraph sys_boundary["Smart E-Mobility Hub System"]
    uc_base(["View Available<br/>Vehicles"])
    uc_ext(["View Vehicle Details"])
  end
  actor_left --- uc_base
  uc_ext -. "&lt;&lt;extend&gt;&gt;" .-> uc_base
  style sys_boundary fill:#e0f2fe,stroke:#0284c7,stroke-width:2px
```

## UC03-Reserve_Vehicle

[Editable Draw.io](STUDENTS/UC03-Reserve_Vehicle.drawio) | [SVG preview](STUDENTS/UC03-Reserve_Vehicle.drawio.svg)

```plantuml
@startuml
left to right direction
skinparam shadowing false
skinparam rectangleBackgroundColor #e0f2fe
skinparam rectangleBorderColor #0284c7
actor "Student" as actor_left
rectangle "Smart E-Mobility Hub System" {
  usecase "Reserve Vehicle" as uc_base
  usecase "Verify Vehicle Availability" as uc_inc
}
actor_left -right- uc_base
uc_base ..> uc_inc : <<include>>
@enduml
```

```mermaid
flowchart LR
  actor_left["Student"]
  subgraph sys_boundary["Smart E-Mobility Hub System"]
    uc_base(["Reserve Vehicle"])
    uc_inc(["Verify Vehicle<br/>Availability"])
  end
  actor_left --- uc_base
  uc_base -. "&lt;&lt;include&gt;&gt;" .-> uc_inc
  style sys_boundary fill:#e0f2fe,stroke:#0284c7,stroke-width:2px
```

## UC04-Pick_Up_Vehicle

[Editable Draw.io](STUDENTS/UC04-Pick_Up_Vehicle.drawio) | [SVG preview](STUDENTS/UC04-Pick_Up_Vehicle.drawio.svg)

```plantuml
@startuml
left to right direction
skinparam shadowing false
skinparam rectangleBackgroundColor #e0f2fe
skinparam rectangleBorderColor #0284c7
actor "Student" as actor_left
rectangle "Smart E-Mobility Hub System" {
  usecase "Pick Up Vehicle" as uc_base
  usecase "Report Vehicle Damage" as uc_ext
  usecase "Validate Reservation Status" as uc_inc1
  usecase "Unlock Vehicle" as uc_inc2
}
actor_left -right- uc_base
uc_ext ..> uc_base : <<extend>>
uc_base ..> uc_inc1 : <<include>>
uc_base ..> uc_inc2 : <<include>>
@enduml
```

```mermaid
flowchart LR
  actor_left["Student"]
  subgraph sys_boundary["Smart E-Mobility Hub System"]
    uc_base(["Pick Up Vehicle"])
    uc_ext(["Report Vehicle Damage"])
    uc_inc1(["Validate Reservation<br/>Status"])
    uc_inc2(["Unlock Vehicle"])
  end
  actor_left --- uc_base
  uc_ext -. "&lt;&lt;extend&gt;&gt;" .-> uc_base
  uc_base -. "&lt;&lt;include&gt;&gt;" .-> uc_inc1
  uc_base -. "&lt;&lt;include&gt;&gt;" .-> uc_inc2
  style sys_boundary fill:#e0f2fe,stroke:#0284c7,stroke-width:2px
```

## UC05-Return_Vehicle

[Editable Draw.io](STUDENTS/UC05-Return_Vehicle.drawio) | [SVG preview](STUDENTS/UC05-Return_Vehicle.drawio.svg)

```plantuml
@startuml
left to right direction
skinparam shadowing false
skinparam rectangleBackgroundColor #e0f2fe
skinparam rectangleBorderColor #0284c7
actor "Student" as actor_left
rectangle "Smart E-Mobility Hub System" {
  usecase "Return Vehicle" as uc_base
  usecase "Check Hub Space Availability" as uc_inc1
  usecase "Verify Vehicle & Battery Status" as uc_inc2
  usecase "Confirm Vehicle Return" as uc_inc3
}
actor_left -right- uc_base
uc_base ..> uc_inc1 : <<include>>
uc_base ..> uc_inc2 : <<include>>
uc_base ..> uc_inc3 : <<include>>
@enduml
```

```mermaid
flowchart LR
  actor_left["Student"]
  subgraph sys_boundary["Smart E-Mobility Hub System"]
    uc_base(["Return Vehicle"])
    uc_inc1(["Check Hub Space<br/>Availability"])
    uc_inc2(["Verify Vehicle &amp;<br/>Battery Status"])
    uc_inc3(["Confirm Vehicle<br/>Return"])
  end
  actor_left --- uc_base
  uc_base -. "&lt;&lt;include&gt;&gt;" .-> uc_inc1
  uc_base -. "&lt;&lt;include&gt;&gt;" .-> uc_inc2
  uc_base -. "&lt;&lt;include&gt;&gt;" .-> uc_inc3
  style sys_boundary fill:#e0f2fe,stroke:#0284c7,stroke-width:2px
```

## UC06-Reserve_Parking_Space

[Editable Draw.io](STUDENTS/UC06-Reserve_Parking_Space.drawio) | [SVG preview](STUDENTS/UC06-Reserve_Parking_Space.drawio.svg)

```plantuml
@startuml
left to right direction
skinparam shadowing false
skinparam rectangleBackgroundColor #e0f2fe
skinparam rectangleBorderColor #0284c7
actor "Student" as actor_left
rectangle "Smart E-Mobility Hub System" {
  usecase "Cancel Parking Reservation" as uc_cancel
  usecase "Reserve Parking Space" as uc_base
  usecase "Confirm Parking Reservation" as uc_inc1
  usecase "Validate Vehicle Information" as uc_inc2
  usecase "Check Parking Availability" as uc_inc3
}
actor_left -right- uc_cancel
actor_left -right- uc_base
uc_base ..> uc_inc1 : <<include>>
uc_base ..> uc_inc2 : <<include>>
uc_base ..> uc_inc3 : <<include>>
@enduml
```

```mermaid
flowchart LR
  actor_left["Student"]
  subgraph sys_boundary["Smart E-Mobility Hub System"]
    uc_cancel(["Cancel Parking<br/>Reservation"])
    uc_base(["Reserve Parking<br/>Space"])
    uc_inc1(["Confirm Parking<br/>Reservation"])
    uc_inc2(["Validate Vehicle<br/>Information"])
    uc_inc3(["Check Parking<br/>Availability"])
  end
  actor_left --- uc_cancel
  actor_left --- uc_base
  uc_base -. "&lt;&lt;include&gt;&gt;" .-> uc_inc1
  uc_base -. "&lt;&lt;include&gt;&gt;" .-> uc_inc2
  uc_base -. "&lt;&lt;include&gt;&gt;" .-> uc_inc3
  style sys_boundary fill:#e0f2fe,stroke:#0284c7,stroke-width:2px
```

## UC07-Request_Charging

[Editable Draw.io](STUDENTS/UC07-Request_Charging.drawio) | [SVG preview](STUDENTS/UC07-Request_Charging.drawio.svg)

```plantuml
@startuml
left to right direction
skinparam shadowing false
skinparam rectangleBackgroundColor #e0f2fe
skinparam rectangleBorderColor #0284c7
actor "Student" as actor_left
rectangle "Smart E-Mobility Hub System" {
  usecase "Request Charging" as uc_base
  usecase "Check Charging Availability" as uc_inc1
  usecase "Confirm Charging Request" as uc_inc2
  usecase "Validate Charging Request" as uc_inc3
  usecase "Cancel Charging Request" as uc_cancel
}
actor_left -right- uc_base
actor_left -right- uc_cancel
uc_base ..> uc_inc1 : <<include>>
uc_base ..> uc_inc2 : <<include>>
uc_base ..> uc_inc3 : <<include>>
@enduml
```

```mermaid
flowchart LR
  actor_left["Student"]
  subgraph sys_boundary["Smart E-Mobility Hub System"]
    uc_base(["Request Charging"])
    uc_inc1(["Check Charging<br/>Availability"])
    uc_inc2(["Confirm Charging<br/>Request"])
    uc_inc3(["Validate Charging<br/>Request"])
    uc_cancel(["Cancel Charging<br/>Request"])
  end
  actor_left --- uc_base
  actor_left --- uc_cancel
  uc_base -. "&lt;&lt;include&gt;&gt;" .-> uc_inc1
  uc_base -. "&lt;&lt;include&gt;&gt;" .-> uc_inc2
  uc_base -. "&lt;&lt;include&gt;&gt;" .-> uc_inc3
  style sys_boundary fill:#e0f2fe,stroke:#0284c7,stroke-width:2px
```

## UC8-Monitor_Mobility_Hub_Network

[Editable Draw.io](OPERATOR/UC8-Monitor_Mobility_Hub_Network.drawio) | [SVG preview](OPERATOR/UC8-Monitor_Mobility_Hub_Network.drawio.svg)

```plantuml
@startuml
left to right direction
skinparam shadowing false
skinparam rectangleBackgroundColor #e0f2fe
skinparam rectangleBorderColor #0284c7
actor "Operator" as actor_left
rectangle "Smart E-Mobility Hub System" {
  usecase "Inspect Selected Hub" as uc_ext
  usecase "Monitor Mobility Hub Network" as uc_base
  usecase "View Vehicle Availability and Battery Levels" as uc_inc1
  usecase "View Parking Occupancy" as uc_inc2
  usecase "View Charger Status" as uc_inc3
}
actor_left -right- uc_base
uc_ext ..> uc_base : <<extend>>
uc_base ..> uc_inc1 : <<include>>
uc_base ..> uc_inc2 : <<include>>
uc_base ..> uc_inc3 : <<include>>
@enduml
```

```mermaid
flowchart LR
  actor_left["Operator"]
  subgraph sys_boundary["Smart E-Mobility Hub System"]
    uc_ext(["Inspect Selected Hub"])
    uc_base(["Monitor Mobility Hub<br/>Network"])
    uc_inc1(["View Vehicle Availability<br/>and Battery Levels"])
    uc_inc2(["View Parking<br/>Occupancy"])
    uc_inc3(["View Charger Status"])
  end
  actor_left --- uc_base
  uc_ext -. "&lt;&lt;extend&gt;&gt;" .-> uc_base
  uc_base -. "&lt;&lt;include&gt;&gt;" .-> uc_inc1
  uc_base -. "&lt;&lt;include&gt;&gt;" .-> uc_inc2
  uc_base -. "&lt;&lt;include&gt;&gt;" .-> uc_inc3
  style sys_boundary fill:#e0f2fe,stroke:#0284c7,stroke-width:2px
```

## UC9-Manage_Mobility_Resources

[Editable Draw.io](OPERATOR/UC9-Manage_Mobility_Resources.drawio) | [SVG preview](OPERATOR/UC9-Manage_Mobility_Resources.drawio.svg)

```plantuml
@startuml
left to right direction
skinparam shadowing false
skinparam rectangleBackgroundColor #e0f2fe
skinparam rectangleBorderColor #0284c7
actor "Operator" as actor_left
rectangle "Smart E-Mobility Hub System" {
  usecase "Suspend Resource" as uc_child1
  usecase "Reactivate Resource" as uc_child2
  usecase "Register Resource" as uc_child3
  usecase "Update Resource Information" as uc_child4
  usecase "Manage Mobility Resources" as uc_base
  usecase "Validate Resource Data" as uc_validate
}
actor_left -right- uc_base
uc_child1 --|> uc_base
uc_child2 --|> uc_base
uc_child3 --|> uc_base
uc_child4 --|> uc_base
uc_child3 ..> uc_validate : <<include>>
uc_child4 ..> uc_validate : <<include>>
@enduml
```

```mermaid
flowchart LR
  actor_left["Operator"]
  subgraph sys_boundary["Smart E-Mobility Hub System"]
    uc_child1(["Suspend Resource"])
    uc_child2(["Reactivate Resource"])
    uc_child3(["Register Resource"])
    uc_child4(["Update Resource<br/>Information"])
    uc_base(["Manage Mobility<br/>Resources"])
    uc_validate(["Validate Resource Data"])
  end
  actor_left --- uc_base
  uc_child1 -->|"generalization: child to parent"| uc_base
  uc_child2 -->|"generalization: child to parent"| uc_base
  uc_child3 -->|"generalization: child to parent"| uc_base
  uc_child4 -->|"generalization: child to parent"| uc_base
  uc_child3 -. "&lt;&lt;include&gt;&gt;" .-> uc_validate
  uc_child4 -. "&lt;&lt;include&gt;&gt;" .-> uc_validate
  style sys_boundary fill:#e0f2fe,stroke:#0284c7,stroke-width:2px
```

## UC10-Redistribute_Vehicles

[Editable Draw.io](OPERATOR/UC10-Redistribute_Vehicles.drawio) | [SVG preview](OPERATOR/UC10-Redistribute_Vehicles.drawio.svg)

```plantuml
@startuml
left to right direction
skinparam shadowing false
skinparam rectangleBackgroundColor #e0f2fe
skinparam rectangleBorderColor #0284c7
actor "Operator" as actor_left
rectangle "Smart E-Mobility Hub System" {
  usecase "Find Alternative Destination Hub" as uc_ext
  usecase "Redistribute Vehicles" as uc_base
  usecase "Check Transferable Vehicles" as uc_inc1
  usecase "Check Destination Parking Capacity" as uc_inc2
  usecase "Create Transfer Order" as uc_inc3
}
actor_left -right- uc_base
uc_ext ..> uc_base : <<extend>>
uc_base ..> uc_inc1 : <<include>>
uc_base ..> uc_inc2 : <<include>>
uc_base ..> uc_inc3 : <<include>>
@enduml
```

```mermaid
flowchart LR
  actor_left["Operator"]
  subgraph sys_boundary["Smart E-Mobility Hub System"]
    uc_ext(["Find Alternative<br/>Destination Hub"])
    uc_base(["Redistribute Vehicles"])
    uc_inc1(["Check Transferable<br/>Vehicles"])
    uc_inc2(["Check Destination<br/>Parking Capacity"])
    uc_inc3(["Create Transfer Order"])
  end
  actor_left --- uc_base
  uc_ext -. "&lt;&lt;extend&gt;&gt;" .-> uc_base
  uc_base -. "&lt;&lt;include&gt;&gt;" .-> uc_inc1
  uc_base -. "&lt;&lt;include&gt;&gt;" .-> uc_inc2
  uc_base -. "&lt;&lt;include&gt;&gt;" .-> uc_inc3
  style sys_boundary fill:#e0f2fe,stroke:#0284c7,stroke-width:2px
```

## UC11-Handle_Operational_Incident

[Editable Draw.io](OPERATOR/UC11-Handle_Operational_Incident.drawio) | [SVG preview](OPERATOR/UC11-Handle_Operational_Incident.drawio.svg)

```plantuml
@startuml
left to right direction
skinparam shadowing false
skinparam rectangleBackgroundColor #e0f2fe
skinparam rectangleBorderColor #0284c7
actor "Operator" as actor_left
rectangle "Smart E-Mobility Hub System" {
  usecase "Isolate Faulty Resource" as uc_ext1
  usecase "Schedule Maintenance" as uc_ext2
  usecase "Handle Operational Incident" as uc_base
  usecase "Review Incident Details" as uc_inc1
  usecase "Assess Incident Impact" as uc_inc2
  usecase "Update Incident Status" as uc_inc3
}
actor_left -right- uc_base
uc_base ..> uc_ext1 : <<include>>
uc_base ..> uc_ext2 : <<include>>
uc_base ..> uc_inc1 : <<include>>
uc_base ..> uc_inc2 : <<include>>
uc_base ..> uc_inc3 : <<include>>
@enduml
```

```mermaid
flowchart LR
  actor_left["Operator"]
  subgraph sys_boundary["Smart E-Mobility Hub System"]
    uc_ext1(["Isolate Faulty Resource"])
    uc_ext2(["Schedule Maintenance"])
    uc_base(["Handle Operational<br/>Incident"])
    uc_inc1(["Review Incident Details"])
    uc_inc2(["Assess Incident Impact"])
    uc_inc3(["Update Incident Status"])
  end
  actor_left --- uc_base
  uc_base -. "&lt;&lt;include&gt;&gt;" .-> uc_ext1
  uc_base -. "&lt;&lt;include&gt;&gt;" .-> uc_ext2
  uc_base -. "&lt;&lt;include&gt;&gt;" .-> uc_inc1
  uc_base -. "&lt;&lt;include&gt;&gt;" .-> uc_inc2
  uc_base -. "&lt;&lt;include&gt;&gt;" .-> uc_inc3
  style sys_boundary fill:#e0f2fe,stroke:#0284c7,stroke-width:2px
```

## UC12-Manage_Charging_Schedule

[Editable Draw.io](OPERATOR/UC12-Manage_Charging_Schedule.drawio) | [SVG preview](OPERATOR/UC12-Manage_Charging_Schedule.drawio.svg)

```plantuml
@startuml
left to right direction
skinparam shadowing false
skinparam rectangleBackgroundColor #e0f2fe
skinparam rectangleBorderColor #0284c7
actor "Operator" as actor_left
rectangle "Smart E-Mobility Hub System" {
  usecase "Reassign on Port Malfunction" as uc_ext1
  usecase "Manage Charging Schedule" as uc_base
  usecase "Override Charging Schedule" as uc_ext2
  usecase "Monitor Charging Queue" as uc_inc1
  usecase "Prioritize Charging Order" as uc_inc2
  usecase "Allocate Charging Points" as uc_inc3
}
actor_left -right- uc_base
uc_ext1 ..> uc_base : <<extend>>
uc_ext2 ..> uc_base : <<extend>>
uc_base ..> uc_inc1 : <<include>>
uc_base ..> uc_inc2 : <<include>>
uc_base ..> uc_inc3 : <<include>>
@enduml
```

```mermaid
flowchart LR
  actor_left["Operator"]
  subgraph sys_boundary["Smart E-Mobility Hub System"]
    uc_ext1(["Reassign on Port<br/>Malfunction"])
    uc_base(["Manage Charging<br/>Schedule"])
    uc_ext2(["Override Charging<br/>Schedule"])
    uc_inc1(["Monitor Charging<br/>Queue"])
    uc_inc2(["Prioritize Charging<br/>Order"])
    uc_inc3(["Allocate Charging<br/>Points"])
  end
  actor_left --- uc_base
  uc_ext1 -. "&lt;&lt;extend&gt;&gt;" .-> uc_base
  uc_ext2 -. "&lt;&lt;extend&gt;&gt;" .-> uc_base
  uc_base -. "&lt;&lt;include&gt;&gt;" .-> uc_inc1
  uc_base -. "&lt;&lt;include&gt;&gt;" .-> uc_inc2
  uc_base -. "&lt;&lt;include&gt;&gt;" .-> uc_inc3
  style sys_boundary fill:#e0f2fe,stroke:#0284c7,stroke-width:2px
```

## UC13-Run_What-if_Simulation

[Editable Draw.io](OPERATOR/UC13-Run_What-if_Simulation.drawio) | [SVG preview](OPERATOR/UC13-Run_What-if_Simulation.drawio.svg)

```plantuml
@startuml
left to right direction
skinparam shadowing false
skinparam rectangleBackgroundColor #e0f2fe
skinparam rectangleBorderColor #0284c7
actor "Operator" as actor_left
rectangle "Smart E-Mobility Hub System" {
  usecase "Export Simulation Report" as uc_ext1
  usecase "Apply Coordination Recommendations" as uc_ext2
  usecase "Run What-if Simulation" as uc_base
  usecase "Select Simulation Scenario" as uc_inc1
  usecase "Configure Scenario Parameters" as uc_inc2
  usecase "Execute Network Simulation" as uc_inc3
  usecase "View Simulation Results (UC-14)" as uc_inc4
}
actor_left -right- uc_base
uc_ext1 ..> uc_base : <<extend>>
uc_ext2 ..> uc_base : <<extend>>
uc_base ..> uc_inc1 : <<include>>
uc_base ..> uc_inc2 : <<include>>
uc_base ..> uc_inc3 : <<include>>
uc_base ..> uc_inc4 : <<include>>
@enduml
```

```mermaid
flowchart LR
  actor_left["Operator"]
  subgraph sys_boundary["Smart E-Mobility Hub System"]
    uc_ext1(["Export Simulation<br/>Report"])
    uc_ext2(["Apply Coordination<br/>Recommendations"])
    uc_base(["Run What-if<br/>Simulation"])
    uc_inc1(["Select Simulation<br/>Scenario"])
    uc_inc2(["Configure Scenario<br/>Parameters"])
    uc_inc3(["Execute Network<br/>Simulation"])
    uc_inc4(["View Simulation<br/>Results (UC-14)"])
  end
  actor_left --- uc_base
  uc_ext1 -. "&lt;&lt;extend&gt;&gt;" .-> uc_base
  uc_ext2 -. "&lt;&lt;extend&gt;&gt;" .-> uc_base
  uc_base -. "&lt;&lt;include&gt;&gt;" .-> uc_inc1
  uc_base -. "&lt;&lt;include&gt;&gt;" .-> uc_inc2
  uc_base -. "&lt;&lt;include&gt;&gt;" .-> uc_inc3
  uc_base -. "&lt;&lt;include&gt;&gt;" .-> uc_inc4
  style sys_boundary fill:#e0f2fe,stroke:#0284c7,stroke-width:2px
```

## UC14-View_Simulation_Results

[Editable Draw.io](OPERATOR/UC14-View_Simulation_Results.drawio) | [SVG preview](OPERATOR/UC14-View_Simulation_Results.drawio.svg)

```plantuml
@startuml
left to right direction
skinparam shadowing false
skinparam rectangleBackgroundColor #e0f2fe
skinparam rectangleBorderColor #0284c7
actor "Operator" as actor_left
rectangle "Smart E-Mobility Hub System" {
  usecase "Export Simulation Results" as uc_ext1
  usecase "Filter Simulation Results" as uc_ext2
  usecase "Compare Simulation Results" as uc_ext3
  usecase "View Simulation Results" as uc_base
  usecase "Display Recommendations" as uc_inc1
  usecase "Retrieve Simulation Results" as uc_inc2
  usecase "Display Simulation Metrics" as uc_inc3
}
actor_left -right- uc_base
uc_ext1 ..> uc_base : <<extend>>
uc_ext2 ..> uc_base : <<extend>>
uc_ext3 ..> uc_base : <<extend>>
uc_base ..> uc_inc1 : <<include>>
uc_base ..> uc_inc2 : <<include>>
uc_base ..> uc_inc3 : <<include>>
@enduml
```

```mermaid
flowchart LR
  actor_left["Operator"]
  subgraph sys_boundary["Smart E-Mobility Hub System"]
    uc_ext1(["Export Simulation<br/>Results"])
    uc_ext2(["Filter Simulation<br/>Results"])
    uc_ext3(["Compare Simulation<br/>Results"])
    uc_base(["View Simulation<br/>Results"])
    uc_inc1(["Display<br/>Recommendations"])
    uc_inc2(["Retrieve Simulation<br/>Results"])
    uc_inc3(["Display Simulation<br/>Metrics"])
  end
  actor_left --- uc_base
  uc_ext1 -. "&lt;&lt;extend&gt;&gt;" .-> uc_base
  uc_ext2 -. "&lt;&lt;extend&gt;&gt;" .-> uc_base
  uc_ext3 -. "&lt;&lt;extend&gt;&gt;" .-> uc_base
  uc_base -. "&lt;&lt;include&gt;&gt;" .-> uc_inc1
  uc_base -. "&lt;&lt;include&gt;&gt;" .-> uc_inc2
  uc_base -. "&lt;&lt;include&gt;&gt;" .-> uc_inc3
  style sys_boundary fill:#e0f2fe,stroke:#0284c7,stroke-width:2px
```
