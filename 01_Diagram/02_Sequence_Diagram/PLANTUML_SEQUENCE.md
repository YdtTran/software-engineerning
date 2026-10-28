# TỔNG HỢP MÃ NGUỒN PLANTUML & MERMAID SƠ ĐỒ TUẦN TỰ (SEQUENCE DIAGRAM)
> **Chuẩn mực bài giảng (Supreme Law):** Môn **Software Engineering (CO3001) - ĐHQG-HCM** & **Ian Sommerville (10th Ed) Ch6 p.21-26, 40, 50**.
> Định dạng chuẩn: Actor stickman, Lifelines (`:ClassName`, `name:ClassName`, `<<datastore>>`), đánh số thứ tự phân cấp (`1:`, `1.1:`, `1.2:`), Guard condition `[guard]`, Request (`->`), Response (`-->`), Self-call (`Validate()`) và khung `alt`.

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
- **File Draw.io:** `01_Diagram/02_Sequence_Diagram/SQ01-Reserve_Vehicle.drawio.svg`

### Mã PlantUML
```plantuml
@startuml
skinparam responseMessageBelowArrow true
autonumber "1:"
actor ":Student" as User
participant ":MobileApp" as UI
participant ":ReservationController" as Ctrl
participant ":VehicleService" as Svc
database "<<datastore>>\n:Database" as DB

User -> UI: selectVehicle(vehicleId)
activate UI
UI -> Ctrl: requestReservation(userId, vehicleId)
activate Ctrl
Ctrl -> Svc: checkAvailabilityAndLock(vehicleId)
activate Svc

Svc -> Svc: validateBatteryLevel()
activate Svc
deactivate Svc

alt Xe còn trống & Pin >= 20%
    Svc -> DB: saveReservation(userId, vehicleId, 15_MIN)
    activate DB
    DB --> Svc: reservationSaved(resId, qrCode)
    deactivate DB
    Svc --> Ctrl: return reservationSuccess(ticket)
    Ctrl --> UI: displayReservationTicket(timer 15:00)
    UI --> User: showActiveTicketScreen()
else Xe đã được giữ hoặc Pin < 20%
    Svc --> Ctrl: return error(VEHICLE_UNAVAILABLE)
    deactivate Svc
    Ctrl --> UI: displayErrorNotification("Xe không khả dụng")
    deactivate Ctrl
    UI --> User: showRetryOrSuggestOtherVehicles()
    deactivate UI
end
@enduml
```

### Mã Mermaid Preview
```mermaid
sequenceDiagram
    autonumber
    actor User as :Student
    participant UI as :MobileApp
    participant Ctrl as :ReservationController
    participant Svc as :VehicleService
    participant DB as <<datastore>><br/>:Database

    User->>UI: selectVehicle(vehicleId)
    activate UI
    UI->>Ctrl: requestReservation(userId, vehicleId)
    activate Ctrl
    Ctrl->>Svc: checkAvailabilityAndLock(vehicleId)
    activate Svc
    Svc->>Svc: validateBatteryLevel()
    alt Xe còn trống & Pin >= 20%
        Svc->>DB: saveReservation(userId, vehicleId, 15_MIN)
        activate DB
        DB-->>Svc: reservationSaved(resId, qrCode)
        deactivate DB
        Svc-->>Ctrl: return reservationSuccess(ticket)
        Ctrl-->>UI: displayReservationTicket(timer 15:00)
        UI-->>User: showActiveTicketScreen()
    else Xe không khả dụng
        Svc-->>Ctrl: return error(VEHICLE_UNAVAILABLE)
        deactivate Svc
        Ctrl-->>UI: displayErrorNotification("Xe không khả dụng")
        deactivate Ctrl
        UI-->>User: showRetryOrSuggestOtherVehicles()
        deactivate UI
    end
```

---

## SQ02: Pick Up Vehicle
- **Tương ứng Use Case:** `UC04 - Pick Up Vehicle`
- **File Draw.io:** `01_Diagram/02_Sequence_Diagram/SQ02-Pick_Up_Vehicle.drawio.svg`

