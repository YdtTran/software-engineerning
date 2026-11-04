# Smart E-Mobility Hub — Test Plan & Test Case Specification (Submission #3 Bonus)

> **Học phần:** Công nghệ Phần mềm (CO3001) – Học kỳ 261  
> **Chuẩn mực tham chiếu (Supreme Law):**
> 1. **Mức 1 (Tối cao):** Slide bài giảng chính thức [`00_Slides/09_Ch9 Software Testing_2025.pdf`](../../00_Slides/09_Ch9%20Software%20Testing_2025.pdf) (Ian Sommerville 10th Ed. – Chương 8/9: Unit Testing, Equivalence Partitioning & Boundary Value Analysis p.20–26; Use-Case Testing Template p.53–54; Test Plan & Test Plan Table p.55, p.59; UAT & NFR Testing p.30–40, p.60–63).
> 2. **Mức 2:** Đề bài [`04_BTL_SoftwareEngineering_HK261.pdf`](../../04_BTL_SoftwareEngineering_HK261.pdf) (Trang 5: *Submission #3 – Test case (bonus)*) và [`PROJECT_SPECIFICATION.md`](../../PROJECT_SPECIFICATION.md) (§§3–5).
> 3. **Mức 3:** Thiết kế lớp miền [`CLASS_CATALOG.md`](CLASS_CATALOG.md), đặc tả 18 phương thức [`METHOD_DESCRIPTIONS.md`](METHOD_DESCRIPTIONS.md), chuỗi tương tác [`PLANTUML_SEQUENCE.md`](../02_Sequence_Diagram/PLANTUML_SEQUENCE.md) (`SQ01`–`SQ07`) và bản mẫu 26 màn hình [`03_App/01_UI_UX/`](../../03_App/01_UI_UX/README.md).

---

## 1. KẾ HOẠCH KIỂM THỬ TỔNG THỂ (TEST PLAN — SLIDE CH9 P.55 & P.59)

Theo cấu trúc **Test Plan** tại **Slide Ch9 trang 55**, kế hoạch kiểm thử cho hệ thống **Smart E-Mobility Hub** được xác định ở cả mức chiến lược và mức tác nghiệp như sau:

### 1.1. Các Thành phần của Test Plan (Slide Ch9 p.55)

1. **Đối tượng kiểm thử (Test Objects):**
   - **Tầng Mô hình Miền (Domain Classes — 19 lớp, 18 phương thức trong [`CLASS_CATALOG.md`](CLASS_CATALOG.md) & [`METHOD_DESCRIPTIONS.md`](METHOD_DESCRIPTIONS.md)):** `UserAccount`, `ElectricVehicle` (*abstract*), `ElectricBicycle`, `ElectricMotorcycle`, `MobilityHub`, `ParkingSlot`, `ChargingPoint`, `Reservation` (*abstract*), `VehicleReservation`, `ParkingReservation`, `Trip`, `ChargingRequest`, `ChargingSession`, `TransferOrder`, `OperationalIncident`, `SimulationScenario`, `SimulationRun`, `SimulationResult`, `CoordinationRecommendation`.
   - **Tầng Dịch vụ Điều phối (7 Domain Services):** `ReservationHub`, `VehicleService`, `ChargingScheduler`, `RedistributionService`, `IncidentService`, `TelemetryService`, `SimulationEngine`.
   - **Tầng Tương tác & Giao diện (UI Mockup 26 màn hình & Biên tích hợp IoT):** Phân hệ Mobile Sinh viên (`user-app.html`), Mobile Operator hiện trường (`operator-app.html`), Web Dashboard Operator (`operator-web.html`), luồng cảm biến `:StationIoTDock`, `:SmartChargerIoT`.
2. **Mục tiêu kiểm thử (Test Objectives — Slide Ch9 p.13, p.55):**
   - **Validation Testing:** Chứng minh hệ thống đáp ứng đầy đủ 14 Use Cases chính (`UC01`–`UC14`), 6 ca phụ vòng đời (`UC06A`, `UC06B`, `UC07A`, `UC10A`, `UC10B`, `UC11A`), 4 yêu cầu chức năng phi tương tác (`FR-NI01`–`FR-NI04`) và 5 kịch bản mô phỏng What-if.
   - **Defect Testing:** Phát hiện lỗi vi phạm bất biến phân bổ tài nguyên (double-booking xe/slot đỗ, cho thuê xe cá nhân, điều chuyển xe pin `< 80%`, giải phóng nhầm xe đang chạy khi quét hết hạn, vượt ngân sách điện `powerLimitKW = 85%`, hoặc làm biến đổi dữ liệu thật khi chạy mô phỏng What-if).
3. **Phương pháp & Kỹ thuật Kiểm thử (Testing Methods & Techniques — Slide Ch9 p.20–26, p.53–54):**
   - **Unit Testing (Kiểm thử đơn vị — Black-box & White-box, p.20–26):**
     - *Equivalence Partitioning (EP — Phân hoạch tương đương, p.25):* Chia miền đầu vào của mức pin, thời gian, trạng thái thực thể, vai trò và tham số kịch bản thành các phân hoạch hợp lệ (Valid Partitions) và không hợp lệ (Invalid Partitions).
     - *Boundary Value Analysis (BVA — Phân tích giá trị biên, p.25):* Kiểm thử sát các ngưỡng nghiệp vụ: mức pin `0%, 9%, 10%` (ngưỡng sạc khẩn cấp `FR-NI04`), `14%, 15%` (cảnh báo pin yếu `FR-NI02`), `19%, 20%` (ngưỡng cho thuê `UC02/UC03`), `79%, 80%, 100%` (ngưỡng điều chuyển `UC10`); thời hạn giữ xe `+15 phút` vs giữ chỗ đỗ `+30 phút`; ngưỡng cảnh báo sức chứa Hub `85%` (Vàng) và `95%` (Đỏ); ngân sách công suất trạm sạc `85%`.
     - *White-box Coverage (p.26):* Đạt 100% *Statement coverage* và *Branch coverage* cho các nhánh điều kiện bảo vệ (Guard conditions) và ngoại lệ (`InvalidRole`, `InvalidBattery`, `InvalidTime`, `InvalidTransition`, `AllocationConflict`, `CapacityConflict`, `RecoveryNotVerified`, `InvalidResult`).
   - **System / Use-Case Testing (Kiểm thử ca sử dụng — Slide Ch9 p.29, p.53–54):** Xây dựng kịch bản kiểm thử đầu-cuối ép các thành phần trên Sequence Diagrams (`SQ01`–`SQ07`) tương tác với nhau qua giao diện 26 màn hình.
   - **Non-Functional & Acceptance Testing (Slide Ch9 p.30, p.39–40, p.59–63):** Kiểm thử Hiệu năng (Performance), Đồng thời/Chống tranh chấp (Concurrency), Bảo mật phân quyền (Security), Tính dễ dùng (Usability) và Tương thích (Compatibility).
4. **Hạ tầng kiểm thử yêu cầu (Required Infrastructure — Slide Ch9 p.28, p.55):**
   - Bộ kiểm thử đơn vị tự động [`verify_test_cases.py`](verify_test_cases.py) (Python `unittest` chuẩn tự động hóa theo Slide Ch9 p.28).
   - Bộ kiểm định giao diện tự động Playwright [`03_App/01_UI_UX/verify.cjs`](../../03_App/01_UI_UX/verify.cjs) trên trình duyệt Chromium/Edge (Windows 10/11).
5. **Tiêu chí Đạt / Không đạt (Success / Failure Criteria — Slide Ch9 p.55):**
   - **100%** phương thức trong Class Diagram (18/18 phương thức) có bộ Unit Test cubrir đủ nhánh hợp lệ, biên và lỗi; pass 100% assertions trong [`verify_test_cases.py`](verify_test_cases.py).
   - **100%** Use Cases (`UC01`–`UC14` + 6 ca phụ + `FR-NI01`–`FR-NI04`) và 5 kịch bản What-if có kịch bản System/Use-Case Test theo mẫu bảng chuẩn Slide Ch9 trang 53.
   - **0** lỗi nghiêm trọng (Zero double-booking, Zero live-state mutation during What-if simulation, 100% isolation of faulty resources).

---

### 1.2. Bảng Kế hoạch Kiểm thử Tổng hợp (Test Plan Table — Chuẩn Slide Ch9 p.59 & p.63)

Bảng dưới đây tuân thủ đúng 6 cột của mẫu **TEST PLAN - EXAMPLE** tại **Slide Ch9 trang 59**:

| Type of tests | Description | Number of tests | Test types | Test data | Test metric |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Unit test** | Kiểm thử độc lập từng lớp miền và toàn bộ **18 phương thức** trong [`METHOD_DESCRIPTIONS.md`](METHOD_DESCRIPTIONS.md) (bao gồm phương thức trừu tượng và 2 phương thức ghi đè) nhằm xác minh đúng hợp đồng tiền điều kiện, hậu điều kiện, bất biến và xử lý lỗi. | **54 test cases** (`UT-01` – `UT-54`, tối thiểu 3 assertions/method) | Whitebox & Blackbox (EP, BVA) | `UserRole` (`Student`, `Operator`), `batteryPercent` (`-1, 0, 9, 10, 19, 20, 50, 79, 80, 100, 101`), `DateTime` (`+15m`, `+30m`), `ScenarioParameters`, `SimulationResult` | Statement coverage (100%), Branch coverage (100%), Path coverage |
| **System test / Use case test** | Kiểm thử sự tương tác giữa các thành phần hệ thống theo 14 Use Cases chính (`UC01`–`UC14`), 6 ca phụ vòng đời (`UC06A/B`, `UC07A`, `UC10A/B`, `UC11A`) và 4 tiến trình nền (`FR-NI01`–`FR-NI04`) với cả luồng thành công và thất bại/ngoại lệ. | **24 test cases** (`SUC-01` – `SUC-24`) | Blackbox | Mã trạm (`HUB-METRO`, `HUB-KTXA`, `HUB-BK`), mã xe (`EV-101`, `PM-201`), mã QR, cấu hình 5 kịch bản What-if | Requirement coverage (100% UCs & FR-NIs), Pass rate |
| **Performance & Concurrency test** | Mô phỏng cập nhật telemetry gần thời gian thực, chạy thuật toán mô phỏng What-if quy mô lớn (1.000 xe / 10 Hub) và xử lý tranh chấp đặt chỗ đồng thời (Anti-Double-Booking). | **4 test cases** (`NFR-01` – `NFR-04`) | Blackbox | 100 – 1.000 gói tin IoT telemetry/giây; 50 luồng đặt cùng 1 xe/1 slot đỗ tại cùng thời điểm `t0`; 1.000 xe trên 10 Hub | Response time (`<= 2s`), Simulation time (`<= 5s`), Conflict rejection rate (100%) |
| **Security & Robustness test** | Kiểm thử kiểm soát truy cập theo vai trò (RBAC giữa `Student` và `Operator`), chống giả mạo telemetry cũ (Stale observation) và cô lập tức thì thiết bị lỗi/đang bảo trì. | **2 test cases** (`NFR-05` – `NFR-06`) | Blackbox | Token `Student` gọi API của `Operator`; gói tin cảm biến có timestamp lùi; xe/trụ sạc đang ở trạng thái `Faulty` | Unauthorized block rate (100%), State integrity |
| **Usability test** | Đánh giá trải nghiệm người dùng trên 3 giao diện (`user-app`, `operator-app`, `operator-web`) khi thực hiện tác vụ thuê/trả xe 1 chạm và nhận diện màu sắc cảnh báo Hub. | **2 test cases** (`NFR-07` – `NFR-08`) | Blackbox | Tác vụ đặt & mở khóa xe trong `<= 3` bước chạm; phân biệt bảng màu Xanh/Vàng/Đỏ trên Dashboard | Task completion time, Usability score & 0 clipped UI elements |
| **Compatibility test** | Kiểm thử khả năng hiển thị và vận hành nhất quán của ứng dụng Web/Mobile Web trên các trình duyệt và kích thước màn hình khác nhau. | **2 test cases** (`NFR-09` – `NFR-10`) | Blackbox | Viewport Mobile (`390x844`), Tablet/Desktop (`1440x900`) trên Chrome, Edge | Cross-browser & responsive pass rate (100%) |

---

### 1.3. Ma trận Phân hoạch Tương đương (EP) & Phân tích Giá trị Biên (BVA — Slide Ch9 p.25)

| Biến / Quy tắc Nghiệp vụ | Phân hoạch Không hợp lệ / Bị từ chối (Invalid / Rejected Partitions) | Phân hoạch Hợp lệ / Được chấp nhận (Valid / Accepted Partitions) | Giá trị Biên Trọng yếu (Boundary Values) |
| :--- | :--- | :--- | :--- |
| **Mức pin `batteryPercent` (`updateBattery`)** | `< 0`, `> 100`, hoặc không phải số nguyên (`null`, `NaN`, `55.5`) $\rightarrow$ `InvalidBattery` | Số nguyên trong đoạn `[0, 100]` | `-1`, `0`, `1`, `99`, `100`, `101` |
| **Ngưỡng xe đủ điều kiện cho thuê (`isRentable` — UC02/UC03)** | `batteryPercent in [0, 19]`, hoặc `ownership = Private`, hoặc `status != Available`, hoặc có sự cố/phiếu giữ/chuyến đi | `ownership = Shared`, `status = Available`, `batteryPercent in [20, 100]`, đang đỗ tại Hub hoạt động, không có sự cố mở | `19%` (`false`), `20%` (`true`), `21%` (`true`), `100%` (`false` nếu `Private`) |
| **Ngưỡng sạc khẩn cấp (`ChargingRequest.isUrgent` — FR-NI04)** | `< 0` hoặc `> 100` $\rightarrow$ `InvalidBattery`; `[10, 100]` $\rightarrow$ `false` (sạc thường) | `[0, 9]` $\rightarrow$ `true` (kích hoạt tái lập lịch ưu tiên tức thì) | `0%` (`true`), `9%` (`true`), `10%` (`false`), `11%` (`false`) |
| **Ngưỡng điều chuyển xe (`UC10` — `RedistributionService`)** | `batteryPercent in [0, 79]`, hoặc `ownership = Private`, hoặc `sourceHub == destinationHub` | `ownership = Shared`, `status = Available`, `batteryPercent in [80, 100]`, Hub đích còn chỗ trống | `50%` (thuê được nhưng không điều chuyển được), `79%` (`false`), `80%` (`true`) |
| **Hạn giữ xe (`VehicleReservation.calculateExpiry` — UC03/FR-NI01)** | `reservedAt` rỗng/sai định dạng $\rightarrow$ `InvalidTime`; `now < reservedAt + 15m` $\rightarrow$ `expire(now) = false` | `expiresAt = reservedAt + 15 phút`; `now >= expiresAt` $\rightarrow$ `expire(now) = true` | `10:14:59` (`false`), `10:15:00` (`true`), `10:15:01` (`true`) với `reservedAt = 10:00:00` |
| **Hạn giữ chỗ đỗ (`ParkingReservation.calculateExpiry` — UC06/BR08)** | `scheduledArrivalAt` sai $\rightarrow$ `InvalidTime`; `now < scheduledArrivalAt + 30m` $\rightarrow$ `expire(now) = false` | `expiresAt = scheduledArrivalAt + 30 phút`; `now >= expiresAt` $\rightarrow$ `expire(now) = true` | `10:15:00` (`false` — chứng minh không dùng nhầm công thức 15p), `10:29:59` (`false`), `10:30:00` (`true`) |
| **Ngân sách công suất sạc tại Hub (`powerLimitKW` — UC07/UC12)** | Tổng `allocatedPowerKW + newPowerKW > powerLimitKW` (85% công suất định mức) $\rightarrow$ xếp hàng đợi `Queued` | Tổng `allocatedPowerKW <= powerLimitKW` và `allocatedPowerKW <= point.ratedPowerKW` | `84.9%`, `85.0%` (cấp phát thành công), `85.1%` (chuyển vào hàng đợi) |
| **Tham số `PartialChargerFailure` (`SimulationScenario.validate` — UC13)** | `failedPointIds` rỗng (`size = 0`), chứa ID không thuộc Hub đích, hoặc bằng tổng số trụ của Hub (`size = N`) | `1 <= len(failedPointIds) <= N - 1`, mọi ID đều tồn tại tại `targetHubId` | `0` trụ (`false`), `1` trụ (`true`), `N - 1` trụ (`true`), `N` trụ (`false`) |
| **Chỉ số kết quả mô phỏng (`SimulationRun.complete` — UC13/UC14)** | `serviceSuccessRate < 0` hoặc `> 1`, `averageWaitMinutes < 0`, `rejectedTripCount < 0`, hoặc `result` đã thuộc `run` khác | `serviceSuccessRate in [0.0, 1.0]`, `averageWaitMinutes >= 0.0`, `rejectedTripCount >= 0` | `0.0`, `1.0`, `-0.01` (`InvalidResult`), `1.01` (`InvalidResult`) |

---

## 2. ĐẶC TẢ KIỂM THỬ ĐƠN VỊ CHO 18 PHƯƠNG THỨC LỚP MIỀN (UNIT TEST CASES — SLIDE CH9 P.20–26)

Mục này bao phủ **100% (18/18) phương thức** đã thiết kế trong [`CLASS_CATALOG.md`](CLASS_CATALOG.md) và [`METHOD_DESCRIPTIONS.md`](METHOD_DESCRIPTIONS.md) với **54 kịch bản kiểm thử đơn vị (`UT-01` – `UT-54`, đúng 3 test cases cho mỗi phương thức: Valid / Boundary / Invalid-Error)**.

### 2.1. `UserAccount.hasRole` (`+hasRole(role : UserRole) : Boolean`)
| Mã TC | Phân loại (EP/BVA) | Tiền điều kiện & Trạng thái Đối tượng | Đầu vào (Inputs) | Kết quả Kỳ vọng (Expected Output & Postconditions) |
| :--- | :--- | :--- | :--- | :--- |
| **UT-01** | Valid Partition | `UserAccount(accountId="ACC-01", roles={Student})` | `role = UserRole.Student` | Trả về `true`; không làm thay đổi tập `roles`. |
| **UT-02** | Boundary (Dual-role & Non-member) | `UserAccount("ACC-02", roles={Student})` và `UserAccount("ACC-03", roles={Student, Operator})` | Kiểm tra `Operator` trên `ACC-02` và cả 2 vai trò trên `ACC-03` | `ACC-02.hasRole(Operator) == false`; `ACC-03.hasRole(Student) == true` và `ACC-03.hasRole(Operator) == true`. |
| **UT-03** | Invalid / Error | `UserAccount("ACC-01", roles={Student})` | `role = "Admin"` (giá trị ngoài enum `UserRole`) | Phát sinh lỗi `InvalidRole`; trạng thái tài khoản giữ nguyên. |

### 2.2. `ElectricVehicle.updateBattery` (`+updateBattery(percent : Integer) : void`)
| Mã TC | Phân loại (EP/BVA) | Tiền điều kiện & Trạng thái Đối tượng | Đầu vào (Inputs) | Kết quả Kỳ vọng (Expected Output & Postconditions) |
| :--- | :--- | :--- | :--- | :--- |
| **UT-04** | Valid Partition | `ElectricBicycle("EV-01", batteryPercent=50, status=Available, ownership=Shared)` | `percent = 85` | Cập nhật `batteryPercent == 85`; `status` và `ownership` không đổi. |
| **UT-05** | Boundary (`0` và `100`) | `ElectricMotorcycle("EV-02", batteryPercent=40, status=InUse, ownership=Shared)` | Lần lượt gọi `updateBattery(0)` và `updateBattery(100)` | Chấp nhận cả hai biên: `batteryPercent == 0` rồi `batteryPercent == 100`; không tự ý đổi `status` hay `ownership`. |
| **UT-06** | Invalid (`-1`, `101`, `55.5`) | `ElectricBicycle("EV-01", batteryPercent=50)` | `percent = -1`, `percent = 101`, `percent = 55.5` | Phát sinh lỗi `InvalidBattery` ở cả 3 lần gọi; `batteryPercent` giữ nguyên giá trị `50` (không cập nhật dở dang). |

### 2.3. `ElectricVehicle.isRentable` (`+isRentable() : Boolean`)
| Mã TC | Phân loại (EP/BVA) | Tiền điều kiện & Trạng thái Đối tượng | Đầu vào (Inputs) | Kết quả Kỳ vọng (Expected Output & Postconditions) |
| :--- | :--- | :--- | :--- | :--- |
| **UT-07** | Valid & Boundary (`20%` vs `19%`) | Xe dùng chung `ElectricBicycle("EV-01", ownership=Shared, status=Available)`, đỗ tại Hub hoạt động, không có phiếu giữ/chuyến đi/sự cố | Kiểm tra tại `batteryPercent = 20` và `batteryPercent = 19` | Tại `20%` trả về `true`; tại `19%` trả về `false`; không tạo phiếu giữ xe. |
| **UT-08** | Invariant (Private Vehicle & Active Hold/Incident) | (a) Xe cá nhân `ElectricMotorcycle("PM-01", ownership=Private, batteryPercent=100, status=Available)`; (b) Xe dùng chung `EV-02` đang có sự cố `Open` hoặc phiếu giữ active | Gọi `isRentable()` trên cả 2 xe | Cả hai đều trả về `false` (xe cá nhân không bao giờ được cho thuê kể cả khi pin `100%`). |
| **UT-09** | Error (`InconsistentState`) | Xe dùng chung `EV-03` có `status=Available` nhưng thiếu ngữ cảnh vị trí/trạng thái phân bổ bị hỏng (`currentHub = null` khi `status = Available`) | Gọi `isRentable()` | Phát sinh lỗi `InconsistentState`. |

### 2.4. `MobilityHub.availableParkingCount` (`+availableParkingCount() : Integer`)
| Mã TC | Phân loại (EP/BVA) | Tiền điều kiện & Trạng thái Đối tượng | Đầu vào (Inputs) | Kết quả Kỳ vọng (Expected Output & Postconditions) |
| :--- | :--- | :--- | :--- | :--- |
| **UT-10** | Valid Partition (Mixed Slot States) | `MobilityHub("HUB-METRO")` có 5 slot: 2 `Available` (trống, không bị giữ), 1 `Occupied`, 1 `Held` (bởi `ParkingReservation` hoặc `TransferOrder`), 1 `Suspended` | Gọi `availableParkingCount()` | Trả về đúng `2`; không thay đổi trạng thái bất kỳ slot nào. |
| **UT-11** | Boundary (`0` trống — Full Parking) | Tất cả các slot tại `HUB-METRO` đều đang `Occupied` hoặc `Held` | Gọi `availableParkingCount()` | Trả về `0`. |
| **UT-12** | Error (`InconsistentState`) | Danh mục slot của Hub đang ở trạng thái không nhất quán (một slot vừa đánh dấu `Available` vừa có `occupant != null`) | Gọi `availableParkingCount()` | Phát sinh lỗi `InconsistentState`. |

### 2.5. `ParkingSlot.canAccept` (`+canAccept(vehicle : ElectricVehicle) : Boolean`)
| Mã TC | Phân loại (EP/BVA) | Tiền điều kiện & Trạng thái Đối tượng | Đầu vào (Inputs) | Kết quả Kỳ vọng (Expected Output & Postconditions) |
| :--- | :--- | :--- | :--- | :--- |
| **UT-13** | Valid Partition (Shared & Private) | `ParkingSlot("S-01", status=Available, occupant=null)`, không có phiếu giữ xung đột; xe `EV-01` (hoặc xe cá nhân `PM-01`) chưa chiếm slot khác | `vehicle = EV-01` | Trả về `true`; chưa thực hiện check-in hay gán `occupant`. |
| **UT-14** | Boundary / Rejected (Slot Held/Occupied or Vehicle Already Parked) | (a) `S-02` có `status=Held` hoặc `Occupied`; (b) `S-01` `Available` nhưng `EV-01` đang chiếm `S-09` | Gọi `canAccept(EV-01)` | Trả về `false` cho cả (a) và (b). |
| **UT-15** | Error (`InvalidVehicle`) | `ParkingSlot("S-01", status=Available)` | `vehicle = null` | Phát sinh lỗi `InvalidVehicle`. |

### 2.6. `ChargingPoint.canServe` (`+canServe(vehicle : ElectricVehicle) : Boolean`)
| Mã TC | Phân loại (EP/BVA) | Tiền điều kiện & Trạng thái Đối tượng | Đầu vào (Inputs) | Kết quả Kỳ vọng (Expected Output & Postconditions) |
| :--- | :--- | :--- | :--- | :--- |
| **UT-16** | Valid Partition (Shared & Private Compatible) | `ChargingPoint("CP-01", status=Available, connector="TYPE2")` tại `HUB-BK`; xe cá nhân `PM-01` (`connector="TYPE2"`) đang đỗ tại `HUB-BK`, không có sự cố | `vehicle = PM-01` | Trả về `true`; không tự động mở phiên sạc. |
| **UT-17** | Boundary / Rejected (Connector Mismatch, Different Hub, or Faulty Point) | (a) Xe khác chuẩn kết nối (`connector="CCS"`); (b) Xe đang ở `HUB-METRO`; (c) Trụ `CP-01` đang `Faulty` | Gọi `canServe(vehicle)` | Trả về `false` trong cả 3 trường hợp (trụ hỏng nhưng cùng chuẩn cắm vẫn trả về `false`). |
| **UT-18** | Error (`InvalidVehicle`) | `ChargingPoint("CP-01", status=Available)` | `vehicle = null` | Phát sinh lỗi `InvalidVehicle`. |

### 2.7. `Reservation.cancel` (`+cancel() : void`)
| Mã TC | Phân loại (EP/BVA) | Tiền điều kiện & Trạng thái Đối tượng | Đầu vào (Inputs) | Kết quả Kỳ vọng (Expected Output & Postconditions) |
| :--- | :--- | :--- | :--- | :--- |
| **UT-19** | Valid Partition | `VehicleReservation("RES-01", status=Reserved)` đang giữ xe `EV-01` (`status=Reserved`) | Gọi `RES-01.cancel()` | `RES-01.status == Cancelled`; giải phóng quyền giữ trên `EV-01` (`EV-01.status == Available`); lưu giữ lịch sử phiếu đặt. |
| **UT-20** | Boundary (Idempotent Repeat Cancel & Faulty Target Preservation) | (a) Gọi `cancel()` lần 2 trên `RES-01` đã `Cancelled`; (b) Hủy phiếu giữ trên xe đang bị đánh dấu `Faulty` | Gọi `cancel()` | (a) Thao tác idempotent (không báo lỗi); (b) Giải phóng hold nhưng xe `Faulty` vẫn giữ nguyên `status=Faulty` (không bị bật nhầm sang `Available`). |
| **UT-21** | Error (`InvalidTransition`) | Phiếu đặt `RES-02` đã ở trạng thái `Fulfilled` (sinh viên đã nhận xe) hoặc `Expired` | Gọi `RES-02.cancel()` | Phát sinh lỗi `InvalidTransition`; tuyệt đối không giải phóng xe đang được sử dụng. |

### 2.8. `Reservation.expire` (`+expire(now : DateTime) : Boolean`)
| Mã TC | Phân loại (EP/BVA) | Tiền điều kiện & Trạng thái Đối tượng | Đầu vào (Inputs) | Kết quả Kỳ vọng (Expected Output & Postconditions) |
| :--- | :--- | :--- | :--- | :--- |
| **UT-22** | Valid Partition (`now >= expiresAt`) | `VehicleReservation("RES-01", status=Reserved, reservedAt=10:00, expiresAt=10:15)` giữ xe `EV-01` | `now = 10:15:00` (đúng tại biên hết hạn) | Trả về `true`; `RES-01.status == Expired`; giải phóng hold để `EV-01` về `Available`. |
| **UT-23** | Boundary (`now < expiresAt` & Already `Fulfilled`) | (a) `RES-01` đang `Reserved` tại `now = 10:14:59`; (b) `RES-02` đã `Fulfilled` (đã nhận xe lúc `10:05`) nhưng quét trễ tại `now = 10:20:00` | Gọi `expire(now)` | Cả (a) và (b) đều trả về `false`; ở (b) xe đang chạy (`InUse`) không bị thu hồi nhầm. |
| **UT-24** | Error (`InvalidTime`) | `VehicleReservation("RES-01", status=Reserved)` | `now = null` | Phát sinh lỗi `InvalidTime`; trạng thái giữ nguyên. |

### 2.9. `Reservation.calculateExpiry` (`+calculateExpiry() : DateTime` — *abstract*)
| Mã TC | Phân loại (EP/BVA) | Tiền điều kiện & Trạng thái Đối tượng | Đầu vào (Inputs) | Kết quả Kỳ vọng (Expected Output & Postconditions) |
| :--- | :--- | :--- | :--- | :--- |
| **UT-25** | Valid Polymorphic Dispatch | Tập hợp gồm 1 `VehicleReservation(reservedAt=10:00)` và 1 `ParkingReservation(scheduledArrivalAt=10:00)` được tham chiếu qua kiểu cha `Reservation` | Gọi đa hình `r.calculateExpiry()` | Trả về `10:15` cho `VehicleReservation` và `10:30` cho `ParkingReservation`; không làm thay đổi trạng thái đối tượng. |
| **UT-26** | Boundary (Pure Function Idempotence) | Cùng một đối tượng `Reservation` hợp lệ | Gọi `calculateExpiry()` liên tiếp 2 lần | Hai lần trả về cùng một mốc `DateTime` chính xác như nhau; không phát sinh thông báo hay giải phóng tài nguyên. |
| **UT-27** | Error (Direct Abstract Instantiation Prohibited) | Thử khởi tạo trực tiếp lớp trừu tượng `Reservation` | `new Reservation(...)` | Bị từ chối khởi tạo trực tiếp (`TypeError` / `AbstractInstantiationError`). |

### 2.10. `VehicleReservation.calculateExpiry` (`+calculateExpiry() : DateTime` — *override*)
| Mã TC | Phân loại (EP/BVA) | Tiền điều kiện & Trạng thái Đối tượng | Đầu vào (Inputs) | Kết quả Kỳ vọng (Expected Output & Postconditions) |
| :--- | :--- | :--- | :--- | :--- |
| **UT-28** | Valid Partition | `VehicleReservation` có `reservedAt = 2026-11-04T10:00:00+07:00` | Gọi `calculateExpiry()` | Trả về đúng `2026-11-04T10:15:00+07:00` (`+15 phút`). |
| **UT-29** | Boundary (Day Rollover) | `VehicleReservation` có `reservedAt = 2026-11-04T23:50:00+07:00` | Gọi `calculateExpiry()` | Trả về `2026-11-05T00:05:00+07:00` (chuyển ngày chính xác). |
| **UT-30** | Error (`InvalidTime`) | `VehicleReservation` có `reservedAt = null` | Gọi `calculateExpiry()` | Phát sinh lỗi `InvalidTime`. |

### 2.11. `ParkingReservation.calculateExpiry` (`+calculateExpiry() : DateTime` — *override*)
| Mã TC | Phân loại (EP/BVA) | Tiền điều kiện & Trạng thái Đối tượng | Đầu vào (Inputs) | Kết quả Kỳ vọng (Expected Output & Postconditions) |
| :--- | :--- | :--- | :--- | :--- |
| **UT-31** | Valid Partition | `ParkingReservation` đặt lúc `09:00` với `scheduledArrivalAt = 2026-11-04T10:00:00+07:00` | Gọi `calculateExpiry()` | Trả về `2026-11-04T10:30:00+07:00` (`scheduledArrivalAt + 30 phút`, không tính từ `09:00` và không dùng công thức 15 phút). |
| **UT-32** | Boundary (Day Rollover) | `ParkingReservation` có `scheduledArrivalAt = 2026-11-04T23:45:00+07:00` | Gọi `calculateExpiry()` | Trả về `2026-11-05T00:15:00+07:00`. |
| **UT-33** | Error (`InvalidTime`) | `ParkingReservation` có `scheduledArrivalAt = null` | Gọi `calculateExpiry()` | Phát sinh lỗi `InvalidTime`. |

### 2.12. `Trip.complete` (`+complete(at : DateTime) : void`)
| Mã TC | Phân loại (EP/BVA) | Tiền điều kiện & Trạng thái Đối tượng | Đầu vào (Inputs) | Kết quả Kỳ vọng (Expected Output & Postconditions) |
| :--- | :--- | :--- | :--- | :--- |
| **UT-34** | Valid Partition | `Trip("TR-01", status=Active, pickedUpAt=10:05)` với xe `EV-01` (`status=InUse`), trả xe đã xác nhận vật lý vào `ParkingSlot("S-05", status=Available)` tại `HUB-KTXA` | `at = 10:25:00` | `TR-01.status == Completed`, `returnedAt == 10:25:00`, `returnHub == HUB-KTXA`; `S-05.status == Occupied`; `EV-01.currentHub == HUB-KTXA`, `EV-01.status == Available`. |
| **UT-35** | Boundary (Instant Return `at == pickedUpAt` & Incident/Low-Battery Preservation) | `TR-02` có `pickedUpAt = 10:05`, xe `EV-02` bị báo sự cố giữa chuyến (`UC11A`, đang có incident `Open`) | `at = 10:05:00` | Chuyến đi hoàn tất (`TR-02.status == Completed`), xe đỗ vào slot nhưng `EV-02.status` giữ ở trạng thái cô lập (`Faulty`), không bật sang `Available`. |
| **UT-36** | Error (`InvalidTime`, `ReturnNotConfirmed`, `CapacityConflict`) | `TR-01` đang `Active` với `pickedUpAt = 10:05` | (a) `at = 10:04:00` (`< pickedUpAt`); (b) Chưa xác nhận khóa xe tại dock; (c) Slot trả đã đầy/bị chiếm | Phát sinh lỗi tương ứng (`InvalidTime` / `ReturnNotConfirmed` / `CapacityConflict`); `TR-01` vẫn giữ `Active`. |

### 2.13. `ChargingRequest.isUrgent` (`+isUrgent() : Boolean`)
| Mã TC | Phân loại (EP/BVA) | Tiền điều kiện & Trạng thái Đối tượng | Đầu vào (Inputs) | Kết quả Kỳ vọng (Expected Output & Postconditions) |
| :--- | :--- | :--- | :--- | :--- |
| **UT-37** | Valid Partition (`< 10%`) | `ChargingRequest("CR-01", batteryAtRequest=5, status=Queued)` | Gọi `isUrgent()` | Trả về `true`. |
| **UT-38** | Boundary (`0%`, `9%`, `10%`, `100%`) | 4 yêu cầu sạc với `batteryAtRequest` lần lượt là `0`, `9`, `10`, `100` | Gọi `isUrgent()` trên từng yêu cầu | `0 -> true`, `9 -> true`, `10 -> false`, `100 -> false`. |
| **UT-39** | Error (`InvalidBattery`) | `ChargingRequest` có dữ liệu `batteryAtRequest = -5` hoặc `105` bị hỏng | Gọi `isUrgent()` | Phát sinh lỗi `InvalidBattery`. |

### 2.14. `ChargingSession.stop` (`+stop(at : DateTime) : void`)
| Mã TC | Phân loại (EP/BVA) | Tiền điều kiện & Trạng thái Đối tượng | Đầu vào (Inputs) | Kết quả Kỳ vọng (Expected Output & Postconditions) |
| :--- | :--- | :--- | :--- | :--- |
| **UT-40** | Valid Partition (Charging Satisfied) | `ChargingSession("CS-01", status=Active, startedAt=10:00, allocatedPowerKW=7.0)` trên `CP-01`; nhu cầu sạc đã đạt mục tiêu | `at = 10:40:00` (context: `reason = Satisfied`) | `CS-01.status == Completed`, `stoppedAt == 10:40:00`; `request.status == Completed`; giải phóng công suất và `CP-01.status == Available`. |
| **UT-41** | Boundary (User Early Stop vs Technical Fault Interruption) | (a) Sinh viên chủ động dừng sạc sớm (`UC07A`); (b) Trụ sạc gặp sự cố kỹ thuật (`UC11`) | Gọi `stop(10:20:00)` cho (a) và (b) | Cả (a) và (b) đặt `CS-01.status == Interrupted`; nhưng (a) đặt `request.status == Cancelled` (không tự động sạc lại), còn (b) đặt `request.status == Queued` (đưa lại vào hàng đợi) và giữ trụ ở trạng thái `Faulty`. |
| **UT-42** | Error (`InvalidTime` / `StopNotConfirmed` / `InvalidTransition`) | `CS-01` có `startedAt = 10:00` | `at = 09:59:00` hoặc chưa xác nhận ngắt điện hoặc phiên đã `Completed` | Phát sinh lỗi `InvalidTime` / `StopNotConfirmed` / `InvalidTransition`; không giải phóng giả tạo tài nguyên. |

### 2.15. `TransferOrder.complete` (`+complete(at : DateTime) : void`)
| Mã TC | Phân loại (EP/BVA) | Tiền điều kiện & Trạng thái Đối tượng | Đầu vào (Inputs) | Kết quả Kỳ vọng (Expected Output & Postconditions) |
| :--- | :--- | :--- | :--- | :--- |
| **UT-43** | Valid Partition | `TransferOrder("TO-01", status=InTransit, dispatchedAt=10:00)` vận chuyển `[EV-01, EV-02]` từ `HUB-KTXA` sang `HUB-METRO` (đã giữ 2 slot đích) | `at = 10:20:00` | `TO-01.status == Completed`, `completedAt == 10:20:00`; cả 2 xe được gán vào 2 slot tại `HUB-METRO` và chuyển về `Available`. |
| **UT-44** | Boundary (Battery Dropped During Transit < 80% & `at == dispatchedAt`) | Xe xuất phát lúc pin `82%` nhưng khi tới nơi pin còn `78%` (`< 80%`), `at = 10:00:00` | Gọi `TO-01.complete(10:00:00)` | Vẫn hoàn tất lệnh điều chuyển (`Completed`) vì ngưỡng `80%` chỉ kiểm tra lúc chọn/xuất phát, không từ chối xe đã tới đích. |
| **UT-45** | Error (`InvalidTransition` / `InvalidTime` / `ArrivalNotConfirmed`) | (a) Lệnh đang ở trạng thái `Planned` (chưa xuất phát); (b) `at < dispatchedAt`; (c) Chưa xác nhận xe tới đích | Gọi `complete(at)` | Phát sinh lỗi tương ứng; giữ nguyên trạng thái lệnh và các slot đang giữ. |

### 2.16. `OperationalIncident.resolve` (`+resolve(at : DateTime) : void`)
| Mã TC | Phân loại (EP/BVA) | Tiền điều kiện & Trạng thái Đối tượng | Đầu vào (Inputs) | Kết quả Kỳ vọng (Expected Output & Postconditions) |
| :--- | :--- | :--- | :--- | :--- |
| **UT-46** | Valid Partition | `OperationalIncident("INC-01", status=Investigating, reportedAt=09:00, affectedVehicle=EV-01, affectedPoint=null)`, Operator đã xác minh sửa chữa xong | `at = 11:00:00` | `INC-01.status == Resolved`, `resolvedAt == 11:00:00`; nếu không còn incident mở nào khác, `IncidentService` khôi phục `EV-01` về `Available`. |
| **UT-47** | Boundary (Another Unresolved Incident Exists on Same Target) | `EV-01` có 2 sự cố `INC-01` và `INC-02` cùng đang mở; Operator đóng `INC-01` tại `at = 09:00:00` (`== reportedAt`) | Gọi `INC-01.resolve(09:00:00)` | `INC-01.status == Resolved`, nhưng `EV-01` vẫn giữ trạng thái cô lập (`Faulty`) vì `INC-02` chưa được giải quyết. |
| **UT-48** | Error (`RecoveryNotVerified` / `InvalidTarget` / `InvalidTime`) | (a) Chưa xác minh bảo trì; (b) Vi phạm XOR (gán cả `affectedVehicle` lẫn `affectedPoint`); (c) `at < reportedAt` | Gọi `resolve(at)` | Phát sinh lỗi `RecoveryNotVerified` / `InvalidTarget` / `InvalidTime`; không đóng sự cố. |

### 2.17. `SimulationScenario.validate` (`+validate() : Boolean`)
| Mã TC | Phân loại (EP/BVA) | Tiền điều kiện & Trạng thái Đối tượng | Đầu vào (Inputs) | Kết quả Kỳ vọng (Expected Output & Postconditions) |
| :--- | :--- | :--- | :--- | :--- |
| **UT-49** | Valid Partition (All 5 `ScenarioType` Shapes) | Snapshot mạng lưới có `HUB-METRO` (4 trụ sạc `CP-1..CP-4`, đội xe 100 chiếc) | Kiểm tra 5 kịch bản: `MetroSurge(arrivalsPerHour=120)`, `FullParking(occupancyPercent=100)`, `ChargingDemandSurge(chargingRequestsPerHour=40)`, `PartialChargerFailure(failedPointIds={"CP-1","CP-2"})`, `VehicleClustering(clusteredVehicleCount=60)` với `durationMinutes=60` | Cả 5 kịch bản đều trả về `true`; không làm thay đổi trạng thái mạng lưới thật. |
| **UT-50** | Boundary (`PartialChargerFailure` & `FullParking` & `VehicleClustering` Bounds) | Snapshot có 4 trụ sạc tại `HUB-METRO`, đội xe 100 chiếc | (a) `failedPointIds` có `1` trụ vs `3` trụ (`N-1`) vs `4` trụ (`N`) vs `0` trụ; (b) `FullParking(occupancyPercent=99)`; (c) `VehicleClustering(100)` vs `VehicleClustering(101)` | `1` trụ và `3` trụ trả về `true`; `0` trụ và `4` trụ trả về `false`; `occupancyPercent=99` trả về `false`; `clusteredVehicleCount=100` trả về `true`, `101` trả về `false`. |
| **UT-51** | Error / Invalid (`MissingSnapshotContext` & Unknown Hub/Duration `<= 0`) | (a) `durationMinutes = 0` hoặc `targetHubId = "HUB-UNKNOWN"`; (b) Thiếu `NetworkSnapshot` trong context | Gọi `validate()` | (a) Trả về `false`; (b) Phát sinh lỗi `MissingSnapshotContext`. |

### 2.18. `SimulationRun.complete` (`+complete(result : SimulationResult) : void`)
| Mã TC | Phân loại (EP/BVA) | Tiền điều kiện & Trạng thái Đối tượng | Đầu vào (Inputs) | Kết quả Kỳ vọng (Expected Output & Postconditions) |
| :--- | :--- | :--- | :--- | :--- |
| **UT-52** | Valid Partition | `SimulationRun("RUN-01", status=Running, result=null)` với `SimulationResult("RES-01", serviceSuccessRate=0.82, averageWaitMinutes=4.5, rejectedTripCount=12)` và 2 khuyến nghị điều phối | Gọi `RUN-01.complete(RES-01)` | `RUN-01.status == Completed`, `RUN-01.result == RES-01`; các khuyến nghị thuộc quyền sở hữu độc quyền (composition) của `RES-01`; dữ liệu thật không bị thay đổi. |
| **UT-53** | Boundary (Zero-Attempt Convention `[0.0, 0.0, 0]` & `1.0` Rate) | `RUN-02` đang `Running` | `SimulationResult("RES-02", serviceSuccessRate=0.0, averageWaitMinutes=0.0, rejectedTripCount=0)` và `serviceSuccessRate=1.0` | Chấp nhận cả hai biên `0.0` và `1.0`. |
| **UT-54** | Error (`InvalidResult`, `ResultAlreadyOwned`, `InvalidTransition`) | (a) `serviceSuccessRate = 1.05` hoặc `averageWaitMinutes = -1.0`; (b) `result` đã gắn vào `RUN-01`; (c) `SimulationRun` đang ở trạng thái `Failed` hoặc `Pending` | Gọi `complete(result)` | Phát sinh lỗi `InvalidResult` / `ResultAlreadyOwned` / `InvalidTransition`; run `Failed`/`Pending` vẫn giữ `result == null`. |


---

## 3. ĐẶC TẢ KIỂM THỬ CA SỬ DỤNG & TƯƠNG TÁC HỆ THỐNG (USE-CASE / SYSTEM TEST CASES — SLIDE CH9 P.53–54)

Theo **Slide Ch9 trang 53 & 54** (*USE-CASE TESTING – TEST CASE*), mỗi ca sử dụng đều kéo theo sự tương tác qua lại giữa nhiều thành phần trên Sequence Diagram (`SQ01`–`SQ07`) và màn hình giao diện (`03_App/01_UI_UX/`). Toàn bộ **24 kịch bản kiểm thử hệ thống (`SUC-01` – `SUC-24`)** dưới đây tuân thủ **100% mẫu bảng 8 trường chuẩn tại Slide Ch9 trang 53**:
`Test case` | `Test description` | `Related screens` | `Pre-conditions` | `Actions` | `Inputs` | `Expected Outputs` | `Testing environment`.

---

### 3.1. Phân hệ Sinh viên (`UC01` – `UC07` & Các Ca Phụ Vòng Đời `UC06A`, `UC06B`, `UC07A`, `UC11A`)

#### `SUC-01` — `UC01`: Tìm kiếm Mobility Hub gần ga Metro và lọc theo chỗ đỗ/trụ sạc
| Trường chuẩn Slide Ch9 p.53 | Nội dung chi tiết |
| :--- | :--- |
| **Test case** | `SUC-01` (`UC01`) Search Mobility Hub by destination and resource filter |
| **Test description** | Sinh viên tìm kiếm trạm Mobility Hub quanh khu vực Ga Metro ĐHQG và lọc các Hub còn xe dùng chung hoặc còn vị trí đỗ trống. |
| **Related screens** | `user-app.html`: `Screen 1 (home.png)` $\rightarrow$ `Screen 2 (map.png)` |
| **Pre-conditions** | 1. Tài khoản sinh viên `ACC-STU01` (`UserRole.Student`) đã đăng nhập.<br>2. `HUB-METRO` có `availableParkingCount() == 8`, 12 xe dùng chung khả dụng; `HUB-KTXA` có `availableParkingCount() == 0` (đầy chỗ). |
| **Actions** | 1. Màn hình `home.png` hiển thị thanh tìm kiếm và bản đồ mạng lưới Hub.<br>2. Sinh viên nhập từ khóa `"Metro"` hoặc chọn bộ lọc `"Còn chỗ đỗ"` trên `map.png`.<br>3. Hệ thống truy vấn danh sách `MobilityHub` và gọi `availableParkingCount()`.<br>4. Màn hình `map.png` làm nổi bật thẻ trạm `HUB-METRO` kèm số lượng xe, slot trống và cổng sạc. |
| **Inputs** | Từ khóa: `"Ga Metro ĐHQG"`, Bộ lọc: `hasAvailableParking = true` |
| **Expected Outputs** | Danh sách kết quả hiển thị `HUB-METRO` (8 chỗ đỗ trống, 12 xe khả dụng, 4 trụ sạc); ẩn hoặc gắn nhãn `"Hết chỗ đỗ"` đối với `HUB-KTXA`. |
| **Testing environment** | Web/Mobile UI Prototype (`user-app.html`) trên Chromium / Windows 10/11 |

#### `SUC-02` — `UC02`: Xem danh sách phương tiện khả dụng tại Hub và lọc loại trừ xe pin yếu/xe cá nhân
| Trường chuẩn Slide Ch9 p.53 | Nội dung chi tiết |
| :--- | :--- |
| **Test case** | `SUC-02` (`UC02`) View Available Vehicles with battery >= 20% filter |
| **Test description** | Sinh viên xem danh sách xe đạp điện và xe máy điện dùng chung tại `HUB-METRO`, hệ thống chỉ cho phép chọn xe thỏa `isRentable() == true`. |
| **Related screens** | `user-app.html`: `Screen 2 (map.png)` $\rightarrow$ `Screen 3 (vehicles.png)` |
| **Pre-conditions** | 1. Tại `HUB-METRO` có 3 xe: `EV-101` (`ElectricBicycle`, `Shared`, pin `85%`, `Available`), `EV-102` (`Shared`, pin `18%`, `Available`), `PM-201` (`ElectricMotorcycle`, `Private`, pin `100%`, `Available`). |
| **Actions** | 1. Sinh viên chạm vào trạm `HUB-METRO` trên `map.png`.<br>2. Chuyển sang màn hình `vehicles.png`.<br>3. `VehicleService` kiểm tra `isRentable()` trên từng xe tại Hub.<br>4. Giao diện hiển thị danh sách xe cho thuê. |
| **Inputs** | `hubId = "HUB-METRO"`, bộ lọc loại xe: `"Tất cả xe dùng chung"` |
| **Expected Outputs** | Chỉ `EV-101` (pin `85%`) có nút `"Đặt xe"` kích hoạt (`isRentable() == true`); `EV-102` (pin `18% < 20%`) bị vô hiệu hóa với nhãn `"Pin yếu"`; xe cá nhân `PM-201` không xuất hiện trong danh sách cho thuê. |
| **Testing environment** | Web/Mobile UI Prototype (`user-app.html`) trên Chromium / Windows 10/11 |

#### `SUC-03` — `UC03` (`SQ01`): Đặt giữ xe dùng chung thành công (Hạn giữ 15 phút)
| Trường chuẩn Slide Ch9 p.53 | Nội dung chi tiết |
| :--- | :--- |
| **Test case** | `SUC-03` (`UC03` / `SQ01`) Reserve shared electric vehicle on first attempt |
| **Test description** | Sinh viên đặt giữ trước một xe điện dùng chung đủ điều kiện tại `HUB-METRO` và nhận phiếu giữ xe có hiệu lực đúng 15 phút. |
| **Related screens** | `user-app.html`: `Screen 3 (vehicles.png)` $\rightarrow$ `Screen 4 (reserve.png)` $\rightarrow$ `Screen 5 (ticket.png)` |
| **Pre-conditions** | 1. Sinh viên `ACC-STU01` chưa có phiếu giữ xe hay chuyến đi nào đang mở.<br>2. Xe `EV-101` tại `HUB-METRO` có `isRentable() == true` (pin `85%`, `status = Available`). |
| **Actions** | 1. Trên `vehicles.png`, sinh viên chọn `EV-101`.<br>2. Màn hình `reserve.png` hiển thị thông tin xe, mức pin `85%` và thời gian giữ tối đa `15 phút`.<br>3. Sinh viên nhấn `"Xác nhận đặt xe"` lúc `10:00:00`.<br>4. `ReservationHub` kiểm tra nguyên tử `isRentable()`, tạo `VehicleReservation("VR-501")`, tính `expiresAt = calculateExpiry() = 10:15:00`, đổi `EV-101.status = Reserved`.<br>5. Màn hình `ticket.png` hiển thị mã QR phiếu đặt `VR-501` kèm đồng hồ đếm ngược `15:00`. |
| **Inputs** | `accountId = "ACC-STU01"`, `vehicleId = "EV-101"`, `reservedAt = 2026-11-04T10:00:00+07:00` |
| **Expected Outputs** | Phiếu `VR-501` có `status = Reserved`, `expiresAt = 10:15:00`; `EV-101.status = Reserved`; màn hình `ticket.png` đang hoạt động. |
| **Testing environment** | Web/Mobile UI Prototype (`user-app.html`) trên Chromium / Windows 10/11 |

#### `SUC-04` — `UC03` (`SQ01` Alt): Từ chối đặt xe khi xảy ra tranh chấp đồng thời hoặc sinh viên đã có phiếu giữ
| Trường chuẩn Slide Ch9 p.53 | Nội dung chi tiết |
| :--- | :--- |
| **Test case** | `SUC-04` (`UC03` Alt) Reject duplicate or concurrent vehicle reservation |
| **Test description** | Sinh viên thứ hai cố đặt cùng xe `EV-101` vừa được giữ (hoặc cùng sinh viên đặt chiếc xe thứ 2 khi đang có phiếu `VR-501` chưa hoàn tất). |
| **Related screens** | `user-app.html`: `Screen 4 (reserve.png)` |
| **Pre-conditions** | 1. `EV-101` vừa chuyển sang `status = Reserved` bởi `VR-501`. |
| **Actions** | 1. Sinh viên `ACC-STU02` đang mở màn hình `reserve.png` của `EV-101` và bấm `"Xác nhận đặt xe"`.<br>2. `ReservationHub` kiểm tra lại trạng thái thực tế trong giao dịch nguyên tử và phát hiện `EV-101.status == Reserved`.<br>3. Hệ thống từ chối yêu cầu và hiển thị thông báo lỗi trên `reserve.png`. |
| **Inputs** | `accountId = "ACC-STU02"`, `vehicleId = "EV-101"` |
| **Expected Outputs** | Lỗi `AllocationConflict`; không có phiếu đặt thứ hai nào được tạo cho `EV-101`; giao diện gợi ý chọn xe khác tại `HUB-METRO`. |
| **Testing environment** | Web/Mobile UI Prototype (`user-app.html`) trên Chromium / Windows 10/11 |

#### `SUC-05` — `UC04` (`SQ02`): Nhận xe tại Hub bằng mã QR phiếu đặt hợp lệ
| Trường chuẩn Slide Ch9 p.53 | Nội dung chi tiết |
| :--- | :--- |
| **Test case** | `SUC-05` (`UC04` / `SQ02`) Pick up reserved vehicle at Hub dock |
| **Test description** | Sinh viên đến `HUB-METRO` trước thời điểm hết hạn `10:15:00`, quét QR để mở khóa dock và bắt đầu hành trình (`Trip`). |
| **Related screens** | `user-app.html`: `Screen 5 (ticket.png)` $\rightarrow$ `Screen 6 (pickup.png)` $\rightarrow$ `Screen 7 (trip.png)` |
| **Pre-conditions** | 1. Phiếu đặt `VR-501` của `ACC-STU01` cho xe `EV-101` tại `ParkingSlot("S-01")` đang ở trạng thái `Reserved`, chưa quá hạn (`now = 10:05:00 < 10:15:00`).<br>2. Dock IoT `:StationIoTDock` phản hồi mở khóa thành công. |
| **Actions** | 1. Sinh viên mở `ticket.png` và chọn `"Quét QR Nhận xe"` chuyển sang `pickup.png`.<br>2. Sinh viên quét mã `QR-EV-101` tại trụ dock lúc `10:05:00`.<br>3. `:PickupController` gọi `:VehicleService` xác thực quyền sở hữu phiếu `VR-501` và gửi lệnh mở khóa tới `:StationIoTDock`.<br>4. Khi dock báo đã mở khóa, hệ thống cập nhật nguyên tử: `VR-501.status = Fulfilled`, giải phóng `S-01` (`status = Available`, `occupant = null`), đặt `EV-101.status = InUse` (`currentHub = null`, `currentSlot = null`) và khởi tạo `Trip("TR-901", status = Active, pickedUpAt = 10:05:00)`.<br>5. Màn hình `trip.png` hiển thị hành trình đang diễn ra. |
| **Inputs** | `reservationId = "VR-501"`, `qrCode = "QR-EV-101"`, `pickedUpAt = 10:05:00` |
| **Expected Outputs** | `VR-501.status == Fulfilled`, `TR-901.status == Active`, `S-01.status == Available`, `EV-101.status == InUse`; màn hình `trip.png` hiển thị thời gian di chuyển và mức pin `85%`. |
| **Testing environment** | Web/Mobile UI Prototype (`user-app.html`) trên Chromium / Windows 10/11 |

#### `SUC-06` — `UC05` (`SQ03`): Trả xe dùng chung thành công tại Hub đích còn chỗ đỗ
| Trường chuẩn Slide Ch9 p.53 | Nội dung chi tiết |
| :--- | :--- |
| **Test case** | `SUC-06` (`UC05` / `SQ03`) Return shared vehicle to destination Hub slot |
| **Test description** | Sinh viên hoàn tất chuyến đi và trả xe `EV-101` vào một vị trí đỗ trống tại `HUB-BK`. |
| **Related screens** | `user-app.html`: `Screen 7 (trip.png)` $\rightarrow$ `Screen 1 (home.png)` |
| **Pre-conditions** | 1. Chuyến đi `TR-901` của `ACC-STU01` với xe `EV-101` (pin còn `68%`) đang `Active`.<br>2. Tại `HUB-BK`, `ParkingSlot("S-BK03")` đang `Available` và cảm biến `:StationIoTDock` xác nhận xe đã đưa vào vị trí đỗ. |
| **Actions** | 1. Sinh viên đưa xe vào vị trí `S-BK03` tại `HUB-BK`.<br>2. Trên `trip.png`, sinh viên bấm `"Trả xe tại Hub"` lúc `10:25:00`.<br>3. `:ReturnController` và `:VehicleService` kiểm tra `S-BK03.canAccept(EV-101)` và xác nhận khóa vật lý từ `:StationIoTDock`.<br>4. Gọi `TR-901.complete(10:25:00)`: đặt `TR-901.status = Completed`, `returnHub = HUB-BK`, `returnedAt = 10:25:00`; cập nhật `S-BK03.status = Occupied` (`occupant = EV-101`) và `EV-101.status = Available` (`currentHub = HUB-BK`, `currentSlot = S-BK03`).<br>5. Hiển thị tóm tắt chuyến đi hoàn tất. |
| **Inputs** | `tripId = "TR-901"`, `returnHubId = "HUB-BK"`, `slotId = "S-BK03"`, `at = 10:25:00` |
| **Expected Outputs** | `TR-901.status == Completed`, `S-BK03.status == Occupied`, `EV-101.status == Available` tại `HUB-BK`; số chỗ trống của `HUB-BK` giảm 1. |
| **Testing environment** | Web/Mobile UI Prototype (`user-app.html`) trên Chromium / Windows 10/11 |

#### `SUC-07` — `UC05` (`SQ03` Alt): Điều hướng sang Hub thay thế khi Hub đích hết sạch chỗ đỗ
| Trường chuẩn Slide Ch9 p.53 | Nội dung chi tiết |
| :--- | :--- |
| **Test case** | `SUC-07` (`UC05` Alt) Redirect returning rider when destination Hub is full |
| **Test description** | Sinh viên muốn trả xe tại `HUB-KTXA` nhưng toàn bộ vị trí đỗ tại đó đã đầy (`availableParkingCount() == 0`) và sinh viên chưa có phiếu đặt chỗ đỗ trước. |
| **Related screens** | `user-app.html`: `Screen 7 (trip.png)` $\rightarrow$ `Screen 8 (parking.png)` |
| **Pre-conditions** | 1. `TR-901` đang `Active`.<br>2. `HUB-KTXA.availableParkingCount() == 0`; trạm lân cận `HUB-KTXB` còn `6` chỗ trống. |
| **Actions** | 1. Sinh viên chọn trả xe tại `HUB-KTXA` trên `trip.png`.<br>2. `:VehicleService` phát hiện không còn slot `Available` tại `HUB-KTXA` (`CapacityConflict`).<br>3. Hệ thống từ chối kết thúc chuyến tại `HUB-KTXA`, giữ `TR-901.status = Active` và hiển thị gợi ý chuyển hướng sang `HUB-KTXB` kèm giữ chỗ ưu tiên. |
| **Inputs** | `tripId = "TR-901"`, `returnHubId = "HUB-KTXA"` |
| **Expected Outputs** | Báo lỗi `CapacityConflict`; `TR-901` vẫn giữ trạng thái `Active`; giao diện hiển thị lộ trình chuyển hướng sang `HUB-KTXB` (còn 6 slot trống). |
| **Testing environment** | Web/Mobile UI Prototype (`user-app.html`) trên Chromium / Windows 10/11 |

#### `SUC-08` — `UC06`: Đặt trước vị trí đỗ cho phương tiện cá nhân (Hạn giữ 30 phút tính từ giờ dự kiến đến)
| Trường chuẩn Slide Ch9 p.53 | Nội dung chi tiết |
| :--- | :--- |
| **Test case** | `SUC-08` (`UC06`) Reserve parking slot in advance for private electric motorcycle |
| **Test description** | Sinh viên đi xe máy điện cá nhân `PM-201` đặt trước 1 chỗ đỗ tại `HUB-BK` với giờ dự kiến đến `10:00:00` (hiệu lực giữ chỗ đến `10:30:00`). |
| **Related screens** | `user-app.html`: `Screen 8 (parking.png)` $\rightarrow$ `Screen 5 (ticket.png)` |
| **Pre-conditions** | 1. Sinh viên `ACC-STU01` sở hữu xe cá nhân `PM-201` (`ownership = Private`).<br>2. `ParkingSlot("S-BK05")` tại `HUB-BK` có `canAccept(PM-201) == true`. |
| **Actions** | 1. Sinh viên mở màn hình `parking.png`, chọn xe cá nhân `PM-201`, trạm `HUB-BK` và giờ dự kiến đến `10:00:00`.<br>2. Nhấn `"Đặt chỗ đỗ"` lúc `09:20:00`.<br>3. `ReservationHub` tạo `ParkingReservation("PR-601")`, gọi `calculateExpiry()` trả về `10:30:00` (`scheduledArrivalAt + 30m`), cập nhật `S-BK05.status = Held`.<br>4. Hiển thị phiếu đặt chỗ đỗ `PR-601` trên `ticket.png`. |
| **Inputs** | `accountId = "ACC-STU01"`, `vehicleId = "PM-201"`, `slotId = "S-BK05"`, `scheduledArrivalAt = 10:00:00` |
| **Expected Outputs** | `PR-601.status == Reserved`, `PR-601.expiresAt == 10:30:00`; `S-BK05.status == Held`; `HUB-BK.availableParkingCount()` giảm 1. |
| **Testing environment** | Web/Mobile UI Prototype (`user-app.html`) trên Chromium / Windows 10/11 |

#### `SUC-09` — `UC06A` & `UC06B`: Check-in và Check-out phương tiện điện cá nhân tại Hub
| Trường chuẩn Slide Ch9 p.53 | Nội dung chi tiết |
| :--- | :--- |
| **Test case** | `SUC-09` (`UC06A` & `UC06B`) Private vehicle check-in and check-out lifecycle |
| **Test description** | Sinh viên đưa xe cá nhân `PM-201` vào slot đã đặt `S-BK05` (Check-in `UC06A`), sau đó lấy xe rời trạm khi không còn phiên sạc mở (Check-out `UC06B`). |
| **Related screens** | `user-app.html`: `Screen 8 (parking.png)` & `Screen 5 (ticket.png)` |
| **Pre-conditions** | 1. Phiếu đặt chỗ `PR-601` cho `PM-201` tại `S-BK05` đang `Reserved` (`now = 10:10:00 <= 10:30:00`).<br>2. Khi check-out lúc `14:00:00`, xe `PM-201` không có phiên sạc `Active` hay yêu cầu sạc `Queued`. |
| **Actions** | 1. **Check-in (`UC06A`):** Sinh viên đỗ xe vào `S-BK05` và xác nhận check-in lúc `10:10:00`. `VehicleService` chuyển `PR-601.status = Fulfilled`, `S-BK05.status = Occupied` (`occupant = PM-201`), `PM-201.currentHub = HUB-BK`, `PM-201.currentSlot = S-BK05`.<br>2. **Check-out (`UC06B`):** Lúc `14:00:00`, sinh viên chọn `"Trả chỗ / Lấy xe cá nhân"`. `VehicleService` kiểm tra không có phiên sạc đang mở, giải phóng `S-BK05.status = Available` (`occupant = null`) và xóa `currentHub`/`currentSlot` của `PM-201` (vẫn bảo toàn lịch sử `PR-601 = Fulfilled`). |
| **Inputs** | Check-in: `reservationId = "PR-601"`, `checkInAt = 10:10:00`; Check-out: `vehicleId = "PM-201"`, `checkOutAt = 14:00:00` |
| **Expected Outputs** | Sau check-in: `PR-601.status == Fulfilled`, `S-BK05.status == Occupied`. Sau check-out: `S-BK05.status == Available`, `PR-601` vẫn giữ trạng thái lịch sử `Fulfilled`. |
| **Testing environment** | Web/Mobile UI Prototype (`user-app.html`) trên Chromium / Windows 10/11 |

#### `SUC-10` — `UC07` (`SQ04`): Đăng ký sạc thành công và cấp phát cổng sạc tương thích trong ngân sách điện 85%
| Trường chuẩn Slide Ch9 p.53 | Nội dung chi tiết |
| :--- | :--- |
| **Test case** | `SUC-10` (`UC07` / `SQ04`) Request charging and allocate compatible ChargingPoint |
| **Test description** | Sinh viên gửi yêu cầu sạc cho xe `PM-201` đang đỗ tại `HUB-BK`; hệ thống kiểm tra `canServe()` và ngân sách công suất `powerLimitKW` để mở `ChargingSession`. |
| **Related screens** | `user-app.html`: `Screen 9 (charging.png)` |
| **Pre-conditions** | 1. `PM-201` (`connector = "TYPE2"`, pin `25%`) đang đỗ tại `HUB-BK` (`powerLimitKW = 34.0 kW` = 85% của 40 kW; tải hiện tại `14.0 kW`).<br>2. `ChargingPoint("CP-BK01", status=Available, connector="TYPE2", ratedPowerKW=7.0)` rảnh và hoạt động tốt. |
| **Actions** | 1. Trên màn hình `charging.png`, sinh viên chọn xe `PM-201`, trụ `CP-BK01`, thời gian cần lấy xe `neededBy = 12:00:00` và bấm `"Đăng ký sạc"`.<br>2. `:ChargingController` chuyển yêu cầu cho `:ChargingScheduler`.<br>3. `:ChargingScheduler` xác nhận `CP-BK01.canServe(PM-201) == true` và tổng tải `14.0 + 7.0 = 21.0 kW <= 34.0 kW`.<br>4. Tạo `ChargingRequest("CR-701", status=Charging)` và `ChargingSession("CS-801", status=Active, allocatedPowerKW=7.0)`, đổi `CP-BK01.status = InUse`, `PM-201.status = Charging`. |
| **Inputs** | `accountId = "ACC-STU01"`, `vehicleId = "PM-201"`, `pointId = "CP-BK01"`, `batteryAtRequest = 25`, `neededBy = 12:00:00` |
| **Expected Outputs** | `CR-701.status == Charging`, `CS-801.status == Active` (`allocatedPowerKW == 7.0`), `CP-BK01.status == InUse`; màn hình `charging.png` hiển thị tiến trình đang sạc. |
| **Testing environment** | Web/Mobile UI Prototype (`user-app.html`) trên Chromium / Windows 10/11 |

#### `SUC-11` — `UC07A`: Sinh viên chủ động kết thúc phiên sạc sớm (Không tự động xếp lại hàng đợi)
| Trường chuẩn Slide Ch9 p.53 | Nội dung chi tiết |
| :--- | :--- |
| **Test case** | `SUC-11` (`UC07A`) Stop active charging session early by user request |
| **Test description** | Sinh viên chủ động bấm dừng phiên sạc `CS-801` khi xe `PM-201` đạt `70%` pin để lấy xe đi sớm. |
| **Related screens** | `user-app.html`: `Screen 9 (charging.png)` |
| **Pre-conditions** | 1. `ChargingSession("CS-801")` của `PM-201` trên `CP-BK01` đang `Active` (`startedAt = 10:15:00`).<br>2. Trụ `:SmartChargerIoT` xác nhận đã ngắt dòng sạc an toàn. |
| **Actions** | 1. Trên `charging.png`, sinh viên bấm `"Dừng sạc"` lúc `11:00:00`.<br>2. `:ChargingScheduler` xác nhận ngắt điện với `:SmartChargerIoT` và gọi `CS-801.stop(11:00:00)` với lý do người dùng hủy sớm.<br>3. Hệ thống đặt `CS-801.status = Interrupted`, `stoppedAt = 11:00:00`, đặt `CR-701.status = Cancelled` (tuyệt đối không tự động đưa lại vào hàng đợi `Queued`), giải phóng `CP-BK01.status = Available`. |
| **Inputs** | `sessionId = "CS-801"`, `at = 11:00:00`, `reason = "UserCancelled"` |
| **Expected Outputs** | `CS-801.status == Interrupted`, `CR-701.status == Cancelled`, `CP-BK01.status == Available`; lịch sử phiên `CS-801` vẫn được bảo toàn. |
| **Testing environment** | Web/Mobile UI Prototype (`user-app.html`) trên Chromium / Windows 10/11 |

#### `SUC-12` — `UC11A`: Sinh viên báo cáo sự cố phương tiện giữa chuyến đi (Không khóa cứng xe đang di chuyển)
| Trường chuẩn Slide Ch9 p.53 | Nội dung chi tiết |
| :--- | :--- |
| **Test case** | `SUC-12` (`UC11A`) Report vehicle incident during an active trip |
| **Test description** | Sinh viên đang chạy xe `EV-105` trong chuyến đi `TR-905` thì phát hiện phanh/đèn lỗi và gửi báo cáo sự cố ngay trên màn hình hành trình. |
| **Related screens** | `user-app.html`: `Screen 7 (trip.png)` $\rightarrow$ `operator-app.html`: `op-mobile-incidents.png` |
| **Pre-conditions** | 1. `Trip("TR-905", status=Active)` đang diễn ra với xe `EV-105` (`status=InUse`). |
| **Actions** | 1. Trên `trip.png`, sinh viên bấm `"Báo sự cố"`, nhập mô tả `"Phanh sau kêu bất thường"` lúc `10:18:00`.<br>2. `IncidentService` tạo `OperationalIncident("INC-301", status=Open, affectedVehicle=EV-105, affectedPoint=null)`.<br>3. Hệ thống gắn cờ cách ly cho `EV-105` để không ai đặt được sau khi trả xe, nhưng **không tự ý đóng chuyến `TR-905`** và **không khóa cứng động cơ khi xe đang chạy**. |
| **Inputs** | `tripId = "TR-905"`, `vehicleId = "EV-105"`, `description = "Phanh sau kêu bất thường"`, `reportedAt = 10:18:00` |
| **Expected Outputs** | `INC-301.status == Open` (`affectedVehicle == EV-105`), `TR-905.status` vẫn là `Active` cho đến khi sinh viên trả xe an toàn; khi `TR-905.complete()` chạy, `EV-105` chuyển thẳng sang `Faulty` thay vì `Available`. |
| **Testing environment** | Web/Mobile UI Prototype (`user-app.html` & `operator-app.html`) trên Chromium / Windows 10/11 |

---

### 3.2. Phân hệ Đơn vị Vận hành (`UC08` – `UC14` & Ca Phụ Điều Chuyển `UC10A`, `UC10B`)

#### `SUC-13` — `UC08`: Giám sát toàn mạng lưới Mobility Hub theo thời gian thực
| Trường chuẩn Slide Ch9 p.53 | Nội dung chi tiết |
| :--- | :--- |
| **Test case** | `SUC-13` (`UC08`) Monitor Mobility Hub network overview and telemetry updates |
| **Test description** | Operator theo dõi trạng thái toàn mạng lưới Hub, số lượng xe khả dụng, tỷ lệ lấp đầy bãi đỗ, tải công suất sạc và cảnh báo ngưỡng trên Dashboard. |
| **Related screens** | `operator-web.html`: `overview.png`; `operator-app.html`: `op-mobile-overview.png` |
| **Pre-conditions** | 1. Tài khoản `ACC-OP01` (`hasRole(Operator) == true`) đã đăng nhập.<br>2. `TelemetryService` đang nhận luồng dữ liệu từ 5 Hub (`HUB-METRO`, `HUB-KTXA`, `HUB-KTXB`, `HUB-BK`, `HUB-LIB`). |
| **Actions** | 1. Operator mở màn hình `overview.png`.<br>2. `TelemetryService` xử lý gói tin cập nhật mức pin hợp lệ (`EV-101.updateBattery(72)`) và tính lại `availableParkingCount()` của từng Hub.<br>3. Dashboard cập nhật thẻ chỉ số KPI, biểu đồ tỷ lệ lấp đầy và danh sách cảnh báo màu Xanh / Vàng / Đỏ. |
| **Inputs** | Gói tin telemetry: `{vehicleId: "EV-101", batteryPercent: 72, timestamp: "2026-11-04T10:30:00+07:00"}` |
| **Expected Outputs** | Màn hình `overview.png` và `op-mobile-overview.png` hiển thị đúng mức pin `72%` của `EV-101` và trạng thái sức chứa của cả 5 Hub trong vòng `<= 2 giây`. |
| **Testing environment** | Web/Mobile UI Prototype (`operator-web.html` & `operator-app.html`) trên Chromium / Windows 10/11 |

#### `SUC-14` — `UC09`: Quản trị tài nguyên xe, vị trí đỗ và cổng sạc (Tạm ngưng / Kích hoạt lại)
| Trường chuẩn Slide Ch9 p.53 | Nội dung chi tiết |
| :--- | :--- |
| **Test case** | `SUC-14` (`UC09`) Manage Mobility Hub resources and suspend unoccupied slot |
| **Test description** | Operator tạm khóa bảo trì một vị trí đỗ đang trống (`ParkingSlot`) và kiểm tra quy tắc từ chối tạm ngưng đối với slot đang có xe đỗ. |
| **Related screens** | `operator-web.html`: `resources.png`; `operator-app.html`: `op-mobile-resources.png` |
| **Pre-conditions** | 1. Operator `ACC-OP01` đang ở màn hình `resources.png` của `HUB-METRO`.<br>2. `S-04` đang `Available` (`occupant = null`); `S-05` đang `Occupied` (`occupant = EV-108`). |
| **Actions** | 1. Operator chọn `S-04` và bấm `"Tạm ngưng (Suspend)"` $\rightarrow$ `VehicleService` chuyển `S-04.status = Suspended`.<br>2. Operator thử chọn `S-05` (đang có xe đỗ) và bấm `"Tạm ngưng"` $\rightarrow$ hệ thống từ chối thao tác vì slot đang có xe chiếm dụng. |
| **Inputs** | Lệnh 1: `slotId = "S-04", action = "Suspend"`; Lệnh 2: `slotId = "S-05", action = "Suspend"` |
| **Expected Outputs** | `S-04.status == Suspended` và `HUB-METRO.availableParkingCount()` giảm 1; lệnh trên `S-05` bị chặn với thông báo lỗi `AllocationConflict`. |
| **Testing environment** | Web/Mobile UI Prototype (`operator-web.html` & `operator-app.html`) trên Chromium / Windows 10/11 |

#### `SUC-15` — `UC10` (`SQ05`): Tạo lệnh điều phối phương tiện giữa các Hub (Kiểm tra pin >= 80% và giữ chỗ Hub đích)
| Trường chuẩn Slide Ch9 p.53 | Nội dung chi tiết |
| :--- | :--- |
| **Test case** | `SUC-15` (`UC10` / `SQ05`) Create vehicle redistribution order between distinct Hubs |
| **Test description** | Operator tạo lệnh điều chuyển 3 xe dùng chung có mức pin `>= 80%` từ `HUB-KTXA` (đang dư xe) sang `HUB-METRO` (đang thiếu xe giờ cao điểm). |
| **Related screens** | `operator-web.html`: `redistribute.png`; `operator-app.html`: `op-mobile-redistribute.png` |
| **Pre-conditions** | 1. Tại `HUB-KTXA` có `EV-201` (`88%`), `EV-202` (`92%`), `EV-203` (`81%`) đều là xe `Shared`, `Available`; và `EV-204` (`50%`, không đủ ngưỡng 80%).<br>2. `HUB-METRO` có `availableParkingCount() == 5 >= 3`. |
| **Actions** | 1. Trên `redistribute.png`, Operator chọn Hub nguồn `HUB-KTXA`, Hub đích `HUB-METRO` và danh sách xe `[EV-201, EV-202, EV-203]`.<br>2. `:RebalanceController` gọi `RedistributionService` kiểm tra điều kiện: `sourceHub != destinationHub`, tất cả xe là `Shared`, `Available`, `batteryPercent >= 80%`, không có sự cố, và Hub đích đủ chỗ.<br>3. Hệ thống tạo `TransferOrder("TO-401", status=Planned)`, giữ 3 xe và giữ trước 3 slot đích tại `HUB-METRO`.<br>4. Nhân viên hiện trường xác nhận xuất phát trên `op-mobile-redistribute.png` lúc `10:30:00` $\rightarrow$ `TO-401.status = InTransit`, `dispatchedAt = 10:30:00`, giải phóng 3 slot tại `HUB-KTXA`, đặt 3 xe sang `status = InTransfer` (`currentHub = null`, `currentSlot = null`). |
| **Inputs** | `sourceHubId = "HUB-KTXA"`, `destinationHubId = "HUB-METRO"`, `vehicleIds = ["EV-201", "EV-202", "EV-203"]` |
| **Expected Outputs** | Lệnh `TO-401` chuyển từ `Planned` sang `InTransit`; `HUB-METRO.availableParkingCount()` giảm 3 (do đã giữ 3 slot đích); `EV-204` (`50%`) bị loại khỏi danh sách đủ điều kiện điều chuyển. |
| **Testing environment** | Web/Mobile UI Prototype (`operator-web.html` & `operator-app.html`) trên Chromium / Windows 10/11 |

#### `SUC-16` — `UC10A` & `UC10B`: Hoàn tất điều chuyển khi xe tới đích (`UC10A`) và Hủy lệnh khi chưa xuất phát (`UC10B`)
| Trường chuẩn Slide Ch9 p.53 | Nội dung chi tiết |
| :--- | :--- |
| **Test case** | `SUC-16` (`UC10A` & `UC10B`) Confirm transfer arrival or cancel planned transfer order |
| **Test description** | Kiểm thử (a) xác nhận đoàn xe của `TO-401` (`InTransit`) cập bến `HUB-METRO` và (b) hủy lệnh `TO-402` khi còn ở trạng thái `Planned`. |
| **Related screens** | `operator-app.html`: `op-mobile-redistribute.png`; `operator-web.html`: `redistribute.png` |
| **Pre-conditions** | 1. `TO-401` đang `InTransit` (`dispatchedAt = 10:30:00`) tới `HUB-METRO`.<br>2. `TO-402` đang ở trạng thái `Planned` (chưa xuất phát). |
| **Actions** | 1. **Nhánh `UC10A`:** Lúc `10:50:00`, nhân viên hiện trường bấm `"Xác nhận xe tới trạm"` cho `TO-401`. Hệ thống gọi `TO-401.complete(10:50:00)`: gán 3 xe vào 3 slot tại `HUB-METRO`, đổi trạng thái xe về `Available` và `TO-401.status = Completed`.<br>2. **Nhánh `UC10B`:** Operator bấm `"Hủy lệnh"` trên `TO-402` (`Planned`). Hệ thống đổi `TO-402.status = Cancelled`, trả xe nguồn về `Available` và giải phóng slot giữ tại Hub đích. (Nếu thử hủy `TO-401` khi đang `InTransit` thì bị từ chối `InvalidTransition`). |
| **Inputs** | `UC10A`: `orderId = "TO-401", at = 10:50:00`; `UC10B`: `orderId = "TO-402", action = "Cancel"` |
| **Expected Outputs** | `TO-401.status == Completed` (3 xe `Available` tại `HUB-METRO`); `TO-402.status == Cancelled` (giải phóng toàn bộ hold). |
| **Testing environment** | Web/Mobile UI Prototype (`operator-web.html` & `operator-app.html`) trên Chromium / Windows 10/11 |

#### `SUC-17` — `UC11` (`SQ06`): Xử lý sự cố cổng sạc hỏng, cô lập thiết bị và đóng sự cố sau bảo trì
| Trường chuẩn Slide Ch9 p.53 | Nội dung chi tiết |
| :--- | :--- |
| **Test case** | `SUC-17` (`UC11` / `SQ06`) Isolate faulty charging point, requeue interrupted session, and resolve incident |
| **Test description** | Khi trụ sạc `CP-BK01` báo lỗi phần cứng lúc đang sạc, hệ thống cô lập trụ ngay lập tức, chuyển phiên sạc sang `Interrupted`, đưa yêu cầu sạc về `Queued` để cấp sang trụ khác, và chỉ mở lại trụ sau khi `OperationalIncident.resolve()` thành công. |
| **Related screens** | `operator-web.html`: `incidents.png`; `operator-app.html`: `op-mobile-incidents.png` |
| **Pre-conditions** | 1. `CP-BK01` đang phục vụ phiên sạc `CS-802` của yêu cầu `CR-702`.<br>2. Trụ `CP-BK02` cùng chuẩn cắm tại `HUB-BK` đang `Available`. |
| **Actions** | 1. Cảm biến `:SmartChargerIoT` hoặc Operator báo lỗi quá nhiệt tại `CP-BK01` lúc `11:00:00`.<br>2. `:IncidentController` và `IncidentService` tạo `OperationalIncident("INC-302", status=Open, affectedPoint=CP-BK01, affectedVehicle=null)` (đảm bảo ràng buộc XOR).<br>3. Hệ thống cô lập `CP-BK01.status = Faulty`, gọi `CS-802.stop(11:00:00)` (`status = Interrupted`), đặt `CR-702.status = Queued` và tự động cấp phiên sạc mới `CS-803` trên trụ lành `CP-BK02`.<br>4. Kỹ thuật viên/Operator kiểm tra sửa chữa xong lúc `13:00:00` và gọi `INC-302.resolve(13:00:00)` $\rightarrow$ `INC-302.status = Resolved`, `CP-BK01.status = Available`. |
| **Inputs** | `pointId = "CP-BK01"`, `faultCode = "OVERHEAT"`, `reportedAt = 11:00:00`, `resolvedAt = 13:00:00` |
| **Expected Outputs** | Khi lỗi xảy ra: `CP-BK01.status == Faulty`, `CS-802.status == Interrupted` (giữ nguyên lịch sử), `CS-803.status == Active` trên `CP-BK02`. Sau khi `resolve()`: `INC-302.status == Resolved`, `CP-BK01.status == Available`. |
| **Testing environment** | Web/Mobile UI Prototype (`operator-web.html` & `operator-app.html`) trên Chromium / Windows 10/11 |

#### `SUC-18` — `UC12`: Lập lịch sạc thông minh theo mức độ ưu tiên pin yếu và giờ xuất phát gần
| Trường chuẩn Slide Ch9 p.53 | Nội dung chi tiết |
| :--- | :--- |
| **Test case** | `SUC-18` (`UC12`) Smart charging schedule prioritization under power limit |
| **Test description** | Operator kích hoạt/xem bảng lập lịch sạc thông minh tại `HUB-METRO` khi tổng công suất yêu cầu vượt `powerLimitKW` (85% công suất định mức). |
| **Related screens** | `operator-web.html`: `schedule.png`; `operator-app.html`: `op-mobile-schedule.png` |
| **Pre-conditions** | 1. `HUB-METRO` có `powerLimitKW = 14.0 kW` (chỉ đủ cấp đồng thời cho 2 trụ `7.0 kW`).<br>2. Hàng đợi có 3 yêu cầu sạc: `CR-A` (pin `8%`, `isUrgent() == true`, `neededBy = 11:30`), `CR-B` (pin `18%`, `neededBy = 10:45` — sắp có lịch dùng), `CR-C` (pin `65%`, `neededBy = 16:00`). |
| **Actions** | 1. Operator mở màn hình `schedule.png`.<br>2. `ChargingScheduler` đánh giá độ ưu tiên dựa trên `isUrgent()` (`< 10%`), mức pin hiện tại và thời점 `neededBy`.<br>3. Hệ thống cấp phát 2 trụ sạc cho `CR-A` và `CR-B` (tổng công suất `14.0 kW <= 14.0 kW`), giữ `CR-C` ở trạng thái `Queued` chờ lượt. |
| **Inputs** | Danh sách yêu cầu `[CR-A (8%), CR-B (18%, neededBy=10:45), CR-C (65%, neededBy=16:00)]`, `powerLimitKW = 14.0` |
| **Expected Outputs** | `CR-A` (khẩn cấp `< 10%`) và `CR-B` (sắp dùng) chuyển sang `Charging` trước; `CR-C` giữ `Queued`; tổng công suất cấp phát bằng đúng `14.0 kW` (không vượt ngân sách 85%). |
| **Testing environment** | Web/Mobile UI Prototype (`operator-web.html` & `operator-app.html`) trên Chromium / Windows 10/11 |

#### `SUC-19` — `UC13` (`SQ07`): Chạy mô phỏng What-if cho cả 5 kịch bản giả định trên bản chụp cô lập (`NetworkSnapshot`)
| Trường chuẩn Slide Ch9 p.53 | Nội dung chi tiết |
| :--- | :--- |
| **Test case** | `SUC-19` (`UC13` / `SQ07`) Run What-if Simulation across all 5 scenario types |
| **Test description** | Operator cấu hình và chạy thử nghiệm 5 kịch bản What-if (`MetroSurge`, `FullParking`, `ChargingDemandSurge`, `PartialChargerFailure`, `VehicleClustering`) mà không làm thay đổi dữ liệu vận hành thật. |
| **Related screens** | `operator-web.html`: `simulation.png`; `operator-app.html`: `op-mobile-simulation.png` |
| **Pre-conditions** | 1. Operator `ACC-OP01` đang mở màn hình `simulation.png`.<br>2. Mạng lưới thật có `HUB-METRO` (12 xe khả dụng, 8 slot trống, 4 trụ sạc). |
| **Actions** | 1. Operator chọn kịch bản `MetroSurge` (`targetHubId="HUB-METRO", durationMinutes=60, arrivalsPerHour=150`) và bấm `"Chạy mô phỏng"`.<br>2. `:SimulationController` chuyển cho `:SimulationEngine` gọi `scenario.validate() == true`, chụp `NetworkSnapshot` bất biến và tạo `SimulationRun("RUN-101", status=Running)`.<br>3. `:SimulationEngine` tính toán diễn biến trạng thái trên bản sao snapshot và gọi `RUN-101.complete(result)`.<br>4. Lặp lại kiểm tra hợp lệ cho 4 kịch bản còn lại: `FullParking(100)`, `ChargingDemandSurge(45)`, `PartialChargerFailure({"CP-1","CP-2"})`, `VehicleClustering(80)`. |
| **Inputs** | 5 bộ `ScenarioParameters` tương ứng với 5 giá trị `ScenarioType` |
| **Expected Outputs** | Cả 5 lượt chạy đều có `status == Completed` và gắn đúng 1 `SimulationResult`; dữ liệu thật của `HUB-METRO` vẫn giữ nguyên `12` xe khả dụng và `8` slot trống (cô lập 100%). |
| **Testing environment** | Web/Mobile UI Prototype (`operator-web.html` & `operator-app.html`) trên Chromium / Windows 10/11 |

#### `SUC-20` — `UC14`: Xem kết quả mô phỏng What-if và phê duyệt khuyến nghị điều phối
| Trường chuẩn Slide Ch9 p.53 | Nội dung chi tiết |
| :--- | :--- |
| **Test case** | `SUC-20` (`UC14`) View Simulation Results and accept CoordinationRecommendation |
| **Test description** | Operator xem các chỉ số tác động dịch vụ (`serviceSuccessRate`, `averageWaitMinutes`, `rejectedTripCount`) từ `RUN-101` và bấm chấp nhận một khuyến nghị điều chuyển xe (`TransferVehicles`). |
| **Related screens** | `operator-web.html`: `results.png` $\rightarrow$ `redistribute.png`; `operator-app.html`: `op-mobile-results.png` |
| **Pre-conditions** | 1. `SimulationRun("RUN-101")` đã `Completed` với `SimulationResult("SR-101", serviceSuccessRate=0.74, averageWaitMinutes=6.2, rejectedTripCount=18)` chứa khuyến nghị `CoordinationRecommendation("REC-01", type=TransferVehicles, status=Proposed)`. |
| **Actions** | 1. Operator mở màn hình `results.png` để xem biểu đồ kết quả của `RUN-101`.<br>2. Operator chọn khuyến nghị `REC-01` ("Điều chuyển 5 xe từ `HUB-KTXA` sang `HUB-METRO`") và bấm `"Áp dụng khuyến nghị"`.<br>3. Hệ thống gọi lại `RedistributionService` để kiểm tra lại điều kiện thực tế (live state) tại thời điểm hiện tại trước khi tạo `TransferOrder` thật và đổi `REC-01.status = Accepted`. |
| **Inputs** | `runId = "RUN-101"`, `recommendationId = "REC-01"`, `action = "Accept"` |
| **Expected Outputs** | Màn hình hiển thị đầy đủ 3 chỉ số (`74%`, `6.2 phút`, `18 lượt từ chối`); `REC-01.status == Accepted` chỉ sau khi `RedistributionService` xác nhận dữ liệu thật đủ điều kiện; một lệnh `TransferOrder` độc lập được tạo. |
| **Testing environment** | Web/Mobile UI Prototype (`operator-web.html` & `operator-app.html`) trên Chromium / Windows 10/11 |

---

### 3.3. Kiểm thử Các Yêu cầu Chức năng Phi tương tác (`FR-NI01` – `FR-NI04` — Bonus)

#### `SUC-21` — `FR-NI01`: Tiến trình nền tự động hủy phiếu đặt quá hạn (15 phút cho xe, 30 phút cho chỗ đỗ)
| Trường chuẩn Slide Ch9 p.53 | Nội dung chi tiết |
| :--- | :--- |
| **Test case** | `SUC-21` (`FR-NI01`) Auto-expire overdue vehicle and parking reservations |
| **Test description** | Tiến trình quét định kỳ mỗi 30 giây của `ReservationHub` tự động chuyển các phiếu đặt quá hạn sang `Expired`, giải phóng tài nguyên và gửi thông báo cho sinh viên. |
| **Related screens** | `user-app.html`: `Screen 5 (ticket.png)` $\rightarrow$ `Screen 10 (notifications.png)` |
| **Pre-conditions** | 1. `VehicleReservation("VR-510", reservedAt=10:00, expiresAt=10:15, status=Reserved)` giữ xe `EV-110`.<br>2. `ParkingReservation("PR-610", scheduledArrivalAt=10:00, expiresAt=10:30, status=Reserved)` giữ slot `S-10`. |
| **Actions** | 1. Tại `now = 10:15:00`, tiến trình quét chạy `expire(10:15:00)` trên cả 2 phiếu.<br>2. `VR-510.expire(10:15:00)` trả về `true` (`VR-510.status = Expired`, `EV-110.status = Available`), trong khi `PR-610.expire(10:15:00)` trả về `false` (vì hạn đỗ xe là `10:30:00`).<br>3. Tại `now = 10:30:00`, `PR-610.expire(10:30:00)` trả về `true` (`PR-610.status = Expired`, `S-10.status = Available`).<br>4. `NotificationService` đẩy thông báo hủy quá hạn tới `notifications.png`. |
| **Inputs** | Mốc quét 1: `now = 10:15:00`; Mốc quét 2: `now = 10:30:00` |
| **Expected Outputs** | Tại `10:15:00`: chỉ `VR-510` hết hạn, `PR-610` vẫn giữ slot. Tại `10:30:00`: `PR-610` hết hạn và giải phóng `S-10`; sinh viên nhận thông báo trên `notifications.png`. |
| **Testing environment** | Background Scheduler & Web/Mobile UI Prototype (`user-app.html`) |

#### `SUC-22` — `FR-NI02`: Tiến trình giả lập suy giảm mức pin và phát cảnh báo khẩn cấp khi pin `< 15%`
| Trường chuẩn Slide Ch9 p.53 | Nội dung chi tiết |
| :--- | :--- |
| **Test case** | `SUC-22` (`FR-NI02`) Telemetry battery decay and < 15% critical alert trigger |
| **Test description** | Khi xe đang di chuyển (`InUse`) có mức pin giảm từ `16%` xuống `14%` (`< 15%`), hệ thống cập nhật pin và phát cảnh báo khẩn cấp ngay lập tức. |
| **Related screens** | `user-app.html`: `Screen 7 (trip.png)` & `Screen 10 (notifications.png)`; `operator-web.html`: `overview.png` |
| **Pre-conditions** | 1. Xe `EV-109` đang trong chuyến đi `Active` (`status = InUse`) với `batteryPercent = 16`. |
| **Actions** | 1. Luồng giả lập telemetry gửi gói tin mới với `percent = 14`.<br>2. `TelemetryService` xác thực timestamp mới hơn và gọi `EV-109.updateBattery(14)`.<br>3. Do `14 < 15`, bộ giám sát kích hoạt cảnh báo pin nguy cấp gửi tới cả sinh viên đang lái xe và Dashboard của Operator. |
| **Inputs** | `vehicleId = "EV-109"`, `percent = 14` |
| **Expected Outputs** | `EV-109.batteryPercent == 14`; cảnh báo khẩn cấp `"Pin dưới 15% — vui lòng trả xe hoặc sạc tại Hub gần nhất"` hiển thị trên `trip.png`, `notifications.png` và `overview.png`. |
| **Testing environment** | Telemetry Stream & Web/Mobile UI Prototype |

#### `SUC-23` — `FR-NI03`: Bộ giám sát tự động phát cảnh báo Vàng (`>= 85%` / `<= 10%`) và Đỏ (`>= 95%` / `0` xe)
| Trường chuẩn Slide Ch9 p.53 | Nội dung chi tiết |
| :--- | :--- |
| **Test case** | `SUC-23` (`FR-NI03`) Hub capacity threshold watcher (Yellow and Red alerts) |
| **Test description** | Kiểm thử quy tắc chuyển mức cảnh báo tự động khi tỷ lệ lấp đầy chỗ đỗ của Hub chạm ngưỡng `85%` (Vàng) và `95%` (Đỏ) hoặc khi hết sạch xe khả dụng. |
| **Related screens** | `operator-web.html`: `overview.png`; `operator-app.html`: `op-mobile-overview.png` |
| **Pre-conditions** | 1. `HUB-METRO` có tổng cộng `20` vị trí đỗ; ban đầu đang chiếm dụng `16/20` (`80%` — trạng thái Xanh bình thường). |
| **Actions** | 1. Một xe vừa trả vào `HUB-METRO` nâng mức chiếm dụng lên `17/20` (`85%`) $\rightarrow$ `TelemetryService` phát cảnh báo **Vàng (Yellow Warning)**.<br>2. Thêm 2 xe nữa trả vào `HUB-METRO` nâng mức chiếm dụng lên `19/20` (`95%`) $\rightarrow$ nâng cấp lên cảnh báo **Đỏ (Red Critical Alert)**. |
| **Inputs** | Sự kiện 1: `occupiedSlots = 17/20 (85%)`; Sự kiện 2: `occupiedSlots = 19/20 (95%)` |
| **Expected Outputs** | Tại `85%`: nhãn trạng thái `HUB-METRO` chuyển màu **Vàng**. Tại `95%`: nhãn trạng thái chuyển màu **Đỏ** kèm gợi ý tạo lệnh điều chuyển `UC10`. |
| **Testing environment** | Web/Mobile UI Prototype (`operator-web.html` & `operator-app.html`) |

#### `SUC-24` — `FR-NI04`: Tự động tái lập lịch sạc tức thì khi có xe pin `< 10%` hoặc cổng sạc báo lỗi
| Trường chuẩn Slide Ch9 p.53 | Nội dung chi tiết |
| :--- | :--- |
| **Test case** | `SUC-24` (`FR-NI04`) Dynamic charge queue rebalancer on emergency < 10% request |
| **Test description** | Khi có xe mới đăng ký sạc ở mức pin khẩn cấp `7%` (`isUrgent() == true`), tiến trình nền tự động tính toán lại thứ tự hàng đợi sạc mà không cần Operator thao tác thủ công. |
| **Related screens** | `operator-web.html`: `schedule.png`; `user-app.html`: `charging.png` |
| **Pre-conditions** | 1. Hàng đợi sạc tại `HUB-BK` đang có 2 yêu cầu chờ: `CR-1` (`batteryAtRequest = 35%`), `CR-2` (`batteryAtRequest = 45%`). |
| **Actions** | 1. Sinh viên gửi yêu cầu sạc mới `CR-3` cho xe có `batteryAtRequest = 7%`.<br>2. `CR-3.isUrgent()` trả về `true` (`7 < 10`).<br>3. Tiến trình `FR-NI04` trong `ChargingScheduler` tự động kích hoạt tái sắp xếp hàng đợi, đưa `CR-3` lên vị trí đầu hàng đợi `[CR-3, CR-1, CR-2]` để nhận cổng sạc ngay khi có công suất trống. |
| **Inputs** | `newRequest = CR-3 (batteryAtRequest = 7%)` |
| **Expected Outputs** | Hàng đợi được cập nhật tự động thành `[CR-3, CR-1, CR-2]` mà không cần Operator bấm nút sắp xếp lại; trạng thái hiển thị tức thì trên `schedule.png`. |
| **Testing environment** | Background Scheduler & Web/Mobile UI Prototype (`operator-web.html`) |

---

## 4. ĐẶC TẢ KIỂM THỬ PHI CHỨC NĂNG (NON-FUNCTIONAL TEST CASES — SLIDE CH9 P.30, 39–40, 59, 63)

Theo yêu cầu tại **Slide Ch9 trang 30, 39, 40, 59 và 63**, bộ kiểm thử phi chức năng gồm **10 test cases (`NFR-01` – `NFR-10`)** bao phủ đủ 5 nhóm: **Performance**, **Concurrency / Stress**, **Security**, **Usability** và **Compatibility**:

| Mã TC | Nhóm NFR (Slide Ch9 p.30, 63) | Mô tả & Điều kiện Kiểm thử | Dữ liệu Đầu vào (Test Data) | Tiêu chí Đạt (Expected Metric / Threshold) |
| :--- | :--- | :--- | :--- | :--- |
| **NFR-01** | **Performance Testing** (Near Real-time Telemetry) | Đo độ trễ từ lúc cảm biến IoT phát gói tin thay đổi mức pin/slot đỗ đến khi trạng thái hiển thị trên Dashboard và App cập nhật xong. | 200 gói tin telemetry liên tiếp cho 5 Hub | Độ trễ phản hồi trung bình `< 1.0s`, phân vị P99 `<= 2.0 giây` (đạt NFR §4.1). |
| **NFR-02** | **Performance & Scalability Testing** (What-if Engine) | Đo thời gian thực thi thuật toán mô phỏng What-if trên mạng lưới quy mô lớn. | Snapshot gồm **1.000 phương tiện** phân bổ trên **10 Mobility Hubs**, thời lượng mô phỏng `120 phút` | Hoàn thành tính toán và trả về `SimulationResult` trong `<= 5.0 giây` (đạt NFR §4.1). |
| **NFR-03** | **Concurrency & Stress Testing** (Anti-Double-Booking Vehicle) | Giả lập 50 sinh viên gửi yêu cầu đặt cùng một chiếc xe `EV-101` tại cùng một mili-giây `t0`. | 50 request song song `reserveVehicle(vehicleId="EV-101")` | Chính xác **01** request thành công (`Reserved`), **49** request còn lại nhận lỗi `AllocationConflict` (0% double-booking — đạt NFR §4.2). |
| **NFR-04** | **Concurrency Testing** (Anti-Double-Booking Parking Slot) | Giả lập 30 yêu cầu đặt chỗ đỗ cá nhân (`UC06`) và 1 lệnh điều chuyển (`UC10`) cùng tranh chấp slot trống cuối cùng `S-01` tại `HUB-METRO`. | 31 giao dịch đồng thời nhắm vào `S-01` | Chính xác **01** giao dịch giữ được `S-01` (`Held`), **30** giao dịch còn lại bị từ chối an toàn, `availableParkingCount() == 0`. |
| **NFR-05** | **Security Testing** (Role-Based Access Control) | Kiểm thử ngăn chặn leo thang đặc quyền khi tài khoản chỉ có vai trò `Student` cố tình gọi các tác vụ của `Operator` (`UC09`, `UC10`, `UC11`, `UC12`, `UC13`). | Tài khoản `ACC-STU01` (`roles={Student}`, `hasRole(Operator) == false`) gọi tạo lệnh điều chuyển hoặc đóng sự cố | 100% yêu cầu trái phép bị chặn tại biên dịch vụ với lỗi `Unauthorized`; không có trạng thái miền nào bị thay đổi. |
| **NFR-06** | **Security & Robustness Testing** (Stale/Corrupt Telemetry Protection) | Gửi gói tin cảm biến giả mạo có timestamp cũ hơn bản ghi hiện tại hoặc mức pin ngoài miền `[-20%, 150%]`. | `{vehicleId: "EV-101", batteryPercent: 150, timestamp: t_old}` | `TelemetryService` loại bỏ gói tin `StaleObservation` / `InvalidBattery`; trạng thái xe và lịch sạc giữ nguyên toàn vẹn. |
| **NFR-07** | **Usability Testing** (Student 1-Touch Booking & QR Flow) | Đánh giá số bước thao tác và khả năng hoàn thành tác vụ đặt xe – nhận xe của sinh viên lần đầu sử dụng trên `user-app.html`. | 5 kịch bản người dùng thực hiện `UC01 -> UC03 -> UC04` | Hoàn tất đặt xe trong `<= 3` lần chạm; đồng hồ đếm ngược 15 phút và mã QR hiển thị rõ ràng, 0 phần tử giao diện bị che khuất (`verify.cjs` pass 100%). |
| **NFR-08** | **Usability Testing** (Operator Color-Coded Alert Recognition) | Đánh giá khả năng nhận diện trực quan trạng thái Hub và trạm sạc qua mã màu chuẩn trên `operator-web.html` và `operator-app.html`. | Mạng lưới có Hub Xanh (`< 85%`), Hub Vàng (`85%–94%`) và Hub Đỏ (`>= 95%` hoặc `Faulty`) | 100% trạng thái phân biệt đúng bằng màu sắc kèm nhãn văn bản rõ ràng (Xanh: Khả dụng, Vàng: Cảnh báo/Đang sạc, Đỏ: Quá tải/Sự cố — đạt NFR §4.5). |
| **NFR-09** | **Compatibility Testing** (Mobile Viewport Responsiveness) | Kiểm thử hiển thị và tương tác cảm ứng của `user-app.html` (9 màn hình) và `operator-app.html` (8 màn hình) trên kích thước màn hình điện thoại. | Viewport `390x844` (iPhone 14) và `360x800` (Android) trên Chrome & Edge | 17/17 màn hình di động hiển thị đúng bố cục, không tràn ngang (no horizontal overflow), mọi nút bấm đều thao tác được. |
| **NFR-10** | **Compatibility Testing** (Desktop Web Dashboard) | Kiểm thử bảng điều khiển trung tâm `operator-web.html` (7 màn hình) và trình duyệt tổng hợp `index.html` (26 màn hình) trên các trình duyệt máy tính. | Viewport `1440x900` và `1920x1080` trên Google Chrome & Microsoft Edge | 100% bảng biểu, bản đồ Hub và biểu đồ kết quả mô phỏng What-if render sắc nét, chuyển đổi mượt giữa cả 26 màn hình. |

---

## 5. MA TRẬN TRUY VẾT TOÀN DIỆN & CHECKLIST CHẤT LƯỢNG CHUẨN SLIDE

### 5.1. Ma trận Truy vết Đa chiều (Use Cases $\leftrightarrow$ Sequence/Activity/State $\leftrightarrow$ Class Methods $\leftrightarrow$ Test Cases)

| Mã Yêu cầu / UC | Sơ đồ Động (`SQ` / `AD` / `SC`) | Lớp & Phương thức Miền Cốt lõi (`05_Class_Diagram`) | Unit Test Cases (`UT`) | System / NFR Test Cases (`SUC` / `NFR`) |
| :--- | :--- | :--- | :--- | :--- |
| **UC01:** Search Mobility Hub | — | `MobilityHub.availableParkingCount`, `UserAccount.hasRole` | `UT-01`..`UT-03`, `UT-10`..`UT-12` | `SUC-01`, `NFR-09` |
| **UC02:** View Available Vehicles | — | `ElectricVehicle.isRentable`, `ElectricBicycle`, `ElectricMotorcycle` | `UT-07`..`UT-09` | `SUC-02` |
| **UC03:** Reserve Vehicle | `SQ01`, `AD01`, `SC01`, `SC03` | `ElectricVehicle.isRentable`, `Reservation.calculateExpiry`, `VehicleReservation.calculateExpiry`, `Reservation.cancel` | `UT-07`..`UT-09`, `UT-19`..`UT-21`, `UT-25`..`UT-30` | `SUC-03`, `SUC-04`, `NFR-03`, `NFR-07` |
| **UC04:** Pick Up Vehicle | `SQ02`, `AD02`, `SC01`, `SC03` | `VehicleReservation`, `Trip`, `ElectricVehicle`, `ParkingSlot` | `UT-21`, `UT-23` | `SUC-05`, `NFR-07` |
| **UC05:** Return Vehicle | `SQ03`, `AD03`, `SC01`, `SC03` | `Trip.complete`, `ParkingSlot.canAccept`, `MobilityHub.availableParkingCount` | `UT-10`..`UT-15`, `UT-34`..`UT-36` | `SUC-06`, `SUC-07` |
| **UC06 & UC06A/B:** Reserve Parking & Private Check-in/out | `AD04`, `SC03` | `ParkingSlot.canAccept`, `ParkingReservation.calculateExpiry`, `Reservation.cancel` | `UT-13`..`UT-15`, `UT-19`..`UT-21`, `UT-31`..`UT-33` | `SUC-08`, `SUC-09`, `NFR-04` |
| **UC07 & UC07A:** Request & Stop Charging | `SQ04`, `AD04`, `SC02` | `ChargingPoint.canServe`, `ChargingRequest.isUrgent`, `ChargingSession.stop` | `UT-16`..`UT-18`, `UT-37`..`UT-42` | `SUC-10`, `SUC-11` |
| **UC08:** Monitor Mobility Hub Network | — | `ElectricVehicle.updateBattery`, `MobilityHub.availableParkingCount` | `UT-04`..`UT-06`, `UT-10`..`UT-12` | `SUC-13`, `NFR-01`, `NFR-08`, `NFR-10` |
| **UC09:** Manage Mobility Resources | — | `ParkingSlot.canAccept`, `ChargingPoint.canServe`, `ElectricVehicle.updateBattery` | `UT-04`..`UT-06`, `UT-13`..`UT-18` | `SUC-14`, `NFR-05` |
| **UC10 & UC10A/B:** Redistribute Vehicles | `SQ05`, `AD05`, `SC01` | `TransferOrder.complete`, `MobilityHub.availableParkingCount` | `UT-10`..`UT-12`, `UT-43`..`UT-45` | `SUC-15`, `SUC-16`, `NFR-04`, `NFR-05` |
| **UC11 & UC11A:** Handle Operational Incident | `SQ06`, `AD06`, `SC01`, `SC02` | `OperationalIncident.resolve`, `ChargingSession.stop`, `ElectricVehicle.isRentable`, `ChargingPoint.canServe` | `UT-08`, `UT-17`, `UT-41`, `UT-46`..`UT-48` | `SUC-12`, `SUC-17`, `NFR-05` |
| **UC12:** Manage Charging Schedule | `SC02` | `ChargingRequest.isUrgent`, `ChargingPoint.canServe`, `ChargingSession.stop` | `UT-16`..`UT-18`, `UT-37`..`UT-42` | `SUC-18`, `NFR-05` |
| **UC13:** Run What-if Simulation | `SQ07`, `AD07` | `SimulationScenario.validate`, `SimulationRun.complete` | `UT-49`..`UT-54` | `SUC-19`, `NFR-02`, `NFR-05` |
| **UC14:** View Simulation Results | `SQ07`, `AD07` | `SimulationRun.complete`, `SimulationResult`, `CoordinationRecommendation` | `UT-52`..`UT-54` | `SUC-20`, `NFR-10` |
| **FR-NI01:** Auto-Expire Overdue Holds | `SC03` | `Reservation.expire`, `VehicleReservation.calculateExpiry`, `ParkingReservation.calculateExpiry` | `UT-22`..`UT-33` | `SUC-21` |
| **FR-NI02:** Telemetry & Battery Decay | `SC01` | `ElectricVehicle.updateBattery` | `UT-04`..`UT-06` | `SUC-22`, `NFR-01`, `NFR-06` |
| **FR-NI03:** Hub Capacity Threshold Watcher | — | `MobilityHub.availableParkingCount` | `UT-10`..`UT-12` | `SUC-23`, `NFR-08` |
| **FR-NI04:** Dynamic Charge Queue Rebalancer | `SC02` | `ChargingRequest.isUrgent`, `ChargingSession.stop` | `UT-37`..`UT-42` | `SUC-24` |

---

### 5.2. Checklist Chất lượng Kiểm thử Theo Chuẩn Slide Bài giảng (`09_Ch9 Software Testing_2025.pdf`)

| Tiêu chí Kiểm định (Chuẩn Slide Ch9 & Đề bài Submission #3) | Trạng thái | Bằng chứng xác thực |
| :--- | :---: | :--- |
| **1. Đầy đủ cấu trúc Test Plan (Slide Ch9 p.55)** | **Đạt** | Mục 1.1 xác định rõ Test Objects, Test Objectives, Testing Methods, Infrastructure và Success/Failure Criteria. |
| **2. Bảng Test Plan 6 cột chuẩn mẫu (Slide Ch9 p.59)** | **Đạt** | Mục 1.2 trình bày đầy đủ 6 cột: `Type of tests`, `Description`, `Number of tests`, `Test types`, `Test data`, `Test metric`. |
| **3. Áp dụng Equivalence Partitioning & Boundary Value Analysis (Slide Ch9 p.22, p.25)** | **Đạt** | Mục 1.3 và Mục 2 kiểm thử đầy đủ các biên `0%, 9%, 10%, 14%, 15%, 19%, 20%, 79%, 80%, 100%`, `+15m` vs `+30m`, `85%` công suất sạc, `1..N-1` trụ lỗi và `[0.0, 1.0]` chỉ số mô phỏng. |
| **4. Độ phủ 100% phương thức trong Class Diagram (Slide Ch9 p.20–21 & Đề bài p.5)** | **Đạt** | 18/18 phương thức trong `METHOD_DESCRIPTIONS.md` đều có đúng 3 Unit Test Cases (`UT-01` – `UT-54`: Valid, Boundary, Invalid/Error). |
| **5. Áp dụng mẫu bảng 8 trường cho Use-Case Testing (Slide Ch9 p.53–54)** | **Đạt** | 24/24 kịch bản `SUC-01` – `SUC-24` tuân thủ đúng 8 mục: `Test case`, `Test description`, `Related screens`, `Pre-conditions`, `Actions`, `Inputs`, `Expected Outputs`, `Testing environment`. |
| **6. Đầy đủ 5 nhóm kiểm thử bài tập mẫu (Slide Ch9 p.30, p.63)** | **Đạt** | Bao phủ đủ Functional (`UT-01`..`UT-54`, `SUC-01`..`SUC-24`), Performance (`NFR-01`, `NFR-02`), Concurrency/Security (`NFR-03`..`NFR-06`), Usability (`NFR-07`, `NFR-08`) và Compatibility (`NFR-09`, `NFR-10`). |
| **7. Tự động hóa kiểm thử đơn vị (Automated Testing — Slide Ch9 p.27–28)** | **Đạt** | Kèm script tự động [`verify_test_cases.py`](verify_test_cases.py) chạy kiểm tra truy vết tài liệu và thực thi 54 Unit Test Cases bằng `unittest`. |
