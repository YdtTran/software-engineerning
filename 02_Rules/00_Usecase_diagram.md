# BỘ QUY CHUẨN THIẾT KẾ USE CASE DIAGRAM & ĐẶC TẢ USE CASE CHUẨN ĐHQG-HCM
> **Nguồn chuẩn mực tối cao (Supreme Law):** Slide bài giảng chính thức môn **Software Engineering (CO3001)** - Khoa KH&KT Máy tính, Trường ĐH Bách Khoa - ĐHQG-HCM (Giảng viên: Anh Nguyen-Duc, Tho Quan Thanh), biên soạn dựa trên giáo trình quốc tế **Ian Sommerville - Software Engineering (10th Edition)** (Slide Ch3_4 & Ch6).

---

## I. MÔ HÌNH HÓA USE CASE THEO CHUẨN BÀI GIẢNG (SLIDE CH3 & CH6)

### 1. Khái niệm cốt lõi (Slide Ch6 - Page 16)
- **Use Case Modeling:** Được phát triển ban đầu để hỗ trợ bước trích xuất yêu cầu (*Requirements Elicitation*), sau đó tích hợp chính thức vào UML.
- Mỗi Use Case đại diện cho một **tác vụ rời rạc (discrete task)** liên quan đến sự tương tác ngoại vi với hệ thống.
- **Biểu diễn 2 dạng song hành:**
  1. **Dạng sơ đồ (Diagrammatically):** Cung cấp góc nhìn tổng quan về phạm vi tương tác.
  2. **Dạng văn bản chi tiết (Textual Form / Tabular Scenario):** Đặc tả chi tiết các bước thực thi, luồng bình thường, luồng thay thế và ngoại lệ.

### 2. Các thành phần trên sơ đồ (Slide Ch3 - Page 53, 54, 55)

```text
┌─────────────────────────────────────────────────────────────┐
│                 System Boundary (Tên hệ thống)              │
│                                                             │
│   ( Base Use Case ) ──────<<include>>──────> ( Phụ bắt buộc)│
│          ▲                                                  │
│          │ <<extend>>                                       │
│   ( Mở rộng có ĐK )                                         │
│                                                             │
│   ( Ca con chuyên biệt ) ────▷ ( Ca cha tổng quát )        │
└─────────────────────────────────────────────────────────────┘
  옷 Actor bên ngoài (Con người / Hệ thống khác)
```

1. **System Boundary (Ranh giới hệ thống - Slide Ch3 p.53, p.55):**
   - Khung chữ nhật bao trọn toàn bộ các Use Case bên trong hệ thống.
   - Tên hệ thống đặt ở góc trên hoặc đỉnh chính giữa khung (ví dụ mẫu trong slide: `Passenger Service`, `Chemical Tracking System (CTS)`, `System`).
   - Phân định rõ ràng: Những gì nằm **bên trong** thuộc phạm vi xây dựng của hệ thống; những gì nằm **bên ngoài** thuộc môi trường vận hành.
2. **Actor (Tác nhân - Slide Ch3 p.53, Ch6 p.16):**
   - Đại diện cho con người hoặc hệ thống bên ngoài (*other systems*) tương tác với hệ thống.
   - Biểu diễn bằng hình người que (*Stick figure*).
   - **Vị trí chuẩn theo slide:** Actor **bắt buộc nằm ngoài khung ranh giới**. Actor có thể bố trí ở cả **bên trái** và **bên phải** khung ranh giới tùy theo luồng tương tác:
     - Tác nhân khởi xướng (Primary Actor) đặt bên **TRÁI**.
     - Tác nhân phối hợp, dịch vụ ngoài hoặc bên tiếp nhận (Secondary Actor) đặt bên **PHẢI** (như mẫu Slide 53: `Check-In Representative` ở bên trái, `Passenger` & `Baggage Transportation` ở bên phải).
   - **Tên Actor:** Bắt buộc là **Danh từ** hoặc cụm danh từ chỉ vai trò (Role).
