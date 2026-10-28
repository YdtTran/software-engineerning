# AGENT GUIDELINES: UML DESIGNER & SYSTEM MODELING (CHUẨN SLIDES ĐHQG-HCM)

Tài liệu này là quy chuẩn bắt buộc mà Agent phải tuân thủ trong toàn bộ workspace này bất kỳ khi nào người dùng yêu cầu phân tích nghiệp vụ, mô hình hóa phần mềm hoặc thiết kế sơ đồ UML (Use Case, Activity, Sequence, Class, State-chart Diagram).

---

## 1. NGUYÊN TẮC TỐI CAO: SLIDES BÀI GIẢNG LÀ LUẬT (SUPREME LAW)

1. **Thứ tự ưu tiên chuẩn mực:**
   - **MỨC 1 (Tối cao):** Slide bài giảng chính thức môn **Software Engineering (CO3001)** - Khoa KH&KT Máy tính, Trường ĐH Bách Khoa - ĐHQG-HCM (Giảng viên: Anh Nguyen-Duc, Tho Quan Thanh), biên soạn dựa trên giáo trình quốc tế **Ian Sommerville - Software Engineering (10th Edition)** lưu trữ tại thư mục `00_Slides/`. Mọi quy tắc vẽ, tên gọi ký hiệu, hình mẫu biểu đồ đều phải tuân theo slide.
   - **MỨC 2:** Yêu cầu nghiệp vụ, phạm vi bài toán và chức năng hệ thống tuân theo đề bài `03_BTL_SoftwareEngineering_HK261.pdf` và tài liệu kiến trúc master [`PROJECT_SPECIFICATION.md`](./PROJECT_SPECIFICATION.md).
   - **MỨC 3:** Cẩm nang chi tiết tại [`02_Rules/`](./02_Rules/) và `.agent/skills/uml-designer/references/`.

---

## 2. BỘ QUY CHUẨN CÁC SƠ ĐỒ THEO HÌNH MẪU TRONG SLIDES

### A. Use Case Diagram (Slide Ch3 p.53-56, Ch6 p.16-20)
- **Ranh giới hệ thống (System Boundary - Slide Ch3 p.53, 55):** Khung chữ nhật bao trọn 100% Use Case. Tên hệ thống đặt ở đỉnh hoặc trên cùng (`Passenger Service`, `Chemical Tracking System`, `Smart E-Mobility Hub`).
- **Vị trí Actor (Slide Ch3 p.53, Ch6 p.16):** Actor **tuyệt đối không** nằm trong khung ranh giới. Bố trí Actor ở cả hai phía:
  - Tác nhân khởi xướng (Primary Actor) ở bên **TRÁI**.
  - Tác nhân phản hồi, dịch vụ ngoài hoặc bên tiếp nhận (Secondary Actor) ở bên **PHẢI**.
- **Đặt tên Use Case (Slide Ch6 p.16, 17, 18):** Bắt buộc bắt đầu bằng **Động từ hành động (Active Verb)** kèm tân ngữ (ví dụ: `Reserve Vehicle`, `Pick Up Vehicle`, `Transfer data`, `Order Food`).
- **Mối quan hệ chuẩn mẫu (Slide Ch3 p.54, 55):**
  - `<<include>>`: Nét đứt có mũi tên hở trỏ từ **Ca chính $\rightarrow$ Ca phụ bắt buộc** (`Base -> Included`).
  - `<<extend>>`: Nét đứt có mũi tên hở trỏ ngược từ **Ca mở rộng $\rightarrow$ Ca cơ sở** (`Extension -> Base`).
  - Generalization (Kế thừa): Nét liền có đầu mũi tên **tam giác rỗng** trỏ từ **Con $\rightarrow$ Cha**.
- **Đặc tả kịch bản (Use-case Scenario Tabular Template - Slide Ch3 p.56 & Ch6 p.19-20):** Bắt buộc đầy đủ 11 mục chuẩn: `Use-case ID`, `Use-case name`, `Use-case overview`, `Actors`, `Trigger`, `Preconditions`, `Postconditions`, `Normal Flow (Steps 1..n)`, `Alternative Flows`, `Exceptions`, `Notes and Issues`.

### B. Sequence Diagram (Slide Ch6 p.21-26, p.40, p.50)
- **Lifelines ở đỉnh (Slide Ch6 p.40, 50):**
  - Actor stick figure bên trái (hoặc hệ thống bên ngoài phía phải).
  - Khối đối tượng hình chữ nhật: `:ClassName` (ẩn danh), `name : ClassName` (đầy đủ), hoặc `<<datastore>> ObjectName` (kho dữ liệu).
