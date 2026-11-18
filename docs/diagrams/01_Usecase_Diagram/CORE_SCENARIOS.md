# Hợp đồng các use case chính

Các bảng dùng 11 trường theo [quy tắc use case](../../standards/00_Usecase_diagram.md). [Đặc tả chính](../../requirements/PROJECT_SPECIFICATION.md) quy định yêu cầu và chính sách nhóm; các ghi chú demo chỉ mô tả phạm vi đã xác minh, không thay thế yêu cầu. Đề bài không quy định các ngưỡng thời gian hoặc pin cụ thể dưới đây. UC06 và ba tương tác độc lập được giữ trong [hợp đồng vòng đời](LIFECYCLE_SCENARIOS.md), cùng UC07A, UC10A, UC10B và UC11A.

## UC01 — Search Mobility Hub

| Trường | Nội dung |
|---|---|
| Use-case ID | UC01 |
| Use-case name | Search Mobility Hub |
| Use-case overview | Tìm Hub phù hợp để bắt đầu hoặc kết thúc hành trình. |
| Actors | User. |
| Trigger | User mở tìm Hub hoặc nhập nội dung tìm kiếm. |
| Preconditions | User có quyền truy cập danh mục Hub. |
| Postconditions | Hiển thị danh sách phù hợp; không giữ tài nguyên. |
| Normal Flow | 1. User nhập tên, mã hoặc địa điểm. 2. Hệ thống truy vấn danh mục. 3. Hiển thị Hub phù hợp. 4. User chọn Hub để xem thông tin. |
| Alternative Flows | User sửa từ khóa, chọn lại Hub hoặc đóng màn hình; yêu cầu mục tiêu có thể lọc theo khoảng cách và loại xe. |
| Exceptions | Không có kết quả hoặc không tải được dữ liệu: hiển thị trạng thái tương ứng và cho thử lại. |
| Notes and Issues | Demo API tìm theo tên/mã; lọc Hub theo bán kính hoặc loại xe không thuộc API này. Tọa độ có thể thiếu; xem [đối chiếu demo](../../requirements/VERSION_2_CONTRACT_REVIEW.md). |

## UC02 — View Available Vehicles

| Trường | Nội dung |
|---|---|
| Use-case ID | UC02 |
| Use-case name | View Available Vehicles |
| Use-case overview | Xem xe dùng chung có thể thuê tại Hub. |
| Actors | User. |
| Trigger | User yêu cầu xem xe tại Hub đã chọn. |
| Preconditions | Hub tồn tại và User có quyền truy cập danh mục. |
| Postconditions | Danh sách xe được hiển thị; không tạo phiếu đặt xe. |
| Normal Flow | 1. User chọn Hub. 2. Hệ thống lấy xe dùng chung đủ điều kiện. 3. Hiển thị mã, loại xe và mức pin. 4. User chọn xe để tiếp tục UC03 nếu muốn. |
| Alternative Flows | User lọc loại xe, làm mới danh sách hoặc trở lại danh sách Hub. |
| Exceptions | Hub không tồn tại, không có xe phù hợp hoặc truy vấn lỗi: báo trạng thái và cho chọn lại/thử lại. Khi đặt, UC03 kiểm tra lại khả dụng. |
| Notes and Issues | API hiện trả mã, loại và pin; quãng đường ước lượng và thông tin kỹ thuật chi tiết là phần mục tiêu cần kiểm tra riêng ở giao diện. |

## UC03 — Reserve Vehicle