3. **Use Case (Ca sử dụng - Slide Ch6 p.16, 17, 18):**
   - Biểu diễn bằng hình **elip (oval)** nằm trọn vẹn bên trong khung ranh giới hệ thống.
   - **Quy ước đặt tên:** Bắt đầu bằng một **Động từ hành động (Active Verb)** kèm tân ngữ rõ nghĩa (Tham khảo mẫu slide: `Transfer data`, `Register patient`, `View patient info`, `Contact patient`, `Order Food`, `Check-In`). Tuyệt đối không đặt tên dạng danh từ tĩnh.

---

## II. QUY CHUẨN CÁC MỐI QUAN HỆ (ASSOCIATION TYPES - SLIDE CH3 P.54, P.55)

Trong bài giảng slide CO3001, các mối quan hệ giữa Use Case được định nghĩa và vẽ mẫu chính xác như sau:

### 1. Actor - Use Case Association (Đường liên kết tác nhân)
- **Ký hiệu:** Đường nét liền (*solid line*), không có mũi tên (hoặc có mũi tên mở nếu muốn nhấn mạnh chiều kích hoạt đơn hướng).
- **Mẫu slide Ch3 p.53, p.55:** Nối từ bàn tay của Actor tới cạnh ngoài elip của Use Case.
- **Ý nghĩa:** Actor tham gia tương tác trực tiếp vào ca sử dụng.

### 2. Quan hệ `<<include>>` (Bao hàm bắt buộc - Slide Ch3 p.54)
- **Định nghĩa:** Khi ca sử dụng cơ sở thực thi, ca sử dụng được include **bắt buộc phải được gọi và thực thi theo**. Dùng để tái sử dụng logic chung giữa nhiều ca sử dụng.
- **Ký hiệu:** Đường nét đứt (*dashed line*) có nhãn stereotype `<<include>>` hoặc `<<Include>>`.
- **Chiều mũi tên:** Mũi tên hở trỏ từ **Ca cơ sở $\rightarrow$ Ca phụ bắt buộc** (`Base -> Included`).
- **Ví dụ mẫu trong Slide Ch3 p.54:**
  ```text
  (Place Order)  ------<<Include>>------> (Login)
  (Cancel Order) ------<<Include>>------> (Login)
  ```

### 3. Quan hệ `<<extend>>` (Mở rộng có điều kiện - Slide Ch3 p.54, p.55)
- **Định nghĩa:** Bổ sung hành vi cho ca sử dụng cơ sở, nhưng **chỉ xảy ra khi thỏa mãn điều kiện mở rộng nhất định** (không bắt buộc xảy ra trong luồng bình thường).
- **Ký hiệu:** Đường nét đứt (*dashed line*) có nhãn stereotype `<<extend>>` hoặc `<<Extend>>`.
- **Chiều mũi tên:** Mũi tên hở trỏ ngược từ **Ca mở rộng $\rightarrow$ Ca cơ sở** (`Extension -> Base`).
- **Ví dụ mẫu trong Slide Ch3 p.54 & p.55:**
  ```text
  (Return Book) <------<<Extend>>------ (Book Damaged)
  (Order Food)  <------<<Extend>>------ (Order Wine)
  (Serve Food)  <------<<Extend>>------ (Serve Wine)
  (Pay for Food)<------<<Extend>>------ (Pay for Wine)
  ```

### 4. Quan hệ Generalization (Kế thừa / Chuyên biệt hóa - Slide Ch3 p.54)
- **Định nghĩa:** Ca sử dụng con kế thừa toàn bộ hành vi của ca cha và chuyên biệt hóa một khía cạnh cụ thể.
- **Ký hiệu:** Đường nét liền với **đầu mũi tên hình tam giác rỗng (hollow triangle arrowhead)** trỏ từ **Ca con $\rightarrow$ Ca cha** (`Child -> Parent`).
- **Ví dụ mẫu trong Slide Ch3 p.54:**
  ```text
                    (Verify Visitor Identity)
                                ▲
                                │ [tam giác rỗng]
                    ┌───────────┴───────────┐
                    │                       │
      (Verify Visitor Fingerprint)   (Verify Visitor ID Card)
  ```

