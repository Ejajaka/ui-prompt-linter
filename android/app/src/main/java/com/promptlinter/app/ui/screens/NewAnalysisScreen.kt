package com.promptlinter.app.ui.screens

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
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
    LazyColumn(modifier = Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item {
            Text("New UI Prompt Analysis", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
            Text("Review your interface request for missing labels, colours, placement and actions — on-device.", color = LocalPlColors.current.textSecondary, style = MaterialTheme.typography.bodySmall)
            Spacer(Modifier.height(6.dp))
            if (!vm.engineReady && vm.engineError == null) {
                LinearProgressIndicator(modifier = Modifier.fillMaxWidth())
                Text("Loading the rules engine…", style = MaterialTheme.typography.bodySmall, color = LocalPlColors.current.textSecondary)
            }
            vm.engineError?.let { Text("Engine error: $it", color = LocalPlColors.current.critical, style = MaterialTheme.typography.bodySmall) }
        }

        item {
            Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
                Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("Describe the UI you want", fontWeight = FontWeight.Bold)
                    OutlinedTextField(
                        value = vm.promptText, onValueChange = { vm.promptText = it },
                        modifier = Modifier.fillMaxWidth().heightIn(min = 110.dp),
                        placeholder = { Text("e.g. Add a red button at the top right corner labelled \"Sign Up\" that opens the signup form.") }
                    )
                    Text("Examples", fontWeight = FontWeight.SemiBold, style = MaterialTheme.typography.bodySmall)
                    EXAMPLES.forEach { (k, title, text) ->
                        OutlinedButton(onClick = { vm.promptText = text; vm.payload = null }, modifier = Modifier.fillMaxWidth()) {
                            Column(Modifier.fillMaxWidth()) {
                                Text("Example $k — $title", fontWeight = FontWeight.SemiBold)
                                Text(text, style = MaterialTheme.typography.labelSmall, maxLines = 2, color = LocalPlColors.current.textSecondary)
                            }
                        }
                    }
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                        Button(
                            onClick = { vm.analyzeNew() },
                            enabled = vm.engineReady && !vm.analyzing && vm.promptText.trim().isNotEmpty(),
                            colors = ButtonDefaults.buttonColors(containerColor = LocalPlColors.current.teal)
                        ) { Text(if (vm.analyzing) "Analyzing…" else "Analyze Prompt") }
                        if (vm.promptText.isNotEmpty()) {
                            OutlinedButton(onClick = { vm.clearAnalysis() }) { Text("Clear") }
                        }
                    }
                    Text("Runs offline on-device · Rules engine", color = LocalPlColors.current.textSecondary, style = MaterialTheme.typography.labelSmall)
                }
            }
        }

        if (payload != null) {
            item { RiskSummary(payload) }
            item { HighlightedPromptCard(vm.promptText, payload) }
            item { Text("Detected elements (${payload.result.elements.size})", fontWeight = FontWeight.Bold) }
            if (payload.result.elements.isEmpty()) {
                item { Text("No supported UI elements detected. Try mentioning a button, navbar, input, card, modal, image, dropdown, sidebar, footer or checkbox.", color = LocalPlColors.current.textSecondary, style = MaterialTheme.typography.bodySmall) }
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
        item { Spacer(Modifier.height(24.dp)) }
    }
}

@Composable
private fun RiskSummary(p: AnalysisPayload) {
    val f = p.risk.final
    val c = f.components
    val counts = f.counts
    val completeness = (100 * (1 - c.completeness)).toInt().coerceIn(0, 100)
    val conf = ((p.confidence ?: 0.0) * 100).toInt()
    Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
        Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Text("Evaluation Summary", fontWeight = FontWeight.Bold)
                Surface(shape = MaterialTheme.shapes.small, color = riskColorLevel(f.level).copy(alpha = 0.14f)) {
                    Text("${f.level} risk", style = MaterialTheme.typography.labelSmall, color = riskColorLevel(f.level), fontWeight = FontWeight.Bold, modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp))
                }
            }
            Text("Initial ${p.risk.initial.score.toInt()} → Final ${f.score.toInt()}", color = LocalPlColors.current.textSecondary, style = MaterialTheme.typography.labelSmall)
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                StatBox(Modifier.weight(1f), "Risk", "${f.score.toInt()}/100", riskColorLevel(f.level))
                StatBox(Modifier.weight(1f), "Complete", "$completeness%", LocalPlColors.current.teal)
            }
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                StatBox(Modifier.weight(1f), "Confidence", "$conf%", LocalPlColors.current.teal)
                StatBox(Modifier.weight(1f), "Elements", "${p.result.elements.size}", LocalPlColors.current.textSecondary)
            }
            Text("Missing: ${counts.missing} · Vague: ${counts.vague} · Unresolved: ${counts.unresolved}", style = MaterialTheme.typography.bodySmall, color = LocalPlColors.current.textSecondary)
            Bar("Missing details", c.completeness, LocalPlColors.current.teal)
            Bar("Vague details", c.vagueness, LocalPlColors.current.mustard)
            Bar("Detector uncertainty", c.detection, Color(0xFF5A8090))
            Bar("Unresolved questions", c.unresolved, LocalPlColors.current.high)
            val expl = p.explanation ?: f.explanation
            if (!expl.isNullOrBlank()) {
                Text(expl, style = MaterialTheme.typography.bodySmall, color = LocalPlColors.current.textMain)
            }
        }
    }
}

