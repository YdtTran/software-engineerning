package com.smartemobility.hub.data

import com.smartemobility.hub.data.model.ApiErrorMapper
import com.smartemobility.hub.data.model.HubDistanceUtils
import com.smartemobility.hub.data.model.HubDto
import com.smartemobility.hub.data.model.HubGeoCatalog
import com.smartemobility.hub.data.model.HubLocation
import com.smartemobility.hub.data.model.HubRadiusFilter
import com.smartemobility.hub.data.model.OriginSource
import com.smartemobility.hub.data.model.QrCodeParser
import com.smartemobility.hub.data.model.SelectedOrigin
import com.smartemobility.hub.data.network.HubApiClient
import com.smartemobility.hub.data.network.IdempotencyStore
import com.smartemobility.hub.data.network.KeyValueStorage
import com.smartemobility.hub.data.network.OsrmRoutingService
import com.smartemobility.hub.data.network.PhotonGeocodingService
import com.smartemobility.hub.data.network.RoutePoint
import com.smartemobility.hub.data.network.SessionCookieJar
import okhttp3.Cookie
import okhttp3.HttpUrl.Companion.toHttpUrl
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertTrue
import org.junit.Test

private class InMemoryKeyValueStorage : KeyValueStorage {
    private val map = mutableMapOf<String, String>()
    override fun getString(key: String): String? = map[key]
    override fun putString(key: String, value: String) {
        map[key] = value
    }
}

class HubClientUnitTest {
    @Test
    fun idempotencyStoreReusesKeyForSamePayloadAndBlocksMutation() {
        val store = IdempotencyStore(InMemoryKeyValueStorage())
        val first = store.prepare("u1", "reserve-vehicle", "/vehicle-reservations", """{"vehicleId":"EB-024"}""")
        val replay = store.prepare("u1", "reserve-vehicle", "/vehicle-reservations", """{"vehicleId":"EB-024"}""")
        assertEquals(first.idempotencyKey, replay.idempotencyKey)

        var threw = false
        try {
            store.prepare("u1", "reserve-vehicle", "/vehicle-reservations", """{"vehicleId":"EB-031"}""")
        } catch (_: IllegalStateException) {
            threw = true
        }
        assertTrue(threw)

        store.clear("u1", "reserve-vehicle")
        val next = store.prepare("u1", "reserve-vehicle", "/vehicle-reservations", """{"vehicleId":"EB-031"}""")
        assertNotEquals(first.idempotencyKey, next.idempotencyKey)
    }

    @Test
    fun apiErrorMapperMapsKnownCodesAndFallsBackCleanly() {
        assertTrue(ApiErrorMapper.toVietnameseMessage("SLOT_OCCUPIED", "raw").contains("LIM-01"))
        assertTrue(ApiErrorMapper.toVietnameseMessage("CHARGING_REQUEST_QUEUED", "raw").contains("yêu cầu sạc"))
        assertEquals("Custom fallback", ApiErrorMapper.toVietnameseMessage("UNKNOWN_CODE", "Custom fallback"))
    }

    @Test
    fun hubGeoCatalogPrefersBackendLocationAndFallsBackForKnownIds() {
        val fallback = HubGeoCatalog.resolve(HubDto(id = "metro", name = "Ga Metro ĐHQG", location = null))
        assertTrue(fallback.isIllustrativeFallback)
        assertTrue(fallback.lat > 10.8 && fallback.lng > 106.7)

        val real = HubGeoCatalog.resolve(HubDto(id = "metro", name = "Ga Metro", location = HubLocation(10.9, 106.85)))
        assertFalse(real.isIllustrativeFallback)
        assertEquals(10.9, real.lat, 0.0001)
    }

    @Test
    fun normalizeBaseUrlAddsDefaultSchemeAndStripsTrailingSlash() {
        assertEquals("http://10.0.2.2:3000", HubApiClient.normalizeBaseUrl("10.0.2.2:3000/"))
        assertEquals("https://hub.example.com", HubApiClient.normalizeBaseUrl("https://hub.example.com///"))
    }

    @Test
    fun sessionCookieJarPersistsAndClearsAcrossInstances() {
        val storage = InMemoryKeyValueStorage()
        val url = "http://10.0.2.2:3000/api/v1/session".toHttpUrl()
        val cookie = Cookie.Builder()
            .name("demo_session")
            .value("abc123token")
            .domain("10.0.2.2")
            .path("/")
            .httpOnly()
            .expiresAt(System.currentTimeMillis() + 60_000L)
            .build()

        val firstJar = SessionCookieJar(storage)
        firstJar.saveFromResponse(url, listOf(cookie))

        val restoredJar = SessionCookieJar(storage)
        val loaded = restoredJar.loadForRequest(url)
        assertEquals(1, loaded.size)
        assertEquals("abc123token", loaded[0].value)

        restoredJar.clear()
        assertEquals(0, SessionCookieJar(storage).loadForRequest(url).size)
    }

