package com.promptlinter.app.ui.screens

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.HelpOutline
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.promptlinter.app.data.model.AnalysisPayload
import com.promptlinter.app.data.model.ClarificationQuestion
import com.promptlinter.app.data.model.ElementResult
import com.promptlinter.app.ui.theme.*
import com.promptlinter.app.ui.viewmodel.MainViewModel

private val EXAMPLES = listOf(
    Triple("A", "Complete button", "Add a red button at the top right corner labelled \"Sign Up\" that opens the signup form."),
    Triple("B", "Navbar", "Create a blue navbar at the top of the page with links Home, About and Contact."),
    Triple("C", "Vague button", "I need a button on my homepage."),
)

@Composable
fun NewAnalysisScreen(vm: MainViewModel) {
    val payload = vm.payload

    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            Spacer(Modifier.height(4.dp))
            Column {
                Text(
                    "New UI Prompt Review",
                    style = MaterialTheme.typography.headlineSmall.copy(
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onBackground
                    )
                )
                Spacer(Modifier.height(4.dp))
                Text(
                    "Describe the interface you want. Vector finds missing labels, colours, placement and actions before a generator fills them in for you.",
                    style = MaterialTheme.typography.bodyMedium.copy(
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        lineHeight = 20.sp
                    )
                )
            }
        }

        if (!vm.engineReady) {
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(14.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline)
                ) {
                    Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        if (vm.engineError == null) {
                            LinearProgressIndicator(modifier = Modifier.fillMaxWidth())
                            Text(
                                "Loading the analysis engine…",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        } else {
                            Text(
                                "Engine error",
                                style = MaterialTheme.typography.labelLarge.copy(fontWeight = FontWeight.Bold),
                                color = LocalVectorColors.current.critical
                            )
                            Text(
                                vm.engineError ?: "",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                }
            }
        }

        item { SamplePromptsCard { text -> vm.promptText = text; vm.payload = null } }

        item {
            PromptInputCard(
                prompt = vm.promptText,
                engine = vm.aiEngine,
                engineReady = vm.engineReady,
                analyzing = vm.analyzing,
                onPromptChange = { vm.promptText = it; vm.payload = null },
                onClear = { vm.clearAnalysis() },
                onEngineChange = { vm.aiEngine = it; vm.payload = null },
                onAnalyze = { vm.analyzeNew() }
            )
        }

        if (payload != null) {
            if (payload.error != null) {
                item {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(16.dp),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.errorContainer),
                        border = BorderStroke(1.dp, MaterialTheme.colorScheme.error.copy(alpha = 0.4f))
                    ) {
                        Row(Modifier.padding(14.dp), verticalAlignment = Alignment.Top) {
                            Icon(
                                Icons.Default.Warning,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.error,
                                modifier = Modifier.size(18.dp)
                            )
                            Spacer(Modifier.width(8.dp))
                            Column {
                                Text(
                                    "The prompt could not be analysed",
                                    style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold)
                                )
                                Text(
                                    payload.error ?: "",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }
                    }
                }
            } else {
                item { RouterCard(payload) }
                if (payload.needsClarification) {
                    item { ClarificationGate(payload) }
                } else {
                    item { RiskSummary(payload) }
                }
                item { HighlightedPromptCard(vm.promptText, payload) }
                item {
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            "Detected Elements",
                            style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold)
                        )
                        Surface(shape = RoundedCornerShape(6.dp), color = MaterialTheme.colorScheme.surfaceVariant) {
                            Text(
                                "${payload.result.elements.size}",
                                style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.Bold),
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                            )
                        }
                    }
                }
                if (payload.result.elements.isEmpty()) {
                    item {
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(16.dp),
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                            border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline)
                        ) {
                            Column(Modifier.padding(24.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                                Text(
                                    "No supported UI elements detected",
                                    style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold)
                                )
                                Spacer(Modifier.height(4.dp))
                                Text(
                                    "Try mentioning a button, navbar, input, card, modal, image, dropdown, sidebar, footer or checkbox.",
                                    style = MaterialTheme.typography.bodySmall.copy(color = MaterialTheme.colorScheme.onSurfaceVariant),
                                    textAlign = TextAlign.Center
                                )
                            }
                        }
                    }
                } else {
                    items(payload.result.elements) { el -> ElementCard(el) }
                }
                item {
                    if (payload.needsClarification) {
                        ClarificationCard(payload, vm.clarifyRound, vm.analyzing) { values, stop -> vm.submitAnswers(values, stop) }
                    } else {
                        FinalPromptCard(payload)
                    }
                }
                item { WhyCard(payload) }
            }
        }

        item { Spacer(Modifier.height(20.dp)) }
    }
}

