# TỔNG HỢP MÃ NGUỒN PLANTUML & MERMAID SƠ ĐỒ TUẦN TỰ (SEQUENCE DIAGRAM)
> **Chuẩn mực bài giảng (Supreme Law):** Môn **Software Engineering (CO3001) - ĐHQG-HCM** & **Ian Sommerville (10th Ed) Ch6 p.21-26 (Hình mẫu Slide 22/23 "SEQUENCE DIAGRAMS - EXAMPLE")**.  
> **Đặc trưng quy chuẩn:**
> - Actor stick figure đại diện người dùng khởi xướng.
> - Hộp đối tượng / thành phần ở đỉnh Lifeline tô màu pastel phân biệt (UI, Controller, Service/IoT, Database).
> - Khung kích hoạt (*Activation Bar*) liên tục biểu thị chính xác thời gian xử lý của đối tượng.
> - Thông điệp yêu cầu (*Request Message*): Nét liền đầu mũi tên đặc (`──►`), đặt tên theo hành động nghiệp vụ rõ ràng (VD: `select vehicle`, `insert card`, `verify card`).
> - Thông điệp phản hồi (*Return Message*): Nét đứt đầu mũi tên mở (`< - - -`), nhãn in nghiêng (VD: `reservation approved`, `reject card`, `display active ticket`).
> - Ràng buộc thời gian & thời lượng (*Time & Duration Constraints*): Mốc `{a}`, `{b}` và mũi tên hai đầu `{b - a < X sec}` (Slide Ch6 p.22/23).

---

