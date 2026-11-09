# Operations Module (UC08–UC11) — Agent Implementation Plan

**Module:** Operations & Physical Inventory Provider  
**Owner:** Duy  
**Scope:** Hub/vehicle/slot/port inventory (UC09), network monitoring (UC08), vehicle transfers (UC10, UC10A, UC10B), and incident/maintenance management (UC11, UC11A).  
**Status:** Approved implementation blueprint for AI agents and developers.  
**Baseline Documents:**
- [`AGENTS.md`](../../AGENTS.md) — Source authority and UML precedence
- [`DECISION.md`](DECISION.md) — Modular monolith, 5 layers, Node.js + Express, SQLite repository adapter
- [`DEVELOPMENT_GUIDE.md`](DEVELOPMENT_GUIDE.md) — Four-module MVP development guidelines
- [`API_CONTRACTS.md`](API_CONTRACTS.md) — Shared HTTP protocol and Operations endpoint specifications
- [`LIFECYCLE_SCENARIOS.md`](../diagrams/01_Usecase_Diagram/LIFECYCLE_SCENARIOS.md) — Business rules and exception flows

---

## 1. Mục tiêu và Ranh giới Trách nhiệm (Goal & Boundaries)

Module **Operations** giữ vai trò là **nguồn dữ liệu vật lý có thẩm quyền duy nhất (Single Source of Truth for Physical Inventory)** trong toàn bộ hệ thống Smart E-Mobility Hub:

### Trách nhiệm sở hữu (Ownership):
1. **Sở hữu độc quyền quyền ghi hạ tầng vật lý (Physical Inventory Writes):**
   - Quản trị danh mục Hub, Xe điện (`ElectricVehicle`), Chỗ đỗ (`ParkingSlot`), Cổng sạc (`ChargingPoint`) (UC09).
   - Thay đổi trạng thái vận hành thiết bị: `Available`, `Needs_Charging`, `In_Use`, `In_Transfer`, `Faulted`, `Suspended`, `Maintenance`.
2. **Cung cấp `InventoryInterface` cho các module khác:**
   - **Mobility (Minh):** Kiểm tra xe khả dụng, xác thực mã lấy xe, tiêu thụ slot đỗ khi trả xe (UC01–05).
   - **Parking & Charging (Triết):** Kiểm tra slot đỗ tương thích, giữ chỗ, gán cổng sạc (UC06, UC07, UC12).
3. **Giám sát mạng lưới Hub thời gian thực (UC08):**
   - Tổng hợp tỷ lệ lấp đầy, dung lượng pin, trạng thái cổng sạc, phát hiện bất thường và tính toán mức cảnh báo (Xanh / Vàng / Đỏ theo BR10).
4. **Vòng đời Điều phối xe liên trạm (UC10, UC10A, UC10B):**
   - Lập lệnh điều chuyển (`Planned`) $\rightarrow$ Xác nhận xuất phát (`InTransit`) $\rightarrow$ Xác nhận đến (`Completed`) hoặc Hủy lệnh (`Cancelled`).
   - Khóa nguyên tử số lượng slot trống tại Hub đích và số xe $\ge 80\%$ tại Hub nguồn.
5. **Tiếp nhận & Xử lý sự cố (UC11, UC11A):**
   - Tiếp nhận báo cáo sự cố từ User trong chuyến đi (UC11A) hoặc cảnh báo IoT tự động.
   - Cách ly tài nguyên lỗi (chặn phân bổ mới, không khóa vật lý xe đang di chuyển).
   - Phân công kỹ thuật viên bảo trì và ghi nhận SLA xử lý (BR14).

### Ranh giới nghiêm cấm (Out-of-Scope / Anti-Patterns):
- ❌ **Không tách thành microservice riêng:** Module là một thư mục thuộc monolithic backend `app/src/modules/operations/`.
- ❌ **Không import trực tiếp model/table của Mobility hoặc Parking:** Chỉ tương tác qua Interface hoặc các read model / snapshot ở tầng Composition.
- ❌ **Không gọi trực tiếp Express request/response trong Application Services:** Giữ logic ứng dụng thuần JavaScript, độc lập với web framework.
- ❌ **Không can thiệp logic cước phí, đặt giữ chỗ cá nhân hoặc phiên sạc:** Những nghiệp vụ này thuộc quyền sở hữu của Minh và Triết.

