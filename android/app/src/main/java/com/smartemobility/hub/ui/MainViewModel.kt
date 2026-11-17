package com.smartemobility.hub.ui

import android.app.Application
import android.content.Context
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.google.gson.JsonObject
import com.smartemobility.hub.data.HubRepository
import com.smartemobility.hub.data.model.ApiException
import com.smartemobility.hub.data.model.ChargingRequestDto
import com.smartemobility.hub.data.model.ChargingSessionDto
import com.smartemobility.hub.data.model.HubDto
import com.smartemobility.hub.data.model.HubGeoCatalog
import com.smartemobility.hub.data.model.HubRadiusFilter
import com.smartemobility.hub.data.model.OriginSource
import com.smartemobility.hub.data.model.ParkingOccupancyDto
import com.smartemobility.hub.data.model.ParkingReservationDto
import com.smartemobility.hub.data.model.PendingCommandEntry
import com.smartemobility.hub.data.model.SelectedOrigin
import com.smartemobility.hub.data.model.SessionUser
import com.smartemobility.hub.data.model.SlotDto
import com.smartemobility.hub.data.model.TripDto
import com.smartemobility.hub.data.model.VehicleDto
import com.smartemobility.hub.data.model.VehicleReservationDto
import com.smartemobility.hub.data.network.HubApiClient
import com.smartemobility.hub.data.network.IdempotencyStore
import com.smartemobility.hub.data.network.OsrmRouteResult
import com.smartemobility.hub.data.network.OsrmRoutingService
import com.smartemobility.hub.data.network.PhotonGeocodingService
import com.smartemobility.hub.data.network.PhotonPlaceSuggestion
import com.smartemobility.hub.data.network.RoutePoint
import com.smartemobility.hub.data.network.SessionCookieJar
import com.smartemobility.hub.data.network.SharedPrefsStorage
import com.smartemobility.hub.ui.components.MainTab
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlin.math.abs

enum class SubScreen(val title: String) {
    RENTAL("Thuê & Trả xe điện"),
    PARKING("Đặt chỗ đỗ xe"),
    CHARGING("Sạc xe điện"),
    HISTORY("Lịch sử sử dụng")
}

data class HubUiState(
    val serverUrl: String = DEFAULT_SERVER_URL,
    val user: SessionUser? = null,
    val currentTab: MainTab = MainTab.HOME,
    val activeSubScreen: SubScreen? = null,
    val isBusy: Boolean = false,
    val errorMessage: String? = null,
    val successMessage: String? = null,
    val showLoginDialog: Boolean = false,
    val showSettingsDialog: Boolean = false,
    val showProfileDialog: Boolean = false,
    val showSupportDialog: Boolean = false,
    val hubs: List<HubDto> = emptyList(),
    val hubSearchQuery: String = "",
    val selectedHubId: String = "",
    val selectedMapHubId: String? = null,
    val selectedOrigin: SelectedOrigin = SelectedOrigin.defaultDhQg,
    val radiusFilter: HubRadiusFilter = HubRadiusFilter.ALL,
    val photonSuggestions: List<PhotonPlaceSuggestion> = emptyList(),
    val isSearchingPhoton: Boolean = false,
    val photonError: String? = null,
    val activeRoute: OsrmRouteResult? = null,
    val activeRouteHubName: String? = null,
    val isLoadingRoute: Boolean = false,
    val vehicleTypeFilter: String? = null,
    val availableVehicles: List<VehicleDto> = emptyList(),
    val vehicleReservations: List<VehicleReservationDto> = emptyList(),
    val trips: List<TripDto> = emptyList(),
    val returnSlotsByTrip: Map<String, Pair<String, List<SlotDto>>> = emptyMap(),
    val privateVehicles: List<VehicleDto> = emptyList(),
    val parkingPool: String = "immediate",
    val parkingAvailableSlots: List<SlotDto> = emptyList(),
    val parkingReservations: List<ParkingReservationDto> = emptyList(),
    val parkingOccupancies: List<ParkingOccupancyDto> = emptyList(),
    val lim01ConflictDetails: String? = null,
    val queuedChargingConflictOccupancyId: String? = null,
    val chargingRequests: List<ChargingRequestDto> = emptyList(),
    val activeChargingSession: ChargingSessionDto? = null,
    val pendingCommands: List<PendingCommandEntry> = emptyList()
) {
    val activeNotificationCount: Int
        get() = vehicleReservations.count { it.isActivePending } +
            trips.count { it.status == "Active" } +
            parkingReservations.count { it.status == "Reserved" } +
            chargingRequests.count { it.status in setOf("Queued", "Charging") } +
            pendingCommands.size

    companion object {
        const val DEFAULT_SERVER_URL = "http://10.0.2.2:3000"
    }
}

