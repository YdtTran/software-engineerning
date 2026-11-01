# Bổ sung vòng đời nghiệp vụ

Nguồn: đề bài `04_BTL_SoftwareEngineering_HK261.pdf` trang 1–4, `PROJECT_SPECIFICATION.md` §3 và `SUBMISSION_1_REPORT.md` §4. Sáu ca phụ dưới đây là quyết định thiết kế bổ sung để khép kín 14 nhóm use case; không phải sáu yêu cầu được đề bài liệt kê nguyên văn. Mẫu 11 mục theo Ch3 p.56, Ch6 p.19–20.

Không nối check-in/check-out bằng `include` hoặc `extend` tới Reserve Parking Space: đặt trước, vào bãi và ra bãi là các mục tiêu ở thời điểm khác nhau. Tương tự, dừng sạc và hoàn tất/hủy điều chuyển là các ca độc lập. Các quan hệ `include` trong từng sơ đồ chỉ thể hiện bước bắt buộc của chính ca đó.

## UC06A — Check In Private Vehicle

[Draw.io](STUDENTS/UC06A-Check_In_Private_Vehicle.drawio) · [SVG chỉnh sửa được](STUDENTS/UC06A-Check_In_Private_Vehicle.drawio.svg) · [PNG](STUDENTS/UC06A-Check_In_Private_Vehicle.png)

| Mục | Đặc tả |
|---|---|
| Use-case ID | UC06A |
| Use-case name | Check In Private Vehicle — Xác nhận xe cá nhân vào bãi |
| Use-case overview | Thực hiện lượt đặt chỗ UC06, ghi nhận xe đã tới đúng Hub và chiếm dụng slot. |
| Actors | Student khởi xướng; xác nhận đến từ dữ liệu thiết bị hoặc dữ liệu giả lập. |
| Trigger | Sinh viên chọn phiếu đặt chỗ và xác nhận đến Hub. |
| Preconditions | Tài khoản hợp lệ; phiếu thuộc sinh viên, còn hiệu lực; xe cá nhân đã được cấp sẵn; thời điểm đến không sớm hơn ScheduledArrivalTime. |
| Postconditions | Phiếu Reserved → Fulfilled; slot Held → Occupied; xe gắn đúng Hub/slot. Các thay đổi được thực hiện nguyên tử. |
| Normal Flow (Steps 1..n) | 1. Chọn phiếu/QR. 2. Kiểm tra chủ phiếu, xe, Hub và thời hạn tại lúc xác nhận. 3. Xác nhận xe đã đến. 4. Chiếm dụng đúng slot đang giữ và hoàn thành phiếu trong một giao dịch. 5. Hiển thị xác nhận và cập nhật sức chứa. |
| Alternative Flows | QR không đọc được: nhập mã phiếu; Operator có thể xác nhận thay sau khi đối chiếu xe và chủ phiếu, lưu người thực hiện. Đến sớm: chờ đến giờ hoặc hủy và đặt lại nếu có chỗ. |
| Exceptions | Phiếu hết hạn/bị hủy, sai chủ xe hoặc slot bị cách ly: từ chối, giữ trạng thái hiện có và gợi ý đặt lại/Hub khác. Gửi lặp sau thành công trả lại kết quả cũ. |
| Notes and Issues | Hết hạn tại ScheduledArrivalTime + 30 phút; không giải phóng slot của phiếu đã Fulfilled. Sinh viên có thể Back/Close trước xác nhận. Mã phiếu không tự thay thế kiểm tra quyền. |

## UC06B — Check Out Private Vehicle

[Draw.io](STUDENTS/UC06B-Check_Out_Private_Vehicle.drawio) · [SVG chỉnh sửa được](STUDENTS/UC06B-Check_Out_Private_Vehicle.drawio.svg) · [PNG](STUDENTS/UC06B-Check_Out_Private_Vehicle.png)

