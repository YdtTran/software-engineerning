# Smart E-Mobility Hub – Hệ thống Điều phối Phương tiện Điện ĐHQG-HCM

[![Course](https://img.shields.io/badge/Course-Software%20Engineering%20(HK261)-0284c7.svg)](#)
[![University](https://img.shields.io/badge/University-VNU--HCM-152584.svg)](#)
[![UML Standard](https://img.shields.io/badge/UML-PlantUML%20%7C%20Draw.io%20SVG-059669.svg)](#)
[![UI/UX Prototype](https://img.shields.io/badge/UI%2FUX-Playwright%20Verified%20(26%20Screens)-00B8D6.svg)](#)

> **Capstone Dashboard**  
> *Tài liệu đặc tả kiến trúc & yêu cầu chi tiết đầy đủ xem tại:* **[`PROJECT_SPECIFICATION.md`](./PROJECT_SPECIFICATION.md)**  

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
- [x] **Cấu hình Workspace:** Tích hợp extension `hediet.vscode-drawio` qua [`.vscode/extensions.json`](./.vscode/extensions.json) để chỉnh sửa diagram kéo thả trực tiếp trong VS Code.
- [x] **Thiết lập Bộ quy tắc UML Designer:** Xây dựng cẩm nang tiêu chuẩn thiết kế chuẩn slide bài giảng ĐHQG-HCM & Ian Sommerville tại [`02_Rules/`](./02_Rules/) (Use Case, Activity, Sequence, Class, State-chart Diagram và Kiến trúc 4+1 View).
- [x] **Thiết lập Agent Guidelines:** Ban hành quy chuẩn bắt buộc chống lỗi hình học Draw.io tại [`AGENTS.md`](./AGENTS.md) và [`GEMINI.md`](./GEMINI.md).
- [x] **Đặc tả Yêu cầu Toàn diện:** Soạn thảo hồ sơ kiến trúc master [`PROJECT_SPECIFICATION.md`](./PROJECT_SPECIFICATION.md).

---

### Giai đoạn 1: Submission #1 (Đặc tả Yêu cầu & Use Case)
- [x] **Phân tích Bối cảnh & Phạm vi Dự án:** Xác định bài toán kết nối Metro số 1 và hệ thống Hub ĐHQG.
- [x] **Phân tích Tác nhân (Stakeholders):** Xác định Primary Actors (Student và Operator - bên trái) và Secondary Actors (IoT Sensor Stream, Notification Service - bên phải khi tham gia).
- [x] **Sơ đồ Use Case Tổng quan Toàn Hệ thống:** Khởi tạo [`general_usecase_diagram.drawio.svg`](./01_Diagram/01_Usecase_Diagram/GENERAL/general_usecase_diagram.drawio.svg) bao trọn 14 Use Cases.
- [x] **Sơ đồ Use Case Chi tiết Nhóm Sinh viên (7 UC):**
  - [x] [`UC01: Search Mobility Hub`](./01_Diagram/01_Usecase_Diagram/STUDENTS/UC01-Search_Mobility_Hub.drawio.svg)
  - [x] [`UC02: View Available Vehicles`](./01_Diagram/01_Usecase_Diagram/STUDENTS/UC02-View_Available_Vehicles.drawio.svg)
  - [x] [`UC03: Reserve Vehicle`](./01_Diagram/01_Usecase_Diagram/STUDENTS/UC03-Reserve_Vehicle.drawio.svg)
  - [x] [`UC04: Pick Up Vehicle`](./01_Diagram/01_Usecase_Diagram/STUDENTS/UC04-Pick_Up_Vehicle.drawio.svg)
  - [x] [`UC05: Return Vehicle`](./01_Diagram/01_Usecase_Diagram/STUDENTS/UC05-Return_Vehicle.drawio.svg)
  - [x] [`UC06: Reserve Parking Space`](./01_Diagram/01_Usecase_Diagram/STUDENTS/UC06-Reserve_Parking_Space.drawio.svg)
  - [x] [`UC07: Request Charging`](./01_Diagram/01_Usecase_Diagram/STUDENTS/UC07-Request_Charging.drawio.svg)
- [x] **Sơ đồ Use Case Chi tiết Nhóm Vận hành (7 UC):**
  - [x] [`UC08: Monitor Mobility Hub Network`](./01_Diagram/01_Usecase_Diagram/OPERATOR/UC8-Monitor_Mobility_Hub_Network.drawio.svg)
  - [x] [`UC09: Manage Mobility Resources`](./01_Diagram/01_Usecase_Diagram/OPERATOR/UC9-Manage_Mobility_Resources.drawio.svg)
  - [x] [`UC10: Redistribute Vehicles`](./01_Diagram/01_Usecase_Diagram/OPERATOR/UC10-Redistribute_Vehicles.drawio.svg)
  - [x] [`UC11: Handle Operational Incident`](./01_Diagram/01_Usecase_Diagram/OPERATOR/UC11-Handle_Operational_Incident.drawio.svg)
  - [x] [`UC12: Manage Charging Schedule`](./01_Diagram/01_Usecase_Diagram/OPERATOR/UC12-Manage_Charging_Schedule.drawio.svg)
  - [x] [`UC13: Run What-if Simulation`](./01_Diagram/01_Usecase_Diagram/OPERATOR/UC13-Run_What-if_Simulation.drawio.svg)
  - [x] [`UC14: View Simulation Results`](./01_Diagram/01_Usecase_Diagram/OPERATOR/UC14-View_Simulation_Results.drawio.svg)
- [x] **Bộ Mã nguồn PlantUML & Mermaid Use Case:** Đóng gói toàn bộ trong [`PLANTUML_ALL.md`](./01_Diagram/01_Usecase_Diagram/PLANTUML_ALL.md).
- [x] **Yêu cầu Phi chức năng (General NFRs):** Thời gian thực, chống double-booking, tính tin cậy.
- [x] **Yêu cầu Chức năng Phi tương tác (Bonus):** 4 tiến trình nền (Hủy quá hạn 15p, Giả lập hao pin, Watcher ngưỡng tải, Rebalance sạc tự động).
- [x] **Viết Kịch bản Chi tiết từng Use Case (Individual Work):** Hoàn thành 100% kịch bản cho 14 Use Cases theo chuẩn mẫu bảng trong slide bài giảng ĐHQG-HCM (Slide Ch3 p.56 & Ch6 p.19-20).
- [x] **Đóng gói Hồ sơ Báo cáo Đợt 1:** Xuất bản hoàn chỉnh file báo cáo tổng hợp [`SUBMISSION_1_REPORT.md`](./SUBMISSION_1_REPORT.md).

---

### Giai đoạn 2: Submission #2 (Mô hình Động & Giao diện UI)
- [x] **Thiết kế UI Mockup Toàn hệ thống (Group Work - Đã hoàn thành sẵn):**
  - [x] **Phân hệ Sinh viên (Mobile App):** Bản mẫu [`user-app.html`](./03_App/01_UI_UX/user-app.html) (9 màn hình nghiệp vụ).
  - [x] **Phân hệ Operator Hiện trường (Mobile App):** Bản mẫu [`operator-app.html`](./03_App/01_UI_UX/operator-app.html) (8 màn hình tác nghiệp).
  - [x] **Phân hệ Operator Trung tâm (Web Dashboard):** Bản mẫu [`operator-web.html`](./03_App/01_UI_UX/operator-web.html) (7 màn hình phân tích).
  - [x] **Trình duyệt Mockup Toàn cảnh:** Bản mẫu [`index.html`](./03_App/01_UI_UX/index.html) chuyển đổi linh hoạt 26 màn hình.
  - [x] **Hồ sơ UI/UX Xuất bản:** File tài liệu 14 trang A4 Landscape [`UI-UX.pdf`](./03_App/01_UI_UX/UI-UX.pdf) và 26 ảnh chất lượng cao [`screens/`](./03_App/01_UI_UX/screens/).
  - [x] **Kiểm định Tự động Playwright:** Chạy kiểm tra 9 kịch bản nghiệp vụ đạt chuẩn (`verification.json` -> `passed: true`).
- [x] **Thiết kế Sơ đồ Tuần tự (Sequence Diagrams - Individual Work):**
  - Hoàn thành 7 sơ đồ tuần tự chuẩn kỹ thuật (`SQ01` - `SQ07`) trong [`01_Diagram/02_Sequence_Diagram/`](./01_Diagram/02_Sequence_Diagram/).
  - Đóng gói tài liệu PlantUML & Mermaid tại [`PLANTUML_SEQUENCE.md`](./01_Diagram/02_Sequence_Diagram/PLANTUML_SEQUENCE.md).
- [x] **Thiết kế Sơ đồ Hoạt động (Activity Diagrams - Individual Work):**
  - Hoàn thành 7 sơ đồ hoạt động có guard condition, cơ chế thoát và chống lặp vô tận (`AD01` - `AD07`) trong [`01_Diagram/03_Activity_Diagram/`](./01_Diagram/03_Activity_Diagram/).
  - Đóng gói tài liệu PlantUML & Mermaid tại [`PLANTUML_ACTIVITY.md`](./01_Diagram/03_Activity_Diagram/PLANTUML_ACTIVITY.md).
- [x] **Thiết kế Sơ đồ Trạng thái (State-chart Diagrams - Bonus):**
  - Hoàn thành 3 sơ đồ trạng thái thực thể lõi (`SC01` Vòng đời Xe, `SC02` Vòng đời Trụ sạc, `SC03` Vòng đời Đặt giữ & Cuốc xe) trong [`01_Diagram/04_Statechart_Diagram/`](./01_Diagram/04_Statechart_Diagram/).
  - Đóng gói tài liệu PlantUML & Mermaid tại [`PLANTUML_STATECHART.md`](./01_Diagram/04_Statechart_Diagram/PLANTUML_STATECHART.md).

---

### Giai đoạn 3: Submission #3 (Kiến trúc Hệ thống & Thiết kế Chi tiết)
- [ ] **Deployment View (Góc nhìn Triển khai):** Sơ đồ máy chủ, client di động, kết nối cảm biến IoT telemetry.
- [ ] **Development / Implementation View (Góc nhìn Phát triển):** Kiến trúc phân tầng (Clean/Layered Architecture), module và thư viện.
- [ ] **Class Diagram (Biểu đồ Lớp):** Thiết kế cấu trúc các lớp thực thể, dịch vụ, bộ điều khiển, mối quan hệ và bội số quan hệ.
- [ ] **Đặc tả Phương thức (Method Descriptions):** Mô tả chi tiết 100% các phương thức trong Class Diagram (mục đích, tham số, giá trị trả về, giải thuật).
- [ ] **Kịch bản Kiểm thử (Test Cases - Bonus):** Bộ Test Cases kiểm thử chức năng và luồng nghiệp vụ.

---

### Giai đoạn 4: Submission #Final & Trình diễn MVP
- [ ] **Hợp nhất Báo cáo Tổng kết:** Gộp nội dung #1, #2, #3 thành 01 file PDF duy nhất.
- [ ] **Chuẩn bị Bài thuyết trình & Slide:** Nêu rõ kiến trúc, kết quả đạt được và bài học kinh nghiệm (Lessons learned).
- [ ] **Khai báo Minh bạch Generative AI:** Điền bảng kê khai công cụ, phạm vi và mức độ đóng góp theo quy định.
- [ ] **Trình diễn Sản phẩm Mẫu (MVP Demonstration):** Trình diễn chuỗi màn hình thao tác hoàn chỉnh (Sequence of screens) trên nền tảng prototype [`03_App/01_UI_UX/`](./03_App/01_UI_UX/).

---

## 3. DANH MỤC TÀI NGUYÊN & LỐI TẮT NHANH

Mỗi tài nguyên được duy trì tại một nơi: prototype và ảnh xuất tại `03_App/01_UI_UX/`, ảnh giao diện tham khảo tại `03_App/00_Ref/`, quy chuẩn UML tại `02_Rules/`, skill tại `.agents/skills/uml-designer/`. `refs/` giữ đề bài tham khảo và PNG use case gốc có nội dung khác bản hiện tại. `GEMINI.md` và `.agent/rules/uml-designer.md` tham chiếu bộ hướng dẫn chung trong `AGENTS.md`.

| Danh mục | Đường dẫn | Nội dung & Mục đích |
| :--- | :--- | :--- |
| **Master Specification** | [`PROJECT_SPECIFICATION.md`](./PROJECT_SPECIFICATION.md) | Tài liệu đặc tả kỹ thuật chi tiết toàn bộ dự án (Bối cảnh, FRs, NFRs, What-if, UI/UX, AI Policy). |
| **Báo cáo Submission #1** | [`SUBMISSION_1_REPORT.md`](./SUBMISSION_1_REPORT.md) | Báo cáo hoàn chỉnh Giai đoạn 1 gồm bối cảnh, 14 kịch bản Use Case chi tiết, NFRs và Bonus FRs. |
| **Thư mục Sơ đồ Hệ thống** | [`01_Diagram/`](./01_Diagram/) | Thư mục gốc chứa toàn bộ các loại sơ đồ UML chuẩn hóa của hệ thống. |
| **Sơ đồ Use Case** | [`01_Diagram/01_Usecase_Diagram/`](./01_Diagram/01_Usecase_Diagram/) | 15 sơ đồ vector `.drawio.svg` (Tổng quan, 7 UC Sinh viên, 7 UC Operator) kèm [`PLANTUML_ALL.md`](./01_Diagram/01_Usecase_Diagram/PLANTUML_ALL.md). |
| **Bộ Use Case đã rà soát** | [`Danh mục & checklist`](./01_Diagram/01_Usecase_Diagram/README.md) | 15 file `.drawio` gốc chỉnh sửa được, SVG/PNG đã kiểm tra không giao cắt hoặc chồng đường nối; quy tắc nghiệp vụ đã đồng bộ với báo cáo. |
| **Sơ đồ Tuần tự (Sequence)** | [`01_Diagram/02_Sequence_Diagram/`](./01_Diagram/02_Sequence_Diagram/) | 7 sơ đồ vector `.drawio.svg` (`SQ01` - `SQ07`) kèm [`PLANTUML_SEQUENCE.md`](./01_Diagram/02_Sequence_Diagram/PLANTUML_SEQUENCE.md). |
| **Sơ đồ Hoạt động (Activity)** | [`01_Diagram/03_Activity_Diagram/`](./01_Diagram/03_Activity_Diagram/) | 7 sơ đồ vector `.drawio.svg` (`AD01` - `AD07`) kèm [`PLANTUML_ACTIVITY.md`](./01_Diagram/03_Activity_Diagram/PLANTUML_ACTIVITY.md). |
| **Sơ đồ Trạng thái (Statechart)** | [`01_Diagram/04_Statechart_Diagram/`](./01_Diagram/04_Statechart_Diagram/) | 3 sơ đồ vector `.drawio.svg` (`SC01` - `SC03`) kèm [`PLANTUML_STATECHART.md`](./01_Diagram/04_Statechart_Diagram/PLANTUML_STATECHART.md). |
| **Bản mẫu UI/UX** | [`03_App/01_UI_UX/`](./03_App/01_UI_UX/) | Prototype tương tác hoàn chỉnh (26 màn hình), không cần cài đặt server, mở chạy trực tiếp trên Chrome/Edge. |
| **Hồ sơ UI/UX PDF** | [`UI-UX.pdf`](./03_App/01_UI_UX/UI-UX.pdf) | Bộ tài liệu 14 trang A4 Landscape chất lượng cao phục vụ nộp bài **Submission #2**. |
| **Quy chuẩn UML** | [`02_Rules/`](./02_Rules/) | Cẩm nang quy tắc vẽ chuẩn slide ĐHQG-HCM: Use Case, Activity, Sequence, Class, State-chart Diagram và Kiến trúc 4+1 View. |
| **Đề bài Gốc Môn học** | [`04_BTL_SoftwareEngineering_HK261.pdf`](./04_BTL_SoftwareEngineering_HK261.pdf) | Yêu cầu bài tập lớn chính thức từ Giảng viên ĐHQG-HCM. |

---

## 4. HƯỚNG DẪN THAO TÁC NHANH

### Cách 1: Xem & Trải nghiệm Prototype UI/UX
- Nhấp đúp mở file [`03_App/01_UI_UX/index.html`](./03_App/01_UI_UX/index.html) bằng trình duyệt **Google Chrome** hoặc **Microsoft Edge**.
- Bấm các nút phía trên: `App người dùng` (Mobile Sinh viên), `App operator` (Mobile Hiện trường) hoặc `Web operator` (Dashboard PC).
- Dùng menu `Màn hình` để nhảy nhanh tới bất kỳ Use Case nào cần kiểm tra.

### Cách 2: Xem & Chỉnh sửa Sơ đồ Vẽ offline trong VS Code
- Mở bất kỳ file `.drawio.svg` nào trong thư mục [`01_Diagram/`](./01_Diagram/) ngay trên VS Code (đã tích hợp sẵn extension Draw.io).
- Bạn có thể kéo thả, thêm bớt node trực quan và lưu lại trực tiếp dưới dạng ảnh vector sắc nét.

### Cách 3: Import Mã PlantUML vào Visual Paradigm Online hoặc Draw.io
- Mở file PlantUML tương ứng (`PLANTUML_ALL.md`, `PLANTUML_SEQUENCE.md`, `PLANTUML_ACTIVITY.md`, `PLANTUML_STATECHART.md`) và sao chép đoạn mã cần dùng.
- **Draw.io:** Chọn `+` -> `Advanced` -> `PlantUML`, dán mã và bấm `Insert`.
- **Visual Paradigm Online:** Chọn `File` -> `Import` -> `PlantUML...`.

---
*Tài liệu tóm tắt quản lý tiến độ Công nghệ phần mềm ĐHQG-HCM – Học kỳ 261.*
