# AGENT GUIDELINES: UML DESIGNER & SYSTEM MODELING

Tài liệu này là quy chuẩn bắt buộc mà Agent phải tuân thủ trong toàn bộ workspace này bất kỳ khi nào người dùng yêu cầu phân tích nghiệp vụ, mô hình hóa phần mềm hoặc thiết kế sơ đồ UML (Use Case, Activity, Sequence, Class Diagram).

---

## 1. BỘ QUY CHUẨN THIẾT KẾ PHẦN MỀM (02_SE)

Agent phải tuân thủ nghiêm ngặt các quy tắc từ thư mục `02_Rules/` và `.agent/skills/uml-designer/references/`:

### A. Use Case Diagram
- **Ranh giới hệ thống (System Boundary):** Khung chữ nhật bao trọn 100% Use Case. Actor **tuyệt đối không** nằm trong khung.
- **Vị trí Actor:** Primary Actor (khởi xướng) ở bên **TRÁI**; Secondary Actor (phản hồi/dịch vụ ngoài) ở bên **PHẢI**.
- **Đặt tên:** Use Case bắt đầu bằng **Động từ**; Actor và System là **Danh từ**.
- **Mối quan hệ & Chiều mũi tên:**
  - `<<include>>`: Nét đứt, mũi tên từ **Ca chính $\rightarrow$ Ca phụ bắt buộc** (`Base -> Included`).
  - `<<extend>>`: Nét đứt, mũi tên ngược lại từ **Ca mở rộng $\rightarrow$ Ca cơ sở** (`Extension -> Base`).
  - Generalization (Kế thừa): Nét liền tam giác rỗng từ **Con $\rightarrow$ Cha**.
  - Tuyệt đối không để Use Case bị mồ côi (cô lập).

### B. Activity Diagram
- Action bắt đầu bằng **Động từ**, mỗi Action chỉ làm 1 bước logic duy nhất.
- Decision (`◇`): Mỗi nhánh rẽ **bắt buộc** có Guard condition `[Condition]` loại trừ lẫn nhau.
- Fork & Join song song: Tuyệt đối không ghi điều kiện lên thanh đồng bộ.
- Xử lý lỗi & Luồng thoát: Luôn có đường thoát (Cancel/Close/Back) khỏi các form; chống lặp vô tận (Infinite Loop) khi nhập sai bằng bộ đếm số lần thử lại tối đa. Báo lỗi quay lại đúng bước hiển thị.

### C. Sequence Diagram
- Sắp xếp thành phần: Actor ngoài cùng bên trái, các Components theo thứ tự kỹ thuật từ trái qua phải (UI $\rightarrow$ Controller $\rightarrow$ Service $\rightarrow$ DB/API).
- Trục thời gian: Tuân thủ nghiêm ngặt từ trên xuống dưới.
- Phân biệt mũi tên: **Request** dùng nét liền (`->`); **Response** dùng nét đứt (`-->`).
- Activation Box: Kích hoạt (`activate`) khi nhận request và giải phóng (`deactivate`) khi trả xong response.
- Rẽ nhánh: Khung `alt` phân tách rõ nhánh lỗi và nhánh thành công kèm điều kiện `[Guard condition]`.

### D. Class Diagram
- Khối 3 ngăn: Tên Class, Thuộc tính, Phương thức.
- Access Modifiers: `-` Private, `+` Public, `#` Protected, `~` Package.
- Mối quan hệ: Kế thừa (`<|--`), Cấu thành mạnh (`*--`), Thu nạp yếu (`o--`), Liên kết (`-->`).
- Ghi rõ bội số quan hệ (Multiplicity).

---

## 2. QUY CHUẨN HÌNH HỌC VÀ DRAW.IO (CHỐNG LỖI ĐÈ HÌNH, THÒ HÌNH & MẤT NHÃN)

Bất kỳ khi nào tạo file `.drawio.svg`, Agent **bắt buộc** áp dụng 4 quy tắc kỹ thuật sau:

### 1. Quy tắc Màu nền Khung Ranh giới (Light Ocean Blue & Pointer Events)
- Khung `sys_boundary` **bắt buộc có màu nền xanh nước biển nhạt** đặc trưng:
  `fillColor=#e0f2fe;strokeColor=#0284c7;strokeWidth=2;pointerEvents=0;`
- **Tác dụng:** 
  - `fillColor=#e0f2fe` mang lại màu nền xanh nước biển nhạt nhận diện thương hiệu chuẩn UML, tạo độ tương phản cao với các Use Case con nền trắng (`#ffffff`) và Use Case chính (`#bae6fd`).
  - `pointerEvents=0` cho phép nhấp chuột xuyên qua màu nền khung, giúp người dùng chọn và kéo thả Use Case bên trong một cách mượt mà mà không bao giờ bị chọn nhầm khung bao ngoài.
