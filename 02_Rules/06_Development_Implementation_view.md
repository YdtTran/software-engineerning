# BỘ QUY CHUẨN DEVELOPMENT / IMPLEMENTATION VIEW

> **Nguồn chuẩn mực:** Slide Software Engineering (CO3001), Ch7 pp. 17–18 về 4+1 View; [quy chuẩn kiến trúc 4+1 của workspace](./05_Architecture_4plus1_views.md); các quyết định đã xác nhận tại [development_implement_view/DECISION.md](../development_implement_view/DECISION.md).
>
> Quy tắc này chuyên biệt hóa Development View cho Smart E-Mobility Hub. Nếu có mâu thuẫn, ưu tiên slide và đề bài gốc, sau đó đến các quyết định đã xác nhận và quy tắc dự án này. Không biến đề xuất chưa được duyệt thành quyết định.
>
> Lộ trình thực hiện và danh sách task cho agent: [development_implement_view/plan.md](../development_implement_view/plan.md).

---

## I. MỤC ĐÍCH VÀ PHẠM VI

Development / Implementation View mô tả cách phân rã phần mềm để lập trình viên tổ chức và hiện thực: các tầng, component, package/module, giao diện giữa chúng, quan hệ phụ thuộc và công nghệ/thư viện liên quan.

Theo mô hình 4+1 của Slide Ch7 p.18, các biểu đồ phù hợp là:

- **Component Diagram:** các thành phần phần mềm, trách nhiệm, interface và dependency.
- **Package Diagram:** nhóm package/module và quan hệ phụ thuộc trong cấu trúc mã nguồn dự kiến.

### Phân biệt với các góc nhìn khác

| Góc nhìn | Câu hỏi chính | Không thay thế bằng |
| --- | --- | --- |
| Development / Implementation | Mã nguồn chia thành tầng, module, package và thư viện nào? | Deployment topology hoặc tương tác runtime chi tiết |
| Logical | Có những lớp/đối tượng nào và chúng liên hệ ra sao? | Component/package chỉ để vẽ lại class diagram |
| Process | Hệ thống xử lý nghiệp vụ và đồng thời như thế nào khi chạy? | Package dependency |
| Physical / Deployment | Phần mềm chạy trên node, thiết bị và hạ tầng nào? | Package hoặc component được mặc định là một server/container |

Development View có thể thể hiện client, API và adapter như các thành phần logic; không xác định máy chủ, cloud, container, network topology hoặc phần cứng. Nội dung đó thuộc Deployment View.

---

## II. CÁC QUYẾT ĐỊNH KIẾN TRÚC ĐÃ CHỐT

Các sơ đồ và tài liệu phải tuân theo [DECISION.md](../development_implement_view/DECISION.md):

1. Backend MVP là **modular monolith**, không phải tập hợp microservices độc lập.
2. Dùng năm tầng logic: **Presentation → API / Interface → Application → Domain → Infrastructure**.
3. Backend mục tiêu cho MVP: **Node.js + Express**; lưu trữ: **SQLite**.
4. Frontend prototype hiện có: **HTML5, CSS3, Modern JavaScript**, không có thư viện ngoài theo tài liệu dự án. Không suy diễn rằng prototype đã kết nối backend.
5. Dùng **Repository abstraction** giữa logic ứng dụng và SQLite; dùng transaction ở các thao tác cần bảo đảm tính nguyên tử.
6. Deliverables gồm **Component Diagram**, **Package Diagram**, mô tả trách nhiệm/quan hệ và bảng công nghệ; lưu dưới `01_Diagram/06_Development_View/`.

Node.js, Express và SQLite là quyết định thiết kế cho backend MVP; chúng không phải bằng chứng rằng backend đã được triển khai. Nếu quyết định thay đổi, cập nhật DECISION.md trước rồi đồng bộ sơ đồ và tài liệu.

---

## III. QUY ƯỚC PHÂN TẦNG VÀ MODULE

### 1. Trách nhiệm các tầng

| Tầng | Trách nhiệm | Không nên làm |
| --- | --- | --- |
| **Presentation** | Giao diện Student, Operator hiện trường và Operator web; hiển thị dữ liệu và gửi yêu cầu qua API. | Truy cập SQLite hoặc tự thực thi quy tắc phân bổ tài nguyên. |
| **API / Interface** | Express routes/controllers và adapter đầu vào; kiểm tra/diễn giải giao thức, ánh xạ request/response, gọi application operation. | Chứa toàn bộ nghiệp vụ miền hoặc truy cập bảng SQLite trực tiếp. |
| **Application** | Điều phối use case, ranh giới giao dịch và gọi domain/service/port phù hợp. | Phụ thuộc vào framework web, driver SQLite hoặc chi tiết giao thức ngoài. |
| **Domain** | Mô hình và bất biến nghiệp vụ: xe, Hub, slot, reservation, trip, charging, transfer, incident và simulation. | Phụ thuộc Express, SQLite hoặc UI. |
| **Infrastructure** | Adapter triển khai persistence/repository và kết nối ngoài như telemetry, notification; hỗ trợ adapter giả lập khi phù hợp. | Định nghĩa hoặc thay đổi quy tắc nghiệp vụ để phù hợp với một thư viện cụ thể. |

