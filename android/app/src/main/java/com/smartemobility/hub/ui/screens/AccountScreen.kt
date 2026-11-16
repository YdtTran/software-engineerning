package com.smartemobility.hub.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.outlined.History
import androidx.compose.material.icons.outlined.PersonOutline
import androidx.compose.material.icons.outlined.Settings
import androidx.compose.material.icons.outlined.SupportAgent
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.smartemobility.hub.ui.HubUiState
import com.smartemobility.hub.ui.components.AccountSkylineHeader
import com.smartemobility.hub.ui.components.FeedbackBanner
import com.smartemobility.hub.ui.components.TintedSurfaceCard
import com.smartemobility.hub.ui.theme.HubColors

@Composable
fun AccountScreen(
    state: HubUiState,
    onOpenLogin: () -> Unit,
    onLogout: () -> Unit,
    onOpenProfile: () -> Unit,
    onOpenHistory: () -> Unit,
    onOpenSettings: () -> Unit,
    onOpenSupport: () -> Unit,
    modifier: Modifier = Modifier
) {
    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .background(HubColors.CanvasBackground),
        contentPadding = PaddingValues(bottom = 28.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        item {
            AccountSkylineHeader(title = "Tài khoản")
        }

        if (!state.errorMessage.isNullOrBlank()) {
            item {
                FeedbackBanner(
                    message = state.errorMessage,
                    isError = true,
                    modifier = Modifier.padding(horizontal = 20.dp, vertical = 8.dp)
                )
            }
        } else if (!state.successMessage.isNullOrBlank()) {
            item {
                FeedbackBanner(
                    message = state.successMessage,
                    isError = false,
                    modifier = Modifier.padding(horizontal = 20.dp, vertical = 8.dp)
                )
            }
        }

        // Primary "Đăng nhập" pill button or active user badge (Image 1 layout)
        item {
            Spacer(modifier = Modifier.height(14.dp))
            if (state.user == null) {
                Button(
                    onClick = onOpenLogin,
                    shape = RoundedCornerShape(50),
                    colors = ButtonDefaults.buttonColors(containerColor = HubColors.RoyalBlue),
                    modifier = Modifier
                        .defaultMinSize(minWidth = 200.dp, minHeight = 46.dp)
                ) {
                    Text(
                        text = "Đăng nhập",
                        fontSize = 15.sp,
                        fontWeight = FontWeight.SemiBold
                    )
                }
            } else {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(
                        text = state.user.id,
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold,
                        color = HubColors.TextPrimary
                    )
                    Text(
                        text = "Vai trò: ${state.user.roles.joinToString(", ")}",
                        fontSize = 13.sp,
                        color = HubColors.TextSecondary
                    )
                    Spacer(modifier = Modifier.height(10.dp))
                    OutlinedButton(
                        onClick = onLogout,
                        enabled = !state.isBusy,
                        shape = RoundedCornerShape(50)
                    ) {
                        Text("Đăng xuất")
                    }
                }
            }
            Spacer(modifier = Modifier.height(22.dp))
        }

        // Grouped 4-row card matching Image 1
        item {
            TintedSurfaceCard(
                modifier = Modifier.padding(horizontal = 22.dp),
                cornerRadius = 22.dp
            ) {
                AccountMenuRow(
                    icon = Icons.Outlined.PersonOutline,
                    label = "Thông tin cá nhân",
                    onClick = onOpenProfile
                )
                HorizontalDivider(color = HubColors.DividerSubtle, thickness = 0.8.dp)
                AccountMenuRow(
                    icon = Icons.Outlined.History,
                    label = "Lịch sử sử dụng",
                    onClick = onOpenHistory
                )
                HorizontalDivider(color = HubColors.DividerSubtle, thickness = 0.8.dp)
                AccountMenuRow(
                    icon = Icons.Outlined.Settings,
                    label = "Cài đặt",
                    onClick = onOpenSettings
                )
                HorizontalDivider(color = HubColors.DividerSubtle, thickness = 0.8.dp)
                AccountMenuRow(
                    icon = Icons.Outlined.SupportAgent,
                    label = "Hỗ trợ",
                    onClick = onOpenSupport
                )
            }
        }

        item {
            Spacer(modifier = Modifier.height(18.dp))
            Text(
                text = "Kết nối máy chủ: ${state.serverUrl}",
                fontSize = 12.sp,
                color = HubColors.TextMuted,
                textAlign = TextAlign.Center,
                modifier = Modifier.padding(horizontal = 24.dp)
            )
        }
    }
}

@Composable
private fun AccountMenuRow(
    icon: ImageVector,
    label: String,
    onClick: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(horizontal = 18.dp, vertical = 18.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = HubColors.TextPrimary,
                modifier = Modifier.size(22.dp)
            )
            Spacer(modifier = Modifier.width(16.dp))
            Text(
                text = label,
                fontSize = 15.sp,
                fontWeight = FontWeight.Medium,
                color = HubColors.TextPrimary
            )
        }
        Icon(
            imageVector = Icons.AutoMirrored.Filled.KeyboardArrowRight,
            contentDescription = null,
            tint = HubColors.TextSecondary,
            modifier = Modifier.size(20.dp)
        )
    }
}
