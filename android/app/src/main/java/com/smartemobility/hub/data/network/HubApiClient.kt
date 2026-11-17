package com.smartemobility.hub.data.network

import com.google.gson.Gson
import com.google.gson.JsonElement
import com.google.gson.JsonObject
import com.google.gson.JsonParser
import com.google.gson.reflect.TypeToken
import com.smartemobility.hub.data.model.ApiErrorMapper
import com.smartemobility.hub.data.model.ApiException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.HttpUrl.Companion.toHttpUrlOrNull
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.IOException
import java.lang.reflect.Type
import java.util.concurrent.TimeUnit

class HubApiClient(
    initialBaseUrl: String,
    private val cookieJar: SessionCookieJar = SessionCookieJar(),
    val gson: Gson = Gson()
) {
    @Volatile
    var baseUrl: String = normalizeBaseUrl(initialBaseUrl)
        private set

    private val jsonMediaType = "application/json; charset=utf-8".toMediaType()

    private val client = OkHttpClient.Builder()
        .cookieJar(cookieJar)
        .connectTimeout(8, TimeUnit.SECONDS)
        .readTimeout(15, TimeUnit.SECONDS)
        .writeTimeout(15, TimeUnit.SECONDS)
        .build()

    fun updateBaseUrl(rawUrl: String) {
        val normalized = normalizeBaseUrl(rawUrl)
        if (normalized != baseUrl) {
            baseUrl = normalized
            cookieJar.clear()
        }
    }

    fun clearSessionCookies() {
        cookieJar.clear()
    }

    suspend fun <T> get(path: String, type: Type): T = execute("GET", path, null, null, type)

    suspend fun <T> post(
        path: String,
        bodyJson: String?,
        idempotencyKey: String?,
        type: Type
    ): T = execute("POST", path, bodyJson ?: "{}", idempotencyKey, type)

    suspend fun <T> delete(path: String, type: Type): T = execute("DELETE", path, null, null, type)

    private suspend fun <T> execute(
        method: String,
        path: String,
        bodyJson: String?,
        idempotencyKey: String?,
        type: Type
    ): T = withContext(Dispatchers.IO) {
        val parsedBase = baseUrl.toHttpUrlOrNull()
            ?: throw ApiException(0, "INVALID_URL", "Địa chỉ máy chủ không hợp lệ: $baseUrl")

        val fullUrl = "$baseUrl/api/v1$path"
        val builder = Request.Builder().url(fullUrl)

        // Match app/src/app.js same-origin CSRF check on cookie-authenticated writes.
        if (method != "GET" && method != "HEAD" && method != "OPTIONS") {
            val portSuffix = if ((parsedBase.scheme == "http" && parsedBase.port == 80) ||
                (parsedBase.scheme == "https" && parsedBase.port == 443)
            ) "" else ":${parsedBase.port}"
            builder.header("Origin", "${parsedBase.scheme}://${parsedBase.host}$portSuffix")
        }
        if (!idempotencyKey.isNullOrBlank()) {
            builder.header("Idempotency-Key", idempotencyKey)
        }

        when (method) {
            "GET" -> builder.get()
            "DELETE" -> builder.delete()
            else -> builder.method(method, (bodyJson ?: "{}").toRequestBody(jsonMediaType))
        }

        val response = try {
            client.newCall(builder.build()).execute()
        } catch (ex: IOException) {
            throw ApiException(
                statusCode = 0,
                code = "NETWORK_ERROR",
                message = "Mất kết nối tới máy chủ ($baseUrl). Yêu cầu được giữ lại để thử lại an toàn.",
                isNetworkError = true
            )
        }

        response.use { res ->
            val rawBody = res.body?.string().orEmpty()
            val root = try {
                if (rawBody.isNotBlank()) JsonParser.parseString(rawBody).asJsonObject else JsonObject()
            } catch (_: Exception) {
                JsonObject()
            }

            if (!res.isSuccessful) {
                val errObj = root.getAsJsonObject("error")
                val code = errObj?.get("code")?.asString ?: "HTTP_${res.code}"
                val rawMsg = errObj?.get("message")?.asString
                val details = errObj?.getAsJsonObject("details")
                throw ApiException(
                    statusCode = res.code,
                    code = code,
                    message = ApiErrorMapper.toVietnameseMessage(code, rawMsg),
                    details = details
                )
            }

            val dataElement: JsonElement = root.get("data") ?: JsonObject()
            gson.fromJson(dataElement, type)
        }
    }

    companion object {
        inline fun <reified T> typeOf(): Type = object : TypeToken<T>() {}.type

        fun normalizeBaseUrl(raw: String): String {
            val trimmed = raw.trim().trimEnd('/')
            return if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
                trimmed
            } else {
                "http://$trimmed"
            }
        }
    }
}