Infrastructure là tầng triển khai các chi tiết kỹ thuật và có thể hiện thực port/interface do Application hoặc Domain sở hữu. Không vẽ mũi tên dependency ngụ ý Domain/Application gọi trực tiếp một implementation cụ thể nếu kiến trúc không chủ ý như vậy.

### 2. Module ứng dụng dự kiến

Nhóm module phải bám vào miền nghiệp vụ và service responsibilities trong [CLASS_CATALOG.md](../01_Diagram/05_Class_Diagram/CLASS_CATALOG.md). Có thể nhóm như sau:

| Module | Phạm vi gợi ý | Nghiệp vụ liên quan |
| --- | --- | --- |
| **Accounts and Resources** | Tài khoản, Hub, xe, slot đỗ, cổng sạc và quản lý tài nguyên. | UC01, UC02, UC08, UC09 |
| **Reservations and Trips** | Reservation, kiểm tra điều kiện, nhận/trả xe và chuyến đi. | UC03–UC06 |
| **Charging** | Charging request/session, lập lịch, phân bổ cổng và trạng thái sạc. | UC07, UC12 |
| **Operations** | Telemetry, tái phân bổ xe, incident và các quy trình vận hành liên quan. | UC08–UC11 |
| **Simulation** | Scenario, simulation run/result và recommendations. | UC13, UC14 |

Đây là ranh giới module logic trong một ứng dụng modular monolith, không phải năm dịch vụ triển khai độc lập. Có thể điều chỉnh cách nhóm nếu vẫn bảo toàn trách nhiệm và traceability; thay đổi các quyết định nền tảng cần cập nhật DECISION.md.

---

## IV. QUY TẮC COMPONENT DIAGRAM

1. Đặt tên sơ đồ có mã và tiêu đề, ví dụ `DV01 — Development Components`.
2. Biểu diễn component theo trách nhiệm thực thi hoặc ranh giới module; dùng stereotype/component notation UML nhất quán.
3. Thể hiện rõ tên tầng, tên component và các dependency/interface có ý nghĩa. Tránh vẽ mọi lớp domain như một component.
4. Mỗi component phải có trách nhiệm xác định được và ánh xạ về ít nhất một module, nhóm nghiệp vụ hoặc integration đã có căn cứ.
5. Thể hiện frontend hiện có như các client/presentation component; backend Node.js/Express là mục tiêu MVP. Không ghi nhận frontend prototype là một ứng dụng đã tích hợp backend.
6. Thể hiện các application operation/service responsibilities theo CLASS_CATALOG.md khi cần, chẳng hạn ReservationHub, VehicleService, ChargingScheduler, RedistributionService, IncidentService, TelemetryService và SimulationEngine. Đây là service concepts đã mô hình hóa, không phải bằng chứng về code class/module đã triển khai.
7. Repository/SQLite nằm ở phía Infrastructure. Thể hiện abstraction/interface giữa Application/Domain và persistence adapter; không nối UI trực tiếp tới database.
8. Thể hiện telemetry và notification qua interface/adapter. Phân biệt adapter giả lập dùng cho MVP với provider/hardware thật chưa được chọn.
9. Chỉ đưa ra dependency cần thiết. Ưu tiên thể hiện dependency hướng vào abstraction; không thêm vòng phụ thuộc hoặc xuyên tầng nếu không có lý do và ghi chú.
10. Không xem component là process, executable, container, server, cloud node hay thiết bị phần cứng trừ khi sơ đồ Deployment View riêng xác định điều đó.

---

## V. QUY TẮC PACKAGE DIAGRAM

