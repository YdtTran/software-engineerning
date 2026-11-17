# Smart E-Mobility Hub — Android App (User)

Ứng dụng Android (Kotlin + Jetpack Compose + Material 3 + MapLibre `13.7.1` / OpenFreeMap + OSRM + CameraX/ZXing QR) kết nối trực tiếp tới backend Express tại `app/`.

## Giao diện & tính năng đã có

- **4 tab chính** theo theme xanh royal + skyline TP.HCM + nền xanh băng nhạt Material 3:
  - `Trang chủ`: Header skyline (`TP Hồ Chí Minh`), 4 phím nhanh (`Tìm Hub`, `Thuê xe`, `Đặt chỗ đỗ`, `Sạc xe`), lưới `Dịch vụ`, thẻ `Hub gần bạn` và tóm tắt hoạt động đang diễn ra.
  - `Bản đồ`: Thanh tìm kiếm Hub (`GET /api/v1/hubs?q=`), bản đồ vector OpenFreeMap (`https://tiles.openfreemap.org/styles/bright`) qua MapLibre Android SDK với tọa độ ĐHQG-HCM, đồng bộ 2 chiều marker-danh sách Hub, và chỉ đường OSRM (`Polyline`).
  - `Thông báo`: Đồng bộ trạng thái phiếu giữ xe, chuyến đi, chỗ đỗ, yêu cầu sạc và hàng đợi thử lại an toàn (`Idempotency-Key`).
  - `Tài khoản`: Đăng nhập/đăng xuất (`/api/v1/session`), `Thông tin cá nhân`, `Lịch sử sử dụng`, `Cài đặt` (đổi URL máy chủ), `Hỗ trợ`.
- **Luồng nghiệp vụ Người dùng (UC01–UC07A, UC11A)**:
  - `Thuê & Trả xe điện`: Chọn Hub, lọc loại xe (`electric_bicycle` / `electric_motorbike`), giữ xe 15 phút, hủy phiếu, quét QR trên xe (CameraX + ZXing, hỗ trợ chọn ảnh QR/nhập dự phòng) để nhận (`pickup`), kiểm tra chỗ trả & xác nhận trả xe (`return`), báo sự cố giữa chuyến (`UC11A`).
  - `Đặt chỗ đỗ xe`: Kiểm tra chỗ trống `immediate` / `advance`, đặt chỗ (`UC06-S1`), check-in (`UC06-S2`, xử lý xung đột `LIM-01`), check-out (`UC06-S3`, hỗ trợ xác nhận hủy sạc chờ khi gặp `409 CHARGING_REQUEST_QUEUED`).
  - `Sạc xe điện`: Gửi yêu cầu sạc gắn với lượt đỗ đang hoạt động (`UC07`), hủy yêu cầu đang chờ, dừng phiên sạc an toàn (`UC07A`).

## Mở và chạy trong Android Studio

1. Khởi động backend trên PC (tại thư mục gốc repo, cài đặt DB & tài khoản demo theo `app/README.md` trước):

```powershell
$env:DEMO_ACCOUNTS_FILE = (Resolve-Path app/db/.local/demo-accounts.json).Path
$env:DEMO_DB_PATH = (Resolve-Path app/db/.local/hub.sqlite).Path
$env:DEMO_HOST = '0.0.0.0'
$env:DEMO_INSECURE_HTTP = '1'
$env:DEMO_SIMULATED_DEVICES = '1'
npm start --prefix app
```

2. Mở thư mục `android/` bằng **Android Studio** (JDK 17, Android SDK 35, Gradle Sync tự tải Gradle 8.9).
3. Chạy trên **Android Emulator** hoặc **điện thoại thật**:
   - **Emulator**: dùng URL mặc định `http://10.0.2.2:3000`.
   - **Điện thoại thật qua cáp USB**: chạy `adb reverse tcp:3000 tcp:3000` rồi chọn `http://127.0.0.1:3000` trong mục `Cài đặt`.
   - **Điện thoại thật qua Wi-Fi**: nhập `http://<IP_LAN_CUA_PC>:3000` (đảm bảo Windows Firewall cho phép cổng 3000).
4. Đăng nhập bằng tài khoản `user` đã tạo qua `.\app\provision-demo.ps1`.

## Gắn xe cá nhân để thử UC06 / UC07

`app/db/seed.sql` chỉ tạo xe dùng chung (`owner_id IS NULL`). Để thử đặt chỗ đỗ (`UC06`) và sạc xe cá nhân (`UC07`) với tài khoản `demo-user`, tạo một xe cá nhân qua API Operator (`POST /api/v1/operations/resources`) hoặc chèn nhanh vào SQLite cục bộ:

```powershell
node -e "const {DatabaseSync}=require('node:sqlite'); const db=new DatabaseSync('app/db/.local/hub.sqlite'); db.prepare(\"INSERT OR IGNORE INTO electric_vehicles(id,hub_id,vehicle_type,battery_percent,status,owner_id,connector_type) VALUES ('PV-USER-1','bku','electric_motorbike',42,'Available','demo-user','type2')\").run(); db.close();"
```

## Kiểm tra cục bộ

- Chạy unit test JVM trên Android Studio hoặc qua Gradle khi có JDK/Android SDK:

```powershell
.\gradlew testDebugUnitTest
```
