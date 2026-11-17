package com.smartemobility.hub.ui.screens

import android.Manifest
import android.annotation.SuppressLint
import android.content.Context
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.Path
import android.location.Location
import android.location.LocationManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.spring
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectVerticalDragGestures
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.DirectionsBike
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Directions
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material.icons.filled.KeyboardArrowUp
import androidx.compose.material.icons.filled.LocalParking
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.MyLocation
import androidx.compose.material.icons.filled.NearMe
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Remove
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.outlined.LocationOn
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.input.nestedscroll.NestedScrollConnection
import androidx.compose.ui.input.nestedscroll.NestedScrollSource
import androidx.compose.ui.input.nestedscroll.nestedScroll
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.LocalSoftwareKeyboardController
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.Velocity
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import com.smartemobility.hub.data.model.HubDistanceUtils
import com.smartemobility.hub.data.model.HubDto
import com.smartemobility.hub.data.model.HubGeoCatalog
import com.smartemobility.hub.data.model.HubRadiusFilter
import com.smartemobility.hub.data.model.OriginSource
import com.smartemobility.hub.data.model.RankedHub
import com.smartemobility.hub.data.model.SelectedOrigin
import com.smartemobility.hub.data.network.OsrmRouteResult
import com.smartemobility.hub.data.network.PhotonPlaceSuggestion
import com.smartemobility.hub.data.network.RoutePoint
import com.smartemobility.hub.ui.HubUiState
import com.smartemobility.hub.ui.components.FeedbackBanner
import com.smartemobility.hub.ui.components.StatusBadge
import com.smartemobility.hub.ui.theme.HubColors
import kotlinx.coroutines.launch
import org.maplibre.android.MapLibre
import org.maplibre.android.camera.CameraPosition
import org.maplibre.android.camera.CameraUpdateFactory
import org.maplibre.android.geometry.LatLng
import org.maplibre.android.geometry.LatLngBounds
import org.maplibre.android.maps.MapLibreMap
import org.maplibre.android.maps.MapView
import org.maplibre.android.maps.Style
import org.maplibre.android.style.expressions.Expression
import org.maplibre.android.style.layers.LineLayer
import org.maplibre.android.style.layers.Property
import org.maplibre.android.style.layers.PropertyFactory
import org.maplibre.android.style.layers.SymbolLayer
import org.maplibre.android.style.sources.GeoJsonSource
import org.maplibre.geojson.Feature
import org.maplibre.geojson.FeatureCollection
import org.maplibre.geojson.LineString
import org.maplibre.geojson.Point
import kotlin.math.abs

private const val OPEN_FREE_MAP_BRIGHT_STYLE = "https://tiles.openfreemap.org/styles/bright"
private const val HUB_SOURCE_ID = "hubs-source"
private const val HUB_LAYER_ID = "hubs-layer"
private const val ORIGIN_SOURCE_ID = "origin-source"
private const val ORIGIN_LAYER_ID = "origin-layer"
private const val ROUTE_SOURCE_ID = "osrm-route-source"
private const val ROUTE_LAYER_ID = "osrm-route-layer"
private const val HUB_PIN_NORMAL_ID = "hub-pin-normal"
private const val HUB_PIN_SELECTED_ID = "hub-pin-selected"
private const val ORIGIN_PIN_ID = "origin-dot-pin"

private enum class SheetDetent(val fraction: Float) {
    COLLAPSED(0.22f),
    HALF_EXPANDED(0.48f),
    EXPANDED(0.85f)
}