class MainViewModel(application: Application) : AndroidViewModel(application) {
    private val prefs = application.getSharedPreferences("smart_emobility_prefs", Context.MODE_PRIVATE)
    private val savedUrl = prefs.getString("server_url", HubUiState.DEFAULT_SERVER_URL)
        ?: HubUiState.DEFAULT_SERVER_URL

    private val storage = SharedPrefsStorage(prefs)
    private val apiClient = HubApiClient(savedUrl, SessionCookieJar(storage))
    private val idempotencyStore = IdempotencyStore(storage)
    private val repository = HubRepository(apiClient, idempotencyStore)
    private val osrmRoutingService = OsrmRoutingService()
    private val photonGeocodingService = PhotonGeocodingService()

    private var photonSearchJob: Job? = null
    private var hasInitializedOriginFromGps = false

    private val _uiState = MutableStateFlow(HubUiState(serverUrl = apiClient.baseUrl))
    val uiState: StateFlow<HubUiState> = _uiState.asStateFlow()

    init {
        restoreSession()
    }

    fun selectTab(tab: MainTab) {
        _uiState.update {
            it.copy(
                currentTab = tab,
                activeSubScreen = null,
                errorMessage = null,
                successMessage = null
            )
        }
    }

    fun openSubScreen(screen: SubScreen, preferredHubId: String? = null) {
        if (_uiState.value.user == null) {
            _uiState.update {
                it.copy(
                    showLoginDialog = true,
                    errorMessage = "Vui lòng đăng nhập tài khoản Người dùng để sử dụng chức năng này."
                )
            }
            return
        }
        val hubId = preferredHubId ?: _uiState.value.selectedHubId.ifBlank {
            _uiState.value.hubs.firstOrNull()?.id.orEmpty()
        }
        _uiState.update {
            it.copy(
                activeSubScreen = screen,
                selectedHubId = hubId,
                errorMessage = null,
                successMessage = null,
                lim01ConflictDetails = null
            )
        }
        if (screen == SubScreen.RENTAL && hubId.isNotBlank()) {
            loadVehiclesForHub(hubId, _uiState.value.vehicleTypeFilter)
        } else if (screen == SubScreen.PARKING && hubId.isNotBlank()) {
            loadParkingAvailability(hubId, _uiState.value.parkingPool, null, null, null)
        }
    }

    fun closeSubScreen() {
        _uiState.update {
            it.copy(activeSubScreen = null, errorMessage = null, successMessage = null)
        }
    }

    fun setLoginDialog(show: Boolean) {
        _uiState.update { it.copy(showLoginDialog = show, errorMessage = null) }
    }

    fun setSettingsDialog(show: Boolean) {
        _uiState.update { it.copy(showSettingsDialog = show, errorMessage = null) }
    }

    fun setProfileDialog(show: Boolean) {
        _uiState.update { it.copy(showProfileDialog = show) }
    }

    fun setSupportDialog(show: Boolean) {
        _uiState.update { it.copy(showSupportDialog = show) }
    }

    fun clearBanner() {
        _uiState.update { it.copy(errorMessage = null, successMessage = null) }
    }

    fun dismissQueuedChargingDialog() {
        _uiState.update { it.copy(queuedChargingConflictOccupancyId = null) }
    }

