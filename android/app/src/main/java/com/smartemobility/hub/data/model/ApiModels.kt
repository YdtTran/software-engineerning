package com.smartemobility.hub.data.model

import android.location.Location
import com.google.gson.JsonObject
import java.util.Locale
import kotlin.math.ceil
import kotlin.math.roundToInt

data class SessionUser(
    val id: String,
    val roles: List<String> = emptyList()
) {
    val isUser: Boolean get() = roles.any { it.equals("user", ignoreCase = true) }
}

data class HubLocation(
    val lat: Double,
    val lng: Double,
    val label: String? = null
)

data class HubDto(
    val id: String,
    val name: String,
    val location: HubLocation? = null
)

data class HubCoordinates(
    val lat: Double,
    val lng: Double,
    val isIllustrativeFallback: Boolean
)

object HubGeoCatalog {
    // Illustrative ĐHQG-HCM coordinates used only when backend hub.location is null.
    private val fallbackById = mapOf(
        "metro" to HubCoordinates(10.8794, 106.8091, isIllustrativeFallback = true),
        "bku" to HubCoordinates(10.8805, 106.8053, isIllustrativeFallback = true),
        "dorm-a" to HubCoordinates(10.8781, 106.8065, isIllustrativeFallback = true),
        "library" to HubCoordinates(10.8758, 106.8017, isIllustrativeFallback = true)
    )

    val defaultCenter = HubCoordinates(10.8781, 106.8065, isIllustrativeFallback = true)

    fun resolve(hub: HubDto): HubCoordinates {
        val loc = hub.location
        if (loc != null && loc.lat.isFinite() && loc.lng.isFinite()) {
            return HubCoordinates(loc.lat, loc.lng, isIllustrativeFallback = false)
        }
        return fallbackById[hub.id] ?: defaultCenter
    }
}

enum class OriginSource(val displayTag: String) {
    GPS("GPS"),
    SEARCH("Địa chỉ tìm kiếm"),
    MAP_PICK("Chọn trên bản đồ")
}

data class SelectedOrigin(
    val label: String,
    val lat: Double,
    val lng: Double,
    val source: OriginSource
) {
    companion object {
        val defaultDhQg = SelectedOrigin(
            label = "Khu vực ĐHQG-HCM (Mặc định)",
            lat = HubGeoCatalog.defaultCenter.lat,
            lng = HubGeoCatalog.defaultCenter.lng,
            source = OriginSource.GPS
        )
    }
}

enum class HubRadiusFilter(val label: String, val maxMeters: Double?) {
    ALL("Gần nhất (Tất cả)", null),
    UNDER_1_KM("Dưới 1 km", 1000.0),
    UNDER_3_KM("Dưới 3 km", 3000.0)
}

data class RankedHub(
    val hub: HubDto,
    val coordinates: HubCoordinates,
    val distanceMeters: Double,
    val isNearest: Boolean
) {
    val formattedDistance: String
        get() = HubDistanceUtils.formatDistance(distanceMeters)

    val estimatedMinutes: Int
        get() = HubDistanceUtils.estimateTravelMinutes(distanceMeters)

    val formattedBadgeText: String
        get() = "$formattedDistance · ~$estimatedMinutes phút"
}

/** Local distance calculation, sorting, and radius filtering around the active origin. */
object HubDistanceUtils {
    // Assumed urban e-mobility travel speed (~20 km/h) for quick local badge ETA.
    private const val URBAN_METERS_PER_MINUTE = 333.3

    fun androidDistanceMeters(lat1: Double, lng1: Double, lat2: Double, lng2: Double): Double {
        val results = FloatArray(1)
        Location.distanceBetween(lat1, lng1, lat2, lng2, results)
        return results[0].toDouble()
    }

    fun formatDistance(distanceMeters: Double): String {
        val safeMeters = distanceMeters.coerceAtLeast(0.0)
        return if (safeMeters >= 1000.0) {
            String.format(Locale.US, "%.1f km", safeMeters / 1000.0)
        } else {
            "${safeMeters.roundToInt()} m"
        }
    }

    fun estimateTravelMinutes(distanceMeters: Double): Int {
        val safeMeters = distanceMeters.coerceAtLeast(0.0)
        if (safeMeters < 50.0) return 1
        return ceil(safeMeters / URBAN_METERS_PER_MINUTE).toInt().coerceAtLeast(1)
    }

    fun rankHubs(
        hubs: List<HubDto>,
        origin: SelectedOrigin,
        filter: HubRadiusFilter = HubRadiusFilter.ALL,
        distanceCalculator: (Double, Double, Double, Double) -> Double = ::androidDistanceMeters
    ): List<RankedHub> {
        if (hubs.isEmpty()) return emptyList()
        val sorted = hubs.map { hub ->
            val coords = HubGeoCatalog.resolve(hub)
            val dist = distanceCalculator(origin.lat, origin.lng, coords.lat, coords.lng)
            Triple(hub, coords, dist)
        }.sortedBy { it.third }

        val nearestId = sorted.firstOrNull()?.first?.id
        return sorted
            .filter { (_, _, dist) -> filter.maxMeters?.let { dist <= it } ?: true }
            .map { (hub, coords, dist) ->
                RankedHub(
                    hub = hub,
                    coordinates = coords,
                    distanceMeters = dist,
                    isNearest = hub.id == nearestId
                )
            }
    }
}