@Composable
fun MapScreen(
    state: HubUiState,
    onSearchHubs: (String) -> Unit,
    onSelectMapHub: (String?) -> Unit,
    onUseGpsOrigin: (RoutePoint?, Boolean) -> Unit,
    onSelectOrigin: (SelectedOrigin) -> Unit,
    onSelectRadiusFilter: (HubRadiusFilter) -> Unit,
    onSearchPhoton: (String) -> Unit,
    onClearPhoton: () -> Unit,
    onRequestRoute: (HubDto) -> Unit,
    onClearRoute: () -> Unit,
    onOpenRentalAtHub: (String) -> Unit,
    onOpenParkingAtHub: (String) -> Unit,
    onOpenLogin: () -> Unit,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val density = LocalDensity.current
    val scope = rememberCoroutineScope()
    val keyboardController = LocalSoftwareKeyboardController.current
    val listState = rememberLazyListState()

    var searchInput by remember(state.hubSearchQuery) { mutableStateOf(state.hubSearchQuery) }
    var currentDetent by remember { mutableStateOf(SheetDetent.HALF_EXPANDED) }
    var showOriginPicker by remember { mutableStateOf(false) }
    var isPickingOriginOnMap by remember { mutableStateOf(false) }
    var mapLibreController by remember { mutableStateOf<MapLibreMap?>(null) }
    var pickedMapCenter by remember {
        mutableStateOf(RoutePoint(state.selectedOrigin.lat, state.selectedOrigin.lng))
    }

    val locationPermissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestMultiplePermissions()
    ) { grants ->
        val granted = grants[Manifest.permission.ACCESS_FINE_LOCATION] == true ||
            grants[Manifest.permission.ACCESS_COARSE_LOCATION] == true
        onUseGpsOrigin(if (granted) readLastKnownLocationOrNull(context) else null, true)
    }

    // Initialize origin once from GPS if permission is already granted (else ĐHQG fallback).
    LaunchedEffect(Unit) {
        val gps = if (hasLocationPermission(context)) readLastKnownLocationOrNull(context) else null
        onUseGpsOrigin(gps, false)
    }

    val effectiveHubs = remember(state.hubs) {
        state.hubs.ifEmpty {
            listOf(
                HubDto("metro", "Ga Metro ĐHQG"),
                HubDto("bku", "ĐH Bách khoa · Cơ sở 2"),
                HubDto("dorm-a", "Ký túc xá khu A"),
                HubDto("library", "Thư viện Trung tâm")
            )
        }
    }

    // Compute distances locally via android.location.Location.distanceBetween (never batch-calling OSRM).
    val rankedAllHubs = remember(effectiveHubs, state.selectedOrigin) {
        HubDistanceUtils.rankHubs(
            hubs = effectiveHubs,
            origin = state.selectedOrigin,
            filter = HubRadiusFilter.ALL
        )
    }
    val rankedFilteredHubs = remember(rankedAllHubs, state.radiusFilter) {
        rankedAllHubs.filter { ranked ->
            state.radiusFilter.maxMeters?.let { max -> ranked.distanceMeters <= max } ?: true
        }
    }

    val peekRankedHub = remember(state.selectedMapHubId, rankedAllHubs, rankedFilteredHubs) {
        rankedFilteredHubs.firstOrNull { it.hub.id == state.selectedMapHubId }
            ?: rankedAllHubs.firstOrNull { it.hub.id == state.selectedMapHubId }
            ?: rankedFilteredHubs.firstOrNull()
            ?: rankedAllHubs.firstOrNull()
    }

    fun requestGpsOriginExplicit() {
        showOriginPicker = false
        onClearPhoton()
        if (hasLocationPermission(context)) {
            onUseGpsOrigin(readLastKnownLocationOrNull(context), true)
        } else {
            locationPermissionLauncher.launch(
                arrayOf(
                    Manifest.permission.ACCESS_FINE_LOCATION,
                    Manifest.permission.ACCESS_COARSE_LOCATION
                )
            )
        }
    }

    BoxWithConstraints(
        modifier = modifier
            .fillMaxSize()
            .background(HubColors.CanvasBackground)
    ) {
        val totalHeightPx = with(density) { maxHeight.toPx() }.coerceAtLeast(1f)
        val collapsedHeightPx = totalHeightPx * SheetDetent.COLLAPSED.fraction
        val halfHeightPx = totalHeightPx * SheetDetent.HALF_EXPANDED.fraction
        val expandedHeightPx = totalHeightPx * SheetDetent.EXPANDED.fraction

        val sheetHeightAnim = remember(totalHeightPx) { Animatable(halfHeightPx) }

        fun heightFor(detent: SheetDetent): Float = when (detent) {
            SheetDetent.COLLAPSED -> collapsedHeightPx
            SheetDetent.HALF_EXPANDED -> halfHeightPx
            SheetDetent.EXPANDED -> expandedHeightPx
        }

        fun snapTo(detent: SheetDetent) {
            currentDetent = detent
            scope.launch {
                sheetHeightAnim.animateTo(
                    targetValue = heightFor(detent),
                    animationSpec = spring(stiffness = Spring.StiffnessMediumLow)
                )
            }
        }

        fun settleFromCurrentHeight(velocityY: Float = 0f) {
            val current = sheetHeightAnim.value
            val target = when {
                velocityY < -750f -> when (currentDetent) {
                    SheetDetent.COLLAPSED -> SheetDetent.HALF_EXPANDED
                    SheetDetent.HALF_EXPANDED, SheetDetent.EXPANDED -> SheetDetent.EXPANDED
                }
                velocityY > 750f -> when (currentDetent) {
                    SheetDetent.EXPANDED -> SheetDetent.HALF_EXPANDED
                    SheetDetent.HALF_EXPANDED, SheetDetent.COLLAPSED -> SheetDetent.COLLAPSED
                }
                else -> SheetDetent.entries.minBy { abs(heightFor(it) - current) }
            }
            snapTo(target)
        }

        // Always reveal the #1 nearest Hub at the top when origin or radius filter changes.
        LaunchedEffect(state.selectedOrigin, state.radiusFilter) {
            if (rankedFilteredHubs.isNotEmpty()) {
                listState.scrollToItem(0)
            }
        }

        // Scroll sorted Hub list smoothly when user clicks a Hub marker on the map.
        LaunchedEffect(state.selectedMapHubId, rankedFilteredHubs) {
            val selectedId = state.selectedMapHubId ?: return@LaunchedEffect
            val index = rankedFilteredHubs.indexOfFirst { it.hub.id == selectedId }
            if (index >= 0 && currentDetent != SheetDetent.COLLAPSED) {
                listState.animateScrollToItem(index)
            }
        }

        fun triggerDirectionsFor(hub: HubDto) {
            // Collapse sheet to 22% peek so the full OSRM Polyline and LatLngBounds stand out clearly.
            snapTo(SheetDetent.COLLAPSED)
            onRequestRoute(hub)
        }

        val pickTopReserveDp = 112.dp
        val pickBottomReserveDp = 128.dp
        val topReserveDp: Dp = if (isPickingOriginOnMap) {
            pickTopReserveDp
        } else {
            134.dp + if (state.activeRoute != null || state.isLoadingRoute) 104.dp else 0.dp
        }
        val topControlsReservePx = with(density) { topReserveDp.toPx() }.toInt()
        val bottomMapPaddingPx = if (isPickingOriginOnMap) {
            with(density) { pickBottomReserveDp.toPx() }.toInt()
        } else {
            heightFor(currentDetent).toInt()
        }

        // 1. Full-screen MapLibre + OpenFreeMap canvas
        MapLibreHubCanvas(
            hubs = effectiveHubs,
            selectedOrigin = state.selectedOrigin,
            selectedHubId = state.selectedMapHubId,
            activeRoute = state.activeRoute,
            isLoadingRoute = state.isLoadingRoute,
            isPickingOriginOnMap = isPickingOriginOnMap,
            topMapPaddingPx = topControlsReservePx,
            bottomMapPaddingPx = bottomMapPaddingPx,
            onMapReady = { map -> mapLibreController = map },
            onMarkerClicked = { hubId -> onSelectMapHub(hubId) },
            onCameraCenterChanged = { pt -> pickedMapCenter = pt },
            modifier = Modifier.fillMaxSize()
        )

        // Top white gradient fade keeps dark status-bar icons legible over bright OpenFreeMap tiles.
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(64.dp)
                .background(
                    Brush.verticalGradient(
                        colors = listOf(Color(0xC2FFFFFF), Color.Transparent)
                    )
                )
        )

        val currentFraction = sheetHeightAnim.value / totalHeightPx
        val showFloatingBanners = !isPickingOriginOnMap && currentFraction < 0.72f

        // 2. Top Floating Controls (Origin Bar + Search Hub + OSRM Banner, or Map Pick instruction)
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .statusBarsPadding()
                .padding(horizontal = 16.dp, vertical = 8.dp)
                .align(Alignment.TopCenter)
        ) {
            if (isPickingOriginOnMap) {
                Surface(
                    shape = RoundedCornerShape(18.dp),
                    color = HubColors.CardSurfaceElevated.copy(alpha = 0.98f),
                    shadowElevation = 8.dp,
                    border = BorderStroke(1.5.dp, HubColors.RoyalBlue),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 14.dp, vertical = 10.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = "Chọn vị trí xuất phát trên bản đồ",
                                fontWeight = FontWeight.Bold,
                                fontSize = 14.sp,
                                color = HubColors.RoyalBlue
                            )
                            Text(
                                text = "Chạm điểm bất kỳ hoặc kéo bản đồ tới điểm đi",
                                fontSize = 12.sp,
                                color = HubColors.TextSecondary
                            )
                        }
                        TextButton(onClick = { isPickingOriginOnMap = false }) {
                            Text("Hủy", fontWeight = FontWeight.SemiBold)
                        }
                    }
                }
            } else {
                FloatingOriginAndSearchCard(
                    origin = state.selectedOrigin,
                    searchInput = searchInput,
                    onOpenOriginPicker = {
                        onClearPhoton()
                        showOriginPicker = true
                    },
                    onSearchChange = {
                        searchInput = it
                        if (it.isBlank()) onSearchHubs("")
                    },
                    onSearchSubmit = {
                        keyboardController?.hide()
                        onSearchHubs(searchInput)
                    },
                    onClearSearch = {
                        searchInput = ""
                        onSearchHubs("")
                    }
                )

                AnimatedVisibility(
                    visible = showFloatingBanners,
                    enter = fadeIn(),
                    exit = fadeOut()
                ) {
                    Column {
                        if (!state.errorMessage.isNullOrBlank()) {
                            Spacer(modifier = Modifier.height(8.dp))
                            FeedbackBanner(message = state.errorMessage, isError = true)
                        }
                        if (state.isLoadingRoute) {
                            Spacer(modifier = Modifier.height(8.dp))
                            RouteLoadingBanner()
                        } else if (state.activeRoute != null) {
                            Spacer(modifier = Modifier.height(8.dp))
                            ActiveRouteBanner(
                                originLabel = state.selectedOrigin.label,
                                hubName = state.activeRouteHubName ?: "Hub",
                                route = state.activeRoute,
                                onClear = onClearRoute
                            )
                        }
                    }
                }
            }
        }

        // Crosshair pin centered inside the unpadded map picking region (matches camera target).
        if (isPickingOriginOnMap) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(top = pickTopReserveDp, bottom = pickBottomReserveDp),
                contentAlignment = Alignment.Center
            ) {
                Box(
                    modifier = Modifier
                        .size(10.dp)
                        .background(Color.White, CircleShape)
                        .padding(2.dp)
                        .background(HubColors.RoyalBlue, CircleShape)
                )
                Icon(
                    imageVector = Icons.Filled.LocationOn,
                    contentDescription = "Tâm chọn vị trí",
                    tint = HubColors.RoyalBlue,
                    modifier = Modifier
                        .size(42.dp)
                        .offset(y = (-20).dp)
                )
            }
        }

        // 3. Floating Map Controls (+, -, GPS) positioned cleanly above Bottom Sheet / Pick bar
        val controlsBottomDp = if (isPickingOriginOnMap) {
            pickBottomReserveDp + 10.dp
        } else {
            with(density) { sheetHeightAnim.value.toDp() } + 12.dp
        }
        AnimatedVisibility(
            visible = isPickingOriginOnMap || showFloatingBanners,
            enter = fadeIn(),
            exit = fadeOut(),
            modifier = Modifier
                .align(Alignment.BottomEnd)
                .padding(end = 14.dp, bottom = controlsBottomDp)
        ) {
            MapFloatingControls(
                onZoomIn = { mapLibreController?.animateCamera(CameraUpdateFactory.zoomIn(), 250) },
                onZoomOut = { mapLibreController?.animateCamera(CameraUpdateFactory.zoomOut(), 250) },
                onCenterGps = {
                    if (isPickingOriginOnMap) {
                        val gps = if (hasLocationPermission(context)) readLastKnownLocationOrNull(context) else null
                        val target = gps?.takeIf {
                            abs(it.lat - HubGeoCatalog.defaultCenter.lat) < 1.0 &&
                                abs(it.lng - HubGeoCatalog.defaultCenter.lng) < 1.0
                        } ?: RoutePoint(HubGeoCatalog.defaultCenter.lat, HubGeoCatalog.defaultCenter.lng)
                        pickedMapCenter = target
                        mapLibreController?.animateCamera(
                            CameraUpdateFactory.newLatLngZoom(LatLng(target.lat, target.lng), 15.8),
                            450
                        )
                    } else {
                        requestGpsOriginExplicit()
                        mapLibreController?.animateCamera(
                            CameraUpdateFactory.newLatLngZoom(
                                LatLng(state.selectedOrigin.lat, state.selectedOrigin.lng),
                                15.5
                            ),
                            450
                        )
                    }
                }
            )
        }

        // 4. Either Map-Pick Confirmation Bar OR 3-Detent Draggable Hub Bottom Sheet
        if (isPickingOriginOnMap) {
            Surface(
                shape = RoundedCornerShape(topStart = 22.dp, topEnd = 22.dp),
                color = HubColors.CanvasBackground,
                shadowElevation = 14.dp,
                border = BorderStroke(1.dp, HubColors.CardBorder),
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .fillMaxWidth()
            ) {
                Column(
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp)
                ) {
                    Text(
                        text = "Điểm chọn: ${"%.5f".format(pickedMapCenter.lat)}, ${"%.5f".format(pickedMapCenter.lng)}",
                        fontSize = 13.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = HubColors.TextPrimary
                    )
                    Spacer(modifier = Modifier.height(10.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        OutlinedButton(
                            onClick = { isPickingOriginOnMap = false },
                            shape = RoundedCornerShape(14.dp),
                            modifier = Modifier.height(44.dp)
                        ) {
                            Text("Hủy")
                        }
                        Button(
                            onClick = {
                                onSelectOrigin(
                                    SelectedOrigin(
                                        label = "Điểm chọn trên bản đồ",
                                        lat = pickedMapCenter.lat,
                                        lng = pickedMapCenter.lng,
                                        source = OriginSource.MAP_PICK
                                    )
                                )
                                isPickingOriginOnMap = false
                                snapTo(SheetDetent.HALF_EXPANDED)
                            },
                            shape = RoundedCornerShape(14.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = HubColors.RoyalBlue),
                            modifier = Modifier
                                .weight(1f)
                                .height(44.dp)
                        ) {
                            Text("Xác nhận vị trí này", fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        } else {
            val nestedScrollConnection = remember(collapsedHeightPx, expandedHeightPx) {
                object : NestedScrollConnection {
                    override fun onPreScroll(available: Offset, source: NestedScrollSource): Offset {
                        val delta = available.y
                        if (delta < 0f && sheetHeightAnim.value < expandedHeightPx) {
                            val next = (sheetHeightAnim.value - delta).coerceIn(collapsedHeightPx, expandedHeightPx)
                            val consumed = sheetHeightAnim.value - next
                            scope.launch { sheetHeightAnim.snapTo(next) }
                            return Offset(0f, consumed)
                        }
                        return Offset.Zero
                    }

                    override fun onPostScroll(
                        consumed: Offset,
                        available: Offset,
                        source: NestedScrollSource
                    ): Offset {
                        val delta = available.y
                        if (delta > 0f && sheetHeightAnim.value > collapsedHeightPx) {
                            val next = (sheetHeightAnim.value - delta).coerceIn(collapsedHeightPx, expandedHeightPx)
                            val used = sheetHeightAnim.value - next
                            scope.launch { sheetHeightAnim.snapTo(next) }
                            return Offset(0f, used)
                        }
                        return Offset.Zero
                    }

                    override suspend fun onPostFling(consumed: Velocity, available: Velocity): Velocity {
                        if (abs(sheetHeightAnim.value - heightFor(currentDetent)) > 6f) {
                            settleFromCurrentHeight(available.y)
                        }
                        return Velocity.Zero
                    }
                }
            }

            val currentHeightDp = with(density) { sheetHeightAnim.value.toDp() }
            Surface(
                shape = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp),
                color = HubColors.CanvasBackground,
                shadowElevation = 14.dp,
                border = BorderStroke(1.dp, HubColors.CardBorder),
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .fillMaxWidth()
                    .height(currentHeightDp)
            ) {
                Column(modifier = Modifier.fillMaxSize()) {
                    // Drag handle & sheet header
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .pointerInput(collapsedHeightPx, expandedHeightPx) {
                                detectVerticalDragGestures(
                                    onDragEnd = { settleFromCurrentHeight() },
                                    onDragCancel = { settleFromCurrentHeight() },
                                    onVerticalDrag = { change, dragAmount ->
                                        change.consume()
                                        val next = (sheetHeightAnim.value - dragAmount)
                                            .coerceIn(collapsedHeightPx, expandedHeightPx)
                                        scope.launch { sheetHeightAnim.snapTo(next) }
                                    }
                                )
                            }
                            .clickable {
                                snapTo(
                                    when (currentDetent) {
                                        SheetDetent.COLLAPSED -> SheetDetent.HALF_EXPANDED
                                        SheetDetent.HALF_EXPANDED -> SheetDetent.EXPANDED
                                        SheetDetent.EXPANDED -> SheetDetent.HALF_EXPANDED
                                    }
                                )
                            }
                            .padding(
                                top = if (currentDetent == SheetDetent.COLLAPSED) 8.dp else 10.dp,
                                bottom = if (currentDetent == SheetDetent.COLLAPSED) 6.dp else 8.dp,
                                start = 16.dp,
                                end = 16.dp
                            ),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Box(
                            modifier = Modifier
                                .width(42.dp)
                                .height(4.5.dp)
                                .background(Color(0xFFB4C2DB), CircleShape)
                        )
                        Spacer(modifier = Modifier.height(if (currentDetent == SheetDetent.COLLAPSED) 6.dp else 8.dp))
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = "Danh sách Hub gần bạn",
                                    fontSize = if (currentDetent == SheetDetent.COLLAPSED) 15.sp else 17.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = HubColors.TextPrimary
                                )
                                if (currentDetent != SheetDetent.COLLAPSED) {
                                    Text(
                                        text = "Sắp xếp gần nhất từ ${state.selectedOrigin.label}",
                                        fontSize = 12.sp,
                                        color = HubColors.TextSecondary,
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis
                                    )
                                }
                            }
                            Surface(
                                shape = CircleShape,
                                color = HubColors.CardSurface,
                                modifier = Modifier.size(30.dp)
                            ) {
                                Box(contentAlignment = Alignment.Center) {
                                    Icon(
                                        imageVector = if (currentDetent == SheetDetent.EXPANDED) {
                                            Icons.Filled.KeyboardArrowDown
                                        } else {
                                            Icons.Filled.KeyboardArrowUp
                                        },
                                        contentDescription = "Mở rộng hoặc thu gọn danh sách",
                                        tint = HubColors.RoyalBlue,
                                        modifier = Modifier.size(19.dp)
                                    )
                                }
                            }
                        }
                    }

                    // Sheet body
                    if (state.user == null) {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 20.dp, vertical = 8.dp),
                            horizontalAlignment = Alignment.Start
                        ) {
                            Text(
                                text = "Đăng nhập để xem Hub",
                                fontSize = 15.sp,
                                fontWeight = FontWeight.Medium,
                                color = HubColors.TextPrimary
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                            Button(
                                onClick = onOpenLogin,
                                shape = RoundedCornerShape(50),
                                colors = ButtonDefaults.buttonColors(containerColor = HubColors.RoyalBlue)
                            ) {
                                Text("Đăng nhập")
                            }
                        }
                    } else if (currentDetent == SheetDetent.COLLAPSED) {
                        if (peekRankedHub != null) {
                            HubListCard(
                                ranked = peekRankedHub,
                                isSelected = true,
                                compact = true,
                                onSelect = { snapTo(SheetDetent.HALF_EXPANDED) },
                                onOpenRental = { onOpenRentalAtHub(peekRankedHub.hub.id) },
                                onOpenParking = { onOpenParkingAtHub(peekRankedHub.hub.id) },
                                onDirections = { triggerDirectionsFor(peekRankedHub.hub) },
                                modifier = Modifier.padding(horizontal = 14.dp)
                            )
                        } else {
                            Text(
                                text = "Không tìm thấy Hub phù hợp.",
                                color = HubColors.TextSecondary,
                                fontSize = 13.sp,
                                modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
                            )
                        }
                    } else {
                        // Radius Filter Chips right at top of Bottom Sheet
                        RadiusFilterChipStrip(
                            selectedFilter = state.radiusFilter,
                            onSelectFilter = onSelectRadiusFilter
                        )

                        if (state.hubs.isEmpty()) {
                            Text(
                                text = "Không tìm thấy Hub phù hợp với từ khóa.",
                                color = HubColors.TextSecondary,
                                fontSize = 13.sp,
                                modifier = Modifier.padding(horizontal = 16.dp, vertical = 10.dp)
                            )
                        } else if (rankedFilteredHubs.isEmpty()) {
                            Text(
                                text = "Không có Hub nào trong bán kính ${state.radiusFilter.label.lowercase()}. Thử chọn 'Gần nhất (Tất cả)'.",
                                color = HubColors.TextSecondary,
                                fontSize = 13.sp,
                                modifier = Modifier.padding(horizontal = 16.dp, vertical = 10.dp)
                            )
                        } else {
                            LazyColumn(
                                state = listState,
                                modifier = Modifier
                                    .fillMaxSize()
                                    .nestedScroll(nestedScrollConnection),
                                contentPadding = PaddingValues(start = 14.dp, end = 14.dp, top = 4.dp, bottom = 16.dp),
                                verticalArrangement = Arrangement.spacedBy(10.dp)
                            ) {
                                items(rankedFilteredHubs, key = { it.hub.id }) { ranked ->
                                    HubListCard(
                                        ranked = ranked,
                                        isSelected = state.selectedMapHubId == ranked.hub.id,
                                        compact = false,
                                        onSelect = { triggerDirectionsFor(ranked.hub) },
                                        onOpenRental = { onOpenRentalAtHub(ranked.hub.id) },
                                        onOpenParking = { onOpenParkingAtHub(ranked.hub.id) },
                                        onDirections = { triggerDirectionsFor(ranked.hub) }
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    if (showOriginPicker) {
        OriginPickerDialog(
            currentOrigin = state.selectedOrigin,
            suggestions = state.photonSuggestions,
            isSearching = state.isSearchingPhoton,
            errorMessage = state.photonError,
            onDismiss = {
                showOriginPicker = false
                onClearPhoton()
            },
            onSelectGps = { requestGpsOriginExplicit() },
            onStartMapPick = {
                showOriginPicker = false
                onClearPhoton()
                pickedMapCenter = RoutePoint(state.selectedOrigin.lat, state.selectedOrigin.lng)
                isPickingOriginOnMap = true
                mapLibreController?.animateCamera(
                    CameraUpdateFactory.newLatLngZoom(
                        LatLng(state.selectedOrigin.lat, state.selectedOrigin.lng),
                        15.8
                    ),
                    400
                )
            },
            onSearchQueryChange = onSearchPhoton,
            onSelectSuggestion = { item ->
                showOriginPicker = false
                onSelectOrigin(
                    SelectedOrigin(
                        label = item.name,
                        lat = item.lat,
                        lng = item.lng,
                        source = OriginSource.SEARCH
                    )
                )
            }
        )
    }
}

@Composable
private fun FloatingOriginAndSearchCard(
    origin: SelectedOrigin,
    searchInput: String,
    onOpenOriginPicker: () -> Unit,
    onSearchChange: (String) -> Unit,
    onSearchSubmit: () -> Unit,
    onClearSearch: () -> Unit
) {
    Surface(
        shape = RoundedCornerShape(18.dp),
        color = Color.White.copy(alpha = 0.97f),
        shadowElevation = 8.dp,
        border = BorderStroke(1.dp, HubColors.CardBorder),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.fillMaxWidth()) {
            // Top bar: "Vị trí của bạn: [Tên vị trí hiện tại]"
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable(onClick = onOpenOriginPicker)
                    .padding(horizontal = 12.dp, vertical = 10.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Box(
                    modifier = Modifier
                        .size(20.dp)
                        .background(HubColors.InfoBg, CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    Box(
                        modifier = Modifier
                            .size(10.dp)
                            .background(HubColors.RoyalBlue, CircleShape)
                    )
                }
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = buildAnnotatedString {
                        withStyle(SpanStyle(color = HubColors.TextSecondary, fontWeight = FontWeight.Medium)) {
                            append("Vị trí của bạn: ")
                        }
                        withStyle(SpanStyle(color = HubColors.TextPrimary, fontWeight = FontWeight.Bold)) {
                            append(origin.label)
                        }
                    },
                    fontSize = 13.sp,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.weight(1f)
                )
                Spacer(modifier = Modifier.width(6.dp))
                Surface(
                    shape = RoundedCornerShape(8.dp),
                    color = HubColors.InfoBg
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 7.dp, vertical = 3.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "Đổi",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = HubColors.RoyalBlue
                        )
                        Icon(
                            imageVector = Icons.Filled.KeyboardArrowDown,
                            contentDescription = "Đổi vị trí xuất phát",
                            tint = HubColors.RoyalBlue,
                            modifier = Modifier.size(15.dp)
                        )
                    }
                }
            }

            HorizontalDivider(thickness = 1.dp, color = HubColors.DividerSubtle.copy(alpha = 0.7f))

            // Compact inline Hub search input
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(40.dp)
                    .padding(horizontal = 12.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    imageVector = Icons.Filled.Search,
                    contentDescription = "Tìm Hub",
                    tint = HubColors.TextSecondary,
                    modifier = Modifier.size(18.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Box(
                    modifier = Modifier.weight(1f),
                    contentAlignment = Alignment.CenterStart
                ) {
                    if (searchInput.isEmpty()) {
                        Text(
                            text = "Tìm Hub theo tên hoặc mã...",
                            color = HubColors.TextMuted,
                            fontSize = 13.sp
                        )
                    }
                    BasicTextField(
                        value = searchInput,
                        onValueChange = onSearchChange,
                        singleLine = true,
                        textStyle = TextStyle(
                            color = HubColors.TextPrimary,
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Medium
                        ),
                        cursorBrush = SolidColor(HubColors.RoyalBlue),
                        keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
                        keyboardActions = KeyboardActions(onSearch = { onSearchSubmit() }),
                        modifier = Modifier.fillMaxWidth()
                    )
                }
                if (searchInput.isNotEmpty()) {
                    IconButton(
                        onClick = onClearSearch,
                        modifier = Modifier.size(28.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Filled.Close,
                            contentDescription = "Xóa tìm kiếm Hub",
                            tint = HubColors.TextSecondary,
                            modifier = Modifier.size(16.dp)
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun RouteLoadingBanner() {
    Surface(
        shape = RoundedCornerShape(14.dp),
        color = Color.White.copy(alpha = 0.96f),
        shadowElevation = 6.dp
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 14.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            CircularProgressIndicator(
                modifier = Modifier.size(16.dp),
                strokeWidth = 2.dp,
                color = HubColors.RoyalBlue
            )
            Spacer(modifier = Modifier.width(8.dp))
            Text(
                text = "Đang tính tuyến đường từ OSRM...",
                fontSize = 13.sp,
                color = HubColors.TextSecondary
            )
        }
    }
}

@Composable
private fun ActiveRouteBanner(
    originLabel: String,
    hubName: String,
    route: OsrmRouteResult,
    onClear: () -> Unit
) {
    Surface(
        shape = RoundedCornerShape(16.dp),
        color = HubColors.CardSurfaceElevated.copy(alpha = 0.97f),
        shadowElevation = 8.dp,
        border = BorderStroke(1.dp, HubColors.RoyalBlue.copy(alpha = 0.28f))
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 14.dp, vertical = 8.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = "Từ $originLabel → $hubName",
                    fontWeight = FontWeight.Bold,
                    fontSize = 13.sp,
                    color = HubColors.InfoFg,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                Text(
                    text = "${route.formattedDistance} · ${route.formattedDuration} · OSRM",
                    fontSize = 12.sp,
                    color = HubColors.TextSecondary
                )
            }
            TextButton(onClick = onClear) {
                Text("Xóa tuyến", fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
            }
        }
    }
}

@Composable
private fun MapFloatingControls(
    onZoomIn: () -> Unit,
    onZoomOut: () -> Unit,
    onCenterGps: () -> Unit,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier,
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        Surface(
            shape = RoundedCornerShape(14.dp),
            color = Color.White.copy(alpha = 0.96f),
            shadowElevation = 6.dp,
            border = BorderStroke(1.dp, HubColors.CardBorder)
        ) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                IconButton(
                    onClick = onZoomIn,
                    modifier = Modifier.size(40.dp)
                ) {
                    Icon(
                        imageVector = Icons.Filled.Add,
                        contentDescription = "Phóng to",
                        tint = HubColors.TextPrimary,
                        modifier = Modifier.size(20.dp)
                    )
                }
                HorizontalDivider(
                    thickness = 1.dp,
                    color = HubColors.DividerSubtle,
                    modifier = Modifier.width(26.dp)
                )
                IconButton(
                    onClick = onZoomOut,
                    modifier = Modifier.size(40.dp)
                ) {
                    Icon(
                        imageVector = Icons.Filled.Remove,
                        contentDescription = "Thu nhỏ",
                        tint = HubColors.TextPrimary,
                        modifier = Modifier.size(20.dp)
                    )
                }
            }
        }

        Surface(
            onClick = onCenterGps,
            shape = CircleShape,
            color = Color.White.copy(alpha = 0.96f),
            shadowElevation = 6.dp,
            border = BorderStroke(1.dp, HubColors.CardBorder),
            modifier = Modifier.size(42.dp)
        ) {
            Box(contentAlignment = Alignment.Center) {
                Icon(
                    imageVector = Icons.Filled.MyLocation,
                    contentDescription = "Về vị trí GPS",
                    tint = HubColors.RoyalBlue,
                    modifier = Modifier.size(20.dp)
                )
            }
        }
    }
}

@Composable
private fun RadiusFilterChipStrip(
    selectedFilter: HubRadiusFilter,
    onSelectFilter: (HubRadiusFilter) -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .horizontalScroll(rememberScrollState())
            .padding(horizontal = 14.dp, vertical = 4.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        HubRadiusFilter.entries.forEach { filter ->
            val selected = filter == selectedFilter
            Surface(
                onClick = { onSelectFilter(filter) },
                shape = RoundedCornerShape(50),
                color = if (selected) HubColors.RoyalBlue else Color.White,
                border = BorderStroke(
                    width = 1.dp,
                    color = if (selected) HubColors.RoyalBlue else HubColors.CardBorder
                ),
                shadowElevation = if (selected) 2.dp else 0.dp
            ) {
                Text(
                    text = filter.label,
                    fontSize = 12.sp,
                    fontWeight = if (selected) FontWeight.Bold else FontWeight.Medium,
                    color = if (selected) Color.White else HubColors.TextPrimary,
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp)
                )
            }
        }
    }
}

@Composable
private fun HubListCard(
    ranked: RankedHub,
    isSelected: Boolean,
    compact: Boolean,
    onSelect: () -> Unit,
    onOpenRental: () -> Unit,
    onOpenParking: () -> Unit,
    onDirections: () -> Unit,
    modifier: Modifier = Modifier
) {
    val hub = ranked.hub
    val coords = ranked.coordinates
    Surface(
        onClick = onSelect,
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(18.dp),
        color = if (isSelected) HubColors.CardSurfaceElevated else HubColors.CardSurface,
        border = BorderStroke(
            width = if (isSelected) 2.dp else 1.dp,
            color = if (isSelected) HubColors.RoyalBlue else HubColors.CardBorder
        ),
        shadowElevation = if (isSelected) 3.dp else 1.dp
    ) {
        Column(modifier = Modifier.padding(horizontal = 12.dp, vertical = if (compact) 8.dp else 11.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.weight(1f)
                ) {
                    Surface(
                        shape = RoundedCornerShape(10.dp),
                        color = if (isSelected) HubColors.RoyalBlue else HubColors.TileBlueBg,
                        modifier = Modifier.size(if (compact) 32.dp else 38.dp)
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Icon(
                                imageVector = Icons.Outlined.LocationOn,
                                contentDescription = null,
                                tint = if (isSelected) Color.White else HubColors.RoyalBlue,
                                modifier = Modifier.size(if (compact) 17.dp else 21.dp)
                            )
                        }
                    }
                    Spacer(modifier = Modifier.width(10.dp))
                    Column {
                        Text(
                            text = hub.name,
                            fontSize = if (compact) 14.sp else 15.sp,
                            fontWeight = FontWeight.Bold,
                            color = HubColors.TextPrimary,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                        Text(
                            text = if (compact) {
                                "${ranked.formattedBadgeText} · ${hub.id}"
                            } else {
                                "${hub.id} · ${"%.4f".format(coords.lat)}, ${"%.4f".format(coords.lng)}"
                            },
                            fontSize = 11.sp,
                            color = HubColors.TextSecondary,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                }
                if (ranked.isNearest) {
                    Spacer(modifier = Modifier.width(6.dp))
                    StatusBadge(
                        text = "Gần nhất",
                        bgColor = HubColors.TileOrangeBg,
                        fgColor = HubColors.TileOrangeIcon
                    )
                } else if (compact) {
                    Spacer(modifier = Modifier.width(6.dp))
                    StatusBadge(
                        text = if (coords.isIllustrativeFallback) "Minh họa" else "Hoạt động",
                        bgColor = HubColors.SuccessBg,
                        fgColor = HubColors.SuccessFg
                    )
                }
            }

            if (!compact) {
                Spacer(modifier = Modifier.height(7.dp))
                Row(
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Surface(
                        shape = RoundedCornerShape(50),
                        color = HubColors.InfoBg
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 9.dp, vertical = 3.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                imageVector = Icons.Filled.NearMe,
                                contentDescription = null,
                                tint = HubColors.InfoFg,
                                modifier = Modifier.size(12.dp)
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(
                                text = ranked.formattedBadgeText,
                                color = HubColors.InfoFg,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.SemiBold
                            )
                        }
                    }
                    StatusBadge(
                        text = if (coords.isIllustrativeFallback) "Minh họa" else "Hoạt động",
                        bgColor = HubColors.SuccessBg,
                        fgColor = HubColors.SuccessFg
                    )
                }
            }

            Spacer(modifier = Modifier.height(if (compact) 7.dp else 9.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Button(
                    onClick = onOpenRental,
                    shape = RoundedCornerShape(10.dp),
                    contentPadding = PaddingValues(horizontal = 10.dp, vertical = 5.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = HubColors.RoyalBlue),
                    modifier = Modifier
                        .weight(1f)
                        .height(34.dp)
                ) {
                    Icon(
                        Icons.AutoMirrored.Filled.DirectionsBike,
                        contentDescription = null,
                        modifier = Modifier.size(15.dp)
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Xem xe", fontSize = 12.sp)
                }
                OutlinedButton(
                    onClick = onOpenParking,
                    shape = RoundedCornerShape(10.dp),
                    contentPadding = PaddingValues(horizontal = 10.dp, vertical = 5.dp),
                    modifier = Modifier
                        .weight(1f)
                        .height(34.dp)
                ) {
                    Icon(Icons.Filled.LocalParking, contentDescription = null, modifier = Modifier.size(15.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Chỗ đỗ", fontSize = 12.sp)
                }
                OutlinedButton(
                    onClick = onDirections,
                    shape = RoundedCornerShape(10.dp),
                    contentPadding = PaddingValues(horizontal = 10.dp, vertical = 5.dp),
                    modifier = Modifier.height(34.dp)
                ) {
                    Icon(Icons.Filled.Directions, contentDescription = "Chỉ đường", modifier = Modifier.size(17.dp))
                }
            }
        }
    }
}

@Composable
private fun MapLibreHubCanvas(
    hubs: List<HubDto>,
    selectedOrigin: SelectedOrigin,
    selectedHubId: String?,
    activeRoute: OsrmRouteResult?,
    isLoadingRoute: Boolean,
    isPickingOriginOnMap: Boolean,
    topMapPaddingPx: Int,
    bottomMapPaddingPx: Int,
    onMapReady: (MapLibreMap) -> Unit,
    onMarkerClicked: (String) -> Unit,
    onCameraCenterChanged: (RoutePoint) -> Unit,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current

    var isStyleLoaded by remember { mutableStateOf(false) }
    var hasLoadError by remember { mutableStateOf(false) }
    var retryNonce by remember { mutableIntStateOf(0) }
    var mapLibreMap by remember { mutableStateOf<MapLibreMap?>(null) }
    var pickingModeLatest by remember { mutableStateOf(isPickingOriginOnMap) }
    pickingModeLatest = isPickingOriginOnMap

    val mapView = remember {
        MapLibre.getInstance(context)
        MapView(context).apply {
            onCreate(null)
        }
    }
    val normalPin = remember(context) { createHubPinBitmap(context, selected = false) }
    val selectedPin = remember(context) { createHubPinBitmap(context, selected = true) }
    val originPin = remember(context) { createOriginDotBitmap(context) }

    DisposableEffect(lifecycleOwner, mapView) {
        val observer = LifecycleEventObserver { _, event ->
            when (event) {
                Lifecycle.Event.ON_START -> mapView.onStart()
                Lifecycle.Event.ON_RESUME -> mapView.onResume()
                Lifecycle.Event.ON_PAUSE -> mapView.onPause()
                Lifecycle.Event.ON_STOP -> mapView.onStop()
                else -> Unit
            }
        }
        lifecycleOwner.lifecycle.addObserver(observer)

        mapView.addOnDidFailLoadingMapListener {
            if (!isStyleLoaded) {
                hasLoadError = true
            }
        }

        mapView.getMapAsync { map ->
            mapLibreMap = map
            onMapReady(map)
            @Suppress("DEPRECATION")
            map.setPadding(0, topMapPaddingPx, 0, bottomMapPaddingPx)
            map.cameraPosition = CameraPosition.Builder()
                .target(LatLng(selectedOrigin.lat, selectedOrigin.lng))
                .zoom(15.2)
                .build()

            map.addOnCameraIdleListener {
                map.cameraPosition.target?.let { t ->
                    onCameraCenterChanged(RoutePoint(t.latitude, t.longitude))
                }
            }

            map.addOnMapClickListener { latLng ->
                if (pickingModeLatest) {
                    map.animateCamera(CameraUpdateFactory.newLatLng(latLng), 280)
                    onCameraCenterChanged(RoutePoint(latLng.latitude, latLng.longitude))
                    return@addOnMapClickListener true
                }
                val screenPoint = map.projection.toScreenLocation(latLng)
                val features = map.queryRenderedFeatures(screenPoint, HUB_LAYER_ID)
                val clickedId = features.firstOrNull()?.getStringProperty("hubId")
                if (!clickedId.isNullOrBlank()) {
                    onMarkerClicked(clickedId)
                    true
                } else {
                    false
                }
            }

            loadOpenFreeMapStyle(
                map = map,
                normalPin = normalPin,
                selectedPin = selectedPin,
                originPin = originPin,
                hubs = hubs,
                selectedOrigin = selectedOrigin,
                selectedHubId = selectedHubId,
                activeRoute = activeRoute,
                onLoaded = {
                    isStyleLoaded = true
                    hasLoadError = false
                }
            )
        }

        onDispose {
            lifecycleOwner.lifecycle.removeObserver(observer)
            mapView.onPause()
            mapView.onStop()
            mapView.onDestroy()
        }
    }

    LaunchedEffect(topMapPaddingPx, bottomMapPaddingPx, mapLibreMap) {
        @Suppress("DEPRECATION")
        mapLibreMap?.setPadding(0, topMapPaddingPx, 0, bottomMapPaddingPx)
    }

    LaunchedEffect(retryNonce) {
        if (retryNonce > 0) {
            val map = mapLibreMap ?: return@LaunchedEffect
            isStyleLoaded = false
            hasLoadError = false
            loadOpenFreeMapStyle(
                map = map,
                normalPin = normalPin,
                selectedPin = selectedPin,
                originPin = originPin,
                hubs = hubs,
                selectedOrigin = selectedOrigin,
                selectedHubId = selectedHubId,
                activeRoute = activeRoute,
                onLoaded = {
                    isStyleLoaded = true
                    hasLoadError = false
                }
            )
        }
    }

    // Sync Hub markers & Origin marker onto MapLibre sources cleanly.
    LaunchedEffect(hubs, selectedHubId, isStyleLoaded, mapLibreMap) {
        val style = mapLibreMap?.style ?: return@LaunchedEffect
        if (!style.isFullyLoaded) return@LaunchedEffect
        style.getSourceAs<GeoJsonSource>(HUB_SOURCE_ID)
            ?.setGeoJson(buildHubFeatureCollection(hubs, selectedHubId))
    }

    LaunchedEffect(selectedOrigin, isStyleLoaded, mapLibreMap) {
        val map = mapLibreMap ?: return@LaunchedEffect
        val style = map.style ?: return@LaunchedEffect
        if (!style.isFullyLoaded) return@LaunchedEffect
        style.getSourceAs<GeoJsonSource>(ORIGIN_SOURCE_ID)
            ?.setGeoJson(buildOriginFeatureCollection(selectedOrigin))
        if (!isPickingOriginOnMap && !isLoadingRoute && activeRoute == null) {
            map.animateCamera(
                CameraUpdateFactory.newLatLngZoom(LatLng(selectedOrigin.lat, selectedOrigin.lng), 15.5),
                600
            )
        }
    }

    LaunchedEffect(selectedHubId, hubs, mapLibreMap) {
        val id = selectedHubId ?: return@LaunchedEffect
        if (isPickingOriginOnMap || isLoadingRoute || activeRoute != null) return@LaunchedEffect
        val hub = hubs.firstOrNull { it.id == id } ?: return@LaunchedEffect
        val coords = HubGeoCatalog.resolve(hub)
        mapLibreMap?.animateCamera(
            CameraUpdateFactory.newLatLngZoom(LatLng(coords.lat, coords.lng), 16.0),
            650
        )
    }

    // Draw OSRM Polyline and animate bounds around BOTH selectedOrigin and destination Hub.
    LaunchedEffect(activeRoute, isStyleLoaded, mapLibreMap) {
        val map = mapLibreMap ?: return@LaunchedEffect
        val style = map.style ?: return@LaunchedEffect
        if (!style.isFullyLoaded) return@LaunchedEffect
        val source = style.getSourceAs<GeoJsonSource>(ROUTE_SOURCE_ID) ?: return@LaunchedEffect
        if (activeRoute == null) {
            source.setGeoJson(FeatureCollection.fromFeatures(emptyArray()))
            return@LaunchedEffect
        }
        source.setGeoJson(buildRouteFeatureCollection(activeRoute))

        val boundsBuilder = LatLngBounds.Builder()
            .include(LatLng(activeRoute.origin.lat, activeRoute.origin.lng))
            .include(LatLng(activeRoute.destination.lat, activeRoute.destination.lng))
        for (pt in activeRoute.points) {
            boundsBuilder.include(LatLng(pt.lat, pt.lng))
        }
        val bounds = boundsBuilder.build()
        if (bounds.latitudeSpan < 0.0005 && bounds.longitudeSpan < 0.0005) {
            map.animateCamera(
                CameraUpdateFactory.newLatLngZoom(
                    LatLng(activeRoute.destination.lat, activeRoute.destination.lng),
                    16.5
                ),
                500
            )
        } else {
            val dpScale = context.resources.displayMetrics.density
            val sideLeftPx = (32f * dpScale).toInt()
            val sideRightPx = (64f * dpScale).toInt()
            val bottomClearancePx = (24f * dpScale).toInt()
            try {
                map.animateCamera(
                    CameraUpdateFactory.newLatLngBounds(
                        bounds,
                        sideLeftPx,
                        topMapPaddingPx,
                        sideRightPx,
                        bottomMapPaddingPx + bottomClearancePx
                    ),
                    700
                )
            } catch (_: Exception) {
                map.animateCamera(
                    CameraUpdateFactory.newLatLngZoom(
                        LatLng(activeRoute.destination.lat, activeRoute.destination.lng),
                        15.5
                    )
                )
            }
        }
    }

    Box(modifier = modifier) {
        AndroidView(
            factory = { mapView },
            modifier = Modifier.fillMaxSize()
        )

        if (!isStyleLoaded) {
            Surface(
                color = Color(0xEBEEF3FC),
                modifier = Modifier.fillMaxSize()
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(horizontal = 24.dp),
                    verticalArrangement = Arrangement.Center,
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    if (!hasLoadError) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(28.dp),
                            strokeWidth = 2.5.dp,
                            color = HubColors.RoyalBlue
                        )
                        Spacer(modifier = Modifier.height(10.dp))
                    }
                    Text(
                        text = "Đang tải bản đồ. Nếu không thấy bản đồ, hãy kiểm tra kết nối Internet.",
                        color = HubColors.TextSecondary,
                        fontSize = 13.sp,
                        textAlign = TextAlign.Center
                    )
                    if (hasLoadError) {
                        Spacer(modifier = Modifier.height(10.dp))
                        OutlinedButton(onClick = { retryNonce++ }) {
                            Icon(Icons.Filled.Refresh, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("Thử tải lại", fontSize = 12.sp)
                        }
                    }
                }
            }
        }
    }
}

private fun loadOpenFreeMapStyle(
    map: MapLibreMap,
    normalPin: Bitmap,
    selectedPin: Bitmap,
    originPin: Bitmap,
    hubs: List<HubDto>,
    selectedOrigin: SelectedOrigin,
    selectedHubId: String?,
    activeRoute: OsrmRouteResult?,
    onLoaded: () -> Unit
) {
    map.setStyle(Style.Builder().fromUri(OPEN_FREE_MAP_BRIGHT_STYLE)) { style ->
        style.addImage(HUB_PIN_NORMAL_ID, normalPin)
        style.addImage(HUB_PIN_SELECTED_ID, selectedPin)
        style.addImage(ORIGIN_PIN_ID, originPin)

        val routeFeatures = activeRoute?.let { buildRouteFeatureCollection(it) }
            ?: FeatureCollection.fromFeatures(emptyArray())
        style.addSource(GeoJsonSource(ROUTE_SOURCE_ID, routeFeatures))
        style.addLayer(
            LineLayer(ROUTE_LAYER_ID, ROUTE_SOURCE_ID).withProperties(
                PropertyFactory.lineColor("#0B38CE"),
                PropertyFactory.lineWidth(5.5f),
                PropertyFactory.lineCap(Property.LINE_CAP_ROUND),
                PropertyFactory.lineJoin(Property.LINE_JOIN_ROUND)
            )
        )

        style.addSource(GeoJsonSource(HUB_SOURCE_ID, buildHubFeatureCollection(hubs, selectedHubId)))
        style.addLayer(
            SymbolLayer(HUB_LAYER_ID, HUB_SOURCE_ID).withProperties(
                PropertyFactory.iconImage(Expression.get("icon")),
                PropertyFactory.iconAllowOverlap(true),
                PropertyFactory.iconIgnorePlacement(true),
                PropertyFactory.iconAnchor(Property.ICON_ANCHOR_BOTTOM)
            )
        )

        style.addSource(GeoJsonSource(ORIGIN_SOURCE_ID, buildOriginFeatureCollection(selectedOrigin)))
        style.addLayer(
            SymbolLayer(ORIGIN_LAYER_ID, ORIGIN_SOURCE_ID).withProperties(
                PropertyFactory.iconImage(ORIGIN_PIN_ID),
                PropertyFactory.iconAllowOverlap(true),
                PropertyFactory.iconIgnorePlacement(true),
                PropertyFactory.iconAnchor(Property.ICON_ANCHOR_CENTER)
            )
        )
        onLoaded()
    }
}

private fun buildHubFeatureCollection(hubs: List<HubDto>, selectedHubId: String?): FeatureCollection {
    val features = hubs.map { hub ->
        val coords = HubGeoCatalog.resolve(hub)
        Feature.fromGeometry(Point.fromLngLat(coords.lng, coords.lat)).apply {
            addStringProperty("hubId", hub.id)
            addStringProperty("name", hub.name)
            addStringProperty("icon", if (hub.id == selectedHubId) HUB_PIN_SELECTED_ID else HUB_PIN_NORMAL_ID)
        }
    }
    return FeatureCollection.fromFeatures(features)
}

private fun buildOriginFeatureCollection(origin: SelectedOrigin): FeatureCollection =
    FeatureCollection.fromFeature(Feature.fromGeometry(Point.fromLngLat(origin.lng, origin.lat)))

private fun buildRouteFeatureCollection(route: OsrmRouteResult): FeatureCollection {
    val line = LineString.fromLngLats(route.points.map { Point.fromLngLat(it.lng, it.lat) })
    return FeatureCollection.fromFeature(Feature.fromGeometry(line))
}

private fun hasLocationPermission(context: Context): Boolean =
    ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) ==
        PackageManager.PERMISSION_GRANTED ||
        ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_COARSE_LOCATION) ==
        PackageManager.PERMISSION_GRANTED

@SuppressLint("MissingPermission")
private fun readLastKnownLocationOrNull(context: Context): RoutePoint? {
    val manager = context.getSystemService(Context.LOCATION_SERVICE) as? LocationManager ?: return null
    val providers = listOf(LocationManager.GPS_PROVIDER, LocationManager.NETWORK_PROVIDER)
    var best: Location? = null
    for (provider in providers) {
        val loc = try {
            manager.getLastKnownLocation(provider)
        } catch (_: SecurityException) {
            null
        }
        if (loc != null && (best == null || loc.accuracy < best.accuracy)) {
            best = loc
        }
    }
    return best?.let { RoutePoint(lat = it.latitude, lng = it.longitude) }
}

private fun createHubPinBitmap(context: Context, selected: Boolean): Bitmap {
    val density = context.resources.displayMetrics.density
    val baseW = if (selected) 40f else 32f
    val baseH = if (selected) 50f else 40f
    val widthPx = (baseW * density).toInt().coerceAtLeast(32)
    val heightPx = (baseH * density).toInt().coerceAtLeast(40)
    val bitmap = Bitmap.createBitmap(widthPx, heightPx, Bitmap.Config.ARGB_8888)
    val canvas = Canvas(bitmap)

    val cx = widthPx / 2f
    val r = widthPx * 0.40f
    val cy = r + 2f * density

    val pinPath = Path().apply {
        addCircle(cx, cy, r, Path.Direction.CW)
        moveTo(cx - r * 0.72f, cy + r * 0.45f)
        lineTo(cx, heightPx - 2f * density)
        lineTo(cx + r * 0.72f, cy + r * 0.45f)
        close()
    }

    val fillPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = android.graphics.Color.parseColor(if (selected) "#009EC2" else "#0B38CE")
        style = Paint.Style.FILL
    }
    val strokePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = android.graphics.Color.WHITE
        style = Paint.Style.STROKE
        strokeWidth = (if (selected) 2.8f else 2.2f) * density
    }
    val innerDotPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = android.graphics.Color.WHITE
        style = Paint.Style.FILL
    }

    canvas.drawPath(pinPath, fillPaint)
    canvas.drawPath(pinPath, strokePaint)
    canvas.drawCircle(cx, cy, r * 0.36f, innerDotPaint)
    return bitmap
}

/** Crisp glowing blue dot with white halo ring distinguishing user/selected origin from Hub pins. */
private fun createOriginDotBitmap(context: Context): Bitmap {
    val density = context.resources.displayMetrics.density
    val sizePx = (34f * density).toInt().coerceAtLeast(32)
    val bitmap = Bitmap.createBitmap(sizePx, sizePx, Bitmap.Config.ARGB_8888)
    val canvas = Canvas(bitmap)
    val c = sizePx / 2f

    val haloPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = android.graphics.Color.parseColor("#380A54F0")
        style = Paint.Style.FILL
    }
    val borderPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = android.graphics.Color.WHITE
        style = Paint.Style.FILL
    }
    val dotPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = android.graphics.Color.parseColor("#0A54F0")
        style = Paint.Style.FILL
    }

    canvas.drawCircle(c, c, sizePx * 0.46f, haloPaint)
    canvas.drawCircle(c, c, sizePx * 0.30f, borderPaint)
    canvas.drawCircle(c, c, sizePx * 0.21f, dotPaint)
    return bitmap
}