    fun updateServerUrl(rawUrl: String, reconnect: Boolean = true) {
        val normalized = HubApiClient.normalizeBaseUrl(rawUrl)
        prefs.edit().putString("server_url", normalized).apply()
        apiClient.updateBaseUrl(normalized)
        _uiState.update {
            it.copy(
                serverUrl = normalized,
                user = null,
                showSettingsDialog = false,
                successMessage = "Đã lưu địa chỉ máy chủ: $normalized"
            )
        }
        if (reconnect) {
            restoreSession()
        }
    }

    fun restoreSession() {
        runAction(clearBanners = false, refreshAfterConflict = false) {
            val user = repository.getSession()
            if (user == null) {
                _uiState.update { it.copy(user = null) }
                return@runAction
            }
            if (!user.isUser) {
                _uiState.update {
                    it.copy(
                        user = user,
                        errorMessage = "Tài khoản này chưa có vai trò Người dùng (user)."
                    )
                }
                return@runAction
            }
            _uiState.update { it.copy(user = user) }
            reloadWorkspaceInternal(user.id)
        }
    }

    fun login(username: String, password: String) {
        runAction(refreshAfterConflict = false) {
            val user = repository.login(username, password)
            if (!user.isUser) {
                repository.logout()
                throw ApiException(
                    403,
                    "FORBIDDEN_OPERATION",
                    "App Người dùng yêu cầu tài khoản có vai trò 'user' (ví dụ: user)."
                )
            }
            _uiState.update {
                it.copy(
                    user = user,
                    showLoginDialog = false,
                    successMessage = "Đăng nhập thành công (${user.id})."
                )
            }
            reloadWorkspaceInternal(user.id)
        }
    }

    fun logout() {
        runAction(refreshAfterConflict = false) {
            repository.logout()
            _uiState.update {
                HubUiState(
                    serverUrl = it.serverUrl,
                    currentTab = it.currentTab,
                    successMessage = "Đã đăng xuất."
                )
            }
        }
    }

    fun refreshAll() {
        val user = _uiState.value.user ?: return
        runAction(refreshAfterConflict = false) {
            reloadWorkspaceInternal(user.id)
            _uiState.update { it.copy(successMessage = "Đã đồng bộ dữ liệu mới nhất từ máy chủ.") }
        }
    }

    fun searchHubs(query: String) {
        _uiState.update { it.copy(hubSearchQuery = query) }
        if (_uiState.value.user == null) return
        runAction(refreshAfterConflict = false) {
            val matched = repository.searchHubs(query)
            _uiState.update { state ->
                val focusedHubId = if (query.isNotBlank()) matched.firstOrNull()?.id else state.selectedMapHubId
                state.copy(
                    hubs = matched,
                    selectedMapHubId = focusedHubId
                )
            }
        }
    }

    fun selectMapHub(hubId: String?) {
        _uiState.update { state ->
            state.copy(
                selectedMapHubId = hubId,
                selectedHubId = hubId ?: state.selectedHubId
            )
        }
    }

    fun useGpsOrigin(gpsPoint: RoutePoint?, explicit: Boolean) {
        if (!explicit && (hasInitializedOriginFromGps || _uiState.value.selectedOrigin.source != OriginSource.GPS)) {
            return
        }
        hasInitializedOriginFromGps = true
        val localGps = gpsPoint?.takeIf {
            abs(it.lat - HubGeoCatalog.defaultCenter.lat) < 1.0 &&
                abs(it.lng - HubGeoCatalog.defaultCenter.lng) < 1.0
        }
        val resolvedOrigin = if (localGps != null) {
            SelectedOrigin(
                label = "Vị trí GPS hiện tại",
                lat = localGps.lat,
                lng = localGps.lng,
                source = OriginSource.GPS
            )
        } else {
            SelectedOrigin.defaultDhQg
        }
        if (explicit || resolvedOrigin != _uiState.value.selectedOrigin) {
            setSelectedOrigin(resolvedOrigin)
        }
    }

    fun setSelectedOrigin(origin: SelectedOrigin) {
        photonSearchJob?.cancel()
        _uiState.update {
            it.copy(
                selectedOrigin = origin,
                activeRoute = null,
                activeRouteHubName = null,
                photonSuggestions = emptyList(),
                isSearchingPhoton = false,
                photonError = null,
                errorMessage = null
            )
        }
    }

