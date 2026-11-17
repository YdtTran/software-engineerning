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
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.DirectionsBike
import androidx.compose.material.icons.filled.BatteryChargingFull
import androidx.compose.material.icons.filled.ElectricMoped
import androidx.compose.material.icons.filled.QrCodeScanner
import androidx.compose.material.icons.filled.ReportProblem
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Checkbox
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
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
import com.smartemobility.hub.data.model.VehicleDto
import com.smartemobility.hub.data.model.VehicleReservationDto
import com.smartemobility.hub.ui.HubUiState
import com.smartemobility.hub.ui.components.FeedbackBanner
import com.smartemobility.hub.ui.components.HubDateTime
import com.smartemobility.hub.ui.components.QrScannerDialog
import com.smartemobility.hub.ui.components.StatusBadge
import com.smartemobility.hub.ui.components.StatusLabels
import com.smartemobility.hub.ui.components.TintedSurfaceCard
import com.smartemobility.hub.ui.components.TitleSkylineHeader
import com.smartemobility.hub.ui.theme.HubColors

@Composable
fun RentalScreen(
    state: HubUiState,
    onBack: () -> Unit,
    onRefresh: () -> Unit,
    onSelectHub: (String) -> Unit,
    onSelectTypeFilter: (String?) -> Unit,
    onReserveVehicle: (String, String) -> Unit,
    onCancelReservation: (String) -> Unit,
    onPickupVehicle: (String, String) -> Unit,
    onLoadReturnSlots: (String, String) -> Unit,
    onReturnTrip: (String, String, String) -> Unit,
    onReportIncident: (String, String) -> Unit,
    modifier: Modifier = Modifier
) {
    var selectedTabIndex by remember { mutableIntStateOf(0) }
    var vehicleToConfirm by remember { mutableStateOf<VehicleDto?>(null) }
    var reservationToScan by remember { mutableStateOf<VehicleReservationDto?>(null) }
    var incidentTripId by remember { mutableStateOf<String?>(null) }
    var incidentText by remember { mutableStateOf("") }

    val activeReservations = state.vehicleReservations.filter { it.isActivePending }
    val activeTrips = state.trips.filter { it.status == "Active" }
    val hubName: (String?) -> String = { id ->
        state.hubs.firstOrNull { it.id == id }?.name ?: id.orEmpty()
    }

    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .background(HubColors.CanvasBackground),
        contentPadding = PaddingValues(bottom = 28.dp)
    ) {
        item {
            TitleSkylineHeader(title = "Thuê & Trả xe điện", onBack = onBack, onRefresh = onRefresh)
        }

        item {
            TabRow(
                selectedTabIndex = selectedTabIndex,
                containerColor = HubColors.CardSurfaceElevated
            ) {
                Tab(
                    selected = selectedTabIndex == 0,
                    onClick = { selectedTabIndex = 0 },
                    text = { Text("Chọn xe") }
                )
                Tab(
                    selected = selectedTabIndex == 1,
                    onClick = { selectedTabIndex = 1 },
                    text = {
                        val badge = activeReservations.size + activeTrips.size
                        Text(if (badge > 0) "Phiếu & Chuyến ($badge)" else "Phiếu & Chuyến")
                    }
                )
            }
        }

        if (!state.errorMessage.isNullOrBlank()) {
            item {
                FeedbackBanner(
                    message = state.errorMessage,
                    isError = true,
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 10.dp)
                )
            }
        } else if (!state.successMessage.isNullOrBlank()) {
            item {
                FeedbackBanner(
                    message = state.successMessage,
                    isError = false,
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 10.dp)
                )
            }
        }

        if (selectedTabIndex == 0) {
            item {
                Column(modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp)) {
                    Text("1. Chọn Hub", fontWeight = FontWeight.Bold, fontSize = 15.sp)
                    Spacer(modifier = Modifier.height(8.dp))
                    LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        items(state.hubs, key = { it.id }) { hub ->
                            FilterChip(
                                selected = state.selectedHubId == hub.id,
                                onClick = { onSelectHub(hub.id) },
                                label = { Text(hub.name) }
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(10.dp))
                    Text("2. Lọc loại xe", fontWeight = FontWeight.Bold, fontSize = 15.sp)
                    Spacer(modifier = Modifier.height(8.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        FilterChip(
                            selected = state.vehicleTypeFilter == null,
                            onClick = { onSelectTypeFilter(null) },
                            label = { Text("Tất cả") }
                        )
                        FilterChip(
                            selected = state.vehicleTypeFilter == "electric_bicycle",
                            onClick = { onSelectTypeFilter("electric_bicycle") },
                            label = { Text("Xe đạp điện") }
                        )
                        FilterChip(
                            selected = state.vehicleTypeFilter == "electric_motorbike",
                            onClick = { onSelectTypeFilter("electric_motorbike") },
                            label = { Text("Xe máy điện") }
                        )
                    }
                }
            }

            if (state.availableVehicles.isEmpty()) {
                item {
                    TintedSurfaceCard(modifier = Modifier.padding(horizontal = 16.dp)) {
                        Text(
                            text = "Hiện không có xe khả dụng tại ${hubName(state.selectedHubId)}.",
                            color = HubColors.TextSecondary,
                            modifier = Modifier.padding(16.dp)
                        )
                    }
                }
            } else {
                items(state.availableVehicles, key = { it.id }) { vehicle ->
                    TintedSurfaceCard(
                        modifier = Modifier.padding(horizontal = 16.dp, vertical = 6.dp)
                    ) {
                        Column(modifier = Modifier.padding(14.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(
                                        imageVector = if (vehicle.vehicleType == "electric_motorbike") {
                                            Icons.Filled.ElectricMoped
                                        } else {
                                            Icons.AutoMirrored.Filled.DirectionsBike
                                        },
                                        contentDescription = null,
                                        tint = HubColors.RoyalBlue,
                                        modifier = Modifier.size(26.dp)
                                    )
                                    Spacer(modifier = Modifier.width(10.dp))
                                    Column {
                                        Text(vehicle.id, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                                        Text(vehicle.displayType, fontSize = 13.sp, color = HubColors.TextSecondary)
                                    }
                                }
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(
                                        Icons.Filled.BatteryChargingFull,
                                        contentDescription = null,
                                        tint = HubColors.TileGreenIcon,
                                        modifier = Modifier.size(18.dp)
                                    )
                                    Text(
                                        text = "${vehicle.batteryPercent}%",
                                        fontWeight = FontWeight.Bold,
                                        color = HubColors.TileGreenIcon
                                    )
                                }
                            }
                            Spacer(modifier = Modifier.height(8.dp))
                            LinearProgressIndicator(
                                progress = { (vehicle.batteryPercent.coerceIn(0, 100)) / 100f },
                                modifier = Modifier.fillMaxWidth(),
                                color = HubColors.TileGreenIcon
                            )
                            Spacer(modifier = Modifier.height(10.dp))
                            Button(
                                onClick = { vehicleToConfirm = vehicle },
                                enabled = !state.isBusy,
                                shape = RoundedCornerShape(12.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = HubColors.RoyalBlue),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Text("Giữ xe (15 phút)")
                            }
                        }
                    }
                }
            }
        } else {
            item {
                Text(
                    text = "Phiếu giữ xe đang xử lý",
                    fontWeight = FontWeight.Bold,
                    fontSize = 16.sp,
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp)
                )
            }
            if (activeReservations.isEmpty()) {
                item {
                    TintedSurfaceCard(modifier = Modifier.padding(horizontal = 16.dp)) {
                        Text(
                            text = "Bạn không có phiếu giữ xe đang chờ nhận.",
                            color = HubColors.TextSecondary,
                            modifier = Modifier.padding(16.dp)
                        )
                    }
                }
            } else {
                items(activeReservations, key = { it.id }) { res ->
                    TintedSurfaceCard(
                        modifier = Modifier.padding(horizontal = 16.dp, vertical = 6.dp)
                    ) {
                        Column(modifier = Modifier.padding(14.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text("Xe ${res.vehicleId}", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                                StatusBadge(
                                    text = StatusLabels.rentalStatus(res.status),
                                    bgColor = HubColors.InfoBg,
                                    fgColor = HubColors.InfoFg
                                )
                            }
                            Spacer(modifier = Modifier.height(4.dp))
                            Text("Hub: ${hubName(res.hubId)}", fontSize = 13.sp, color = HubColors.TextSecondary)
                            Text("Hạn nhận: ${HubDateTime.format(res.expiresAt)}", fontSize = 13.sp, color = HubColors.TextSecondary)
                            Text("Mã phiếu: ${res.ticketCode}", fontSize = 12.sp, color = HubColors.TextMuted)
                            Spacer(modifier = Modifier.height(10.dp))
                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                if (res.status == "Reserved") {
                                    Button(
                                        onClick = { reservationToScan = res },
                                        enabled = !state.isBusy,
                                        colors = ButtonDefaults.buttonColors(containerColor = HubColors.RoyalBlue),
                                        modifier = Modifier.weight(1f)
                                    ) {
                                        Icon(
                                            imageVector = Icons.Filled.QrCodeScanner,
                                            contentDescription = null,
                                            modifier = Modifier.size(18.dp)
                                        )
                                        Spacer(modifier = Modifier.width(6.dp))
                                        Text("Quét QR nhận xe")
                                    }
                                    OutlinedButton(
                                        onClick = { onCancelReservation(res.id) },
                                        enabled = !state.isBusy
                                    ) {
                                        Text("Hủy giữ")
                                    }
                                } else {
                                    Button(
                                        onClick = { onPickupVehicle(res.id, res.vehicleId) },
                                        enabled = !state.isBusy,
                                        colors = ButtonDefaults.buttonColors(containerColor = HubColors.RoyalBlue),
                                        modifier = Modifier.weight(1f)
                                    ) {
                                        Text("Thử lại nhận xe")
                                    }
                                }
                            }
                        }
                    }
                }
            }

            item {
                Text(
                    text = "Chuyến đi đang hoạt động",
                    fontWeight = FontWeight.Bold,
                    fontSize = 16.sp,
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 14.dp)
                )
            }
            if (activeTrips.isEmpty()) {
                item {
                    TintedSurfaceCard(modifier = Modifier.padding(horizontal = 16.dp)) {
                        Text(
                            text = "Bạn chưa có chuyến đi đang hoạt động.",
                            color = HubColors.TextSecondary,
                            modifier = Modifier.padding(16.dp)
                        )
                    }
                }
            } else {
                items(activeTrips, key = { it.id }) { trip ->
                    val slotState = state.returnSlotsByTrip[trip.id]
                    var targetHubId by remember(trip.id) {
                        mutableStateOf(slotState?.first ?: state.hubs.firstOrNull()?.id.orEmpty())
                    }
                    var selectedSlotId by remember(trip.id, slotState) {
                        mutableStateOf(slotState?.second?.firstOrNull()?.id.orEmpty())
                    }
                    var confirmedParked by remember(trip.id) { mutableStateOf(false) }

                    TintedSurfaceCard(
                        modifier = Modifier.padding(horizontal = 16.dp, vertical = 6.dp)
                    ) {
                        Column(modifier = Modifier.padding(14.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text("Chuyến ${trip.vehicleId}", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                                StatusBadge(
                                    text = StatusLabels.rentalStatus(trip.status),
                                    bgColor = HubColors.SuccessBg,
                                    fgColor = HubColors.SuccessFg
                                )
                            }
                            Text("Bắt đầu: ${HubDateTime.format(trip.startTime)}", fontSize = 13.sp, color = HubColors.TextSecondary)
                            Spacer(modifier = Modifier.height(10.dp))

                            val pendingReturn = trip.pendingReturn
                            if (pendingReturn != null) {
                                Text(
                                    text = "Đang đối soát trả xe tại ${hubName(pendingReturn.hubId)}, chỗ ${pendingReturn.slotId}.",
                                    fontSize = 13.sp,
                                    color = HubColors.WarningFg
                                )
                                Spacer(modifier = Modifier.height(8.dp))
                                Button(
                                    onClick = {
                                        onReturnTrip(trip.id, pendingReturn.hubId, pendingReturn.slotId)
                                    },
                                    enabled = !state.isBusy,
                                    colors = ButtonDefaults.buttonColors(containerColor = HubColors.RoyalBlue),
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    Text("Thử lại xác nhận trả xe")
                                }
                            } else {
                                Text("Hub trả xe:", fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
                                LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    items(state.hubs, key = { it.id }) { hub ->
                                        FilterChip(
                                            selected = targetHubId == hub.id,
                                            onClick = {
                                                targetHubId = hub.id
                                                selectedSlotId = ""
                                            },
                                            label = { Text(hub.name) }
                                        )
                                    }
                                }
                                OutlinedButton(
                                    onClick = { onLoadReturnSlots(trip.id, targetHubId) },
                                    enabled = !state.isBusy && targetHubId.isNotBlank()
                                ) {
                                    Text("Kiểm tra chỗ trả")
                                }
                                val slots = slotState?.takeIf { it.first == targetHubId }?.second.orEmpty()
                                if (slots.isNotEmpty()) {
                                    Spacer(modifier = Modifier.height(6.dp))
                                    Text("Chọn chỗ trả:", fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
                                    LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                        items(slots, key = { it.id }) { slot ->
                                            FilterChip(
                                                selected = selectedSlotId == slot.id,
                                                onClick = { selectedSlotId = slot.id },
                                                label = { Text(slot.code) }
                                            )
                                        }
                                    }
                                }
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Checkbox(
                                        checked = confirmedParked,
                                        onCheckedChange = { confirmedParked = it }
                                    )
                                    Text(
                                        text = "Tôi đã đưa xe vào đúng chỗ và khóa an toàn.",
                                        fontSize = 13.sp
                                    )
                                }
                                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    Button(
                                        onClick = { onReturnTrip(trip.id, targetHubId, selectedSlotId) },
                                        enabled = !state.isBusy && selectedSlotId.isNotBlank() && confirmedParked,
                                        colors = ButtonDefaults.buttonColors(containerColor = HubColors.RoyalBlue),
                                        modifier = Modifier.weight(1f)
                                    ) {
                                        Text("Xác nhận trả xe")
                                    }
                                    OutlinedButton(
                                        onClick = {
                                            incidentTripId = trip.id
                                            incidentText = ""
                                        },
                                        enabled = !state.isBusy
                                    ) {
                                        Icon(Icons.Filled.ReportProblem, contentDescription = null, modifier = Modifier.size(16.dp))
                                        Spacer(modifier = Modifier.width(4.dp))
                                        Text("Báo sự cố")
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    vehicleToConfirm?.let { vehicle ->
        AlertDialog(
            onDismissRequest = { vehicleToConfirm = null },
            title = { Text("Xác nhận giữ xe ${vehicle.id}") },
            text = {
                Text("Xe ${vehicle.displayType} (pin ${vehicle.batteryPercent}%) tại ${hubName(state.selectedHubId)} sẽ được giữ tối đa 15 phút.")
            },
            confirmButton = {
                Button(
                    onClick = {
                        onReserveVehicle(state.selectedHubId, vehicle.id)
                        vehicleToConfirm = null
                        selectedTabIndex = 1
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = HubColors.RoyalBlue)
                ) {
                    Text("Xác nhận giữ xe")
                }
            },
            dismissButton = {
                TextButton(onClick = { vehicleToConfirm = null }) { Text("Hủy") }
            }
        )
    }

    reservationToScan?.let { res ->
        QrScannerDialog(
            expectedVehicleId = res.vehicleId,
            onDismiss = { reservationToScan = null },
            onCodeDecoded = { scannedCode ->
                reservationToScan = null
                onPickupVehicle(res.id, scannedCode)
            }
        )
    }

    incidentTripId?.let { tripId ->
        AlertDialog(
            onDismissRequest = { incidentTripId = null },
            title = { Text("Báo sự cố chuyến đi") },
            text = {
                Column {
                    Text("Chuyến sẽ được giữ để vận hành tiếp nhận xử lý an toàn.", fontSize = 13.sp)
                    Spacer(modifier = Modifier.height(8.dp))
                    OutlinedTextField(
                        value = incidentText,
                        onValueChange = { incidentText = it },
                        label = { Text("Mô tả sự cố (vd: Hỏng phanh / Hết pin)") },
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        onReportIncident(tripId, incidentText)
                        incidentTripId = null
                    },
                    enabled = incidentText.isNotBlank(),
                    colors = ButtonDefaults.buttonColors(containerColor = HubColors.RoyalBlue)
                ) {
                    Text("Gửi báo cáo")
                }
            },
            dismissButton = {
                TextButton(onClick = { incidentTripId = null }) { Text("Đóng") }
            }
        )
    }
}