@Composable
private fun SamplePromptsCard(onSelect: (String) -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline)
    ) {
        Column(Modifier.padding(14.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    Icons.Default.Lightbulb,
                    contentDescription = null,
                    tint = LocalVectorColors.current.mustard,
                    modifier = Modifier.size(18.dp)
                )
                Spacer(Modifier.width(6.dp))
                Text(
                    "Sample UI Prompts",
                    style = MaterialTheme.typography.labelLarge.copy(fontWeight = FontWeight.Bold)
                )
            }
            Spacer(Modifier.height(10.dp))
            EXAMPLES.forEachIndexed { index, (key, title, text) ->
                Surface(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 4.dp)
                        .clip(RoundedCornerShape(10.dp))
                        .clickable { onSelect(text) },
                    shape = RoundedCornerShape(10.dp),
                    color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.6f),
                    border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.6f))
                ) {
                    Column(Modifier.padding(10.dp)) {
                        Text(
                            "Example $key — $title",
                            style = MaterialTheme.typography.labelMedium.copy(
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.primary
                            )
                        )
                        Spacer(Modifier.height(2.dp))
                        Text(
                            text,
                            style = MaterialTheme.typography.bodySmall.copy(color = MaterialTheme.colorScheme.onSurfaceVariant),
                            maxLines = 2,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun PromptInputCard(
    prompt: String,
    engine: String,
    engineReady: Boolean,
    analyzing: Boolean,
    onPromptChange: (String) -> Unit,
    onClear: () -> Unit,
    onEngineChange: (String) -> Unit,
    onAnalyze: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline)
    ) {
        Column(Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    "UI Prompt",
                    style = MaterialTheme.typography.labelLarge.copy(fontWeight = FontWeight.Bold)
                )
                if (prompt.isNotEmpty()) {
                    IconButton(onClick = onClear, modifier = Modifier.size(32.dp)) {
                        Icon(
                            Icons.Default.Clear,
                            contentDescription = "Clear prompt",
                            tint = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.size(18.dp)
                        )
                    }
                }
            }
            Spacer(Modifier.height(8.dp))
            OutlinedTextField(
                value = prompt,
                onValueChange = onPromptChange,
                modifier = Modifier.fillMaxWidth().height(170.dp),
                placeholder = {
                    Text(
                        "e.g. Add a red button at the top right corner labelled \"Sign Up\" that opens the signup form.",
                        style = MaterialTheme.typography.bodyMedium.copy(
                            color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.6f)
                        )
                    )
                },
                shape = RoundedCornerShape(12.dp),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = MaterialTheme.colorScheme.primary,
                    unfocusedBorderColor = MaterialTheme.colorScheme.outline
                )
            )
            Spacer(Modifier.height(8.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    "${prompt.length} characters",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        Icons.Default.CloudDone,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.size(14.dp)
                    )
                    Spacer(Modifier.width(4.dp))
                    Text(
                        "Runs on-device first",
                        style = MaterialTheme.typography.labelSmall.copy(fontSize = 10.sp),
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        maxLines = 1,
                        softWrap = false
                    )
                }
            }

            Spacer(Modifier.height(12.dp))
            Text(
                "Detection engine",
                style = MaterialTheme.typography.labelMedium.copy(fontWeight = FontWeight.SemiBold),
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Spacer(Modifier.height(6.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                listOf("auto" to "Auto", "rules" to "Rules", "bert" to "BERT", "api" to "LLM").forEach { (id, label) ->
                    FilterChip(
                        selected = engine == id,
                        onClick = { onEngineChange(id) },
                        label = { Text(label, maxLines = 1) },
                        colors = FilterChipDefaults.filterChipColors(
                            containerColor = MaterialTheme.colorScheme.surfaceVariant,
                            labelColor = MaterialTheme.colorScheme.onSurface,
                            selectedContainerColor = MaterialTheme.colorScheme.primary,
                            selectedLabelColor = MaterialTheme.colorScheme.onPrimary
                        ),
                        border = FilterChipDefaults.filterChipBorder(
                            enabled = true,
                            selected = engine == id,
                            borderColor = MaterialTheme.colorScheme.outline,
                            selectedBorderColor = MaterialTheme.colorScheme.primary
                        )
                    )
                }
            }
            Spacer(Modifier.height(6.dp))
            Text(
                when (engine) {
                    "auto" -> "The router scores the prompt, runs the winning detector and verifies its confidence. The LLM writes the final explanation."
                    "bert" -> "BERT downloads the 67 MB model once, then runs on-device."
                    "api" -> "LLM sends the prompt to the endpoint configured in Settings."
                    else -> "Runs offline on-device with the deterministic Rules engine."
                },
                style = MaterialTheme.typography.bodySmall.copy(fontSize = 11.sp),
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )

            Spacer(Modifier.height(14.dp))
            Button(
                onClick = onAnalyze,
                enabled = engineReady && !analyzing && prompt.trim().isNotEmpty(),
                modifier = Modifier.fillMaxWidth().height(50.dp),
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = MaterialTheme.colorScheme.primary,
                    contentColor = MaterialTheme.colorScheme.onPrimary
                )
            ) {
                if (analyzing) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(20.dp),
                        color = MaterialTheme.colorScheme.onPrimary,
                        strokeWidth = 2.dp
                    )
                    Spacer(Modifier.width(10.dp))
                    Text(
                        "Reviewing Prompt…",
                        style = MaterialTheme.typography.labelLarge.copy(fontWeight = FontWeight.Bold)
                    )
                } else {
                    Icon(Icons.Default.Analytics, contentDescription = null, modifier = Modifier.size(18.dp))
                    Spacer(Modifier.width(8.dp))
                    Text(
                        "Review Prompt",
                        style = MaterialTheme.typography.labelLarge.copy(fontWeight = FontWeight.Bold)
                    )
                }
            }
        }
    }
}