| Mục | Đặc tả |
|---|---|
| Use-case ID | UC06B |
| Use-case name | Check Out Private Vehicle — Xác nhận xe cá nhân ra bãi |
| Use-case overview | Ghi nhận xe rời bãi và trả lại sức chứa sau lượt gửi xe. |
| Actors | Student khởi xướng; dữ liệu thiết bị/giả lập xác nhận xe rời bãi. |
| Trigger | Sinh viên chọn xe đang gửi và yêu cầu lấy xe. |
| Preconditions | Sinh viên là chủ xe; xe đang chiếm một slot tại Hub. |
| Postconditions | Xe không còn occupant/currentSlot tại Hub; slot được giải phóng nếu không bị cách ly; cập nhật sức chứa và lưu sự kiện ra bãi. |
| Normal Flow (Steps 1..n) | 1. Chọn xe. 2. Kiểm tra chủ xe và slot đang chiếm. 3. Xác minh không còn sạc/cắm điện hoặc yêu cầu sạc đang chờ. 4. Xác nhận xe thực sự rời bãi. 5. Xóa liên kết chiếm chỗ và cập nhật sức chứa nguyên tử. 6. Hiển thị thành công. |
| Alternative Flows | Xe đang sạc: đề nghị thực hiện UC07A rồi kiểm tra lại. Yêu cầu đang chờ: xin xác nhận hủy trước khi ra bãi. Operator được xác nhận thay sau đối chiếu và lưu vết. |
| Exceptions | Chưa xác nhận ngắt điện hoặc xe chưa rời bãi: giữ Occupied. Mất mạng: đọc lại kết quả theo mã giao dịch trước khi gửi lại. Gửi lặp không tăng số chỗ trống lần thứ hai. |
| Notes and Issues | Dừng sạc không đồng nghĩa ra bãi. Giữ lịch sử phiếu UC06 ở Fulfilled; không sửa thành Cancelled. Back/Close trước xác nhận giữ nguyên trạng thái. |

## UC07A — Stop Charging Session

[Draw.io](STUDENTS/UC07A-Stop_Charging_Session.drawio) · [SVG chỉnh sửa được](STUDENTS/UC07A-Stop_Charging_Session.drawio.svg) · [PNG](STUDENTS/UC07A-Stop_Charging_Session.png)

| Mục | Đặc tả |
|---|---|
| Use-case ID | UC07A |
| Use-case name | Stop Charging Session — Kết thúc phiên sạc |
| Use-case overview | Ngắt nguồn có xác nhận, đóng phiên sạc và giải phóng phân bổ cổng/công suất. |
| Actors | Student khởi xướng với xe/yêu cầu thuộc quyền sử dụng. Hoàn tất tự động do scheduler là FR nền, dùng cùng hợp đồng trạng thái. |
| Trigger | Sinh viên yêu cầu dừng phiên đang sạc. |
| Preconditions | Phiên Active; tài khoản được phép quản lý yêu cầu; có kết nối thiết bị hoặc mô phỏng xác nhận ngắt điện. |
| Postconditions | Phiên Completed nếu đủ nhu cầu, Interrupted nếu dừng sớm. Yêu cầu Completed hoặc Cancelled theo lựa chọn dừng của người dùng; phân bổ công suất được trả, lịch sử giữ lại. Chỗ đỗ vẫn Occupied. |
| Normal Flow (Steps 1..n) | 1. Chọn phiên. 2. Kiểm tra quyền và trạng thái mới nhất. 3. Xác nhận dừng, gửi lệnh ngắt nguồn. 4. Nhận xác nhận ngắt điện. 5. Ghi giờ dừng, đóng phiên/yêu cầu và giải phóng phân bổ nguyên tử. 6. Thông báo, gọi scheduler phục vụ xe kế tiếp. |
| Alternative Flows | Đạt mục tiêu hoặc ngưỡng 80% khi có xe chờ gấp: scheduler dừng theo BR09. Ngắt do lỗi: giữ phiên Interrupted, yêu cầu trở về Queued và kích hoạt UC11/UC12; không coi là người dùng hủy. |
| Exceptions | Không xác nhận ngắt điện: không báo thành công, giữ cổng không khả dụng và tạo sự cố. Thử lại lệnh tối đa 3 lần với cùng mã giao dịch, sau đó chuyển Operator xử lý. |
| Notes and Issues | Phân biệt dừng chủ động (không tự xếp hàng lại) với gián đoạn kỹ thuật (xếp lại). Cổng Fault vẫn bị cách ly dù phân bổ công suất đã trả. Back/Close trước gửi lệnh không thay đổi phiên. |

## UC10A — Confirm Transfer Arrival

[Draw.io](OPERATOR/UC10A-Confirm_Transfer_Arrival.drawio) · [SVG chỉnh sửa được](OPERATOR/UC10A-Confirm_Transfer_Arrival.drawio.svg) · [PNG](OPERATOR/UC10A-Confirm_Transfer_Arrival.png)

