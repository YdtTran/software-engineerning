package com.smartemobility.hub.data.model

import com.google.gson.JsonParser
import java.net.URI

object QrCodeParser {
    fun extractVehicleCode(rawContent: String?): String? {
        val trimmed = rawContent?.trim().orEmpty()
        if (trimmed.isEmpty()) return null

        if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
            try {
                val obj = JsonParser.parseString(trimmed).asJsonObject
                val candidate = obj.get("vehicleCode")?.asString
                    ?: obj.get("vehicleId")?.asString
                    ?: obj.get("code")?.asString
                if (!candidate.isNullOrBlank()) return candidate.trim()
            } catch (_: Exception) {
                // Fall back to URI/plain parsing
            }
        }

        if (trimmed.contains("://")) {
            try {
                val uri = URI(trimmed)
                val query = uri.query
                if (!query.isNullOrBlank()) {
                    for (param in query.split("&")) {
                        val parts = param.split("=", limit = 2)
                        if (parts.size == 2 && parts[0] in setOf("vehicleCode", "vehicleId", "code")) {
                            if (parts[1].isNotBlank()) return parts[1].trim()
                        }
                    }
                }
                val lastSegment = uri.path?.trimEnd('/')?.substringAfterLast('/')
                if (!lastSegment.isNullOrBlank()) return lastSegment.trim()
            } catch (_: Exception) {
                // Fall back to plain code
            }
        }

        return trimmed
    }
}
