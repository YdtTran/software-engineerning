# Production & Deployment Runbook (Version 2.0)

Tài liệu này hướng dẫn cấu hình, triển khai, vận hành và kiểm soát bảo mật cho **Smart E-Mobility Hub**, đồng thời phân tách rõ cấu hình đang dùng cho bản local demo với các thành phần cần nâng cấp khi đưa lên hạ tầng production thực tế.

## 1. Yêu cầu hệ thống & Thành phần

| Thành phần | Công nghệ hiện hành | Ghi chú Production |
|---|---|---|
| Backend API & Static Host | Node.js `>= 22`, Express 5 | Chạy sau reverse proxy TLS (Nginx / Caddy / Cloud LB). |
| Cơ sở dữ liệu | SQLite (`node:sqlite`, schema v12) | Bật WAL mode (`PRAGMA journal_mode=WAL`), backup định kỳ; hoặc nâng cấp driver adapter theo [DECISION.md](architecture/DECISION.md). |
| User Mobile Client | Native Android (Kotlin, Jetpack Compose, Min SDK 26) | Build bản release ký số (`assembleRelease`), cấu hình HTTPS base URL. |
| Operator Web / Mobile UI | HTML/CSS/JS + MapLibre GL JS | Phục vụ cùng origin với `/api/v1` để bảo vệ cookie `SameSite=Strict`. |

---

## 2. Biến môi trường (Environment Variables)

| Biến | Bắt buộc | Mặc định | Mô tả & Bảo mật |
|---|---|---|---|
| `DEMO_PORT` / `PORT` | Không | `3000` | Cổng lắng nghe HTTP của Express server (`DEMO_PORT` ưu tiên trước `PORT` do PaaS cấp). |
| `DEMO_HOST` | Không | `127.0.0.1` | Địa chỉ bind (`0.0.0.0` trong container/cloud hoặc LAN). |
| `DEMO_DB_PATH` | Khuyến nghị | `app/db/.local/hub.sqlite` | Đường dẫn tuyệt đối tới file SQLite dữ liệu vận hành (mặc định `/data/hub.sqlite` trong Docker). |
| `DEMO_ACCOUNTS_FILE` | Có (demo auth) | — | Đường dẫn JSON chứa danh sách tài khoản đã hash salt (xem mục 3). |
| `DEMO_OPERATOR_PASSWORD` / `DEMO_USER_PASSWORD` | Tùy chọn (cloud) | — | Chỉ dùng cho entrypoint `app/src/cloud-start.js` để hash salt ra `DEMO_ACCOUNTS_FILE` khi khởi động container; không lưu plaintext vào Git. |
| `DEMO_ACCOUNTS_JSON` | Tùy chọn (cloud) | — | Mảng JSON tài khoản đã hash sẵn (ưu tiên trước biến mật khẩu khi dùng `cloud-start.js`). |
| `DEMO_SEED_MODE` | Không | `clean` | Chỉ áp dụng lần khởi tạo đầu tiên bởi `cloud-start.js`: `dashboard` (dữ liệu minh họa Xanh/Vàng/Đỏ) hoặc `clean` (tất cả Available). |
| `TRUST_PROXY` | Khi sau proxy | `0` | Đặt `1` sau reverse proxy TLS (Render, Railway, Nginx, Caddy) để `Origin` khớp `X-Forwarded-Proto: https` và `X-Forwarded-Host`. |
| `DEMO_SIMULATED_DEVICES` | Không | `0` | Đặt `1` để bật adapter mô phỏng khóa/trạm sạc cục bộ; tắt (`0`) khi dùng adapter phần cứng thật. |
| `DEMO_INSECURE_HTTP` | Không | `0` | Chỉ dùng `1` cho môi trường HTTP cục bộ (`NODE_ENV !== 'production'`). Production **bắt buộc** giữ `0` để cookie gắn cờ `Secure`. |
| `NODE_ENV` | Khuyến nghị | — | Đặt `production` khi triển khai thật; server sẽ từ chối khởi động nếu `DEMO_INSECURE_HTTP=1`. |

---

## 3. Khởi tạo cơ sở dữ liệu & Tài khoản

### 3.1. Migrate & Seed dữ liệu
```bash
npm ci --prefix app
# Tạo DB chuẩn (tất cả tài nguyên ở trạng thái Available)
DEMO_DB_PATH=/var/lib/emobility/hub.sqlite npm run db:init --prefix app
```
- Lệnh `initialize.js` chạy tuần tự `app/db/migrations/0001..0012` và hỗ trợ nâng cấp an toàn từ phiên bản 8/9 mà không mất dữ liệu chuyến đi hay kết quả mô phỏng.
- Với môi trường minh họa Dashboard (có sẵn Hub Đỏ/Vàng/Xanh, sự cố mở và hàng đợi sạc), dùng `npm run db:dashboard-demo --prefix app`.

### 3.2. Cấp tài khoản an toàn (Salted Hash)
Không lưu mật khẩu plaintext trong repo hoặc biến môi trường. Dùng helper tạo bản ghi JSON:
```bash
node app/src/hash-demo-account.js operator op-prod-1 operator < <(read -s -p "Operator password: " p && printf '%s' "$p")
node app/src/hash-demo-account.js user user-prod-1 user < <(read -s -p "User password: " p && printf '%s' "$p")
```
Gom thành mảng JSON tại `DEMO_ACCOUNTS_FILE` với quyền file `chmod 600`.