@Composable private fun StatBox(mod: Modifier, label: String, value: String, color: Color) {
    Column(mod.background(LocalPlColors.current.background, RoundedCornerShape(8.dp)).padding(10.dp)) {
        Text(label, style = MaterialTheme.typography.labelSmall, color = LocalPlColors.current.textSecondary)
        Text(value, fontWeight = FontWeight.Bold, color = color)
    }
}
@Composable private fun Bar(label: String, value: Double, color: Color) {
    val pct = (value.coerceIn(0.0, 1.0) * 100).toInt()
    Column {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Text(label, style = MaterialTheme.typography.labelSmall, color = LocalPlColors.current.textSecondary)
            Text("$pct%", style = MaterialTheme.typography.labelSmall)
        }
        LinearProgressIndicator(progress = { value.toFloat().coerceIn(0f,1f) }, modifier = Modifier.fillMaxWidth().height(6.dp), color = color, trackColor = LocalPlColors.current.border)
    }
}

@Composable
private fun HighlightedPromptCard(text: String, p: AnalysisPayload) {
    val spans = p.spans.filter { it.charStart >= 0 && it.charEnd > it.charStart && it.charEnd <= text.length }.sortedBy { it.charStart }
    val annotated = buildAnnotatedString {
        var cursor = 0
        spans.forEach { s ->
            if (s.charStart < cursor) return@forEach
            if (s.charStart > cursor) append(text.substring(cursor, s.charStart))
            val colors = LocalPlColors.current
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
        if (text.isEmpty()) append("")
    }
    Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
        Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Text("Prompt under review", fontWeight = FontWeight.Bold)
            Text(annotated, style = MaterialTheme.typography.bodyMedium)
            Text("Legend: ELEMENT / COLOR / LOCATION / ACTION / LABEL", style = MaterialTheme.typography.labelSmall, color = LocalPlColors.current.textSecondary)
        }
    }
}

@Composable
private fun ElementCard(el: ElementResult) {
    val complete = el.status == "complete"
    Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
        Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Column(Modifier.weight(1f)) {
                    Text("${if (complete) "✅" else "⚠️"} ${el.type.replaceFirstChar { c -> c.uppercase() }} #${el.id}", fontWeight = FontWeight.Bold)
                    Text("“${el.text}”", style = MaterialTheme.typography.bodySmall, color = LocalPlColors.current.textSecondary)
                }
                Surface(
                    shape = MaterialTheme.shapes.small,
                    color = if (complete) LocalPlColors.current.softGreen else LocalPlColors.current.warningBg
                ) {
                    Text(
                        if (complete) "Complete" else "Missing ${el.missing.size}",
                        style = MaterialTheme.typography.labelSmall,
                        color = if (complete) LocalPlColors.current.low else LocalPlColors.current.warningText,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                    )
                }
            }
            if (el.attributes.isNotEmpty()) {
                Text(el.attributes.entries.joinToString("  ·  ") { "${it.key}: ${it.value}" }, style = MaterialTheme.typography.bodySmall, color = LocalPlColors.current.teal)
            } else {
                Text("No attributes detected", style = MaterialTheme.typography.bodySmall, color = LocalPlColors.current.textSecondary)
            }
            el.messages.forEach { Text("• $it", style = MaterialTheme.typography.bodySmall, color = LocalPlColors.current.textSecondary) }
            Text("Suggested rewrite", style = MaterialTheme.typography.labelSmall, color = LocalPlColors.current.textSecondary, fontWeight = FontWeight.Bold)
            Text(el.suggestion, style = MaterialTheme.typography.bodySmall, fontFamily = FontFamily.Monospace, modifier = Modifier.background(LocalPlColors.current.background, RoundedCornerShape(6.dp)).padding(8.dp))
        }
    }
}

@Composable
private fun ClarificationCard(p: AnalysisPayload, round: Int, disabled: Boolean, onSubmit: (Map<String, String>, Boolean) -> Unit) {
    val questions = p.clarification.questions
    val values = remember(p) { mutableStateMapOf<String, String>() }
    Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
        Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text("A few details are still unclear", fontWeight = FontWeight.Bold)
                Surface(shape = MaterialTheme.shapes.small, color = LocalPlColors.current.softGreen) {
                    Text("Round $round of 3", style = MaterialTheme.typography.labelSmall, color = LocalPlColors.current.darkTeal, fontWeight = FontWeight.Bold, modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp))
                }
            }
            Text("Answer these to unlock the final validated prompt.", color = LocalPlColors.current.textSecondary, style = MaterialTheme.typography.bodySmall)
            questions.forEach { q ->
                QuestionField(q, values[q.id] ?: "") { values[q.id] = it }
            }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Button(
                    onClick = {
                        val collected = questions.associate { q -> q.id to ((values[q.id]?.trim()).takeIf { !it.isNullOrEmpty() } ?: "unknown") }
                        onSubmit(collected, false)
                    },
                    enabled = !disabled,
                    colors = ButtonDefaults.buttonColors(containerColor = LocalPlColors.current.teal)
                ) { Text(if (disabled) "Submitting…" else "Submit answers") }
                OutlinedButton(onClick = {
                    val collected = questions.associate { q -> q.id to "unknown" }
                    onSubmit(collected, true)
                }, enabled = !disabled) { Text("Use placeholders") }
            }
        }
    }
}