| Mục | Đặc tả |
|---|---|
| Use-case ID | UC10A |
| Use-case name | Confirm Transfer Arrival — Xác nhận hoàn tất điều chuyển |
| Use-case overview | Xác nhận đủ xe tới Hub đích, hoàn thành lệnh và cập nhật vị trí/sức chứa. |
| Actors | Operator khởi xướng và ghi nhận đối chiếu hiện trường. Không cần app/tài khoản riêng cho đội vận chuyển trong MVP. |
| Trigger | Đội vận chuyển báo đã tới Hub đích; Operator mở lệnh InTransit. |
| Preconditions | Lệnh InTransit; danh sách xe và chỗ đích được giữ theo lệnh; tài khoản Operator hợp lệ. |
| Postconditions | Lệnh Completed; xe tới đúng Hub/slot; slot đích Occupied; bỏ giữ chỗ điều chuyển. Xe chỉ Available nếu không còn sự cố hoặc nhu cầu sạc. |
| Normal Flow (Steps 1..n) | 1. Mở lệnh. 2. Đối chiếu từng mã xe với danh sách. 3. Xác nhận đủ xe thực tế tới và các slot đích còn hợp lệ. 4. Cập nhật xe, slot và lệnh nguyên tử. 5. Cập nhật dashboard và lưu kết quả. |
| Alternative Flows | Slot đích không dùng được: Operator chọn chỗ/Hub thay thế, kiểm tra và chuyển giữ chỗ nguyên tử trước khi xác nhận đến. |
| Exceptions | Thiếu/sai xe: không hoàn tất cả lô, giữ InTransit và chuyển xử lý sự cố. Không giải phóng giữ chỗ đang cần cho xe chưa tới. Gửi lặp trả lại kết quả Completed đã ghi. |
| Notes and Issues | MVP hoàn tất theo cả lệnh; không hỗ trợ hoàn tất một phần. Điều kiện pin ≥80% áp dụng lúc chọn/xuất xe, không từ chối ghi nhận xe đã tới chỉ vì pin giảm trong vận chuyển. Back/Close không hoàn tất lệnh. |

## UC10B — Cancel Transfer Order

[Draw.io](OPERATOR/UC10B-Cancel_Transfer_Order.drawio) · [SVG chỉnh sửa được](OPERATOR/UC10B-Cancel_Transfer_Order.drawio.svg) · [PNG](OPERATOR/UC10B-Cancel_Transfer_Order.png)

| Mục | Đặc tả |
|---|---|
| Use-case ID | UC10B |
| Use-case name | Cancel Transfer Order — Hủy lệnh điều chuyển |
| Use-case overview | Hủy lệnh chưa xuất phát và thu hồi các giữ chỗ do chính lệnh sở hữu. |
| Actors | Operator. |
| Trigger | Operator chọn hủy lệnh Planned. |
| Preconditions | Quyền Operator; lệnh Planned và xe vẫn ở Hub nguồn. |
| Postconditions | Lệnh Cancelled; bỏ giữ xe và giữ sức chứa đích của lệnh; xe lỗi vẫn không khả dụng; lịch sử lệnh được giữ. |
| Normal Flow (Steps 1..n) | 1. Chọn lệnh. 2. Kiểm tra trạng thái Planned mới nhất. 3. Xác nhận hủy và lý do. 4. Đổi trạng thái và giải phóng đúng các giữ chỗ nguyên tử. 5. Cập nhật hai Hub và thông báo. |
| Alternative Flows | Lệnh đã Cancelled: trả lại kết quả cũ, không giải phóng lần hai. Back/Close hộp xác nhận: giữ Planned. |
| Exceptions | Xe đã xuất phát hoặc lệnh Completed: từ chối hủy. Nếu cần đổi đích khi InTransit, xử lý theo ngoại lệ UC10A, không đưa xe về Available tại Hub nguồn. |
| Notes and Issues | Hủy và xác nhận xuất phát tranh chấp cùng trạng thái Planned; chỉ một thao tác được commit. |

## UC11A — Report Trip Incident

[Draw.io](STUDENTS/UC11A-Report_Trip_Incident.drawio) · [SVG chỉnh sửa được](STUDENTS/UC11A-Report_Trip_Incident.drawio.svg) · [PNG](STUDENTS/UC11A-Report_Trip_Incident.png)