    @Test
    fun osrmRoutingServiceParsesGeoJsonCoordinatesAndMetrics() {
        val sampleJson = """
            {
              "code": "Ok",
              "routes": [{
                "distance": 1375.8,
                "duration": 186.6,
                "geometry": {
                  "type": "LineString",
                  "coordinates": [[106.805412, 10.88051], [106.807200, 10.87990], [106.809100, 10.87940]]
                }
              }]
            }
        """.trimIndent()
        val result = OsrmRoutingService.parseGeoJsonRoute(
            sampleJson,
            RoutePoint(10.8805, 106.8053),
            RoutePoint(10.8794, 106.8091)
        )
        assertEquals(3, result.points.size)
        assertEquals(10.88051, result.points[0].lat, 0.0001)
        assertEquals(106.805412, result.points[0].lng, 0.0001)
        assertEquals("1.4 km", result.formattedDistance)
        assertEquals("~4 phút", result.formattedDuration)
    }

    @Test
    fun qrCodeParserExtractsVehicleCodeFromPlainUriAndJson() {
        assertEquals("EB-024", QrCodeParser.extractVehicleCode("EB-024"))
        assertEquals("EB-024", QrCodeParser.extractVehicleCode("emobility://vehicle/EB-024"))
        assertEquals("EM-012", QrCodeParser.extractVehicleCode("https://hub.local/pickup?vehicleCode=EM-012"))
        assertEquals("EB-031", QrCodeParser.extractVehicleCode("""{"vehicleCode":"EB-031"}"""))
        assertEquals(null, QrCodeParser.extractVehicleCode("   "))
    }

    @Test
    fun photonGeocodingParsesPlaceNamesSubtitlesAndCoords() {
        val sampleJson = """
            {
              "type": "FeatureCollection",
              "features": [
                {
                  "properties": {
                    "name": "Đại học Bách Khoa - Cơ sở Dĩ An",
                    "street": "Tạ Quang Bửu",
                    "locality": "Tân Lập",
                    "district": "Đông Hòa",
                    "city": "Bình Dương"
                  },
                  "geometry": { "type": "Point", "coordinates": [106.80619, 10.87974] }
                },
                {
                  "properties": {
                    "housenumber": "268",
                    "street": "Lý Thường Kiệt",
                    "city": "Ho Chi Minh City"
                  },
                  "geometry": { "type": "Point", "coordinates": [106.65963, 10.77335] }
                }
              ]
            }
        """.trimIndent()
        val results = PhotonGeocodingService.parseSuggestions(sampleJson)
        assertEquals(2, results.size)
        assertEquals("Đại học Bách Khoa - Cơ sở Dĩ An", results[0].name)
        assertTrue(results[0].subtitle.contains("Tạ Quang Bửu"))
        assertEquals(10.87974, results[0].lat, 0.0001)
        assertEquals("268 Lý Thường Kiệt", results[1].name)
        assertEquals("Ho Chi Minh City", results[1].subtitle)
    }

    @Test
    fun hubDistanceUtilsSortsFiltersAndFormatsMetersOrKilometers() {
        assertEquals("420 m", HubDistanceUtils.formatDistance(420.4))
        assertEquals("1.4 km", HubDistanceUtils.formatDistance(1420.0))

        val hubs = listOf(
            HubDto("far", "Far Hub", HubLocation(10.90, 106.83)),
            HubDto("near", "Near Hub", HubLocation(10.8785, 106.8068)),
            HubDto("mid", "Mid Hub", HubLocation(10.8880, 106.8150))
        )
        val origin = SelectedOrigin("Test", 10.8781, 106.8065, OriginSource.SEARCH)
        val euclideanApprox: (Double, Double, Double, Double) -> Double = { lat1, lng1, lat2, lng2 ->
            val dLat = (lat2 - lat1) * 111_000.0
            val dLng = (lng2 - lng1) * 109_000.0
            kotlin.math.hypot(dLat, dLng)
        }

        val all = HubDistanceUtils.rankHubs(hubs, origin, HubRadiusFilter.ALL, euclideanApprox)
        assertEquals(listOf("near", "mid", "far"), all.map { it.hub.id })
        assertTrue(all[0].isNearest)
        assertFalse(all[1].isNearest)

        val under1Km = HubDistanceUtils.rankHubs(hubs, origin, HubRadiusFilter.UNDER_1_KM, euclideanApprox)
        assertEquals(listOf("near"), under1Km.map { it.hub.id })

        val under3Km = HubDistanceUtils.rankHubs(hubs, origin, HubRadiusFilter.UNDER_3_KM, euclideanApprox)
        assertEquals(listOf("near", "mid"), under3Km.map { it.hub.id })
    }
}
