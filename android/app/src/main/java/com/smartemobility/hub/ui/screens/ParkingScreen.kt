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
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.FilterChip
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
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

@Composable
fun ParkingScreen(
    state: HubUiState,
    onBack: () -> Unit,
    onRefresh: () -> Unit,
    onCheckAvailability: (hubId: String, pool: String, vehicleId: String?, arrival: String?, checkout: String?) -> Unit,
    onReserveParking: (hubId: String, vehicleId: String, pool: String, slotId: String?, arrival: String?, checkout: String?) -> Unit,
    onCancelReservation: (String) -> Unit,
    onCheckIn: (reservationId: String, hubId: String, ticketCode: String) -> Unit,
    onCheckOut: (occupancyId: String, cancelQueuedCharging: Boolean) -> Unit,
    onDismissQueuedChargingDialog: () -> Unit,
    onOpenCharging: () -> Unit,
    modifier: Modifier = Modifier
) {
    var hubId by remember(state.selectedHubId) {
        mutableStateOf(state.selectedHubId.ifBlank { state.hubs.firstOrNull()?.id.orEmpty() })
    }
    var pool by remember(state.parkingPool) { mutableStateOf(state.parkingPool) }
    var vehicleIdInput by remember(state.privateVehicles) {
        mutableStateOf(state.privateVehicles.firstOrNull()?.id.orEmpty())
    }
    var selectedSlotId by remember(state.parkingAvailableSlots) {
        mutableStateOf(state.parkingAvailableSlots.firstOrNull()?.id)
    }
    var advancePresetHours by remember { mutableIntStateOf(1) }

    fun computeAdvanceInterval(): Pair<String?, String?> {
        if (pool != "advance") return null to null
        val start = Instant.now().plus(advancePresetHours.toLong(), ChronoUnit.HOURS)
        val end = start.plus(2, ChronoUnit.HOURS)
        return start.toString() to end.toString()
    }

    val hubName: (String) -> String = { id -> state.hubs.firstOrNull { it.id == id }?.name ?: id }

    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .background(HubColors.CanvasBackground),
        contentPadding = PaddingValues(bottom = 28.dp)
    ) {
        item {
            TitleSkylineHeader(title = "Đặt chỗ đỗ xe cá nhân", onBack = onBack, onRefresh = onRefresh)
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

        if (!state.lim01ConflictDetails.isNullOrBlank()) {
            item {
                TintedSurfaceCard(
                    backgroundColor = HubColors.WarningBg,
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 6.dp)
                ) {
                    Column(modifier = Modifier.padding(14.dp)) {
                        Text("Chi tiết xung đột LIM-01", fontWeight = FontWeight.Bold, color = HubColors.WarningFg)
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(state.lim01ConflictDetails, fontSize = 13.sp, color = HubColors.TextPrimary)
                    }
                }
            }
        }

        // UC06-S1: Availability + Reservation form
        item {
            TintedSurfaceCard(modifier = Modifier.padding(horizontal = 16.dp, vertical = 10.dp)) {
                Column(modifier = Modifier.padding(14.dp)) {
                    Text("Đặt chỗ đỗ mới", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                    Spacer(modifier = Modifier.height(8.dp))

                    if (state.privateVehicles.isNotEmpty()) {
                        Text("Xe cá nhân của bạn:", fontSize = 13.sp, color = HubColors.TextSecondary)
                        LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            items(state.privateVehicles, key = { it.id }) { pv ->
                                FilterChip(
                                    selected = vehicleIdInput == pv.id,
                                    onClick = { vehicleIdInput = pv.id },
                                    label = { Text("${pv.id} (${pv.batteryPercent}%)") }
                                )
                            }
                        }
                    } else {
                        Text(
                            text = "Tài khoản chưa có xe cá nhân được gắn. Bạn có thể tạo xe cá nhân ở phía Operator hoặc nhập mã xe cá nhân hợp lệ bên dưới.",
                            fontSize = 12.sp,
                            color = HubColors.TextSecondary
                        )
                    }

                    Spacer(modifier = Modifier.height(6.dp))
                    OutlinedTextField(
                        value = vehicleIdInput,
                        onValueChange = { vehicleIdInput = it },
                        label = { Text("Mã xe cá nhân (vd: PV-USER-1)") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )

                    Spacer(modifier = Modifier.height(10.dp))
                    Text("Chọn Hub:", fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
                    LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        items(state.hubs, key = { it.id }) { hub ->
                            FilterChip(
                                selected = hubId == hub.id,
                                onClick = { hubId = hub.id },
                                label = { Text(hub.name) }
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(8.dp))
                    Text("Nhóm chỗ đỗ:", fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        FilterChip(
                            selected = pool == "immediate",
                            onClick = { pool = "immediate" },
                            label = { Text("Đỗ ngay (15 phút)") }
                        )
                        FilterChip(
                            selected = pool == "advance",
                            onClick = { pool = "advance" },
                            label = { Text("Đặt trước") }
                        )
                    }

                    if (pool == "advance") {
                        Text("Khung giờ dự kiến (2 giờ):", fontSize = 12.sp, color = HubColors.TextSecondary)
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            listOf(1, 3, 24).forEach { hrs ->
                                FilterChip(
                                    selected = advancePresetHours == hrs,
                                    onClick = { advancePresetHours = hrs },
                                    label = { Text("Sau ${hrs}h") }
                                )
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(10.dp))
                    OutlinedButton(
                        onClick = {
                            val (arrival, checkout) = computeAdvanceInterval()
                            onCheckAvailability(hubId, pool, vehicleIdInput.ifBlank { null }, arrival, checkout)
                        },
                        enabled = !state.isBusy && hubId.isNotBlank(),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text("Kiểm tra chỗ đỗ trống")
                    }

                    if (state.parkingAvailableSlots.isNotEmpty()) {
                        Spacer(modifier = Modifier.height(8.dp))
                        Text("Chọn ô trống (${state.parkingAvailableSlots.size} ô):", fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
                        LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            items(state.parkingAvailableSlots, key = { it.id }) { slot ->
                                FilterChip(
                                    selected = selectedSlotId == slot.id,
                                    onClick = { selectedSlotId = slot.id },
                                    label = { Text(slot.code) }
                                )
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(10.dp))
                    Button(
                        onClick = {
                            val (arrival, checkout) = computeAdvanceInterval()
                            onReserveParking(hubId, vehicleIdInput, pool, selectedSlotId, arrival, checkout)
                        },
                        enabled = !state.isBusy && hubId.isNotBlank() && vehicleIdInput.isNotBlank(),
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = HubColors.RoyalBlue),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text("Xác nhận đặt chỗ đỗ")
                    }
                }
            }
        }

        // Active occupancies (UC06-S3 Check-out + UC07 link)
        val activeOccupancies = state.parkingOccupancies.filter { it.isActive }
        item {
            Text(
                text = "Lượt đang đỗ (${activeOccupancies.size})",
                fontWeight = FontWeight.Bold,
                fontSize = 16.sp,
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 10.dp)
            )
        }
        if (activeOccupancies.isEmpty()) {
            item {
                TintedSurfaceCard(modifier = Modifier.padding(horizontal = 16.dp)) {
                    Text(
                        text = "Chưa có xe đang đỗ tại Hub.",
                        color = HubColors.TextSecondary,
                        modifier = Modifier.padding(14.dp)
                    )
                }
            }
        } else {
            items(activeOccupancies, key = { it.id }) { occ ->
                TintedSurfaceCard(modifier = Modifier.padding(horizontal = 16.dp, vertical = 6.dp)) {
                    Column(modifier = Modifier.padding(14.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text("Ô ${occ.slotId} · Xe ${occ.vehicleId}", fontWeight = FontWeight.Bold)
                            StatusBadge("Đang đỗ", HubColors.SuccessBg, HubColors.SuccessFg)
                        }
                        Text("Hub: ${hubName(occ.hubId)}", fontSize = 13.sp, color = HubColors.TextSecondary)
                        Text("Check-in: ${HubDateTime.format(occ.actualCheckInAt)}", fontSize = 13.sp, color = HubColors.TextSecondary)
                        Spacer(modifier = Modifier.height(10.dp))
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Button(
                                onClick = onOpenCharging,
                                colors = ButtonDefaults.buttonColors(containerColor = HubColors.TileGreenIcon),
                                modifier = Modifier.weight(1f)
                            ) {
                                Text("Yêu cầu sạc", fontSize = 13.sp)
                            }
                            OutlinedButton(
                                onClick = { onCheckOut(occ.id, false) },
                                enabled = !state.isBusy,
                                modifier = Modifier.weight(1f)
                            ) {
                                Text("Check-out", fontSize = 13.sp)
                            }
                        }
                    }
                }
            }
        }

        // Parking Reservations (UC06-S2 Check-in / Cancel)
        val openReservations = state.parkingReservations.filter { it.status == "Reserved" }
        item {
            Text(
                text = "Phiếu giữ chỗ đỗ (${openReservations.size})",
                fontWeight = FontWeight.Bold,
                fontSize = 16.sp,
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 10.dp)
            )
        }
        if (openReservations.isEmpty()) {
            item {
                TintedSurfaceCard(modifier = Modifier.padding(horizontal = 16.dp)) {
                    Text(
                        text = "Không có phiếu giữ chỗ đỗ đang chờ check-in.",
                        color = HubColors.TextSecondary,
                        modifier = Modifier.padding(14.dp)
                    )
                }
            }
        } else {
            items(openReservations, key = { it.id }) { res ->
                TintedSurfaceCard(modifier = Modifier.padding(horizontal = 16.dp, vertical = 6.dp)) {
                    Column(modifier = Modifier.padding(14.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text("Ô ${res.slotId} · Xe ${res.vehicleId}", fontWeight = FontWeight.Bold)
                            StatusBadge(
                                StatusLabels.parkingStatus(res.status),
                                HubColors.InfoBg,
                                HubColors.InfoFg
                            )
                        }
                        Text("Hub: ${hubName(res.hubId)} (${res.pool})", fontSize = 13.sp, color = HubColors.TextSecondary)
                        Text("Mã vé: ${res.ticketCode}", fontSize = 13.sp, fontWeight = FontWeight.Medium)
                        Text("Hạn đến: ${HubDateTime.format(res.expiresAt)}", fontSize = 12.sp, color = HubColors.TextSecondary)
                        Spacer(modifier = Modifier.height(10.dp))
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Button(
                                onClick = { onCheckIn(res.id, res.hubId, res.ticketCode) },
                                enabled = !state.isBusy,
                                colors = ButtonDefaults.buttonColors(containerColor = HubColors.RoyalBlue),
                                modifier = Modifier.weight(1f)
                            ) {
                                Text("Check-in", fontSize = 13.sp)
                            }
                            OutlinedButton(
                                onClick = { onCancelReservation(res.id) },
                                enabled = !state.isBusy
                            ) {
                                Text("Hủy chỗ", fontSize = 13.sp)
                            }
                        }
                    }
                }
            }
        }
    }

    state.queuedChargingConflictOccupancyId?.let { occId ->
        AlertDialog(
            onDismissRequest = onDismissQueuedChargingDialog,
            title = { Text("Đang có yêu cầu sạc chờ") },
            text = {
                Text("Lượt đỗ này đang có yêu cầu sạc ở trạng thái chờ. Bạn có muốn hủy yêu cầu sạc chờ để hoàn tất check-out không?")
            },
            confirmButton = {
                Button(
                    onClick = { onCheckOut(occId, true) },
                    colors = ButtonDefaults.buttonColors(containerColor = HubColors.RoyalBlue)
                ) {
                    Text("Hủy sạc chờ & Check-out")
                }
            },
            dismissButton = {
                TextButton(onClick = onDismissQueuedChargingDialog) { Text("Giữ lại") }
            }
        )
    }
}
