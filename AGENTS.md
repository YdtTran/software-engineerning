# Smart E-Mobility Hub — Hướng dẫn làm việc

Áp dụng cho toàn bộ repository. Đọc quy tắc chi tiết theo loại công việc trước khi sửa yêu cầu, UML hoặc ứng dụng.

## 1. Nguồn chuẩn

| Cần quyết định | Nguồn có thẩm quyền |
|---|---|
| Phạm vi và yêu cầu của giảng viên | [Đề bài CO3001](docs/references/04_BTL_SoftwareEngineering_HK261.pdf) |
| Ký pháp, bố cục và mẫu UML | [Slide CO3001](docs/slides), ưu tiên Ch3, Ch6 và Ch7 |
| Chính sách nhóm và hợp đồng nghiệp vụ | [Đặc tả chính](docs/requirements/PROJECT_SPECIFICATION.md) và [kịch bản vòng đời](docs/diagrams/01_Usecase_Diagram/LIFECYCLE_SCENARIOS.md) |
| Kiến trúc mục tiêu | [Quyết định Development View](docs/architecture/DECISION.md) |
| Hướng dẫn thực hành UML | [Quy tắc theo loại sơ đồ](docs/standards) và [UML Designer](.agents/skills/uml-designer/SKILL.md) |

Khi các nguồn mâu thuẫn, dùng đề bài để xác định yêu cầu và dùng slide để quyết định ký pháp. Phân biệt yêu cầu giảng viên, chính sách nhóm, tùy chọn và giới hạn MVP. Ghi rõ điểm chưa quyết định thay vì tự bổ sung chính sách.

## 2. Phạm vi và thứ tự cập nhật

- Kiểm tra worktree trước khi sửa và giữ các thay đổi đang làm. Với tác vụ tài liệu hoặc UML, giới hạn thay đổi ở đặc tả, mô hình và các tham chiếu liên quan.
- Khi đổi nghiệp vụ, cập nhật theo thứ tự **đặc tả và quy tắc → hợp đồng kịch bản → trạng thái và sơ đồ → truy vết**. Kiểm tra các báo cáo, danh mục, dữ liệu kịch bản và công cụ sinh sơ đồ có đọc phần đã đổi.
- Giữ UC01–UC14 ổn định. UC06 là mục tiêu chính; UC06-S1, UC06-S2 và UC06-S3 là các tương tác độc lập. Giữ ánh xạ lịch sử UC06A → UC06-S2 và UC06B → UC06-S3. Phân biệt cam kết đặt chỗ, chiếm dụng vật lý và phiên sạc khi mô hình hóa.
- Giữ prototype và kiến trúc mục tiêu phân biệt rõ. Kiến trúc đã chọn là modular monolith với Node.js/Express và SQLite qua repository adapter. Schema nghiệp vụ, driver và công cụ migration cần quyết định riêng khi triển khai.

## 3. UML và nguồn sơ đồ

Đọc quy tắc tương ứng trước khi vẽ hoặc review. Dùng slide để giải quyết khác biệt về ký pháp.

| Loại sơ đồ | Quy tắc | Slide |
|---|---|---|
| Use case và hợp đồng 11 trường | [Use case](docs/standards/00_Usecase_diagram.md) | Ch3 tr. 53–56, Ch6 tr. 16–20 |
| Activity | [Activity](docs/standards/01_Activity_diagram.md) | Ch6 tr. 12–13, 39, 51–52 |
| Sequence | [Sequence](docs/standards/02_Sequence_diagram.md) | Ch6 tr. 21–26, 40, 50 |
| Class | [Class](docs/standards/03_Class_diagram.md) | Ch6 tr. 28–35 |
| State-chart | [State-chart](docs/standards/04_Statechart_diagram.md) | Ch6 tr. 41–45 |
| Kiến trúc 4+1 | [4+1 Views](docs/standards/05_Architecture_4plus1_views.md) | Ch7 tr. 17–18 |

### Draw.io

- Dùng `.drawio` làm nguồn editable chuẩn. Sửa đúng canvas hoặc dữ liệu sinh nguồn và giữ ID ổn định. Chỉ tạo SVG/PNG khi cần xuất bản hoặc kiểm tra. Trong đợt dọn repo, đối chiếu từng export với nguồn trước khi bỏ bản trùng.
- Với khung use case `sys_boundary`, đặt khung dưới các cạnh và node. Dùng `fillColor=#e0f2fe;strokeColor=#0284c7;strokeWidth=2;pointerEvents=0;`. Tính khung từ bounding box các use case, cộng 60 px mỗi bên, 55 px phía trên và 50 px phía dưới.
- Nối từ tay actor trái `exitX=1;exitY=0.33` tới mép trái elip `entryX=0;entryY=0.5`. Ở phía phải, nối từ mép phải elip `exitX=1;exitY=0.5` tới tay actor `entryX=0;entryY=0.33`.
- Đặt mọi nhãn quan hệ trong cell con `edgeLabel`, dùng `html=0` và escape ký tự XML. Kiểm tra nhãn đọc được sau khi render.

## 4. Cấu trúc repository

Dùng [index.md](index.md) để tìm tài liệu, sơ đồ và prototype. Lưu tài liệu trong `docs/`, nguồn ứng dụng trong `app/`, và scaffold SQLite trong `app/db/`. Giữ dữ liệu SQLite cục bộ và export tạm ngoài Git.

## 5. Kiểm tra trước khi bàn giao

- Với thay đổi yêu cầu, đối chiếu trigger, tiền/hậu điều kiện, ngoại lệ và trạng thái với UML. Kiểm tra truy vết của các mã bị ảnh hưởng.
- Với sơ đồ đã sửa, kiểm tra cấu trúc XML, đầu mũi tên, nhãn, actor ngoài khung và đường nối cắt hình. Render để kiểm tra bố cục khi công cụ có sẵn. Khi được yêu cầu vẽ sơ đồ, cung cấp nguồn `.drawio`, khối PlantUML, preview Mermaid và checklist ngắn. Nêu cách mở nguồn trong VS Code hoặc nhập PlantUML vào Draw.io và VP Online.
- Khi đổi tên hoặc di chuyển, tìm tham chiếu đường dẫn cũ và kiểm tra liên kết mới. Chạy `git diff --check` và báo rõ phần kiểm tra còn thiếu.
