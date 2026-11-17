# ĐỀ XUẤT CẤU TRÚC FINAL REPORT & SLIDE THUYẾT TRÌNH

**Dự án:** Smart E-Mobility Hub – Hệ thống Điều phối Phương tiện Điện ĐHQG-HCM  
**Học phần:** Công nghệ Phần mềm (CO3001) – HK261, ĐHQG-HCM  
**Nguồn chuẩn đối chiếu:** `README.md`, `docs/requirements/PROJECT_SPECIFICATION.md`, `docs/references/04_BTL_SoftwareEngineering_HK261.pdf`, `docs/slides/` (`03_Ch3_4`, `06_Ch6`, `07_Ch7`, `08_Ch8`, `09_Ch9`), `docs/audits/post-merge/ASSIGNMENT_COMPLIANCE.md`  
**File LaTeX đã triển khai:**
- **Final Report:** `docs/reports/final-report/report.tex` (chia theo các section tại `docs/reports/final-report/sections/*.tex`)
- **Slide Thuyết trình:** `docs/reports/SLIDE_CNPM/main.tex` (chia theo các section tại `docs/reports/SLIDE_CNPM/sections/*.tex`)

---

## PHẦN A: CẤU TRÚC OUTLINE BÁO CÁO TỔNG KẾT (FINAL CONSOLIDATED REPORT PDF)

Theo yêu cầu của giảng viên (`docs/references/04_BTL_SoftwareEngineering_HK261.pdf`, trang 4–6) và lộ trình ở `README.md`, báo cáo cuối kỳ hợp nhất **Submission #1, #2, #3, Working Demonstration và Khai báo GenAI** thành **01 file PDF duy nhất**.

### 0. Mở đầu: Phân công Thành viên và Quản lý Tài liệu
- **File LaTeX:** `docs/reports/final-report/sections/00_intro.tex`
- Thông tin môn học, giảng viên hướng dẫn, bảng phân công 4 thành viên/module (UX/UI – Ý, Mobility & Simulation – Minh, Parking & Charging – Triết, Operations – Duy), bảng thuật ngữ và ký hiệu viết tắt.
- **File nguồn liên quan:**
  - `README.md`
  - `index.md`
  - `GLOSSARY.md`
  - `docs/architecture/DEVELOPMENT_GUIDE.md`

### Chương 1: Đặc tả Yêu cầu Hệ thống và Mô hình hóa Use Case (Submission #1)
- **File LaTeX:** `docs/reports/final-report/sections/01_requirements.tex`
- **Các mục chính (chuẩn Slide `Ch3–4` & `Ch6`):**
  1. **Bối cảnh và Phạm vi Dự án (`Project Details Specification`):** Kết nối chặng cuối (*last-mile transit*) từ Ga Metro số 1 ĐHQG đến các trường thành viên & KTX; ranh giới *In-Scope* vs. *Out-of-Scope* (sử dụng dữ liệu cảm biến giả lập, bản đồ logic 2D).
  2. **Phân tích Bên liên quan và Tác nhân Hệ thống (`Stakeholders and Actors`):** *Primary Actors* (`User`, `Operator`) và *Secondary Actors* (`IoT Sensor Stream`, `Notification Service`).
  3. **Mô hình Tương tác: Sơ đồ Use Case Toàn hệ thống (`System-wide Use Case Diagram`):** 14 Use Cases cốt lõi (UC01–UC07 cho User; UC08–UC14 cho Operator) + 6 kịch bản vòng đời bổ sung (UC06-S1/S2/S3, UC07A, UC10A/B, UC11A).
  4. **Đặc tả Chi tiết Use Case (`Use-Case Specifications`):** Hợp đồng kịch bản 11 trường chuẩn slide ĐHQG-HCM cho toàn bộ UC01–UC14.
  5. **Yêu cầu Phi chức năng (`NFRs`) và Quy tắc Nghiệp vụ (`BR01–BR14`):** Kiểm soát đồng thời (*single-winner semantics* với `BEGIN IMMEDIATE`), tính lũy đẳng (*Idempotency*), SLA sự cố khẩn cấp 60 giây, ngưỡng cảnh báo mạng lưới.
  6. **Yêu cầu Chức năng Phi tương tác (`Bonus`):** 4 tiến trình nền (`FR-NI01` hủy giữ chỗ quá hạn 15 phút, `FR-NI02` suy giảm pin & telemetry, `FR-NI03` cảnh báo sức chứa Hub, `FR-NI04` tái lập lịch sạc).