| Mục | Đặc tả |
|---|---|
| Use-case ID | UC11A |
| Use-case name | Report Trip Incident — Báo sự cố giữa chuyến |
| Use-case overview | Sinh viên báo xe hỏng/pin bất thường trong chuyến đang chạy; Operator tiếp nhận qua UC11. |
| Actors | Student khởi xướng; Operator tiếp nhận trong UC11. |
| Trigger | Sinh viên chọn Báo sự cố trong chuyến đi. |
| Preconditions | Tài khoản sở hữu chuyến Active; xe thuộc chuyến đó. |
| Postconditions | Tạo phiếu Open gắn xe/chuyến, vị trí và mô tả; gửi thông báo vận hành sau commit; chuyến chưa tự kết thúc, xe không được phân bổ lại. |
| Normal Flow (Steps 1..n) | 1. Chọn Báo sự cố. 2. Kiểm tra chuyến và quyền. 3. Nhập loại lỗi, mô tả, vị trí; ảnh tùy chọn. 4. Xác nhận gửi. 5. Lưu phiếu với mã yêu cầu duy nhất. 6. Thông báo Operator và hiển thị mã theo dõi. |
| Alternative Flows | Không cấp GPS: nhập vị trí thủ công. Operator xử lý theo UC11, tổ chức thu hồi xe; chỉ đóng chuyến sau xác nhận nhận lại xe/đỗ an toàn với cùng kiểm tra của UC05. |
| Exceptions | Mất mạng: giữ nội dung để thử lại, chưa báo đã tiếp nhận. Gửi lại cùng mã trả về phiếu cũ. Chuyến không thuộc người gửi hoặc đã đóng: từ chối và cho quay lại chi tiết chuyến. |
| Notes and Issues | Không khóa xe vật lý từ xa khi xe đang di chuyển; chỉ chặn phân bổ mới và hướng dẫn dừng ở vị trí an toàn. Không tự đóng chuyến bằng việc gửi báo cáo. Back/Close trước gửi không tạo phiếu. |

## Quy tắc chung và giới hạn MVP

- Giữ 14 nhóm UC01–UC14; sáu mã hậu tố là mục tiêu phụ, không đổi số thứ tự/phân công cũ.
- Tài khoản và thông tin xe cá nhân cấp sẵn; xác thực, kiểm tra chủ tài nguyên và vai trò vẫn bắt buộc khi triển khai. Chưa xây đăng ký tài khoản, thanh toán, nợ phí, điểm uy tín hay khuyến mãi.
- UC04 bắt buộc đặt trước; không nhận xe trực tiếp không có phiếu. Xe thuê có pin ≥20%; xe điều chuyển có pin ≥80% lúc chọn/xuất phát.
- Cảnh báo đỏ: lấp đầy ≥95% hoặc không còn xe khả dụng. Nếu chưa đỏ, cảnh báo vàng khi lấp đầy ≥85% hoặc tỷ lệ xe khả dụng ≤10%; còn lại bình thường. Tỷ lệ xe dùng tổng đội xe dùng chung được cấu hình tại Hub; mẫu số 0 hiển thị N/A, số xe khả dụng 0 vẫn kích hoạt đỏ.
- `powerLimitKW` là ngân sách vận hành đã giới hạn ở 85% công suất định mức. Tổng công suất phân bổ không vượt ngân sách này; không nhân 85% lần thứ hai.
- Chỗ giữ xe dùng chung 15 phút; chỗ đỗ giữ từ lúc xác nhận đặt đến check-in/hủy/hết hạn tại ScheduledArrivalTime + 30 phút. MVP không bán lại một slot cho nhiều lịch tương lai chồng nhau; chưa cần lịch ra dự kiến để tính khả dụng tương lai.
- Dữ liệu giả lập phải phát được sự kiện xe vào/ra, ngắt điện, xuất phát/đến, ngoài các sự kiện giảm pin. Không yêu cầu phần cứng thật hoặc database.

## Checklist và thao tác

| Kiểm tra | Cách kiểm chứng |
|---|---|
| Actor ngoài ranh giới; tên ca bắt đầu bằng động từ | Sáu sơ đồ native và PNG |
| Include chỉ dùng cho bước bắt buộc, mũi tên base → included | PLANTUML_ALL.md và native XML |
| Khung xanh #e0f2fe, padding động, nhãn quan hệ riêng | Bộ renderer kiểm tra cell/path thực tế |
| Mỗi ca có đủ 11 mục, luồng thoát và ngoại lệ | Sáu bảng trên |
| Không nhầm bản thiết kế với chức năng đã chạy | Prototype vẫn có giới hạn mô tả trong README UI |

1. Chỉnh sửa offline trong VS Code: nhấp đúp file `.drawio.svg`.
2. Dán block PlantUML tương ứng từ [PLANTUML_ALL.md](PLANTUML_ALL.md) vào Draw.io: `+` → `Advanced` → `PlantUML`.
3. Import vào VP Online: `File` → `Import` → `PlantUML...`.
