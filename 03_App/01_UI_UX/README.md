# Smart E-Mobility Hub — UI/UX mẫu

Thiết kế dựa trên [đề bài tham khảo](../../refs/pdfs/BTL_SoftwareEngineering_HK261.pdf), [sơ đồ use case gốc](../../refs/uc_uml/USE_CASE/) và [năm ảnh giao diện tham khảo](../00_Ref/).

## Mở và sử dụng

Mở **index.html** bằng Edge/Chrome, không cần cài thư viện hay khởi chạy server. Thanh công cụ chỉ dành cho xem thiết kế: App người dùng / App operator / Web operator. Đây không phải nút đổi quyền trong sản phẩm. Có thể đi qua các luồng bằng nút và liên kết trong giao diện. Tải lại trang sẽ xóa trạng thái demo.

- **UI-UX.pdf**: bộ ảnh màn hình để xem hoặc chèn vào báo cáo.
- **design-board.png**: tổng quan ba màn hình sinh viên.
- **screens/**: 26 ảnh PNG giao diện; màn hình sinh viên có vùng nội dung cuộn trong prototype.
- **verification.json**: kết quả kiểm tra tự động.


## Hai luồng và ba giao diện

| Nhóm tài khoản | Mobile app | Web/PC | Quyền |
|---|---|---|---|
| Người dùng: học sinh, sinh viên, người dùng phổ thông | Có | Không cung cấp web đặt xe | Tìm Hub, xem xe, đặt/nhận/trả xe, đặt chỗ đỗ, yêu cầu sạc, thông báo và tài khoản cá nhân |
| Operator | Có, app nội bộ | Có, web dashboard | Giám sát mạng lưới, quản lý tài nguyên, điều phối xe, xử lý sự cố, lịch sạc, What-if và kết quả |

Điểm vào riêng để trình diễn, không có nút đổi vai trò trong giao diện sản phẩm:

- **user-app.html**: bản mẫu app người dùng; chỉ mở các màn hình người dùng.
- **operator-app.html**: bản mẫu app operator; điều hướng dưới, mục Chức năng, bảng chuyển thành thẻ, cuộn dọc để thao tác tại hiện trường.
- **operator-web.html**: web điều hành; menu trái, KPI, bản đồ và bảng nhiều cột để phân tích trên PC.
- **index.html**: công cụ xem toàn bộ mockup cho nhóm thiết kế; chuyển bản thiết kế ở đây không phải tính năng cấp quyền.

Các file app HTML là bản mô phỏng UI ứng dụng mobile để duyệt thiết kế, chưa phải ứng dụng Android/iOS cài đặt được. Mở trên PC chỉ là xem khung điện thoại trong công cụ thiết kế; không bổ sung sản phẩm web cho người dùng.

Luồng người dùng: mở app → phiên đăng nhập người dùng (giả định) → tìm Hub → chọn xe → giữ xe → nhận xe tại Hub → hành trình → trả xe. Đặt chỗ đỗ và yêu cầu sạc là hai nhánh cho xe cá nhân.

Luồng operator: đăng nhập tài khoản vận hành (giả định) trên app nội bộ hoặc web → tổng quan → chọn nghiệp vụ vận hành → kiểm tra thông tin → xác nhận thay đổi → theo dõi trạng thái. Hai nền tảng cùng phạm vi quyền UC08–UC14. Mobile có thêm màn hình `#op-menu` để truy cập toàn bộ chức năng.

Phân tách route hiện tại chỉ phục vụ mockup. Khi triển khai, server phải xác thực và kiểm tra quyền theo tài khoản cho mọi API; không tin role, query string, kích thước màn hình hoặc việc ẩn nút. Chính sách không cung cấp web cho người dùng là quyết định phạm vi sản phẩm, không phải biện pháp phân quyền server. App mobile không tự bảo đảm ổn định: cần xử lý mất mạng, tránh gửi lặp, khôi phục trạng thái và đồng bộ đặt chỗ. Không xác nhận đặt xe thành công khi server chưa chấp nhận.

## Định hướng thiết kế

Giữ phong cách REF: tiêu đề navy, điểm nhấn cyan, nền xám nhạt, thẻ trắng bo góc, biểu tượng nét và điều hướng dưới cho người dùng. Thay các chức năng buýt/tin tức của ảnh tham khảo bằng nghiệp vụ phương tiện điện. Người dùng phổ thông chỉ sử dụng mobile app; đơn vị vận hành sử dụng cả app mobile và dashboard web để nhìn đồng thời tài nguyên, sức chứa và cảnh báo. Tất cả màn hình dùng tiếng Việt.

Màu chính: navy `#152584`, cyan `#00B8D6`, nền `#F2F5F9`. Trạng thái được thể hiện bằng chữ và màu. Có nhãn nhập liệu, trạng thái focus, nút vô hiệu hóa cho tài nguyên không sẵn sàng, hộp xác nhận cho thao tác thay đổi trạng thái.

## Màn hình và use case

| Use case | Màn hình / liên kết | Nội dung |
|---|---|---|
| Tổng quan | `#home` | Lối tắt, tìm kiếm, Hub gần bạn |
| UC01 | `#map` | Tìm tên Hub, lọc xe/chỗ đỗ/cổng sạc, chọn Hub |
| UC02 | `#vehicles` | Loại xe, mức pin, xe đang sạc |
| UC03 | `#reserve`, `#ticket` | Xác nhận, phiếu giữ xe, hủy giữ xe |
| UC04 | `#pickup` | Mã xe; từ chối nhận nếu chưa đặt hoặc nhập sai mã |
| UC05 | `#trip` | Chọn Hub trả; xác nhận đã đỗ và khóa xe |
| UC06 | `#parking` | Hub, giờ đến, ô đỗ trống/đã dùng/đang chọn |
| UC07 | `#charging` | Xe cá nhân, Hub sạc, pin, thời điểm cần xe |
| Bổ trợ | `#notifications`, `#account` | Thông báo mẫu, truy cập hành trình và đặt chỗ |
| UC08 | `#overview` | KPI, sơ đồ Hub, sức chứa, cảnh báo |
| UC09 | `#resources` | Trạng thái xe, chuyển bảo trì / hoàn tất bảo trì |
| UC10 | `#redistribute` | Lập lệnh; kiểm tra Hub khác nhau, số xe, chỗ đỗ đích |
| UC11 | `#incidents` | Chi tiết sự cố, cô lập cổng, tiếp nhận xử lý |
| UC12 | `#schedule` | Phương án ưu tiên sạc và xác nhận |
| UC13 | `#simulation` | Chọn ba kịch bản, mức tác động, thời lượng |
| UC14 | `#results` | So sánh chỉ số, khuyến nghị, xác nhận demo, xuất JSON |

## Luồng trình diễn gợi ý

1. Người dùng: Trang chủ → Đặt xe → Chọn EB-024 → Xác nhận → Nhận xe → nhập `EB-024` → xác nhận nhận → chọn Hub trả → đánh dấu đã đỗ/khóa → xác nhận trả.
2. Xe cá nhân: Trang chủ → Chỗ đỗ → chọn ô trống → xác nhận. Sau đó mở Sạc xe → nhập nhu cầu → gửi yêu cầu.
3. Vận hành (web hoặc app): Tổng quan → Điều phối xe → kiểm tra phương án → tạo lệnh. Mở Sự cố vận hành hoặc Lịch sạc để xác nhận phương án mẫu.
4. What-if: Mô phỏng → chọn kịch bản và tham số → chạy → xem kết quả → xác nhận demo hoặc xuất dữ liệu kịch bản JSON.

## Phạm vi bản mẫu

Đây là mockup có tương tác, chưa phải MVP nghiệp vụ. Tài khoản được giả định đã đăng nhập. Số liệu, thông báo, mã phiếu và thời gian được dựng để minh họa. Sơ đồ Hub không phải bản đồ địa lý chính xác; QR chỉ là khung minh họa và luồng nhận dùng nhập mã. Không có timer giữ xe thật, backend, lưu trữ, IoT, xác thực, thanh toán hoặc thuật toán tối ưu. Các phiên app/web độc lập, chưa đồng bộ tài khoản hoặc dữ liệu; các màn hình vận hành có bộ dữ liệu mẫu riêng; số liệu không đồng bộ với mọi thay đổi ở luồng sinh viên. Công thức What-if chỉ tạo phản hồi trực quan theo tham số, không có giá trị dự báo. Nút áp dụng chỉ ghi nhận trạng thái demo; xuất báo cáo tạo JSON của kịch bản.

Khi làm sản phẩm thật cần triển khai giao dịch giữ tài nguyên, kiểm tra cạnh tranh đồng thời, hạn giữ chỗ, sự kiện nhận/trả, lịch sạc, quyền truy cập và thuật toán mô phỏng.

Ảnh `op-mobile-*.png` là bản app operator; ảnh tên use case không có tiền tố là user app hoặc web operator theo bảng ở trên. **operator-app-board.png** tổng hợp app vận hành. **UI-UX.pdf** mới gồm 14 trang, bao gồm cả ba giao diện.

## Kiểm tra và tái xuất

`node verify.cjs` kiểm tra luồng đặt/nhận/trả, mã xe sai, cổng sạc hết chỗ, giới hạn điều phối, tham số mô phỏng, lỗi JavaScript và tràn ngang ở các kích thước mẫu. Script dùng Playwright từ runtime Codex trên máy hiện tại và Edge; đường dẫn cần điều chỉnh nếu chạy máy khác. `node export.cjs` tái tạo board và PDF từ các ảnh đã xuất, dùng Playwright cùng runtime.

## Gợi ý khai báo sử dụng AI

Theo yêu cầu minh bạch trong đề bài: “Sử dụng OpenAI Codex để đọc tài liệu, đề xuất bố cục, tạo prototype HTML/CSS/JavaScript, xuất ảnh/PDF và kiểm tra các luồng giao diện minh họa. Nhóm tự rà soát, điều chỉnh thiết kế, xác minh tính phù hợp với use case và chịu trách nhiệm về nội dung báo cáo.” Chỉnh câu này cho đúng mức đóng góp thực tế của nhóm.