- **File nguồn liên quan:**
  - `docs/slides/03_Ch3_4 Requirements Engineering.pdf`
  - `docs/reports/SUBMISSION_1_REPORT.md`
  - `docs/requirements/PROJECT_SPECIFICATION.md`
  - `docs/requirements/USE_CASE_REFACTOR_IMPACT.md`
  - `docs/diagrams/01_Usecase_Diagram/README.md`
  - `docs/diagrams/01_Usecase_Diagram/LIFECYCLE_SCENARIOS.md`
  - `docs/diagrams/01_Usecase_Diagram/general_usecase_diagram.drawio`
  - `docs/diagrams/01_Usecase_Diagram/user_usecases.drawio`
  - `docs/diagrams/01_Usecase_Diagram/operator_usecases.drawio`
  - `docs/diagrams/01_Usecase_Diagram/UC01-Search_Mobility_Hub.drawio` ... `UC14-View_Simulation_Results.drawio`

### Chương 2: Mô hình Động và Thiết kế Giao diện UI/UX (Submission #2)
- **File LaTeX:** `docs/reports/final-report/sections/02_dynamic_ui.tex`
- **Các mục chính (chuẩn Slide `Ch6`):**
  1. **Thiết kế Giao diện UI (`UI Design: Mockup` – 26 màn hình):** 3 giao diện độc lập (`Mobile User App`, `Mobile Operator App`, `Operator Web`), bảng ánh xạ 14 UCs $\rightarrow$ 26 màn hình tại `screens/`, kết quả kiểm định Playwright (`verification.json` $\rightarrow$ `passed: true`).
  2. **Mô hình Tương tác: Sơ đồ Tuần tự (`Sequence Diagrams` – `SQ01–SQ07`):** Trình tự trao đổi thông điệp và khóa giữ tài nguyên giữa Actor, API, Services, Repositories.
  3. **Mô hình Hành vi: Sơ đồ Hoạt động (`Activity Diagrams` – `AD01–AD07`):** Luồng nghiệp vụ với swimlanes, guard conditions, nhánh ngoại lệ và cơ chế thoát vòng lặp.
  4. **Mô hình Hành vi: Sơ đồ Trạng thái (`State-chart Diagrams` – `Bonus` – `SC01–SC03`):** Vòng đời Xe điện (`SC01`), Cổng sạc (`SC02`), Đặt giữ & Chuyến đi (`SC03`).
- **File nguồn liên quan:**
  - `docs/slides/06_Ch6 System Modeling_2025.pdf`
  - `app/prototype/README.md`
  - `app/prototype/UI-UX.pdf`
  - `app/prototype/verification.json`
  - `app/prototype/screens/` (26 ảnh PNG màn hình)
  - `app/prototype/design-board.png`
  - `app/prototype/operator-app-board.png`
  - `docs/diagrams/02_Sequence_Diagram/README.md`
  - `docs/diagrams/02_Sequence_Diagram/SQ01-Reserve_Vehicle.drawio` ... `SQ07-Run_What_if_Simulation.drawio`
  - `docs/diagrams/03_Activity_Diagram/README.md`
  - `docs/diagrams/03_Activity_Diagram/ACTIVITY_PREVIEWS.md`
  - `docs/diagrams/03_Activity_Diagram/AD01-Reserve_Vehicle.drawio` ... `AD07-Run_What_if_Simulation.drawio`
  - `docs/diagrams/04_Statechart_Diagram/README.md`
  - `docs/diagrams/04_Statechart_Diagram/SC01-Vehicle_State_Machine.drawio`
  - `docs/diagrams/04_Statechart_Diagram/SC02-Charging_Point_State_Machine.drawio`
  - `docs/diagrams/04_Statechart_Diagram/SC03-Reservation_and_Trip_State_Machine.drawio`

