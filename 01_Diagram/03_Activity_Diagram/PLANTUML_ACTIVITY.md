# TỔNG HỢP MÃ NGUỒN PLANTUML & MERMAID SƠ ĐỒ HOẠT ĐỘNG (ACTIVITY DIAGRAM)
> **Chuẩn mực bài giảng (Supreme Law):** Môn **Software Engineering (CO3001) - ĐHQG-HCM** & **Ian Sommerville (10th Ed) Ch6 p.12-13, 39, 51, 52**.
> Định dạng chuẩn: Phân làn trách nhiệm (**Swimming lane / Swimlanes** - Slide 52), Luồng đối tượng (**Object Flow** `:Object [state]` nét đứt - Slide 51), Nút Decision (`◇`) có Guard Condition trong ngoặc vuông `[...]` loại trừ lẫn nhau, và Thanh đồng bộ song song (**Fork & Join**).

---

## MỤC LỤC
1. [AD01: Quy trình đặt giữ xe (Reserve Vehicle Workflow)](#ad01-reserve-vehicle-workflow)
2. [AD02: Quy trình nhận xe tại bãi (Pick Up Vehicle Workflow)](#ad02-pick-up-vehicle-workflow)
3. [AD03: Quy trình trả xe vào chốt khóa (Return Vehicle Workflow)](#ad03-return-vehicle-workflow)
4. [AD04: Quy trình đặt chỗ đỗ & Sạc pin (Reserve Parking & Charging Workflow)](#ad04-reserve-parking-and-charging-workflow)
5. [AD05: Quy trình điều phối phương tiện liên trạm (Vehicle Redistribution Workflow)](#ad05-vehicle-redistribution-workflow)
6. [AD06: Quy trình xử lý & Cô lập sự cố vận hành (Handle Operational Incident Workflow)](#ad06-handle-operational-incident-workflow)
7. [AD07: Quy trình mô phỏng kịch bản giả định (What-if Simulation Workflow)](#ad07-what-if-simulation-workflow)

---

## AD01: Reserve Vehicle Workflow
- **Tương ứng Use Case:** `UC03 - Reserve Vehicle`
- **File Draw.io:** `01_Diagram/03_Activity_Diagram/AD01-Reserve_Vehicle.drawio.svg`

### Mã PlantUML (Có Phân làn Swimlanes & Object Flow)
```plantuml
@startuml
|Sinh viên (Student)|
start
:Mở ứng dụng & Chọn Hub đến;

|Mobile App|
:Hiển thị danh sách xe & mức pin %;

|Sinh viên (Student)|
:Chọn xe & Bấm Đặt giữ xe (15p);

|Backend Service|
:Kiểm tra trạng thái xe & dung lượng pin;
if (Còn trống & Pin >= 20%?) then ([Hợp lệ])
    :Khóa xe Reserved & Tạo mã giữ xe;
    |Database|
    :Lưu :ReservationTicket [ACTIVE];
    |Mobile App|
    :Hiển thị vé điện tử kèm đếm ngược 15:00;
    stop
else ([Hết xe / Pin yếu])
    |Mobile App|
    :Báo lỗi & Gợi ý phương tiện khác;
    stop
endif
@enduml
```

### Mã Mermaid Preview
```mermaid
flowchart TD
    subgraph Lane1 ["Sinh viên (Student)"]
        Start([● Bắt đầu]) --> Act1["Mở ứng dụng & Chọn Hub đến"]
        Act2["Hiển thị danh sách xe & pin %"] --> Act3["Chọn xe & Bấm Đặt giữ (15p)"]
    end

    subgraph Lane2 ["Mobile App"]
        Act1 --> Act2
        Act_Err["Báo lỗi & Gợi ý phương tiện khác"]
        Act6["Hiển thị vé điện tử kèm đếm 15:00"] --> EndNode([◉ Kết thúc])
    end

    subgraph Lane3 ["Backend Service"]
        Act3 --> Act4["Kiểm tra trạng thái & Pin"]
        Act4 --> Dec1{"Còn trống & Pin >= 20%?"}
        Dec1 -- "[Hợp lệ]" --> Act5["Khóa xe Reserved & Tạo mã giữ xe"]
        Dec1 -- "[Hết / Pin yếu]" --> Act_Err
        Act_Err --> Act1
    end

    subgraph Lane4 ["Database"]
        Act5 -.-> ObjTicket[":ReservationTicket [ACTIVE]"]
        ObjTicket -.-> Act6
    end
```

---

## AD02: Pick Up Vehicle Workflow
- **Tương ứng Use Case:** `UC04 - Pick Up Vehicle`
- **File Draw.io:** `01_Diagram/03_Activity_Diagram/AD02-Pick_Up_Vehicle.drawio.svg`

### Mã PlantUML (Có Fork/Join Song song & Swimlanes)
```plantuml
@startuml
|Sinh viên (Student)|
start
:Đến Hub & Mở màn hình Nhận xe;
repeat
    :Quét QR trên thân hoặc nhập mã PIN;

    |Backend Service|
    :Xác thực phiếu giữ & Kiểm tra hạn 15 phút;
    if (Mã hợp lệ & Còn hạn?) then ([Hợp lệ])
        fork
            |Trạm IoT (Station)|
            :Phát lệnh mở chốt khóa điện tử;
        fork again
            |Backend Service|
            :Kích hoạt In-Use & Bắt đầu tính giờ;
        end fork
        |Mobile App|
        :Hiển thị màn hình hành trình đang chạy;
        stop
    else ([Sai mã / Hết hạn])
        |Mobile App|
        :Báo lỗi & Tăng bộ đếm lần sai;
    endif
repeat while (Sai < 3 lần?) is ([Còn lượt thử])
->[>= 3 lần - Khóa];
|Mobile App|
:Khóa phiên nhận xe & Báo bảo mật;
stop
@enduml
```

### Mã Mermaid Preview
```mermaid
flowchart TD
    subgraph Lane1 ["Sinh viên (Student)"]
        Start([● Bắt đầu]) --> Act1["Đến Hub & Mở màn hình Nhận xe"]
        Act1 --> Act2["Quét QR / Nhập mã PIN"]
    end

    subgraph Lane2 ["Backend Service"]
        Act2 --> Act3["Xác thực phiếu giữ & Hạn 15p"]
        Act3 --> Dec1{"Mã hợp lệ & Còn hạn?"}
        Dec1 -- "[Hợp lệ]" --> ForkBar[Thanh đồng bộ Fork]
        ForkBar --> ActTrip["Kích hoạt In-Use & Bắt đầu tính giờ"]
        ActTrip --> JoinBar[Thanh đồng bộ Join]
    end

    subgraph Lane3 ["Trạm IoT (Station)"]
        ForkBar --> ActIoT["Phát lệnh mở chốt khóa điện tử"]
        ActIoT --> JoinBar
    end

    subgraph Lane4 ["Mobile App"]
        Dec1 -- "[Sai / Hết hạn]" --> ActFail["Báo lỗi & Tăng bộ đếm lần sai"]
        ActFail --> DecRetry{"Sai >= 3 lần?"}
        DecRetry -- "[< 3 lần]" --> Act2
        DecRetry -- "[>= 3 lần]" --> EndFail([◉ Khóa phiên])
        JoinBar --> ActUI["Hiển thị hành trình đang chạy"]
        ActUI --> EndSuccess([◉ Kết thúc thành công])
    end
```

---

## AD03: Return Vehicle Workflow
- **Tương ứng Use Case:** `UC05 - Return Vehicle`
- **File Draw.io:** `01_Diagram/03_Activity_Diagram/AD03-Return_Vehicle.drawio.svg`

### Mã PlantUML (Object Flow :TripInvoice & Swimlanes)
```plantuml
@startuml
|Sinh viên (Student)|
start
repeat
    :Đưa xe vào khe đỗ và đẩy chặt chốt;

    |Trạm IoT (Station)|
    :Cảm biến chốt khóa đóng điện & đọc pin;
    if (Chốt khớp & Đã khóa an toàn?) then ([Đã khóa])
        break
    else ([Chưa khớp])
        |Sinh viên (Student)|
        :Cảnh báo đẩy chặt lại chốt khóa vật lý;
    endif
repeat while (Thử lại chốt khóa)

|Backend Service|
:Chốt giờ kết thúc & Tính toán cước phí;
:Lưu :TripInvoice [SETTLED];
:Cập nhật trạng thái xe (Available / Sạc);

|Mobile App|
:Hiển thị biên lai & Xác nhận hoàn tất;
stop
@enduml
```

### Mã Mermaid Preview
```mermaid
flowchart TD
    subgraph Lane1 ["Sinh viên (Student)"]
        Start([● Bắt đầu]) --> Act1["Đưa xe vào khe đỗ & Đẩy khóa chốt"]
        ActWarn["Cảnh báo đẩy chặt lại chốt khóa"] --> Act1
    end

    subgraph Lane2 ["Trạm IoT (Station)"]
        Act1 --> Act2["Cảm biến xác nhận chốt khóa & Đọc pin"]
        Act2 --> Dec1{"Chốt khớp & Khóa chặt?"}
        Dec1 -- "[Chưa khớp]" --> ActWarn
    end

    subgraph Lane3 ["Backend Service"]
        Dec1 -- "[Đã khóa]" --> Act3["Chốt giờ & Tính cước phí"]
        Act3 -.-> ObjInv[":TripInvoice [SETTLED]"]
        ObjInv -.-> Act4["Cập nhật trạng thái xe (Available / Sạc)"]
    end

    subgraph Lane4 ["Mobile App"]
        Act4 --> Act5["Hiển thị biên lai & Hoàn tất"]
        Act5 --> EndSuccess([◉ Hoàn thành cuốc xe])
    end
```

---

## AD04: Reserve Parking and Charging Workflow
- **Tương ứng Use Case:** `UC06 - Reserve Parking Space` & `UC07 - Request Charging`
- **File Draw.io:** `01_Diagram/03_Activity_Diagram/AD04-Reserve_Parking_and_Charging.drawio.svg`

### Mã PlantUML
```plantuml
@startuml
|Sinh viên (Student)|
start
:Chọn Hub & Khung giờ gửi xe cá nhân;

|Hệ thống Quản lý Hub|
:Kiểm tra sức chứa slot đỗ trống;
if (Còn slot đỗ trống?) then ([Còn slot])
    :Khóa giữ ô đỗ & Sinh mã QR vào bãi;

    |Sinh viên (Student)|
    if (Có nhu cầu sạc pin xe cá nhân?) then ([Có sạc pin])
        :Nhập % pin hiện tại & giờ lấy xe dự kiến;
        |Hệ thống Quản lý Hub|
        :Phân bổ cổng sạc & Xếp lịch cấp điện;
        |Trụ sạc IoT (PowerHub)|
        :Kích hoạt relay sạc tại vị trí cổng đỗ;
    else ([Không sạc])
    endif

    |Mobile App|
    :Hiển thị thẻ đặt chỗ & Hướng dẫn cắm sạc;
    stop
else ([Hết chỗ])
    |Mobile App|
    :Báo hết chỗ & Gợi ý khung giờ khác;
    stop
endif
@enduml
```

### Mã Mermaid Preview
```mermaid
flowchart TD
    subgraph Lane1 ["Sinh viên (Student)"]
        Start([● Bắt đầu]) --> Act1["Chọn Hub & Khung giờ gửi xe"]
        DecCharge{"Có nhu cầu sạc pin?"}
        ActInput["Nhập % pin & Giờ lấy dự kiến"]
    end

    subgraph Lane2 ["Hệ thống Quản lý Hub"]
        Act1 --> Act2["Kiểm tra sức chứa slot đỗ"]
        Act2 --> DecSlot{"Còn slot đỗ trống?"}
        DecSlot -- "[Còn slot]" --> ActLock["Khóa giữ ô đỗ & Cấp mã QR bãi"]
        ActLock --> DecCharge
        DecCharge -- "[Có sạc]" --> ActInput
        ActInput --> ActSched["Phân bổ cổng sạc & Xếp lịch cấp điện"]
    end

    subgraph Lane3 ["Trụ sạc IoT (PowerHub)"]
        ActSched --> ActRelay["Kích hoạt relay sạc tại cổng đỗ"]
    end

    subgraph Lane4 ["Mobile App"]
        DecSlot -- "[Hết chỗ]" --> ActErr["Báo hết chỗ & Gợi ý khung khác"]
        ActErr --> EndErr([◉ Kết thúc])
        DecCharge -- "[Không sạc]" --> ActCard["Hiển thị thẻ đặt chỗ vào bãi"]
        ActRelay --> ActCard
        ActCard --> EndSuccess([◉ Hoàn thành đặt chỗ])
    end
```

---

## AD05: Vehicle Redistribution Workflow
- **Tương ứng Use Case:** `UC10 - Redistribute Vehicles`
- **File Draw.io:** `01_Diagram/03_Activity_Diagram/AD05-Redistribute_Vehicles.drawio.svg`

### Mã PlantUML
```plantuml
@startuml
|Web Dashboard|
start
:Cảnh báo mất cân bằng cung cầu giữa các Hub;

|Điều hành viên (Operator)|
:Chọn Hub nguồn, Hub đích & Số lượng xe điều phối;

|Rebalance Service|
:Kiểm tra xe pin >= 80% và slot trống trạm đích;
if (Đủ điều kiện điều chuyển?) then ([Đủ điều kiện])
    :Khóa xe In-Transit & Xuất lệnh điều phối;
    :Lưu :TransferManifest [Qty=20, Pin>=80%];

    |Tài xế trung chuyển (Fleet)|
    :Nhận lệnh, bốc xếp xe & vận chuyển theo lộ trình;
    :Quét mã nhập bãi đích & Khôi phục Available;
    stop
else ([Thiếu xe/slot])
    |Web Dashboard|
    :Đề xuất đổi Hub đích hoặc giảm số lượng xe;
    |Điều hành viên (Operator)|
    :Tinh chỉnh lại tham số điều phối;
    stop
endif
@enduml
```

### Mã Mermaid Preview
```mermaid
flowchart TD
    subgraph Lane1 ["Web Dashboard"]
        Start([● Bắt đầu]) --> ActAlert["Cảnh báo mất cân bằng cung cầu"]
        ActAlt["Đề xuất đổi Hub đích / Giảm xe"]
    end

    subgraph Lane2 ["Điều hành viên (Operator)"]
        ActAlert --> ActSelect["Chọn Hub nguồn, đích & số xe"]
        ActAlt --> ActSelect
    end

    subgraph Lane3 ["Rebalance Service"]
        ActSelect --> ActCheck["Kiểm tra xe pin >= 80% & Slot đích"]
        ActCheck --> DecCond{"Đủ điều kiện điều chuyển?"}
        DecCond -- "[Thiếu xe/slot]" --> ActAlt
        DecCond -- "[Đủ điều kiện]" --> ActLock["Khóa xe In-Transit & Tạo lệnh"]
        ActLock -.-> ObjManifest[":TransferManifest [Qty=20]"]
    end

    subgraph Lane4 ["Tài xế trung chuyển (Fleet)"]
        ObjManifest -.-> ActDrive["Bốc xếp xe & Vận chuyển theo tuyến"]
        ActDrive --> ActArrive["Quét mã nhập bãi đích & Chuyển Available"]
        ActArrive --> EndSuccess([◉ Hoàn thành điều phối])
    end
```

---

## AD06: Handle Operational Incident Workflow
- **Tương ứng Use Case:** `UC11 - Handle Operational Incident`
- **File Draw.io:** `01_Diagram/03_Activity_Diagram/AD06-Handle_Operational_Incident.drawio.svg`

### Mã PlantUML
```plantuml
@startuml
|Hệ thống Telemetry / User|
start
:Phát hiện sự cố cổng sạc hoặc nhận báo hỏng từ App;

|Incident Engine|
:Phân tích mức độ sự cố (Nghiêm trọng / Nhẹ);
if (Mức độ sự cố?) then ([Khẩn cấp / Đoản mạch])
    :Ngắt điện tức thời & Khóa cổng từ xa (Out of Order);
else ([Lỗi nhẹ / Sơn xe])
endif
:Tạo phiếu sửa chữa & Điều phối kỹ thuật viên;

|Kỹ thuật viên (Technician)|
:Kiểm tra hiện trường, sửa chữa & thay linh kiện;
:Chạy kiểm thử an toàn điện & Nghiệm thu trên App;

|Incident Engine|
:Tái kích hoạt cổng sạc sang trạng thái Sẵn sàng;
stop
@enduml
```

### Mã Mermaid Preview
```mermaid
flowchart TD
    subgraph Lane1 ["Hệ thống Telemetry / User"]
        Start([● Bắt đầu]) --> ActDetect["Phát hiện sự cố cổng / Báo hỏng App"]
    end

    subgraph Lane2 ["Incident Engine"]
        ActDetect --> ActAssess["Phân tích mức độ sự cố"]
        ActAssess --> DecSeverity{"Mức độ sự cố?"}
        DecSeverity -- "[Khẩn cấp / Đoản mạch]" --> ActCut["Ngắt điện tức thời & Khóa Out of Order"]
        DecSeverity -- "[Lỗi nhẹ]" --> ActTicket["Tạo phiếu bảo trì & Giao việc"]
        ActCut --> ActTicket
        ActReactivate["Tái kích hoạt cổng (Available)"] --> EndSuccess([◉ Khôi phục hoạt động])
    end

    subgraph Lane3 ["Kỹ thuật viên (Technician)"]
        ActTicket --> ActFix["Kiểm tra hiện trường & Sửa chữa"]
        ActFix --> ActTest["Kiểm thử an toàn & Nghiệm thu App"]
        ActTest --> ActReactivate
    end
```

---

## AD07: What-if Simulation Workflow
- **Tương ứng Use Case:** `UC13 - Run What-if Simulation` & `UC14 - View Simulation Results`
- **File Draw.io:** `01_Diagram/03_Activity_Diagram/AD07-Run_What_if_Simulation.drawio.svg`

### Mã PlantUML
```plantuml
@startuml
|Điều hành viên (Operator)|
start
:Chọn 1 trong 5 kịch bản (VD: Cao điểm Metro);
repeat
    :Cấu hình tham số mô phỏng (+300%, 120p);

    |What-if Engine (Sandbox)|
    :Chạy mô phỏng biến đổi sự kiện rời rạc trên Sandbox;

    |Web Dashboard|
    :Hiển thị KPI dự báo & Đề xuất điều phối xe/sạc;

    |Điều hành viên (Operator)|
    if (Chấp thuận khuyến nghị?) then ([Đồng ý áp dụng])
        |Hệ thống Thực tế (Production)|
        :Phát lệnh điều phối tự động vào mạng lưới thực tế;
        stop
    else ([Thử nghiệm lại])
        |Điều hành viên (Operator)|
        :Tinh chỉnh lại tham số đầu vào của kịch bản;
    endif
repeat while (Tiếp tục thử nghiệm?) is ([Có])
@enduml
```

### Mã Mermaid Preview
```mermaid
flowchart TD
    subgraph Lane1 ["Điều hành viên (Operator)"]
        Start([● Bắt đầu]) --> ActScenario["Chọn 1 trong 5 kịch bản giả định"]
        ActParams["Cấu hình tham số mô phỏng (+300%, 120p)"]
        ActScenario --> ActParams
        DecApply{"Chấp thuận khuyến nghị?"}
        ActTune["Tinh chỉnh lại tham số kịch bản"]
        ActTune --> ActParams
    end

    subgraph Lane2 ["What-if Engine (Sandbox)"]
        ActParams --> ActSim["Chạy mô phỏng sự kiện rời rạc trên Sandbox"]
    end

    subgraph Lane3 ["Web Dashboard"]
        ActSim --> ActKPI["Hiển thị KPI dự báo & Đề xuất điều phối"]
        ActKPI --> DecApply
    end

    subgraph Lane4 ["Hệ thống Thực tế (Production)"]
        DecApply -- "[Đồng ý áp dụng]" --> ActDeploy["Phát lệnh điều phối tự động vào thực tế"]
        DecApply -- "[Thử lại]" --> ActTune
        ActDeploy --> EndSuccess([◉ Áp dụng thành công])
    end
```
