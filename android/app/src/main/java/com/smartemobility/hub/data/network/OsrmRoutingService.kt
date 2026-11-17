package com.smartemobility.hub.data.network

import com.google.gson.JsonParser
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import java.io.IOException
import java.util.Locale
import java.util.concurrent.TimeUnit

data class RoutePoint(
    val lat: Double,
    val lng: Double
)

data class OsrmRouteResult(
    val origin: RoutePoint,
    val destination: RoutePoint,
    val distanceMeters: Double,
    val durationSeconds: Double,
    val points: List<RoutePoint>
) {
    val formattedDistance: String
        get() = if (distanceMeters >= 1000.0) {
            String.format(Locale.US, "%.1f km", distanceMeters / 1000.0)
        } else {
            "${distanceMeters.toInt()} m"
        }

    val formattedDuration: String
        get() {
            val minutes = kotlin.math.ceil(durationSeconds / 60.0).toInt().coerceAtLeast(1)
            return "~$minutes phút"
        }
}

class OsrmRoutingService(
    private val client: OkHttpClient = OkHttpClient.Builder()
        .connectTimeout(8, TimeUnit.SECONDS)
        .readTimeout(12, TimeUnit.SECONDS)
        .build()
) {
    suspend fun fetchRoute(origin: RoutePoint, destination: RoutePoint): OsrmRouteResult =
        withContext(Dispatchers.IO) {
            val url = String.format(
                Locale.US,
                "https://router.project-osrm.org/route/v1/driving/%.6f,%.6f;%.6f,%.6f?overview=full&geometries=geojson",
                origin.lng,
                origin.lat,
                destination.lng,
                destination.lat
            )
            val request = Request.Builder()
                .url(url)
                .header("User-Agent", "SmartEMobilityHub/1.0 (Android)")
                .get()
                .build()

            val body = try {
                client.newCall(request).execute().use { res ->
                    if (!res.isSuccessful) {
                        throw IllegalStateException("Máy chủ chỉ đường OSRM trả về mã lỗi ${res.code}.")
                    }
                    res.body?.string().orEmpty()
                }
            } catch (_: IOException) {
                throw IllegalStateException("Không kết nối được dịch vụ chỉ đường OSRM. Hãy kiểm tra Internet.")
            }

            parseGeoJsonRoute(body, origin, destination)
        }

    companion object {
        fun parseGeoJsonRoute(
            rawJson: String,
            origin: RoutePoint,
            destination: RoutePoint
        ): OsrmRouteResult {
            val root = try {
                JsonParser.parseString(rawJson).asJsonObject
            } catch (_: Exception) {
                throw IllegalStateException("Dữ liệu tuyến đường OSRM không hợp lệ.")
            }

            val code = root.get("code")?.asString
            if (!code.equals("Ok", ignoreCase = true)) {
                throw IllegalStateException("Không tìm thấy tuyến đường phù hợp từ OSRM.")
            }

            val routes = root.getAsJsonArray("routes")
                ?: throw IllegalStateException("Phản hồi OSRM không có tuyến đường.")
            if (routes.size() == 0) {
                throw IllegalStateException("Không tìm thấy tuyến đường tới Hub đã chọn.")
            }

            val firstRoute = routes[0].asJsonObject
            val distance = firstRoute.get("distance")?.asDouble ?: 0.0
            val duration = firstRoute.get("duration")?.asDouble ?: 0.0
            val geometry = firstRoute.getAsJsonObject("geometry")
            val coords = geometry?.getAsJsonArray("coordinates")
                ?: throw IllegalStateException("Tuyến đường OSRM thiếu tọa độ GeoJSON.")

            val points = ArrayList<RoutePoint>(coords.size())
            for (i in 0 until coords.size()) {
                val pair = coords[i].asJsonArray
                if (pair.size() >= 2) {
                    val lng = pair[0].asDouble
                    val lat = pair[1].asDouble
                    points.add(RoutePoint(lat = lat, lng = lng))
                }
            }
            if (points.isEmpty()) {
                throw IllegalStateException("Tuyến đường OSRM không có điểm tọa độ.")
            }

            return OsrmRouteResult(
                origin = origin,
                destination = destination,
                distanceMeters = distance,
                durationSeconds = duration,
                points = points
            )
        }
    }
}