### Mã PlantUML
```plantuml
@startuml
skinparam responseMessageBelowArrow true
autonumber "1:"
actor ":Student" as User
participant ":MobileApp" as UI
participant ":PickupController" as Ctrl
participant ":IoTStation" as IoT
database "<<datastore>>\n:Database" as DB

User -> UI: scanQRCode(qrData) / enterCode()
activate UI
UI -> Ctrl: validatePickup(userId, vehicleId)
activate Ctrl
Ctrl -> DB: verifyReservationTicket(userId, vehicleId)
activate DB
DB --> Ctrl: ticketStatus(VALID, within 15 mins)
deactivate DB

alt Phiếu hợp lệ & Khớp vị trí trạm
    Ctrl -> IoT: sendUnlockCommand(slotId, vehicleId)
    activate IoT
    IoT --> Ctrl: unlockConfirmed(electronicPinReleased)
    deactivate IoT
    Ctrl -> DB: updateVehicleStatus(IN_USE) & startTrip()
    activate DB
    DB --> Ctrl: tripStarted(tripId, startTime)
    deactivate DB
    Ctrl --> UI: return pickupSuccess(tripId)
    UI --> User: displayActiveTripScreen(liveTimer)
else Sai mã hoặc Hết hạn 15 phút
    Ctrl --> UI: return pickupFailed(EXPIRED_OR_INVALID)
    UI --> User: displayErrorAndRetryCounter()
end
deactivate Ctrl
deactivate UI
@enduml
```

### Mã Mermaid Preview
```mermaid
sequenceDiagram
    autonumber
    actor User as :Student
    participant UI as :MobileApp
    participant Ctrl as :PickupController
    participant IoT as :IoTStation
    participant DB as <<datastore>><br/>:Database

    User->>UI: scanQRCode(qrData) / enterCode()
    activate UI
    UI->>Ctrl: validatePickup(userId, vehicleId)
    activate Ctrl
    Ctrl->>DB: verifyReservationTicket(userId, vehicleId)
    activate DB
    DB-->>Ctrl: ticketStatus(VALID, within 15 mins)
    deactivate DB
    alt Phiếu hợp lệ
        Ctrl->>IoT: sendUnlockCommand(slotId, vehicleId)
        activate IoT
        IoT-->>Ctrl: unlockConfirmed(electronicPinReleased)
        deactivate IoT
        Ctrl->>DB: updateVehicleStatus(IN_USE) & startTrip()
        activate DB
        DB-->>Ctrl: tripStarted(tripId, startTime)
        deactivate DB
        Ctrl-->>UI: return pickupSuccess(tripId)
        UI-->>User: displayActiveTripScreen(liveTimer)
    else Quá hạn hoặc Sai mã
        Ctrl-->>UI: return pickupFailed(EXPIRED_OR_INVALID)
        UI-->>User: displayErrorAndRetryCounter()
    end
    deactivate Ctrl
    deactivate UI
```

---

## SQ03: Return Vehicle
- **Tương ứng Use Case:** `UC05 - Return Vehicle`
- **File Draw.io:** `01_Diagram/02_Sequence_Diagram/SQ03-Return_Vehicle.drawio.svg`

### Mã PlantUML
```plantuml
@startuml
skinparam responseMessageBelowArrow true
autonumber "1:"
actor ":Student" as User
participant ":MobileApp" as UI
participant ":ReturnController" as Ctrl
participant ":TripService" as Svc
participant ":IoTStation" as IoT
database "<<datastore>>\n:Database" as DB

User -> IoT: dockVehicleIntoSlot(slotId)
activate IoT
IoT -> Svc: notifyPhysicalDocked(slotId, vehicleId, batteryLevel)
activate Svc
deactivate IoT

User -> UI: confirmReturnClicked()
activate UI
UI -> Ctrl: processReturn(tripId, destHubId, slotId)
activate Ctrl
Ctrl -> IoT: verifyLockerStatus(slotId)
activate IoT
IoT --> Ctrl: lockConfirmed(pinLocked = TRUE)
deactivate IoT

Ctrl -> Svc: calculateFareAndSettle(tripId, finalBattery)
Svc -> DB: closeTripRecord(endTime, fare, finalBattery)
activate DB
DB --> Svc: tripClosedSuccess()
deactivate DB

Svc -> DB: updateVehicleStatus(Available / Needs_Charging)
activate DB
DB --> Svc: statusUpdated()
deactivate DB

Svc --> Ctrl: return receiptData(fare, duration, distance)
Ctrl --> UI: return returnSummary(receiptData)
deactivate Ctrl
UI --> User: displayInvoiceAndCompleteTrip()
deactivate UI
deactivate Svc
@enduml
```

