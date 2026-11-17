package com.smartemobility.hub.data.model

object ApiErrorMapper {
    private val messagesByCode = mapOf(
        "UNAUTHENTICATED" to "Phiên đã kết thúc. Vui lòng đăng nhập lại.",
        "FORBIDDEN_OPERATION" to "Tài khoản không có quyền thực hiện thao tác này.",
        "VEHICLE_CODE_MISMATCH" to "Mã xe không khớp phiếu. Hãy kiểm tra mã trên xe.",
        "RESERVATION_EXPIRED" to "Phiếu đã hết hạn. Vui lòng tạo yêu cầu mới.",
        "VEHICLE_NOT_AVAILABLE" to "Xe vừa được giữ hoặc không còn khả dụng. Danh sách đã được cập nhật.",
        "VEHICLE_NOT_ELIGIBLE" to "Xe chưa đủ điều kiện thực hiện thao tác này (cần xe cá nhân thuộc tài khoản đang đăng nhập).",
        "SLOT_UNAVAILABLE" to "Chỗ đỗ/trả vừa thay đổi hoặc đã có cam kết khác. Hãy chọn lại chỗ.",
        "SLOT_OCCUPIED" to "Chỗ đỗ hiện vẫn đang có xe chiếm dụng (LIM-01). Hãy xem slot/Hub thay thế hoặc liên hệ điều hành.",
        "CHARGING_ACTIVE" to "Xe đang sạc hoặc chưa rút đầu nối an toàn. Hãy dừng sạc trước khi check-out.",
        "CHARGING_REQUEST_QUEUED" to "Đang có yêu cầu sạc chờ cho lượt đỗ này. Xác nhận hủy yêu cầu sạc để tiếp tục check-out.",
        "INVALID_BATTERY_TARGET" to "Mức pin mục tiêu phải lớn hơn pin hiện tại và tối đa 100%.",
        "INVALID_INTERVAL" to "Khung thời gian dự kiến đến/rời Hub hoặc hạn cần xe chưa hợp lệ.",
        "POOL_MISMATCH" to "Ô đỗ không thuộc đúng nhóm (đỗ ngay / đặt trước) đã chọn.",
        "CANCELLATION_WINDOW_CLOSED" to "Đã quá thời hạn hủy đặt chỗ trước giờ dự kiến đến.",
        "EARLY_CHECKIN" to "Chưa tới khung giờ được phép check-in cho đặt chỗ trước.",
        "DEVICE_UNCONFIRMED" to "Chưa xác nhận được từ thiết bị IoT/cổng. Yêu cầu được giữ lại để thử lại an toàn.",
        "COMMAND_IN_PROGRESS" to "Yêu cầu cũ đang được xử lý. Hãy tải lại trạng thái rồi thử lại.",
        "RETURN_PENDING" to "Chuyến đang có một yêu cầu trả xe cần đối soát.",
        "IDEMPOTENCY_KEY_REUSED" to "Dữ liệu yêu cầu đã thay đổi so với lần gửi trước. Hãy tải lại trạng thái.",
        "RESERVATION_CONFLICT" to "Trạng thái phiếu/yêu cầu đã thay đổi hoặc đã có yêu cầu đang mở.",
        "CONFLICT_STATE" to "Trạng thái tài nguyên đã thay đổi, không thể thực hiện thao tác.",
        "HUB_NOT_FOUND" to "Không tìm thấy Hub đã chọn.",
        "VEHICLE_NOT_FOUND" to "Không tìm thấy phương tiện trong hệ thống.",
        "INTERNAL_ERROR" to "Máy chủ chưa thể hoàn tất yêu cầu. Vui lòng thử lại."
    )

    fun toVietnameseMessage(code: String?, fallback: String?): String {
        if (!code.isNullOrBlank()) {
            messagesByCode[code]?.let { return it }
        }
        return fallback?.takeIf { it.isNotBlank() } ?: "Không thể thực hiện yêu cầu."
    }
}