- Trong phần SVG visual: Đặt thẻ `<rect fill="#e0f2fe" stroke="#0284c7" stroke-width="2"/>` ở **Layer 0 (ngay đầu tiên)** trước toàn bộ đường line và Use Case.

### 2. Quy tắc Tính toán Động Khung Ranh giới (Dynamic Boundary & Safe Padding $\ge$ 60px)
- Kích thước của `sys_boundary` **bắt buộc phải được tính toán động** dựa trên Bounding Box của tất cả các Use Case bên trong:
  - `sys_x = min(uc_x) - 60px` (đảm bảo lề trái luôn cách Use Case ngoài cùng tối thiểu 60px).
  - `sys_w = max(uc_x + uc_w) + 60px - sys_x` (đảm bảo lề phải cách Use Case ngoài cùng tối thiểu 60px).
  - `sys_y = min(uc_y) - 55px` (đảm bảo khoảng trống phía trên cho tiêu đề hệ thống).
  - `sys_h = max(uc_y + uc_h) + 50px - sys_y` (đảm bảo lề dưới không bị chật chội).
- **Tác dụng:** Tuyệt đối chống tình trạng Use Case bị thò ra ngoài khung hoặc đường viền khung chém ngang qua hình elip.

### 3. Quy tắc đường nối Actor (Anti-Overlap: Không đè xuyên qua Use Case khác)
- Khi Actor nối tới Use Case:
  - Phía Actor: Bắt điểm tại bàn tay `exitX=1;exitY=0.33` (Actor bên trái) hoặc `entryX=0;entryY=0.33` (Actor bên phải).
  - Phía Use Case: Bắt điểm chính xác tại **đỉnh ngoài cùng** của hình elip (`entryX=0;entryY=0.5` cho cột trái; `exitX=1;exitY=0.5` cho cột phải).
  - Tuyệt đối không để Draw.io tự động tính đường nối hướng về tâm `(0.5, 0.5)` của elip vì đường chéo sẽ cắt xuyên qua các Use Case trung gian.

### 4. Quy tắc chống nuốt nhãn (`<<include>>`, `<<extend>>`)
- Trong dữ liệu mxGraph (`content="..."`), **bắt buộc** tạo cell nhãn riêng dạng `edgeLabel` cho mọi quan hệ có text:
  ```xml
  <mxCell id="lbl_inc" value="&amp;lt;&amp;lt;include&amp;gt;&amp;gt;" style="edgeLabel;html=0;align=center;verticalAlign=middle;resizable=0;points=[];fontSize=11;fontColor=#0369a1;fontStyle=1;labelBackgroundColor=#e0f2fe;" vertex="1" connectable="0" parent="edge_id">
    <mxGeometry relative="1" as="geometry">
      <mxPoint as="offset"/>
    </mxGeometry>
  </mxCell>
  ```
- **Lưu ý kỹ thuật:** 
  - Dùng `html=0` trên `edgeLabel` để trình render Draw.io không bị lỗi nuốt nhãn do hiểu nhầm `<include>` là thẻ HTML.
  - Dùng `labelBackgroundColor=#e0f2fe` tệp màu với nền khung ranh giới để nhãn nổi bật, không bị đường nét đứt cắt ngang qua chữ.

---

## 3. QUY TRÌNH XUẤT KẾT QUẢ KHI NHẬN YÊU CẦU VẼ DIAGRAM

Mỗi khi người dùng yêu cầu vẽ bất kỳ sơ đồ nào, Agent **bắt buộc** thực hiện đầy đủ 4 phần sau:
1. **Khối mã nguồn PlantUML (` ```plantuml `):** Chuẩn `@startuml ... @enduml`, hỗ trợ import vào VP Online và Draw.io.
2. **Khối mã nguồn Mermaid (` ```mermaid `):** Preview trực quan ngay trong Markdown.
3. **Tự động tạo file `<ten_diagram>.drawio.svg` trong workspace:** Tuân thủ 4 quy tắc hình học tại Mục 2.
4. **Bảng Checklist chất lượng & 3 dòng hướng dẫn thao tác:**
   - Chỉnh sửa offline trong VS Code (nhấp đúp file `.drawio.svg`).
   - Dán code PlantUML vào Draw.io (`+` -> `Advanced` -> `PlantUML`).
   - Import vào VP Online (`File` -> `Import` -> `PlantUML...`).
