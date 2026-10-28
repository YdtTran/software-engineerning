# BỘ QUY CHUẨN THIẾT KẾ STATE-CHART DIAGRAM CHUẨN ĐHQG-HCM
> **Nguồn chuẩn mực tối cao (Supreme Law):** Slide bài giảng chính thức môn **Software Engineering (CO3001)** - Khoa KH&KT Máy tính, Trường ĐH Bách Khoa - ĐHQG-HCM (Giảng viên: Anh Nguyen-Duc, Tho Quan Thanh), biên soạn dựa trên giáo trình quốc tế **Ian Sommerville - Software Engineering (10th Edition)** (Slide Ch6 - Page 41 đến 45 - Microwave Oven State Machine).

---

## I. MÔ HÌNH HÓA ĐIỀU KHIỂN THEO SỰ KIỆN (EVENT-DRIVEN MODELING - SLIDE CH6 P.41)
- **Event-Driven Modeling:** Mô hình hóa cách thức một thực thể hoặc toàn bộ hệ thống phản ứng lại các kích thích/sự kiện (*stimuli/events*) từ môi trường nội bộ và ngoại vi.
- **Giả định nền tảng:** Hệ thống sở hữu một số lượng hữu hạn các trạng thái (*finite number of states*). Sự kiện kích hoạt sự chuyển dịch từ trạng thái này sang trạng thái khác (*state transition*).
- **Thực thể mục tiêu trong đồ án:** Áp dụng cho các thực thể có vòng đời thay đổi liên tục theo thời gian thực (Ví dụ: `Vehicle`, `ChargingPort`, `ReservationTrip`).

---

## II. CÁC THÀNH PHẦN KÝ HIỆU CHUẨN MẪU (SLIDE CH6 P.42, P.43, P.44)

```text
       (●) Initial State
        │
        ▼
┌────────────────────────┐
│       StateName        │  <-- Ngăn 1: Tên trạng thái
├────────────────────────┤
│ entry / onEnterAction  │  <-- Ngăn 2: Hành động nội bộ (Actions/Activities)
│ do: ongoingActivity    │
│ exit / onExitAction    │
└───────────┬────────────┘
            │
            │ event [guard] / action  <-- Nhãn chuyển trạng thái (Transition)
            ▼
┌────────────────────────┐
│      NextState         │
└───────────┬────────────┘
            │
            ▼
       (◉) Final State
```

### 1. Trạng thái khởi tạo & Kết thúc (Slide Ch6 p.42)
- **Initial State:** Hình tròn đặc tô đen (`●`). Điểm bắt đầu vòng đời của thực thể.
- **Final State:** Hình tròn đặc tô đen có vòng tròn bao quanh (Bullseye `◉`). Điểm kết thúc vòng đời.

### 2. Khối trạng thái (State Box - Slide Ch6 p.42, 44)
- **Ký hiệu:** Hình chữ nhật bo tròn góc chia thành **2 ngăn**:
  - **Ngăn trên:** Tên trạng thái (Ví dụ mẫu slide 42: `Waiting`, `Half power`, `Full power`, `Set time`, `Disabled`, `Enabled`, `Operation`).
  - **Ngăn dưới:** Các hành động nội bộ với tiền tố chuẩn:
    - `entry / action`: Thực thi ngay khi vừa bước vào trạng thái.
    - `do: activity`: Hoạt động kéo dài trong suốt thời gian nằm ở trạng thái (Ví dụ mẫu slide 42: `do: display time`, `do: set power = 600`, `do: get number`, `do: operate oven`, `do: display 'Ready'`).
    - `exit / action`: Thực thi ngay trước khi rời khỏi trạng thái (Ví dụ mẫu slide 42: `exit: set time`).

### 3. Đường chuyển trạng thái (Transition - Slide Ch6 p.42, 45)
- **Ký hiệu:** Mũi tên nét liền có đầu nhọn (`──►`).
- **Cú pháp đầy đủ của nhãn chuyển trạng thái:**
  $$\text{event [guard] / action}$$
  - `event` (Sự kiện / Kích thích): Tên kích thích gây ra sự chuyển trạng thái (Ví dụ mẫu slide 42: `Timer`, `Door open`, `Door closed`, `Start`, `Cancel`, `Full power`).
  - `[guard]` (Điều kiện bảo vệ): Biểu thức logic trong ngoặc vuông, chỉ khi `True` thì quá trình chuyển trạng thái mới được phép xảy ra.
  - `/ action`: Hành động tức thời được thực thi trong lúc diễn ra sự chuyển dịch.

### 4. Trạng thái phức hợp (Superstate / Composite State - Slide Ch6 p.43)
- **Ký hiệu:** Một khung trạng thái lớn bao bọc các trạng thái con (*sub-states*) bên trong.
- **Ý nghĩa mẫu trong Slide Ch6 p.43:** Trạng thái `Operation` bao bọc chuỗi trạng thái con:
  - `Checking` (`do: check status`) $\xrightarrow{OK}$ `Cook` (`do: run generator`) $\xrightarrow{Timeout}$ `Done` (`do: buzzer on for 5 secs`).
  - Khi có lỗi phát sinh (`Turntable fault`, `Emitter fault`), tự động chuyển sang trạng thái con `Alarm` (`do: display event`).
  - Khi có sự kiện thoát cấp cao (`Door open` hoặc `Cancel`), ngắt toàn bộ Superstate để trở về `Disabled` hoặc `Waiting`.

---

## III. BẢNG CHECKLIST KIỂM TRA CHẤT LƯỢNG STATE-CHART DIAGRAM

- [ ] **Khởi đầu & Kết thúc:** Có đúng 1 nút bắt đầu (`●`) và các nút kết thúc hợp lệ (`◉`).
- [ ] **Đặt tên Trạng thái:** Dạng Tính từ hoặc Phân từ 2 mô tả tình trạng thực thể (ví dụ: `Available`, `Reserved`, `In-Use`, `Charging`).
- [ ] **Hành động nội bộ:** Sử dụng đúng tiền tố chuẩn UML `entry /`, `do:`, `exit /`.
- [ ] **Nhãn chuyển trạng thái:** Tuân thủ chuẩn `event [guard] / action`.
- [ ] **Tính đóng (Determinism):** Tại mỗi trạng thái, với cùng một sự kiện và điều kiện bảo vệ, chỉ có duy nhất một đường chuyển trạng thái hợp lệ.
