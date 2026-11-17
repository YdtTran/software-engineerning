package com.smartemobility.hub.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.filled.ElectricBike
import androidx.compose.material.icons.filled.EvStation
import androidx.compose.material.icons.filled.History
import androidx.compose.material.icons.outlined.LocationOn
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.smartemobility.hub.ui.HubUiState
import com.smartemobility.hub.ui.SubScreen
import com.smartemobility.hub.ui.components.FeedbackBanner
import com.smartemobility.hub.ui.components.HomeSkylineHeader
import com.smartemobility.hub.ui.components.MainTab
import com.smartemobility.hub.ui.components.StatusBadge
import com.smartemobility.hub.ui.components.StatusLabels
import com.smartemobility.hub.ui.components.TintedSurfaceCard
import com.smartemobility.hub.ui.theme.HubColors

@Composable
fun HomeScreen(
    state: HubUiState,
    onOpenTab: (MainTab) -> Unit,
    onOpenSubScreen: (SubScreen) -> Unit,
    onOpenLogin: () -> Unit,
    modifier: Modifier = Modifier
) {
    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .background(HubColors.CanvasBackground),
        contentPadding = PaddingValues(bottom = 24.dp)
    ) {
        item {
            HomeSkylineHeader(greetingName = state.user?.id)
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

        // 4 quick-action cards right below skyline banner (Image 3 layout)
        item {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 14.dp, vertical = 14.dp),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                QuickActionTile(
                    label = "Tìm Hub",
                    icon = Icons.Outlined.LocationOn,
                    iconTint = HubColors.TileBlueIcon,
                    modifier = Modifier.weight(1f),
                    onClick = { onOpenTab(MainTab.MAP) }
                )
                QuickActionTile(
                    label = "Thuê xe",
                    icon = Icons.Filled.ElectricBike,
                    iconTint = HubColors.TileGreenIcon,
                    modifier = Modifier.weight(1f),
                    onClick = { onOpenSubScreen(SubScreen.RENTAL) }
                )
                QuickActionParkingTile(
                    label = "Đặt chỗ đỗ",
                    letterTint = HubColors.TileBlueIcon,
                    modifier = Modifier.weight(1f),
                    onClick = { onOpenSubScreen(SubScreen.PARKING) }
                )
                QuickActionTile(
                    label = "Sạc xe",
                    icon = Icons.Filled.EvStation,
                    iconTint = HubColors.TileGreenIcon,
                    modifier = Modifier.weight(1f),
                    onClick = { onOpenSubScreen(SubScreen.CHARGING) }
                )
            }
        }

        // "Dịch vụ" pastel icon grid (Image 3 layout)
        item {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 4.dp)
            ) {
                Text(
                    text = "Dịch vụ",
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold,
                    color = HubColors.TextPrimary
                )
                Spacer(modifier = Modifier.height(14.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    ServicePastelTile(
                        label = "Xe điện",
                        bgColor = HubColors.TileBlueBg,
                        iconTint = HubColors.TileBlueIcon,
                        icon = Icons.Filled.ElectricBike,
                        modifier = Modifier.weight(1f),
                        onClick = { onOpenSubScreen(SubScreen.RENTAL) }
                    )
                    ServicePastelParkingTile(
                        label = "Chỗ đỗ",
                        bgColor = HubColors.TileOrangeBg,
                        letterTint = HubColors.TileOrangeIcon,
                        modifier = Modifier.weight(1f),
                        onClick = { onOpenSubScreen(SubScreen.PARKING) }
                    )
                    ServicePastelTile(
                        label = "Trạm sạc",
                        bgColor = HubColors.TileGreenBg,
                        iconTint = HubColors.TileGreenIcon,
                        icon = Icons.Filled.EvStation,
                        modifier = Modifier.weight(1f),
                        onClick = { onOpenSubScreen(SubScreen.CHARGING) }
                    )
                    ServicePastelTile(
                        label = "Lịch sử",
                        bgColor = HubColors.TileIndigoBg,
                        iconTint = HubColors.TileIndigoIcon,
                        icon = Icons.Filled.History,
                        modifier = Modifier.weight(1f),
                        onClick = { onOpenSubScreen(SubScreen.HISTORY) }
                    )
                }
            }
        }

        // "Hub gần bạn" featured card (Image 3 layout)
        item {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 18.dp)
            ) {
                Text(
                    text = "Hub gần bạn",
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold,
                    color = HubColors.TextPrimary
                )
                Spacer(modifier = Modifier.height(12.dp))
                TintedSurfaceCard(
                    onClick = { onOpenTab(MainTab.MAP) }
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(14.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Box(
                            modifier = Modifier
                                .size(76.dp)
                                .clip(RoundedCornerShape(18.dp))
                                .background(
                                    Brush.linearGradient(
                                        colors = listOf(HubColors.RoyalBlue, HubColors.PrimaryCyan)
                                    )
                                ),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = Icons.Filled.ElectricBike,
                                contentDescription = null,
                                tint = Color.White,
                                modifier = Modifier.size(40.dp)
                            )
                        }
                        Spacer(modifier = Modifier.width(14.dp))
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = "Tìm Mobility Hub",
                                fontSize = 16.sp,
                                fontWeight = FontWeight.Bold,
                                color = HubColors.TextPrimary
                            )
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                text = if (state.hubs.isEmpty()) {
                                    "Khám phá các Hub trong mạng lưới"
                                } else {
                                    "Có ${state.hubs.size} Hub đang kết nối trong khu vực ĐHQG-HCM"
                                },
                                fontSize = 13.sp,
                                color = HubColors.TextSecondary,
                                lineHeight = 18.sp
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text(
                                    text = "Xem danh sách",
                                    fontSize = 14.sp,
                                    fontWeight = FontWeight.SemiBold,
                                    color = HubColors.RoyalBlue
                                )
                                Spacer(modifier = Modifier.width(4.dp))
                                Icon(
                                    imageVector = Icons.AutoMirrored.Filled.ArrowForward,
                                    contentDescription = null,
                                    tint = HubColors.RoyalBlue,
                                    modifier = Modifier.size(16.dp)
                                )
                            }
                        }
                    }
                }
            }
        }

        // Live active journey / parking / charging summary or login prompt
        item {
            Column(modifier = Modifier.padding(horizontal = 16.dp)) {
                if (state.user == null) {
                    TintedSurfaceCard {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Text(
                                text = "Kết nối tài khoản Smart E-Mobility",
                                fontSize = 15.sp,
                                fontWeight = FontWeight.Bold,
                                color = HubColors.TextPrimary
                            )
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                text = "Đăng nhập để tìm xe khả dụng, giữ xe 15 phút, đặt chỗ đỗ và theo dõi phiên sạc trực tiếp.",
                                fontSize = 13.sp,
                                color = HubColors.TextSecondary
                            )
                            Spacer(modifier = Modifier.height(12.dp))
                            Button(
                                onClick = onOpenLogin,
                                shape = RoundedCornerShape(50),
                                colors = ButtonDefaults.buttonColors(containerColor = HubColors.RoyalBlue)
                            ) {
                                Text("Đăng nhập ngay")
                            }
                        }
                    }
                } else {
                    ActiveSummarySection(state = state, onOpenSubScreen = onOpenSubScreen)
                }
            }
        }
    }
}