---

## 2. Cấu trúc Thư mục Module Mục tiêu (Target Directory Layout)

Được chuẩn hóa theo đúng Package Diagram (`DV02`) và kiến trúc 5 tầng:

```text
app/src/modules/operations/
├── api/
│   ├── operations-router.js       # Express router định tuyến các endpoint /operations/*, /transfers/*, /incidents/*
│   └── operations-controller.js   # Parse request, xác thực identity (O/U), map mã HTTP và format error
├── application/
│   ├── inventory-service.js       # Xử lý UC09: Thêm, sửa, ngưng, kích hoạt lại tài nguyên
│   ├── monitoring-service.js      # Xử lý UC08: Tổng hợp KPI, tính cảnh báo mạng lưới Hub (BR10)
│   ├── transfer-service.js        # Xử lý UC10, UC10A, UC10B: Điều phối xe liên trạm
│   └── incident-service.js        # Xử lý UC11, UC11A: Tiếp nhận, cách ly và bảo trì sự cố
├── domain/
│   ├── inventory-interface.js     # Hợp đồng công khai cho Mobility & Parking gọi vào
│   ├── transfer.js                # State machine & Business rules cho lệnh điều chuyển (BR12, BR13)
│   ├── incident.js                # State machine & SLA cho sự cố (BR14)
│   └── resource.js                # Thực thể & quy tắc hợp lệ của Hub, Vehicle, Slot, ChargingPoint
└── infrastructure/
    ├── sqlite-inventory-repo.js   # SQLite adapter quản lý bảng hạ tầng vật lý
    ├── sqlite-transfer-repo.js    # SQLite adapter quản lý bảng transfers & vehicle/slot holds
    └── sqlite-incident-repo.js    # SQLite adapter quản lý bảng incidents & maintenance
```

---

## 3. Thiết kế Dữ liệu & SQLite Schema (`app/db/migrations/`)

Kế thừa schema ban đầu [`app/db/migrations/0001_hub_inventory.sql`](../../app/db/migrations/0001_hub_inventory.sql), tạo migration bổ sung: `0002_operations_schema.sql`:

### 3.1. Cập nhật bảng tài nguyên hiện có:
- Thêm cột `status` cho `electric_vehicles` (mặc định `'available'`, các giá trị: `available`, `reserved`, `in_use`, `in_transfer`, `faulted`, `suspended`, `maintenance`).
- Thêm cột `status` cho `parking_slots` (mặc định `'available'`, các giá trị: `available`, `reserved`, `occupied`, `held_for_transfer`, `blocked`).
- Thêm cột `status` cho `charging_points` (mặc định `'available'`, các giá trị: `available`, `occupied`, `charging`, `faulted`, `maintenance`).

### 3.2. Bảng phục vụ Điều phối (Transfers - UC10):
```sql
CREATE TABLE transfers (
    id TEXT PRIMARY KEY,
    source_hub_id TEXT NOT NULL REFERENCES mobility_hubs(id),
    destination_hub_id TEXT NOT NULL REFERENCES mobility_hubs(id),
    status TEXT NOT NULL CHECK (status IN ('planned', 'in_transit', 'completed', 'cancelled')),
    created_at TEXT NOT NULL,
    departed_at TEXT,
    arrived_at TEXT,
    cancelled_at TEXT,
    cancel_reason TEXT,
    created_by TEXT NOT NULL
);

CREATE TABLE transfer_vehicles (
    transfer_id TEXT NOT NULL REFERENCES transfers(id) ON DELETE CASCADE,
    vehicle_id TEXT NOT NULL REFERENCES electric_vehicles(id),
    PRIMARY KEY (transfer_id, vehicle_id)
);

CREATE TABLE transfer_destination_slots (
    transfer_id TEXT NOT NULL REFERENCES transfers(id) ON DELETE CASCADE,
    slot_id TEXT NOT NULL REFERENCES parking_slots(id),
    PRIMARY KEY (transfer_id, slot_id)
);
```

