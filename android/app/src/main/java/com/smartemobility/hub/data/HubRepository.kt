package com.smartemobility.hub.data

import com.smartemobility.hub.data.model.ApiException
import com.smartemobility.hub.data.model.ChargingRequestDto
import com.smartemobility.hub.data.model.ChargingSessionDto
import com.smartemobility.hub.data.model.HubDto
import com.smartemobility.hub.data.model.ParkingAvailabilityDto
import com.smartemobility.hub.data.model.ParkingCheckInDto
import com.smartemobility.hub.data.model.ParkingOccupancyDto
import com.smartemobility.hub.data.model.ParkingReservationDto
import com.smartemobility.hub.data.model.PendingCommandEntry
import com.smartemobility.hub.data.model.SessionUser
import com.smartemobility.hub.data.model.SlotDto
import com.smartemobility.hub.data.model.TripDto
import com.smartemobility.hub.data.model.TripIncidentDto
import com.smartemobility.hub.data.model.VehicleDto
import com.smartemobility.hub.data.model.VehicleReservationDto
import com.smartemobility.hub.data.network.HubApiClient
import com.smartemobility.hub.data.network.IdempotencyStore
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import java.lang.reflect.Type
import java.net.URLEncoder
import java.nio.charset.StandardCharsets

data class UserWorkspaceSnapshot(
    val hubs: List<HubDto>,
    val vehicleReservations: List<VehicleReservationDto>,
    val trips: List<TripDto>,
    val privateVehicles: List<VehicleDto>,
    val parkingReservations: List<ParkingReservationDto>,
    val parkingOccupancies: List<ParkingOccupancyDto>,
    val chargingRequests: List<ChargingRequestDto>,
    val activeChargingSession: ChargingSessionDto?,
    val pendingCommands: List<PendingCommandEntry>
)

