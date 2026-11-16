package com.smartemobility.hub.data.network

import android.content.SharedPreferences
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import com.smartemobility.hub.data.model.PendingCommandEntry
import java.util.UUID

interface KeyValueStorage {
    fun getString(key: String): String?
    fun putString(key: String, value: String)
}

class SharedPrefsStorage(private val prefs: SharedPreferences) : KeyValueStorage {
    override fun getString(key: String): String? = prefs.getString(key, null)
    override fun putString(key: String, value: String) {
        prefs.edit().putString(key, value).apply()
    }
}

class IdempotencyStore(
    private val storage: KeyValueStorage,
    private val gson: Gson = Gson()
) {
    private val mapType = object : TypeToken<MutableMap<String, PendingCommandEntry>>() {}.type

    @Synchronized
    fun prepare(userId: String, operationKey: String, path: String, bodyJson: String): PendingCommandEntry {
        val entries = loadMap(userId)
        val existing = entries[operationKey]
        if (existing != null) {
            if (existing.bodyJson != bodyJson || existing.path != path) {
                throw IllegalStateException(
                    "Yêu cầu trước chưa rõ kết quả. Hãy thử lại đúng yêu cầu cũ trước khi thay đổi."
                )
            }
            return existing
        }
        val created = PendingCommandEntry(
            operationKey = operationKey,
            idempotencyKey = UUID.randomUUID().toString(),
            path = path,
            bodyJson = bodyJson
        )
        entries[operationKey] = created
        saveMap(userId, entries)
        return created
    }

    @Synchronized
    fun clear(userId: String, operationKey: String) {
        val entries = loadMap(userId)
        if (entries.remove(operationKey) != null) {
            saveMap(userId, entries)
        }
    }

    @Synchronized
    fun listPending(userId: String): List<PendingCommandEntry> = loadMap(userId).values.toList()

    private fun storageKey(userId: String): String = "idempotency_pending_$userId"

    private fun loadMap(userId: String): MutableMap<String, PendingCommandEntry> {
        val raw = storage.getString(storageKey(userId)) ?: return mutableMapOf()
        return try {
            gson.fromJson<MutableMap<String, PendingCommandEntry>>(raw, mapType) ?: mutableMapOf()
        } catch (_: Exception) {
            mutableMapOf()
        }
    }

    private fun saveMap(userId: String, entries: Map<String, PendingCommandEntry>) {
        storage.putString(storageKey(userId), gson.toJson(entries))
    }
}