---

## III. MẪU BẢNG ĐẶC TẢ KỊCH BẢN CHI TIẾT (USE-CASE SCENARIO TABULAR TEMPLATE)
> Nguồn: Trích dẫn chính xác từ **Slide Ch3 Page 56** & **Slide Ch6 Page 19-20**.

Mọi kịch bản chi tiết Use Case trong đồ án đều phải tuân thủ bảng mẫu cấu trúc sau:

| Thuộc tính (Field) | Nội dung đặc tả chuẩn (Mẫu bài giảng) |
| :--- | :--- |
| **Use-case ID** | Mã định danh chuẩn hóa (ví dụ: `U4`, `UC01`, `UC03`). |
| **Use-case name** | Tên ca sử dụng dạng Động từ (ví dụ: `Overview MCP`, `Search club events`). |
| **Use-case overview / Description** | Tóm tắt mục đích nghiệp vụ ngắn gọn của Use Case. |
| **Actors** | Danh sách các tác nhân tham gia (ví dụ: `Student`, `Operator`, `IoT System`). |
| **Trigger** | Sự kiện kích hoạt Use Case (ví dụ: `Sinh viên bấm nút 'Đặt giữ xe'`). |
| **Preconditions** | Tiền điều kiện: Hệ thống/Dữ liệu bắt buộc phải có trước khi thực hiện. |
| **Postconditions** | Hậu điều kiện: Trạng thái hệ thống được bảo đảm sau khi ca hoàn thành. |
| **Normal Flow / Steps** | Chuỗi các bước tuần tự được đánh số (`1.`, `2.`, `3.`) mô tả tương tác Người dùng $\leftrightarrow$ Hệ thống. |
| **Alternative Flows** | Luồng rẽ nhánh thay thế (ví dụ: `Alternative 1: at step 3`, `3a. ...`, `3b. ...`, `Tiếp tục bước 4`). |
| **Exceptions / Exception flow** | Luồng xử lý sự cố/ngoại lệ (ví dụ: `Exception 1: at step 4`, `4a. Nếu không còn xe, hệ thống báo lỗi`). |
| **Notes and Issues** | Ghi chú kỹ thuật, ràng buộc hiệu năng hoặc quy tắc nghiệp vụ bổ trợ. |

---

## IV. BẢNG CHECKLIST KIỂM TRA CHẤT LƯỢNG USE CASE (AUDIT CHECKLIST)

- [ ] **Ranh giới hệ thống:** Khung chữ nhật bao trọn 100% Use Case, có tên hệ thống rõ ràng ở đỉnh.
- [ ] **Vị trí Actor:** Tuyệt đối không nằm bên trong khung ranh giới; Primary Actor bên trái, Secondary Actor bên phải.
- [ ] **Đặt tên Use Case:** 100% bắt đầu bằng Động từ hành động, không dùng danh từ tĩnh.
- [ ] **Chiều mũi tên `<<include>>`:** Trỏ chính xác từ **Ca chính $\rightarrow$ Ca phụ**.
- [ ] **Chiều mũi tên `<<extend>>`:** Trỏ chính xác từ **Ca mở rộng $\rightarrow$ Ca cơ sở**.
- [ ] **Chiều mũi tên Generalization:** Đầu tam giác rỗng trỏ từ **Ca con $\rightarrow$ Ca cha**.
- [ ] **Đặc tả kịch bản:** Bắt buộc có đủ 11 mục theo chuẩn mẫu Slide Ch3 p.56 & Ch6 p.19-20.
