package com.smartemobility.hub.data.network

import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import okhttp3.Cookie
import okhttp3.CookieJar
import okhttp3.HttpUrl
import java.util.concurrent.ConcurrentHashMap

private data class StoredCookie(
    val host: String,
    val name: String,
    val value: String,
    val domain: String,
    val path: String,
    val expiresAt: Long,
    val httpOnly: Boolean,
    val secure: Boolean
)

class SessionCookieJar(
    private val storage: KeyValueStorage? = null,
    private val gson: Gson = Gson()
) : CookieJar {
    private val cookiesByHost = ConcurrentHashMap<String, MutableList<Cookie>>()
    private val listType = object : TypeToken<List<StoredCookie>>() {}.type

    init {
        restoreFromStorage()
    }

    override fun saveFromResponse(url: HttpUrl, cookies: List<Cookie>) {
        if (cookies.isEmpty()) return
        val host = url.host
        val current = cookiesByHost.getOrPut(host) { mutableListOf() }
        synchronized(current) {
            for (cookie in cookies) {
                current.removeAll { it.name == cookie.name && it.path == cookie.path }
                if (cookie.value.isNotBlank() && cookie.expiresAt > System.currentTimeMillis()) {
                    current.add(cookie)
                }
            }
        }
        persistToStorage()
    }

    override fun loadForRequest(url: HttpUrl): List<Cookie> {
        val current = cookiesByHost[url.host] ?: return emptyList()
        val now = System.currentTimeMillis()
        var removed = false
        val matched: List<Cookie>
        synchronized(current) {
            removed = current.removeAll { it.expiresAt <= now }
            matched = current.filter { it.matches(url) }
        }
        if (removed) persistToStorage()
        return matched
    }

    fun clear() {
        cookiesByHost.clear()
        storage?.putString(STORAGE_KEY, "[]")
    }

    private fun restoreFromStorage() {
        val raw = storage?.getString(STORAGE_KEY) ?: return
        val now = System.currentTimeMillis()
        val stored = try {
            gson.fromJson<List<StoredCookie>>(raw, listType) ?: emptyList()
        } catch (_: Exception) {
            emptyList()
        }
        for (item in stored) {
            if (item.expiresAt <= now || item.value.isBlank()) continue
            val builder = Cookie.Builder()
                .name(item.name)
                .value(item.value)
                .domain(item.domain)
                .path(item.path)
                .expiresAt(item.expiresAt)
            if (item.httpOnly) builder.httpOnly()
            if (item.secure) builder.secure()
            cookiesByHost.getOrPut(item.host) { mutableListOf() }.add(builder.build())
        }
    }

    private fun persistToStorage() {
        val target = storage ?: return
        val now = System.currentTimeMillis()
        val snapshot = mutableListOf<StoredCookie>()
        for ((host, list) in cookiesByHost) {
            synchronized(list) {
                for (c in list) {
                    if (c.expiresAt > now && c.value.isNotBlank()) {
                        snapshot.add(
                            StoredCookie(
                                host = host,
                                name = c.name,
                                value = c.value,
                                domain = c.domain,
                                path = c.path,
                                expiresAt = c.expiresAt,
                                httpOnly = c.httpOnly,
                                secure = c.secure
                            )
                        )
                    }
                }
            }
        }
        target.putString(STORAGE_KEY, gson.toJson(snapshot))
    }

    private companion object {
        const val STORAGE_KEY = "session_cookies_v1"
    }
}