### 3.3. Bảng phục vụ Sự cố & Bảo trì (Incidents - UC11):
```sql
CREATE TABLE incidents (
    id TEXT PRIMARY KEY,
    reporter_id TEXT NOT NULL,
    reporter_role TEXT NOT NULL CHECK (reporter_role IN ('user', 'operator', 'system')),
    reported_trip_id TEXT,
    resource_kind TEXT NOT NULL CHECK (resource_kind IN ('vehicle', 'charging_point', 'slot')),
    resource_id TEXT NOT NULL,
    description TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('emergency', 'critical', 'standard')),
    status TEXT NOT NULL CHECK (status IN ('open', 'investigating', 'in_progress', 'resolved', 'closed')),
    reported_at TEXT NOT NULL,
    resolved_at TEXT,
    resolution_notes TEXT
);

CREATE TABLE maintenance_assignments (
    id TEXT PRIMARY KEY,
    incident_id TEXT NOT NULL REFERENCES incidents(id),
    technician_id TEXT NOT NULL,
    scheduled_at TEXT NOT NULL,
    sla_deadline TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('assigned', 'on_site', 'completed'))
);
```

---

## 4. Đặc tả Hợp đồng Giao tiếp Nội bộ (`InventoryInterface`)

Được export từ `domain/inventory-interface.js` để server composition nạp và cung cấp cho module của Minh & Triết:

```javascript
class InventoryInterface {
  // === Dành cho Module Mobility (Minh) ===
  async getAvailableVehicles(hubId, vehicleType) {}
  async reserveVehicle(vehicleId, reservationId) {}     // Chuyển xe -> 'reserved'
  async releaseVehicleHold(vehicleId) {}                // Trả xe về 'available' khi hủy đặt
  async pickupVehicle(vehicleId, tripId) {}             // Chuyển xe -> 'in_use'
  async returnVehicle(vehicleId, hubId, slotId) {}      // Cập nhật hub mới, xe -> 'available' / 'needs_charging'
  
  // === Dành cho Module Parking & Charging (Triết) ===
  async getAvailableSlots(hubId, pool) {}
  async holdSlotForReservation(slotId, reservationId) {}
  async releaseSlotHold(slotId) {}
  async occupySlot(slotId, occupancyId) {}
  async vacateSlot(slotId) {}
  async updateChargingPointStatus(pointId, status) {}   // 'available' | 'charging' | 'faulted'

  // === Đọc Snapshot phục vụ Mô phỏng & Giám sát ===
  async captureNetworkSnapshot() {}                     // Trả về bản sao bất biến dữ liệu xe/trạm/cổng
}
```

---

## 5. Quy trình Thực thi Từng Bước cho Agent (Step-by-Step Execution Phases)

Agent cần thực hiện tuần tự qua 5 giai đoạn (không nhảy cóc):

### GIAI ĐOẠN 1: Domain Entities & Business Rules
*Tập trung tại thư mục `domain/` — Không import thư viện ngoài.*

- [x] **Bước 1.1: Định nghĩa `resource.js`:**
  - Định nghĩa trạng thái và ràng buộc chuyển đổi hợp lệ cho Xe, Chỗ đỗ, Cổng sạc.
  - Cấm Hard Delete nếu xe đang ở trạng thái `in_use` hoặc `reserved` (Tuân thủ **BR11**).
- [x] **Bước 1.2: Định nghĩa `transfer.js`:**
  - Logic xác thực: Hub nguồn $\ne$ Hub đích (**BR12**).
  - Điều kiện xe tham gia điều chuyển: Pin $\ge 80\%$ và trạng thái `available` (**BR13**).
  - Trạng thái chuyển dịch: `planned` $\rightarrow$ `in_transit` $\rightarrow$ `completed` hoặc `cancelled`.
  - Tranh chấp đồng thời: `depart` và `cancel` cùng cạnh tranh trên trạng thái `planned` (chỉ 1 hành động thành công).
- [x] **Bước 1.3: Định nghĩa `incident.js`:**
  - Phân loại mức độ: `emergency` (nguy cơ chập cháy $\le 60\text{s}$ SLA theo **BR14**), `critical`, `standard`.
  - Quy tắc cách ly an toàn:
    - Nếu xe hỏng giữa chuyến (`UC11A`): Không khóa xe vật lý từ xa, không tự ý đóng chuyến đi; chỉ đánh dấu cách ly để chặn phân bổ tiếp theo. Chuyến đi chỉ kết thúc khi xe đã vào trạm an toàn.
