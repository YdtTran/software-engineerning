# Class Diagram

Editable diagrams are in `drawio/`.

Open a `.drawio` file in diagrams.net or the Draw.io extension for VS Code to edit it.

| Diagram | Draw.io |
| --- | --- |
| smart_emobility_class_diagram | [Edit](drawio/smart_emobility_class_diagram.drawio) |

## Tổng quan cho slide 16:9

[CD00 · Mô hình lớp tổng quan](drawio/CD00-Class_Overview_16x9.drawio) hiển thị 10 lớp đại diện với ba ngăn UML. Màu phân biệt tài khoản, đặt xe và chuyến đi, hạ tầng Hub, phương tiện và sạc điện. Tên lớp, chữ ký được chọn và bội số đều lấy từ [class catalog](../../../.agent/class-diagram/CLASS_CATALOG.md). Dùng mô hình đầy đủ bên trên để tra các lớp và liên kết đã lược bớt.

Mở nguồn bằng Draw.io Integration trong VS Code. Xuất ảnh tại **File → Export as → PNG/SVG → Size: Page**. Nhập PlantUML qua **Advanced → PlantUML** trong Draw.io hoặc **File → Import → PlantUML** trong Visual Paradigm Online.

<details>
<summary>PlantUML và bản xem trước Mermaid</summary>

```plantuml
@startuml
skinparam classFontColor #0f172a
skinparam classAttributeIconSize 0
class UserAccount #f5e9fc {
    -roles : UserRoleSet
    +hasRole(role : UserRole) : Boolean
}
abstract class Reservation #eaf6e9 {
    -expiresAt : DateTime
    +cancel() : void
    {abstract} +calculateExpiry() : DateTime
}
class VehicleReservation #eaf6e9 {
    -pickupClaimed : Boolean = false
}
class Trip #eaf6e9 {
    -status : TripStatus
    +complete(at : DateTime) : void
}
class MobilityHub #e7f1fd {
    -name : String
    -powerLimitKW : Real
    +availableParkingCount() : Integer
}
class ParkingSlot #e7f1fd {
    -status : ParkingStatus
}
abstract class ElectricVehicle #ffeedf {
    -batteryPercent : Integer
    -status : VehicleStatus
    +isRentable() : Boolean
}
class ChargingPoint #e7f1fd {
    -status : ChargingPointStatus
    -allocatedPowerKW : Real = 0
}
class ChargingSession #fff6dc {
    -status : ChargingSessionStatus
    +stop(at : DateTime, reason : ChargingStopReason) : void
}
class ChargingRequest #fff6dc {
    -targetBatteryPercent : Integer
    +isUrgent() : Boolean
}
VehicleReservation --|> Reservation
MobilityHub "1" -- "0..*" ParkingSlot
ParkingSlot "0..1" -- "0..1" ElectricVehicle
UserAccount "1" -- "0..*" Reservation
VehicleReservation "1" -- "0..1" Trip
ChargingRequest "1" -- "0..*" ChargingSession
ChargingPoint "1" -- "0..*" ChargingSession
MobilityHub "1" -- "0..*" ChargingPoint
ElectricVehicle "1" -- "0..*" VehicleReservation
ElectricVehicle "1" -- "0..*" ChargingRequest
ElectricVehicle "1" -- "0..*" Trip
@enduml
```

```mermaid
classDiagram
    direction LR
    class UserAccount {
        -roles : UserRoleSet
        +hasRole(role : UserRole) : Boolean
    }
    class Reservation {
        <<abstract>>
        -expiresAt : DateTime
        +cancel() : void
        +calculateExpiry() : DateTime
    }
    class VehicleReservation {
        -pickupClaimed : Boolean = false
    }
    class Trip {
        -status : TripStatus
        +complete(at : DateTime) : void
    }
    class MobilityHub {
        -name : String
        -powerLimitKW : Real
        +availableParkingCount() : Integer
    }
    class ParkingSlot {
        -status : ParkingStatus
    }
    class ElectricVehicle {
        <<abstract>>
        -batteryPercent : Integer
        -status : VehicleStatus
        +isRentable() : Boolean
    }
    class ChargingPoint {
        -status : ChargingPointStatus
        -allocatedPowerKW : Real = 0
    }
    class ChargingSession {
        -status : ChargingSessionStatus
        +stop(at : DateTime, reason : ChargingStopReason) : void
    }
    class ChargingRequest {
        -targetBatteryPercent : Integer
        +isUrgent() : Boolean
    }
    VehicleReservation --|> Reservation
    MobilityHub "1" -- "0..*" ParkingSlot
    ParkingSlot "0..1" -- "0..1" ElectricVehicle
    UserAccount "1" -- "0..*" Reservation
    VehicleReservation "1" -- "0..1" Trip
    ChargingRequest "1" -- "0..*" ChargingSession
    ChargingPoint "1" -- "0..*" ChargingSession
    MobilityHub "1" -- "0..*" ChargingPoint
    ElectricVehicle "1" -- "0..*" VehicleReservation
    ElectricVehicle "1" -- "0..*" ChargingRequest
    ElectricVehicle "1" -- "0..*" Trip
```

</details>
