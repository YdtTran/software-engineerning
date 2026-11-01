# TỔNG HỢP MÃ NGUỒN PLANTUML & MERMAID SƠ ĐỒ TUẦN TỰ (SEQUENCE DIAGRAM)
> **Chuẩn mực bài giảng (Supreme Law):** Môn **Software Engineering (CO3001) - ĐHQG-HCM** & **Ian Sommerville (10th Ed) Ch6 p.21-26 (Hình mẫu Slide 22/23 "SEQUENCE DIAGRAMS - EXAMPLE")**.  
> **Đặc trưng quy chuẩn:**
> - Actor stick figure đại diện người dùng khởi xướng.
> - Hộp đối tượng / thành phần ở đỉnh Lifeline tô màu đậm hơn phân biệt (UI, Controller, Service/IoT, Database).
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
hide footbox
skinparam backgroundColor #ffffff
skinparam defaultFontName Segoe UI
skinparam defaultFontColor #000000
skinparam defaultFontSize 16
skinparam sequence {
  ParticipantBorderColor #000000
  ParticipantFontColor #000000
  ParticipantFontSize 18
  ActorBorderColor #000000
  ActorFontColor #000000
  ActorFontSize 18
  LifeLineBorderColor #000000
}
skinparam ArrowFontColor #000000
skinparam ArrowFontSize 16
skinparam noteFontColor #000000
skinparam noteFontSize 14
skinparam noteBorderColor #000000
skinparam noteBackgroundColor #fcd34d
skinparam titleFontColor #000000
skinparam titleFontSize 22
actor "User" as P0 #d8b4fe
participant ":MobileApp" as P1 #93c5fd
participant ":ReservationHub" as P2 #86efac
participant ":VehicleService" as P3 #fda4af
participant "<<datastore>> Database" as P4 #fcd34d
activate P0 #d8b4fe
P0->P1: 1: select vehicle
activate P1 #93c5fd
note left of P0: {a}
P1->P2: 1.1: request reservation
activate P2 #86efac
P2->P3: 1.2: check availability & battery
activate P3 #fda4af
P3->P3: 1.3: validate battery level (>= 20%)
activate P3 #fda4af
deactivate P3
P3->P4: 1.4: lock vehicle (15-min hold)
activate P4 #fcd34d
P4-->P3: 1.5: lock confirmed
deactivate P4
P3-->P2: 1.6: reservation approved
deactivate P3
P2-->P1: 1.7: issue reservation ticket (QR & timer)
deactivate P2
P1-->P0: 1.8: display active ticket (15:00 countdown)
note left of P0: {b}
deactivate P0
deactivate P1
note left of P0: {b - a < 5 sec} (scenario assumption)
@enduml
```

### Mã Mermaid Preview
```mermaid
%%{init: {"theme":"base","fontFamily":"Segoe UI","themeVariables":{"fontSize":"16px","textColor":"#000000","primaryTextColor":"#000000","actorTextColor":"#000000","signalTextColor":"#000000","noteTextColor":"#000000","labelTextColor":"#000000","loopTextColor":"#000000","actorBkg":"#93c5fd","actorBorder":"#000000","activationBkgColor":"#86efac","activationBorderColor":"#000000","noteBkgColor":"#fcd34d","noteBorderColor":"#000000","labelBoxBorderColor":"#000000","labelBoxBkgColor":"#93c5fd","background":"#ffffff"},"sequence":{"actorFontSize":18,"messageFontSize":16,"noteFontSize":14,"mirrorActors":false}}}%%
    sequenceDiagram
        actor P0 as User
        participant P1 as :MobileApp
        participant P2 as :ReservationHub
        participant P3 as :VehicleService
        participant P4 as <<datastore>> Database
    activate P0
    P0->>P1: 1: select vehicle
    activate P1
    Note left of P0: {a}
    P1->>P2: 1.1: request reservation
    activate P2
    P2->>P3: 1.2: check availability & battery
    activate P3
    P3->>P3: 1.3: validate battery level (>= 20%)
    activate P3
    deactivate P3
    P3->>P4: 1.4: lock vehicle (15-min hold)
    activate P4
    P4-->>P3: 1.5: lock confirmed
    deactivate P4
    P3-->>P2: 1.6: reservation approved
    deactivate P3
    P2-->>P1: 1.7: issue reservation ticket (QR & timer)
    deactivate P2
    P1-->>P0: 1.8: display active ticket (15:00 countdown)
    Note left of P0: {b}
    deactivate P0
    deactivate P1
    Note left of P0: {b - a < 5 sec} (scenario assumption)
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
hide footbox
skinparam backgroundColor #ffffff
skinparam defaultFontName Segoe UI
skinparam defaultFontColor #000000
skinparam defaultFontSize 16
skinparam sequence {
  ParticipantBorderColor #000000
  ParticipantFontColor #000000
  ParticipantFontSize 18
  ActorBorderColor #000000
  ActorFontColor #000000
  ActorFontSize 18
  LifeLineBorderColor #000000
}
skinparam ArrowFontColor #000000
skinparam ArrowFontSize 16
skinparam noteFontColor #000000
skinparam noteFontSize 14
skinparam noteBorderColor #000000
skinparam noteBackgroundColor #fcd34d
skinparam titleFontColor #000000
skinparam titleFontSize 22
actor "User" as P0 #d8b4fe
participant ":MobileApp" as P1 #93c5fd
participant ":PickupController" as P2 #86efac
participant ":StationIoTDock" as P3 #fda4af
participant "<<datastore>> Database" as P4 #fcd34d
activate P0 #d8b4fe
P0->P1: 1: scan QR code at vehicle dock
activate P1 #93c5fd
note left of P0: {a}
P1->P2: 1.1: submit pickup request
activate P2 #86efac
P2->P4: 1.2: validate reservation ticket
activate P4 #fcd34d
P4-->P2: 1.3: reservation verified
deactivate P4
P2->P3: 1.4: send unlock command
activate P3 #fda4af
P3->P3: 1.5: release physical lock mechanism
activate P3 #fda4af
deactivate P3
P3-->P2: 1.6: dock unlocked & vehicle released
deactivate P3
P2->P4: 1.7: update vehicle state to 'In-Use'
activate P4 #fcd34d
P4-->P2: 1.8: trip record initiated
deactivate P4
P2-->P1: 1.9: confirm unlock & start trip timer
deactivate P2
P1-->P0: 1.10: display trip active & safety tips
note left of P0: {b}
deactivate P0
deactivate P1
note left of P0: {b - a < 8 sec} (scenario assumption)
@enduml
```

### Mã Mermaid Preview
```mermaid
%%{init: {"theme":"base","fontFamily":"Segoe UI","themeVariables":{"fontSize":"16px","textColor":"#000000","primaryTextColor":"#000000","actorTextColor":"#000000","signalTextColor":"#000000","noteTextColor":"#000000","labelTextColor":"#000000","loopTextColor":"#000000","actorBkg":"#93c5fd","actorBorder":"#000000","activationBkgColor":"#86efac","activationBorderColor":"#000000","noteBkgColor":"#fcd34d","noteBorderColor":"#000000","labelBoxBorderColor":"#000000","labelBoxBkgColor":"#93c5fd","background":"#ffffff"},"sequence":{"actorFontSize":18,"messageFontSize":16,"noteFontSize":14,"mirrorActors":false}}}%%
    sequenceDiagram
        actor P0 as User
        participant P1 as :MobileApp
        participant P2 as :PickupController
        participant P3 as :StationIoTDock
        participant P4 as <<datastore>> Database
    activate P0
    P0->>P1: 1: scan QR code at vehicle dock
    activate P1
    Note left of P0: {a}
    P1->>P2: 1.1: submit pickup request
    activate P2
    P2->>P4: 1.2: validate reservation ticket
    activate P4
    P4-->>P2: 1.3: reservation verified
    deactivate P4
    P2->>P3: 1.4: send unlock command
    activate P3
    P3->>P3: 1.5: release physical lock mechanism
    activate P3
    deactivate P3
    P3-->>P2: 1.6: dock unlocked & vehicle released
    deactivate P3
    P2->>P4: 1.7: update vehicle state to 'In-Use'
    activate P4
    P4-->>P2: 1.8: trip record initiated
    deactivate P4
    P2-->>P1: 1.9: confirm unlock & start trip timer
    deactivate P2
    P1-->>P0: 1.10: display trip active & safety tips
    Note left of P0: {b}
    deactivate P0
    deactivate P1
    Note left of P0: {b - a < 8 sec} (scenario assumption)
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
hide footbox
skinparam backgroundColor #ffffff
skinparam defaultFontName Segoe UI
skinparam defaultFontColor #000000
skinparam defaultFontSize 16
skinparam sequence {
  ParticipantBorderColor #000000
  ParticipantFontColor #000000
  ParticipantFontSize 18
  ActorBorderColor #000000
  ActorFontColor #000000
  ActorFontSize 18
  LifeLineBorderColor #000000
}
skinparam ArrowFontColor #000000
skinparam ArrowFontSize 16
skinparam noteFontColor #000000
skinparam noteFontSize 14
skinparam noteBorderColor #000000
skinparam noteBackgroundColor #fcd34d
skinparam titleFontColor #000000
skinparam titleFontSize 22
actor "User" as P0 #d8b4fe
participant ":StationIoTDock" as P1 #fda4af
participant ":ReturnController" as P2 #86efac
participant ":TelemetryService" as P3 #d8b4fe
participant "<<datastore>> Database" as P4 #fcd34d
participant ":MobileApp" as P5 #93c5fd
activate P0 #d8b4fe
P0->P1: 1: insert vehicle into dock & latch
activate P1 #fda4af
note left of P0: {a}
P1->P2: 1.1: report vehicle plugged in
activate P2 #86efac
P2->P3: 1.2: read odometer & battery level
activate P3 #d8b4fe
P3-->P2: 1.3: return final telemetry data
deactivate P3
P2->P4: 1.4: close trip & calculate usage fee
activate P4 #fcd34d
P4->P4: 1.5: deduct balance & generate receipt
activate P4 #fcd34d
deactivate P4
P4-->P2: 1.6: trip closed & payment confirmed
deactivate P4
P2->P1: 1.7: engage lock & flash green LED
P1-->P2: 1.8: dock locked securely
deactivate P1
P2-->P5: 1.9: send trip invoice & notification
activate P5 #93c5fd
deactivate P2
P5-->P0: 1.10: display trip summary & receipt
note left of P0: {b}
deactivate P0
deactivate P5
note left of P0: {b - a < 6 sec} (scenario assumption)
@enduml
```

### Mã Mermaid Preview
```mermaid
%%{init: {"theme":"base","fontFamily":"Segoe UI","themeVariables":{"fontSize":"16px","textColor":"#000000","primaryTextColor":"#000000","actorTextColor":"#000000","signalTextColor":"#000000","noteTextColor":"#000000","labelTextColor":"#000000","loopTextColor":"#000000","actorBkg":"#93c5fd","actorBorder":"#000000","activationBkgColor":"#86efac","activationBorderColor":"#000000","noteBkgColor":"#fcd34d","noteBorderColor":"#000000","labelBoxBorderColor":"#000000","labelBoxBkgColor":"#93c5fd","background":"#ffffff"},"sequence":{"actorFontSize":18,"messageFontSize":16,"noteFontSize":14,"mirrorActors":false}}}%%
    sequenceDiagram
        actor P0 as User
        participant P1 as :StationIoTDock
        participant P2 as :ReturnController
        participant P3 as :TelemetryService
        participant P4 as <<datastore>> Database
        participant P5 as :MobileApp
    activate P0
    P0->>P1: 1: insert vehicle into dock & latch
    activate P1
    Note left of P0: {a}
    P1->>P2: 1.1: report vehicle plugged in
    activate P2
    P2->>P3: 1.2: read odometer & battery level
    activate P3
    P3-->>P2: 1.3: return final telemetry data
    deactivate P3
    P2->>P4: 1.4: close trip & calculate usage fee
    activate P4
    P4->>P4: 1.5: deduct balance & generate receipt
    activate P4
    deactivate P4
    P4-->>P2: 1.6: trip closed & payment confirmed
    deactivate P4
    P2->>P1: 1.7: engage lock & flash green LED
    P1-->>P2: 1.8: dock locked securely
    deactivate P1
    P2-->>P5: 1.9: send trip invoice & notification
    activate P5
    deactivate P2
    P5-->>P0: 1.10: display trip summary & receipt
    Note left of P0: {b}
    deactivate P0
    deactivate P5
    Note left of P0: {b - a < 6 sec} (scenario assumption)
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
hide footbox
skinparam backgroundColor #ffffff
skinparam defaultFontName Segoe UI
skinparam defaultFontColor #000000
skinparam defaultFontSize 16
skinparam sequence {
  ParticipantBorderColor #000000
  ParticipantFontColor #000000
  ParticipantFontSize 18
  ActorBorderColor #000000
  ActorFontColor #000000
  ActorFontSize 18
  LifeLineBorderColor #000000
}
skinparam ArrowFontColor #000000
skinparam ArrowFontSize 16
skinparam noteFontColor #000000
skinparam noteFontSize 14
skinparam noteBorderColor #000000
skinparam noteBackgroundColor #fcd34d
skinparam titleFontColor #000000
skinparam titleFontSize 22
actor "User" as P0 #d8b4fe
participant ":MobileApp" as P1 #93c5fd
participant ":ChargingController" as P2 #86efac
participant ":SmartChargerIoT" as P3 #fda4af
participant "<<datastore>> Database" as P4 #fcd34d
activate P0 #d8b4fe
P0->P1: 1: select charging slot & power tier
activate P1 #93c5fd
note left of P0: {a}
P1->P2: 1.1: submit charging session request
activate P2 #86efac
P2->P4: 1.2: verify student wallet & subscription
activate P4 #fcd34d
P4-->P2: 1.3: account verified
deactivate P4
P2->P3: 1.4: check charger port status & grid load
activate P3 #fda4af
P3-->P2: 1.5: port ready & power allocated
deactivate P3
P2->P3: 1.6: activate charging port & energize cable
activate P3 #fda4af
P3-->P2: 1.7: charging power delivered
deactivate P3
P2->P4: 1.8: create charging session record
activate P4 #fcd34d
P4-->P2: 1.9: session record saved
deactivate P4
P2-->P1: 1.10: notify charging started & live power feed
deactivate P2
P1-->P0: 1.11: display charging progress & energy delivered
note left of P0: {b}
deactivate P0
deactivate P1
note left of P0: {b - a < 7 sec} (scenario assumption)
@enduml
```

### Mã Mermaid Preview
```mermaid
%%{init: {"theme":"base","fontFamily":"Segoe UI","themeVariables":{"fontSize":"16px","textColor":"#000000","primaryTextColor":"#000000","actorTextColor":"#000000","signalTextColor":"#000000","noteTextColor":"#000000","labelTextColor":"#000000","loopTextColor":"#000000","actorBkg":"#93c5fd","actorBorder":"#000000","activationBkgColor":"#86efac","activationBorderColor":"#000000","noteBkgColor":"#fcd34d","noteBorderColor":"#000000","labelBoxBorderColor":"#000000","labelBoxBkgColor":"#93c5fd","background":"#ffffff"},"sequence":{"actorFontSize":18,"messageFontSize":16,"noteFontSize":14,"mirrorActors":false}}}%%
    sequenceDiagram
        actor P0 as User
        participant P1 as :MobileApp
        participant P2 as :ChargingController
        participant P3 as :SmartChargerIoT
        participant P4 as <<datastore>> Database
    activate P0
    P0->>P1: 1: select charging slot & power tier
    activate P1
    Note left of P0: {a}
    P1->>P2: 1.1: submit charging session request
    activate P2
    P2->>P4: 1.2: verify student wallet & subscription
    activate P4
    P4-->>P2: 1.3: account verified
    deactivate P4
    P2->>P3: 1.4: check charger port status & grid load
    activate P3
    P3-->>P2: 1.5: port ready & power allocated
    deactivate P3
    P2->>P3: 1.6: activate charging port & energize cable
    activate P3
    P3-->>P2: 1.7: charging power delivered
    deactivate P3
    P2->>P4: 1.8: create charging session record
    activate P4
    P4-->>P2: 1.9: session record saved
    deactivate P4
    P2-->>P1: 1.10: notify charging started & live power feed
    deactivate P2
    P1-->>P0: 1.11: display charging progress & energy delivered
    Note left of P0: {b}
    deactivate P0
    deactivate P1
    Note left of P0: {b - a < 7 sec} (scenario assumption)
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
hide footbox
skinparam backgroundColor #ffffff
skinparam defaultFontName Segoe UI
skinparam defaultFontColor #000000
skinparam defaultFontSize 16
skinparam sequence {
  ParticipantBorderColor #000000
  ParticipantFontColor #000000
  ParticipantFontSize 18
  ActorBorderColor #000000
  ActorFontColor #000000
  ActorFontSize 18
  LifeLineBorderColor #000000
}
skinparam ArrowFontColor #000000
skinparam ArrowFontSize 16
skinparam noteFontColor #000000
skinparam noteFontSize 14
skinparam noteBorderColor #000000
skinparam noteBackgroundColor #fcd34d
skinparam titleFontColor #000000
skinparam titleFontSize 22
actor "Operator" as P0 #d8b4fe
participant ":OperatorDashboard" as P1 #93c5fd
participant ":RebalanceController" as P2 #86efac
participant ":OptimizationEngine" as P3 #d8b4fe
participant "<<datastore>> Database" as P4 #fcd34d
participant ":FieldStaffApp" as P5 #fda4af
activate P0 #d8b4fe
P0->P1: 1: trigger rebalance analysis
activate P1 #93c5fd
note left of P0: {a}
P1->P2: 1.1: request fleet distribution report
activate P2 #86efac
P2->P4: 1.2: fetch hub inventory & demand forecast
activate P4 #fcd34d
P4-->P2: 1.3: return surplus & shortage data
deactivate P4
P2->P3: 1.4: compute optimal transfer routes
activate P3 #d8b4fe
P3-->P2: 1.5: return dispatch plan
deactivate P3
P2->P4: 1.6: save dispatch orders & reserve transit slots
activate P4 #fcd34d
P4-->P2: 1.7: dispatch orders confirmed
deactivate P4
P2->P5: 1.8: assign transfer missions to drivers
activate P5 #fda4af
P5-->P2: 1.9: acknowledge mission receipt
deactivate P5
P2-->P1: 1.10: return active dispatch plan & live tracking
deactivate P2
P1-->P0: 1.11: display transfer missions & ETA on map
note left of P0: {b}
deactivate P0
deactivate P1
note left of P0: {b - a < 10 sec} (scenario assumption)
@enduml
```

### Mã Mermaid Preview
```mermaid
%%{init: {"theme":"base","fontFamily":"Segoe UI","themeVariables":{"fontSize":"16px","textColor":"#000000","primaryTextColor":"#000000","actorTextColor":"#000000","signalTextColor":"#000000","noteTextColor":"#000000","labelTextColor":"#000000","loopTextColor":"#000000","actorBkg":"#93c5fd","actorBorder":"#000000","activationBkgColor":"#86efac","activationBorderColor":"#000000","noteBkgColor":"#fcd34d","noteBorderColor":"#000000","labelBoxBorderColor":"#000000","labelBoxBkgColor":"#93c5fd","background":"#ffffff"},"sequence":{"actorFontSize":18,"messageFontSize":16,"noteFontSize":14,"mirrorActors":false}}}%%
    sequenceDiagram
        actor P0 as Operator
        participant P1 as :OperatorDashboard
        participant P2 as :RebalanceController
        participant P3 as :OptimizationEngine
        participant P4 as <<datastore>> Database
        participant P5 as :FieldStaffApp
    activate P0
    P0->>P1: 1: trigger rebalance analysis
    activate P1
    Note left of P0: {a}
    P1->>P2: 1.1: request fleet distribution report
    activate P2
    P2->>P4: 1.2: fetch hub inventory & demand forecast
    activate P4
    P4-->>P2: 1.3: return surplus & shortage data
    deactivate P4
    P2->>P3: 1.4: compute optimal transfer routes
    activate P3
    P3-->>P2: 1.5: return dispatch plan
    deactivate P3
    P2->>P4: 1.6: save dispatch orders & reserve transit slots
    activate P4
    P4-->>P2: 1.7: dispatch orders confirmed
    deactivate P4
    P2->>P5: 1.8: assign transfer missions to drivers
    activate P5
    P5-->>P2: 1.9: acknowledge mission receipt
    deactivate P5
    P2-->>P1: 1.10: return active dispatch plan & live tracking
    deactivate P2
    P1-->>P0: 1.11: display transfer missions & ETA on map
    Note left of P0: {b}
    deactivate P0
    deactivate P1
    Note left of P0: {b - a < 10 sec} (scenario assumption)
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
hide footbox
skinparam backgroundColor #ffffff
skinparam defaultFontName Segoe UI
skinparam defaultFontColor #000000
skinparam defaultFontSize 16
skinparam sequence {
  ParticipantBorderColor #000000
  ParticipantFontColor #000000
  ParticipantFontSize 18
  ActorBorderColor #000000
  ActorFontColor #000000
  ActorFontSize 18
  LifeLineBorderColor #000000
}
skinparam ArrowFontColor #000000
skinparam ArrowFontSize 16
skinparam noteFontColor #000000
skinparam noteFontSize 14
skinparam noteBorderColor #000000
skinparam noteBackgroundColor #fcd34d
skinparam titleFontColor #000000
skinparam titleFontSize 22
actor "Technician" as P0 #d8b4fe
participant ":MonitoringDashboard" as P1 #93c5fd
participant ":IncidentController" as P2 #86efac
participant ":StationIoTDock" as P3 #fda4af
participant "<<datastore>> Database" as P4 #fcd34d
activate P0 #d8b4fe
P0->P1: 1: report dock hardware malfunction
activate P1 #93c5fd
note left of P0: {a}
P1->P2: 1.1: submit incident report & dock ID
activate P2 #86efac
P2->P3: 1.2: send emergency disable command
activate P3 #fda4af
P3->P3: 1.3: de-energize port & engage safety lock
activate P3 #fda4af
deactivate P3
P3-->P2: 1.4: dock isolated & safety lock engaged
deactivate P3
P2->P4: 1.5: update dock state to 'Under Maintenance'
activate P4 #fcd34d
P4->P4: 1.6: reroute incoming reservations to adjacent docks
activate P4 #fcd34d
deactivate P4
P4-->P2: 1.7: reroute complete & incident ticket logged
deactivate P4
P2-->P1: 1.8: confirm dock isolation & issue repair ticket
deactivate P2
P1-->P0: 1.9: display maintenance ticket #INC-892
note left of P0: {b}
deactivate P0
deactivate P1
note left of P0: {b - a < 5 sec} (scenario assumption)
@enduml
```

### Mã Mermaid Preview
```mermaid
%%{init: {"theme":"base","fontFamily":"Segoe UI","themeVariables":{"fontSize":"16px","textColor":"#000000","primaryTextColor":"#000000","actorTextColor":"#000000","signalTextColor":"#000000","noteTextColor":"#000000","labelTextColor":"#000000","loopTextColor":"#000000","actorBkg":"#93c5fd","actorBorder":"#000000","activationBkgColor":"#86efac","activationBorderColor":"#000000","noteBkgColor":"#fcd34d","noteBorderColor":"#000000","labelBoxBorderColor":"#000000","labelBoxBkgColor":"#93c5fd","background":"#ffffff"},"sequence":{"actorFontSize":18,"messageFontSize":16,"noteFontSize":14,"mirrorActors":false}}}%%
    sequenceDiagram
        actor P0 as Technician
        participant P1 as :MonitoringDashboard
        participant P2 as :IncidentController
        participant P3 as :StationIoTDock
        participant P4 as <<datastore>> Database
    activate P0
    P0->>P1: 1: report dock hardware malfunction
    activate P1
    Note left of P0: {a}
    P1->>P2: 1.1: submit incident report & dock ID
    activate P2
    P2->>P3: 1.2: send emergency disable command
    activate P3
    P3->>P3: 1.3: de-energize port & engage safety lock
    activate P3
    deactivate P3
    P3-->>P2: 1.4: dock isolated & safety lock engaged
    deactivate P3
    P2->>P4: 1.5: update dock state to 'Under Maintenance'
    activate P4
    P4->>P4: 1.6: reroute incoming reservations to adjacent docks
    activate P4
    deactivate P4
    P4-->>P2: 1.7: reroute complete & incident ticket logged
    deactivate P4
    P2-->>P1: 1.8: confirm dock isolation & issue repair ticket
    deactivate P2
    P1-->>P0: 1.9: display maintenance ticket #INC-892
    Note left of P0: {b}
    deactivate P0
    deactivate P1
    Note left of P0: {b - a < 5 sec} (scenario assumption)
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
hide footbox
skinparam backgroundColor #ffffff
skinparam defaultFontName Segoe UI
skinparam defaultFontColor #000000
skinparam defaultFontSize 16
skinparam sequence {
  ParticipantBorderColor #000000
  ParticipantFontColor #000000
  ParticipantFontSize 18
  ActorBorderColor #000000
  ActorFontColor #000000
  ActorFontSize 18
  LifeLineBorderColor #000000
}
skinparam ArrowFontColor #000000
skinparam ArrowFontSize 16
skinparam noteFontColor #000000
skinparam noteFontSize 14
skinparam noteBorderColor #000000
skinparam noteBackgroundColor #fcd34d
skinparam titleFontColor #000000
skinparam titleFontSize 22
actor "Planner" as P0 #d8b4fe
participant ":SimulationWebUI" as P1 #93c5fd
participant ":SimulationController" as P2 #86efac
participant ":SimulationEngine" as P3 #d8b4fe
participant "<<datastore>> Database" as P4 #fcd34d
activate P0 #d8b4fe
P0->P1: 1: select scenario (Metro Surge + Charger Failure)
activate P1 #93c5fd
note left of P0: {a}
P1->P2: 1.1: submit simulation parameters & duration
activate P2 #86efac
P2->P4: 1.2: load historical trip & charging data
activate P4 #fcd34d
P4-->P2: 1.3: historical dataset loaded (50,000 trips)
deactivate P4
P2->P3: 1.4: execute Monte Carlo simulation run
activate P3 #d8b4fe
P3->P3: 1.5: model vehicle depletion & grid peak demand
activate P3 #d8b4fe
deactivate P3
P3-->P2: 1.6: return simulation results & bottlenecks
deactivate P3
P2->P4: 1.7: save simulation run & AI recommendations
activate P4 #fcd34d
P4-->P2: 1.8: run record saved
deactivate P4
P2-->P1: 1.9: render comparative charts & recommendations
deactivate P2
P1-->P0: 1.10: display bottleneck heatmaps & fleet buffer advice
note left of P0: {b}
deactivate P0
deactivate P1
note left of P0: {b - a < 15 sec} (scenario assumption)
@enduml
```

### Mã Mermaid Preview
```mermaid
%%{init: {"theme":"base","fontFamily":"Segoe UI","themeVariables":{"fontSize":"16px","textColor":"#000000","primaryTextColor":"#000000","actorTextColor":"#000000","signalTextColor":"#000000","noteTextColor":"#000000","labelTextColor":"#000000","loopTextColor":"#000000","actorBkg":"#93c5fd","actorBorder":"#000000","activationBkgColor":"#86efac","activationBorderColor":"#000000","noteBkgColor":"#fcd34d","noteBorderColor":"#000000","labelBoxBorderColor":"#000000","labelBoxBkgColor":"#93c5fd","background":"#ffffff"},"sequence":{"actorFontSize":18,"messageFontSize":16,"noteFontSize":14,"mirrorActors":false}}}%%
    sequenceDiagram
        actor P0 as Planner
        participant P1 as :SimulationWebUI
        participant P2 as :SimulationController
        participant P3 as :SimulationEngine
        participant P4 as <<datastore>> Database
    activate P0
    P0->>P1: 1: select scenario (Metro Surge + Charger Failure)
    activate P1
    Note left of P0: {a}
    P1->>P2: 1.1: submit simulation parameters & duration
    activate P2
    P2->>P4: 1.2: load historical trip & charging data
    activate P4
    P4-->>P2: 1.3: historical dataset loaded (50,000 trips)
    deactivate P4
    P2->>P3: 1.4: execute Monte Carlo simulation run
    activate P3
    P3->>P3: 1.5: model vehicle depletion & grid peak demand
    activate P3
    deactivate P3
    P3-->>P2: 1.6: return simulation results & bottlenecks
    deactivate P3
    P2->>P4: 1.7: save simulation run & AI recommendations
    activate P4
    P4-->>P2: 1.8: run record saved
    deactivate P4
    P2-->>P1: 1.9: render comparative charts & recommendations
    deactivate P2
    P1-->>P0: 1.10: display bottleneck heatmaps & fleet buffer advice
    Note left of P0: {b}
    deactivate P0
    deactivate P1
    Note left of P0: {b - a < 15 sec} (scenario assumption)
```
