package com.smartemobility.hub.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.outlined.NotificationsNone
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.smartemobility.hub.data.model.PendingCommandEntry
import com.smartemobility.hub.ui.HubUiState
import com.smartemobility.hub.ui.SubScreen
import com.smartemobility.hub.ui.components.FeedbackBanner
import com.smartemobility.hub.ui.components.HubDateTime
import com.smartemobility.hub.ui.components.StatusBadge
import com.smartemobility.hub.ui.components.StatusLabels
import com.smartemobility.hub.ui.components.TintedSurfaceCard
import com.smartemobility.hub.ui.components.TitleSkylineHeader
import com.smartemobility.hub.ui.theme.HubColors

private data class NotificationItem(
    val id: String,
    val title: String,
    val detail: String,
    val badge: String,
    val targetScreen: SubScreen
)

@Composable
fun NotificationsScreen(
    state: HubUiState,
    onRefresh: () -> Unit,
    onOpenSubScreen: (SubScreen) -> Unit,
    onRetryPending: (PendingCommandEntry) -> Unit,
    onDiscardPending: (String) -> Unit,
    onOpenLogin: () -> Unit,
    modifier: Modifier = Modifier
) {
    val items = buildNotifications(state)

    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .background(HubColors.CanvasBackground),
        contentPadding = PaddingValues(bottom = 24.dp)
    ) {
        item {
            TitleSkylineHeader(title = "Thông báo")
        }

        if (!state.errorMessage.isNullOrBlank()) {
            item {
                FeedbackBanner(
                    message = state.errorMessage,
                    isError = true,
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
                )
            }
        } else if (!state.successMessage.isNullOrBlank()) {
            item {
                FeedbackBanner(
                    message = state.successMessage,
                    isError = false,
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
                )
            }
        }

        if (state.user == null) {
            item {
                TintedSurfaceCard(modifier = Modifier.padding(16.dp)) {
                    Column(
                        modifier = Modifier.padding(18.dp),
                        horizontalAlignment = Alignment.Start
                    ) {
                        Icon(
                            imageVector = Icons.Outlined.NotificationsNone,
                            contentDescription = null,
                            tint = HubColors.RoyalBlue,
                            modifier = Modifier.size(30.dp)
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = "Đăng nhập để nhận thông báo",
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Bold
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = "Các nhắc nhở về hạn giữ xe 15 phút, phiếu đặt chỗ đỗ và trạng thái sạc xe sẽ hiển thị tại đây.",
                            fontSize = 13.sp,
                            color = HubColors.TextSecondary
                        )
                        Spacer(modifier = Modifier.height(12.dp))
                        Button(
                            onClick = onOpenLogin,
                            shape = RoundedCornerShape(50),
                            colors = ButtonDefaults.buttonColors(containerColor = HubColors.RoyalBlue)
                        ) {
                            Text("Đăng nhập")
                        }
                    }
                }
            }
        } else {
            item {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 12.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Cập nhật trạng thái dịch vụ",
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Bold,
                        color = HubColors.TextPrimary
                    )
                    OutlinedButton(onClick = onRefresh, enabled = !state.isBusy) {
                        Icon(Icons.Filled.Refresh, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("Tải lại")
                    }
                }
            }

            if (state.pendingCommands.isNotEmpty()) {
                items(state.pendingCommands, key = { it.operationKey }) { pending ->
                    TintedSurfaceCard(
                        modifier = Modifier.padding(horizontal = 16.dp, vertical = 6.dp)
                    ) {
                        Column(modifier = Modifier.padding(14.dp)) {
                            Text(
                                text = "Yêu cầu chưa rõ kết quả (${pending.operationKey})",
                                fontWeight = FontWeight.Bold,
                                fontSize = 14.sp,
                                color = HubColors.WarningFg
                            )
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                text = "Có thể thử lại an toàn bằng khóa Idempotency-Key cũ để tránh trùng giao dịch.",
                                fontSize = 12.sp,
                                color = HubColors.TextSecondary
                            )
                            Spacer(modifier = Modifier.height(10.dp))
                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                Button(
                                    onClick = { onRetryPending(pending) },
                                    enabled = !state.isBusy,
                                    colors = ButtonDefaults.buttonColors(containerColor = HubColors.RoyalBlue)
                                ) {
                                    Text("Thử lại an toàn", fontSize = 12.sp)
                                }
                                OutlinedButton(
                                    onClick = { onDiscardPending(pending.operationKey) },
                                    enabled = !state.isBusy
                                ) {
                                    Text("Bỏ qua", fontSize = 12.sp)
                                }
                            }
                        }
                    }
                }
            }

            if (items.isEmpty() && state.pendingCommands.isEmpty()) {
                item {
                    TintedSurfaceCard(modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Text("Hiện chưa có thông báo mới", fontWeight = FontWeight.SemiBold)
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                "Khi bạn giữ xe, đặt chỗ đỗ hoặc gửi yêu cầu sạc, hệ thống sẽ tự động nhắc hạn xử lý tại đây.",
                                fontSize = 13.sp,
                                color = HubColors.TextSecondary
                            )
                        }
                    }
                }
            } else {
                items(items, key = { it.id }) { item ->
                    TintedSurfaceCard(
                        onClick = { onOpenSubScreen(item.targetScreen) },
                        modifier = Modifier.padding(horizontal = 16.dp, vertical = 6.dp)
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(14.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(item.title, fontWeight = FontWeight.Bold, fontSize = 15.sp)
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(item.detail, fontSize = 13.sp, color = HubColors.TextSecondary)
                            }
                            Spacer(modifier = Modifier.width(8.dp))
                            StatusBadge(
                                text = item.badge,
                                bgColor = HubColors.InfoBg,
                                fgColor = HubColors.InfoFg
                            )
                        }
                    }
                }
            }
        }
    }
}