@Composable
private fun ActiveSummarySection(
    state: HubUiState,
    onOpenSubScreen: (SubScreen) -> Unit
) {
    val activeRes = state.vehicleReservations.firstOrNull { it.isActivePending }
    val activeTrip = state.trips.firstOrNull { it.status == "Active" }
    val activeParking = state.parkingReservations.firstOrNull { it.status == "Reserved" }
    val activeOcc = state.parkingOccupancies.firstOrNull { it.isActive }
    val activeCharge = state.chargingRequests.firstOrNull { it.status in setOf("Queued", "Charging") }

    if (activeRes == null && activeTrip == null && activeParking == null && activeOcc == null && activeCharge == null) {
        return
    }

    Text(
        text = "Hoạt động đang diễn ra",
        fontSize = 17.sp,
        fontWeight = FontWeight.Bold,
        color = HubColors.TextPrimary
    )
    Spacer(modifier = Modifier.height(10.dp))

    if (activeRes != null) {
        TintedSurfaceCard(
            onClick = { onOpenSubScreen(SubScreen.RENTAL) },
            modifier = Modifier.padding(bottom = 10.dp)
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(14.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text("Phiếu giữ xe ${activeRes.vehicleId}", fontWeight = FontWeight.Bold, fontSize = 15.sp)
                    Text("Mã phiếu: ${activeRes.ticketCode}", fontSize = 12.sp, color = HubColors.TextSecondary)
                }
                StatusBadge(
                    text = StatusLabels.rentalStatus(activeRes.status),
                    bgColor = HubColors.InfoBg,
                    fgColor = HubColors.InfoFg
                )
            }
        }
    }

    if (activeTrip != null) {
        TintedSurfaceCard(
            onClick = { onOpenSubScreen(SubScreen.RENTAL) },
            modifier = Modifier.padding(bottom = 10.dp)
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(14.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text("Chuyến đi ${activeTrip.vehicleId}", fontWeight = FontWeight.Bold, fontSize = 15.sp)
                    Text("Nhấn để chọn Hub trả xe hoặc báo sự cố", fontSize = 12.sp, color = HubColors.TextSecondary)
                }
                StatusBadge(
                    text = StatusLabels.rentalStatus(activeTrip.status),
                    bgColor = HubColors.SuccessBg,
                    fgColor = HubColors.SuccessFg
                )
            }
        }
    }

    if (activeParking != null || activeOcc != null) {
        TintedSurfaceCard(
            onClick = { onOpenSubScreen(SubScreen.PARKING) },
            modifier = Modifier.padding(bottom = 10.dp)
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(14.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    if (activeOcc != null) {
                        Text("Đang đỗ xe tại ô ${activeOcc.slotId}", fontWeight = FontWeight.Bold, fontSize = 15.sp)
                        Text("Xe ${activeOcc.vehicleId} · Có thể yêu cầu sạc hoặc check-out", fontSize = 12.sp, color = HubColors.TextSecondary)
                    } else if (activeParking != null) {
                        Text("Giữ chỗ đỗ ${activeParking.slotId}", fontWeight = FontWeight.Bold, fontSize = 15.sp)
                        Text("Mã vé ${activeParking.ticketCode} · Nhấn để Check-in", fontSize = 12.sp, color = HubColors.TextSecondary)
                    }
                }
                StatusBadge(
                    text = if (activeOcc != null) "Đang đỗ" else "Chờ check-in",
                    bgColor = HubColors.WarningBg,
                    fgColor = HubColors.WarningFg
                )
            }
        }
    }

    if (activeCharge != null) {
        TintedSurfaceCard(
            onClick = { onOpenSubScreen(SubScreen.CHARGING) }
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(14.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text("Sạc xe ${activeCharge.vehicleId}", fontWeight = FontWeight.Bold, fontSize = 15.sp)
                    Text("Mục tiêu ${activeCharge.targetBatteryPercent}%", fontSize = 12.sp, color = HubColors.TextSecondary)
                }
                StatusBadge(
                    text = StatusLabels.chargingStatus(activeCharge.status),
                    bgColor = HubColors.SuccessBg,
                    fgColor = HubColors.SuccessFg
                )
            }
        }
    }
}