    fun setRadiusFilter(filter: HubRadiusFilter) {
        _uiState.update { it.copy(radiusFilter = filter) }
    }

    fun searchPhotonPlaces(query: String) {
        photonSearchJob?.cancel()
        val trimmed = query.trim()
        if (trimmed.length < 2) {
            _uiState.update {
                it.copy(photonSuggestions = emptyList(), isSearchingPhoton = false, photonError = null)
            }
            return
        }
        photonSearchJob = viewModelScope.launch {
            _uiState.update { it.copy(isSearchingPhoton = true, photonError = null) }
            delay(350L)
            try {
                val results = photonGeocodingService.searchPlaces(
                    query = trimmed,
                    biasLat = HubGeoCatalog.defaultCenter.lat,
                    biasLng = HubGeoCatalog.defaultCenter.lng,
                    limit = 5
                )
                _uiState.update {
                    it.copy(photonSuggestions = results, isSearchingPhoton = false, photonError = null)
                }
            } catch (ce: CancellationException) {
                throw ce
            } catch (ex: Exception) {
                _uiState.update {
                    it.copy(
                        photonSuggestions = emptyList(),
                        isSearchingPhoton = false,
                        photonError = ex.message ?: "Không tìm được gợi ý địa điểm."
                    )
                }
            }
        }
    }

    fun clearPhotonSearch() {
        photonSearchJob?.cancel()
        _uiState.update {
            it.copy(photonSuggestions = emptyList(), isSearchingPhoton = false, photonError = null)
        }
    }

    fun requestRouteToHub(hub: HubDto) {
        val currentOrigin = _uiState.value.selectedOrigin
        val origin = RoutePoint(lat = currentOrigin.lat, lng = currentOrigin.lng)
        val destCoords = HubGeoCatalog.resolve(hub)
        val destination = RoutePoint(lat = destCoords.lat, lng = destCoords.lng)
        viewModelScope.launch {
            _uiState.update {
                it.copy(
                    isLoadingRoute = true,
                    selectedMapHubId = hub.id,
                    selectedHubId = hub.id,
                    errorMessage = null
                )
            }
            try {
                val route = osrmRoutingService.fetchRoute(origin, destination)
                _uiState.update {
                    it.copy(
                        activeRoute = route,
                        activeRouteHubName = hub.name,
                        isLoadingRoute = false
                    )
                }
            } catch (ex: Exception) {
                _uiState.update {
                    it.copy(
                        isLoadingRoute = false,
                        errorMessage = ex.message ?: "Không thể tải tuyến đường OSRM."
                    )
                }
            }
        }
    }

    fun clearRoute() {
        _uiState.update { it.copy(activeRoute = null, activeRouteHubName = null) }
    }

    fun selectHubForRental(hubId: String, typeFilter: String? = _uiState.value.vehicleTypeFilter) {
        _uiState.update { it.copy(selectedHubId = hubId, vehicleTypeFilter = typeFilter) }
        loadVehiclesForHub(hubId, typeFilter)
    }

    fun loadVehiclesForHub(hubId: String, typeFilter: String?) {
        if (_uiState.value.user == null || hubId.isBlank()) return
        runAction(refreshAfterConflict = false) {
            val vehicles = repository.listAvailableVehicles(hubId, typeFilter)
            _uiState.update {
                it.copy(
                    selectedHubId = hubId,
                    vehicleTypeFilter = typeFilter,
                    availableVehicles = vehicles
                )
            }
        }
    }

    fun reserveVehicle(hubId: String, vehicleId: String) {
        val userId = _uiState.value.user?.id ?: return
        runAction {
            val reservation = repository.reserveVehicle(userId, hubId, vehicleId)
            reloadWorkspaceInternal(userId)
            _uiState.update {
                it.copy(
                    successMessage = "Đã giữ xe ${reservation.vehicleId} (mã phiếu ${reservation.ticketCode})."
                )
            }
        }
    }

