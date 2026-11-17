package com.smartemobility.hub.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val HubLightColorScheme = lightColorScheme(
    primary = HubColors.RoyalBlue,
    onPrimary = Color.White,
    primaryContainer = HubColors.TileBlueBg,
    onPrimaryContainer = HubColors.DeepBlueBadge,
    secondary = HubColors.PrimaryCyan,
    onSecondary = Color.White,
    secondaryContainer = HubColors.NavActivePill,
    onSecondaryContainer = HubColors.NavActiveContent,
    background = HubColors.CanvasBackground,
    onBackground = HubColors.TextPrimary,
    surface = HubColors.CardSurface,
    onSurface = HubColors.TextPrimary,
    surfaceVariant = HubColors.CardSurfaceElevated,
    onSurfaceVariant = HubColors.TextSecondary,
    outline = HubColors.CardBorder,
    error = HubColors.ErrorFg,
    onError = Color.White
)

@Composable
fun SmartEMobilityTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = HubLightColorScheme,
        typography = HubTypography,
        content = content
    )
}