### Mã Mermaid Preview
```mermaid
sequenceDiagram
    autonumber
    actor User as :Student
    participant UI as :MobileApp
    participant Ctrl as :ReturnController
    participant Svc as :TripService
    participant IoT as :IoTStation
    participant DB as <<datastore>><br/>:Database

    User->>IoT: dockVehicleIntoSlot(slotId)
    activate IoT
    IoT->>Svc: notifyPhysicalDocked(slotId, vehicleId, batteryLevel)
    activate Svc
    deactivate IoT
    User->>UI: confirmReturnClicked()
    activate UI
    UI->>Ctrl: processReturn(tripId, destHubId, slotId)
    activate Ctrl
    Ctrl->>IoT: verifyLockerStatus(slotId)
    activate IoT
    IoT-->>Ctrl: lockConfirmed(pinLocked = TRUE)
    deactivate IoT
    Ctrl->>Svc: calculateFareAndSettle(tripId, finalBattery)
    Svc->>DB: closeTripRecord(endTime, fare, finalBattery)
    activate DB
    DB-->>Svc: tripClosedSuccess()
    deactivate DB
    Svc->>DB: updateVehicleStatus(Available / Needs_Charging)
    activate DB
    DB-->>Svc: statusUpdated()
    deactivate DB
    Svc-->>Ctrl: return receiptData(fare, duration, distance)
    Ctrl-->>UI: return returnSummary(receiptData)
    deactivate Ctrl
    UI-->>User: displayInvoiceAndCompleteTrip()
    deactivate UI
    deactivate Svc
```

---

## SQ04: Request Charging
- **Tương ứng Use Case:** `UC07 - Request Charging`
- **File Draw.io:** `01_Diagram/02_Sequence_Diagram/SQ04-Request_Charging.drawio.svg`

### Mã PlantUML
```plantuml
@startuml
skinparam responseMessageBelowArrow true
autonumber "1:"
actor ":Student" as User
participant ":MobileApp" as UI
participant ":ChargingController" as Ctrl
participant ":ChargingService" as Svc
participant ":PowerHubIoT" as IoT
database "<<datastore>>\n:Database" as DB

User -> UI: submitChargingRequest(hubId, currBattery, targetBattery, pickupTime)
activate UI
UI -> Ctrl: scheduleChargingSession(userId, hubId, params)
activate Ctrl
Ctrl -> Svc: evaluatePortAvailability(hubId)
activate Svc
Svc --> Ctrl: portAssigned(portId, maxKW = 7.4)

Ctrl -> DB: createChargingSessionRecord(userId, portId, params)
activate DB
DB --> Ctrl: sessionSaved(sessionId)
deactivate DB

Ctrl -> IoT: activatePowerRelay(portId)
activate IoT
IoT --> Ctrl: relayActive(currentFlowing = TRUE)
deactivate IoT

Ctrl --> UI: return chargingConfirmed(portId, sessionId)
deactivate Svc
deactivate Ctrl
UI --> User: displayPlugInInstructions(portId, estimatedFull)
deactivate UI
@enduml
```

### Mã Mermaid Preview
```mermaid
sequenceDiagram
    autonumber
    actor User as :Student
    participant UI as :MobileApp
    participant Ctrl as :ChargingController
    participant Svc as :ChargingService
    participant IoT as :PowerHubIoT
    participant DB as <<datastore>><br/>:Database

    User->>UI: submitChargingRequest(hubId, currBattery, targetBattery, pickupTime)
    activate UI
    UI->>Ctrl: scheduleChargingSession(userId, hubId, params)
    activate Ctrl
    Ctrl->>Svc: evaluatePortAvailability(hubId)
    activate Svc
    Svc-->>Ctrl: portAssigned(portId, maxKW = 7.4)
    Ctrl->>DB: createChargingSessionRecord(userId, portId, params)
    activate DB
    DB-->>Ctrl: sessionSaved(sessionId)
    deactivate DB
    Ctrl->>IoT: activatePowerRelay(portId)
    activate IoT
    IoT-->>Ctrl: relayActive(currentFlowing = TRUE)
    deactivate IoT
    Ctrl-->>UI: return chargingConfirmed(portId, sessionId)
    deactivate Svc
    deactivate Ctrl
    UI-->>User: displayPlugInInstructions(portId, estimatedFull)
    deactivate UI
```

---

## SQ05: Redistribute Vehicles
- **Tương ứng Use Case:** `UC10 - Redistribute Vehicles`
- **File Draw.io:** `01_Diagram/02_Sequence_Diagram/SQ05-Redistribute_Vehicles.drawio.svg`

