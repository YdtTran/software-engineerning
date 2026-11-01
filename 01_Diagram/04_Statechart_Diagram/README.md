# Statechart diagrams — reviewed 2026-11-01

Chuẩn: slide CO3001 Ch6 p.41–45; nghiệp vụ theo `PROJECT_SPECIFICATION.md` §3 và [LIFECYCLE_SCENARIOS.md](../01_Usecase_Diagram/LIFECYCLE_SCENARIOS.md). [Quy trình kiểm tra và tái tạo](../03_Activity_Diagram/README.md).

Bố cục đã được làm lại sau review: ba sơ đồ dùng lưới trạng thái và đường nối vuông góc, tiêu đề khung canh trái, chữ đen với tên trạng thái 16px và nhãn chuyển 14px. Khung vận hành nền nhạt; lỗi đỏ nhạt, bảo trì vàng nhạt, kết thúc xanh nhạt. Các điểm giao có cầu nhảy để phân biệt với điểm nối. Cả 55 transition giữ nguyên source/target và hợp đồng nghiệp vụ; nhãn trên hình được rút gọn để dễ đọc. Xem **Bảng đối chiếu nhãn trên hình** trong [catalog](PLANTUML_STATECHART.md) cho điều kiện đầy đủ; hợp đồng cũng được nhúng trong thuộc tính `data-contract` của từng edge.

Tái tạo riêng Statechart, giữ nguyên bộ Activity:

```powershell
python .agent/scripts/generate_process_diagrams.py --statecharts-only
node .agent/scripts/render_process_diagrams.cjs --statecharts-only
python .agent/scripts/check_process_diagrams.py
```

Tọa độ và nhãn trình bày nằm trong `.agent/scripts/statechart_layout.py`; các state/method/event gốc vẫn ở `generate_process_diagrams.py`. PlantUML/Mermaid giữ biểu thức đầy đủ, bố cục preview do renderer tương ứng quyết định; chúng không phải bản sao vị trí của canvas Draw.io.

| Sơ đồ | Phạm vi và sửa lỗi chính |
|---|---|
| [SC01 — Vehicle](SC01-Vehicle_State_Machine.drawio.svg) | Thêm Faulty, giữ xe cho lệnh Planned và InTransit; chỉ InUse sau unlock ACK; phân loại pin sau trả/đến/bảo trì; fault ở Operational áp dụng mọi trạng thái con; không khóa xe đang chạy. |
| [SC02 — Charging Point](SC02-Charging_Point_State_Machine.drawio.svg) | Thêm Starting, Stopping, Awaiting Unplug; không giải phóng cổng chỉ vì gửi lệnh; ngắt lỗi cách ly cổng, xác nhận mất điện rồi mới đối soát/queue lại; kiểm thử an toàn thất bại vẫn Fault. |
| [SC03 — Reservation & Trip](SC03-Reservation_and_Trip_State_Machine.drawio.svg) | Thêm Pickup Claimed và Pickup Uncertain để chống hết hạn tranh chấp mở khóa; Active Trip bao gồm Riding và Incident Reported; báo sự cố không kết thúc chuyến; safe return mới Completed, không có thanh toán. |

Đây là ba góc nhìn đồng bộ qua sự kiện, không phải một enum dùng chung: Vehicle.InUse tương ứng Trip.Active; cổng sạc và yêu cầu/phiên sạc có vòng đời khác nhau. `Faulty` của xe không đồng nghĩa chuyến đã đóng. Trạng thái `Idle` của cổng không đồng nghĩa chỗ đỗ đã trống. SC03 là process aggregate Reservation–Trip, không yêu cầu gộp hai entity dữ liệu thành một.

Mỗi sơ đồ có `.drawio`, `.drawio.svg`, `.png`, `.puml`, `.mmd`. [PLANTUML_STATECHART.md](PLANTUML_STATECHART.md) chứa đủ hai khối mã cho từng sơ đồ. Các state có thân hành động native được giữ trong XML, không chỉ vẽ chữ lên ảnh SVG.

| Checklist theo slide | Kết quả |
|---|---|
| Initial, final và trạng thái reachable | Đạt; final của tài nguyên dài hạn là kết thúc vòng đời sau Retired |
| State hai ngăn; `entry /`, `do:`, `exit /` đúng tiền tố | Đạt kiểm tra XML và nguồn |
| Composite state chứa state con thực sự bằng parent | Đạt; không chỉ vẽ khung trang trí |
| Nhãn `event [guard] / action` đúng thứ tự | Sinh chung từ model cho XML, PlantUML, Mermaid |
| Các guard cùng event loại trừ nhau | Đã rà soát pin, fault, thời hạn; kiểm tra tự động chống transition trùng bộ source/event/guard |
| Hết hạn đúng biên `now >= expiresAt`; pickup chỉ `now < expiresAt` | Có; thao tác claim serialize với expiry/cancel |
| Không khôi phục tài nguyên chỉ vì đã sửa xong | Có guard testPassed và điều kiện an toàn/trip |
| Không chồng state/nhãn hoặc xuyên state/nhãn không liên quan | Đạt kiểm tra rendered DOM tại [verification.json](verification.json) |

Các tên event/method là hợp đồng thiết kế, không tuyên bố implementation đã có. Retired là điểm kết thúc mô hình khi ngừng sử dụng tài nguyên, không bổ sung màn hình hay yêu cầu xóa dữ liệu. Composite trong SC01/02 không cần initial con vì các transition đi vào state con cụ thể; sự kiện fault phát ra từ cả superstate. Dừng bởi người dùng kết thúc/cancel yêu cầu; lỗi kỹ thuật giữ Interrupted và queue lại; xem UC07A cho hậu điều kiện chi tiết. Mũi tên khởi tạo/kết thúc không có event là transition UML hợp lệ.

1. Chỉnh sửa offline trong VS Code: nhấp đúp file `.drawio.svg`.
2. Dán block PlantUML vào Draw.io: `+` → `Advanced` → `PlantUML` (nếu phiên bản hỗ trợ).
3. Import vào VP Online: `File` → `Import` → `PlantUML...`.
