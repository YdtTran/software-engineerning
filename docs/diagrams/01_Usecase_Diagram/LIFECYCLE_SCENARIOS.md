# Hợp đồng vòng đời nghiệp vụ

Nguồn quy tắc: [BR08–BR08b và LIM-01](../../requirements/PROJECT_SPECIFICATION.md#uc06-quản-lý-đặt-chỗ-đỗ-xe-manage-parking-reservation). UC06A → UC06-S2, UC06B → UC06-S3. Tên tệp sơ đồ chi tiết dùng mã kịch bản hiện hành.

## UC06 — Manage Parking Reservation

| Mục | Đặc tả |
|---|---|
| Use-case ID | UC06 |
| Use-case name | Manage Parking Reservation |
| Use-case overview | Quản lý cam kết và chiếm dụng chỗ đỗ của xe cá nhân qua ba tương tác độc lập. |
| Actors | User; Operator hỗ trợ; dữ liệu thiết bị/giả lập; Notification Service. |
| Trigger | Tạo phiếu, yêu cầu check-in hoặc yêu cầu checkout. |
| Preconditions | Tài khoản và xe cá nhân được cấp sẵn; áp dụng điều kiện riêng của từng kịch bản. |
| Postconditions | Ghi nhận kết quả của tương tác, giữ lịch sử và các cam kết khác. |
| Normal Flow (Steps 1..n) | Chọn tương tác: UC06-S1 tạo đặt chỗ, UC06-S2 xác nhận đến hoặc UC06-S3 xác nhận rời bãi. |
| Alternative Flows | Hủy phiếu chưa check-in qua hành động riêng của UC06-S1; Operator hỗ trợ theo từng kịch bản. |
| Exceptions | Từ chối thao tác không hợp lệ; chuyển Operator khi cần đối soát hoặc xử lý LIM-01. |
| Notes and Issues | BR08, BR08a, BR08b và LIM-01. Không có include giữa ba kịch bản. |

## UC06-S1 — Create Parking Reservation

| Mục | Đặc tả |
|---|---|
| Use-case ID | UC06-S1 |
| Use-case name | Create Parking Reservation |
| Use-case overview | Tạo cam kết đặt ngay hoặc đặt trước, độc lập với chiếm dụng. |
| Actors | User; Notification Service. |
| Trigger | User chọn tạo đặt chỗ đỗ. |
| Preconditions | Tài khoản hợp lệ; xe cá nhân được cấp sẵn với biển số và loại xe. |
| Postconditions | Phiếu Reserved, QR/mã phiếu và hạn đến; lưu holdExpiresAt hoặc cả hai mốc plannedArrival/plannedCheckout; không bắt đầu chiếm dụng. |
| Normal Flow (Steps 1..n) | 1. Chọn Hub, xe và pool. 2. Với đặt trước nhập giờ đến và giờ ra. 3. Hiển thị ô tương thích có thể cấp cho lượt ngay hoặc khoảng yêu cầu. 4. Chọn ô và xác nhận. 5. Kiểm tra lại xe, khả dụng và xung đột; ghi cam kết nguyên tử theo BR08. 6. Cấp mã và thông báo. |
| Alternative Flows | Back/Close trước xác nhận không ghi phiếu. Hủy riêng: kiểm tra chủ và Reserved chưa check-in; với đặt trước giữ mốc hủy tối thiểu 10 phút trước giờ hẹn; gỡ đúng cam kết, không tính phí hủy. FR-NI01 gỡ cam kết hết hạn theo BR08a. |
| Exceptions | Sai xe, sai khoảng, hết sức chứa hoặc có cam kết cạnh tranh: từ chối và không ghi dở dang; đề xuất giờ/Hub khác. |
| Notes and Issues | LIM-01: khả dụng trong khoảng không bảo đảm xe trước sẽ ra đúng giờ. |

## UC06-S2 — Check In Private Vehicle

| Mục | Đặc tả |
|---|---|
| Use-case ID | UC06-S2 |
| Use-case name | Check In Private Vehicle — Xác nhận xe cá nhân vào bãi |
| Use-case overview | Thực hiện lượt đặt chỗ UC06, ghi nhận xe đã tới đúng Hub và chiếm dụng slot. |
| Actors | User; Operator xác nhận thay nếu cần; dữ liệu thiết bị hoặc giả lập. |
| Trigger | Người dùng chọn phiếu đặt chỗ và xác nhận đến Hub. |
| Preconditions | Tài khoản hợp lệ; phiếu thuộc User, xe được cấp sẵn; phiếu còn hiệu lực và đủ điều kiện BR08a; đúng Hub, ô tương thích, không cách ly và không có xe hiện diện. |
| Postconditions | Phiếu Reserved → Fulfilled; lưu actualCheckInTime và bắt đầu đúng một lượt chiếm dụng tại Hub/ô. Không khởi động sạc. |
| Normal Flow (Steps 1..n) | 1. Chọn phiếu/QR và yêu cầu check-in. 2. Kiểm tra chủ phiếu, xe, Hub và cửa sổ đến BR08a. 3. Kiểm tra ô có thể sử dụng vật lý. 4. Xác nhận xe đến bằng dữ liệu thiết bị/giả lập. 5. Kiểm tra lại và ghi giờ vào, Fulfilled, chiếm dụng trong một giao dịch. 6. Xác nhận và cập nhật sức chứa. |
| Alternative Flows | QR không đọc được: nhập mã phiếu; Operator có thể xác nhận thay sau khi đối chiếu xe và chủ phiếu, lưu người thực hiện. Đến sớm: chờ đến giờ hoặc hủy và đặt lại nếu có chỗ. |
| Exceptions | Không tìm thấy phiếu, sai chủ/xe, hủy/hết hạn, đến muộn hoặc ô cách ly: từ chối, giữ trạng thái và gợi ý đặt lại/Hub khác. Ô còn xe: áp dụng LIM-01 nếu do quá giờ. Dữ liệu mâu thuẫn hoặc thiếu xác nhận: giữ trạng thái, chuyển Operator đối soát. Gửi lặp trả kết quả cũ. |
| Notes and Issues | UC06A là mã cũ. Đến sớm áp dụng cho đặt trước. Back/Close trước xác nhận giữ nguyên trạng thái. QR không thay kiểm tra quyền. |

## UC06-S3 — Check Out Private Vehicle

| Mục | Đặc tả |
|---|---|
| Use-case ID | UC06-S3 |
| Use-case name | Check Out Private Vehicle — Xác nhận xe cá nhân ra bãi |
| Use-case overview | Ghi nhận xe rời bãi và trả lại sức chứa sau lượt gửi xe. |
| Actors | User; Operator xác nhận thay nếu cần; dữ liệu thiết bị hoặc giả lập. |
| Trigger | Người dùng chọn xe đang gửi và yêu cầu lấy xe. |
| Preconditions | User là chủ xe; xe đang chiếm đúng ô; hệ thống có thể xác minh xe rời bãi. |
| Postconditions | Lưu actualCheckoutTime và phí cuối cùng nếu tính được; kết thúc chiếm dụng, giữ lịch sử Fulfilled và các cam kết tương lai; tính lại khả dụng có xét cách ly. |
| Normal Flow (Steps 1..n) | 1. Chọn xe và yêu cầu checkout. 2. Kiểm tra chủ xe và chiếm dụng. 3. Xác minh sạc đã dừng và kết nối đã tháo an toàn; nếu đang sạc, yêu cầu UC07A rồi kiểm tra lại. 4. Xác nhận xe đã rời. 5. Ghi giờ ra, tính và lưu phí BR08b, kết thúc chiếm dụng và cập nhật khả dụng nguyên tử. 6. Xác nhận checkout. |
| Alternative Flows | Xe đang sạc: đề nghị thực hiện UC07A rồi kiểm tra lại. Yêu cầu đang chờ: xin xác nhận hủy trước khi ra bãi. Operator được xác nhận thay sau đối chiếu và lưu vết. |
| Exceptions | Chưa xác nhận ngắt điện hoặc xe chưa rời bãi: giữ Occupied. Mất mạng: đọc lại kết quả theo mã giao dịch trước khi gửi lại. Gửi lặp không tăng số chỗ trống lần thứ hai. |
| Notes and Issues | UC06B là mã cũ. Dừng sạc không giải phóng chỗ đỗ. Giữ cam kết tương lai và lịch sử LIM-01. Back/Close trước xác nhận giữ nguyên chiếm dụng. Nguồn giờ checkout dự kiến cho đặt ngay còn mở. |

## UC07A — Stop Charging Session

| Mục | Đặc tả |
|---|---|
| Use-case ID | UC07A |
| Use-case name | Stop Charging Session — Kết thúc phiên sạc |
| Use-case overview | Ngắt nguồn có xác nhận, đóng phiên sạc và giải phóng phân bổ cổng/công suất. |
| Actors | User khởi xướng với xe/yêu cầu thuộc quyền sử dụng. Hoàn tất tự động do scheduler là FR nền, dùng cùng hợp đồng trạng thái. |
| Trigger | Người dùng yêu cầu dừng phiên đang sạc. |
| Preconditions | Phiên Active; tài khoản được phép quản lý yêu cầu; có kết nối thiết bị hoặc mô phỏng xác nhận ngắt điện. |
| Postconditions | Phiên Completed nếu đủ nhu cầu, Interrupted nếu dừng sớm. Yêu cầu Completed hoặc Cancelled theo lựa chọn dừng của người dùng; phân bổ công suất được trả, lịch sử giữ lại. Chỗ đỗ vẫn Occupied. |
| Normal Flow (Steps 1..n) | 1. Chọn phiên. 2. Kiểm tra quyền và trạng thái mới nhất. 3. Xác nhận dừng, gửi lệnh ngắt nguồn. 4. Nhận xác nhận ngắt điện. 5. Ghi giờ dừng, đóng phiên/yêu cầu và giải phóng phân bổ nguyên tử. 6. Thông báo, gọi scheduler phục vụ xe kế tiếp. |
| Alternative Flows | Đạt mục tiêu hoặc ngưỡng 80% khi có xe chờ gấp: scheduler dừng theo BR09. Ngắt do lỗi: giữ phiên Interrupted, yêu cầu trở về Queued và kích hoạt UC11/UC12; không coi là người dùng hủy. |
| Exceptions | Không xác nhận ngắt điện: không báo thành công, giữ cổng không khả dụng và tạo sự cố. Thử lại lệnh tối đa 3 lần với cùng mã giao dịch, sau đó chuyển Operator xử lý. |
| Notes and Issues | Phân biệt dừng chủ động (không tự xếp hàng lại) với gián đoạn kỹ thuật (xếp lại). Cổng Fault vẫn bị cách ly dù phân bổ công suất đã trả. Back/Close trước gửi lệnh không thay đổi phiên. |

## UC10A — Confirm Transfer Arrival

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

| Mục | Đặc tả |
|---|---|
| Use-case ID | UC11A |
| Use-case name | Report Trip Incident — Báo sự cố giữa chuyến |
| Use-case overview | Người dùng báo xe hỏng/pin bất thường trong chuyến đang chạy; Operator tiếp nhận qua UC11. |
| Actors | User khởi xướng; Operator tiếp nhận trong UC11. |
| Trigger | Người dùng chọn Báo sự cố trong chuyến đi. |
| Preconditions | Tài khoản sở hữu chuyến Active; xe thuộc chuyến đó. |
| Postconditions | Tạo phiếu Open gắn xe/chuyến, vị trí và mô tả; gửi thông báo vận hành sau commit; chuyến chưa tự kết thúc, xe không được phân bổ lại. |
| Normal Flow (Steps 1..n) | 1. Chọn Báo sự cố. 2. Kiểm tra chuyến và quyền. 3. Nhập loại lỗi, mô tả, vị trí; ảnh tùy chọn. 4. Xác nhận gửi. 5. Lưu phiếu với mã yêu cầu duy nhất. 6. Thông báo Operator và hiển thị mã theo dõi. |
| Alternative Flows | Không cấp GPS: nhập vị trí thủ công. Operator xử lý theo UC11, tổ chức thu hồi xe; chỉ đóng chuyến sau xác nhận nhận lại xe/đỗ an toàn với cùng kiểm tra của UC05. |
| Exceptions | Mất mạng: giữ nội dung để thử lại, chưa báo đã tiếp nhận. Gửi lại cùng mã trả về phiếu cũ. Chuyến không thuộc người gửi hoặc đã đóng: từ chối và cho quay lại chi tiết chuyến. |
| Notes and Issues | Không khóa xe vật lý từ xa khi xe đang di chuyển; chỉ chặn phân bổ mới và hướng dẫn dừng ở vị trí an toàn. Không tự đóng chuyến bằng việc gửi báo cáo. Back/Close trước gửi không tạo phiếu. |

## Truy vết

| Nguồn | Ca và quy tắc |
|---|---|
| Đề bài tr. 1–2, tìm và dùng xe chung | UC01–UC05 |
| Đề bài tr. 1–2, đặt chỗ xe cá nhân | UC06-S1 (BR08/BR08a); UC06-S2 (đến và chiếm dụng); UC06-S3 (rời và BR08b) |
| Đề bài tr. 1–2, nhu cầu sạc và lịch ưu tiên | UC07 tiếp nhận; UC12 phân bổ hữu hạn và kích hoạt có xác nhận; UC07A dừng và giải phóng cổng/công suất an toàn |
| Đề bài tr. 1–2, vận hành và điều phối | UC08 giám sát; UC09 quản trị tài nguyên; UC10 điều chuyển; UC11 xử lý sự cố |
| LIM-01 | UC06-S1 lưu cam kết; UC06-S2 phát hiện và báo; UC06-S3 lưu giờ ra và phí; UC08 theo dõi; UC11 xử lý và giữ vết hai phiếu |
| Đề bài tr. 1–2, What-if Simulation | UC13 chạy; UC14 xem kết quả |

## Kiểm chứng đặc tả

| ID | Kết quả | Walkthrough |
|---|---|---|
| V01 | Pass | Chọn ô đặt ngay tương thích, xác nhận nguyên tử và lưu hạn giữ. |
| V02 | Pass | FR-NI01 hết hạn phiếu chưa check-in và gỡ cam kết riêng. |
| V03 | Pass | Lưu cả hai mốc đặt trước; không bắt đầu chiếm dụng. |
| V04 | Pass | Khoảng [10:00, 11:00) từ chối [10:30, 11:30), cho phép [11:00, 12:00). |
| V05 | Pass | Xác nhận xe đến, ghi một lượt chiếm dụng và Fulfilled. |
| V06 | Pass | Xác nhận xe rời rồi mới kết thúc chiếm dụng. |
| V07 | Pass (đặt trước) | Checkout dự kiến 10:00, grace 15 phút. Ra lúc 10:15 phí 0; 10:16 phí một đơn giá giờ; 11:16 phí hai đơn giá giờ. Lưu cùng giờ ra. |
| V08 | Pass | Xe còn hiện diện sau 11:00 chặn check-in của phiếu kế tiếp dù hai khoảng không chồng. |
| V09 | Pass | Ghi xung đột, báo User, gợi ý thay thế hoặc chuyển Operator. Giữ cả hai phiếu. |
| V10 | Pass | Xác nhận ngắt nguồn giải phóng công suất; xác nhận tháo kết nối giải phóng cổng. Chiếm dụng đỗ giữ nguyên. |

Kiểm tra bổ sung: hai yêu cầu cạnh tranh phải kiểm tra lại trong cùng giao dịch ghi cam kết. Gửi lặp check-in/checkout trả kết quả đã ghi và không thay đổi sức chứa lần nữa. Hết hạn không sửa chiếm dụng; checkout không gỡ cam kết tương lai. Phân bổ sạc chưa tạo phiên Active. UC11 giữ vết hai phiếu khi xử lý LIM-01.

Còn mở: cách xác định giờ checkout dự kiến khi bắt đầu lượt đỗ đặt ngay. V07 cho loại này chưa xác định. LIM-01 giữ lịch sử phiếu, nhưng chưa định nghĩa người đến được dời sang phiếu mới hay sửa cam kết có lưu vết nếu Operator xác nhận phương án thay thế.

## Phạm vi sơ đồ

- UC06 xuất hiện một lần trong hai overview có User. Ba sơ đồ chi tiết dùng mã UC06-S1, UC06-S2 và UC06-S3 trong danh mục.
- AD04 tách điểm bắt đầu check-in và checkout khỏi lần tạo phiếu và kết thúc sạc. SQ04 kết thúc khi tiếp nhận yêu cầu vào hàng đợi. UC12 phân bổ cổng, khung giờ và công suất trong tương tác sau. Chỉ ghi phiên Active sau xác nhận cấp điện.
- SC02 giữ vòng đời cổng sạc; SC03 giữ vòng đời đặt xe chung và chuyến đi. Quy tắc trạng thái riêng của đỗ cá nhân nằm tại BR08a. Class view biểu diễn khoảng dự kiến và kết quả đỗ riêng với quan hệ chiếm dụng hiện tại.
- Các view vận hành, triển khai, thành phần và gói giữ nguyên cấu trúc. Xuất PNG cục bộ khi cần xem trước.

| Kiểm tra UML | Kết quả |
|---|---|
| 14 mã UC chính, một UC06, giữ actor | Đã đối chiếu catalog và overview |
| S1, S2, S3 có trigger độc lập | Đã đối chiếu đặc tả và AD04 |
| Nhãn include là cell riêng | Đã kiểm tra XML của sơ đồ chi tiết |

Mở tệp `.drawio` trong VS Code bằng tiện ích Draw.io Integration.
Trong Draw.io, chọn `+` → `Advanced` → `PlantUML` và dán khối PlantUML từ danh mục.
Trong VP Online, chọn `File` → `Import` → `PlantUML...`.
