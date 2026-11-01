# Activity diagrams — reviewed 2026-11-01

Đã rà soát cả AD01–AD07 theo slide CO3001 Ch6 p.12–13, 39, 51–52, đề bài trang 1–4, `PROJECT_SPECIFICATION.md` §3 và [các ca vòng đời](../01_Usecase_Diagram/LIFECYCLE_SCENARIOS.md).

| Sơ đồ | Phạm vi và sửa lỗi chính |
|---|---|
| [AD01](AD01-Reserve_Vehicle.drawio.svg) | UC03: giữ xe nguyên tử, pin ≥20%, hạn 15 phút; chỉ gửi thông báo sau commit. |
| [AD02](AD02-Pick_Up_Vehicle.drawio.svg) | UC04: bắt buộc phiếu hợp lệ; xác nhận mở khóa trước khi bắt đầu chuyến; serialize với hết hạn/hủy; không tự giải phóng xe khi chưa rõ kết quả mở khóa. |
| [AD03](AD03-Return_Vehicle.drawio.svg) | UC05: xác nhận đúng xe/Hub/slot và khóa an toàn trước khi đóng chuyến; phân biệt Faulty, NeedsCharging và Available; bỏ hóa đơn/thanh toán. |
| [AD04](AD04-Reserve_Parking_and_Charging.drawio.svg) | UC06/A/B, UC07/A, UC12: tách đặt chỗ → check-in → yêu cầu sạc → ngắt điện → check-out; ngân sách `powerLimitKW` đã giới hạn 85%, không nhân lại. |
| [AD05](AD05-Redistribute_Vehicles.drawio.svg) | UC10/A/B: Planned → InTransit → Completed; Back giữ Planned; hủy chỉ trước xuất phát; đến thiếu xe giữ InTransit. Pin ≥80% áp dụng lúc chọn/xuất, không chặn ghi nhận xe đã tới. |
| [AD06](AD06-Handle_Operational_Incident.drawio.svg) | UC11/A: không khóa xe đang chạy; không tự đóng chuyến khi nhận báo cáo; chỉ phục hồi sau kiểm thử an toàn và Operator nghiệm thu. |
| [AD07](AD07-Run_What_if_Simulation.drawio.svg) | UC13/14: sandbox độc lập; xem/xuất không đổi live; áp dụng phải kiểm tra lại rồi chuyển UC10/UC12, không tự điều chuyển vật lý. |

Mỗi sơ đồ có `.drawio`, `.drawio.svg`, `.png`, `.puml`, `.mmd`. Mã PlantUML và Mermaid đầy đủ nằm trong [PLANTUML_ACTIVITY.md](PLANTUML_ACTIVITY.md). [Statechart tương ứng](../04_Statechart_Diagram/README.md).

| Checklist theo slide | Kết quả |
|---|---|
| Một initial, các nhánh kết thúc hợp lệ, tất cả nút reachable | Đạt kiểm tra nguồn |
| Action bắt đầu bằng động từ, swimlane rõ trách nhiệm | Đã rà soát nội dung; lane App bao gồm thao tác hiển thị của Student |
| Decision có guard loại trừ nhau và `[else]`; merge riêng | Đạt kiểm tra nguồn |
| Fork/join có bậc đúng và không mang guard | Đạt; chỉ dùng cho tác vụ sau commit trong AD01 |
| Object hình chữ nhật, luồng dữ liệu nét đứt | Có ở các giao dịch tạo dữ liệu |
| Back/Close và nhánh thất bại không báo thành công giả | Đã rà soát; kết thúc activity không đồng nghĩa kết thúc trip/session đang tồn tại |
| Thiết bị retry tối đa 3 lần, cùng command ID | Có trong subaction chờ thiết bị; không có vòng lặp vô hạn trong graph |
| Nhãn/nút không chồng; đường không trùng đoạn hoặc xuyên nút/nhãn không liên quan | Đạt kiểm tra DOM Draw.io trong [verification.json](verification.json) |
| Cú pháp PlantUML và Mermaid | 10/10 file qua PlantUML `-checkonly` và parser Mermaid có sẵn |

Giới hạn biểu diễn: sơ đồ tích hợp thể hiện các chặng vòng đời khác thời điểm, không buộc người dùng hoàn tất tất cả trong một màn hình. Nhánh Queued của AD04 kết thúc thao tác hiện tại; scheduler tiếp tục xử lý yêu cầu, người dùng có thể hủy yêu cầu đang chờ theo UC07. Khi sạc dừng do kỹ thuật, yêu cầu quay lại Queued; dừng chủ động không tự xếp hàng lại. Cả hai đều giữ chỗ đỗ Occupied cho tới khi xe thực sự ra bãi. Các timeout/3 lần thử là quyết định thiết kế; không phải hằng số thiết bị thật được kiểm chứng. Graph tuần tự ở đây không chứng minh tính nguyên tử của implementation.

Tái tạo từ thư mục gốc:

```powershell
python .agent/scripts/generate_process_diagrams.py
node .agent/scripts/render_process_diagrams.cjs
python .agent/scripts/check_process_diagrams.py
```

Generator dùng bố cục riêng cho từng loại sơ đồ; renderer dùng Draw.io viewer của extension VS Code, Mermaid của Markdown Preview Enhanced và Playwright/Edge. Kiểm tra PlantUML bằng `plantuml.jar -checkonly` với 10 file `.puml`. Không chạy `generate_all_phase2.py` hoặc `generate_all_phase2_v2.py`: hai writer cũ có thể ghi đè cả Sequence và các bản AD/SC đã sửa. Kiểm tra cấu trúc bổ sung: `python <drawio-skill>/scripts/validate.py <file.drawio> --score`; warning đường giao nhau trong graph nhiều nhánh cần phân biệt với lỗi xuyên nút/nhãn, không phải tất cả crossing đều là lỗi nghiệp vụ.

1. Chỉnh sửa offline trong VS Code: nhấp đúp file `.drawio.svg`.
2. Dán block PlantUML vào Draw.io: `+` → `Advanced` → `PlantUML` (nếu phiên bản hỗ trợ).
3. Import vào VP Online: `File` → `Import` → `PlantUML...`.
