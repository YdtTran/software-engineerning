package com.smartemobility.hub

import android.app.Activity
import android.graphics.Color as AndroidColor
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.SystemBarStyle
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.smartemobility.hub.ui.MainViewModel
import com.smartemobility.hub.ui.SubScreen
import com.smartemobility.hub.ui.components.HubBottomNavBar
import com.smartemobility.hub.ui.components.MainTab
import com.smartemobility.hub.ui.screens.AccountScreen
import com.smartemobility.hub.ui.screens.ChargingScreen
import com.smartemobility.hub.ui.screens.HistoryScreen
import com.smartemobility.hub.ui.screens.HomeScreen
import com.smartemobility.hub.ui.screens.LoginDialog
import com.smartemobility.hub.ui.screens.MapScreen
import com.smartemobility.hub.ui.screens.NotificationsScreen
import com.smartemobility.hub.ui.screens.ParkingScreen
import com.smartemobility.hub.ui.screens.ProfileDialog
import com.smartemobility.hub.ui.screens.RentalScreen
import com.smartemobility.hub.ui.screens.ServerSettingsDialog
import com.smartemobility.hub.ui.screens.SupportDialog
import com.smartemobility.hub.ui.theme.HubColors
import com.smartemobility.hub.ui.theme.SmartEMobilityTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge(
            statusBarStyle = SystemBarStyle.dark(AndroidColor.TRANSPARENT),
            navigationBarStyle = SystemBarStyle.light(AndroidColor.TRANSPARENT, AndroidColor.TRANSPARENT)
        )
        setContent {
            SmartEMobilityTheme {
                SmartEMobilityApp()
            }
        }
    }
}

