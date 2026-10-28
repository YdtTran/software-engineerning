# BỘ QUY CHUẨN THIẾT KẾ CLASS DIAGRAM CHUẨN ĐHQG-HCM
> **Nguồn chuẩn mực tối cao (Supreme Law):** Slide bài giảng chính thức môn **Software Engineering (CO3001)** - Khoa KH&KT Máy tính, Trường ĐH Bách Khoa - ĐHQG-HCM (Giảng viên: Anh Nguyen-Duc, Tho Quan Thanh), biên soạn dựa trên giáo trình quốc tế **Ian Sommerville - Software Engineering (10th Edition)** (Slide Ch6 - Page 28 đến 35) và Visual Paradigm Class Diagram Tutorial.

---

## I. MÔ HÌNH HÓA CẤU TRÚC TĨNH (STRUCTURAL MODELS - SLIDE CH6 P.28)
- **Structural Models:** Hiển thị cách tổ chức của hệ thống dưới góc độ các thành phần cấu thành và mối quan hệ giữa chúng.
- **UML Class Diagram:** Dùng khi phát triển mô hình hệ thống hướng đối tượng (*object-oriented system model*) để biểu diễn các lớp đối tượng (*classes*) và các liên kết (*associations*) giữa các lớp.
- Trong mô hình 4+1 View (Slide Ch7 p.18), Class Diagram là thành phần cốt lõi của **Logical View** (Cấu trúc dữ liệu và dịch vụ phần mềm).
- **Phân biệt Class Diagram vs Database Diagram (Slide Ch6 p.35):**
  - Database biểu diễn Entity / Table / Quan hệ khóa ngoại.
  - Class Diagram biểu diễn lớp đối tượng có đầy đủ Thuộc tính dữ liệu (Attributes) VÀ Hành vi/Phương thức xử lý (Operations/Methods).

---

## II. CẤU TRÚC KHỐI LỚP CHUẨN MẪU (CLASS COMPARTMENTS - SLIDE CH6 P.30, P.31, P.34)

Mỗi lớp được biểu diễn bằng hình chữ nhật chia làm **3 ngăn (Compartments)** từ trên xuống dưới:

```text
┌────────────────────────────────────────────────────────┐
│                      ClassName                         │  <-- Ngăn 1: Tên lớp (In nghiêng nếu là Abstract Class)
├────────────────────────────────────────────────────────┤
│ - id : Integer                                         │
│ + name : String                                        │  <-- Ngăn 2: Thuộc tính (Attributes)
│ # address : String                                     │
├────────────────────────────────────────────────────────┤
│ + Display () : void                                    │
│ + Add () : Boolean                                     │  <-- Ngăn 3: Phương thức (Operations)
│ + printInfo () : void                                  │      (In nghiêng nếu là Abstract Method)
└────────────────────────────────────────────────────────┘
```

### 1. Ngăn 1: Tên lớp (Class Name)
- Đặt chính giữa, in đậm. Viết hoa chữ cái đầu mỗi từ (PascalCase, ví dụ: `Customer`, `Order`, `Payment`).
- **Abstract Class (Lớp trừu tượng - Slide Ch6 p.34):** Tên lớp **bắt buộc viết IN NGHIÊNG (Italics)** (Ví dụ mẫu slide 34: *Person*, *Server*).

### 2. Ngăn 2: Danh sách thuộc tính (Attributes - Slide Ch6 p.31)
- **Cú pháp chuẩn:** `[visibility] name : type [= initialValue]`
- Ví dụ mẫu slide 30 & 31:
  - `-date : Date`
  - `-status : String`
  - `+name : String`
  - `#address : String`
  - `-id : Integer`
  - `-amount : float`

### 3. Ngăn 3: Danh sách phương thức (Operations - Slide Ch6 p.31, p.34)
- **Cú pháp chuẩn:** `[visibility] name(parameter : type) : returnType`
- **Abstract Method (Phương thức trừu tượng - Slide Ch6 p.34):** Tên phương thức **bắt buộc viết IN NGHIÊNG (Italics)** (Ví dụ mẫu slide 34: *+printInfo()*).
- Ví dụ mẫu slide 30 & 34:
  - `+calcSubTotal() : float`
  - `+calcTax() : float`
  - `+isForMe(p : Packet) : boolean`
  - `+getSalary() : float`

---

## III. QUY ƯỚC PHẠM VI TRUY CẬP (ACCESS MODIFIERS - SLIDE CH6 P.31)

Bài giảng slide định nghĩa rõ 4 ký hiệu phạm vi truy cập:
- `+` : **Public** - Công khai cho toàn bộ hệ thống truy cập.
- `-` : **Private** - Riêng tư, chỉ nội bộ các phương thức trong chính lớp này được phép truy cập.
- `#` : **Protected** - Bảo vệ, chỉ lớp này và các lớp con kế thừa từ nó mới được phép truy cập.
- `~` : **Package** - Cùng gói, chỉ các lớp trong cùng package/thư mục được phép truy cập.