### Mã PlantUML
```plantuml
@startuml
skinparam responseMessageBelowArrow true
autonumber "1:"
actor ":Operator" as Admin
participant ":WebDashboard" as UI
participant ":DispatchController" as Ctrl
participant ":RebalanceService" as Svc
database "<<datastore>>\n:Database" as DB
participant ":FieldDriverApp" as DriverApp

Admin -> UI: createTransferOrder(srcHub, dstHub, qty=20)
activate UI
UI -> Ctrl: validateAndPlanTransfer(srcHub, dstHub, qty)
activate Ctrl
Ctrl -> Svc: queryEligibleVehicles(srcHub, minBattery=80%)
activate Svc
Svc -> DB: getAvailableVehicles(srcHub, battery >= 80%)
activate DB
DB --> Svc: return vehicleList(qty = 20)
deactivate DB

Svc -> DB: checkDestinationCapacity(dstHub)
activate DB
DB --> Svc: return freeDocks(docks >= 20)
deactivate DB

Svc -> DB: lockVehiclesToStatus(IN_TRANSIT, vehicleIds)
activate DB
DB --> Svc: lockedSuccess()
deactivate DB

Svc -> DriverApp: dispatchOrderToDriver(orderId, route, vehicleIds)
activate DriverApp
DriverApp --> Svc: driverAcknowledge(accepted = TRUE)
deactivate DriverApp

Svc --> Ctrl: orderCreatedSuccess(orderId)
deactivate Svc
Ctrl --> UI: return transferManifest(orderId, ETA)
deactivate Ctrl
UI --> Admin: displayLiveTransferTracking()
deactivate UI
@enduml
```

### Mã Mermaid Preview
```mermaid
sequenceDiagram
    autonumber
    actor Admin as :Operator
    participant UI as :WebDashboard
    participant Ctrl as :DispatchController
    participant Svc as :RebalanceService
    participant DB as <<datastore>><br/>:Database
    participant DriverApp as :FieldDriverApp

    Admin->>UI: createTransferOrder(srcHub, dstHub, qty=20)
    activate UI
    UI->>Ctrl: validateAndPlanTransfer(srcHub, dstHub, qty)
    activate Ctrl
    Ctrl->>Svc: queryEligibleVehicles(srcHub, minBattery=80%)
    activate Svc
    Svc->>DB: getAvailableVehicles(srcHub, battery >= 80%)
    activate DB
    DB-->>Svc: return vehicleList(qty = 20)
    deactivate DB
    Svc->>DB: checkDestinationCapacity(dstHub)
    activate DB
    DB-->>Svc: return freeDocks(docks >= 20)
    deactivate DB
    Svc->>DB: lockVehiclesToStatus(IN_TRANSIT, vehicleIds)
    activate DB
    DB-->>Svc: lockedSuccess()
    deactivate DB
    Svc->>DriverApp: dispatchOrderToDriver(orderId, route, vehicleIds)
    activate DriverApp
    DriverApp-->>Svc: driverAcknowledge(accepted = TRUE)
    deactivate DriverApp
    Svc-->>Ctrl: orderCreatedSuccess(orderId)
    deactivate Svc
    Ctrl-->>UI: return transferManifest(orderId, ETA)
    deactivate Ctrl
    UI-->>Admin: displayLiveTransferTracking()
    deactivate UI
```

---

## SQ06: Handle Operational Incident
- **Tương ứng Use Case:** `UC11 - Handle Operational Incident`
- **File Draw.io:** `01_Diagram/02_Sequence_Diagram/SQ06-Handle_Operational_Incident.drawio.svg`

### Mã PlantUML
```plantuml
@startuml
skinparam responseMessageBelowArrow true
autonumber "1:"
actor ":Operator" as Admin
participant ":WebDashboard" as UI
participant ":IncidentController" as Ctrl
participant ":IoTStation" as IoT
database "<<datastore>>\n:Database" as DB

Admin -> UI: selectIncident(incidentId)
activate UI
UI -> Ctrl: getIncidentDetails(incidentId)
activate Ctrl
Ctrl -> DB: queryTelemetryLog(incidentId)
activate DB
DB --> Ctrl: incidentData(faultyPortId, severity=CRITICAL)
deactivate DB
Ctrl --> UI: displayImpactReport(nearbyHubs, affectedUsers)

Admin -> UI: confirmIsolateAndMaintenance()
UI -> Ctrl: executeIsolation(faultyPortId)
Ctrl -> IoT: sendEmergencyPowerCut(faultyPortId)
activate IoT
IoT --> Ctrl: powerCutConfirmed(relayOpened = TRUE)
deactivate IoT

Ctrl -> DB: updateStatus(OUT_OF_ORDER) & createTicket()
activate DB
DB --> Ctrl: ticketCreated(ticketId, techAssigned)
deactivate DB

Ctrl --> UI: return isolationSuccess(ticketId)
deactivate Ctrl
UI --> Admin: displayIncidentResolvedNotification()
deactivate UI
@enduml
```

