package com.smartemobility.hub.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.ElectricBolt
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.outlined.LocationOn
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.smartemobility.hub.ui.theme.HubColors

@Composable
fun SkylineBackdrop(
    height: Dp,
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit
) {
    Box(
        modifier = modifier
            .fillMaxWidth()
            .height(height)
            .background(
                Brush.verticalGradient(
                    colors = listOf(
                        HubColors.SkylineTop,
                        HubColors.SkylineMid,
                        HubColors.SkylineBottom
                    )
                )
            )
    ) {
        Canvas(modifier = Modifier.fillMaxSize()) {
            drawHcmcSkylineArt()
        }
        Box(
            modifier = Modifier
                .fillMaxSize()
                .statusBarsPadding()
        ) {
            content()
        }
    }
}

@Composable
fun HomeSkylineHeader(
    greetingName: String?,
    locationLabel: String = "TP Hồ Chí Minh",
    modifier: Modifier = Modifier
) {
    SkylineBackdrop(height = 196.dp, modifier = modifier) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 14.dp),
            verticalAlignment = Alignment.Top,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Row(
                verticalAlignment = Alignment.Top,
                modifier = Modifier.weight(1f)
            ) {
                Surface(
                    shape = CircleShape,
                    color = Color.White,
                    shadowElevation = 4.dp,
                    modifier = Modifier.size(48.dp)
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Icon(
                            imageVector = Icons.Filled.ElectricBolt,
                            contentDescription = "Smart E-Mobility Hub",
                            tint = HubColors.DeepBlueBadge,
                            modifier = Modifier.size(28.dp)
                        )
                    }
                }
                Spacer(modifier = Modifier.width(12.dp))
                Column {
                    Text(
                        text = "Smart E-Mobility\nHub",
                        color = Color.White,
                        fontSize = 18.sp,
                        lineHeight = 22.sp,
                        fontWeight = FontWeight.Bold
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = if (greetingName.isNullOrBlank()) "Xin chào!" else "Xin chào, $greetingName!",
                        color = Color(0xFFDCE8FF),
                        fontSize = 14.sp,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }

            Spacer(modifier = Modifier.width(8.dp))
            Surface(
                shape = RoundedCornerShape(50),
                color = Color(0x6604104A),
                border = BorderStroke(1.dp, Color(0x9979A4FF))
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 7.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = Icons.Outlined.LocationOn,
                        contentDescription = null,
                        tint = Color(0xFFD5E4FF),
                        modifier = Modifier.size(15.dp)
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = locationLabel,
                        color = Color.White,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Medium
                    )
                }
            }
        }
    }
}

@Composable
fun TitleSkylineHeader(
    title: String,
    onBack: (() -> Unit)? = null,
    onRefresh: (() -> Unit)? = null,
    modifier: Modifier = Modifier
) {
    SkylineBackdrop(height = 152.dp, modifier = modifier) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 12.dp, vertical = 12.dp)
        ) {
            if (onBack != null) {
                IconButton(
                    onClick = onBack,
                    modifier = Modifier.align(Alignment.CenterStart)
                ) {
                    Icon(
                        imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                        contentDescription = "Quay lại",
                        tint = Color.White
                    )
                }
            }
            Text(
                text = title,
                color = Color.White,
                fontSize = 20.sp,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.align(Alignment.Center)
            )
            if (onRefresh != null) {
                IconButton(
                    onClick = onRefresh,
                    modifier = Modifier.align(Alignment.CenterEnd)
                ) {
                    Icon(
                        imageVector = Icons.Filled.Refresh,
                        contentDescription = "Làm mới",
                        tint = Color.White
                    )
                }
            }
        }
    }
}

