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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.FilterChip
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Slider
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.smartemobility.hub.ui.HubUiState
import com.smartemobility.hub.ui.components.FeedbackBanner
import com.smartemobility.hub.ui.components.HubDateTime
import com.smartemobility.hub.ui.components.StatusBadge
import com.smartemobility.hub.ui.components.StatusLabels
import com.smartemobility.hub.ui.components.TintedSurfaceCard
import com.smartemobility.hub.ui.components.TitleSkylineHeader
import com.smartemobility.hub.ui.theme.HubColors
import java.time.Instant
import java.time.temporal.ChronoUnit
import kotlin.math.roundToInt

@Composable
fun ChargingScreen(
    state: HubUiState,
    onBack: () -> Unit,
    onRefresh: () -> Unit,
    onOpenParking: () -> Unit,
    onSubmitCharging: (occupancyId: String, targetBatteryPercent: Int, neededByIso: String?) -> Unit,
    onCancelRequest: (String) -> Unit,
    onStopSession: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    val activeOccupancies = state.parkingOccupancies.filter { it.isActive }
    var selectedOccId by remember(activeOccupancies) {
        mutableStateOf(activeOccupancies.firstOrNull()?.id.orEmpty())
    }
    var targetSlider by remember { mutableFloatStateOf(85f) }
    var neededHoursAhead by remember { mutableIntStateOf(2) }

    val hubName: (String) -> String = { id -> state.hubs.firstOrNull { it.id == id }?.name ?: id }

    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .background(HubColors.CanvasBackground),
        contentPadding = PaddingValues(bottom = 28.dp)
    ) {
        item {
            TitleSkylineHeader(title = "Sạc xe điện", onBack = onBack, onRefresh = onRefresh)
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

        item {
            TintedSurfaceCard(modifier = Modifier.padding(horizontal = 16.dp, vertical = 10.dp)) {
                Column(modifier = Modifier.padding(14.dp)) {
                    Text("Gửi yêu cầu sạc xe cá nhân", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                    Spacer(modifier = Modifier.height(6.dp))

                    if (activeOccupancies.isEmpty()) {
                        Text(
                            text = "Xe cá nhân cần check-in vào một chỗ đỗ trước khi gửi yêu cầu sạc.",
                            fontSize = 13.sp,
                            color = HubColors.TextSecondary
                        )
                        Spacer(modifier = Modifier.height(10.dp))
                        Button(
                            onClick = onOpenParking,
                            colors = ButtonDefaults.buttonColors(containerColor = HubColors.RoyalBlue)
                        ) {
                            Text("Mở Đặt chỗ đỗ & Check-in")
                        }
                    } else {
                        Text("Chọn lượt đỗ đang hoạt động:", fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
                        LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            items(activeOccupancies, key = { it.id }) { occ ->
                                FilterChip(
                                    selected = selectedOccId == occ.id,
                                    onClick = { selectedOccId = occ.id },
                                    label = { Text("${occ.vehicleId} @ ${occ.slotId}") }
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(8.dp))
                        val targetPercent = targetSlider.roundToInt()
                        Text(
                            text = "Mức pin mục tiêu: $targetPercent%",
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 14.sp
                        )
                        Slider(
                            value = targetSlider,
                            onValueChange = { targetSlider = it },
                            valueRange = 20f..100f,
                            steps = 15
                        )

                        Text("Thời điểm cần lấy xe:", fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            listOf(2, 4, 6).forEach { hrs ->
                                FilterChip(
                                    selected = neededHoursAhead == hrs,
                                    onClick = { neededHoursAhead = hrs },
                                    label = { Text("Sau ${hrs}h") }
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(10.dp))
                        Button(
                            onClick = {
                                val neededBy = Instant.now().plus(neededHoursAhead.toLong(), ChronoUnit.HOURS).toString()
                                onSubmitCharging(selectedOccId, targetPercent, neededBy)
                            },
                            enabled = !state.isBusy && selectedOccId.isNotBlank(),
                            shape = RoundedCornerShape(12.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = HubColors.RoyalBlue),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text("Gửi yêu cầu sạc")
                        }
                    }
                }
            }
        }

        state.activeChargingSession?.let { session ->
            item {
                TintedSurfaceCard(
                    backgroundColor = HubColors.SuccessBg,
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 6.dp)
                ) {
                    Column(modifier = Modifier.padding(14.dp)) {
                        Text(
                            text = "Phiên sạc đang hoạt động · Cổng ${session.pointId}",
                            fontWeight = FontWeight.Bold,
                            color = HubColors.SuccessFg
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = "Xe ${session.vehicleId} · Pin hiện tại ${session.currentBatteryPercent ?: "?"}% → ${session.targetBatteryPercent ?: "?"}%",
                            fontSize = 13.sp
                        )
                        Text(
                            text = "Công suất cấp: ${session.allocatedPowerKw} kW · Bắt đầu ${HubDateTime.format(session.startedAt)}",
                            fontSize = 12.sp,
                            color = HubColors.TextSecondary
                        )
                        Spacer(modifier = Modifier.height(10.dp))
                        Button(
                            onClick = { onStopSession(session.id) },
                            enabled = !state.isBusy,
                            colors = ButtonDefaults.buttonColors(containerColor = HubColors.ErrorFg)
                        ) {
                            Text("Dừng sạc an toàn")
                        }
                    }
                }
            }
        }

        item {
            Text(
                text = "Danh sách yêu cầu sạc (${state.chargingRequests.size})",
                fontWeight = FontWeight.Bold,
                fontSize = 16.sp,
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 10.dp)
            )
        }

        if (state.chargingRequests.isEmpty()) {
            item {
                TintedSurfaceCard(modifier = Modifier.padding(horizontal = 16.dp)) {
                    Text(
                        text = "Chưa có yêu cầu sạc nào.",
                        color = HubColors.TextSecondary,
                        modifier = Modifier.padding(14.dp)
                    )
                }
            }
        } else {
            items(state.chargingRequests, key = { it.id }) { req ->
                TintedSurfaceCard(modifier = Modifier.padding(horizontal = 16.dp, vertical = 6.dp)) {
                    Column(modifier = Modifier.padding(14.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text("Xe ${req.vehicleId}", fontWeight = FontWeight.Bold, fontSize = 15.sp)
                            StatusBadge(
                                text = StatusLabels.chargingStatus(req.status),
                                bgColor = if (req.status == "Charging") HubColors.SuccessBg else HubColors.InfoBg,
                                fgColor = if (req.status == "Charging") HubColors.SuccessFg else HubColors.InfoFg
                            )
                        }
                        Text(
                            text = "Hub: ${hubName(req.hubId)} · Pin ${req.currentBatteryPercent ?: req.batteryAtRequest}% → ${req.targetBatteryPercent}%",
                            fontSize = 13.sp,
                            color = HubColors.TextSecondary
                        )
                        Text("Cần trước: ${HubDateTime.format(req.neededBy)}", fontSize = 12.sp, color = HubColors.TextSecondary)
                        if (!req.pointId.isNullOrBlank()) {
                            Text("Cổng phân bổ: ${req.pointId}", fontSize = 12.sp, color = HubColors.TextMuted)
                        }
                        if (req.status == "Queued") {
                            Spacer(modifier = Modifier.height(8.dp))
                            OutlinedButton(
                                onClick = { onCancelRequest(req.id) },
                                enabled = !state.isBusy
                            ) {
                                Text("Hủy yêu cầu sạc")
                            }
                        } else if (req.status == "Charging" && !req.sessionId.isNullOrBlank()) {
                            Spacer(modifier = Modifier.height(8.dp))
                            Button(
                                onClick = { onStopSession(req.sessionId) },
                                enabled = !state.isBusy,
                                colors = ButtonDefaults.buttonColors(containerColor = HubColors.ErrorFg)
                            ) {
                                Text("Dừng sạc")
                            }
                        }
                    }
                }
            }
        }
    }
}
