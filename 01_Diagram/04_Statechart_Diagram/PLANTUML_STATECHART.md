# TỔNG HỢP MÃ NGUỒN PLANTUML & MERMAID SƠ ĐỒ TRẠNG THÁI (STATE-CHART DIAGRAM)
> **Chuẩn mực bài giảng (Supreme Law):** Môn **Software Engineering (CO3001) - ĐHQG-HCM** & **Ian Sommerville (10th Ed) Ch6 p.41-45 (Microwave Oven State Machine)**.
> Định dạng chuẩn: Khối trạng thái 2 ngăn (Tên trạng thái; Hành động nội bộ `entry /`, `do:`, `exit /`), Khung trạng thái phức hợp (**Superstate / Composite State** - Slide 43), Nhãn chuyển trạng thái chuẩn UML `event [guard] / action`.

---

## MỤC LỤC
1. [SC01: Vòng đời Phương tiện (Vehicle State Machine)](#sc01-vehicle-state-machine)
2. [SC02: Vòng đời Trụ sạc pin (Charging Point State Machine)](#sc02-charging-point-state-machine)
3. [SC03: Vòng đời Đặt giữ chỗ & Cuốc xe (Reservation & Trip State Machine)](#sc03-reservation--trip-state-machine)

---

## SC01: Vehicle State Machine
- **Ý nghĩa nghiệp vụ:** Quản lý toàn diện các trạng thái hoạt động của xe (E-Scooter / E-Bike) trong mạng lưới trạm Hub.
- **Cấu trúc Slide Ch6 p.43:** Áp dụng **Superstate `Operational Service`** bao bọc các trạng thái vận hành con (`Available`, `Reserved`, `In-Use`, `Needs Charging`, `Charging`).
- **File Draw.io:** `01_Diagram/04_Statechart_Diagram/SC01-Vehicle_State_Machine.drawio.svg`

### Mã PlantUML (Có Superstate & 2 Ngăn Hành động Nội bộ)
```plantuml
@startuml
[*] --> Available : registerVehicle

state "Operational Service" as OpService {
    state Available {
        Available : entry / turnOnBeacon()
        Available : do / listenHeartbeat()
    }
    state Reserved {
        Reserved : entry / start15MinCountdown()
        Reserved : exit / stopCountdown()
    }
    state InUse {
        InUse : entry / unlockPin()
        InUse : do / streamGPSAndBattery()
        InUse : exit / lockPin()
    }
    state NeedsCharging {
        NeedsCharging : entry / disableBooking()
        NeedsCharging : do / alertStaff()
    }
    state Charging {
        Charging : entry / connectPlug()
        Charging : do / readChargeCurrent()
        Charging : exit / disconnectPlug()
    }

    Available --> Reserved : reserveVehicle [battery >= 20%]
    Reserved --> Available : timeout / cancel [after 15 mins]
    Reserved --> InUse : unlockVehicle [code matches]
    InUse --> Available : returnVehicle [battery >= 20%]
    InUse --> NeedsCharging : returnVehicle [battery < 20%]
    NeedsCharging --> Charging : plugChargerCable
    Charging --> Available : chargeComplete [battery >= 80%]
}

state "Under Maintenance" as Maint {
    Maint : entry / createDefectTicket()
    Maint : do / runDiagnostics()
    Maint : exit / signOff()
}

state "In-Transit" as Transit {
    Transit : entry / assignTruckManifest()
    Transit : do / trackRouteGPS()
    Transit : exit / dockAtDest()
}

Available --> Maint : reportDefect / sensorFault
Maint --> Available : maintenanceComplete
Available --> Transit : dispatchRebalance
Transit --> Available : arrivedAtDestinationHub
@enduml
```

### Mã Mermaid Preview
```mermaid
stateDiagram-v2
    [*] --> Available : registerVehicle

    state "Operational Service (Superstate)" as OpService {
        Available --> Reserved : reserveVehicle [Pin >= 20%]
        Reserved --> Available : timeout / cancel [Quá 15p]
        Reserved --> InUse : unlockVehicle [Mã khớp]
        InUse --> Available : returnVehicle [Pin >= 20%]
        InUse --> NeedsCharging : returnVehicle [Pin < 20%]
        NeedsCharging --> Charging : plugChargerCable
        Charging --> Available : chargeComplete [Pin >= 80%]
    }

    Available --> UnderMaintenance : reportDefect / sensorFault
    UnderMaintenance --> Available : maintenanceComplete
    Available --> InTransit : dispatchRebalance
    InTransit --> Available : arrivedAtDestinationHub
```

---

## SC02: Charging Point State Machine
- **Ý nghĩa nghiệp vụ:** Quản lý vòng đời hoạt động, an toàn điện và tiếp nhận sạc của từng cổng sạc thông minh tại Hub.
- **Cấu trúc Slide Ch6 p.43:** Áp dụng **Superstate `Power Station Service`** bao bọc các trạng thái cấp điện (`Idle`, `Reserved`, `Charging`, `Charge Complete`).
- **File Draw.io:** `01_Diagram/04_Statechart_Diagram/SC02-Charging_Point_State_Machine.drawio.svg`

### Mã PlantUML
```plantuml
@startuml
[*] --> Idle : installAndPowerOn

state "Power Station Service" as PowerService {
    state "Idle / Available" as Idle {
        Idle : do / displayGreenLED()
    }
    state Reserved {
        Reserved : entry / lockConnector()
        Reserved : do / displayYellowLED()
    }
    state "Charging (Active)" as Charging {
        Charging : entry / closePowerRelay()
        Charging : do / deliverElectricityKWh()
        Charging : exit / openPowerRelay()
    }
    state "Charge Complete" as Complete {
        Complete : entry / cutRelay()
        Complete : do / notifyStudent()
    }

    Idle --> Reserved : reserveChargingSlot
    Reserved --> Charging : plugInVehicle
    Charging --> Complete : batteryFull [>= 80%]
    Complete --> Idle : unplugVehicle
}

state "Fault / Short Circuit" as Fault {
    Fault : entry / emergencyPowerCut()
    Fault : do / blinkRedLED()
}

state "Under Repair" as Repair {
    Repair : do / technicianInspection()
    Repair : exit / runSafetyTest()
}

Charging --> Fault : shortCircuit / powerSurge
Fault --> Repair : createIncidentTicket
Repair --> Idle : repairedAndCertified
@enduml
```

### Mã Mermaid Preview
```mermaid
stateDiagram-v2
    [*] --> Idle : installAndPowerOn

    state "Power Station Service (Superstate)" as PowerService {
        Idle --> Reserved : reserveChargingSlot
        Reserved --> Charging : plugInVehicle
        Charging --> ChargeComplete : batteryFull [Pin >= 80%]
        ChargeComplete --> Idle : unplugVehicle
    }

    Charging --> Fault : shortCircuit / powerSurge
    Fault --> UnderRepair : createIncidentTicket
    UnderRepair --> Idle : repairedAndCertified
```

---

## SC03: Reservation & Trip State Machine
- **Ý nghĩa nghiệp vụ:** Quản lý vòng đời logic của một phiên giao dịch từ khi tạo đặt giữ cho đến khi trả xe và thanh toán hoàn tất.
- **File Draw.io:** `01_Diagram/04_Statechart_Diagram/SC03-Reservation_and_Trip_State_Machine.drawio.svg`

### Mã PlantUML
```plantuml
@startuml
[*] --> Reserved : createReservation

state Reserved {
    Reserved : entry / start15MinCountdown()
    Reserved : do / holdVehicleLock()
}

state "Active Trip (In-Use)" as InTrip {
    InTrip : entry / startFareMeter()
    InTrip : do / recordTripTelemetry()
    InTrip : exit / stopFareMeter()
}

state Completed {
    Completed : entry / calculateInvoice()
    Completed : do / processPayment()
}

state Cancelled {
    Cancelled : entry / releaseVehicleLock()
}

state Expired {
    Expired : entry / autoCancelDaemon()
}

Reserved --> InTrip : unlockVehicle [within 15 mins]
InTrip --> Completed : dockAndLockAtHub
Completed --> [*] : paymentSettled

Reserved --> Cancelled : studentCancel
Reserved --> Expired : autoExpireDaemon [after 15 mins]

Cancelled --> [*] : cleanupSession
Expired --> [*] : cleanupSession
@enduml
```

### Mã Mermaid Preview
```mermaid
stateDiagram-v2
    [*] --> Reserved : createReservation
    Reserved --> ActiveTrip : unlockVehicle [Trong 15 phút]
    ActiveTrip --> Completed : dockAndLockAtHub
    Completed --> [*] : paymentSettled

    Reserved --> Cancelled : studentCancel
    Reserved --> Expired : autoExpireDaemon [Quá 15 phút]

    Cancelled --> [*] : cleanupSession
    Expired --> [*] : cleanupSession
```