### Chương 3: Kiến trúc Hệ thống và Thiết kế Chi tiết (Submission #3)
- **File LaTeX:** `docs/reports/final-report/sections/03_architecture_design.tex`
- **Các mục chính (chuẩn Slide `Ch7` & `Ch6`):**
  1. **Quyết định Kiến trúc và Mẫu Kiến trúc (`Architectural Patterns`):** Mô hình 4+1 View; *Modular Monolith* kết hợp *Layered Architecture Pattern* (5 tầng: `Presentation → API/Interface → Application → Domain → Infrastructure`) và *Repository Pattern* với Node.js + Express + SQLite.
  2. **Góc nhìn Triển khai (`Deployment View` – `DP01`):** Phân bố node vật lý và môi trường chạy (Client Devices, Node.js Server, SQLite DB, IoT Telemetry Simulator).
  3. **Góc nhìn Phát triển và Hiện thực (`Development View` – `DV01`, `DV02`):** Ranh giới tầng, Ports/Adapters (`InventoryInterface`, `tripReader`). *Lưu ý truy vết:* `DV01/DV02` phân rã 5 module logic thiết kế (*Accounts & Resources, Reservations & Trips, Charging, Operations, Simulation*); khi hiện thực MVP ở Chương 4 được gộp thành 3 module mã nguồn theo `DEVELOPMENT_GUIDE.md`.
  4. **Mô hình Cấu trúc: Sơ đồ Lớp (`Class Diagram`):** 19 lớp thực thể/dịch vụ, 18 operations, 31 associations và bội số quan hệ.
  5. **Đặc tả Lớp và Phương thức (`Method Descriptions`):** Tiền điều kiện, hậu điều kiện, tham số, giá trị trả về và ngoại lệ cho 100% phương thức.
  6. **Thiết kế Cơ sở dữ liệu SQLite:** 12 file migrations (`0001`–`0012`), chế độ WAL và transaction `BEGIN IMMEDIATE`.
- **File nguồn liên quan:**
  - `docs/slides/07_Ch7 Architectural Design_2025.pdf`
  - `docs/architecture/DECISION.md`
  - `docs/reports/DEVELOPMENT_IMPLEMENTATION_VIEW_REPORT.md`
  - `docs/architecture/API_CONTRACTS.md`
  - `docs/architecture/operations-architecture.html`
  - `docs/diagrams/deployment/DP01-deployment.drawio`
  - `docs/diagrams/deployment/README-deployment.md`
  - `docs/diagrams/06_Component_Diagram/DV01-Component_Diagram_New.drawio`
  - `docs/diagrams/06_Component_Diagram/README.md`
  - `docs/diagrams/07_Package_Diagram/DV02-Package_Diagram_New.drawio`
  - `docs/diagrams/07_Package_Diagram/README.md`
  - `docs/diagrams/05_Class_Diagram/smart_emobility_class_diagram.drawio`
  - `docs/diagrams/05_Class_Diagram/README.md`
  - `.agent/class-diagram/CLASS_CATALOG.md`
  - `app/db/README.md`
  - `app/db/migrations/README.md`
  - `app/db/migrations/0001_hub_inventory.sql` ... `0012_parking_charging_schema.sql`