@Composable
private fun RouterCard(p: AnalysisPayload) {
    val r = p.router ?: return
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline)
    ) {
        Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Text("How this prompt was routed", style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold))
                Surface(shape = RoundedCornerShape(6.dp), color = LocalVectorColors.current.softGreen) {
                    Text(
                        "${r.selected ?: p.engine ?: "rules"} · ${r.selectedBy ?: "router+confidence"}",
                        style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.Bold),
                        color = LocalVectorColors.current.softGreenText,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                    )
                }
            }
            r.reason?.let {
                Text(it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            val candidates = r.candidates
            if (!candidates.isNullOrEmpty()) {
                Text(
                    "Candidates: " + candidates.entries.joinToString(" · ") { "${it.key} ${String.format("%.2f", it.value)}" },
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            r.fallback?.let {
                Text(
                    "Fallback: $it",
                    style = MaterialTheme.typography.labelSmall,
                    color = LocalVectorColors.current.warningText,
                    modifier = Modifier.background(LocalVectorColors.current.warningBg, RoundedCornerShape(6.dp)).padding(6.dp)
                )
            }
        }
    }
}

@Composable
private fun ClarificationGate(p: AnalysisPayload) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = LocalVectorColors.current.warningBg),
        border = BorderStroke(1.dp, LocalVectorColors.current.warningText.copy(alpha = 0.3f))
    ) {
        Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    Icons.AutoMirrored.Filled.HelpOutline,
                    contentDescription = null,
                    tint = LocalVectorColors.current.warningText,
                    modifier = Modifier.size(18.dp)
                )
                Spacer(Modifier.width(6.dp))
                Text(
                    "Score withheld until the prompt is unambiguous",
                    style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold),
                    color = LocalVectorColors.current.warningText
                )
            }
            Text(
                "The router picked ${p.engine ?: "rules"} and found ${p.clarification.questions.size} unresolved detail(s). " +
                    "Answer below; the analyser re-runs after each round and only then computes the risk score and LLM explanation.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurface
            )
        }
    }
}