    fun cancelVehicleReservation(reservationId: String) {
        val userId = _uiState.value.user?.id ?: return
        runAction {
            repository.cancelVehicleReservation(userId, reservationId)
            reloadWorkspaceInternal(userId)
            _uiState.update { it.copy(successMessage = "Đã hủy phiếu giữ xe.") }
        }
    }

    fun pickupVehicle(reservationId: String, vehicleCode: String) {
        val userId = _uiState.value.user?.id ?: return
        runAction {
            val trip = repository.pickupVehicle(userId, reservationId, vehicleCode)
            reloadWorkspaceInternal(userId)
            _uiState.update {
                it.copy(successMessage = "Đã nhận xe ${trip.vehicleId}. Chuyến đi đang hoạt động.")
            }
        }
    }

    fun loadReturnSlots(tripId: String, hubId: String) {
        if (_uiState.value.user == null || hubId.isBlank()) return
        runAction(refreshAfterConflict = false) {
            val slots = repository.getReturnSlots(hubId, tripId)
            _uiState.update { state ->
                val updated = state.returnSlotsByTrip.toMutableMap()
                updated[tripId] = hubId to slots
                state.copy(
                    returnSlotsByTrip = updated,
                    errorMessage = if (slots.isEmpty()) "Hub này hiện không có chỗ trả phù hợp. Hãy chọn Hub khác." else null
                )
            }
        }
    }

    fun returnTrip(tripId: String, hubId: String, slotId: String) {
        val userId = _uiState.value.user?.id ?: return
        runAction {
            repository.returnTrip(userId, tripId, hubId, slotId)
            reloadWorkspaceInternal(userId)
            _uiState.update { it.copy(successMessage = "Đã trả xe và kết thúc chuyến đi.") }
        }
    }

    fun reportTripIncident(tripId: String, description: String) {
        val userId = _uiState.value.user?.id ?: return
        runAction {
            val incident = repository.reportTripIncident(userId, tripId, description)
            reloadWorkspaceInternal(userId)
            _uiState.update {
                it.copy(successMessage = "Đã ghi nhận sự cố (${incident.id}). Chuyến vẫn được giữ an toàn.")
            }
        }
    }

    fun loadParkingAvailability(
        hubId: String,
        pool: String,
        privateVehicleId: String?,
        plannedArrival: String?,
        plannedCheckout: String?
    ) {
        if (_uiState.value.user == null || hubId.isBlank()) return
        _uiState.update { it.copy(selectedHubId = hubId, parkingPool = pool, lim01ConflictDetails = null) }
        runAction(refreshAfterConflict = false) {
            val avail = repository.getParkingAvailability(
                hubId = hubId,
                pool = pool,
                privateVehicleId = privateVehicleId,
                plannedArrival = plannedArrival,
                plannedCheckout = plannedCheckout
            )
            _uiState.update { it.copy(parkingAvailableSlots = avail.availableSlots) }
        }
    }

    fun reserveParking(
        hubId: String,
        privateVehicleId: String,
        pool: String,
        slotId: String?,
        plannedArrival: String?,
        plannedCheckout: String?
    ) {
        val userId = _uiState.value.user?.id ?: return
        runAction {
            val res = repository.createParkingReservation(
                userId = userId,
                hubId = hubId,
                privateVehicleId = privateVehicleId,
                pool = pool,
                slotId = slotId,
                plannedArrival = plannedArrival,
                plannedCheckout = plannedCheckout
            )
            reloadWorkspaceInternal(userId)
            _uiState.update {
                it.copy(
                    successMessage = "Đã đặt chỗ đỗ ${res.slotId} (mã vé ${res.ticketCode})."
                )
            }
        }
    }

    fun cancelParkingReservation(reservationId: String) {
        val userId = _uiState.value.user?.id ?: return
        runAction {
            repository.cancelParkingReservation(userId, reservationId)
            reloadWorkspaceInternal(userId)
            _uiState.update { it.copy(successMessage = "Đã hủy đặt chỗ đỗ.") }
        }
    }

