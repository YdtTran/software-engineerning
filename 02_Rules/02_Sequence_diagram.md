# BỘ QUY CHUẨN THIẾT KẾ SEQUENCE DIAGRAM CHUẨN ĐHQG-HCM
> **Nguồn chuẩn mực tối cao (Supreme Law):** Slide bài giảng chính thức môn **Software Engineering (CO3001)** - Khoa KH&KT Máy tính, Trường ĐH Bách Khoa - ĐHQG-HCM (Giảng viên: Anh Nguyen-Duc, Tho Quan Thanh), biên soạn dựa trên giáo trình quốc tế **Ian Sommerville - Software Engineering (10th Edition)** (Slide Ch6 - Page 21 đến 26, 40, 50) và Visual Paradigm Sequence Diagram Tutorial.

---

## I. MÔ HÌNH HÓA TƯƠNG TÁC TUẦN TỰ (SLIDE CH6 P.21)
- **Interaction Models:** Mô hình hóa tương tác giữa Tác nhân (Actor) và các Đối tượng (Objects/Components) bên trong hệ thống trong suốt quá trình thực thi một Use Case cụ thể.
- **Trục thời gian (Timeline):** Tuân thủ tuyệt đối từ **trên xuống dưới**. Thông điệp gửi đi sau bắt buộc phải nằm ở vị trí thấp hơn thông điệp gửi đi trước.
- Trong mô hình 4+1 View (Slide Ch7 p.18), Sequence Diagram thuộc **Logical View** (Góc nhìn logic của nhà phân tích/thiết kế).

---

## II. CÁC THÀNH PHẦN KÝ HIỆU CHUẨN MẪU (HÌNH MẪU SLIDE CH6 P.22-26 "SEQUENCE DIAGRAMS - EXAMPLE")

```text
    옷 Actor (User)        ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
       [Stick figure]      │     ATM      │     │  Consortium  │     │     Bank     │
         │                 └──────┬───────┘     └──────┬───────┘     └──────┬───────┘
         │  insert card           │                    │                    │
         ├───────────────────────►│ {a} [Time Mark]    │                    │
         │                        │  verify card       │                    │
         │                        ├───────────────────►│                    │
         │                        │                    │  verify account    │
         │                        │                    ├───────────────────►│
         │   Duration Constraint  │                    │                    │
         │   {b - a < 10 sec}     │                    │  account not ok    │
         │  ◄ - - - - - - - - - - │                    │◄ - - - - - - - - - ┤
         │                        │  reject card       │                    │
         │                        │◄ - - - - - - - - - ┤                    │
         │  eject card            │                    │                    │
     {b} │◄ - - - - - - - - - - - ┤                    │                    │
         │                        │                    │                    │
         ▼ [Lifeline]             ▼                    ▼                    ▼
```

### Các đặc trưng bắt buộc theo hình mẫu Slide Ch6 p.22/23:
1. **Actor (Tác nhân):** Đặt ở phía ngoài cùng bên trái, vẽ bằng hình người que (*Stick figure*).
2. **Object Lifelines (Thành phần hệ thống):** Các hộp chữ nhật bo góc nhẹ ở đỉnh, tô màu pastel dịu nhẹ phân biệt từng vai trò (UI/App màu lam, Controller màu lục, Service/IoT màu hồng, Database màu hổ phách).
3. **Activation (Khung kích hoạt):** Hình chữ nhật đứng liên tục biểu thị khoảng thời gian đối tượng tích cực xử lý nghiệp vụ.
4. **Message (Thông điệp yêu cầu):** Mũi tên nét liền có đầu mũi tên đặc (`──►`), đặt tên theo hành động rõ ràng không rườm rà.
5. **Return Message (Thông điệp phản hồi):** Mũi tên nét đứt có đầu mũi tên mở (`< - - -`), nhãn in nghiêng biểu thị kết quả trả về.
6. **Time Constraint & Duration Constraint (Ràng buộc thời gian & thời lượng):**
   - Đánh dấu mốc thời gian `{a}` tại điểm bắt đầu giao dịch và `{b}` tại điểm kết thúc giao dịch.
   - Kẻ đường kích thước hai đầu mũi tên màu đỏ kèm nhãn `{b - a < X sec}` đo lường thời gian phản hồi tối đa của hệ thống.

### 1. Đối tượng và Tác nhân ở đỉnh sơ đồ (Actors & Lifelines - Slide Ch6 p.22, 40, 50)
- **Actor (Tác nhân):** Đặt ở phía ngoài cùng bên trái (hoặc bên phải nếu là hệ thống thứ ba như `Supplier` trong slide 40). Biểu diễn bằng hình người que (*Stick figure*).
- **Object / Component Box (Khối đối tượng):** Biểu diễn bằng hình chữ nhật nằm ở đỉnh trên cùng.
- **Quy ước đặt tên đối tượng (Slide Ch6 p.40 & p.50):**
  - Dạng đầy đủ: `objectName : ClassName` (ví dụ mẫu slide 50: `regForm : RegisterForm`).
  - Dạng thể hiện ẩn danh: `:ClassName` (ví dụ mẫu slide 40 & 50: `:Order`, `:LoginForm`, `:Registration`, `:Database`, `:Student`).
  - Dạng thành phần/hệ thống: `ATM`, `Consortium`, `Bank`, `Budget`.
  - Dạng kho dữ liệu có định kiểu stereotype: `<<datastore>> Orders` (Slide Ch6 p.40).
