package com.promptlinter.app.data.repository

import android.content.Context
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import com.promptlinter.app.data.model.AnalysisPayload
import com.promptlinter.app.data.model.HistoryItem
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.UUID

class HistoryRepository(context: Context) {
    private val prefs = context.applicationContext.getSharedPreferences("prompt_linter", Context.MODE_PRIVATE)
    private val gson = Gson()
    private val key = "prompt_linter_history_v1"

    fun getAll(): List<HistoryItem> {
        val raw = prefs.getString(key, null) ?: return emptyList()
        return try {
            val type = object : TypeToken<List<HistoryItem>>() {}.type
            gson.fromJson<List<HistoryItem>>(raw, type) ?: emptyList()
        } catch (_: Exception) { emptyList() }
    }

    fun save(prompt: String, payload: AnalysisPayload): HistoryItem {
        val item = toHistoryItem(prompt, payload)
        val items = getAll().filter { it.id != item.id }.toMutableList()
        items.add(0, item)
        prefs.edit().putString(key, gson.toJson(items)).apply()
        return item
    }

    fun delete(id: String) {
        val items = getAll().filter { it.id != id }
        prefs.edit().putString(key, gson.toJson(items)).apply()
    }

    fun clear() { prefs.edit().putString(key, "[]").apply() }

    private fun toHistoryItem(prompt: String, payload: AnalysisPayload): HistoryItem {
        val final = payload.risk.final
        val components = final.components
        val completeness = (100 * (1 - components.completeness)).toInt().coerceIn(0, 100)
        val level = when (final.level) {
            "Critical" -> "CRITICAL"
            "High" -> "HIGH"
            "Medium" -> "MEDIUM"
            else -> "LOW"
        }
        return HistoryItem(
            id = "pl-${System.currentTimeMillis()}-${UUID.randomUUID().toString().take(6)}",
            prompt = prompt,
            riskScore = final.score.toInt(),
            riskLevel = level,
            coverageScore = completeness,
            confidenceScore = ((payload.confidence ?: 0.0) * 100).toInt(),
            elements = payload.result.elements.map { "${it.type} #${it.id}" },
            summary = payload.result.summary.message,
            createdAt = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).format(Date()),
            payloadJson = null
        )
    }

    fun filterAndSort(search: String, riskFilter: String, sortBy: String): List<HistoryItem> {
        var list = getAll()
        val q = search.trim().lowercase()
        if (q.isNotEmpty()) {
            list = list.filter { it.prompt.lowercase().contains(q) || it.elements.any { e -> e.lowercase().contains(q) } }
        }
        if (riskFilter != "ALL") list = list.filter { it.riskLevel == riskFilter }
        list = when (sortBy) {
            "risk_desc" -> list.sortedByDescending { it.riskScore }
            "coverage_asc" -> list.sortedBy { it.coverageScore }
            else -> list.sortedByDescending { it.createdAt }
        }
        return list
    }
}
