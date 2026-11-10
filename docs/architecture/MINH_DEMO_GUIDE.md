# Chạy và kiểm tra phần việc của Minh

Phạm vi đã triển khai: UC01–UC05 và UC13–UC14. Backend dùng chung inventory và phiên đăng nhập với Operations. Các luồng người dùng và mô phỏng chạy qua HTTP API, có dữ liệu lưu trong SQLite. Đây là demo MVP; thiết bị được giả lập khi bật cấu hình tương ứng.

## 1. Chuẩn bị và tạo dữ liệu

Mở PowerShell tại thư mục gốc repository. Cần Node.js 22 hoặc 24 và npm có trong PATH. Kiểm tra bằng `node --version` và `npm --version`.

```powershell
npm ci --prefix app
npm run db:init --prefix app
.\app\provision-demo.ps1
```

Script cuối hỏi mật khẩu riêng cho `minh` (User) và `operator` (Operator). Bạn tự đặt mật khẩu; repo không có mật khẩu mặc định. File `app/db/.local/demo-accounts.json` chỉ chứa hash có salt và được Git bỏ qua. Nếu đã có file tài khoản, script giữ nguyên file đó. Script có tham số `-NodeCommand` nếu cần chỉ định đường dẫn Node.

Database được tạo ở `app/db/.local/hub.sqlite`. Chạy lại lệnh khởi tạo không reset dữ liệu. Bộ khởi tạo cũng nâng cấp database từ các đợt trước của nhánh Minh, giữ chuyến, mã phiếu và kết quả mô phỏng đã lưu. Không cần SQLite CLI hoặc shell Unix.

## 2. Khởi động

```powershell
$env:DEMO_ACCOUNTS_FILE = (Resolve-Path app/db/.local/demo-accounts.json).Path
$env:DEMO_DB_PATH = (Resolve-Path app/db/.local/hub.sqlite).Path
$env:DEMO_INSECURE_HTTP = '1'
$env:DEMO_SIMULATED_DEVICES = '1'
npm start --prefix app
```

Mở các địa chỉ sau:

| Địa chỉ | Đăng nhập |
|---|---|
| `http://127.0.0.1:3000/user-app.html` | `minh` và mật khẩu bạn đã đặt |
| `http://127.0.0.1:3000/operator-web.html` | `operator` và mật khẩu tương ứng |
| `http://127.0.0.1:3000/operator-app.html` | Tài khoản Operator, bố cục mobile |

Dùng DevTools → thiết bị mobile để demo app trên máy tính. Server hiện chỉ lắng nghe localhost; chưa cấu hình chạy qua Wi-Fi hoặc HTTPS. `Ctrl+C` dừng server. Khi khởi động lại, dữ liệu nghiệp vụ còn nguyên nhưng cần đăng nhập lại.

## 3. Thử luồng người dùng

1. Chọn **Tìm xe → Ga Metro ĐHQG → Xem xe**.
2. Chọn một xe khả dụng, rồi **Xác nhận giữ xe**. Phiếu có mã và hạn nhận thực tế tối đa 15 phút.
3. Trong **Chuyến của tôi**, thử nhập mã xe sai: hệ thống báo lỗi và không tạo chuyến.
4. Nhập đúng mã trên phiếu để nhận xe. Demo adapter xác nhận mở khóa, sau đó tạo chuyến.
5. Chọn Hub trả → **Kiểm tra chỗ trả** → chọn slot → đánh dấu đã đỗ/khóa an toàn → **Xác nhận trả xe**.
6. Reload trang: chuyến đã hoàn tất vẫn được tải từ server. Quãng đường hiển thị chưa có số đo nếu adapter không cung cấp odometer.

Có thể hủy phiếu trước khi nhận xe. Trong chuyến đang hoạt động, **Báo sự cố** gửi tới Operations và giữ chuyến đang chạy. Server kiểm tra danh tính và chủ sở hữu ở mọi thao tác.

Nếu mất phản hồi, giao diện giữ khóa yêu cầu trong trình duyệt. Sau khi mở lại trang, dùng **Thử lại yêu cầu trước** để lấy lại kết quả, tránh tạo phiếu/chuyến trùng. Nếu thiết bị chưa xác nhận an toàn, chuyến/claim được giữ để đối soát; không có nút ép giải phóng tài nguyên.

## 4. Thử mô phỏng

Đăng nhập Operator, chọn kịch bản, Hub và tham số rồi **Chạy mô phỏng**. Có đủ năm lựa chọn: tăng khách Metro, đầy bãi, tăng nhu cầu sạc, hỏng cổng và xe dồn ứ. Kịch bản dồn ứ cần ít nhất hai Hub.

Kết quả gồm chỉ số cơ sở/kịch bản, thời điểm snapshot, khuyến nghị và giả định. Tab **Kết quả** cho phép mở lại sau reload; **Xuất kết quả JSON** tải đúng dữ liệu đã lưu. Cùng snapshot và mã tái hiện cho cùng kết quả.

Với khuyến nghị điều chuyển, **Xem phương án điều chuyển** đọc lại inventory hiện tại. Chọn xe đủ điều kiện và số slot tương ứng, rồi xác nhận tạo lệnh qua API Operations. Lệnh ở trạng thái `Planned`; giao diện không tự xác nhận xuất phát/đến. Các đề xuất đổi lịch sạc hoặc hướng dẫn đổi Hub chỉ là khuyến nghị cho module sở hữu xem xét.

## 5. Kiểm thử và giới hạn

```powershell
npm run test:mobility --prefix app
npm test --prefix app
```

Kiểm thử trình duyệt dùng Edge và một module Playwright đã cài; đặt `LIVE_PLAYWRIGHT` tới đường dẫn module đó. Nếu chưa có, bài kiểm thử trình duyệt báo skip. Hai bài driver `better-sqlite3`/`sqlite3` cũng báo skip khi các package tùy chọn chưa có.

Đã kiểm tra cạnh tranh giữa trả xe, giữ chỗ đỗ và điều chuyển trên cùng sức chứa; rollback; retry; phân quyền; nâng cấp database cũ; và giao diện ở 390×844/1440×1000. Hình ảnh kiểm tra và database tạm không đưa vào Git.

Inventory hiện chưa có tọa độ, nên Hub trả `location: null`. Mô phỏng là mô hình sự kiện có seed và giả định rõ, chưa phải dự báo đã hiệu chỉnh. Parking/Charging, giao thức IoT thật, cơ chế xác nhận cách ly và dịch vụ thông báo ngoài còn thuộc các phần tích hợp tương ứng. Bộ xem thiết kế cũ ở `app/prototype/index.html` vẫn dùng mock; khi mở các entry point qua backend, server chuyển sang giao diện API.
