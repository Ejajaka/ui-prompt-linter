package com.promptlinter.app.data.model

import com.google.gson.annotations.SerializedName

data class AnalysisPayload(
    val engine: String? = null,
    val confidence: Double? = 0.0,
    val explanation: String? = null,
    val router: RouterInfo? = null,
    val spans: List<Span> = emptyList(),
    val result: ResultBlock = ResultBlock(),
    val risk: RiskBlock = RiskBlock(),
    val clarification: ClarificationBlock = ClarificationBlock(),
    @SerializedName("needs_clarification") val needsClarification: Boolean = false,
    @SerializedName("final_prompt") val finalPrompt: String? = null,
    val recommendations: List<String> = emptyList(),
    @SerializedName("llm_used") val llmUsed: Boolean = false,
    val error: String? = null
)

data class RouterInfo(val reason: String? = null)

data class Span(
    @SerializedName("charStart") val charStart: Int = 0,
    @SerializedName("charEnd") val charEnd: Int = 0,
    val label: String = "",
    val text: String? = null
)

data class ResultBlock(
    val elements: List<ElementResult> = emptyList(),
    val summary: SummaryBlock = SummaryBlock()
)

data class SummaryBlock(val message: String? = "")

data class ElementResult(
    val id: Int = 0,
    val type: String = "",
    val text: String = "",
    val attributes: Map<String, String> = emptyMap(),
    val missing: List<String> = emptyList(),
    val messages: List<String> = emptyList(),
    val suggestion: String = "",
    val status: String = ""
)

data class RiskBlock(
    val initial: RiskScore = RiskScore(),
    val final: RiskScore = RiskScore()
)

data class RiskScore(
    val score: Double = 0.0,
    val level: String = "Low",
    val counts: RiskCounts = RiskCounts(),
    val components: RiskComponents = RiskComponents(),
    val explanation: String? = null
)

data class RiskCounts(
    val missing: Int = 0,
    val vague: Int = 0,
    val unresolved: Int = 0
)

data class RiskComponents(
    val completeness: Double = 0.0,
    val vagueness: Double = 0.0,
    val detection: Double = 0.0,
    val unresolved: Double = 0.0
)

data class ClarificationBlock(
    val questions: List<ClarificationQuestion> = emptyList(),
    val unresolved: List<ClarificationQuestion> = emptyList()
)

data class ClarificationQuestion(
    val id: String = "",
    val prompt: String = "",
    val examples: List<String>? = null,
    val options: List<String>? = null
)

data class HistoryItem(
    val id: String,
    val prompt: String,
    val riskScore: Int,
    val riskLevel: String,
    val coverageScore: Int,
    val confidenceScore: Int,
    val elements: List<String>,
    val summary: String?,
    val createdAt: String,
    val payloadJson: String? = null
)