## MỤC LỤC
1. [SQ01: Đặt giữ phương tiện (Reserve Vehicle - UC03)](#sq01-reserve-vehicle)
2. [SQ02: Nhận phương tiện tại trạm (Pick Up Vehicle - UC04)](#sq02-pick-up-vehicle)
3. [SQ03: Trả phương tiện tại trạm (Return Vehicle - UC05)](#sq03-return-vehicle)
4. [SQ04: Đăng ký & Kích hoạt sạc xe (Request Charging - UC07)](#sq04-request-charging)
5. [SQ05: Điều phối xe giữa các trạm (Redistribute Vehicles - UC10)](#sq05-redistribute-vehicles)
6. [SQ06: Xử lý sự cố vận hành trạm (Handle Operational Incident - UC11)](#sq06-handle-operational-incident)
7. [SQ07: Chạy mô phỏng kịch bản giả định What-if (Run What-if Simulation - UC13 & UC14)](#sq07-run-what-if-simulation)

---

## SQ01: Reserve Vehicle
- **Tương ứng Use Case:** `UC03 - Reserve Vehicle`
- **File Draw.io SVG:** [`SQ01-Reserve_Vehicle.drawio.svg`](./SQ01-Reserve_Vehicle.drawio.svg)
- **File Ảnh PNG:** [`SQ01-Reserve_Vehicle.png`](./SQ01-Reserve_Vehicle.png)
- **Ràng buộc thời gian:** `{a}` tại lúc chọn xe, `{b}` tại lúc nhận vé giữ xe; `{b - a < 5 sec}`.

### Mã PlantUML
```plantuml
@startuml
skinparam sequenceMessageAlign center
skinparam responseMessageBelowArrow false
skinparam roundcorner 10
skinparam ParticipantPadding 25
skinparam BoxPadding 15

actor "User" as User #f3e8ff
participant "Mobile App" as App #dbeafe
participant "Reservation Hub" as Hub #dcfce7
participant "Vehicle Service" as Fleet #ffe4e6
participant "Database" as DB #fef3c7

User -> App: select vehicle
activate User #f3e8ff
activate App #dbeafe

App -> Hub: request reservation
activate Hub #dcfce7

Hub -> Fleet: check availability & battery
activate Fleet #ffe4e6

Fleet -> Fleet: validate battery level (>= 20%)
activate Fleet #ffe4e6
deactivate Fleet

Fleet -> DB: lock vehicle (15-min hold)
activate DB #fef3c7

DB --> Fleet: lock confirmed
deactivate DB

Fleet --> Hub: reservation approved
deactivate Fleet

Hub --> App: issue reservation ticket (QR & timer)
deactivate Hub

App --> User: display active ticket (15:00 countdown)
deactivate App
deactivate User

note over User, App: Duration Constraint: {b - a < 5 sec}
@enduml
```

### Mã Mermaid Preview
```mermaid
sequenceDiagram
    actor User as User
    participant App as Mobile App
    participant Hub as Reservation Hub
    participant Fleet as Vehicle Service
    participant DB as Database

    User->>App: select vehicle
    activate User
    activate App
    App->>Hub: request reservation
    activate Hub
    Hub->>Fleet: check availability & battery
    activate Fleet
    Fleet->>Fleet: validate battery level (>= 20%)
    Fleet->>DB: lock vehicle (15-min hold)
    activate DB
    DB-->>Fleet: lock confirmed
    deactivate DB
    Fleet-->>Hub: reservation approved
    deactivate Fleet
    Hub-->>App: issue reservation ticket (QR & timer)
    deactivate Hub
    App-->>User: display active ticket (15:00 countdown)
    deactivate App
    deactivate User
    Note over User,App: Duration Constraint: {b - a < 5 sec}
```

---

## SQ02: Pick Up Vehicle
- **Tương ứng Use Case:** `UC04 - Pick Up Vehicle`
- **File Draw.io SVG:** [`SQ02-Pick_Up_Vehicle.drawio.svg`](./SQ02-Pick_Up_Vehicle.drawio.svg)
- **File Ảnh PNG:** [`SQ02-Pick_Up_Vehicle.png`](./SQ02-Pick_Up_Vehicle.png)
- **Ràng buộc thời gian:** `{a}` tại lúc quét mã QR, `{b}` tại lúc bắt đầu chuyến đi; `{b - a < 8 sec}`.

### Mã PlantUML
```plantuml
@startuml
skinparam sequenceMessageAlign center
skinparam responseMessageBelowArrow false
skinparam roundcorner 10
skinparam ParticipantPadding 25
skinparam BoxPadding 15

actor "User" as User #f3e8ff
participant "Mobile App" as App #dbeafe
participant "Pickup Controller" as Ctrl #dcfce7
participant "Station IoT Dock" as Dock #ffe4e6
participant "Database" as DB #fef3c7

User -> App: scan QR code at vehicle dock
activate User #f3e8ff
activate App #dbeafe

App -> Ctrl: submit pickup request
activate Ctrl #dcfce7

Ctrl -> DB: validate reservation ticket
activate DB #fef3c7

DB --> Ctrl: reservation verified
deactivate DB

Ctrl -> Dock: send unlock command
activate Dock #ffe4e6

Dock -> Dock: release physical lock mechanism
activate Dock #ffe4e6
deactivate Dock

Dock --> Ctrl: dock unlocked & vehicle released
deactivate Dock

Ctrl -> DB: update vehicle state to 'In-Use'
activate DB #fef3c7

DB --> Ctrl: trip record initiated
deactivate DB

Ctrl --> App: confirm unlock & start trip timer
deactivate Ctrl

App --> User: display trip active & safety tips
deactivate App
deactivate User

note over User, App: Duration Constraint: {b - a < 8 sec}
@enduml
```

### Mã Mermaid Preview
```mermaid
sequenceDiagram
    actor User as User
    participant App as Mobile App
    participant Ctrl as Pickup Controller
    participant Dock as Station IoT Dock
    participant DB as Database

    User->>App: scan QR code at vehicle dock
    activate User
    activate App
    App->>Ctrl: submit pickup request
    activate Ctrl
    Ctrl->>DB: validate reservation ticket
    activate DB
    DB-->>Ctrl: reservation verified
    deactivate DB
    Ctrl->>Dock: send unlock command
    activate Dock
    Dock->>Dock: release physical lock mechanism
    Dock-->>Ctrl: dock unlocked & vehicle released
    deactivate Dock
    Ctrl->>DB: update vehicle state to 'In-Use'
    activate DB
    DB-->>Ctrl: trip record initiated
    deactivate DB
    Ctrl-->>App: confirm unlock & start trip timer
    deactivate Ctrl
    App-->>User: display trip active & safety tips
    deactivate App
    deactivate User
    Note over User,App: Duration Constraint: {b - a < 8 sec}
```

---

## SQ03: Return Vehicle
- **Tương ứng Use Case:** `UC05 - Return Vehicle`
- **File Draw.io SVG:** [`SQ03-Return_Vehicle.drawio.svg`](./SQ03-Return_Vehicle.drawio.svg)
- **File Ảnh PNG:** [`SQ03-Return_Vehicle.png`](./SQ03-Return_Vehicle.png)
- **Ràng buộc thời gian:** `{a}` tại lúc cắm xe vào dock, `{b}` tại lúc nhận hóa đơn thanh toán; `{b - a < 6 sec}`.

### Mã PlantUML
```plantuml
@startuml
skinparam sequenceMessageAlign center
skinparam responseMessageBelowArrow false
skinparam roundcorner 10
skinparam ParticipantPadding 25
skinparam BoxPadding 15

actor "User" as User #f3e8ff
participant "Station IoT Dock" as Dock #ffe4e6
participant "Return Controller" as Ctrl #dcfce7
participant "Telemetry Service" as Tele #f3e8ff
participant "Database" as DB #fef3c7
participant "Mobile App" as App #dbeafe

User -> Dock: insert vehicle into dock & latch
activate User #f3e8ff
activate Dock #ffe4e6

Dock -> Ctrl: report vehicle plugged in
activate Ctrl #dcfce7

Ctrl -> Tele: read odometer & battery level
activate Tele #f3e8ff

Tele --> Ctrl: return final telemetry data
deactivate Tele

Ctrl -> DB: close trip & calculate usage fee
activate DB #fef3c7

DB -> DB: deduct balance & generate receipt
activate DB #fef3c7
deactivate DB

DB --> Ctrl: trip closed & payment confirmed
deactivate DB

Ctrl -> Dock: engage lock & flash green LED
Dock --> Ctrl: dock locked securely
deactivate Dock

Ctrl --> App: send trip invoice & notification
activate App #dbeafe
deactivate Ctrl

App --> User: display trip summary & receipt
deactivate App
deactivate User

note over User, Dock: Duration Constraint: {b - a < 6 sec}
@enduml
```

### Mã Mermaid Preview
```mermaid
sequenceDiagram
    actor User as User
    participant Dock as Station IoT Dock
    participant Ctrl as Return Controller
    participant Tele as Telemetry Service
    participant DB as Database
    participant App as Mobile App

    User->>Dock: insert vehicle into dock & latch
    activate User
    activate Dock
    Dock->>Ctrl: report vehicle plugged in
    activate Ctrl
    Ctrl->>Tele: read odometer & battery level
    activate Tele
    Tele-->>Ctrl: return final telemetry data
    deactivate Tele
    Ctrl->>DB: close trip & calculate usage fee
    activate DB
    DB->>DB: deduct balance & generate receipt
    DB-->>Ctrl: trip closed & payment confirmed
    deactivate DB
    Ctrl->>Dock: engage lock & flash green LED
    Dock-->>Ctrl: dock locked securely
    deactivate Dock
    Ctrl-->>App: send trip invoice & notification
    activate App
    deactivate Ctrl
    App-->>User: display trip summary & receipt
    deactivate App
    deactivate User
    Note over User,Dock: Duration Constraint: {b - a < 6 sec}
```

---

## SQ04: Request Charging
- **Tương ứng Use Case:** `UC07 - Request Charging`
- **File Draw.io SVG:** [`SQ04-Request_Charging.drawio.svg`](./SQ04-Request_Charging.drawio.svg)
- **File Ảnh PNG:** [`SQ04-Request_Charging.png`](./SQ04-Request_Charging.png)
- **Ràng buộc thời gian:** `{a}` tại lúc chọn gói sạc, `{b}` tại lúc dòng sạc bắt đầu cấp năng lượng; `{b - a < 7 sec}`.

### Mã PlantUML
```plantuml
@startuml
skinparam sequenceMessageAlign center
skinparam responseMessageBelowArrow false
skinparam roundcorner 10
skinparam ParticipantPadding 25
skinparam BoxPadding 15

actor "User" as User #f3e8ff
participant "Mobile App" as App #dbeafe
participant "Charging Controller" as Ctrl #dcfce7
participant "Smart Charger IoT" as Charger #ffe4e6
participant "Database" as DB #fef3c7

User -> App: select charging slot & power tier
activate User #f3e8ff
activate App #dbeafe

App -> Ctrl: submit charging session request
activate Ctrl #dcfce7

Ctrl -> DB: verify student wallet & subscription
activate DB #fef3c7

DB --> Ctrl: account verified
deactivate DB

Ctrl -> Charger: check charger port status & grid load
activate Charger #ffe4e6

Charger --> Ctrl: port ready & power allocated
deactivate Charger

Ctrl -> Charger: activate charging port & energize cable
activate Charger #ffe4e6

Charger --> Ctrl: charging power delivered
deactivate Charger

Ctrl -> DB: create charging session record
activate DB #fef3c7

DB --> Ctrl: session record saved
deactivate DB

Ctrl --> App: notify charging started & live power feed
deactivate Ctrl

App --> User: display charging progress & energy delivered
deactivate App
deactivate User

note over User, App: Duration Constraint: {b - a < 7 sec}
@enduml
```

### Mã Mermaid Preview
```mermaid
sequenceDiagram
    actor User as User
    participant App as Mobile App
    participant Ctrl as Charging Controller
    participant Charger as Smart Charger IoT
    participant DB as Database

    User->>App: select charging slot & power tier
    activate User
    activate App
    App->>Ctrl: submit charging session request
    activate Ctrl
    Ctrl->>DB: verify student wallet & subscription
    activate DB
    DB-->>Ctrl: account verified
    deactivate DB
    Ctrl->>Charger: check charger port status & grid load
    activate Charger
    Charger-->>Ctrl: port ready & power allocated
    deactivate Charger
    Ctrl->>Charger: activate charging port & energize cable
    activate Charger
    Charger-->>Ctrl: charging power delivered
    deactivate Charger
    Ctrl->>DB: create charging session record
    activate DB
    DB-->>Ctrl: session record saved
    deactivate DB
    Ctrl-->>App: notify charging started & live power feed
    deactivate Ctrl
    App-->>User: display charging progress & energy delivered
    deactivate App
    deactivate User
    Note over User,App: Duration Constraint: {b - a < 7 sec}
```

---

## SQ05: Redistribute Vehicles
- **Tương ứng Use Case:** `UC10 - Redistribute Vehicles`
- **File Draw.io SVG:** [`SQ05-Redistribute_Vehicles.drawio.svg`](./SQ05-Redistribute_Vehicles.drawio.svg)
- **File Ảnh PNG:** [`SQ05-Redistribute_Vehicles.png`](./SQ05-Redistribute_Vehicles.png)
- **Ràng buộc thời gian:** `{a}` tại lúc kích hoạt phân tích, `{b}` tại lúc nhiệm vụ hiển thị trên bản đồ; `{b - a < 10 sec}`.

### Mã PlantUML
```plantuml
@startuml
skinparam sequenceMessageAlign center
skinparam responseMessageBelowArrow false
skinparam roundcorner 10
skinparam ParticipantPadding 25
skinparam BoxPadding 15

actor "Operator" as Op #f3e8ff
participant "Operator Dashboard" as Dash #dbeafe
participant "Rebalance Controller" as Ctrl #dcfce7
participant "Optimization Engine" as Opt #f3e8ff
participant "Database" as DB #fef3c7
participant "Field Staff App" as Staff #ffe4e6

Op -> Dash: trigger rebalance analysis
activate Op #f3e8ff
activate Dash #dbeafe

Dash -> Ctrl: request fleet distribution report
activate Ctrl #dcfce7

Ctrl -> DB: fetch hub inventory & demand forecast
activate DB #fef3c7

DB --> Ctrl: return surplus & shortage data
deactivate DB

Ctrl -> Opt: compute optimal transfer routes
activate Opt #f3e8ff

Opt --> Ctrl: return dispatch plan
deactivate Opt

Ctrl -> DB: save dispatch orders & reserve transit slots
activate DB #fef3c7

DB --> Ctrl: dispatch orders confirmed
deactivate DB

Ctrl -> Staff: assign transfer missions to drivers
activate Staff #ffe4e6

Staff --> Ctrl: acknowledge mission receipt
deactivate Staff

Ctrl --> Dash: return active dispatch plan & live tracking
deactivate Ctrl

Dash --> Op: display transfer missions & ETA on map
deactivate Dash
deactivate Op

note over Op, Dash: Duration Constraint: {b - a < 10 sec}
@enduml
```

### Mã Mermaid Preview
```mermaid
sequenceDiagram
    actor Op as Operator
    participant Dash as Operator Dashboard
    participant Ctrl as Rebalance Controller
    participant Opt as Optimization Engine
    participant DB as Database
    participant Staff as Field Staff App

    Op->>Dash: trigger rebalance analysis
    activate Op
    activate Dash
    Dash->>Ctrl: request fleet distribution report
    activate Ctrl
    Ctrl->>DB: fetch hub inventory & demand forecast
    activate DB
    DB-->>Ctrl: return surplus & shortage data
    deactivate DB
    Ctrl->>Opt: compute optimal transfer routes
    activate Opt
    Opt-->>Ctrl: return dispatch plan
    deactivate Opt
    Ctrl->>DB: save dispatch orders & reserve transit slots
    activate DB
    DB-->>Ctrl: dispatch orders confirmed
    deactivate DB
    Ctrl->>Staff: assign transfer missions to drivers
    activate Staff
    Staff-->>Ctrl: acknowledge mission receipt
    deactivate Staff
    Ctrl-->>Dash: return active dispatch plan & live tracking
    deactivate Ctrl
    Dash-->>Op: display transfer missions & ETA on map
    deactivate Dash
    deactivate Op
    Note over Op,Dash: Duration Constraint: {b - a < 10 sec}
```

---

## SQ06: Handle Operational Incident
- **Tương ứng Use Case:** `UC11 - Handle Operational Incident`
- **File Draw.io SVG:** [`SQ06-Handle_Operational_Incident.drawio.svg`](./SQ06-Handle_Operational_Incident.drawio.svg)
- **File Ảnh PNG:** [`SQ06-Handle_Operational_Incident.png`](./SQ06-Handle_Operational_Incident.png)
- **Ràng buộc thời gian:** `{a}` tại lúc báo cáo sự cố, `{b}` tại lúc nhận mã ticket bảo trì; `{b - a < 5 sec}`.

### Mã PlantUML
```plantuml
@startuml
skinparam sequenceMessageAlign center
skinparam responseMessageBelowArrow false
skinparam roundcorner 10
skinparam ParticipantPadding 25
skinparam BoxPadding 15

actor "Technician" as Tech #f3e8ff
participant "Monitoring Dashboard" as Dash #dbeafe
participant "Incident Controller" as Ctrl #dcfce7
participant "Station IoT Dock" as Dock #ffe4e6
participant "Database" as DB #fef3c7

Tech -> Dash: report dock hardware malfunction
activate Tech #f3e8ff
activate Dash #dbeafe

Dash -> Ctrl: submit incident report & dock ID
activate Ctrl #dcfce7

Ctrl -> Dock: send emergency disable command
activate Dock #ffe4e6

Dock -> Dock: de-energize port & engage safety lock
activate Dock #ffe4e6
deactivate Dock

Dock --> Ctrl: dock isolated & safety lock engaged
deactivate Dock

Ctrl -> DB: update dock state to 'Under Maintenance'
activate DB #fef3c7

DB -> DB: reroute incoming reservations to adjacent docks
activate DB #fef3c7
deactivate DB

DB --> Ctrl: reroute complete & incident ticket logged
deactivate DB

Ctrl --> Dash: confirm dock isolation & issue repair ticket
deactivate Ctrl

Dash --> Tech: display maintenance ticket #INC-892
deactivate Dash
deactivate Tech

note over Tech, Dash: Duration Constraint: {b - a < 5 sec}
@enduml
```

### Mã Mermaid Preview
```mermaid
sequenceDiagram
    actor Tech as Technician
    participant Dash as Monitoring Dashboard
    participant Ctrl as Incident Controller
    participant Dock as Station IoT Dock
    participant DB as Database

    Tech->>Dash: report dock hardware malfunction
    activate Tech
    activate Dash
    Dash->>Ctrl: submit incident report & dock ID
    activate Ctrl
    Ctrl->>Dock: send emergency disable command
    activate Dock
    Dock->>Dock: de-energize port & engage safety lock
    Dock-->>Ctrl: dock isolated & safety lock engaged
    deactivate Dock
    Ctrl->>DB: update dock state to 'Under Maintenance'
    activate DB
    DB->>DB: reroute incoming reservations to adjacent docks
    DB-->>Ctrl: reroute complete & incident ticket logged
    deactivate DB
    Ctrl-->>Dash: confirm dock isolation & issue repair ticket
    deactivate Ctrl
    Dash-->>Tech: display maintenance ticket #INC-892
    deactivate Dash
    deactivate Tech
    Note over Tech,Dash: Duration Constraint: {b - a < 5 sec}
```

---

## SQ07: Run What-if Simulation
- **Tương ứng Use Case:** `UC13 - Run What-if Simulation & UC14 - View Results`
- **File Draw.io SVG:** [`SQ07-Run_What_if_Simulation.drawio.svg`](./SQ07-Run_What_if_Simulation.drawio.svg)
- **File Ảnh PNG:** [`SQ07-Run_What_if_Simulation.png`](./SQ07-Run_What_if_Simulation.png)
- **Ràng buộc thời gian:** `{a}` tại lúc nhấn chạy mô phỏng, `{b}` tại lúc bản đồ nhiệt và khuyến nghị xuất hiện; `{b - a < 15 sec}`.

### Mã PlantUML
```plantuml
@startuml
skinparam sequenceMessageAlign center
skinparam responseMessageBelowArrow false
skinparam roundcorner 10
skinparam ParticipantPadding 25
skinparam BoxPadding 15

actor "Planner" as Plan #f3e8ff
participant "Simulation Web UI" as UI #dbeafe
participant "Simulation Controller" as Ctrl #dcfce7
participant "Simulation Engine" as Engine #f3e8ff
participant "Database" as DB #fef3c7

Plan -> UI: select scenario (Metro Surge + Charger Failure)
activate Plan #f3e8ff
activate UI #dbeafe

UI -> Ctrl: submit simulation parameters & duration
activate Ctrl #dcfce7

Ctrl -> DB: load historical trip & charging data
activate DB #fef3c7

DB --> Ctrl: historical dataset loaded (50,000 trips)
deactivate DB

Ctrl -> Engine: execute Monte Carlo simulation run
activate Engine #f3e8ff

Engine -> Engine: model vehicle depletion & grid peak demand
activate Engine #f3e8ff
deactivate Engine

Engine --> Ctrl: return simulation results & bottlenecks
deactivate Engine

Ctrl -> DB: save simulation run & AI recommendations
activate DB #fef3c7

DB --> Ctrl: run record saved
deactivate DB

Ctrl --> UI: render comparative charts & recommendations
deactivate Ctrl

UI --> Plan: display bottleneck heatmaps & fleet buffer advice
deactivate UI
deactivate Plan

note over Plan, UI: Duration Constraint: {b - a < 15 sec}
@enduml
```

### Mã Mermaid Preview
```mermaid
sequenceDiagram
    actor Plan as Planner
    participant UI as Simulation Web UI
    participant Ctrl as Simulation Controller
    participant Engine as Simulation Engine
    participant DB as Database

    Plan->>UI: select scenario (Metro Surge + Charger Failure)
    activate Plan
    activate UI
    UI->>Ctrl: submit simulation parameters & duration
    activate Ctrl
    Ctrl->>DB: load historical trip & charging data
    activate DB
    DB-->>Ctrl: historical dataset loaded (50,000 trips)
    deactivate DB
    Ctrl->>Engine: execute Monte Carlo simulation run
    activate Engine
    Engine->>Engine: model vehicle depletion & grid peak demand
    Engine-->>Ctrl: return simulation results & bottlenecks
    deactivate Engine
    Ctrl->>DB: save simulation run & AI recommendations
    activate DB
    DB-->>Ctrl: run record saved
    deactivate DB
    Ctrl-->>UI: render comparative charts & recommendations
    deactivate Ctrl
    UI-->>Plan: display bottleneck heatmaps & fleet buffer advice
    deactivate UI
    deactivate Plan
    Note over Plan,UI: Duration Constraint: {b - a < 15 sec}
```