---

## IV. BẢN ĐỒ CÁC MỐI QUAN HỆ GIỮA CÁC LỚP (RELATIONSHIPS - SLIDE CH6 P.30, P.32, P.33, P.34)

```text
Association:       Class A 1 ────────── 0..* Class B
Navigable:         Class A ────────────► Class B
Aggregation:       Whole ◇1 ────────── 1..* Part (Hollow Diamond)
Composition:       Whole ◆1 ────────── 1..* Part (Filled Diamond)
Generalization:    Child ─────────────▷ Parent (Hollow Triangle)
Dependency:        Client - - - - - - - ► Supplier (Dashed Arrow)
```

### 1. Association (Liên kết thường - Slide Ch6 p.30, 32, 33)
- **Ký hiệu:** Đường nét liền mảnh nối 2 lớp.
- **Bội số quan hệ (Multiplicities - Slide Ch6 p.32, 33):** Bắt buộc ghi rõ ở hai đầu liên kết:
  - `1` : Đúng 1 thể hiện duy nhất (*Exactly one, no more and no less*).
  - `0..1` : Không hoặc một (*Zero or one*).
  - `*` hoặc `0..*` : Không hoặc nhiều (*Zero or many*).
  - `1..*` : Một hoặc nhiều (*One or many*).
- **Tên vai trò (Role Name):** Đặt cạnh đầu liên kết (Ví dụ mẫu slide 30: quan hệ giữa `Order` và `OrderDetail` có nhãn vai trò `line item`).
- **Navigable Association:** Mũi tên hở `-->` chỉ rõ chiều điều hướng truy xuất từ lớp nguồn sang lớp đích.

### 2. Aggregation (Thu nạp - has-a yếu - Slide Ch6 p.30)
- **Ký hiệu:** Đường nét liền có **hình thoi rỗng (hollow diamond)** ở phía lớp chứa (Whole).
- **Ý nghĩa:** Quan hệ một phần - toàn thể dạng lỏng lẻo. Nếu lớp Whole bị hủy, lớp Part vẫn có thể tồn tại độc lập.
- **Ví dụ mẫu trong Slide Ch6 p.30:** `Order` 1 ◇── 1..* `OrderDetail`.

### 3. Composition (Cấu thành - has-a mạnh)
- **Ký hiệu:** Đường nét liền có **hình thoi đặc tô đen (filled diamond)** ở phía lớp chứa (Whole).
- **Ý nghĩa:** Quan hệ sở hữu sống còn. Vòng đời của Part gắn liền với Whole. Khi Whole bị hủy, Part bắt buộc bị hủy theo.

### 4. Generalization (Kế thừa / "is-a" - Slide Ch6 p.30, p.34)
- **Ký hiệu:** Đường nét liền có **mũi tên hình tam giác rỗng (hollow triangle)** trỏ từ lớp con lên lớp cha.
- **Biểu diễn gom nhánh (Shared Tree - Slide Ch6 p.30, 34):** Khi nhiều lớp con cùng kế thừa một lớp cha, các đường kế thừa được gom lại thành một nhánh cây chung hội tụ về mũi tên tam giác rỗng.
- **Ví dụ mẫu trong Slide Ch6 p.30 & 34:**
  - `Payment` $\triangle$ $\longleftarrow$ (`Cash`, `Check`, `Credit`).
  - `Person` $\triangle$ $\longleftarrow$ (`Employee`, `Customer`).
  - `Server` $\triangle$ $\longleftarrow$ (`Printer`, `File Server`).

### 5. Dependency (Phụ thuộc)
- **Ký hiệu:** Đường **nét đứt có mũi tên hở** (`- - - ->`) trỏ từ Client sang Supplier.
- **Ý nghĩa:** Lớp Client sử dụng lớp Supplier làm tham số hàm hoặc biến cục bộ tạm thời.

---

## V. BẢNG CHECKLIST KIỂM TRA CHẤT LƯỢNG CLASS DIAGRAM

- [ ] **Cấu trúc 3 ngăn:** Mỗi lớp có đủ Tên lớp, Thuộc tính và Phương thức.
- [ ] **Lớp trừu tượng (Abstract):** Tên lớp và tên phương thức trừu tượng **viết in nghiêng**.
- [ ] **Phạm vi truy cập:** 100% thuộc tính và phương thức có ký hiệu (`+`, `-`, `#`, `~`).
- [ ] **Định dạng thuộc tính:** Đầy đủ kiểu dữ liệu (`name : Type`).
- [ ] **Định dạng phương thức:** Đầy đủ tham số và kiểu trả về (`method(param: Type) : ReturnType`).
- [ ] **Bội số quan hệ:** Ghi rõ ở hai đầu các mối liên kết (`1`, `0..1`, `1..*`, `*`).
- [ ] **Ký hiệu quan hệ:** Phân biệt chính xác giữa Kế thừa (tam giác rỗng), Thu nạp (thoi rỗng), Cấu thành (thoi đặc).