- **Lifeline (Đường sinh mệnh):** Đường **nét đứt thẳng đứng** (`┆`) kéo dài từ đáy của Actor và Object Box xuống cuối sơ đồ.

### 2. Khung kích hoạt (Activation Box - Slide Ch6 p.22, 24, 25, 40, 50)
- **Ký hiệu:** Hình chữ nhật đứng thanh mảnh nằm đè lên đường Lifeline.
- **Ý nghĩa:** Biểu thị khoảng thời gian đối tượng đang nắm quyền kiểm soát (*Focus of Control*) hoặc đang tích cực thực thi tác vụ.
- **Lồng kích hoạt (Nested Activation):** Khi một đối tượng tự gọi hàm nội bộ (Self-call) hoặc đợi kết quả trả về từ hàm đệ quy, khối Activation con sẽ vẽ đè lệch sang phải một nửa so với khối cha (Slide Ch6 p.40 & 50).

### 3. Thông điệp đồng bộ (Synchronous Message / Request - Slide Ch6 p.22, 26, 40, 50)
- **Ký hiệu:** Đường **nét liền ngang** có **đầu mũi tên đặc tô đen** (`──►`).
- **Ý nghĩa:** Lời gọi hàm/tác vụ đồng bộ. Bên gọi tạm ngưng chờ bên nhận phản hồi.
- **Cú pháp tên thông điệp (Slide Ch6 p.50):**
  - Chuẩn đánh số thứ tự phân cấp: `1: methodName(params)`, `1.1: subMethod(params)`, `2: nextMethod()`, `3.1: result := fetch()`.
  - Kèm điều kiện rẽ nhánh (Guard condition): `[condition] methodName()` (Ví dụ mẫu slide 40: `[validation ok] Update (amount)`; mẫu slide 50: `1.2 [succ = true]: welcome`).

### 4. Thông điệp phản hồi (Return Message / Response - Slide Ch6 p.22, 50)
- **Ký hiệu:** Đường **nét đứt ngang** có **đầu mũi tên chữ V hở** (`< - - -`).
- **Ý nghĩa:** Trả kết quả xử lý hoặc dữ liệu về cho đối tượng đã gọi trước đó.
- **Quy tắc:** Bắt buộc vẽ từ mép dưới của Activation Box bên trả kết quả về mép tương ứng của bên nhận.

### 5. Tự gọi chính mình (Self-call / Internal Processing - Slide Ch6 p.40)
- **Ký hiệu:** Mũi tên nét liền xuất phát từ cạnh phải của Activation Box, uốn vòng góc vuông và trỏ ngược lại chính Activation Box đó (Ví dụ mẫu slide 40: `:Order` tự gọi hàm `Validate ()`).

### 6. Ràng buộc thời gian & Thời lượng (Time & Duration Constraints - Slide Ch6 p.22)
- **Ký hiệu:** Mốc thời gian `{a}`, `{b}` tại điểm gửi/nhận thông điệp.
- **Khoảng thời lượng cho phép:** Mũi tên hai đầu có chú thích `{b - a < 10 sec}` (Ví dụ mẫu slide 22: Ràng buộc giao dịch ATM không quá 10 giây).

### 7. Khung phân mảnh điều kiện (Combined Fragments - Visual Paradigm Reference Slide 21)
- **Khung `alt` (Alternative):** Biểu diễn rẽ nhánh `if / else`. Khung chữ nhật bao quanh luồng, góc trên trái ghi `alt`. Các nhánh ngăn cách nhau bằng đường nét đứt ngang kèm điều kiện `[Guard condition]`.
- **Khung `opt` (Option):** Chỉ thực thi khi điều kiện `[Condition]` thỏa mãn (tương đương lệnh `if` không có `else`).
- **Khung `loop`:** Biểu diễn vòng lặp xử lý với điều kiện dừng `[loop condition]`.

---

## III. BẢNG CHECKLIST KIỂM TRA CHẤT LƯỢNG SEQUENCE DIAGRAM

- [ ] **Bố cục Lifeline:** Actor đặt bên trái, các đối tượng kỹ thuật sắp xếp từ trái sang phải theo thứ tự cuộc gọi.
- [ ] **Định danh Lifeline:** Đặt tên đúng cú pháp UML (`:MobileApp`, `:Controller`, `:Service`, `:Database` hoặc `regForm : RegisterForm`).
- [ ] **Phân biệt mũi tên:** 100% Request dùng nét liền đầu đặc (`──►`), 100% Response dùng nét đứt đầu hở (`< - - -`).
- [ ] **Activation Box:** Khớp chính xác thời điểm nhận Request và kết thúc khi trả Response.
- [ ] **Tên thông điệp:** Rõ nghĩa, có dấu ngoặc đơn tham số `method(params)`.
- [ ] **Rẽ nhánh lỗi / thành công:** Tách bạch rõ ràng trong khung `alt` kèm điều kiện `[Guard condition]` cụ thể.