data class VehicleDto(
    val id: String,
    val vehicleType: String,
    val batteryPercent: Int,
    val hubId: String? = null,
    val status: String? = null,
    val ownerId: String? = null,
    val connectorType: String? = null
) {
    val displayType: String
        get() = if (vehicleType == "electric_motorbike") "Xe máy điện" else "Xe đạp điện"
}

data class VehicleReservationDto(
    val id: String,
    val userId: String? = null,
    val vehicleId: String,
    val hubId: String,
    val status: String,
    val ticketCode: String,
    val createdAt: String? = null,
    val expiresAt: String? = null,
    val tripId: String? = null,
    val pendingCommandId: String? = null
) {
    val isActivePending: Boolean
        get() = status in setOf("Reserved", "PickupClaimed", "PickupUncertain")
}

data class PendingReturnInfo(
    val hubId: String,
    val slotId: String,
    val confirmed: Boolean = true
)

data class TripDto(
    val id: String,
    val reservationId: String? = null,
    val userId: String? = null,
    val vehicleId: String,
    val status: String,
    val startTime: String? = null,
    val endTime: String? = null,
    val hubId: String? = null,
    val slotId: String? = null,
    val batteryPercent: Int? = null,
    val distance: Double? = null,
    val pendingCommandId: String? = null,
    val pendingReturn: PendingReturnInfo? = null
)

data class SlotDto(
    val id: String,
    val hubId: String,
    val code: String,
    val status: String
)

data class TripIncidentDto(
    val id: String,
    val tripId: String? = null,
    val vehicleId: String? = null,
    val status: String? = null,
    val description: String? = null
)

data class ParkingAvailabilityDto(
    val hubId: String,
    val pool: String,
    val plannedArrival: String? = null,
    val plannedCheckout: String? = null,
    val availableSlots: List<SlotDto> = emptyList()
)

data class ParkingReservationDto(
    val id: String,
    val reservationId: String? = null,
    val userId: String? = null,
    val vehicleId: String,
    val privateVehicleId: String? = null,
    val hubId: String,
    val slotId: String,
    val pool: String,
    val ticketCode: String,
    val plannedArrival: String? = null,
    val plannedCheckout: String? = null,
    val expiresAt: String? = null,
    val status: String,
    val occupancyId: String? = null,
    val createdAt: String? = null,
    val cancelledAt: String? = null
)

data class ParkingCheckInDto(
    val reservationId: String,
    val status: String,
    val occupancyId: String,
    val hubId: String,
    val slotId: String,
    val actualCheckInAt: String? = null,
    val scheduledCheckoutAt: String? = null
)

data class ParkingOccupancyDto(
    val id: String,
    val reservationId: String,
    val userId: String? = null,
    val vehicleId: String,
    val hubId: String,
    val slotId: String,
    val actualCheckInAt: String? = null,
    val scheduledCheckoutAt: String? = null,
    val actualCheckoutAt: String? = null,
    val finalFee: Double? = null,
    val createdAt: String? = null
) {
    val isActive: Boolean get() = actualCheckoutAt == null
}

data class ChargingRequestDto(
    val id: String,
    val userId: String? = null,
    val vehicleId: String,
    val occupancyId: String? = null,
    val hubId: String,
    val batteryAtRequest: Int = 0,
    val targetBatteryPercent: Int = 80,
    val neededBy: String? = null,
    val requestedStart: String? = null,
    val status: String,
    val createdAt: String? = null,
    val updatedAt: String? = null,
    val currentBatteryPercent: Int? = null,
    val allocationId: String? = null,
    val pointId: String? = null,
    val sessionId: String? = null,
    val sessionStatus: String? = null
)

data class ChargingSessionDto(
    val id: String,
    val requestId: String,
    val allocationId: String? = null,
    val pointId: String,
    val startedAt: String? = null,
    val stoppedAt: String? = null,
    val allocatedPowerKw: Double = 0.0,
    val status: String,
    val stopReason: String? = null,
    val userId: String? = null,
    val vehicleId: String? = null,
    val hubId: String? = null,
    val targetBatteryPercent: Int? = null,
    val connectorStatus: String? = null,
    val currentBatteryPercent: Int? = null,
    val requestStatus: String? = null
)

data class PendingCommandEntry(
    val operationKey: String,
    val idempotencyKey: String,
    val path: String,
    val bodyJson: String
)

class ApiException(
    val statusCode: Int,
    val code: String,
    override val message: String,
    val details: JsonObject? = null,
    val isNetworkError: Boolean = false
) : Exception(message)