@Composable
private fun RiskSummary(p: AnalysisPayload) {
    val f = p.risk.final
    val c = f.components
    val counts = f.counts
    val completeness = (100 * (1 - c.completeness)).toInt().coerceIn(0, 100)
    val conf = ((p.confidence ?: 0.0) * 100).toInt()
    val levelColor = riskColorLevel(f.level)

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline)
    ) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Text("Evaluation Summary", style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold))
                Surface(
                    shape = RoundedCornerShape(10.dp),
                    color = levelColor.copy(alpha = 0.15f),
                    border = BorderStroke(1.dp, levelColor.copy(alpha = 0.45f))
                ) {
                    Row(Modifier.padding(horizontal = 10.dp, vertical = 5.dp), verticalAlignment = Alignment.CenterVertically) {
                        Box(Modifier.size(8.dp).clip(CircleShape).background(levelColor))
                        Spacer(Modifier.width(6.dp))
                        Text(
                            "${f.level} (${f.score.toInt()}/100)",
                            style = MaterialTheme.typography.labelMedium.copy(fontWeight = FontWeight.Bold),
                            color = levelColor
                        )
                    }
                }
            }
            Text(
                "Initial ${p.risk.initial.score.toInt()} → Final ${f.score.toInt()}  •  ${conf}% detector confidence",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                StatBox(Modifier.weight(1f), "Risk", "${f.score.toInt()}/100", levelColor)
                StatBox(Modifier.weight(1f), "Complete", "$completeness%", LocalVectorColors.current.teal)
            }
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                StatBox(Modifier.weight(1f), "Confidence", "$conf%", LocalVectorColors.current.teal)
                StatBox(Modifier.weight(1f), "Elements", "${p.result.elements.size}", LocalVectorColors.current.textSecondary)
            }
            Text(
                "Missing: ${counts.missing}  ·  Vague: ${counts.vague}  ·  Unresolved: ${counts.unresolved}",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Bar("Missing details", c.completeness, LocalVectorColors.current.teal)
            Bar("Vague details", c.vagueness, LocalVectorColors.current.mustard)
            Bar("Detector uncertainty", c.detection, Color(0xFF5A8090))
            Bar("Unresolved questions", c.unresolved, LocalVectorColors.current.high)

            val expl = p.explanation ?: f.explanation
            if (!expl.isNullOrBlank()) {
                Spacer(Modifier.height(2.dp))
                Surface(
                    shape = RoundedCornerShape(10.dp),
                    color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.6f)
                ) {
                    Column(Modifier.padding(12.dp)) {
                        Text(
                            if (p.explanationSource == "llm") "LLM explanation" else "Deterministic explanation",
                            style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.Bold),
                            color = LocalVectorColors.current.darkTeal
                        )
                        Spacer(Modifier.height(3.dp))
                        Text(expl, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurface)
                        if (p.explanationSource != "llm") {
                            Spacer(Modifier.height(4.dp))
                            Text(
                                "Add a base URL, model and API key in Settings to have the LLM write this explanation.",
                                style = MaterialTheme.typography.labelSmall,
                                color = LocalVectorColors.current.warningText
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun StatBox(mod: Modifier, label: String, value: String, color: Color) {
    Column(
        mod.background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.6f), RoundedCornerShape(10.dp)).padding(10.dp)
    ) {
        Text(
            label,
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Text(value, style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold), color = color)
    }
}

@Composable
private fun Bar(label: String, value: Double, color: Color) {
    val pct = (value.coerceIn(0.0, 1.0) * 100).toInt()
    Column {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Text(label, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Text("$pct%", style = MaterialTheme.typography.labelSmall)
        }
        Spacer(Modifier.height(3.dp))
        LinearProgressIndicator(
            progress = { value.toFloat().coerceIn(0f, 1f) },
            modifier = Modifier.fillMaxWidth().height(6.dp).clip(RoundedCornerShape(3.dp)),
            color = color,
            trackColor = MaterialTheme.colorScheme.surfaceVariant
        )
    }
}

@Composable
private fun HighlightedPromptCard(text: String, p: AnalysisPayload) {
    val spans = p.spans
        .filter { it.charStart >= 0 && it.charEnd > it.charStart && it.charEnd <= text.length }
        .sortedBy { it.charStart }
    val colors = LocalVectorColors.current
    val annotated = buildAnnotatedString {
        var cursor = 0
        spans.forEach { s ->
            if (s.charStart < cursor) return@forEach
            if (s.charStart > cursor) append(text.substring(cursor, s.charStart))
            val bg = when (s.label) {
                "ELEMENT" -> colors.teal.copy(alpha = 0.20f)
                "COLOR" -> colors.mustard.copy(alpha = 0.30f)
                "LOCATION" -> Color(0x405A8090)
                "ACTION" -> colors.low.copy(alpha = 0.25f)
                "LABEL" -> colors.high.copy(alpha = 0.20f)
                else -> colors.teal.copy(alpha = 0.13f)
            }
            withStyle(SpanStyle(background = bg, fontWeight = FontWeight.SemiBold)) {
                append(text.substring(s.charStart, s.charEnd))
            }
            cursor = s.charEnd
        }
        if (cursor < text.length) append(text.substring(cursor))
    }

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline)
    ) {
        Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Text("Prompt Under Review", style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold))
            Text(annotated, style = MaterialTheme.typography.bodyMedium)
            Text(
                "Legend: ELEMENT / COLOR / LOCATION / ACTION / LABEL",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

@Composable
private fun ElementCard(el: ElementResult) {
    val complete = el.status == "complete"
    val statusColor = if (complete) LocalVectorColors.current.low else LocalVectorColors.current.warningText
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline)
    ) {
        Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.Top) {
                Row(Modifier.weight(1f), verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .size(32.dp)
                            .clip(CircleShape)
                            .background(statusColor.copy(alpha = 0.12f)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            if (complete) Icons.Default.CheckCircle else Icons.Default.Warning,
                            contentDescription = null,
                            tint = statusColor,
                            modifier = Modifier.size(18.dp)
                        )
                    }
                    Spacer(Modifier.width(10.dp))
                    Column {
                        Text(
                            "${el.type.replaceFirstChar { c -> c.uppercase() }} #${el.id}",
                            style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold)
                        )
                        Text(
                            "“${el.text}”",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            maxLines = 2,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                }
                Spacer(Modifier.width(8.dp))
                Surface(
                    shape = RoundedCornerShape(6.dp),
                    color = statusColor.copy(alpha = 0.12f),
                    border = BorderStroke(1.dp, statusColor.copy(alpha = 0.4f))
                ) {
                    Text(
                        if (complete) "Complete" else "Missing ${el.missing.size}",
                        style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.Bold),
                        color = statusColor,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                    )
                }
            }
            if (el.attributes.isNotEmpty()) {
                Text(
                    el.attributes.entries.joinToString("   ·   ") { "${it.key}: ${it.value}" },
                    style = MaterialTheme.typography.bodySmall,
                    color = LocalVectorColors.current.teal
                )
            } else {
                Text(
                    "No attributes detected",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            el.messages.forEach {
                Text("• $it", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            Spacer(Modifier.height(2.dp))
            Text(
                "Suggested rewrite",
                style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.Bold),
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Text(
                el.suggestion,
                style = MaterialTheme.typography.bodySmall.copy(fontFamily = FontFamily.Monospace, lineHeight = 17.sp),
                modifier = Modifier
                    .fillMaxWidth()
                    .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.6f), RoundedCornerShape(8.dp))
                    .padding(10.dp)
            )
        }
    }
}

