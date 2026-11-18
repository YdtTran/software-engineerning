# Statechart Diagram

Editable diagrams are in `drawio/`.

Open a `.drawio` file in diagrams.net or the Draw.io extension for VS Code to edit it.

| Diagram | Draw.io |
| --- | --- |
| SC01-Vehicle_State_Machine | [Edit](drawio/SC01-Vehicle_State_Machine.drawio) |
| SC02-Charging_Point_State_Machine | [Edit](drawio/SC02-Charging_Point_State_Machine.drawio) |
| SC03-Reservation_and_Trip_State_Machine | [Edit](drawio/SC03-Reservation_and_Trip_State_Machine.drawio) |

## Tổng quan cho slide 16:9

[SC00 · Vòng đời xe dùng chung](drawio/SC00-System_Lifecycle_Overview.drawio) là một state machine 1600 × 900. Trạng thái xe nối các thao tác đặt xe, mở chuyến, trả xe, sạc và bảo trì. Các nhánh quay về Sẵn sàng chỉ minh họa khi xe đủ điều kiện phục vụ. Tín hiệu mở khóa chưa rõ giữ nguyên cam kết; báo sự cố giữa chuyến không tự đóng chuyến. SC01–SC03 mô tả đầy đủ điều chuyển, đối soát và vòng đời từng đối tượng.

Xuất ảnh bằng **File → Export as → PNG → Size: Page** để giữ tỷ lệ 16:9.

<details>
<summary>PlantUML và bản xem trước Mermaid</summary>

```plantuml
@startuml
left to right direction
state "Sẵn sàng" as available
available : do: chờ đặt xe
state "Đang giữ" as reserved
reserved : do: giữ xe đến hạn
state "Đang sử dụng" as in_use
in_use : do: duy trì chuyến đi
state "Cần sạc" as needs_charge
needs_charge : do: chờ phân bổ sạc
state "Đang sạc" as charging
charging : do: theo dõi mức pin
state "Gặp lỗi" as faulty
faulty : entry / chặn cấp xe mới
state "Đang bảo trì" as maintenance
maintenance : do: kiểm tra và sửa xe
state "Ngừng phục vụ" as retired
retired : entry / lưu hồ sơ
[*] --> available
available --> reserved : Đặt xe thành công
reserved --> available : Hủy / hết hạn [chưa bắt đầu nhận]
reserved --> in_use : Xác nhận mở khóa / bắt đầu chuyến
in_use --> available : Trả xe an toàn [pin ≥ 20%]
in_use --> needs_charge : Trả xe an toàn [pin < 20%]
needs_charge --> charging : Xác nhận cấp điện [cổng đã phân bổ]
charging --> available : Xác nhận ngắt điện [pin ≥ 20%]
charging --> needs_charge : Xác nhận ngắt điện [pin < 20%]
in_use --> faulty : Phát hiện lỗi
faulty --> maintenance : Phân công sửa chữa [xe ở vị trí an toàn]
maintenance --> available : Kiểm tra đạt [đã đóng chuyến, pin ≥ 20%]
maintenance --> retired : Duyệt ngừng phục vụ [xe an toàn, hết cam kết]
retired --> [*]
@enduml
```

```mermaid
stateDiagram-v2
    direction LR
    state "Sẵn sàng" as available
    available : do: chờ đặt xe
    state "Đang giữ" as reserved
    reserved : do: giữ xe đến hạn
    state "Đang sử dụng" as in_use
    in_use : do: duy trì chuyến đi
    state "Cần sạc" as needs_charge
    needs_charge : do: chờ phân bổ sạc
    state "Đang sạc" as charging
    charging : do: theo dõi mức pin
    state "Gặp lỗi" as faulty
    faulty : entry / chặn cấp xe mới
    state "Đang bảo trì" as maintenance
    maintenance : do: kiểm tra và sửa xe
    state "Ngừng phục vụ" as retired
    retired : entry / lưu hồ sơ
    [*] --> available
    available --> reserved : Đặt xe thành công
    reserved --> available : Hủy / hết hạn [chưa bắt đầu nhận]
    reserved --> in_use : Xác nhận mở khóa / bắt đầu chuyến
    in_use --> available : Trả xe an toàn [pin ≥ 20%]
    in_use --> needs_charge : Trả xe an toàn [pin < 20%]
    needs_charge --> charging : Xác nhận cấp điện [cổng đã phân bổ]
    charging --> available : Xác nhận ngắt điện [pin ≥ 20%]
    charging --> needs_charge : Xác nhận ngắt điện [pin < 20%]
    in_use --> faulty : Phát hiện lỗi
    faulty --> maintenance : Phân công sửa chữa [xe ở vị trí an toàn]
    maintenance --> available : Kiểm tra đạt [đã đóng chuyến, pin ≥ 20%]
    maintenance --> retired : Duyệt ngừng phục vụ [xe an toàn, hết cam kết]
    retired --> [*]
```

