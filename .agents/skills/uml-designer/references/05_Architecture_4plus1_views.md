# BỘ QUY CHUẨN KIẾN TRÚC MÔ HÌNH 4+1 VIEW CHUẨN ĐHQG-HCM
> **Nguồn chuẩn mực tối cao (Supreme Law):** Slide bài giảng chính thức môn **Software Engineering (CO3001)** - Khoa KH&KT Máy tính, Trường ĐH Bách Khoa - ĐHQG-HCM (Giảng viên: Anh Nguyen-Duc, Tho Quan Thanh), biên soạn dựa trên giáo trình quốc tế **Ian Sommerville - Software Engineering (10th Edition)** (Slide Ch7 - Page 17 & 18).

---

## I. MÔ HÌNH KIẾN TRÚC 4+1 VIEW (SLIDE CH7 P.17)

Kiến trúc phần mềm không thể mô tả trọn vẹn chỉ qua một sơ đồ đơn lẻ mà cần 4 góc nhìn chuyên biệt xoay quanh 1 góc nhìn trung tâm:

```text
┌─────────────────────────────────┬─────────────────────────────────┐
│          Logical View           │       Development View          │
│         (Góc nhìn Logic)        │      (Góc nhìn Phát triển)      │
│                                 │                                 │
│ - Analysts / Designers          │ - Programmers                   │
│ - Key abstractions, classes     │ - Software management, packages │
├─────────────────────────────────┼─────────────────────────────────┤
│                                 │                                 │
│                ┌────────────────┴────────────────┐                │
│                │          Use-Case View          │                │
│                │      (Scenarios - Trung tâm)    │                │
│                │                                 │                │
│                │ - End-user Functionality        │                │
│                │ - Use Case Diagrams & Scenarios │                │
│                └────────────────┬────────────────┘                │
│                                 │                                 │
├─────────────────────────────────┼─────────────────────────────────┤
│          Process View           │        Deployment View          │
│       (Góc nhìn Tiến trình)     │      (Góc nhìn Triển khai)      │
│                                 │                                 │
│ - System Integrators            │ - System Engineering / DevOps   │
│ - Concurrency, throughput       │ - Topology, hardware, network   │
└─────────────────────────────────┴─────────────────────────────────┘
             [Conceptual]                        [Physical]
```

---

## II. MA TRẬN ÁNH XẠ 4+1 VIEW VỚI CÁC SƠ ĐỒ UML (SLIDE CH7 P.18)

| Góc nhìn (View) | Mục đích kiến trúc (Purpose) | Sơ đồ UML tương ứng trong đồ án |
| :--- | :--- | :--- |
| **1. Logical View** | Trừu tượng hóa hệ thống thành các đối tượng, lớp dữ liệu và dịch vụ logic. Phục vụ chuyên viên phân tích và thiết kế (*Analysts / Designers*). | - **Class Diagram** (Cấu trúc các lớp thực thể & dịch vụ)<br>- **Sequence Diagram** (Tương tác tuần tự gọi hàm)<br>- **Communication Diagram** (Tương tác cộng tác) |
| **2. Process View** | Thể hiện cách thức hệ thống vận hành tại runtime dưới dạng các tiến trình tương tác, xử lý đồng thời, luồng dữ liệu, hiệu năng và thông lượng (*System Integrators*). | - **Activity Diagram** (Quy trình luồng xử lý dữ liệu và nghiệp vụ phân làn)<br>- **State-chart Diagram** (Máy trạng thái phản ứng sự kiện) |
| **3. Development View** | Thể hiện cách phân rã mã nguồn thành các module, package, tầng kiến trúc (Layers) và thư viện để lập trình viên hiện thực (*Programmers*). | - **Component Diagram** (Thành phần module)<br>- **Package Diagram** (Tổ chức thư mục & package) |
| **4. Physical View** | Thể hiện cấu hình phần cứng vật lý, máy chủ, thiết bị IoT và cách các thành phần phần mềm được phân tán trên các node xử lý (*System Engineers*). | - **Deployment Diagram** (Sơ đồ triển khai: App Mobile, Backend Server, Cloud DB, IoT Hub) |
| **+1. Scenarios (Use-Case View)** | Góc nhìn trung tâm kết nối 4 góc nhìn trên, mô tả chức năng dưới góc độ người dùng cuối (*End-user Functionality*). | - **Use Case Diagram** (Biểu đồ ca sử dụng)<br>- **Use Case Tabular Scenarios** (Kịch bản ca sử dụng chi tiết) |

---

## III. ÁP DỤNG VÀO CÁC GIAI ĐOẠN NỘP BÀI CỦA ĐỒ ÁN (COURSE MILESTONES)

1. **Submission #1:** Tập trung hoàn thiện góc nhìn **+1 Scenarios (Use-Case View)** gồm: Sơ đồ Use Case tổng quan, Sơ đồ Use Case phân hệ và 14 Kịch bản Use Case chi tiết.
2. **Submission #2:** Tập trung hoàn thiện góc nhìn **Process View** (Activity Diagrams & State-chart Diagrams) và **Logical View động** (Sequence Diagrams) kết hợp Prototype UI/UX.
3. **Submission #3:** Hoàn thiện góc nhìn **Logical View tĩnh** (Class Diagram, Method Descriptions) kết hợp **Development View** (Layered Architecture) và **Physical View** (Deployment Diagram).
4. **Final Submission:** Tổng hợp trọn bộ tài liệu kiến trúc 4+1 View hoàn chỉnh của hệ thống Smart E-Mobility Hub.