### Mã Mermaid Preview
```mermaid
sequenceDiagram
    autonumber
    actor Admin as :Operator
    participant UI as :WebDashboard
    participant Ctrl as :IncidentController
    participant IoT as :IoTStation
    participant DB as <<datastore>><br/>:Database

    Admin->>UI: selectIncident(incidentId)
    activate UI
    UI->>Ctrl: getIncidentDetails(incidentId)
    activate Ctrl
    Ctrl->>DB: queryTelemetryLog(incidentId)
    activate DB
    DB-->>Ctrl: incidentData(faultyPortId, severity=CRITICAL)
    deactivate DB
    Ctrl-->>UI: displayImpactReport(nearbyHubs, affectedUsers)
    Admin->>UI: confirmIsolateAndMaintenance()
    UI->>Ctrl: executeIsolation(faultyPortId)
    Ctrl->>IoT: sendEmergencyPowerCut(faultyPortId)
    activate IoT
    IoT-->>Ctrl: powerCutConfirmed(relayOpened = TRUE)
    deactivate IoT
    Ctrl->>DB: updateStatus(OUT_OF_ORDER) & createTicket()
    activate DB
    DB-->>Ctrl: ticketCreated(ticketId, techAssigned)
    deactivate DB
    Ctrl-->>UI: return isolationSuccess(ticketId)
    deactivate Ctrl
    UI-->>Admin: displayIncidentResolvedNotification()
    deactivate UI
```

---

## SQ07: Run What-if Simulation
- **Tương ứng Use Case:** `UC13 - Run What-if Simulation` & `UC14 - View Simulation Results`
- **File Draw.io:** `01_Diagram/02_Sequence_Diagram/SQ07-Run_What_if_Simulation.drawio.svg`

### Mã PlantUML
```plantuml
@startuml
skinparam responseMessageBelowArrow true
autonumber "1:"
actor ":Operator" as Admin
participant ":WebDashboard" as UI
participant ":SimulationController" as Ctrl
participant ":WhatIfEngine" as Engine
database "<<datastore>>\n:NetworkCache" as Cache

Admin -> UI: selectScenario(PEAK_METRO_SURGE, +300%)
activate UI
UI -> Ctrl: runSimulation(scenarioId, params, duration=120m)
activate Ctrl
Ctrl -> Engine: initializeSandbox(params)
activate Engine
Engine -> Cache: getNetworkTopologySnapshot()
activate Cache
Cache --> Engine: snapshotData(10_Hubs, 1000_Vehicles, 200_Ports)
deactivate Cache

Engine -> Engine: executeDiscreteEventLoop(timeline)
Engine -> Engine: evaluateBottlenecksAndWaitTimes()

Engine --> Ctrl: return simulationResults(kpis, recommendations)
deactivate Engine
Ctrl --> UI: return simulationResults(kpis, recommendations)
deactivate Ctrl
UI --> Admin: displayComparativeDashboard(UC14)

Admin -> UI: applyRecommendationClicked(rebalanceOrder)
UI -> Ctrl: dispatchAutomatedRebalance(rebalanceOrder)
activate Ctrl
Ctrl --> UI: return dispatchSuccess()
deactivate Ctrl
UI --> Admin: showExecutionConfirmation()
deactivate UI
@enduml
```

### Mã Mermaid Preview
```mermaid
sequenceDiagram
    autonumber
    actor Admin as :Operator
    participant UI as :WebDashboard
    participant Ctrl as :SimulationController
    participant Engine as :WhatIfEngine
    participant Cache as <<datastore>><br/>:NetworkCache

    Admin->>UI: selectScenario(PEAK_METRO_SURGE, +300%)
    activate UI
    UI->>Ctrl: runSimulation(scenarioId, params, duration=120m)
    activate Ctrl
    Ctrl->>Engine: initializeSandbox(params)
    activate Engine
    Engine->>Cache: getNetworkTopologySnapshot()
    activate Cache
    Cache-->>Engine: snapshotData(10_Hubs, 1000_Vehicles, 200_Ports)
    deactivate Cache
    Engine->>Engine: executeDiscreteEventLoop(timeline)
    Engine->>Engine: evaluateBottlenecksAndWaitTimes()
    Engine-->>Ctrl: return simulationResults(kpis, recommendations)
    deactivate Engine
    Ctrl-->>UI: return simulationResults(kpis, recommendations)
    deactivate Ctrl
    UI-->>Admin: displayComparativeDashboard(UC14)
    Admin->>UI: applyRecommendationClicked(rebalanceOrder)
    UI->>Ctrl: dispatchAutomatedRebalance(rebalanceOrder)
    activate Ctrl
    Ctrl-->>UI: return dispatchSuccess()
    deactivate Ctrl
    UI-->>Admin: showExecutionConfirmation()
    deactivate UI
```