    fun checkInParking(reservationId: String, hubId: String, ticketCode: String) {
        val userId = _uiState.value.user?.id ?: return
        viewModelScope.launch {
            _uiState.update { it.copy(isBusy = true, errorMessage = null, successMessage = null, lim01ConflictDetails = null) }
            try {
                val res = repository.checkInParking(userId, reservationId, hubId, ticketCode)
                reloadWorkspaceInternal(userId)
                _uiState.update {
                    it.copy(successMessage = "Đã check-in chỗ đỗ ${res.slotId} (lượt ${res.occupancyId}).")
                }
            } catch (ex: ApiException) {
                val limDetails = if (ex.code == "SLOT_OCCUPIED") formatLim01Details(ex.details) else null
                handleActionFailure(ex, refreshAfterConflict = true, lim01Details = limDetails)
            } catch (ex: Exception) {
                _uiState.update { it.copy(errorMessage = ex.message ?: "Không thể check-in.") }
            } finally {
                _uiState.update { it.copy(isBusy = false) }
            }
        }
    }

    fun checkOutParking(occupancyId: String, cancelQueuedCharging: Boolean = false) {
        val userId = _uiState.value.user?.id ?: return
        viewModelScope.launch {
            _uiState.update {
                it.copy(
                    isBusy = true,
                    errorMessage = null,
                    successMessage = null,
                    queuedChargingConflictOccupancyId = null
                )
            }
            try {
                val occ = repository.checkOutParking(userId, occupancyId, cancelQueuedCharging)
                reloadWorkspaceInternal(userId)
                val feeText = occ.finalFee?.let { " · Phí quá hạn: ${it.toLong()} đ" } ?: ""
                _uiState.update { it.copy(successMessage = "Đã check-out chỗ đỗ ${occ.slotId}$feeText.") }
            } catch (ex: ApiException) {
                if (ex.code == "CHARGING_REQUEST_QUEUED") {
                    _uiState.update {
                        it.copy(queuedChargingConflictOccupancyId = occupancyId, errorMessage = ex.message)
                    }
                } else {
                    handleActionFailure(ex, refreshAfterConflict = true)
                }
            } catch (ex: Exception) {
                _uiState.update { it.copy(errorMessage = ex.message ?: "Không thể check-out.") }
            } finally {
                _uiState.update { it.copy(isBusy = false) }
            }
        }
    }

    fun submitChargingRequest(occupancyId: String, targetBatteryPercent: Int, neededByIso: String?) {
        val userId = _uiState.value.user?.id ?: return
        runAction {
            val req = repository.submitChargingRequest(userId, occupancyId, targetBatteryPercent, neededByIso)
            reloadWorkspaceInternal(userId)
            _uiState.update {
                it.copy(successMessage = "Đã gửi yêu cầu sạc (${req.id}) tới mức ${req.targetBatteryPercent}%.")
            }
        }
    }

    fun cancelChargingRequest(requestId: String) {
        val userId = _uiState.value.user?.id ?: return
        runAction {
            repository.cancelChargingRequest(userId, requestId)
            reloadWorkspaceInternal(userId)
            _uiState.update { it.copy(successMessage = "Đã hủy yêu cầu sạc.") }
        }
    }

    fun stopChargingSession(sessionId: String) {
        val userId = _uiState.value.user?.id ?: return
        runAction {
            val session = repository.stopChargingSession(userId, sessionId)
            reloadWorkspaceInternal(userId)
            _uiState.update {
                it.copy(successMessage = "Đã dừng sạc trên cổng ${session.pointId} (trạng thái: ${session.status}).")
            }
        }
    }

    fun retryPendingCommand(entry: PendingCommandEntry) {
        val userId = _uiState.value.user?.id ?: return
        runAction {
            repository.retryPendingCommand(userId, entry)
            reloadWorkspaceInternal(userId)
            _uiState.update { it.copy(successMessage = "Đã lấy lại kết quả yêu cầu trước.") }
        }
    }

    fun discardPendingCommand(operationKey: String) {
        val userId = _uiState.value.user?.id ?: return
        repository.discardPendingCommand(userId, operationKey)
        _uiState.update {
            it.copy(pendingCommands = idempotencyStore.listPending(userId))
        }
    }

