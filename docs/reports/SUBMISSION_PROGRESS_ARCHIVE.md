> **Archived Progress Tracker (v1.x):** Tài liệu này lưu trữ bảng theo dõi nhiệm vụ môn học (Submission #1 – #Final) trước khi chuyển `README.md` sang tài liệu sản phẩm **Version 2.0**. Tài liệu vận hành và kiến trúc hiện hành xem tại [README](../../README.md) và [index.md](../../index.md).

# Smart E-Mobility Hub – Hệ thống Điều phối Phương tiện Điện ĐHQG-HCM

[Repository index](../../index.md) · [Prototype](../../app/prototype/README.md) · [SQLite setup](../../app/db/README.md)

[![Course](https://img.shields.io/badge/Course-Software%20Engineering%20(HK261)-0284c7.svg)](#)
[![University](https://img.shields.io/badge/University-VNU--HCM-152584.svg)](#)
[![UML Standard](https://img.shields.io/badge/UML-PlantUML%20%7C%20Draw.io%20SVG-059669.svg)](#)
[![UI/UX Prototype](https://img.shields.io/badge/UI%2FUX-Playwright%20Verified%20(26%20Screens)-00B8D6.svg)](#)

> **Capstone Dashboard**  
> *Tài liệu đặc tả kiến trúc & yêu cầu chi tiết đầy đủ xem tại:* **[`PROJECT_SPECIFICATION.md`](../requirements/PROJECT_SPECIFICATION.md)**

[Bổ sung vòng đời nghiệp vụ](../diagrams/01_Usecase_Diagram/LIFECYCLE_SCENARIOS.md): sáu ca phụ cho check-in/check-out xe cá nhân, kết thúc sạc, hoàn tất/hủy điều chuyển và báo sự cố giữa chuyến; kèm đặc tả 11 mục và file Draw.io chỉnh sửa được.

---

## 1. TỔNG QUAN DỰ ÁN

Hệ thống **Smart E-Mobility Hub** giải quyết bài toán **điều phối đa tài nguyên phân tán** (Distributed Multi-Resource Coordination) cho mạng lưới phương tiện giao thông xanh (xe đạp điện, xe máy điện dùng chung và xe điện cá nhân) kết nối chặng cuối từ **Ga Metro số 1 ĐHQG** đến các trường đại học thành viên, ký túc xá và khu chức năng trong Khu đô thị ĐHQG-HCM.

Hệ thống tập trung vào các bài toán kỹ nghệ phần mềm cốt lõi:
- **Quản lý trạng thái đa thực thể:** Xe (`Available`, `Reserved`, `In-Use`, `Needs Charging`, `Under Maintenance`, `In-Transit`), Slot đỗ, Cổng sạc thông minh.
- **Phân bổ tài nguyên đồng thời:** Chống double-booking xe và chỗ đỗ theo thời gian thực.
- **Lập lịch sạc tối ưu (Smart Charging Scheduling):** Ưu tiên xe pin yếu (< 20%) và xe có lịch đặt trước cho chuyến đi sắp tới.
- **Tái cân bằng mạng lưới (Vehicle Redistribution):** Tự động phát hiện và điều phối xe giữa các Hub.
- **Bộ máy mô phỏng What-if:** Đánh giá 5 kịch bản giả định (cao điểm Metro, Hub đầy chỗ, quá tải sạc, hỏng cổng sạc, dồn ứ xe) để xuất khuyến nghị điều phối.

---

## 2. TIẾN ĐỘ DỰ ÁN (PROJECT PROGRESS TRACKER)

### Thiết lập Môi trường & Bộ Quy chuẩn Ban đầu
- [x] **Cấu hình Workspace:** Tích hợp extension `hediet.vscode-drawio` qua [`.vscode/extensions.json`](../../.vscode/extensions.json) để chỉnh sửa diagram kéo thả trực tiếp trong VS Code.
- [x] **Thiết lập Bộ quy tắc UML Designer:** Xây dựng cẩm nang tiêu chuẩn thiết kế chuẩn slide bài giảng ĐHQG-HCM & Ian Sommerville tại [`docs/standards/`](../standards) (Use Case, Activity, Sequence, Class, State-chart Diagram và Kiến trúc 4+1 View).
- [x] **Thiết lập Agent Guidelines:** Ban hành quy chuẩn bắt buộc chống lỗi hình học Draw.io tại [`AGENTS.md`](../../AGENTS.md) và [`GEMINI.md`](../../GEMINI.md).
- [x] **Đặc tả Yêu cầu Toàn diện:** Soạn thảo hồ sơ kiến trúc master [`PROJECT_SPECIFICATION.md`](../requirements/PROJECT_SPECIFICATION.md).

---

### Giai đoạn 1: Submission #1 (Đặc tả Yêu cầu & Use Case)
- [x] **Phân tích Bối cảnh & Phạm vi Dự án:** Xác định bài toán kết nối Metro số 1 và hệ thống Hub ĐHQG.
- [x] **Phân tích Tác nhân (Stakeholders):** Xác định Primary Actors (User và Operator - bên trái) và Secondary Actors (IoT Sensor Stream, Notification Service - bên phải khi tham gia).
- [x] **Sơ đồ Use Case Tổng quan Toàn Hệ thống:** Khởi tạo [`general_usecase_diagram.drawio`](../diagrams/01_Usecase_Diagram/drawio/general_usecase_diagram.drawio) bao trọn 14 Use Cases.
- [x] **Sơ đồ Use Case Chi tiết Nhóm Người dùng (7 UC):**
  - [x] [`UC01: Search Mobility Hub`](../diagrams/01_Usecase_Diagram/drawio/UC01-Search_Mobility_Hub.drawio)
  - [x] [`UC02: View Available Vehicles`](../diagrams/01_Usecase_Diagram/drawio/UC02-View_Available_Vehicles.drawio)
  - [x] [`UC03: Reserve Vehicle`](../diagrams/01_Usecase_Diagram/drawio/UC03-Reserve_Vehicle.drawio)
  - [x] [`UC04: Pick Up Vehicle`](../diagrams/01_Usecase_Diagram/drawio/UC04-Pick_Up_Vehicle.drawio)
  - [x] [`UC05: Return Vehicle`](../diagrams/01_Usecase_Diagram/drawio/UC05-Return_Vehicle.drawio)
  - [x] [`UC06: Manage Parking Reservation`](../diagrams/01_Usecase_Diagram/drawio/UC06-S1-Create_Parking_Reservation.drawio)
  - [x] [`UC07: Request Charging`](../diagrams/01_Usecase_Diagram/drawio/UC07-Request_Charging.drawio)
- [x] **Sơ đồ Use Case Chi tiết Nhóm Vận hành (7 UC):**
  - [x] [`UC08: Monitor Mobility Hub Network`](../diagrams/01_Usecase_Diagram/drawio/UC8-Monitor_Mobility_Hub_Network.drawio)
  - [x] [`UC09: Manage Mobility Resources`](../diagrams/01_Usecase_Diagram/drawio/UC9-Manage_Mobility_Resources.drawio)
  - [x] [`UC10: Redistribute Vehicles`](../diagrams/01_Usecase_Diagram/drawio/UC10-Redistribute_Vehicles.drawio)
  - [x] [`UC11: Handle Operational Incident`](../diagrams/01_Usecase_Diagram/drawio/UC11-Handle_Operational_Incident.drawio)
  - [x] [`UC12: Manage Charging Schedule`](../diagrams/01_Usecase_Diagram/drawio/UC12-Manage_Charging_Schedule.drawio)
  - [x] [`UC13: Run What-if Simulation`](../diagrams/01_Usecase_Diagram/drawio/UC13-Run_What-if_Simulation.drawio)
  - [x] [`UC14: View Simulation Results`](../diagrams/01_Usecase_Diagram/drawio/UC14-View_Simulation_Results.drawio)
- [x] **Bộ Mã nguồn PlantUML & Mermaid Use Case:** Đóng gói toàn bộ trong [`danh mục sơ đồ`](../diagrams/01_Usecase_Diagram/README.md).
- [x] **Yêu cầu Phi chức năng (General NFRs):** Thời gian thực, chống double-booking, tính tin cậy.
- [x] **Yêu cầu Chức năng Phi tương tác (Bonus):** 4 tiến trình nền (Hủy quá hạn 15p, Giả lập hao pin, Watcher ngưỡng tải, Rebalance sạc tự động).
- [x] **Viết Kịch bản Chi tiết từng Use Case (Individual Work):** Hoàn thành 100% kịch bản cho 14 Use Cases theo chuẩn mẫu bảng trong slide bài giảng ĐHQG-HCM (Slide Ch3 p.56 & Ch6 p.19-20).
- [x] **Đóng gói Hồ sơ Báo cáo Đợt 1:** Xuất bản hoàn chỉnh file báo cáo tổng hợp [`SUBMISSION_1_REPORT.md`](SUBMISSION_1_REPORT.md).

---

### Giai đoạn 2: Submission #2 (Mô hình Động & Giao diện UI)
- [x] **Thiết kế UI Mockup Toàn hệ thống (Group Work - Đã hoàn thành sẵn):**
  - [x] **Phân hệ Người dùng (Mobile App):** Ứng dụng [`Android`](../../android/README.md) kết nối backend.
  - [x] **Phân hệ Operator Hiện trường (Mobile App):** Bản mẫu [`operator-app.html`](../../app/prototype/operator-app.html) (8 màn hình tác nghiệp).
  - [x] **Phân hệ Operator Trung tâm (Web Dashboard):** Bản mẫu [`operator-web.html`](../../app/prototype/operator-web.html) (7 màn hình phân tích).
  - [x] **Trình duyệt Mockup Toàn cảnh:** Bản mẫu [`index.html`](../../app/prototype/index.html) chuyển đổi linh hoạt 26 màn hình.
  - [x] **Hồ sơ UI/UX Xuất bản:** File tài liệu 14 trang A4 Landscape [`UI-UX.pdf`](../../app/prototype/UI-UX.pdf) và 26 ảnh chất lượng cao [`screens/`](../../app/prototype/screens).
  - [x] **Kiểm định Tự động Playwright:** Chạy kiểm tra 9 kịch bản nghiệp vụ đạt chuẩn (`verification.json` -> `passed: true`).
- [x] **Thiết kế Sơ đồ Tuần tự (Sequence Diagrams - Individual Work):**
  - Hoàn thành 7 sơ đồ tuần tự chuẩn kỹ thuật (`SQ01` - `SQ07`) trong [`docs/diagrams/02_Sequence_Diagram/`](../diagrams/02_Sequence_Diagram).
  - Đóng gói tài liệu PlantUML & Mermaid tại [`danh mục sơ đồ`](../diagrams/02_Sequence_Diagram/README.md).
- [x] **Thiết kế Sơ đồ Hoạt động (Activity Diagrams - Individual Work):**
  - Hoàn thành 7 sơ đồ hoạt động có guard condition, cơ chế thoát và chống lặp vô tận (`AD01` - `AD07`) trong [`docs/diagrams/03_Activity_Diagram/`](../diagrams/03_Activity_Diagram).
  - Đóng gói tài liệu PlantUML & Mermaid tại [`danh mục sơ đồ`](../diagrams/03_Activity_Diagram/README.md).
- [x] **Thiết kế Sơ đồ Trạng thái (State-chart Diagrams - Bonus):**
  - Hoàn thành 3 sơ đồ trạng thái thực thể lõi (`SC01` Vòng đời Xe, `SC02` Vòng đời Trụ sạc, `SC03` Vòng đời Đặt giữ & Cuốc xe) trong [`docs/diagrams/04_Statechart_Diagram/`](../diagrams/04_Statechart_Diagram).
  - Đóng gói tài liệu PlantUML & Mermaid tại [`danh mục sơ đồ`](../diagrams/04_Statechart_Diagram/README.md).

---

### Giai đoạn 3: Submission #3 (Kiến trúc Hệ thống & Thiết kế Chi tiết)
- [x] **Deployment View (Góc nhìn Triển khai):** [`DP01-deployment.drawio`](../diagrams/deployment/DP01-deployment.drawio) và [`README-deployment.md`](../diagrams/deployment/README-deployment.md).
- [x] **Development / Implementation View (Góc nhìn Phát triển):** [`DECISION.md`](../architecture/DECISION.md), [`06_Component_Diagram/`](../diagrams/06_Component_Diagram/README.md), [`07_Package_Diagram/`](../diagrams/07_Package_Diagram/README.md).
- [x] **Class Diagram (Biểu đồ Lớp):** [`05_Class_Diagram/`](../diagrams/05_Class_Diagram/README.md) và [`CLASS_CATALOG.md`](../../.agent/class-diagram/CLASS_CATALOG.md).
- [x] **Đặc tả & Kiểm thử Nghiệp vụ (Test Cases):** 172 test Node.js (`npm test`) và bộ kiểm định UML tự động.

---

### Giai đoạn 4: Submission #Final & Trình diễn MVP
- [x] **Sản phẩm Mẫu & Vận hành Thực tế (MVP):** Backend Express + SQLite tích hợp 3 phân hệ, Android User App và Operator Web/Mobile Dashboards (Version 2.0).

---

## 3. DANH MỤC TÀI NGUYÊN & LỐI TẮT NHANH

| Danh mục | Đường dẫn | Nội dung & Mục đích |
| :--- | :--- | :--- |
| **Master Specification** | [`PROJECT_SPECIFICATION.md`](../requirements/PROJECT_SPECIFICATION.md) | Tài liệu đặc tả kỹ thuật chi tiết toàn bộ dự án (Bối cảnh, FRs, NFRs, What-if, UI/UX, AI Policy). |
| **Báo cáo Submission #1** | [`SUBMISSION_1_REPORT.md`](SUBMISSION_1_REPORT.md) | Báo cáo hoàn chỉnh Giai đoạn 1 gồm bối cảnh, 14 kịch bản Use Case chi tiết, NFRs và Bonus FRs. |
| **Thư mục Sơ đồ Hệ thống** | [`docs/diagrams/`](../diagrams) | Thư mục gốc chứa toàn bộ các loại sơ đồ UML chuẩn hóa của hệ thống. |
| **Sơ đồ Use Case** | [`docs/diagrams/01_Usecase_Diagram/`](../diagrams/01_Usecase_Diagram) | Sơ đồ tổng quan và các sơ đồ chi tiết `.drawio` kèm [`danh mục sơ đồ`](../diagrams/01_Usecase_Diagram/README.md). |
| **Sơ đồ Tuần tự (Sequence)** | [`docs/diagrams/02_Sequence_Diagram/`](../diagrams/02_Sequence_Diagram) | 7 sơ đồ vector `.drawio` (`SQ01` - `SQ07`) kèm [`danh mục sơ đồ`](../diagrams/02_Sequence_Diagram/README.md). |
| **Sơ đồ Hoạt động (Activity)** | [`docs/diagrams/03_Activity_Diagram/`](../diagrams/03_Activity_Diagram) | 7 sơ đồ vector `.drawio` (`AD01` - `AD07`) kèm [`danh mục sơ đồ`](../diagrams/03_Activity_Diagram/README.md). |
| **Sơ đồ Trạng thái (Statechart)** | [`docs/diagrams/04_Statechart_Diagram/`](../diagrams/04_Statechart_Diagram) | 3 sơ đồ vector `.drawio` (`SC01` - `SC03`) kèm [`danh mục sơ đồ`](../diagrams/04_Statechart_Diagram/README.md). |
| **Bản mẫu UI/UX** | [`app/prototype/`](../../app/prototype) | Trình duyệt mockup tĩnh (`index.html`) và các giao diện Operator live (`operator-web.html`, `operator-app.html`). |
| **Quy chuẩn UML** | [`docs/standards/`](../standards) | Cẩm nang quy tắc vẽ chuẩn slide ĐHQG-HCM: Use Case, Activity, Sequence, Class, State-chart Diagram và Kiến trúc 4+1 View. |
| **Đề bài Gốc Môn học** | [`04_BTL_SoftwareEngineering_HK261.pdf`](../references/04_BTL_SoftwareEngineering_HK261.pdf) | Yêu cầu bài tập lớn chính thức từ Giảng viên ĐHQG-HCM. |

---
*Tài liệu lưu trữ tiến độ Công nghệ phần mềm ĐHQG-HCM – Học kỳ 261.*
