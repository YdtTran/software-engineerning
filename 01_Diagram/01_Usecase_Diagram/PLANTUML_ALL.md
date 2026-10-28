# TỔNG HỢP MÃ NGUỒN PLANTUML & MERMAID TOÀN BỘ SƠ ĐỒ USE CASE
> Hệ thống: **Smart E-Mobility Hub System**
> Chuẩn quy tắc: `02_SE` & `uml-designer` (Hỗ trợ mở trực tiếp bằng Draw.io trong VS Code hoặc import Visual Paradigm Online).

---

## MỤC LỤC
1. [Sơ đồ tổng quan (General Use Case Diagram)](#1-sơ-đồ-tổng-quan-general-use-case-diagram)
2. [Nhóm chức năng Sinh viên (Student Use Cases UC01 - UC07)](#2-nhóm-chức-năng-sinh-viên-student-use-cases)
   - [UC01: Search Mobility Hub](#uc01-search-mobility-hub)
   - [UC02: View Available Vehicles](#uc02-view-available-vehicles)
   - [UC03: Reserve Vehicle](#uc03-reserve-vehicle)
   - [UC04: Pick Up Vehicle](#uc04-pick-up-vehicle)
   - [UC05: Return Vehicle](#uc05-return-vehicle)
   - [UC06: Reserve Parking Space](#uc06-reserve-parking-space)
   - [UC07: Request Charging](#uc07-request-charging)
3. [Nhóm chức năng Quản trị / Điều hành (Operator Use Cases UC08 - UC14)](#3-nhóm-chức-năng-quản-trị--điều-hành-operator-use-cases)
   - [UC08: Monitor Mobility Hub Network](#uc08-monitor-mobility-hub-network)
   - [UC09: Manage Mobility Resources](#uc09-manage-mobility-resources)
   - [UC10: Redistribute Vehicles](#uc10-redistribute-vehicles)
   - [UC11: Handle Operational Incident](#uc11-handle-operational-incident)
   - [UC12: Manage Charging Schedule](#uc12-manage-charging-schedule)
   - [UC13: Run What-if Simulation](#uc13-run-what-if-simulation)
   - [UC14: View Simulation Results](#uc14-view-simulation-results)

---

## 1. Sơ đồ tổng quan (General Use Case Diagram)
- **File Draw.io:** `01_Diagram/01_Usecase_Diagram/GENERAL/general_usecase_diagram.drawio.svg`

### Mã PlantUML
```plantuml
@startuml
left to right direction
skinparam packageStyle rectangle
skinparam shadowing false
skinparam actorStyle awesome

actor "Student" as Student
actor "Operator" as Operator

rectangle "Smart E-Mobility Hub System" {
    usecase "Search Mobility Hubs" as UC_S1
    usecase "View Available Vehicles" as UC_S2
    usecase "Reserve Vehicle" as UC_S3
    usecase "Pick Up Vehicle" as UC_S4
    usecase "Return Vehicle" as UC_S5
    usecase "Reserve Parking Space" as UC_S6
    usecase "Request Charging" as UC_S7

    usecase "Monitor Mobility Hub Network" as UC_O1
    usecase "Manage Mobility Resources" as UC_O2
    usecase "Redistribute Vehicles" as UC_O3
    usecase "Handle Operational Incident" as UC_O4
    usecase "Manage Charging Schedule" as UC_O5
    usecase "Run What-if Simulation" as UC_O6
    usecase "View Simulation Results" as UC_O7
}

Student -- UC_S1
Student -- UC_S2
Student -- UC_S3
Student -- UC_S4
Student -- UC_S5
Student -- UC_S6
Student -- UC_S7

UC_O1 -- Operator
UC_O2 -- Operator
UC_O3 -- Operator
UC_O4 -- Operator
UC_O5 -- Operator
UC_O6 -- Operator
UC_O7 -- Operator
@enduml
```

### Mã Mermaid
```mermaid
flowchart LR
    subgraph LeftActors [" "]
        Student(["👤 Student"])
    end

    subgraph SystemBoundary ["Smart E-Mobility Hub System"]
        UC_S1(["Search Mobility Hubs"])
        UC_S2(["View Available Vehicles"])
        UC_S3(["Reserve Vehicle"])
        UC_S4(["Pick Up Vehicle"])
        UC_S5(["Return Vehicle"])
        UC_S6(["Reserve Parking Space"])
        UC_S7(["Request Charging"])

        UC_O1(["Monitor Mobility Hub Network"])
        UC_O2(["Manage Mobility Resources"])
        UC_O3(["Redistribute Vehicles"])
        UC_O4(["Handle Operational Incident"])
        UC_O5(["Manage Charging Schedule"])
        UC_O6(["Run What-if Simulation"])
        UC_O7(["View Simulation Results"])
    end

    subgraph RightActors [" "]
        Operator(["👤 Operator"])
    end

    Student --- UC_S1
    Student --- UC_S2
    Student --- UC_S3
    Student --- UC_S4
    Student --- UC_S5
    Student --- UC_S6
    Student --- UC_S7

    UC_O1 --- Operator
    UC_O2 --- Operator
    UC_O3 --- Operator
    UC_O4 --- Operator
    UC_O5 --- Operator
    UC_O6 --- Operator
    UC_O7 --- Operator

    style LeftActors fill:none,stroke:none
    style RightActors fill:none,stroke:none
    style SystemBoundary fill:#f0f9ff,stroke:#0284c7,stroke-width:2px
```

---

## 2. Nhóm chức năng Sinh viên (Student Use Cases)

### UC01: Search Mobility Hub
- **File Draw.io:** `01_Diagram/01_Usecase_Diagram/STUDENTS/UC01-Search_Mobility_Hub.drawio.svg`

```plantuml
@startuml
left to right direction
skinparam packageStyle rectangle
skinparam shadowing false

actor "Student" as Student

rectangle "Smart E-Mobility Hub System" {
    usecase "Search Mobility Hub" as UC_Search
    usecase "Filter by Vehicle Type" as UC_Type
    usecase "Filter by Distance" as UC_Dist

    UC_Type ..> UC_Search : <<extend>>
    UC_Dist ..> UC_Search : <<extend>>
}

Student -- UC_Search
@enduml
```

### UC02: View Available Vehicles
- **File Draw.io:** `01_Diagram/01_Usecase_Diagram/STUDENTS/UC02-View_Available_Vehicles.drawio.svg`

```plantuml
@startuml
left to right direction
skinparam packageStyle rectangle
skinparam shadowing false

actor "Student" as Student

rectangle "Smart E-Mobility Hub System" {
    usecase "View Available Vehicles" as UC_View
    usecase "View Vehicle Details" as UC_Detail

    UC_Detail ..> UC_View : <<extend>>
}

Student -- UC_View
@enduml
```

### UC03: Reserve Vehicle
- **File Draw.io:** `01_Diagram/01_Usecase_Diagram/STUDENTS/UC03-Reserve_Vehicle.drawio.svg`

```plantuml
@startuml
left to right direction
skinparam packageStyle rectangle
skinparam shadowing false

actor "Student" as Student

rectangle "Smart E-Mobility Hub System" {
    usecase "Reserve Vehicle" as UC_Reserve
    usecase "Verify Vehicle Availability" as UC_Verify

    UC_Reserve ..> UC_Verify : <<include>>
}

Student -- UC_Reserve
@enduml
```

### UC04: Pick Up Vehicle
- **File Draw.io:** `01_Diagram/01_Usecase_Diagram/STUDENTS/UC04-Pick_Up_Vehicle.drawio.svg`

```plantuml
@startuml
left to right direction
skinparam packageStyle rectangle
skinparam shadowing false

actor "Student" as Student

rectangle "Smart E-Mobility Hub System" {
    usecase "Pick Up Vehicle" as UC_PickUp
    usecase "Validate Reservation Status" as UC_Validate
    usecase "Unlock Vehicle" as UC_Unlock
    usecase "Report Vehicle Damage" as UC_Damage

    UC_PickUp ..> UC_Validate : <<include>>
    UC_PickUp ..> UC_Unlock : <<include>>
    UC_Damage ..> UC_PickUp : <<extend>>
}

Student -- UC_PickUp
@enduml
```

### UC05: Return Vehicle
- **File Draw.io:** `01_Diagram/01_Usecase_Diagram/STUDENTS/UC05-Return_Vehicle.drawio.svg`

```plantuml
@startuml
left to right direction
skinparam packageStyle rectangle
skinparam shadowing false

actor "Student" as Student

rectangle "Smart E-Mobility Hub System" {
    usecase "Return vehicle" as UC_Return
    usecase "Check Hub Space Availability" as UC_Space
    usecase "Verify Vehicle & Battery Status" as UC_Battery
    usecase "Confirm Vehicle Return" as UC_Confirm

    UC_Return ..> UC_Space : <<include>>
    UC_Return ..> UC_Battery : <<include>>
    UC_Return ..> UC_Confirm : <<include>>
}

Student -- UC_Return
@enduml
```

### UC06: Reserve Parking Space
- **File Draw.io:** `01_Diagram/01_Usecase_Diagram/STUDENTS/UC06-Reserve_Parking_Space.drawio.svg`

```plantuml
@startuml
left to right direction
skinparam packageStyle rectangle
skinparam shadowing false

actor "Student" as Student

rectangle "Smart E-Mobility Hub System" {
    usecase "Cancel Parking Reservation" as UC_Cancel
    usecase "Reserve Parking Space" as UC_Reserve
    usecase "Confirm Parking Reservation" as UC_Confirm
    usecase "Validate vehicle Information" as UC_Validate
    usecase "Check Parking Availability" as UC_Check

    UC_Reserve ..> UC_Confirm : <<include>>
    UC_Reserve ..> UC_Validate : <<include>>
    UC_Reserve ..> UC_Check : <<include>>
}

Student -- UC_Cancel
Student -- UC_Reserve
@enduml
```

### UC07: Request Charging
- **File Draw.io:** `01_Diagram/01_Usecase_Diagram/STUDENTS/UC07-Request_Charging.drawio.svg`

```plantuml
@startuml
left to right direction
skinparam packageStyle rectangle
skinparam shadowing false

actor "Student" as Student

rectangle "Smart E-Mobility Hub System" {
    usecase "Request Charging" as UC_Request
    usecase "Cancel Charging Request" as UC_Cancel
    usecase "Check Charging Availability" as UC_Check
    usecase "Confirm Charging Request" as UC_Confirm
    usecase "Validate Charging Request" as UC_Validate

    UC_Request ..> UC_Check : <<include>>
    UC_Request ..> UC_Confirm : <<include>>
    UC_Request ..> UC_Validate : <<include>>
}

Student -- UC_Request
Student -- UC_Cancel
@enduml
```

---

## 3. Nhóm chức năng Quản trị / Điều hành (Operator Use Cases)

### UC08: Monitor Mobility Hub Network
- **File Draw.io:** `01_Diagram/01_Usecase_Diagram/OPERATOR/UC8-Monitor_Mobility_Hub_Network.drawio.svg`

```plantuml
@startuml
left to right direction
skinparam packageStyle rectangle
skinparam shadowing false

actor "Operator" as Operator

rectangle "Smart E-Mobility Hub" {
    usecase "Inspect Selected Hub" as UC_Inspect
    usecase "Monitor Mobility Hub Network" as UC_Monitor
    usecase "View Vehicle Availability and Battery Levels" as UC_Vehicle
    usecase "View Parking Occupancy" as UC_Parking
    usecase "View Charger Status" as UC_Charger

    UC_Inspect ..> UC_Monitor : <<extend>>
    UC_Monitor ..> UC_Vehicle : <<include>>
    UC_Monitor ..> UC_Parking : <<include>>
    UC_Monitor ..> UC_Charger : <<include>>
}

Operator -- UC_Monitor
@enduml
```

### UC09: Manage Mobility Resources
- **File Draw.io:** `01_Diagram/01_Usecase_Diagram/OPERATOR/UC9-Manage_Mobility_Resources.drawio.svg`

```plantuml
@startuml
left to right direction
skinparam packageStyle rectangle
skinparam shadowing false

actor "Operator" as Operator

rectangle "Smart E-Mobility Hub" {
    usecase "Manage Mobility Resources" as UC_Manage
    usecase "Suspend Resource" as UC_Suspend
    usecase "Reactivate Resource" as UC_Reactivate
    usecase "Register Resource" as UC_Register
    usecase "Update Resource Information" as UC_Update
    usecase "Validate Resource Data" as UC_Validate

    UC_Suspend --|> UC_Manage
    UC_Reactivate --|> UC_Manage
    UC_Register --|> UC_Manage
    UC_Update --|> UC_Manage

    UC_Register ..> UC_Validate : <<include>>
    UC_Update ..> UC_Validate : <<include>>
}

Operator -- UC_Manage
@enduml
```

### UC10: Redistribute Vehicles
- **File Draw.io:** `01_Diagram/01_Usecase_Diagram/OPERATOR/UC10-Redistribute_Vehicles.drawio.svg`

```plantuml
@startuml
left to right direction
skinparam packageStyle rectangle
skinparam shadowing false

actor "Operator" as Operator

rectangle "Smart E-Mobility Hub" {
    usecase "Find Alternative Destination Hub" as UC_Alt
    usecase "Redistribute Vehicles" as UC_Redist
    usecase "Check Transferable Vehicles" as UC_CheckVeh
    usecase "Check Destination Parking Capacity" as UC_CheckCap
    usecase "Create Transfer Order" as UC_Order

    UC_Alt ..> UC_Redist : <<extend>>
    UC_Redist ..> UC_CheckVeh : <<include>>
    UC_Redist ..> UC_CheckCap : <<include>>
    UC_Redist ..> UC_Order : <<include>>
}

Operator -- UC_Redist
@enduml
```

### UC11: Handle Operational Incident
- **File Draw.io:** `01_Diagram/01_Usecase_Diagram/OPERATOR/UC11-Handle_Operational_Incident.drawio.svg`

```plantuml
@startuml
left to right direction
skinparam packageStyle rectangle
skinparam shadowing false

actor "Operator" as Operator

rectangle "Smart E-Mobility Hub" {
    usecase "Isolate Faulty Resource" as UC_Isolate
    usecase "Schedule Maintenance" as UC_Schedule
    usecase "Handle Operational Incident" as UC_Handle
    usecase "Review Incident Details" as UC_Review
    usecase "Assess Incident Impact" as UC_Assess
    usecase "Update Incident Status" as UC_Status

    UC_Isolate ..> UC_Handle : <<extend>>
    UC_Schedule ..> UC_Handle : <<extend>>
    UC_Handle ..> UC_Review : <<include>>
    UC_Handle ..> UC_Assess : <<include>>
    UC_Handle ..> UC_Status : <<include>>
}

Operator -- UC_Handle
@enduml
```

### UC12: Manage Charging Schedule
- **File Draw.io:** `01_Diagram/01_Usecase_Diagram/OPERATOR/UC12-Manage_Charging_Schedule.drawio.svg`

```plantuml
@startuml
left to right direction
skinparam packageStyle rectangle
skinparam shadowing false

actor "Operator" as Operator

rectangle "Smart E-Mobility Hub System" {
    usecase "Reassign on Port Malfunction" as UC_Reassign
    usecase "Manual Override Schedule" as UC_Override
    usecase "Manage Charging Schedule" as UC_Manage
    usecase "Monitor Charging Queue" as UC_Queue
    usecase "Prioritize Charging Order" as UC_Order
    usecase "Allocate Charging Points" as UC_Alloc

    UC_Reassign ..> UC_Manage : <<extend>>
    UC_Override ..> UC_Manage : <<extend>>
    UC_Manage ..> UC_Queue : <<include>>
    UC_Manage ..> UC_Order : <<include>>
    UC_Manage ..> UC_Alloc : <<include>>
}

Operator -- UC_Manage
@enduml
```

### UC13: Run What-if Simulation
- **File Draw.io:** `01_Diagram/01_Usecase_Diagram/OPERATOR/UC13-Run_What-if_Simulation.drawio.svg`

```plantuml
@startuml
left to right direction
skinparam packageStyle rectangle
skinparam shadowing false

actor "Operator" as Operator

rectangle "Smart E-Mobility Hub System" {
    usecase "Export Simulation Report" as UC_Export
    usecase "Apply Coordination Recommendations" as UC_Coord
    usecase "Run What-if Simulation" as UC_Sim
    usecase "Select Simulation Scenario" as UC_Select
    usecase "Configure Scenario Parameters" as UC_Config
    usecase "Execute Network Simulation" as UC_Exec
    usecase "View Simulation Results (UC-14)" as UC_View

    UC_Export ..> UC_Sim : <<extend>>
    UC_Coord ..> UC_Sim : <<extend>>
    UC_Sim ..> UC_Select : <<include>>
    UC_Sim ..> UC_Config : <<include>>
    UC_Sim ..> UC_Exec : <<include>>
    UC_Sim ..> UC_View : <<include>>
}

Operator -- UC_Sim
@enduml
```

### UC14: View Simulation Results
- **File Draw.io:** `01_Diagram/01_Usecase_Diagram/OPERATOR/UC14-View_Simulation_Results.drawio.svg`

```plantuml
@startuml
left to right direction
skinparam packageStyle rectangle
skinparam shadowing false

actor "Operator" as Operator

rectangle "Smart E-Mobility Hub System" {
    usecase "Export Simulation Results" as UC_Export
    usecase "Filter Simulation Results" as UC_Filter
    usecase "Compare Simulation Results" as UC_Compare
    usecase "View Simulation Results" as UC_View
    usecase "Display Recommendations" as UC_Rec
    usecase "Retrieve Simulation Results" as UC_Retr
    usecase "Display Simulation Metrics" as UC_Metrics

    UC_Export ..> UC_View : <<extend>>
    UC_Filter ..> UC_View : <<extend>>
    UC_Compare ..> UC_View : <<extend>>
    UC_View ..> UC_Rec : <<include>>
    UC_View ..> UC_Retr : <<include>>
    UC_View ..> UC_Metrics : <<include>>
}

Operator -- UC_View
@enduml
```
