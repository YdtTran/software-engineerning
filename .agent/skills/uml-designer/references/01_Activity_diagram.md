# BỘ QUY CHUẨN THIẾT KẾ ACTIVITY DIAGRAM CHUẨN ĐHQG-HCM
> **Nguồn chuẩn mực tối cao (Supreme Law):** Slide bài giảng chính thức môn **Software Engineering (CO3001)** - Khoa KH&KT Máy tính, Trường ĐH Bách Khoa - ĐHQG-HCM (Giảng viên: Anh Nguyen-Duc, Tho Quan Thanh), biên soạn dựa trên giáo trình quốc tế **Ian Sommerville - Software Engineering (10th Edition)** (Slide Ch6 - Page 12, 13, 39, 51, 52).

---

## I. MÔ HÌNH HÓA HOẠT ĐỘNG THEO GÓC NHÌN TIẾN TRÌNH (SLIDE CH6 P.12)
- **Process Perspective:** Mô hình quy trình tiết lộ cách thức hệ thống phần mềm được sử dụng trong các quy trình nghiệp vụ tổng thể (*broader business processes*).
- **UML Activity Diagram:** Được sử dụng chính thức để định nghĩa mô hình quy trình nghiệp vụ (*business process models*), mô hình hóa luồng xử lý dữ liệu (*data processing*) và chuỗi các hành động thực thi.
- Trong mô hình kiến trúc 4+1 View (Slide Ch7 p.18), Activity Diagram đại diện cho **Process View** (Góc nhìn tiến trình: Concurrency, Performance, Scalability).

---

## II. CÁC THÀNH PHẦN KÝ HIỆU CHUẨN MẪU (SLIDE CH6 P.51 & P.52)

```text
       (●) Initial State
        │
        ▼
   [ Action State ]
        │
        ▼
        ◇ Decision / Branch
       ╱ ╲
 [yes]╱   ╲[no]
     ▼     ▼
    ───┬───┬─── Concurrency Fork (Thanh đồng bộ)
       │   │
       ▼   ▼
     Action A  Action B (Chạy song song)
       │   │
       ▼   ▼
    ───┴───┴─── Concurrency Join (Thanh đồng bộ)
        │
        ▼
   [ :Object [state] ] (Object Flow nét đứt)
        │
        ▼
       (◉) Final State
```

### 1. Nút khởi đầu (Initial State - Slide Ch6 p.51)
- **Ký hiệu:** Hình tròn đặc tô đen (`●`).
- **Ý nghĩa:** Điểm bắt đầu luồng thực thi của tiến trình.

### 2. Nút hành động (Action State / Activity - Slide Ch6 p.51)
- **Ký hiệu:** Hình chữ nhật bo tròn góc.
- **Quy tắc đặt tên:** Bắt buộc bắt đầu bằng một **Động từ hành động** (Ví dụ mẫu trong slide: `Select site`, `Commission architect`, `Develop plan`, `Bid plan`, `Enter Data`, `Generate Information`).
- **Nguyên tắc nguyên tử:** Mỗi Action State chỉ đảm nhận một bước xử lý logic duy nhất.

### 3. Phân nhánh & Hợp nhất tuần tự (Sequential Branch & Merge - Slide Ch6 p.51, 52)
- **Ký hiệu:** Hình thoi rỗng (`◇`).
- **Rẽ nhánh (Decision / Branch):** Một luồng vào, từ hai luồng ra trở lên.
  - **Quy tắc bắt buộc:** Mọi nhánh rẽ **bắt buộc có Guard Condition** đặt trong dấu ngoặc vuông `[Condition]`, các điều kiện phải loại trừ lẫn nhau (Ví dụ mẫu trong slide: `[not accepted]` và `[else]`; `[More Reports]` và `[No More Reports]`; `[dangerous]` và `[not dangerous]`).
- **Hợp nhất (Merge):** Nhiều luồng xử lý hội tụ về lại một luồng chung trước khi đi tiếp.