class HubRepository(
    val api: HubApiClient,
    private val idempotencyStore: IdempotencyStore
) {
    private val gson = api.gson

    suspend fun getSession(): SessionUser? = try {
        api.get("/session", HubApiClient.typeOf<SessionUser>())
    } catch (ex: ApiException) {
        if (ex.statusCode == 401) null else throw ex
    }

    suspend fun login(username: String, password: String): SessionUser {
        val body = gson.toJson(mapOf("username" to username.trim(), "password" to password))
        return api.post("/session", body, null, HubApiClient.typeOf<SessionUser>())
    }

    suspend fun logout() {
        try {
            api.delete<Map<String, Any>>("/session", HubApiClient.typeOf<Map<String, Any>>())
        } finally {
            api.clearSessionCookies()
        }
    }

    suspend fun loadWorkspace(userId: String): UserWorkspaceSnapshot = coroutineScope {
        val hubsDef = async { searchHubs("") }
        val resDef = async { api.get<List<VehicleReservationDto>>("/vehicle-reservations", HubApiClient.typeOf<List<VehicleReservationDto>>()) }
        val tripsRawDef = async { api.get<List<TripDto>>("/trips", HubApiClient.typeOf<List<TripDto>>()) }
        val privateDef = async { api.get<List<VehicleDto>>("/private-vehicles", HubApiClient.typeOf<List<VehicleDto>>()) }
        val pResDef = async { api.get<List<ParkingReservationDto>>("/parking-reservations", HubApiClient.typeOf<List<ParkingReservationDto>>()) }
        val pOccDef = async { api.get<List<ParkingOccupancyDto>>("/parking-occupancies", HubApiClient.typeOf<List<ParkingOccupancyDto>>()) }
        val cReqDef = async { api.get<List<ChargingRequestDto>>("/charging-requests", HubApiClient.typeOf<List<ChargingRequestDto>>()) }

        val rawTrips = tripsRawDef.await()
        val hydratedTrips = rawTrips.map { trip ->
            if (trip.status == "Active") {
                api.get<TripDto>("/trips/${enc(trip.id)}", HubApiClient.typeOf<TripDto>())
            } else {
                trip
            }
        }
        val chargingRequests = cReqDef.await()
        val activeSessionId = chargingRequests.firstOrNull {
            !it.sessionId.isNullOrBlank() && (it.status == "Charging" || it.sessionStatus == "Active")
        }?.sessionId
        val activeSession = if (activeSessionId != null) {
            try {
                getChargingSession(activeSessionId)
            } catch (_: ApiException) {
                null
            }
        } else {
            null
        }

        UserWorkspaceSnapshot(
            hubs = hubsDef.await(),
            vehicleReservations = resDef.await(),
            trips = hydratedTrips,
            privateVehicles = privateDef.await(),
            parkingReservations = pResDef.await(),
            parkingOccupancies = pOccDef.await(),
            chargingRequests = chargingRequests,
            activeChargingSession = activeSession,
            pendingCommands = idempotencyStore.listPending(userId)
        )
    }

    suspend fun searchHubs(query: String): List<HubDto> {
        val suffix = if (query.isBlank()) "" else "?q=${enc(query.trim())}"
        return api.get("/hubs$suffix", HubApiClient.typeOf<List<HubDto>>())
    }

    suspend fun listAvailableVehicles(hubId: String, typeFilter: String?): List<VehicleDto> {
        val suffix = if (typeFilter.isNullOrBlank()) "" else "?type=${enc(typeFilter)}"
        return api.get("/hubs/${enc(hubId)}/vehicles$suffix", HubApiClient.typeOf<List<VehicleDto>>())
    }

    suspend fun reserveVehicle(userId: String, hubId: String, vehicleId: String): VehicleReservationDto =
        idempotentPost(
            userId = userId,
            operationKey = "reserve-vehicle",
            path = "/vehicle-reservations",
            payload = mapOf("vehicleId" to vehicleId, "hubId" to hubId),
            type = HubApiClient.typeOf<VehicleReservationDto>()
        )

    suspend fun cancelVehicleReservation(userId: String, reservationId: String): VehicleReservationDto =
        idempotentPost(
            userId = userId,
            operationKey = "cancel-vehicle:$reservationId",
            path = "/vehicle-reservations/${enc(reservationId)}/cancel",
            payload = emptyMap<String, Any>(),
            type = HubApiClient.typeOf<VehicleReservationDto>()
        )

    suspend fun pickupVehicle(userId: String, reservationId: String, vehicleCode: String): TripDto =
        idempotentPost(
            userId = userId,
            operationKey = "pickup:$reservationId",
            path = "/vehicle-reservations/${enc(reservationId)}/pickup",
            payload = mapOf("vehicleCode" to vehicleCode.trim()),
            type = HubApiClient.typeOf<TripDto>()
        )

    suspend fun getReturnSlots(hubId: String, tripId: String): List<SlotDto> =
        api.get(
            "/hubs/${enc(hubId)}/return-slots?tripId=${enc(tripId)}",
            HubApiClient.typeOf<List<SlotDto>>()
        )

    suspend fun returnTrip(userId: String, tripId: String, hubId: String, slotId: String): TripDto =
        idempotentPost(
            userId = userId,
            operationKey = "return:$tripId",
            path = "/trips/${enc(tripId)}/return",
            payload = mapOf("hubId" to hubId, "slotId" to slotId, "confirmed" to true),
            type = HubApiClient.typeOf<TripDto>()
        )

    suspend fun reportTripIncident(userId: String, tripId: String, description: String): TripIncidentDto =
        idempotentPost(
            userId = userId,
            operationKey = "incident:$tripId:${description.hashCode()}",
            path = "/trips/${enc(tripId)}/incidents",
            payload = mapOf("description" to description.trim()),
            type = HubApiClient.typeOf<TripIncidentDto>()
        )

    suspend fun getParkingAvailability(
        hubId: String,
        pool: String,
        privateVehicleId: String?,
        plannedArrival: String?,
        plannedCheckout: String?
    ): ParkingAvailabilityDto {
        val params = mutableListOf("pool=${enc(pool)}")
        if (!privateVehicleId.isNullOrBlank()) params.add("privateVehicleId=${enc(privateVehicleId.trim())}")
        if (!plannedArrival.isNullOrBlank()) params.add("plannedArrival=${enc(plannedArrival.trim())}")
        if (!plannedCheckout.isNullOrBlank()) params.add("plannedCheckout=${enc(plannedCheckout.trim())}")
        return api.get(
            "/hubs/${enc(hubId)}/parking-availability?${params.joinToString("&")}",
            HubApiClient.typeOf<ParkingAvailabilityDto>()
        )
    }

    suspend fun createParkingReservation(
        userId: String,
        hubId: String,
        privateVehicleId: String,
        pool: String,
        slotId: String?,
        plannedArrival: String?,
        plannedCheckout: String?
    ): ParkingReservationDto {
        val payload = linkedMapOf<String, Any>(
            "hubId" to hubId,
            "privateVehicleId" to privateVehicleId.trim(),
            "pool" to pool
        )
        if (!slotId.isNullOrBlank()) payload["slotId"] = slotId
        if (!plannedArrival.isNullOrBlank()) payload["plannedArrival"] = plannedArrival
        if (!plannedCheckout.isNullOrBlank()) payload["plannedCheckout"] = plannedCheckout
        return idempotentPost(
            userId = userId,
            operationKey = "parking-reserve",
            path = "/parking-reservations",
            payload = payload,
            type = HubApiClient.typeOf<ParkingReservationDto>()
        )
    }

    suspend fun cancelParkingReservation(userId: String, reservationId: String): ParkingReservationDto =
        idempotentPost(
            userId = userId,
            operationKey = "parking-cancel:$reservationId",
            path = "/parking-reservations/${enc(reservationId)}/cancel",
            payload = emptyMap<String, Any>(),
            type = HubApiClient.typeOf<ParkingReservationDto>()
        )

    suspend fun checkInParking(
        userId: String,
        reservationId: String,
        hubId: String,
        ticketCode: String
    ): ParkingCheckInDto =
        idempotentPost(
            userId = userId,
            operationKey = "parking-checkin:$reservationId",
            path = "/parking-reservations/${enc(reservationId)}/check-in",
            payload = mapOf("hubId" to hubId, "ticketCode" to ticketCode),
            type = HubApiClient.typeOf<ParkingCheckInDto>()
        )

    suspend fun checkOutParking(
        userId: String,
        occupancyId: String,
        cancelQueuedCharging: Boolean
    ): ParkingOccupancyDto =
        idempotentPost(
            userId = userId,
            operationKey = "parking-checkout:$occupancyId:${if (cancelQueuedCharging) "cancel" else "keep"}",
            path = "/parking-occupancies/${enc(occupancyId)}/check-out",
            payload = mapOf("cancelQueuedCharging" to cancelQueuedCharging),
            type = HubApiClient.typeOf<ParkingOccupancyDto>()
        )

    suspend fun submitChargingRequest(
        userId: String,
        occupancyId: String,
        targetBatteryPercent: Int,
        neededByIso: String?
    ): ChargingRequestDto {
        val payload = linkedMapOf<String, Any>(
            "occupancyId" to occupancyId,
            "targetBatteryPercent" to targetBatteryPercent
        )
        if (!neededByIso.isNullOrBlank()) payload["neededBy"] = neededByIso
        return idempotentPost(
            userId = userId,
            operationKey = "charging-request:$occupancyId",
            path = "/charging-requests",
            payload = payload,
            type = HubApiClient.typeOf<ChargingRequestDto>()
        )
    }

    suspend fun cancelChargingRequest(userId: String, requestId: String): ChargingRequestDto =
        idempotentPost(
            userId = userId,
            operationKey = "charging-cancel:$requestId",
            path = "/charging-requests/${enc(requestId)}/cancel",
            payload = emptyMap<String, Any>(),
            type = HubApiClient.typeOf<ChargingRequestDto>()
        )

    suspend fun stopChargingSession(userId: String, sessionId: String): ChargingSessionDto =
        idempotentPost(
            userId = userId,
            operationKey = "charging-stop:$sessionId",
            path = "/charging-sessions/${enc(sessionId)}/stop",
            payload = emptyMap<String, Any>(),
            type = HubApiClient.typeOf<ChargingSessionDto>()
        )

    suspend fun getChargingSession(sessionId: String): ChargingSessionDto =
        api.get("/charging-sessions/${enc(sessionId)}", HubApiClient.typeOf<ChargingSessionDto>())

    suspend fun retryPendingCommand(userId: String, entry: PendingCommandEntry) {
        try {
            api.post<Map<String, Any>>(
                entry.path,
                entry.bodyJson,
                entry.idempotencyKey,
                HubApiClient.typeOf<Map<String, Any>>()
            )
            idempotencyStore.clear(userId, entry.operationKey)
        } catch (ex: ApiException) {
            if (ex.statusCode in 400..499 && ex.code != "COMMAND_IN_PROGRESS") {
                idempotencyStore.clear(userId, entry.operationKey)
            }
            throw ex
        }
    }

    fun discardPendingCommand(userId: String, operationKey: String) {
        idempotencyStore.clear(userId, operationKey)
    }

    private suspend fun <T> idempotentPost(
        userId: String,
        operationKey: String,
        path: String,
        payload: Any,
        type: Type
    ): T {
        val bodyJson = gson.toJson(payload)
        val entry = idempotencyStore.prepare(userId, operationKey, path, bodyJson)
        return try {
            val result = api.post<T>(path, entry.bodyJson, entry.idempotencyKey, type)
            idempotencyStore.clear(userId, operationKey)
            result
        } catch (ex: ApiException) {
            if (ex.statusCode in 400..499 && ex.code != "COMMAND_IN_PROGRESS") {
                idempotencyStore.clear(userId, operationKey)
            }
            throw ex
        }
    }

    private fun enc(value: String): String = URLEncoder.encode(value, StandardCharsets.UTF_8.name())
}
