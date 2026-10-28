# HƯỚNG DẪN CÚ PHÁP PLANTUML CHUẨN ĐỂ IMPORT DRAW.IO & VISUAL PARADIGM ONLINE

Tài liệu này cung cấp các mẫu cú pháp PlantUML chuẩn cho 4 loại biểu đồ (Use Case, Activity, Sequence, Class Diagram). Toàn bộ code bắt đầu bằng `@startuml` và kết thúc bằng `@enduml`, tương thích 100% với:
- **draw.io:** Menu `Arrange` -> `Insert` -> `Advanced` -> `PlantUML` (hoặc `+` -> `Advanced` -> `PlantUML`).
- **Visual Paradigm Online:** Menu `File` -> `Import` -> `PlantUML`.

---

## 1. Use Case Diagram (PlantUML)

### Quy tắc triển khai:
- Thêm chỉ thị `left to right direction` để Actor chính nằm bên trái và Actor phụ nằm bên phải.
- Ranh giới hệ thống: `rectangle "Tên Hệ Thống" { ... }`.
- Actor chính (bên trái): Khai báo trước khung `rectangle`.
- Actor phụ (bên phải): Khai báo sau khung `rectangle`.
- Use Case: `usecase "Động từ + Tân ngữ" as UC1`.
- Association: `Actor --> UC1` hoặc `Actor -- UC1`.
- Include: `UC_Base .> UC_Include : <<include>>` (Mũi tên trỏ từ Ca chính sang Ca phụ).
- Extend: `UC_Extend .> UC_Base : <<extend>>` (Mũi tên trỏ từ Ca mở rộng về Ca cơ sở).
- Generalization: `UC_Child --|> UC_Parent` hoặc `Actor_Child --|> Actor_Parent`.

### Code mẫu chuẩn:
```plantuml
@startuml
left to right direction
skinparam packageStyle rectangle

actor "Khách hàng" as Customer
actor "Quản trị viên" as Admin

rectangle "Hệ Thống Đặt Món Trực Tuyến" {
    usecase "Đăng nhập" as UC_Login
    usecase "Xác thực OTP" as UC_OTP
    usecase "Báo lỗi đăng nhập" as UC_LoginError
    usecase "Tìm kiếm món ăn" as UC_Search
    usecase "Đặt món" as UC_Order
    usecase "Thanh toán" as UC_Payment
    usecase "Thanh toán qua Thẻ" as UC_PayCard
    usecase "Thanh toán Tiền mặt" as UC_PayCash
    usecase "Quản lý thực đơn" as UC_ManageMenu
}

actor "Cổng Thanh Toán" as PaymentGateway
actor "Nhân viên Giao hàng" as Shipper

' Associations giữa Actor chính và Use Case
Customer --> UC_Login
Customer --> UC_Search
Customer --> UC_Order
Admin --> UC_ManageMenu

' Associations giữa Use Case và Actor phụ
UC_Payment --> PaymentGateway
UC_Order --> Shipper

' Quan hệ <<include>> (Chính -> Phụ bắt buộc)
UC_Login .> UC_OTP : <<include>>

' Quan hệ <<extend>> (Mở rộng -> Gốc)
UC_LoginError .> UC_Login : <<extend>>

' Quan hệ Kế thừa (Con -> Cha)
UC_PayCard --|> UC_Payment
UC_PayCash --|> UC_Payment
@enduml
```

---

## 2. Activity Diagram (PlantUML)

### Quy tắc triển khai:
- Sử dụng cú pháp Activity Diagram mới (Beta syntax) của PlantUML với `start`, `stop`, `:Action;`.
- Action: Bắt đầu bằng động từ, kết thúc bằng dấu chấm phẩy `;`.
- Rẽ nhánh Decision: `if (Điều kiện?) then (yes/hợp lệ) ... else (no/lỗi) ... endif`.
- Luôn có nhánh thoát (Cancel/Hủy) hoặc đếm lần thử tránh vòng lặp vô tận.
- Tiến trình song song: `fork` ... `fork again` ... `end fork`.
- Kết thúc: `stop` hoặc `end`.

### Code mẫu chuẩn:
```plantuml
@startuml
start
:Nhập email và mật khẩu;

if (Thông tin đăng nhập hợp lệ?) then (Đúng)
    :Chuyển đến màn hình chính;
    fork
        :Tải thông tin người dùng;
    fork again
        :Tải thông báo hệ thống;
    end fork
    :Hiển thị giao diện hoàn chỉnh;
    stop
else (Sai)
    if (Số lần thử sai >= 3?) then (Đúng)
        :Khóa tài khoản tạm thời 15 phút;
        :Gửi email cảnh báo bảo mật;
        stop
    else (Sai)
        :Hiển thị thông báo sai mật khẩu;
        :Cho phép thử lại hoặc Thoát;
        if (Người dùng chọn Thử lại?) then (Thử lại)
            :Quay lại bước nhập thông tin;
            detach
        else (Thoát)
            :Đóng ứng dụng;
            stop
        endif
    endif
endif
@enduml
```