- [x] **Bước 1.4: Định nghĩa `inventory-interface.js`:**
  - Hợp đồng tích hợp liên module cho Mobility (Minh), Parking/Charging (Triết) và Composition Root (Snapshot).

---

### GIAI ĐOẠN 2: SQLite Schema Migration & Repositories
*Tập trung tại thư mục `infrastructure/` và `app/db/`.*

- [x] **Bước 2.1: Viết migration SQL `0002_operations_schema.sql`:**
  - Tạo các bảng `transfers`, `transfer_vehicles`, `transfer_destination_slots`, `incidents`, `maintenance_assignments`.
  - Bổ sung chỉ mục (`INDEX`) trên `hub_id`, `status` để tối ưu truy vấn giám sát UC08.
- [x] **Bước 2.2: Hiện thực `sqlite-inventory-repo.js`:**
  - Triển khai các phương thức đọc/ghi bảng tài nguyên.
  - Tích hợp Database Transactions (`BEGIN TRANSACTION ... COMMIT`): Đảm bảo các thay đổi trạng thái xe và giữ chỗ đỗ diễn ra nguyên tử.
- [x] **Bước 2.3: Hiện thực `sqlite-transfer-repo.js`:**
  - Đảm bảo việc tạo lệnh `planned` khóa đồng thời cả danh sách xe tại Hub nguồn và danh sách slot đỗ tại Hub đích trong cùng 1 transaction.
- [x] **Bước 2.4: Hiện thực `sqlite-incident-repo.js`:**
  - Lưu trữ phiếu sự cố, phân công bảo trì và lịch sử xử lý.

---

### GIAI ĐOẠN 3: Application Services & Core Use Cases
*Tập trung tại thư mục `application/`.*

- [ ] **Bước 3.1: Hiện thực `inventory-service.js` (UC09):**
  - Quản lý danh mục tài nguyên: tra cứu danh sách, tạo mới, cập nhật thông số, tạm ngưng (`suspend`), kích hoạt lại (`reactivate`).
- [ ] **Bước 3.2: Hiện thực `monitoring-service.js` (UC08):**
  - Đọc dữ liệu từ repo để tính toán KPI toàn mạng lưới.
  - Áp dụng thuật toán màu cảnh báo theo **BR10 / FR-NI03**:
    - 🔴 **Đỏ:** Tỷ lệ lấp đầy bãi đỗ $\ge 95\%$ HOẶC không còn xe khả dụng.
    - 🟡 **Vàng (nếu chưa Đỏ):** Lấp đầy $\ge 85\%$ HOẶC tỷ lệ xe khả dụng $\le 10\%$.
    - 🟢 **Bình thường:** Các trường hợp còn lại.
- [ ] **Bước 3.3: Hiện thực `transfer-service.js` (UC10, UC10A, UC10B):**
  - `createTransfer()`: Kiểm tra pin $\ge 80\%$, kiểm tra sức chứa Hub đích, tạo lệnh `planned`.
  - `departTransfer()`: Kiểm tra lại pin và trạng thái xe, chuyển `in_transit`, giải phóng slot nguồn.
  - `arriveTransfer()`: Kiểm tra số lượng xe thực tế đến nơi (UC10A). Nếu đủ, chuyển `completed`, xe cập nhật `hub_id` mới và chuyển `available`. Hỗ trợ đổi Hub đích thay thế nếu phát sinh sự cố.
  - `cancelTransfer()`: Hủy lệnh `planned` (UC10B), thu hồi các slot giữ chỗ tại Hub đích, trả xe về `available`.
- [ ] **Bước 3.4: Hiện thực `incident-service.js` (UC11, UC11A):**
  - `reportTripIncident()` (UC11A): Tiếp nhận báo cáo từ User, ghi nhận vị trí GPS/thủ công, tạo sự cố `open`.
  - `handleIncident()` (UC11): Cách ly tài nguyên (`faulted`/`maintenance`), lập phiếu bảo trì, gán kỹ thuật viên với SLA thời gian cụ thể.

---