</details>

## Semantics and demo boundaries

SC01 describes the vehicle lifecycle; SC03 describes the related reservation and trip lifecycle, so their states are not interchangeable. In the current demo, an unconfirmed pickup records `DeviceUnconfirmed` and keeps the vehicle Reserved with its pickup claim. The reservation enters `PickupUncertain`; the same command can later be reconciled with matching evidence. This does not by itself create an incident or set the vehicle Faulty. There is no public force-release endpoint for an uncertain claim. The SC03 path for releasing a claim after confirmed source lock/location represents a guarded domain capability, not an exposed demo workflow.

A low-battery return or transfer arrival classifies the vehicle `NeedsCharging`; this does not by itself create a charging request. A trip incident is stored for Operator review and leaves the trip active; external notification delivery is not implemented. Distance can be absent when the adapter provides no odometer evidence.

SC02 combines required safety conditions with service-level transitions. Allocation reserves the point and power; `activateAllocation` moves it through Starting to Charging only after power-on acknowledgement. A successful stop releases power but retains the connector in Complete until `confirmUnplug` succeeds; an unconfirmed unplug also quarantines the point in Fault. An unconfirmed command quarantines the point and retains uncertain allocation; the command runner may stop before three attempts on a reported fault. The current HTTP router exposes allocation and stop, but not activation, unplug confirmation, uncertain-allocation reconciliation or post-repair safety verification. Those methods have service tests; they are not a complete public UI workflow. The model's safe repair condition remains a team requirement; the current guard checks for no active session when entering Repair, while the Available transition additionally checks unresolved incidents, allocations and a safety acknowledgement. In `InventoryService`, `PATCH /operations/resources/:id` does not expose `Retired` transitions for vehicles (which instead support `DELETE` when idle) or charging points, even though the guard permits `Retired` when no active session or allocation remains.

The following focused previews show the corrected uncertainty and low-battery transitions; the full editable canvases remain the diagram sources.

```plantuml
@startuml
state "Reserved vehicle" as Reserved
state "In use" as InUse
state "Needs charging" as NeedsCharging
Reserved --> Reserved : unlock unconfirmed / retain claim; record event
Reserved --> InUse : matching unlock ACK / start trip
InUse --> NeedsCharging : safe return [battery < 20%] / classify
@enduml
```

```mermaid
stateDiagram-v2
    Reserved --> Reserved: unlock unconfirmed / retain claim and record event
    Reserved --> InUse: matching unlock ACK / start trip
    InUse --> NeedsCharging: safe return below 20% / classify
```

Checklist: unconfirmed unlock preserves its claim, confirmed pickup creates one trip, low battery is classification rather than automatic request, and an incident report keeps the trip active. Open the `.drawio` source in VS Code using Draw.io Integration. Paste PlantUML via **Advanced → PlantUML** in Draw.io or **File → Import → PlantUML** in Visual Paradigm Online.

## SC02 · allocation and safe stop preview

```plantuml
@startuml
state "Idle / Available" as Idle
state Reserved
state Starting
state Charging
state Stopping
state "Stopped / Awaiting Unplug" as Complete
state "Fault / Isolated" as Fault
Idle --> Reserved : allocate / hold port and power
Reserved --> Starting : activate / send power ON
Starting --> Charging : power ON ACK / create session
Starting --> Fault : unconfirmed / retain allocation
Charging --> Stopping : stop / send power OFF
Stopping --> Complete : power OFF ACK / release power
Stopping --> Fault : unconfirmed / retain allocation
Complete --> Idle : unplug ACK / release connector
@enduml
```

```mermaid
stateDiagram-v2
    Idle --> Reserved: allocate port and power
    Reserved --> Starting: activate and send power ON
    Starting --> Charging: power ON ACK creates session
    Starting --> Fault: unconfirmed retains allocation
    Charging --> Stopping: send power OFF
    Stopping --> Complete: power OFF ACK releases power
    Stopping --> Fault: unconfirmed retains allocation
    Complete --> Idle: unplug ACK releases connector
```

Checklist: allocation precedes activation; power-on ACK precedes Active; power-off ACK releases power; unplug ACK releases the connector; failed acknowledgement preserves uncertainty. The preview is a subset of the editable SC02 canvas. Open the `.drawio` in VS Code with Draw.io Integration, or import PlantUML through **Advanced → PlantUML** in Draw.io or **File → Import → PlantUML** in Visual Paradigm Online.
