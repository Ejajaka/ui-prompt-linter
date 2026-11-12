package com.promptlinter.app.ui.viewmodel

import android.app.Application
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.promptlinter.app.data.engine.JsEngine
import com.promptlinter.app.data.model.AnalysisPayload
import com.promptlinter.app.data.model.HistoryItem
import com.promptlinter.app.data.repository.HistoryRepository
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class MainViewModel(app: Application) : AndroidViewModel(app) {
    private val engine = JsEngine(app)
    val historyRepo = HistoryRepository(app)

    var engineReady by mutableStateOf(false)
    var engineError by mutableStateOf<String?>(null)
    var promptText by mutableStateOf("")
    var analyzing by mutableStateOf(false)
    var payload by mutableStateOf<AnalysisPayload?>(null)
    var answers = mutableStateMapOf<String, String>()
    var clarifyRound by mutableIntStateOf(1)

    // history filters
    var historySearch by mutableStateOf("")
    var historyRiskFilter by mutableStateOf("ALL")
    var historySort by mutableStateOf("date_desc")

    var selectedTab by mutableStateOf(Tab.OVERVIEW)
    var detailPage by mutableStateOf<DetailPage?>(null)

    fun openDetail(page: DetailPage) {
        detailPage = page
    }

    fun closeDetail() {
        detailPage = null
    }

    init {
        viewModelScope.launch(Dispatchers.IO) {
            try {
                engine.ensureReady()
                withContext(Dispatchers.Main) { engineReady = true }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) { engineError = e.message ?: "Failed to load engine" }
            }
        }
    }

    fun analyzeNew() {
        val text = promptText.trim()
        if (text.isEmpty() || analyzing) return
        answers.clear()
        clarifyRound = 1
        runAnalysis(text, emptyMap(), false)
    }

    fun submitAnswers(values: Map<String, String>, usePlaceholders: Boolean) {
        val allUnknown = values.values.all { it == "unknown" }
        val stop = usePlaceholders || allUnknown
        val merged = answers.toMutableMap().apply { putAll(values) }
        answers.clear(); answers.putAll(merged)
        val nextRound = clarifyRound + 1
        clarifyRound = nextRound
        viewModelScope.launch(Dispatchers.IO) {
            withContext(Dispatchers.Main) { analyzing = true }
            try {
                var p = engine.analyze(promptText.trim(), merged, false)
                if (p.needsClarification && !stop && nextRound <= 3) {
                    withContext(Dispatchers.Main) {
                        payload = p
                        historyRepo.save(promptText.trim(), p)
                        analyzing = false
                    }
                    return@launch
                }
                if (p.needsClarification) {
                    p = engine.analyze(promptText.trim(), merged, true)
                }
                withContext(Dispatchers.Main) {
                    payload = p
                    historyRepo.save(promptText.trim(), p)
                    analyzing = false
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) { engineError = e.message; analyzing = false }
            }
        }
    }

    private fun runAnalysis(text: String, ans: Map<String, String>, finalize: Boolean) {
        viewModelScope.launch(Dispatchers.IO) {
            withContext(Dispatchers.Main) { analyzing = true }
            try {
                val p = engine.analyze(text, ans, finalize)
                withContext(Dispatchers.Main) {
                    payload = p
                    if (p.error == null) historyRepo.save(text, p)
                    analyzing = false
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) { engineError = e.message; analyzing = false }
            }
        }
    }

    fun openFromHistory(item: HistoryItem) {
        promptText = item.prompt
        detailPage = null
        selectedTab = Tab.NEW_ANALYSIS
        // re-analyze to get full payload view
        answers.clear(); clarifyRound = 1
        runAnalysis(item.prompt, emptyMap(), false)
    }

    fun clearAnalysis() {
        promptText = ""
        payload = null
        answers.clear()
        clarifyRound = 1
    }
}

enum class Tab(val label: String) {
    OVERVIEW("Overview"),
    NEW_ANALYSIS("Analyze"),
    HISTORY("History"),
    SETTINGS("Settings")
}

enum class DetailPage(val label: String) {
    GUIDELINES("Prompt Guidelines"),
    ABOUT("About")
}