### GIAI ĐOẠN 4: Express API Handlers & HTTP Contracts
*Tập trung tại thư mục `api/` — Tuân thủ 100% [`API_CONTRACTS.md`](API_CONTRACTS.md).*

- [ ] **Bước 4.1: Xây dựng `operations-controller.js`:**
  - Kiểm tra thẩm quyền vai trò (`Operator` đối với UC08, UC09, UC10, UC11; `User` đối với UC11A).
  - Xử lý header `Idempotency-Key` cho toàn bộ các route POST: Nếu trùng key nhưng khác payload trả về `409 IDEMPOTENCY_KEY_REUSED`; nếu trùng key và payload, trả kết quả đã lưu.
  - Chuẩn hóa cấu trúc response:
    - Thành công: `{"data": ...}` kèm HTTP 200 hoặc 201.
    - Lỗi: `{"error":{"code":"...","message":"...","details":{}}}`.
- [ ] **Bước 4.2: Cấu hình `operations-router.js` kết nối đúng đường dẫn:**
  ```text
  GET    /api/v1/operations/hubs             (UC08)
  GET    /api/v1/operations/resources        (UC09)
  POST   /api/v1/operations/resources        (UC09)
  PATCH  /api/v1/operations/resources/:id    (UC09)
  POST   /api/v1/transfers                   (UC10)
  GET    /api/v1/transfers/:id               (UC10)
  POST   /api/v1/transfers/:id/depart        (UC10)
  POST   /api/v1/transfers/:id/arrive        (UC10A)
  POST   /api/v1/transfers/:id/cancel        (UC10B)
  POST   /api/v1/trips/:id/incidents         (UC11A)
  GET    /api/v1/incidents                   (UC11)
  POST   /api/v1/incidents/:id/handle        (UC11)
  ```

---

### GIAI ĐOẠN 5: Fixtures & Verification Tests

- [ ] **Bước 5.1: Xây dựng Test Fixtures (`tests/fixtures/operations-fixtures.js`):**
  - Tạo sẵn dữ liệu mẫu cho: 1 Hub dư xe, 1 Hub thiếu xe, 1 xe pin <80% (không đủ chuẩn điều phối), 1 cổng sạc bị lỗi (`faulted`).
- [ ] **Bước 5.2: Kiểm thử tranh chấp (Contention & Concurrency Tests):**
  - Chạy đồng thời `POST /transfers/:id/depart` và `POST /transfers/:id/cancel` trên cùng 1 transfer $\rightarrow$ Đảm bảo đúng 1 request thành công, request còn lại trả `409 Conflict`.
- [ ] **Bước 5.3: Kiểm thử cách ly sự cố an toàn (Incident Isolation Tests):**
  - Báo sự cố cho xe đang trong chuyến đi (`active trip`) $\rightarrow$ Xác nhận xe bị chặn phân bổ mới (`reserved`), nhưng chuyến đi không bị ngắt đột ngột.
- [ ] **Bước 5.4: Kiểm thử quy tắc cảnh báo BR10:**
  - Kiểm tra màu trạng thái khi trạm đạt 95% sức chứa (đỏ) và 85% sức chứa (vàng).

---

## 6. Checklist Nghiệm thu Chất lượng (Acceptance Checklist)

Trước khi bàn giao code cho module khác tích hợp, Agent phải xác nhận đạt đủ 100% các tiêu chí sau:

- [ ] Toàn bộ mã nguồn nằm gọn trong thư mục `app/src/modules/operations/`.
- [ ] Không có bất kỳ câu lệnh SQL raw nào nằm trong tầng Domain hay Controller; 100% truy vấn nằm trong thư mục `infrastructure/`.
- [ ] Đã export đầy đủ `InventoryInterface` chuẩn xác cho Minh (Mobility) và Triết (Parking & Charging) sử dụng.
- [ ] Mọi endpoint tuân thủ đúng định dạng dữ liệu và mã lỗi trong `API_CONTRACTS.md`.
- [ ] Chạy kiểm thử tự động với SQLite file tạm (`:memory:` hoặc file temp) thành công không lỗi.
- [ ] Không import trực tiếp code từ các module khác; không gây circular dependency.

---
*Kế hoạch này là tài liệu chuẩn để AI agent đọc và bắt đầu triển khai code từng bước một cách an toàn và chuẩn mực.*