### Chương 4: Hiện thực MVP, Kiểm thử và Trình diễn Hệ thống
- **File LaTeX:** `docs/reports/final-report/sections/04_mvp_testing_demo.tex`
- **Các mục chính (chuẩn Slide `Ch8`, `Ch9` & PDF trang 5):**
  1. **Cấu trúc 3 Module Backend và Ứng dụng Client (Web & Android):**
     - `app/src/modules/mobility-simulation`: Tìm Hub, đặt/nhận/trả xe (UC01–05) & bộ máy mô phỏng 5 kịch bản What-if trên *immutable snapshot* (UC13–14).
     - `app/src/modules/parking-charging`: Đặt chỗ đỗ xe cá nhân, check-in/out, lập lịch & phiên sạc thông minh (UC06, UC07, UC12 — PR #16, Migration `0012`).
     - `app/src/modules/operations`: Quản lý tài nguyên, giám sát KPI/cảnh báo, điều phối chuyển xe & xử lý sự cố (UC08–11), cung cấp `InventoryInterface`.
     - **Native Android User App (`android/` — PR #17):** Kotlin + Jetpack Compose + MapLibre/OpenFreeMap + chỉ đường OSRM + quét QR nhận xe (CameraX/ZXing), phục vụ đầy đủ luồng Người dùng (`UC01–UC07A, UC11A`).
     - **Operator Live Dashboard (`app/prototype/live.html`, `live.js` — PR #18):** Giao diện quản trị trực tiếp nối API backend cho toàn bộ luồng Operator (`UC08–UC14`).
  2. **Kiểm thử Phần mềm và Kịch bản Kiểm thử (`Test Cases` – `Bonus`):**
     - Phân tầng theo `Ch9`: *Unit*, *Component/Integration*, *Concurrency*, *Migration* và *E2E Playwright* trên **32 file kiểm thử (185 test cases)** trong `app/src/`: Core (6 file / 12 tests — gồm `dashboard-demo.test.js` & `live-browser.test.js`), Mobility-Simulation (8 file / 27 tests), Operations (12 file / 121 tests), Parking-Charging (6 file / 25 tests) + JVM unit tests cho Android (`android/gradlew testDebugUnitTest`).
     - *Lưu ý đối chiếu:* `docs/audits/post-merge/EXECUTIVE_SUMMARY.md` phản ánh snapshot cũ tại commit `ac21515` (25 file / 144 pass trước PR #16, #17, #18); các thiếu sót cũ F-01 (`parking-charging`) và F-02 (`live.js` Operator UI) đã được khắc phục ở bản hiện tại. Khi xuất bản PDF cuối kỳ cần chạy lại `npm test --prefix app` (sau `npm install`) để ghi nhận số pass mới nhất.
  3. **Trình diễn Sản phẩm Mẫu (`Working Demonstration`):**
     - **Luồng User trên Android App (`android/README.md`) & Web Live:** Tìm Hub trên bản đồ MapLibre, quét QR nhận xe, đặt đỗ & sạc xe cá nhân (`UC01–UC07A, UC11A`).
     - **Luồng Operator trên Live Dashboard (`app/prototype/live.html`, `app/db/create-dashboard-demo.js`):** Giám sát `UC08`, quản trị tài nguyên `UC09`, điều chuyển `UC10/10A/10B`, xử lý sự cố `UC11`, lập lịch sạc `UC12`, What-if `UC13–14`.
     - **Bộ Prototype Mockup (`app/prototype/index.html`):** Tham chiếu 26 màn hình thiết kế UI/UX chuẩn (`screens/`).
- **File nguồn liên quan:**
  - `docs/slides/08_Ch8 Implementation_2025.pdf`, `docs/slides/09_Ch9 Software Testing_2025.pdf`
  - `android/README.md`, `android/app/build.gradle.kts`, `android/app/src/main/java/com/smartemobility/hub/`
  - `app/README.md`, `app/package.json`, `app/db/create-dashboard-demo.js`
  - `app/src/app.js`, `app/src/demo-server.js`
  - `app/src/tests/` (`dashboard-demo.test.js`, `live-browser.test.js`, `demo-auth.test.js`, `demo-server.test.js`, `database-initializer.test.js`, `reconnect-http.test.js`)
  - `app/src/modules/mobility-simulation/` (`README.md`, `index.js`, `tests/`)
  - `app/src/modules/operations/` (`README.md`, `index.js`, `tests/`)
  - `app/src/modules/parking-charging/` (`index.js`, `tests/`)
  - `app/prototype/live.html` & `app/prototype/live.js`
  - `app/prototype/index.html` & `app/prototype/gallery.html`
  - `docs/architecture/MINH_DEMO_GUIDE.md`
  - `docs/audits/post-merge/EXECUTIVE_SUMMARY.md`
  - `docs/audits/post-merge/REQUIREMENTS_TRACEABILITY.md`
  - `docs/audits/post-merge/TEST_COVERAGE_GAPS.md`
  - `docs/audits/post-merge/UI_MVP_COVERAGE.md`

### Chương 5: Đánh giá, Bài học Kinh nghiệm và Hướng Phát triển
- **File LaTeX:** `docs/reports/final-report/sections/05_evaluation_lessons.tex`
- Đánh giá kết quả đạt được (SQLite ACID + 12 migrations, 32 file test / 185 test cases, Playwright E2E, đầy đủ 14 Use Cases trên Android User App & Operator Live Dashboard), hạn chế hiện tại & hướng phát triển (tích hợp IoT thực tế OCPP/MQTT, OAuth2/JWT, Docker/CI-CD), và *Bài học Kinh nghiệm (Lessons Learned)*.
- **File nguồn liên quan:**
  - `docs/audits/post-merge/REMEDIATION_ROADMAP.md`
  - `docs/audits/post-merge/ARCHITECTURE_CONSISTENCY.md`
  - `docs/audits/post-merge/UML_CONSISTENCY.md`

### Chương 6: Khai báo Minh bạch Generative AI và Quản trị Nhóm (Bắt buộc theo PDF Trang 4–6)
- **File LaTeX:** `docs/reports/final-report/sections/06_genai_teamwork.tex`
- **Khai báo Sử dụng Generative AI (`Tools, Scope, and Level of Contribution`):** Liệt kê công cụ, phạm vi, tỷ lệ đóng góp kèm minh chứng phần nhóm tự phân tích, chỉnh sửa lỗi logic, viết test kiểm chứng và đóng góp nguyên bản.
- **Tổ chức Họp nhóm, Biên bản Họp và Đánh giá Đóng góp (`Teamwork, Meeting Minutes & Peer Evaluation`):** Lịch họp hằng tuần, biên bản theo dõi tiến độ và đánh giá thành viên.
- **File nguồn liên quan:**
  - `docs/references/04_BTL_SoftwareEngineering_HK261.pdf` (Trang 4–6)
  - `docs/requirements/PROJECT_SPECIFICATION.md` (Mục 7–8)
  - `docs/audits/post-merge/ASSIGNMENT_COMPLIANCE.md` (Mục 2.4)

---

## PHẦN B: CẤU TRÚC OUTLINE SLIDE THUYẾT TRÌNH (ĐỒNG BỘ VỚI `SLIDE_CNPM/main.tex`)

> **Lưu ý từ đề bài gốc (`04_BTL_SoftwareEngineering_HK261.pdf`, trang 4):**
> *"The presentation should be **straight to the point**, **contains lessons learned** for the team. The demonstration should be prepared, correct, brief and has good quality."*

Bộ slide trong `docs/reports/SLIDE_CNPM/main.tex` gồm **5 phần (`sections/*.tex`), 14 slide nội dung trọng tâm** (+ Trang bìa, Mục lục tổng, 5 trang chuyển mục = 21 trang 16:9), tối ưu cho **10–15 phút** thuyết trình và trình diễn MVP:

| STT | File LaTeX (`SLIDE_CNPM/`) | Tiêu đề Slide (`\frametitle`) | Nội dung trọng tâm & Hình ảnh cần chèn | File nguồn lấy dữ liệu / hình |
|---|---|---|---|---|
| **–** | `main.tex` | **Trang Bìa & Nội dung Trình bày** | Tên đề tài, học phần CO3001 – HK261, GVHD, 4 thành viên & mục lục tự động. | `README.md`, `docs/architecture/DEVELOPMENT_GUIDE.md` |
| **1** | `sections/01_requirements.tex` | **Bối cảnh và Bài toán Thực tế** | Trung chuyển chặng cuối Ga Metro số 1 – ĐHQG; 3 thách thức: lệch pha cung–cầu, xung đột đặt giữ đồng thời, quá tải sạc. | `docs/reports/SUBMISSION_1_REPORT.md` (§1.1), `docs/requirements/PROJECT_SPECIFICATION.md` (§1) |
| **2** | `sections/01_requirements.tex` | **Mục tiêu, Tác nhân và Phạm vi Hệ thống** | Primary/Secondary Actors; ranh giới Trong phạm vi (*In-Scope*) vs. Ngoài phạm vi (*Out-of-Scope*: giả lập IoT, bản đồ 2D). | `docs/reports/SUBMISSION_1_REPORT.md` (§1.2–§1.4), `docs/audits/post-merge/ASSIGNMENT_COMPLIANCE.md` (§3) |
| **3** | `sections/01_requirements.tex` | **Tổng quan 14 Use Cases và Yêu cầu Phi tương tác** | Chèn **System Use Case Diagram**; tóm tắt 7 User UC + 7 Operator UC + 6 kịch bản vòng đời + 4 *Other Non-Interactive FRs (Bonus)*. | `docs/diagrams/01_Usecase_Diagram/general_usecase_diagram.drawio`, `LIFECYCLE_SCENARIOS.md` |
| **4** | `sections/01_requirements.tex` | **Yêu cầu Phi chức năng và Bất biến Nghiệp vụ** | Kiểm soát đồng thời (`BEGIN IMMEDIATE` – *single-winner*), tính lũy đẳng (*Idempotency-Key*), `BR10`, `BR13`, Emergency SLA 60s (`BR14`). | `docs/requirements/PROJECT_SPECIFICATION.md` (§4), `docs/reports/SUBMISSION_1_REPORT.md` (§2) |
| **5** | `sections/02_dynamic_ui.tex` | **Thiết kế Giao diện (UI Design: Mockup -- 26 Màn hình)** | 3 giao diện (`Mobile User App`, `Mobile Operator App`, `Operator Web`), chèn ảnh board tổng hợp & Playwright `passed: true`. | `app/prototype/design-board.png`, `app/prototype/operator-app-board.png`, `app/prototype/screens/`, `verification.json` |
| **6** | `sections/02_dynamic_ui.tex` | **Mô hình Động: Tương tác và Hành vi (Ch6)** | Chèn 1–2 sơ đồ đại diện sắc nét: *Interaction Models* (`SQ02`/`SQ05`), *Behavioral Models* (`AD01`/`AD05`, `SC01` – Bonus). | `docs/diagrams/02_Sequence_Diagram/`, `03_Activity_Diagram/`, `04_Statechart_Diagram/` |
| **7** | `sections/03_architecture.tex` | **Kiến trúc 4+1 Views: Deployment và Development View** | Chèn `DP01`, `DV01`, `DV02`; giải thích *Modular Monolith* theo *Layered Architecture Pattern* (5 tầng) + *Repository Pattern*. | `docs/diagrams/deployment/DP01-deployment.drawio`, `DV01`, `DV02`, `docs/architecture/DECISION.md` |
| **8** | `sections/03_architecture.tex` | **Mô hình Cấu trúc: Class Diagram và Cơ sở dữ liệu** | Chèn `Class Diagram` (19 lớp, 18 operations, 31 associations) + 12 SQLite Migrations (`0001–0012`), tách biệt Domain khỏi Infrastructure. | `docs/diagrams/05_Class_Diagram/smart_emobility_class_diagram.drawio`, `.agent/class-diagram/CLASS_CATALOG.md`, `app/db/migrations/` |
| **9** | `sections/03_architecture.tex` | **Hiện thực 3 Module Backend và Bộ máy Mô phỏng What-if** | Ánh xạ 5 module thiết kế $\rightarrow$ 3 module code (`mobility-simulation`, `parking-charging`, `operations`) qua `InventoryInterface` & `tripReader`, kết nối Android User App & Web Live Dashboard; 5 kịch bản What-if trên *immutable snapshot*. | `docs/architecture/operations-architecture.html`, `app/src/app.js`, `android/README.md` |
| **10** | `sections/04_testing_demo.tex` | **Kiểm thử Phần mềm và Bảo đảm Chất lượng (Test Cases -- Bonus)** | Kiểm thử đa tầng `Ch9` (Unit, Component/Integration, Concurrency, Migration, Playwright E2E) trên 32 bộ test (185 test cases) + Android JVM unit tests; xác minh *single-winner*, *idempotent replay*, *rollback*. | `app/package.json`, `app/src/tests/`, `android/README.md`, `docs/audits/post-merge/` |
| **11** | `sections/04_testing_demo.tex` | **Trình diễn Sản phẩm Mẫu (Working Demonstration)** | Android User App (`android/`: MapLibre, OSRM, QR pickup `UC01–07A, UC11A`) + Operator Live Dashboard (`live.html`: `UC08–UC14` đầy đủ). | `android/README.md`, `app/prototype/live.html`, `app/db/create-dashboard-demo.js`, `app/README.md` |
| **12** | `sections/05_lessons_genai.tex` | **Bài học Kinh nghiệm (Lessons Learned) và Hướng Phát triển** | Bài học về chuẩn hóa API contracts, kiểm soát đồng thời ở tầng giao dịch, đồng bộ tài liệu–UML–code; hướng phát triển IoT thực tế (OCPP/MQTT), OAuth2/JWT, Docker/CI-CD. | `docs/audits/post-merge/REMEDIATION_ROADMAP.md` |
| **13** | `sections/05_lessons_genai.tex` | **Khai báo Minh bạch Generative AI (Tools, Scope, Contribution)** | Tóm tắt công cụ AI, phạm vi hỗ trợ và phần nhóm tự phân tích, sửa lỗi logic, kiểm chứng kết quả. | `docs/requirements/PROJECT_SPECIFICATION.md` (§8), `04_BTL_SoftwareEngineering_HK261.pdf` (trang 5–6) |
| **14** | `sections/05_lessons_genai.tex` | **Cảm ơn và Hỏi đáp (Q\&A)** | Lời cảm ơn và sẵn sàng trình diễn MVP / trả lời câu hỏi phản biện. | – |
