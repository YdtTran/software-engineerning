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
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.smartemobility.hub.ui.HubUiState
import com.smartemobility.hub.ui.components.HubDateTime
import com.smartemobility.hub.ui.components.StatusBadge
import com.smartemobility.hub.ui.components.StatusLabels
import com.smartemobility.hub.ui.components.TintedSurfaceCard
import com.smartemobility.hub.ui.components.TitleSkylineHeader
import com.smartemobility.hub.ui.theme.HubColors

@Composable
fun HistoryScreen(
    state: HubUiState,
    onBack: () -> Unit,
    onRefresh: () -> Unit,
    modifier: Modifier = Modifier
) {
    val hubName: (String?) -> String = { id -> state.hubs.firstOrNull { it.id == id }?.name ?: id.orEmpty() }

    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .background(HubColors.CanvasBackground),
        contentPadding = PaddingValues(bottom = 28.dp)
    ) {
        item {
            TitleSkylineHeader(title = "Lịch sử sử dụng", onBack = onBack, onRefresh = onRefresh)
        }

        item {
            Text(
                text = "Chuyến đi xe điện (${state.trips.size})",
                fontWeight = FontWeight.Bold,
                fontSize = 16.sp,
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp)
            )
        }
        if (state.trips.isEmpty()) {
            item {
                TintedSurfaceCard(modifier = Modifier.padding(horizontal = 16.dp)) {
                    Text("Chưa có lịch sử chuyến đi.", color = HubColors.TextSecondary, modifier = Modifier.padding(14.dp))
                }
            }
        } else {
            items(state.trips, key = { it.id }) { trip ->
                TintedSurfaceCard(modifier = Modifier.padding(horizontal = 16.dp, vertical = 5.dp)) {
                    Column(modifier = Modifier.padding(14.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text("Xe ${trip.vehicleId}", fontWeight = FontWeight.Bold)
                            StatusBadge(StatusLabels.rentalStatus(trip.status), HubColors.InfoBg, HubColors.InfoFg)
                        }
                        Text("Bắt đầu: ${HubDateTime.format(trip.startTime)}", fontSize = 13.sp, color = HubColors.TextSecondary)
                        if (trip.endTime != null) {
                            Text("Kết thúc: ${HubDateTime.format(trip.endTime)} · ${hubName(trip.hubId)}", fontSize = 13.sp, color = HubColors.TextSecondary)
                        }
                    }
                }
            }
        }

        item {
            Text(
                text = "Phiếu giữ xe (${state.vehicleReservations.size})",
                fontWeight = FontWeight.Bold,
                fontSize = 16.sp,
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp)
            )
        }
        items(state.vehicleReservations, key = { it.id }) { res ->
            TintedSurfaceCard(modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp)) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(14.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text("${res.vehicleId} · ${hubName(res.hubId)}", fontWeight = FontWeight.SemiBold)
                        Text("Tạo lúc: ${HubDateTime.format(res.createdAt)}", fontSize = 12.sp, color = HubColors.TextSecondary)
                    }
                    StatusBadge(StatusLabels.rentalStatus(res.status), HubColors.CardBorder, HubColors.TextPrimary)
                }
            }
        }

        item {
            Text(
                text = "Đỗ xe cá nhân (${state.parkingOccupancies.size} lượt)",
                fontWeight = FontWeight.Bold,
                fontSize = 16.sp,
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp)
            )
        }
        if (state.parkingOccupancies.isEmpty()) {
            item {
                TintedSurfaceCard(modifier = Modifier.padding(horizontal = 16.dp)) {
                    Text("Chưa có lượt đỗ xe cá nhân.", color = HubColors.TextSecondary, modifier = Modifier.padding(14.dp))
                }
            }
        } else {
            items(state.parkingOccupancies, key = { it.id }) { occ ->
                TintedSurfaceCard(modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp)) {
                    Column(modifier = Modifier.padding(14.dp)) {
                        Text("${occ.vehicleId} · Ô ${occ.slotId} (${hubName(occ.hubId)})", fontWeight = FontWeight.SemiBold)
                        Text("Vào: ${HubDateTime.format(occ.actualCheckInAt)}", fontSize = 12.sp, color = HubColors.TextSecondary)
                        if (occ.actualCheckoutAt != null) {
                            val fee = occ.finalFee?.let { " · Phí quá hạn ${it.toLong()} đ" } ?: ""
                            Text("Ra: ${HubDateTime.format(occ.actualCheckoutAt)}$fee", fontSize = 12.sp, color = HubColors.TextSecondary)
                        }
                    }
                }
            }
        }

        item { Spacer(modifier = Modifier.height(12.dp)) }
    }
}