| Trường | Nội dung |
|---|---|
| Use-case ID | UC03 |
| Use-case name | Reserve Vehicle |
| Use-case overview | Giữ một xe dùng chung cho User đến nhận. |
| Actors | User; thiết bị/dữ liệu giả lập hỗ trợ cập nhật trạng thái. |
| Trigger | User xác nhận giữ xe đã chọn. |
| Preconditions | Tài khoản hợp lệ; Hub và xe dùng chung tồn tại; xe đủ điều kiện và không có giữ chỗ xung đột. |
| Postconditions | Thành công tạo một phiếu Reserved và giữ xe đến hạn; thất bại không để lại giữ chỗ dở dang. |
| Normal Flow | 1. User chọn xe và xác nhận. 2. Hệ thống kiểm tra lại trạng thái, pin và phân bổ. 3. Ghi phiếu và giữ xe nguyên tử. 4. Trả mã phiếu và hạn 15 phút. |
| Alternative Flows | User hủy phiếu Reserved chưa nhận; hệ thống kiểm tra chủ phiếu và giải phóng đúng giữ chỗ. Phiếu quá hạn được xử lý hết hạn theo FR-NI01. Đóng trước xác nhận không tạo phiếu. |
| Exceptions | Xe hết khả dụng hoặc yêu cầu cạnh tranh: từ chối mà không giữ xe. Phiếu đã nhận/hết hạn không thể hủy như phiếu còn hiệu lực. |
| Notes and Issues | Ngưỡng pin và thời hạn giữ là chính sách nhóm. Demo chưa xác nhận có gửi thông báo ra dịch vụ bên ngoài. |

## UC04 — Pick Up Vehicle

| Trường | Nội dung |
|---|---|
| Use-case ID | UC04 |
| Use-case name | Pick Up Vehicle |
| Use-case overview | Nhận xe đã đặt và bắt đầu chuyến đi. |
| Actors | User; dock hoặc adapter giả lập. |
| Trigger | User gửi yêu cầu nhận xe với mã xe. |
| Preconditions | Phiếu thuộc User, còn hiệu lực, chưa được nhận; xe và Hub phù hợp. |
| Postconditions | Khi dock xác nhận mở khóa, phiếu được Fulfilled, một chuyến Active được tạo và ô nguồn được giải phóng; nếu chưa xác nhận, không báo nhận thành công. |
| Normal Flow | 1. User chọn phiếu và quét hoặc nhập mã xe. 2. Hệ thống kiểm tra quyền, mã và hiệu lực; giữ quyền xử lý nhận xe. 3. Gửi lệnh mở khóa và đợi xác nhận. 4. Ghi chuyến, phiếu và sức chứa nhất quán. 5. Hiển thị chuyến. |
| Alternative Flows | Nhập mã khi không quét được. Báo hư hại trước chuyến là luồng mục tiêu liên quan UC11; không bắt đầu chuyến không an toàn. |
| Exceptions | Sai mã, sai chủ hoặc phiếu hết hạn: từ chối. Không xác nhận mở khóa: giữ xe không khả dụng và chuyển đối soát. |
| Notes and Issues | Demo có nhận bằng mã/QR và adapter giả lập; luồng báo hư hại trước chuyến chưa được xác nhận đầy đủ trong demo. |

## UC05 — Return Vehicle