@Composable
private fun QuestionField(q: ClarificationQuestion, value: String, onChange: (String) -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
        Text(q.prompt, fontWeight = FontWeight.SemiBold, style = MaterialTheme.typography.bodySmall)
        val ex = q.examples ?: emptyList()
        if (ex.isNotEmpty()) Text("Examples: ${ex.joinToString(", ")}", style = MaterialTheme.typography.labelSmall, color = LocalPlColors.current.textSecondary)
        val opts = q.options
        if (!opts.isNullOrEmpty()) {
            var expanded by remember { mutableStateOf(false) }
            Box {
                OutlinedButton(onClick = { expanded = true }, modifier = Modifier.fillMaxWidth()) { Text(if (value.isBlank()) "Choose…" else value) }
                DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
                    opts.forEach { o -> DropdownMenuItem(text = { Text(o) }, onClick = { onChange(o); expanded = false }) }
                    DropdownMenuItem(text = { Text("I don't know / use placeholder") }, onClick = { onChange("unknown"); expanded = false })
                }
            }
        } else {
            OutlinedTextField(value = if (value == "unknown") "" else value, onValueChange = onChange, modifier = Modifier.fillMaxWidth(), placeholder = { Text(ex.joinToString(", ").ifEmpty { "Your answer" }) }, singleLine = true)
            Row(verticalAlignment = Alignment.CenterVertically) {
                Checkbox(checked = value == "unknown", onCheckedChange = { onChange(if (it) "unknown" else "") })
                Text("I don't know (use placeholder)", style = MaterialTheme.typography.labelSmall, color = LocalPlColors.current.textSecondary)
            }
        }
    }
}

@Composable
private fun FinalPromptCard(p: AnalysisPayload) {
    val ctx = LocalContext.current
    var copied by remember { mutableStateOf(false) }
    Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
        Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text("Best prompt", fontWeight = FontWeight.Bold)
            val unresolved = p.clarification.unresolved
            if (unresolved.isNotEmpty()) {
                Text("Unresolved: " + unresolved.joinToString(" · ") { it.prompt }, color = LocalPlColors.current.warningText, style = MaterialTheme.typography.bodySmall, modifier = Modifier.background(LocalPlColors.current.warningBg, RoundedCornerShape(6.dp)).padding(8.dp))
            }
            if (!p.finalPrompt.isNullOrBlank()) {
                Text(p.finalPrompt!!, fontFamily = FontFamily.Monospace, style = MaterialTheme.typography.bodySmall, modifier = Modifier.background(LocalPlColors.current.background, RoundedCornerShape(6.dp)).padding(10.dp))
                Button(onClick = {
                    val cm = ctx.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                    cm.setPrimaryClip(ClipData.newPlainText("prompt", p.finalPrompt))
                    copied = true
                }, colors = ButtonDefaults.buttonColors(containerColor = LocalPlColors.current.teal)) { Text(if (copied) "Copied!" else "Copy prompt") }
            } else {
                Text(p.result.summary.message ?: "Analysis complete.", color = LocalPlColors.current.textSecondary, style = MaterialTheme.typography.bodySmall)
            }
            if (p.recommendations.isNotEmpty()) {
                Text("Recommendations", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.bodySmall)
                p.recommendations.forEach { Text("• $it", style = MaterialTheme.typography.bodySmall) }
            }
        }
    }
}

@Composable
private fun WhyCard(p: AnalysisPayload) {
    Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
        Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text("Why this engine and score?", fontWeight = FontWeight.Bold)
            Text("Engine: ${p.engine ?: "rules"}", style = MaterialTheme.typography.bodySmall, color = LocalPlColors.current.textSecondary)
            Text("Router: ${p.router?.reason ?: "manual selection"}", style = MaterialTheme.typography.bodySmall, color = LocalPlColors.current.textSecondary)
            Text("Detector confidence: ${String.format("%.2f", p.confidence ?: 0.0)}", style = MaterialTheme.typography.bodySmall, color = LocalPlColors.current.textSecondary)
            Text("This mobile app runs the deterministic Rules backend on-device for parity. BERT and grounded LLM are available in the full Streamlit engine.", style = MaterialTheme.typography.bodySmall, color = LocalPlColors.current.textSecondary)
        }
    }
}

@Composable
private fun riskColorLevel(level: String) = when (level) {
    "Critical" -> LocalPlColors.current.critical
    "High" -> LocalPlColors.current.high
    "Medium" -> LocalPlColors.current.medium
    else -> LocalPlColors.current.low
}
