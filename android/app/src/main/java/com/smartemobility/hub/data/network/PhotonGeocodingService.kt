package com.smartemobility.hub.data.network

import com.google.gson.JsonObject
import com.google.gson.JsonParser
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import java.io.IOException
import java.net.URLEncoder
import java.util.Locale
import java.util.concurrent.TimeUnit

data class PhotonPlaceSuggestion(
    val name: String,
    val subtitle: String,
    val lat: Double,
    val lng: Double
)

/** Open-source Photon (Komoot/OSM) geocoding client biased near ĐHQG-HCM. */
class PhotonGeocodingService(
    private val client: OkHttpClient = OkHttpClient.Builder()
        .connectTimeout(6, TimeUnit.SECONDS)
        .readTimeout(8, TimeUnit.SECONDS)
        .build()
) {
    suspend fun searchPlaces(
        query: String,
        biasLat: Double = 10.8781,
        biasLng: Double = 106.8065,
        limit: Int = 5
    ): List<PhotonPlaceSuggestion> {
        val trimmed = query.trim()
        if (trimmed.length < 2) return emptyList()

        return withContext(Dispatchers.IO) {
            val encodedQuery = URLEncoder.encode(trimmed, "UTF-8")
            val url = String.format(
                Locale.US,
                "https://photon.komoot.io/api/?q=%s&lat=%.4f&lon=%.4f&limit=%d",
                encodedQuery,
                biasLat,
                biasLng,
                limit.coerceIn(1, 10)
            )
            val request = Request.Builder()
                .url(url)
                .header("User-Agent", "SmartEMobilityHub/1.0 (Android)")
                .get()
                .build()

            val body = try {
                client.newCall(request).execute().use { res ->
                    if (!res.isSuccessful) {
                        throw IllegalStateException("Dịch vụ tìm địa chỉ Photon trả về mã ${res.code}.")
                    }
                    res.body?.string().orEmpty()
                }
            } catch (_: IOException) {
                throw IllegalStateException("Không kết nối được dịch vụ tìm địa chỉ Photon. Hãy kiểm tra Internet.")
            }

            parseSuggestions(body)
        }
    }

    companion object {
        fun parseSuggestions(rawJson: String): List<PhotonPlaceSuggestion> {
            val root = try {
                JsonParser.parseString(rawJson).asJsonObject
            } catch (_: Exception) {
                throw IllegalStateException("Dữ liệu gợi ý địa điểm Photon không hợp lệ.")
            }

            val features = root.getAsJsonArray("features") ?: return emptyList()
            val results = ArrayList<PhotonPlaceSuggestion>(features.size())
            for (i in 0 until features.size()) {
                val feature = features[i].asJsonObjectOrNull() ?: continue
                val geometry = feature.getAsJsonObject("geometry") ?: continue
                val coords = geometry.getAsJsonArray("coordinates") ?: continue
                if (coords.size() < 2) continue

                val lng = coords[0].asDouble
                val lat = coords[1].asDouble
                if (!lat.isFinite() || !lng.isFinite()) continue

                val props = feature.getAsJsonObject("properties")
                val (title, subtitle) = formatLabels(props, lat, lng)
                results.add(PhotonPlaceSuggestion(name = title, subtitle = subtitle, lat = lat, lng = lng))
            }
            return results
        }

        private fun formatLabels(props: JsonObject?, lat: Double, lng: Double): Pair<String, String> {
            val name = props?.stringOrNull("name")
            val houseNumber = props?.stringOrNull("housenumber")
            val street = props?.stringOrNull("street")
            val streetLine = listOfNotNull(houseNumber, street).joinToString(" ").ifBlank { null }
            val locality = props?.stringOrNull("locality")
            val district = props?.stringOrNull("district")
            val city = props?.stringOrNull("city") ?: props?.stringOrNull("state")
            val country = props?.stringOrNull("country")

            val title = name ?: streetLine ?: district ?: city
                ?: String.format(Locale.US, "%.4f, %.4f", lat, lng)

            val subtitleParts = listOfNotNull(streetLine, locality, district, city, country)
                .map { it.trim() }
                .filter { it.isNotEmpty() && !it.equals(title, ignoreCase = true) }
                .distinct()

            val subtitle = subtitleParts.joinToString(", ")
                .ifBlank { String.format(Locale.US, "%.4f, %.4f", lat, lng) }

            return title to subtitle
        }

        private fun JsonObject.stringOrNull(key: String): String? =
            get(key)?.takeIf { !it.isJsonNull }?.asString?.trim()?.ifBlank { null }

        private fun com.google.gson.JsonElement.asJsonObjectOrNull(): JsonObject? =
            if (isJsonObject) asJsonObject else null
    }
}