@Composable
private fun ClarificationCard(p: AnalysisPayload, round: Int, disabled: Boolean, onSubmit: (Map<String, String>, Boolean) -> Unit) {
    val questions = p.clarification.questions
    val values = remember(p) { mutableStateMapOf<String, String>() }
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline)
    ) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Text("A few details are still unclear", style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold))
                Surface(shape = RoundedCornerShape(6.dp), color = LocalVectorColors.current.softGreen) {
                    Text(
                        "Round $round",
                        style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.Bold),
                        color = LocalVectorColors.current.softGreenText,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                    )
                }
            }
            Text(
                "The analyser re-runs after each round. Answer the open questions or use placeholders to finish.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            questions.forEach { q -> QuestionField(q, values[q.id] ?: "") { values[q.id] = it } }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Button(
                    onClick = {
                        val collected = questions.associate { q ->
                            q.id to ((values[q.id]?.trim()).takeIf { !it.isNullOrEmpty() } ?: "unknown")
                        }
                        onSubmit(collected, false)
                    },
                    enabled = !disabled,
                    shape = RoundedCornerShape(10.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)
                ) { Text(if (disabled) "Submitting…" else "Submit answers") }
                OutlinedButton(
                    onClick = { onSubmit(questions.associate { q -> q.id to "unknown" }, true) },
                    enabled = !disabled,
                    shape = RoundedCornerShape(10.dp)
                ) { Text("Use placeholders") }
            }
        }
    }
}

