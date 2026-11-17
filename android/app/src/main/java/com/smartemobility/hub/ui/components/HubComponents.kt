package com.smartemobility.hub.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.ErrorOutline
import androidx.compose.material3.Icon
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.smartemobility.hub.ui.theme.HubColors
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter

@Composable
fun TintedSurfaceCard(
    modifier: Modifier = Modifier,
    backgroundColor: Color = HubColors.CardSurface,
    cornerRadius: Dp = 20.dp,
    onClick: (() -> Unit)? = null,
    content: @Composable ColumnScope.() -> Unit
) {
    if (onClick != null) {
        Surface(
            onClick = onClick,
            modifier = modifier.fillMaxWidth(),
            shape = RoundedCornerShape(cornerRadius),
            color = backgroundColor,
            border = BorderStroke(1.dp, HubColors.CardBorder),
            shadowElevation = 1.dp
        ) {
            Column(content = content)
        }
    } else {
        Surface(
            modifier = modifier.fillMaxWidth(),
            shape = RoundedCornerShape(cornerRadius),
            color = backgroundColor,
            border = BorderStroke(1.dp, HubColors.CardBorder),
            shadowElevation = 1.dp
        ) {
            Column(content = content)
        }
    }
}

@Composable
fun StatusBadge(
    text: String,
    bgColor: Color,
    fgColor: Color,
    modifier: Modifier = Modifier
) {
    Surface(
        modifier = modifier,
        shape = RoundedCornerShape(50),
        color = bgColor
    ) {
        Text(
            text = text,
            color = fgColor,
            fontSize = 12.sp,
            fontWeight = FontWeight.SemiBold,
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
        )
    }
}

@Composable
fun FeedbackBanner(
    message: String,
    isError: Boolean,
    modifier: Modifier = Modifier
) {
    val bg = if (isError) HubColors.ErrorBg else HubColors.SuccessBg
    val fg = if (isError) HubColors.ErrorFg else HubColors.SuccessFg
    val icon = if (isError) Icons.Filled.ErrorOutline else Icons.Filled.CheckCircle

    Surface(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(14.dp),
        color = bg,
        border = BorderStroke(1.dp, fg.copy(alpha = 0.25f))
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.Start
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = fg,
                modifier = Modifier.size(18.dp)
            )
            Spacer(modifier = Modifier.width(8.dp))
            Text(
                text = message,
                color = fg,
                fontSize = 13.sp,
                fontWeight = FontWeight.Medium
            )
        }
    }
}

object HubDateTime {
    private val formatter = DateTimeFormatter.ofPattern("HH:mm dd/MM/yyyy")
        .withZone(ZoneId.systemDefault())

    fun format(iso: String?): String {
        if (iso.isNullOrBlank()) return "—"
        return try {
            formatter.format(Instant.parse(iso))
        } catch (_: Exception) {
            iso
        }
    }
}

object StatusLabels {
    fun rentalStatus(status: String): String = when (status) {
        "Reserved" -> "Đang giữ xe"
        "PickupClaimed" -> "Đang xác nhận nhận xe"
        "PickupUncertain" -> "Cần đối soát nhận xe"
        "Fulfilled" -> "Đã nhận xe"
        "Cancelled" -> "Đã hủy"
        "Expired" -> "Đã hết hạn"
        "Active" -> "Đang đi"
        "Completed" -> "Đã hoàn tất"
        else -> status
    }

    fun parkingStatus(status: String): String = when (status) {
        "Reserved" -> "Đã giữ chỗ"
        "Fulfilled" -> "Đã check-in"
        "Cancelled" -> "Đã hủy"
        "Expired" -> "Đã hết hạn"
        else -> status
    }

    fun chargingStatus(status: String): String = when (status) {
        "Queued" -> "Đang chờ sạc"
        "Charging" -> "Đang sạc"
        "Completed" -> "Sạc hoàn tất"
        "Cancelled" -> "Đã hủy"
        "Active" -> "Đang hoạt động"
        "Interrupted" -> "Đã dừng"
        else -> status
    }
}