private fun buildNotifications(state: HubUiState): List<NotificationItem> {
    val list = mutableListOf<NotificationItem>()
    for (res in state.vehicleReservations.filter { it.isActivePending }) {
        list.add(
            NotificationItem(
                id = "vres_${res.id}",
                title = "Phiếu giữ xe ${res.vehicleId}",
                detail = "Mã ${res.ticketCode} · Hạn nhận ${HubDateTime.format(res.expiresAt)}",
                badge = StatusLabels.rentalStatus(res.status),
                targetScreen = SubScreen.RENTAL
            )
        )
    }
    for (trip in state.trips.filter { it.status == "Active" }) {
        val returnMsg = if (trip.pendingReturn != null) {
            "Đang đối soát trả xe tại Hub ${trip.pendingReturn.hubId}"
        } else {
            "Bắt đầu lúc ${HubDateTime.format(trip.startTime)}"
        }
        list.add(
            NotificationItem(
                id = "trip_${trip.id}",
                title = "Chuyến đi ${trip.vehicleId} đang hoạt động",
                detail = returnMsg,
                badge = StatusLabels.rentalStatus(trip.status),
                targetScreen = SubScreen.RENTAL
            )
        )
    }
    for (pRes in state.parkingReservations.filter { it.status == "Reserved" }) {
        list.add(
            NotificationItem(
                id = "pres_${pRes.id}",
                title = "Phiếu đỗ xe ô ${pRes.slotId}",
                detail = "Mã vé ${pRes.ticketCode} · Hạn đến ${HubDateTime.format(pRes.expiresAt)}",
                badge = StatusLabels.parkingStatus(pRes.status),
                targetScreen = SubScreen.PARKING
            )
        )
    }
    for (occ in state.parkingOccupancies.filter { it.isActive }) {
        list.add(
            NotificationItem(
                id = "occ_${occ.id}",
                title = "Đang đỗ xe tại ô ${occ.slotId}",
                detail = "Check-in lúc ${HubDateTime.format(occ.actualCheckInAt)}",
                badge = "Đang đỗ",
                targetScreen = SubScreen.PARKING
            )
        )
    }
    for (creq in state.chargingRequests.filter { it.status in setOf("Queued", "Charging") }) {
        list.add(
            NotificationItem(
                id = "creq_${creq.id}",
                title = "Yêu cầu sạc xe ${creq.vehicleId}",
                detail = "Mục tiêu ${creq.targetBatteryPercent}% · Cần trước ${HubDateTime.format(creq.neededBy)}",
                badge = StatusLabels.chargingStatus(creq.status),
                targetScreen = SubScreen.CHARGING
            )
        )
    }
    return list
}