---

## 3. Sequence Diagram (PlantUML)

### Quy tắc triển khai:
- `autonumber` để đánh số thứ tự thông điệp.
- Khai báo các Actor và Participants theo đúng trật tự từ trái qua phải.
- Request (Gọi hàm): Mũi tên nét liền `->`.
- Response (Trả dữ liệu): Mũi tên nét đứt `-->`.
- Activation Box: `activate Participant` và `deactivate Participant`.
- Rẽ nhánh điều kiện: Khung `alt [Điều kiện A]` ... `else [Điều kiện B]` ... `end`.
- Tùy chọn: `opt [Điều kiện]` ... `end`.
- Vòng lặp: `loop [Điều kiện lặp]` ... `end`.

### Code mẫu chuẩn:
```plantuml
@startuml
autonumber
actor "Người dùng" as User
participant "Register UI" as UI
participant "AuthController" as Ctrl
participant "AuthService" as Auth
participant "OTPService" as OTP
participant "EmailService" as Mail
entity "Database" as DB

User -> UI: Nhập thông tin & nhấn "Đăng ký"
activate UI

UI -> Ctrl: register(registerDTO)
activate Ctrl

Ctrl -> Auth: processRegistration(registerDTO)
activate Auth

Auth -> DB: findByEmail(email)
activate DB
DB --> Auth: existingUser (null/user)
deactivate DB

alt Email đã tồn tại
    Auth --> Ctrl: throw EmailAlreadyExistsException
    Ctrl --> UI: 409 Conflict ("Email đã được đăng ký")
    UI --> User: Hiển thị thông báo lỗi
else Email hợp lệ / Chưa tồn tại
    Auth -> Auth: hashPassword(password)
    Auth -> OTP: generateOTP(email)
    activate OTP
    OTP --> Auth: otpCode (TTL: 5 phút)
    deactivate OTP

    Auth -> DB: savePendingUser(userData, otpCode, PENDING)
    activate DB
    DB --> Auth: savedUser
    deactivate DB

    Auth -> Mail: sendActivationEmail(email, otpCode)
    activate Mail
    Mail --> Auth: emailSentResult(true)
    deactivate Mail

    Auth --> Ctrl: registrationPendingResponse(email)
    Ctrl --> UI: 200 OK ("Vui lòng kiểm tra email để lấy OTP")
    UI --> User: Chuyển hướng sang màn hình nhập mã OTP
end

deactivate Auth
deactivate Ctrl
deactivate UI
@enduml
```

---

## 4. Class Diagram (PlantUML)

### Quy tắc triển khai:
- Khối 3 ngăn: Tên Class, Thuộc tính, Phương thức.
- Access Modifiers: `-` Private, `+` Public, `#` Protected, `~` Package.
- Quan hệ:
  - Kế thừa: `Parent <|-- Child`
  - Cấu thành mạnh (Composition): `Container *-- Component`
  - Thu nạp yếu (Aggregation): `Container o-- Component`
  - Liên kết (Association): `ClassA --> ClassB`
  - Phụ thuộc (Dependency): `ClassA ..> ClassB`
- Bội số quan hệ (Multiplicity): Ghi trong ngoặc kép `"1" *-- "1..*"`.

### Code mẫu chuẩn:
```plantuml
@startuml
abstract class User {
    #userId: String
    #fullName: String
    #email: String
    #passwordHash: String
    +login(credentials: Credentials): Boolean
    +logout(): Void
    #validateToken(): Boolean
}

class Customer {
    -loyaltyPoints: Integer
    -shippingAddress: String
    +createOrder(cart: Cart): Order
    +viewOrderHistory(): List<Order>
}

class Order {
    -orderId: String
    -orderDate: Date
    -totalAmount: Double
    -status: OrderStatus
    +calculateTotal(): Double
    +checkout(): Boolean
}

class OrderItem {
    -itemId: String
    -quantity: Integer
    -unitPrice: Double
    +getSubtotal(): Double
}

class Product {
    -productId: String
    -productName: String
    -stockQuantity: Integer
    -price: Double
    +updateStock(qty: Integer): Void
}

interface PaymentProcessor {
    +process(amount: Double): Boolean
}

' Quan hệ kế thừa
User <|-- Customer : Kế thừa

' Quan hệ cấu thành (Composition)
Order "1" *-- "1..*" OrderItem : Cấu thành

' Quan hệ liên kết (Association)
OrderItem "0..*" --> "1" Product : Tham chiếu
Customer "1" --> "0..*" Order : Đặt hàng

' Quan hệ phụ thuộc (Dependency)
Order ..> PaymentProcessor : Sử dụng
@enduml
```