- **Lifeline:** Đường nét đứt thẳng đứng kéo dài từ đỉnh xuống cuối.
- **Trục thời gian:** Tuân thủ nghiêm ngặt từ trên xuống dưới.
- **Activation Box:** Hình chữ nhật đứng thanh mảnh trên lifeline, có thể lồng chồng nhau (overlapping) khi gọi đệ quy hoặc self-call.
- **Phân biệt mũi tên:**
  - **Request (Đồng bộ):** Đường nét liền có đầu mũi tên đặc (`──►`).
  - **Response (Phản hồi):** Đường nét đứt có đầu mũi tên chữ V hở (`< - - -`).
  - **Self-call (Slide Ch6 p.40):** Mũi tên nét liền vòng góc vuông quay lại chính Activation Box đó.
- **Cú pháp thông điệp (Slide Ch6 p.50):** Đánh số thứ tự phân cấp `1: method()`, `1.1: subMethod()`, `1.2: returnData`, `2: nextMethod()`, kèm Guard condition `[guard] methodName()`.
- **Rẽ nhánh & Ràng buộc:** Khung `alt` phân tách rõ nhánh `[True]` và `[False]`; Ràng buộc thời gian `{a}`, `{b}` và thời lượng `{b - a < 10 sec}` (Slide Ch6 p.22).

### C. Activity Diagram (Slide Ch6 p.12-13, p.39, p.51, p.52)
- **Initial State:** Hình tròn đen đặc (`●`).
- **Action State:** Hình chữ nhật bo tròn góc, bắt đầu bằng **Động từ**.
- **Decision & Merge:** Hình thoi (`◇`). Mỗi nhánh rẽ **bắt buộc** có Guard condition `[Condition]` loại trừ lẫn nhau (kèm nhánh `[else]`).
- **Concurrency Fork & Join:** Thanh ngang (hoặc dọc) màu đen đậm. Tuyệt đối không ghi điều kiện lên thanh đồng bộ.
- **Swimlanes (Phân làn trách nhiệm - Slide Ch6 p.52):** Phân chia cột rõ ràng theo vai trò (Người dùng, Hệ thống backend, Thiết bị ngoại vi/IoT).
- **Object Flow (Slide Ch6 p.51, 52):** Đối tượng hình chữ nhật `:Object [state]` nối bằng đường nét đứt biểu thị dữ liệu/vật phẩm truyền qua các Action.
- **Xử lý lỗi & Luồng thoát:** Luôn có đường thoát (`Cancel/Close/Back`); chống lặp vô tận bằng bộ đếm thử lại tối đa; báo lỗi quay lại đúng bước hiển thị.
- **Final State:** Chấm tròn đen có viền ngoài (Bullseye `◉`).

### D. Class Diagram (Slide Ch6 p.28-35)
- **Khối 3 ngăn chuẩn:**
  1. Tên Class (In đậm; **In nghiêng** nếu là Abstract Class - Slide Ch6 p.34).
  2. Thuộc tính: `[visibility] name : type [= defaultValue]`.
  3. Phương thức: `[visibility] name(param : type) : returnType` (**In nghiêng** nếu là Abstract Method).
- **Access Modifiers (Slide Ch6 p.31):** `-` Private, `+` Public, `#` Protected, `~` Package.
- **Mối quan hệ chuẩn mẫu (Slide Ch6 p.30, 32, 33, 34):**
  - Association: Nét liền có ghi rõ Bội số quan hệ (*Multiplicities*: `1`, `0..1`, `*`, `1..*`) ở cả hai đầu và tên vai trò (*Role name*).
  - Navigable Association: Mũi tên nét liền hở `-->`.
  - Aggregation (Thu nạp yếu): Hình thoi rỗng `<>--` ở phía lớp chứa (Whole).
  - Composition (Cấu thành mạnh): Hình thoi đặc `*--` ở phía lớp chứa (Whole).
  - Generalization (Kế thừa): Mũi tên tam giác rỗng `<|--` trỏ từ Con lên Cha (gom nhánh cây chung - Shared Tree).
  - Dependency: Mũi tên nét đứt hở `..>`.

### E. State-chart Diagram (Slide Ch6 p.41-45)
- **Initial State:** Hình tròn đặc tô đen (`●`).
- **State Box:** Hình chữ nhật bo tròn 2 ngăn (Ngăn 1: Tên trạng thái; Ngăn 2: Hành động nội bộ `entry /`, `do:`, `exit /`).
- **Transitions:** Cú pháp chuẩn `event [guard] / action`.
- **Superstate (Slide Ch6 p.43):** Khung trạng thái phức hợp bao bọc các trạng thái con bên trong.
- **Final State:** Bullseye (`◉`).