---

## 4. Quy trình khởi động & Vận hành

### 4.1. Khởi động dịch vụ
```bash
NODE_ENV=production \
TRUST_PROXY=1 \
DEMO_HOST=127.0.0.1 \
DEMO_PORT=3000 \
DEMO_DB_PATH=/var/lib/emobility/hub.sqlite \
DEMO_ACCOUNTS_FILE=/etc/emobility/accounts.json \
node app/src/demo-server.js
```
Khuyến nghị cấu hình Nginx/Caddy terminating TLS phía trước, chuyển tiếp header `X-Forwarded-Proto: https` (và `X-Forwarded-Host` nếu đổi host), bật `TRUST_PROXY=1` và giới hạn kích thước body JSON.

### 4.2. Sao lưu & Phục hồi SQLite
Do SQLite ở chế độ WAL giữ thay đổi trong file `-wal`, luôn backup bằng lệnh online backup hoặc dừng ghi tạm thời:
```bash
node -e "const {DatabaseSync}=require('node:sqlite'); const db=new DatabaseSync('/var/lib/emobility/hub.sqlite'); db.exec(\"VACUUM INTO '/var/backups/emobility/hub-$(date +%F).sqlite'\"); db.close();"
```

### 4.3. Kiểm tra sau triển khai (Smoke Test)
1. `GET /healthz` trả `200` với `{"data":{"status":"ok"}}`.
2. `GET /api/v1/session` trả `401 UNAUTHENTICATED` khi chưa đăng nhập.
3. `POST /api/v1/session` với tài khoản hợp lệ trả `200` và set cookie `HttpOnly; SameSite=Strict` (và `Secure` trên HTTPS).
4. `GET /api/v1/hubs` (User/Operator) trả danh sách Hub; `GET /api/v1/operations/hubs` (Operator) trả chỉ số sức chứa và cảnh báo BR10.
5. Thử ghi với `Idempotency-Key` lặp lại cùng payload trả kết quả cũ; đổi payload cùng key trả `409 IDEMPOTENCY_KEY_REUSED`.

### 4.4. Triển khai nhanh lên Cloud (Render / Railway / Docker)
Repository cung cấp sẵn `Dockerfile`, `docker-compose.yml`, `render.yaml`, `railway.json` và entrypoint tự khởi tạo `app/src/cloud-start.js`:
- **Render (Blueprint từ GitHub):** Vào Render Dashboard → **New** → **Blueprint**, chọn repository này (`render.yaml` tự động nhận diện `Dockerfile`, `healthCheckPath: /healthz`, `TRUST_PROXY=1`), nhập `DEMO_OPERATOR_PASSWORD` và `DEMO_USER_PASSWORD` rồi bấm **Apply**. Lưu ý: gói Free dùng filesystem tạm (reset khi redeploy/sleep); để giữ dữ liệu SQLite lâu dài, nâng gói có Persistent Disk và mount vào `/data`.
- **Railway (Docker từ GitHub):** Tạo project mới từ GitHub repo (`railway.json` tự build `Dockerfile` và kiểm tra `/healthz`), thêm biến môi trường `DEMO_OPERATOR_PASSWORD`, `DEMO_USER_PASSWORD`, `DEMO_SIMULATED_DEVICES=1`, và gắn Volume vào `/data` nếu cần lưu SQLite bền vững.
- **Docker Compose / VPS:** Sao chép `.env.example` thành `.env`, đặt mật khẩu mạnh rồi chạy `docker compose up -d --build` phía sau Caddy/Nginx TLS.

---

## 5. Bảo mật & Ranh giới Production cần lưu ý

1. **Xác thực & Phiên làm việc:** Phiên hiện tại lưu trong bộ nhớ tiến trình Node (hết hạn sau 8 giờ hoặc khi restart server). Để chạy đa instance hoặc persistent session, cần thay store phiên sang Redis/SQLite và tích hợp OAuth2/OIDC theo [API_CONTRACTS.md](architecture/API_CONTRACTS.md).
2. **Thiết bị IoT & Cách ly vật lý:** `SimulatedDeviceAdapter` và `DEMO_SIMULATED_DEVICES=1` dùng cho kiểm thử/demo. Trước khi nối trạm thật, triển khai adapter giao thức phần cứng thực thi `unlock`, `lock`, `powerOn`, `powerOff`, `unplug`, `verifyPointSafety` và `isolationVerifier`.
3. **Các endpoint chưa công bố HTTP:** Trong module `parking-charging`, các thao tác `activateAllocation`, `confirmUnplug`, `reconcileUncertainAllocation`, `runPointSafetyCheck` và `confirmIsolation` (module `operations`) đã có service + test nhưng chưa mở public HTTP route. Cần bổ sung route RBAC tương ứng nếu điều phối hoàn toàn qua API từ xa.
4. **Thông báo ngoài & Độ trễ telemetry:** Chức năng gửi Push/SMS (`Notification Service`) và đánh dấu telemetry quá hạn (`stale telemetry`) hiện là yêu cầu mục tiêu; các sự kiện/sự cố được lưu trong SQLite để hiển thị qua dashboard.