@Composable
private fun QuestionField(q: ClarificationQuestion, value: String, onChange: (String) -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
        Text(q.prompt, style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.SemiBold))
        val ex = q.examples ?: emptyList()
        if (ex.isNotEmpty()) {
            Text(
                "Examples: ${ex.joinToString(", ")}",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
        val opts = q.options
        if (!opts.isNullOrEmpty()) {
            var expanded by remember { mutableStateOf(false) }
            Box {
                OutlinedButton(onClick = { expanded = true }, modifier = Modifier.fillMaxWidth()) {
                    Text(if (value.isBlank()) "Choose…" else value)
                }
                DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
                    opts.forEach { o -> DropdownMenuItem(text = { Text(o) }, onClick = { onChange(o); expanded = false }) }
                    DropdownMenuItem(text = { Text("I don't know / use placeholder") }, onClick = { onChange("unknown"); expanded = false })
                }
            }
        } else {
            OutlinedTextField(
                value = if (value == "unknown") "" else value,
                onValueChange = onChange,
                modifier = Modifier.fillMaxWidth(),
                placeholder = { Text(ex.joinToString(", ").ifEmpty { "Your answer" }) },
                singleLine = true
            )
            Row(verticalAlignment = Alignment.CenterVertically) {
                Checkbox(checked = value == "unknown", onCheckedChange = { onChange(if (it) "unknown" else "") })
                Text(
                    "I don't know (use placeholder)",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
    }
}

@Composable
private fun FinalPromptCard(p: AnalysisPayload) {
    val ctx = LocalContext.current
    var copied by remember { mutableStateOf(false) }
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline)
    ) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Text("Validated Prompt", style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold))
                Surface(shape = RoundedCornerShape(6.dp), color = LocalVectorColors.current.softGreen) {
                    Text(
                        "Copy-ready",
                        style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.Bold),
                        color = LocalVectorColors.current.softGreenText,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                    )
                }
            }
            val unresolved = p.clarification.unresolved
            if (unresolved.isNotEmpty()) {
                Text(
                    "Unresolved: " + unresolved.joinToString(" · ") { it.prompt },
                    color = LocalVectorColors.current.warningText,
                    style = MaterialTheme.typography.bodySmall,
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(LocalVectorColors.current.warningBg, RoundedCornerShape(8.dp))
                        .padding(10.dp)
                )
            }
            if (!p.finalPrompt.isNullOrBlank()) {
                Text(
                    p.finalPrompt!!,
                    style = MaterialTheme.typography.bodySmall.copy(fontFamily = FontFamily.Monospace, lineHeight = 18.sp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.6f), RoundedCornerShape(8.dp))
                        .padding(10.dp)
                )
                Button(
                    onClick = {
                        val cm = ctx.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                        cm.setPrimaryClip(ClipData.newPlainText("prompt", p.finalPrompt))
                        copied = true
                    },
                    shape = RoundedCornerShape(10.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)
                ) {
                    Icon(
                        if (copied) Icons.Default.Check else Icons.Default.ContentCopy,
                        contentDescription = null,
                        modifier = Modifier.size(16.dp)
                    )
                    Spacer(Modifier.width(6.dp))
                    Text(if (copied) "Copied!" else "Copy prompt")
                }
            } else {
                Text(
                    p.result.summary.message ?: "Analysis complete.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            if (p.recommendations.isNotEmpty()) {
                Spacer(Modifier.height(2.dp))
                Text("Recommendations", style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold))
                p.recommendations.forEach {
                    Text("• $it", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurface)
                }
            }
        }
    }
}

@Composable
private fun WhyCard(p: AnalysisPayload) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline)
    ) {
        Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    Icons.Default.Info,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.size(18.dp)
                )
                Spacer(Modifier.width(6.dp))
                Text("Why this engine and score?", style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold))
            }
            Text(
                "Engine used: ${p.engine ?: "rules"}",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Text(
                "Router: ${p.router?.reason ?: "manual selection"}",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            p.router?.candidates?.takeIf { it.isNotEmpty() }?.let { candidates ->
                Text(
                    "Candidates: " + candidates.entries.joinToString(" · ") { "${it.key} ${String.format("%.2f", it.value)}" },
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            p.router?.fallback?.let {
                Text("Fallback: $it", style = MaterialTheme.typography.bodySmall, color = LocalVectorColors.current.warningText)
            }
            Text(
                "Detector confidence: ${String.format("%.2f", p.confidence ?: 0.0)}",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Text(
                if (p.explanationSource == "llm") "Final explanation: LLM" else "Final explanation: deterministic fallback",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Text(
                "Rules, BERT and the grounded LLM all run through the same linking, checker, clarification and risk code.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

@Composable
private fun riskColorLevel(level: String) = when (level) {
    "Critical" -> LocalVectorColors.current.critical
    "High" -> LocalVectorColors.current.high
    "Medium" -> LocalVectorColors.current.medium
    else -> LocalVectorColors.current.low
}