1. Package Diagram mô tả **cấu trúc mã nguồn dự kiến**, không khẳng định các thư mục/package đó đã tồn tại trong repository.
2. Dùng tên package ổn định, phân cấp hợp lý; tên package phản ánh tầng hoặc module, không phản ánh màn hình hay một Use Case đơn lẻ.
3. Thể hiện quan hệ phụ thuộc package cần thiết; dùng nét đứt/mũi tên UML dependency và chiều phụ thuộc nhất quán với Component Diagram.
4. Có thể biểu diễn năm package tầng và các package module được nhóm theo mục III. Không bắt buộc vẽ mọi package con nếu làm sơ đồ kém đọc.
5. Không trộn package nguồn với node triển khai, database server, container hoặc network.
6. Nếu cần minh họa thư mục tương lai, dùng chú thích **proposed/target structure**; không trình bày như cây thư mục hiện tại.
7. Package Diagram và Component Diagram phải dùng cùng tên tầng/module hoặc có bảng ánh xạ rõ ràng.

---

## VI. CÔNG NGHỆ VÀ THƯ VIỆN

- Tách rõ trạng thái **Đã có trong prototype**, **Đã quyết định cho MVP**, **Đề xuất**, và **Chưa quyết định**.
- Chỉ đưa thư viện cụ thể vào sơ đồ hoặc bảng khi có quyết định trong DECISION.md hoặc nguồn dự án xác nhận.
- Không tự chọn ORM/query library, migration tool, validation framework, authentication library, provider notification, hosting, hay IoT protocol.
- Ghi Node.js + Express và SQLite là stack backend mục tiêu; ghi HTML5/CSS3/Modern JavaScript là frontend prototype đã được tài liệu hóa.
- Không suy diễn framework frontend, TypeScript, broker, cloud provider hoặc hardware protocol từ nhu cầu nghiệp vụ.
- Nếu nhóm muốn thay đổi một lựa chọn, cập nhật DECISION.md và rà soát các sơ đồ, package names, component interfaces và báo cáo có liên quan.

Bảng công nghệ tối thiểu nên có cột: **Thành phần**, **Công nghệ/thư viện**, **Trạng thái**, **Vai trò**, **Nguồn/quyết định**.

---

## VII. QUY ƯỚC ĐẦU RA VÀ ĐỒNG BỘ

Với mỗi sơ đồ Development View được tạo hoặc cập nhật, cung cấp:

1. PlantUML source có `@startuml` / `@enduml`.
2. Mermaid preview nếu cấu trúc biểu đồ có thể biểu diễn rõ trong Mermaid; ghi chú nếu một số ký pháp UML không được Mermaid thể hiện tương đương.
3. File Draw.io chỉnh sửa được và bản `.drawio.svg`, theo workflow UML của workspace.
4. Mô tả trách nhiệm component/package, bảng công nghệ/trạng thái và checklist kiểm tra.

Quy tắc hình học riêng cho Use Case Diagram như system boundary xanh, actor connector và `edgeLabel` không áp dụng máy móc cho Component/Package Diagram. Sơ đồ Development vẫn phải bảo đảm nhãn rõ, đường nối không chồng lấp gây hiểu sai, nội dung không tràn canvas và SVG có thể mở/chỉnh sửa theo workflow chung.

Trước khi bàn giao, kiểm tra:

- [ ] Sơ đồ phản ánh các quyết định đã chốt trong DECISION.md; mọi giả định khác được ghi rõ.
- [ ] Component Diagram thể hiện trách nhiệm, dependency/interface và ranh giới module; không biến module thành microservice.
- [ ] Package Diagram mô tả cấu trúc dự kiến và thống nhất tên với Component Diagram.
- [ ] UI không nối trực tiếp với SQLite; application/domain không phụ thuộc trực tiếp Express hoặc SQLite implementation.
- [ ] Repository abstraction, transaction/atomicity requirements và các adapter được thể hiện ở mức phù hợp.
- [ ] Công nghệ đã xác nhận không bị trộn với công nghệ đề xuất/chưa chọn.
- [ ] Không lẫn Development View với Logical, Process hoặc Deployment View.
- [ ] Deliverable có PlantUML, Mermaid preview phù hợp, Draw.io SVG chỉnh sửa được, mô tả và bảng công nghệ.

---

## VIII. NGUỒN ĐỐI CHIẾU

- [DECISION.md](../development_implement_view/DECISION.md) — quyết định kiến trúc đã được xác nhận.
- [PROJECT_SPECIFICATION.md](../PROJECT_SPECIFICATION.md) — phạm vi nghiệp vụ, prototype và yêu cầu Submission #3.
- [05_Architecture_4plus1_views.md](./05_Architecture_4plus1_views.md) — phân biệt các view và ánh xạ sơ đồ theo Slide Ch7.
- [CLASS_CATALOG.md](../01_Diagram/05_Class_Diagram/CLASS_CATALOG.md) — domain classes và service responsibilities.
- [README.md của Class Diagram](../01_Diagram/05_Class_Diagram/README.md) — ngữ cảnh bộ thiết kế lớp.