### 4. Đồng bộ song song (Concurrency Fork & Join - Slide Ch6 p.51, 52)
- **Ký hiệu:** Thanh ngang (hoặc thanh dọc) màu đen đậm (*Synchronization Bar*).
- **Phân tách song song (Concurrent Fork):** 1 luồng vào $\rightarrow$ phân tách thành nhiều luồng hành động thực thi đồng thời, độc lập thứ tự.
- **Gộp song song (Concurrent Join):** Nhiều luồng song song đi vào $\rightarrow$ 1 luồng ra. Luồng tiếp theo chỉ được kích hoạt khi **TẤT CẢ** các luồng song song trước đó đã hoàn thành.
- **Quy tắc:** Tuyệt đối không ghi điều kiện logic lên thanh Fork/Join.

### 5. Phân làn trách nhiệm (Swimming Lane / Swimlanes - Slide Ch6 p.52)
- **Ký hiệu:** Các cột (hoặc hàng) phân tách dọc có tiêu đề chỉ rõ chủ thể đảm nhận.
- **Mẫu trong Slide Ch6 p.52:**
  - Làn 1: `Project Manager` (Actor người dùng).
  - Làn 2: `Project Management System` (Hệ thống phần mềm / Service xử lý).
  - Làn 3: `Printer` (Thiết bị ngoại vi / Hệ thống thứ ba).
- **Quy tắc luân chuyển:** Luồng mũi tên đi xuyên qua các đường biên giữa các làn để thể hiện sự bàn giao tác vụ và dữ liệu giữa các bên.

### 6. Luồng đối tượng dữ liệu (Object Flow - Slide Ch6 p.51, 52)
- **Ký hiệu:** Hình chữ nhật góc vuông biểu diễn đối tượng dữ liệu/tài liệu, nối với Action bằng **đường mũi tên nét đứt** (`- - - ->`).
- **Cú pháp tên đối tượng:** `:ObjectName [State]` (Ví dụ mẫu trong slide: `:CertificateOfOccupancy [completed]`, `Report Criteria`, `Report`).
- **Ý nghĩa:** Thể hiện dữ liệu hoặc thực thể được tạo ra (Output) hoặc tiêu thụ (Input) bởi một Action State.

### 7. Hoạt động có máy trạng thái con (Activity State with Submachine - Slide Ch6 p.51)
- **Ký hiệu:** Hình chữ nhật bo tròn có ký hiệu dấu móc rẽ nhánh `o-o` hoặc tên có dấu ngoặc tròn `()` (Ví dụ mẫu trong slide: `Do trade work()`).
- **Ý nghĩa:** Hoạt động phức hợp mà bên trong nó là cả một sơ đồ con chi tiết.

### 8. Nút kết thúc (Final State - Slide Ch6 p.51, 52)
- **Ký hiệu:** Hình tròn đen đặc có vòng tròn bao bên ngoài (Bullseye `◉`).
- **Ý nghĩa:** Điểm kết thúc của toàn bộ quy trình hoặc một nhánh quy trình.

---

## III. BẢNG CHECKLIST KIỂM TRA CHẤT LƯỢNG ACTIVITY DIAGRAM

- [ ] **Khởi đầu & Kết thúc:** Có đúng 1 nút bắt đầu (`●`) và các nút kết thúc hợp lệ (`◉`).
- [ ] **Đặt tên Action:** 100% bắt đầu bằng Động từ hành động (Verb phrase).
- [ ] **Điều kiện Guard:** Mọi nhánh rẽ từ Decision (`◇`) đều có `[Condition]` trong ngoặc vuông và loại trừ lẫn nhau (bao gồm nhánh `[else]`).
- [ ] **Thanh đồng bộ:** Phân biệt rõ Fork (1 vào $\rightarrow$ n ra) và Join (n vào $\rightarrow$ 1 ra), không ghi text điều kiện lên thanh.
- [ ] **Swimlanes (nếu có phân làn):** Đặt tên rõ ràng cho từng làn (Người dùng, Hệ thống backend, IoT/Thiết bị).
- [ ] **Chống lặp vô tận (Infinite Loop Prevention):** Có bộ đếm thử lại tối đa (ví dụ `< 3 lần`) và có đường thoát an toàn (`Cancel/Back/Timeout`).
- [ ] **Hồi quy lỗi:** Luồng báo lỗi quay trở lại đúng bước hiển thị/nhập liệu trước đó.