@Composable
fun SmartEMobilityApp(viewModel: MainViewModel = viewModel()) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    val isFullScreenMap = state.activeSubScreen == null && state.currentTab == MainTab.MAP
    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as? Activity)?.window ?: return@SideEffect
            WindowCompat.getInsetsController(window, view).isAppearanceLightStatusBars = isFullScreenMap
        }
    }

    BackHandler(enabled = state.activeSubScreen != null) {
        viewModel.closeSubScreen()
    }

    Scaffold(
        containerColor = HubColors.CanvasBackground,
        bottomBar = {
            if (state.activeSubScreen == null) {
                HubBottomNavBar(
                    currentTab = state.currentTab,
                    notificationCount = state.activeNotificationCount,
                    onSelectTab = viewModel::selectTab
                )
            }
        }
    ) { innerPadding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(bottom = innerPadding.calculateBottomPadding())
        ) {
            when (state.activeSubScreen) {
                SubScreen.RENTAL -> RentalScreen(
                    state = state,
                    onBack = viewModel::closeSubScreen,
                    onRefresh = viewModel::refreshAll,
                    onSelectHub = { hubId -> viewModel.selectHubForRental(hubId) },
                    onSelectTypeFilter = { filter ->
                        viewModel.selectHubForRental(state.selectedHubId, filter)
                    },
                    onReserveVehicle = viewModel::reserveVehicle,
                    onCancelReservation = viewModel::cancelVehicleReservation,
                    onPickupVehicle = viewModel::pickupVehicle,
                    onLoadReturnSlots = viewModel::loadReturnSlots,
                    onReturnTrip = viewModel::returnTrip,
                    onReportIncident = viewModel::reportTripIncident
                )

                SubScreen.PARKING -> ParkingScreen(
                    state = state,
                    onBack = viewModel::closeSubScreen,
                    onRefresh = viewModel::refreshAll,
                    onCheckAvailability = viewModel::loadParkingAvailability,
                    onReserveParking = viewModel::reserveParking,
                    onCancelReservation = viewModel::cancelParkingReservation,
                    onCheckIn = viewModel::checkInParking,
                    onCheckOut = viewModel::checkOutParking,
                    onDismissQueuedChargingDialog = viewModel::dismissQueuedChargingDialog,
                    onOpenCharging = { viewModel.openSubScreen(SubScreen.CHARGING) }
                )

                SubScreen.CHARGING -> ChargingScreen(
                    state = state,
                    onBack = viewModel::closeSubScreen,
                    onRefresh = viewModel::refreshAll,
                    onOpenParking = { viewModel.openSubScreen(SubScreen.PARKING) },
                    onSubmitCharging = viewModel::submitChargingRequest,
                    onCancelRequest = viewModel::cancelChargingRequest,
                    onStopSession = viewModel::stopChargingSession
                )

                SubScreen.HISTORY -> HistoryScreen(
                    state = state,
                    onBack = viewModel::closeSubScreen,
                    onRefresh = viewModel::refreshAll
                )

                null -> when (state.currentTab) {
                    MainTab.HOME -> HomeScreen(
                        state = state,
                        onOpenTab = viewModel::selectTab,
                        onOpenSubScreen = { viewModel.openSubScreen(it) },
                        onOpenLogin = { viewModel.setLoginDialog(true) }
                    )

                    MainTab.MAP -> MapScreen(
                        state = state,
                        onSearchHubs = viewModel::searchHubs,
                        onSelectMapHub = viewModel::selectMapHub,
                        onUseGpsOrigin = viewModel::useGpsOrigin,
                        onSelectOrigin = viewModel::setSelectedOrigin,
                        onSelectRadiusFilter = viewModel::setRadiusFilter,
                        onSearchPhoton = viewModel::searchPhotonPlaces,
                        onClearPhoton = viewModel::clearPhotonSearch,
                        onRequestRoute = viewModel::requestRouteToHub,
                        onClearRoute = viewModel::clearRoute,
                        onOpenRentalAtHub = { hubId -> viewModel.openSubScreen(SubScreen.RENTAL, hubId) },
                        onOpenParkingAtHub = { hubId -> viewModel.openSubScreen(SubScreen.PARKING, hubId) },
                        onOpenLogin = { viewModel.setLoginDialog(true) }
                    )

                    MainTab.NOTIFICATIONS -> NotificationsScreen(
                        state = state,
                        onRefresh = viewModel::refreshAll,
                        onOpenSubScreen = { viewModel.openSubScreen(it) },
                        onRetryPending = viewModel::retryPendingCommand,
                        onDiscardPending = viewModel::discardPendingCommand,
                        onOpenLogin = { viewModel.setLoginDialog(true) }
                    )

                    MainTab.ACCOUNT -> AccountScreen(
                        state = state,
                        onOpenLogin = { viewModel.setLoginDialog(true) },
                        onLogout = viewModel::logout,
                        onOpenProfile = { viewModel.setProfileDialog(true) },
                        onOpenHistory = { viewModel.openSubScreen(SubScreen.HISTORY) },
                        onOpenSettings = { viewModel.setSettingsDialog(true) },
                        onOpenSupport = { viewModel.setSupportDialog(true) }
                    )
                }
            }

            if (state.isBusy) {
                LinearProgressIndicator(
                    modifier = Modifier
                        .fillMaxWidth()
                        .statusBarsPadding()
                        .align(Alignment.TopCenter),
                    color = HubColors.SkylineHorizonGlow
                )
            }
        }
    }

    if (state.showLoginDialog) {
        LoginDialog(
            state = state,
            onDismiss = { viewModel.setLoginDialog(false) },
            onLogin = viewModel::login,
            onOpenSettings = { viewModel.setSettingsDialog(true) }
        )
    }
    if (state.showSettingsDialog) {
        ServerSettingsDialog(
            currentUrl = state.serverUrl,
            onDismiss = { viewModel.setSettingsDialog(false) },
            onSaveUrl = { url -> viewModel.updateServerUrl(url) }
        )
    }
    if (state.showProfileDialog) {
        ProfileDialog(
            state = state,
            onDismiss = { viewModel.setProfileDialog(false) }
        )
    }
    if (state.showSupportDialog) {
        SupportDialog(onDismiss = { viewModel.setSupportDialog(false) })
    }
}