@Composable
fun AccountSkylineHeader(
    title: String = "Tài khoản",
    modifier: Modifier = Modifier
) {
    Box(
        modifier = modifier
            .fillMaxWidth()
            .padding(bottom = 38.dp)
    ) {
        SkylineBackdrop(height = 152.dp) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 14.dp),
                contentAlignment = Alignment.TopCenter
            ) {
                Text(
                    text = title,
                    color = Color.White,
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Bold
                )
            }
        }

        Box(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .offset(y = 38.dp)
                .size(76.dp)
                .clip(CircleShape)
                .background(HubColors.DeepBlueBadge)
                .border(4.dp, Color.White, CircleShape),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = Icons.Filled.ElectricBolt,
                contentDescription = "Biểu tượng tài khoản",
                tint = Color.White,
                modifier = Modifier.size(36.dp)
            )
        }
    }
}

private fun DrawScope.drawHcmcSkylineArt() {
    val w = size.width
    val h = size.height
    val baseLine = h * 0.90f

    // Subtle glowing horizon mist
    drawRect(
        brush = Brush.verticalGradient(
            colors = listOf(Color.Transparent, Color(0x4416A6FF)),
            startY = h * 0.45f,
            endY = h
        )
    )

    val buildingFill = Color(0x3D7EB4FF)
    val buildingBright = Color(0x5A99C8FF)
    val buildingOutline = Color(0x66A9D6FF)

    // Left cable-stayed bridge hint
    val bridgeTop = Offset(w * 0.10f, h * 0.62f)
    drawLine(buildingOutline, bridgeTop, Offset(w * 0.02f, baseLine), strokeWidth = 2f)
    drawLine(buildingOutline, bridgeTop, Offset(w * 0.06f, baseLine), strokeWidth = 1.5f)
    drawLine(buildingOutline, bridgeTop, Offset(w * 0.14f, baseLine), strokeWidth = 1.5f)
    drawLine(buildingOutline, bridgeTop, Offset(w * 0.18f, baseLine), strokeWidth = 2f)

    // City towers including Bitexco & Landmark 81 silhouettes
    val towers = listOf(
        Triple(0.18f, 0.045f, 0.25f),
        Triple(0.24f, 0.055f, 0.34f),
        Triple(0.37f, 0.055f, 0.38f),
        Triple(0.44f, 0.045f, 0.28f),
        Triple(0.51f, 0.050f, 0.32f),
        Triple(0.70f, 0.050f, 0.31f),
        Triple(0.77f, 0.055f, 0.26f),
        Triple(0.86f, 0.055f, 0.28f)
    )
    for ((xRatio, wRatio, hRatio) in towers) {
        val left = w * xRatio
        val width = w * wRatio
        val top = baseLine - h * hRatio
        drawRoundRect(
            color = buildingFill,
            topLeft = Offset(left, top),
            size = Size(width, baseLine - top),
            cornerRadius = CornerRadius(4f, 4f)
        )
        drawLine(
            color = buildingOutline,
            start = Offset(left + width * 0.3f, top + 8f),
            end = Offset(left + width * 0.3f, baseLine),
            strokeWidth = 1.5f
        )
    }

    // Bitexco-style tower + helipad
    val bx = w * 0.305f
    val bw = w * 0.052f
    val bTop = baseLine - h * 0.45f
    drawRoundRect(
        color = buildingBright,
        topLeft = Offset(bx, bTop),
        size = Size(bw, baseLine - bTop),
        cornerRadius = CornerRadius(12f, 12f)
    )
    drawLine(
        color = Color(0xAAFFFFFF),
        start = Offset(bx + bw * 0.65f, bTop + h * 0.11f),
        end = Offset(bx + bw * 1.45f, bTop + h * 0.11f),
        strokeWidth = 4f,
        cap = StrokeCap.Round
    )

    // Landmark 81-style stepped spire
    val lx = w * 0.60f
    val lw = w * 0.068f
    drawRect(buildingFill, Offset(lx, baseLine - h * 0.30f), Size(lw, h * 0.30f))
    drawRect(buildingBright, Offset(lx + lw * 0.18f, baseLine - h * 0.42f), Size(lw * 0.64f, h * 0.42f))
    drawRect(buildingBright, Offset(lx + lw * 0.34f, baseLine - h * 0.51f), Size(lw * 0.32f, h * 0.51f))
    drawLine(
        color = Color(0x99D4F1FF),
        start = Offset(lx + lw * 0.5f, baseLine - h * 0.57f),
        end = Offset(lx + lw * 0.5f, baseLine - h * 0.50f),
        strokeWidth = 3f
    )

    // Lush green park canopy clusters along base
    val bushClusters = listOf(
        Triple(0.06f, baseLine - 2f, 22f),
        Triple(0.11f, baseLine, 18f),
        Triple(0.24f, baseLine + 2f, 20f),
        Triple(0.32f, baseLine, 24f),
        Triple(0.45f, baseLine + 2f, 21f),
        Triple(0.57f, baseLine, 23f),
        Triple(0.68f, baseLine + 1f, 22f),
        Triple(0.81f, baseLine + 2f, 19f)
    )
    for ((xRatio, cy, r) in bushClusters) {
        drawCircle(color = Color(0xFF1A8E4B), radius = r, center = Offset(w * xRatio, cy))
        drawCircle(color = Color(0xFF2DC96F), radius = r * 0.68f, center = Offset(w * xRatio - r * 0.25f, cy - r * 0.22f))
    }

    // Glowing cyan/emerald mobility arc along bottom
    val arcPath = Path().apply {
        moveTo(0f, h * 0.87f)
        quadraticTo(w * 0.30f, h * 0.77f, w * 0.60f, h * 0.86f)
        quadraticTo(w * 0.82f, h * 0.92f, w, h * 0.84f)
    }
    drawPath(
        path = arcPath,
        brush = Brush.horizontalGradient(
            colors = listOf(HubColors.SkylineHorizonGlow, HubColors.SkylineGreenGlow, HubColors.SkylineHorizonGlow)
        ),
        style = Stroke(width = 4.5f, cap = StrokeCap.Round)
    )

    // Neon e-bike outline on left edge
    val bikeCx = w * 0.085f
    val bikeCy = h * 0.84f
    val neon = Color(0xFFBDF7FF)
    drawCircle(neon, radius = 11f, center = Offset(bikeCx - 16f, bikeCy), style = Stroke(2.4f))
    drawCircle(neon, radius = 11f, center = Offset(bikeCx + 16f, bikeCy), style = Stroke(2.4f))
    drawLine(neon, Offset(bikeCx - 16f, bikeCy), Offset(bikeCx - 2f, bikeCy - 12f), strokeWidth = 2.2f)
    drawLine(neon, Offset(bikeCx - 2f, bikeCy - 12f), Offset(bikeCx + 12f, bikeCy - 12f), strokeWidth = 2.2f)
    drawLine(neon, Offset(bikeCx + 12f, bikeCy - 12f), Offset(bikeCx + 16f, bikeCy), strokeWidth = 2.2f)

    // Neon electric bus outline on right edge
    val busLeft = w * 0.84f
    val busTop = h * 0.72f
    drawRoundRect(
        color = Color(0xCC224FD8),
        topLeft = Offset(busLeft, busTop),
        size = Size(w * 0.14f, h * 0.16f),
        cornerRadius = CornerRadius(8f, 8f)
    )
    drawRoundRect(
        color = neon,
        topLeft = Offset(busLeft, busTop),
        size = Size(w * 0.14f, h * 0.16f),
        cornerRadius = CornerRadius(8f, 8f),
        style = Stroke(width = 2.2f)
    )
    drawRoundRect(
        color = Color(0xAA9CEEFF),
        topLeft = Offset(busLeft + 6f, busTop + 5f),
        size = Size(w * 0.10f, h * 0.06f),
        cornerRadius = CornerRadius(4f, 4f)
    )
}