    private suspend fun reloadWorkspaceInternal(userId: String) {
        val snapshot = repository.loadWorkspace(userId)
        val currentHub = _uiState.value.selectedHubId.takeIf { id -> snapshot.hubs.any { it.id == id } }
            ?: snapshot.hubs.firstOrNull()?.id.orEmpty()
        val vehicles = if (currentHub.isNotBlank()) {
            repository.listAvailableVehicles(currentHub, _uiState.value.vehicleTypeFilter)
        } else {
            emptyList()
        }
        _uiState.update {
            it.copy(
                hubs = snapshot.hubs,
                selectedHubId = currentHub,
                availableVehicles = vehicles,
                vehicleReservations = snapshot.vehicleReservations,
                trips = snapshot.trips,
                privateVehicles = snapshot.privateVehicles,
                parkingReservations = snapshot.parkingReservations,
                parkingOccupancies = snapshot.parkingOccupancies,
                chargingRequests = snapshot.chargingRequests,
                activeChargingSession = snapshot.activeChargingSession,
                pendingCommands = snapshot.pendingCommands
            )
        }
    }

    private fun runAction(
        clearBanners: Boolean = true,
        refreshAfterConflict: Boolean = true,
        block: suspend () -> Unit
    ) {
        viewModelScope.launch {
            _uiState.update {
                it.copy(
                    isBusy = true,
                    errorMessage = if (clearBanners) null else it.errorMessage,
                    successMessage = if (clearBanners) null else it.successMessage
                )
            }
            try {
                block()
            } catch (ex: ApiException) {
                handleActionFailure(ex, refreshAfterConflict)
            } catch (ex: Exception) {
                _uiState.update { it.copy(errorMessage = ex.message ?: "Đã xảy ra lỗi không mong muốn.") }
            } finally {
                _uiState.update { it.copy(isBusy = false) }
            }
        }
    }

    private suspend fun handleActionFailure(
        ex: ApiException,
        refreshAfterConflict: Boolean,
        lim01Details: String? = null
    ) {
        if (ex.statusCode == 401) {
            apiClient.clearSessionCookies()
            _uiState.update {
                it.copy(
                    user = null,
                    errorMessage = ex.message,
                    lim01ConflictDetails = null
                )
            }
            return
        }
        val uid = _uiState.value.user?.id
        if (refreshAfterConflict && uid != null && ex.statusCode in setOf(409, 422, 503)) {
            try {
                reloadWorkspaceInternal(uid)
            } catch (_: Exception) {
                // Keep original error message
            }
        }
        _uiState.update {
            it.copy(
                errorMessage = ex.message,
                lim01ConflictDetails = lim01Details ?: it.lim01ConflictDetails,
                pendingCommands = uid?.let { id -> idempotencyStore.listPending(id) } ?: it.pendingCommands
            )
        }
    }

    private fun formatLim01Details(details: JsonObject?): String? {
        if (details == null) return null
        val parts = mutableListOf<String>()
        val sameHub = details.getAsJsonArray("sameHubAlternatives")
        if (sameHub != null && sameHub.size() > 0) {
            val codes = (0 until sameHub.size()).mapNotNull { idx ->
                sameHub[idx].asJsonObject.get("code")?.asString
            }
            if (codes.isNotEmpty()) {
                parts.add("Ô trống cùng Hub: ${codes.joinToString(", ")}")
            }
        }
        val nearby = details.getAsJsonArray("nearbyHubAlternatives")
        if (nearby != null && nearby.size() > 0) {
            val hubs = (0 until nearby.size()).mapNotNull { idx ->
                nearby[idx].asJsonObject.get("hubId")?.asString
            }
            if (hubs.isNotEmpty()) {
                parts.add("Hub lân cận còn chỗ: ${hubs.joinToString(", ")}")
            }
        }
        val incidentId = details.get("incidentId")?.takeIf { !it.isJsonNull }?.asString
        if (!incidentId.isNullOrBlank()) {
            parts.add("Đã chuyển sự cố tới bộ phận vận hành: $incidentId")
        }
        return parts.takeIf { it.isNotEmpty() }?.joinToString(" · ")
    }
}