### F. Kiến trúc 4+1 View Model (Slide Ch7 p.17, 18)
- **Logical View:** Class diagram, Sequence diagram, Communication diagram.
- **Process View:** Activity diagram, State-chart diagram.
- **Development View:** Component diagram, Package diagram.
- **Physical View:** Deployment diagram.
- **+1 Scenarios:** Use-case diagram & Use-case tabular scenarios.

---

## 3. QUY CHUẨN HÌNH HỌC VÀ DRAW.IO (CHỐNG LỖI ĐÈ HÌNH, THÒ HÌNH & MẤT NHÃN)

Bất kỳ khi nào tạo file `.drawio.svg`, Agent **bắt buộc** áp dụng 4 quy tắc kỹ thuật sau:

### 1. Quy tắc Màu nền Khung Ranh giới (Light Ocean Blue & Pointer Events)
- Khung `sys_boundary` **bắt buộc có màu nền xanh nước biển nhạt**:
  `fillColor=#e0f2fe;strokeColor=#0284c7;strokeWidth=2;pointerEvents=0;`
- Trong phần SVG visual: Đặt thẻ `<rect fill="#e0f2fe" stroke="#0284c7" stroke-width="2"/>` ở **Layer 0 (ngay đầu tiên)** trước toàn bộ đường line và Use Case.

### 2. Quy tắc Tính toán Động Khung Ranh giới (Dynamic Boundary & Safe Padding $\ge$ 60px)
- Kích thước của `sys_boundary` **bắt buộc phải được tính toán động**:
  - `sys_x = min(uc_x) - 60px`
  - `sys_w = max(uc_x + uc_w) + 60px - sys_x`
  - `sys_y = min(uc_y) - 55px`
  - `sys_h = max(uc_y + uc_h) + 50px - sys_y`

### 3. Quy tắc đường nối Actor (Anti-Overlap)
- Phía Actor: Bắt điểm tại bàn tay `exitX=1;exitY=0.33` (bên trái) hoặc `entryX=0;entryY=0.33` (bên phải).
- Phía Use Case: Bắt điểm tại **đỉnh ngoài cùng** của hình elip (`entryX=0;entryY=0.5` cho cột trái; `exitX=1;exitY=0.5` cho cột phải). Tuyệt đối không để hướng về tâm `(0.5, 0.5)` tránh cắt chéo qua Use Case khác.

### 4. Quy tắc chống nuốt nhãn (`<<include>>`, `<<extend>>`)
- Trong dữ liệu mxGraph (`content="..."`), **bắt buộc** tạo cell nhãn riêng dạng `edgeLabel` cho mọi quan hệ có text:
  ```xml
  <mxCell id="lbl_inc" value="&amp;lt;&amp;lt;include&amp;gt;&amp;gt;" style="edgeLabel;html=0;align=center;verticalAlign=middle;resizable=0;points=[];fontSize=11;fontColor=#0369a1;fontStyle=1;labelBackgroundColor=#e0f2fe;" vertex="1" connectable="0" parent="edge_id">
    <mxGeometry relative="1" as="geometry">
      <mxPoint as="offset"/>
    </mxGeometry>
  </mxCell>
  ```

---

## 4. QUY TRÌNH XUẤT KẾT QUẢ KHI NHẬN YÊU CẦU VẼ DIAGRAM

Mỗi khi người dùng yêu cầu vẽ bất kỳ sơ đồ nào, Agent **bắt buộc** thực hiện đầy đủ 4 phần sau:
1. **Khối mã nguồn PlantUML (` ```plantuml `):** Chuẩn `@startuml ... @enduml`, hỗ trợ import vào VP Online và Draw.io.
2. **Khối mã nguồn Mermaid (` ```mermaid `):** Preview trực quan ngay trong Markdown.
3. **Tự động tạo file `<ten_diagram>.drawio.svg` trong workspace (`01_Diagram/...`):** Tuân thủ 4 quy tắc hình học tại Mục 3.
4. **Bảng Checklist chất lượng theo chuẩn Slide & 3 dòng hướng dẫn thao tác:**
   - Chỉnh sửa offline trong VS Code (nhấp đúp file `.drawio.svg`).
   - Dán code PlantUML vào Draw.io (`+` -> `Advanced` -> `PlantUML`).
   - Import vào VP Online (`File` -> `Import` -> `PlantUML...`).