| Trường | Nội dung |
|---|---|
| Use-case ID | UC05 |
| Use-case name | Return Vehicle |
| Use-case overview | Trả xe dùng chung và hoàn tất chuyến. |
| Actors | User; dock hoặc adapter giả lập. |
| Trigger | User xác nhận xe đã đỗ và gửi yêu cầu trả. |
| Preconditions | User sở hữu chuyến Active và chọn Hub, ô trả xe. |
| Postconditions | Sau xác nhận dock, chuyến Completed và ô được chiếm dụng; xe được phân loại theo pin và sự cố. Không thu phí trong MVP. |
| Normal Flow | 1. User chọn Hub, ô và xác nhận đã đỗ. 2. Hệ thống kiểm tra chủ chuyến và giữ ô hợp lệ. 3. Dock xác nhận xe đến, khóa và dữ liệu pin. 4. Hệ thống đóng chuyến, ghi chiếm dụng và phân loại xe nguyên tử. 5. Hiển thị kết quả. |
| Alternative Flows | Hub/ô đầy: User chọn lựa chọn khác. Xe pin thấp được phân loại NeedsCharging. |
| Exceptions | Không giữ được sức chứa hoặc dữ liệu dock thiếu/mâu thuẫn: không đóng chuyến; giữ yêu cầu không chắc chắn để đối soát. |
| Notes and Issues | [AD03](../03_Activity_Diagram/drawio/AD03-Return_Vehicle.drawio) và [SQ03](../02_Sequence_Diagram/README.md#sq03--confirm-parking-and-return) thể hiện xác nhận của User trước lệnh dock; quãng đường có thể thiếu nếu adapter không cung cấp số đo. |

## UC06 — Manage Parking Reservation

Hợp đồng 11 trường của UC06 và UC06-S1/S2/S3 nằm trong [hợp đồng vòng đời](LIFECYCLE_SCENARIOS.md#uc06--manage-parking-reservation). UC06A là mã lịch sử của UC06-S2; UC06B là mã lịch sử của UC06-S3.

## UC07 — Request Charging

| Trường | Nội dung |
|---|---|
| Use-case ID | UC07 |
| Use-case name | Request Charging |
| Use-case overview | Đăng ký nhu cầu sạc để được xếp hàng hoặc xử lý theo lịch. |
| Actors | User. |
| Trigger | User gửi yêu cầu sạc cho xe đủ quyền sử dụng. |
| Preconditions | Tài khoản, xe và Hub hợp lệ; User có quyền gửi yêu cầu. |
| Postconditions | Yêu cầu hợp lệ được ghi và trả trạng thái; chỉ gửi yêu cầu không tạo phiên Active. |
| Normal Flow | 1. User chọn lượt đỗ, mục tiêu pin và có thể nhập thời gian cần. 2. Hệ thống kiểm tra quyền, xe, mục tiêu và thời gian. 3. Ghi yêu cầu vào hàng đợi. 4. Trả mã và trạng thái. UC12 kiểm tra cổng, công suất và phân bổ; chỉ xác nhận cấp điện mới tạo phiên Active. |
| Alternative Flows | Thiếu sức chứa hiện tại: giữ yêu cầu hợp lệ trong hàng đợi. User có thể hủy yêu cầu chưa kích hoạt; dừng phiên Active dùng UC07A. |
| Exceptions | Dữ liệu hoặc quyền không hợp lệ: từ chối. Đầu nối không tương thích bị từ chối khi phân bổ. Khi không xác nhận được thao tác thiết bị, giữ trạng thái an toàn và chuyển xử lý. |
| Notes and Issues | Yêu cầu, phân bổ, phiên sạc và chiếm dụng chỗ đỗ là các khái niệm riêng; xem UC07A và UC12. Đặc tả mục tiêu yêu cầu xem xét tương thích và công suất; demo kiểm tra chúng khi phân bổ, không phải khi ghi yêu cầu. |

## UC08 — Monitor Mobility Hub Network

| Trường | Nội dung |
|---|---|
| Use-case ID | UC08 |
| Use-case name | Monitor Mobility Hub Network |
| Use-case overview | Theo dõi sức chứa và tài nguyên trên toàn mạng Hub. |
| Actors | Operator; nguồn dữ liệu thiết bị hoặc giả lập. |
| Trigger | Operator mở hoặc làm mới tổng quan mạng lưới. |
| Preconditions | Operator được xác thực và có quyền giám sát. |
| Postconditions | Hiển thị snapshot và cảnh báo; thao tác xem không tự phân bổ tài nguyên. |
| Normal Flow | 1. Operator mở tổng quan. 2. Hệ thống lấy trạng thái Hub, xe, pin, ô đỗ và cổng sạc. 3. Tính cảnh báo theo BR10. 4. Hiển thị danh sách/tổng quan; Operator có thể xem Hub. |
| Alternative Flows | Làm mới hoặc chọn Hub để xem thêm. |
| Exceptions | Không tải được dữ liệu: báo lỗi và cho thử lại; dữ liệu cũ hoặc thiếu cần được phân biệt theo yêu cầu mục tiêu. |
| Notes and Issues | Demo tính trạng thái từ snapshot inventory; xem [đối chiếu demo](../../requirements/VERSION_2_CONTRACT_REVIEW.md) cho giới hạn freshness. |

## UC09 — Manage Mobility Resources

| Trường | Nội dung |
|---|---|
| Use-case ID | UC09 |
| Use-case name | Manage Mobility Resources |
| Use-case overview | Quản trị xe, ô đỗ và cổng sạc. |
| Actors | Operator. |
| Trigger | Operator chọn tạo hoặc thay đổi tài nguyên. |
| Preconditions | Operator có quyền; tài nguyên liên quan tồn tại nếu đang sửa. |
| Postconditions | Thay đổi hợp lệ được lưu; dữ liệu và các phân bổ hiện có được giữ nhất quán. |
| Normal Flow | 1. Chọn loại tài nguyên và thao tác. 2. Nhập dữ liệu. 3. Hệ thống kiểm tra định danh, trạng thái và ràng buộc phân bổ/an toàn. 4. Lưu thay đổi và cập nhật khả dụng. |
| Alternative Flows | Operator hủy chỉnh sửa; tạm ngừng hoặc kích hoạt lại tài nguyên khi đủ điều kiện. Xử lý lỗi thực tế qua UC11. |
| Exceptions | Định danh trùng, dữ liệu sai, đang có phân bổ xung đột hoặc chưa an toàn để kích hoạt: từ chối thay đổi. |
| Notes and Issues | Khả năng và trường cụ thể thay đổi theo loại tài nguyên; không suy ra mọi trường từ sơ đồ tổng quan. |

## UC10 — Redistribute Vehicles

| Trường | Nội dung |
|---|---|
| Use-case ID | UC10 |
| Use-case name | Redistribute Vehicles |
| Use-case overview | Lập lệnh điều chuyển xe dùng chung giữa các Hub. |
| Actors | Operator. |
| Trigger | Operator xác nhận tạo lệnh điều chuyển. |
| Preconditions | Operator hợp lệ; chọn Hub nguồn và đích khác nhau cùng xe và sức chứa đích phù hợp. |
| Postconditions | Lệnh Planned sở hữu các giữ xe và ô đích; chỉ sau xác nhận xuất phát mới InTransit. |
| Normal Flow | 1. Chọn nguồn, đích, xe và ô. 2. Kiểm tra điều kiện xe, pin và sức chứa. 3. Tạo lệnh Planned và giữ tài nguyên nguyên tử. 4. Operator xác nhận xuất phát; hệ thống kiểm tra lại rồi ghi InTransit. |
| Alternative Flows | Chọn Hub/ô đích khác nếu không đủ chỗ. UC10A xác nhận đến; UC10B hủy lệnh Planned. |
| Exceptions | Xe không đủ điều kiện, sức chứa cũ hoặc cạnh tranh: từ chối, không giữ dở dang. Không đánh dấu đến chỉ vì tạo lệnh. |
| Notes and Issues | Ngưỡng pin 80% là chính sách nhóm; giữ sức chứa đích không đồng nghĩa xe đã đến. |

## UC11 — Handle Operational Incident

| Trường | Nội dung |
|---|---|
| Use-case ID | UC11 |
| Use-case name | Handle Operational Incident |
| Use-case overview | Tiếp nhận, cách ly và theo dõi xử lý sự cố vận hành. |
| Actors | Operator; nguồn báo cáo người dùng hoặc thiết bị/giả lập. |
| Trigger | Operator mở báo cáo hoặc cảnh báo sự cố. |
| Preconditions | Có sự cố hoặc báo cáo tài nguyên cần xử lý; Operator có quyền. |
| Postconditions | Sự cố được theo dõi; tài nguyên lỗi tiếp tục cách ly tới khi xác minh đủ điều kiện phục hồi. |
| Normal Flow | 1. Xem báo cáo và đánh giá ảnh hưởng. 2. Ngăn phân bổ mới và thực hiện cách ly an toàn phù hợp. 3. Phân công bảo trì. 4. Theo dõi xử lý, xác minh và ghi kết quả trước khi phục hồi. |
| Alternative Flows | Giữ sự cố mở khi chưa giải quyết; UC11A báo sự cố giữa chuyến và không tự đóng chuyến. |
| Exceptions | Trạng thái hoặc xác nhận an toàn không chắc chắn: giữ cách ly và chuyển đối soát; không khóa vật lý xe đang di chuyển. |
| Notes and Issues | Báo cáo giữa chuyến trong service nhận mô tả và vị trí tùy chọn; Android hiện gửi mô tả. API `handle` phân công bảo trì, không tự xác minh cách ly vật lý; `confirmIsolation` cần verifier và chưa có route công khai. AD06 mô tả quy trình an toàn mục tiêu. |

## UC12 — Manage Charging Schedule

| Trường | Nội dung |
|---|---|
| Use-case ID | UC12 |
| Use-case name | Manage Charging Schedule |
| Use-case overview | Điều phối hàng đợi, cổng và công suất sạc tại Hub. |
| Actors | Operator; thiết bị hoặc adapter giả lập. |
| Trigger | Operator mở lịch hoặc yêu cầu phân bổ/điều chỉnh. |
| Preconditions | Hub và yêu cầu liên quan tồn tại; Operator có quyền thao tác. |
| Postconditions | Phân bổ tuân thủ tương thích và giới hạn công suất; phiên chỉ Active sau xác nhận cấp điện. |
| Normal Flow | 1. Xem hàng đợi và tài nguyên. 2. Xét pin, thời gian cần và thứ tự ưu tiên. 3. Phân bổ cổng tương thích, thời gian và công suất. 4. Xác nhận cấp điện và cập nhật yêu cầu/phiên. |
| Alternative Flows | Operator điều chỉnh ưu tiên hợp lệ. Khi cổng lỗi, cách ly qua UC11 và tái phân bổ khi an toàn, có tài nguyên phù hợp. |
| Exceptions | Không có tài nguyên: tiếp tục chờ. Điều chỉnh không an toàn hoặc dữ liệu cũ: từ chối; chưa xác nhận cấp điện không báo Active. |
| Notes and Issues | UC07 tạo yêu cầu; UC07A xử lý dừng an toàn. Ngắt điện và tháo kết nối là hai xác nhận riêng. Demo HTTP hỗ trợ phân bổ, nhưng chưa công bố route kích hoạt hoặc xác nhận tháo; các phương thức này hiện được kiểm thử ở cấp service. |

## UC13 — Run What-if Simulation

| Trường | Nội dung |
|---|---|
| Use-case ID | UC13 |
| Use-case name | Run What-if Simulation |
| Use-case overview | Chạy kịch bản giả định trên snapshot tách biệt. |
| Actors | Operator. |
| Trigger | Operator gửi cấu hình mô phỏng. |
| Preconditions | Operator có quyền; có thể đọc snapshot và cấu hình một kịch bản hợp lệ. |
| Postconditions | Lần chạy thành công có kết quả lưu được; tài nguyên vận hành thực không bị mô phỏng sửa. |
| Normal Flow | 1. Chọn kịch bản, Hub và tham số. 2. Hệ thống kiểm tra dữ liệu và chụp snapshot. 3. Chạy mô phỏng, lưu kết quả và khuyến nghị. 4. Chuyển tới UC14 để xem. |
| Alternative Flows | Hủy trước khi gửi; sửa tham số và chạy lại. |
| Exceptions | Cấu hình không hợp lệ, không lấy được snapshot hoặc chạy lỗi: báo lỗi; không trình bày kết quả thành công. |
| Notes and Issues | Năm tình huống là ví dụ trong đề bài; mô phỏng không tự thực thi khuyến nghị. |

## UC14 — View Simulation Results

| Trường | Nội dung |
|---|---|
| Use-case ID | UC14 |
| Use-case name | View Simulation Results |
| Use-case overview | Xem lại chỉ số, giả định và khuyến nghị của một lần chạy. |
| Actors | Operator. |
| Trigger | UC13 chuyển tới kết quả hoặc Operator mở kết quả đã lưu. |
| Preconditions | Operator có quyền và kết quả hoàn tất tồn tại. |
| Postconditions | Kết quả được hiển thị; việc xem hoặc xuất không làm thay đổi tài nguyên thực. |
| Normal Flow | 1. Chọn kết quả. 2. Hệ thống truy xuất dữ liệu đã lưu. 3. Hiển thị chỉ số cơ sở/kịch bản, giả định và khuyến nghị. |
| Alternative Flows | Xuất JSON trong giao diện hiện tại; với khuyến nghị điều chuyển, mở phương án UC10 và chọn tài nguyên thực trước khi xác nhận. |
| Exceptions | Không tìm thấy kết quả: báo lỗi. UC10 từ chối lựa chọn đã cũ hoặc không đủ điều kiện. |
| Notes and Issues | Lọc theo Hub/thời gian, so sánh nhiều lượt chạy và CSV/PDF là tùy chọn chưa có trong demo. Các khuyến nghị khác được hiển thị để Operator xem xét. |
