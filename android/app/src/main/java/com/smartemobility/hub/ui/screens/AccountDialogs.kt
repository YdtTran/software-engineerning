package com.smartemobility.hub.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.FilterChip
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.smartemobility.hub.ui.HubUiState
import com.smartemobility.hub.ui.theme.HubColors

@Composable
fun LoginDialog(
    state: HubUiState,
    onDismiss: () -> Unit,
    onLogin: (username: String, password: String) -> Unit,
    onOpenSettings: () -> Unit
) {
    var username by remember { mutableStateOf("user") }
    var password by remember { mutableStateOf("") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Đăng nhập Smart E-Mobility") },
        text = {
            Column {
                Text(
                    text = "Máy chủ: ${state.serverUrl}",
                    fontSize = 12.sp,
                    color = HubColors.TextSecondary
                )
                TextButton(onClick = {
                    onDismiss()
                    onOpenSettings()
                }) {
                    Text("Đổi địa chỉ máy chủ")
                }
                OutlinedTextField(
                    value = username,
                    onValueChange = { username = it },
                    label = { Text("Tên đăng nhập") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
                Spacer(modifier = Modifier.height(8.dp))
                OutlinedTextField(
                    value = password,
                    onValueChange = { password = it },
                    label = { Text("Mật khẩu") },
                    singleLine = true,
                    visualTransformation = PasswordVisualTransformation(),
                    modifier = Modifier.fillMaxWidth()
                )
                if (!state.errorMessage.isNullOrBlank()) {
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = state.errorMessage,
                        color = HubColors.ErrorFg,
                        fontSize = 12.sp
                    )
                }
            }
        },
        confirmButton = {
            Button(
                onClick = { onLogin(username, password) },
                enabled = !state.isBusy && username.isNotBlank() && password.isNotBlank(),
                colors = ButtonDefaults.buttonColors(containerColor = HubColors.RoyalBlue)
            ) {
                Text("Đăng nhập")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("Đóng") }
        }
    )
}

@Composable
fun ServerSettingsDialog(
    currentUrl: String,
    onDismiss: () -> Unit,
    onSaveUrl: (String) -> Unit
) {
    var urlInput by remember(currentUrl) { mutableStateOf(currentUrl) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Cấu hình máy chủ Backend") },
        text = {
            Column {
                Text(
                    text = "Dùng 10.0.2.2:3000 khi chạy Android Emulator, hoặc nhập IP LAN của PC (vd: http://192.168.1.10:3000) khi chạy trên điện thoại thật.",
                    fontSize = 12.sp,
                    color = HubColors.TextSecondary
                )
                Spacer(modifier = Modifier.height(8.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    FilterChip(
                        selected = urlInput == "http://10.0.2.2:3000",
                        onClick = { urlInput = "http://10.0.2.2:3000" },
                        label = { Text("Emulator") }
                    )
                    FilterChip(
                        selected = urlInput == "http://127.0.0.1:3000",
                        onClick = { urlInput = "http://127.0.0.1:3000" },
                        label = { Text("ADB Reverse") }
                    )
                }
                Spacer(modifier = Modifier.height(8.dp))
                OutlinedTextField(
                    value = urlInput,
                    onValueChange = { urlInput = it },
                    label = { Text("URL máy chủ") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
            }
        },
        confirmButton = {
            Button(
                onClick = { onSaveUrl(urlInput) },
                enabled = urlInput.isNotBlank(),
                colors = ButtonDefaults.buttonColors(containerColor = HubColors.RoyalBlue)
            ) {
                Text("Lưu & Kết nối lại")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("Hủy") }
        }
    )
}

@Composable
fun ProfileDialog(
    state: HubUiState,
    onDismiss: () -> Unit
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Thông tin cá nhân") },
        text = {
            Column {
                if (state.user == null) {
                    Text("Bạn chưa đăng nhập tài khoản.")
                } else {
                    Text("ID tài khoản: ${state.user.id}", fontWeight = FontWeight.SemiBold)
                    Text("Vai trò: ${state.user.roles.joinToString(", ")}")
                    Spacer(modifier = Modifier.height(8.dp))
                    Text("Xe cá nhân đã gắn:", fontWeight = FontWeight.SemiBold)
                    if (state.privateVehicles.isEmpty()) {
                        Text("Chưa có xe cá nhân thuộc tài khoản này.", fontSize = 13.sp, color = HubColors.TextSecondary)
                    } else {
                        state.privateVehicles.forEach { pv ->
                            Text("• ${pv.id} (${pv.displayType}, pin ${pv.batteryPercent}%)", fontSize = 13.sp)
                        }
                    }
                }
            }
        },
        confirmButton = {
            TextButton(onClick = onDismiss) { Text("Đóng") }
        }
    )
}

@Composable
fun SupportDialog(
    onDismiss: () -> Unit
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Hỗ trợ & Báo sự cố") },
        text = {
            Text(
                "• Thuê xe: Mở Thuê & Trả xe → Chọn Hub → Giữ xe (15 phút) → Quét mã QR trên xe để nhận.\n" +
                    "• Báo sự cố giữa chuyến: Trong màn hình Phiếu & Chuyến, chọn nút 'Báo sự cố' ở chuyến đang chạy.\n" +
                    "• Đỗ & Sạc xe cá nhân: Đặt chỗ đỗ → Check-in → Gửi yêu cầu sạc → Dừng sạc an toàn trước khi Check-out.",
                fontSize = 13.sp
            )
        },
        confirmButton = {
            TextButton(onClick = onDismiss) { Text("Đã hiểu") }
        }
    )
}