@Composable
private fun QuickActionTile(
    label: String,
    icon: ImageVector,
    iconTint: Color,
    modifier: Modifier = Modifier,
    onClick: () -> Unit
) {
    Column(
        modifier = modifier,
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Surface(
            onClick = onClick,
            shape = RoundedCornerShape(18.dp),
            color = HubColors.CardSurfaceElevated,
            shadowElevation = 2.dp,
            modifier = Modifier
                .fillMaxWidth()
                .height(74.dp)
        ) {
            Box(contentAlignment = Alignment.Center) {
                Icon(
                    imageVector = icon,
                    contentDescription = label,
                    tint = iconTint,
                    modifier = Modifier.size(30.dp)
                )
            }
        }
        Spacer(modifier = Modifier.height(6.dp))
        Text(
            text = label,
            fontSize = 12.sp,
            fontWeight = FontWeight.Medium,
            color = HubColors.TextPrimary,
            textAlign = TextAlign.Center
        )
    }
}

@Composable
private fun QuickActionParkingTile(
    label: String,
    letterTint: Color,
    modifier: Modifier = Modifier,
    onClick: () -> Unit
) {
    Column(
        modifier = modifier,
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Surface(
            onClick = onClick,
            shape = RoundedCornerShape(18.dp),
            color = HubColors.CardSurfaceElevated,
            shadowElevation = 2.dp,
            modifier = Modifier
                .fillMaxWidth()
                .height(74.dp)
        ) {
            Box(contentAlignment = Alignment.Center) {
                Text(
                    text = "P",
                    color = letterTint,
                    fontSize = 27.sp,
                    fontWeight = FontWeight.ExtraBold
                )
            }
        }
        Spacer(modifier = Modifier.height(6.dp))
        Text(
            text = label,
            fontSize = 12.sp,
            fontWeight = FontWeight.Medium,
            color = HubColors.TextPrimary,
            textAlign = TextAlign.Center
        )
    }
}

@Composable
private fun ServicePastelTile(
    label: String,
    bgColor: Color,
    iconTint: Color,
    icon: ImageVector,
    modifier: Modifier = Modifier,
    onClick: () -> Unit
) {
    Column(
        modifier = modifier,
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Surface(
            onClick = onClick,
            shape = RoundedCornerShape(16.dp),
            color = bgColor,
            modifier = Modifier.size(60.dp)
        ) {
            Box(contentAlignment = Alignment.Center) {
                Icon(
                    imageVector = icon,
                    contentDescription = label,
                    tint = iconTint,
                    modifier = Modifier.size(28.dp)
                )
            }
        }
        Spacer(modifier = Modifier.height(6.dp))
        Text(
            text = label,
            fontSize = 12.sp,
            color = HubColors.TextPrimary,
            textAlign = TextAlign.Center
        )
    }
}

@Composable
private fun ServicePastelParkingTile(
    label: String,
    bgColor: Color,
    letterTint: Color,
    modifier: Modifier = Modifier,
    onClick: () -> Unit
) {
    Column(
        modifier = modifier,
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Surface(
            onClick = onClick,
            shape = RoundedCornerShape(16.dp),
            color = bgColor,
            modifier = Modifier.size(60.dp)
        ) {
            Box(contentAlignment = Alignment.Center) {
                Text(
                    text = "P",
                    color = letterTint,
                    fontSize = 24.sp,
                    fontWeight = FontWeight.ExtraBold
                )
            }
        }
        Spacer(modifier = Modifier.height(6.dp))
        Text(
            text = label,
            fontSize = 12.sp,
            color = HubColors.TextPrimary,
            textAlign = TextAlign.Center
        )
    }
}
