package com.promptlinter.app.ui.screens

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.slideInVertically
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.promptlinter.app.ui.components.PlLogo
import com.promptlinter.app.ui.theme.*
import com.promptlinter.app.ui.viewmodel.MainViewModel
import com.promptlinter.app.ui.viewmodel.Tab

@Composable
fun AboutScreen(vm: MainViewModel) {
    var showSteps by remember { mutableStateOf(false) }
    LaunchedEffect(Unit) { showSteps = true }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(18.dp)
    ) {
        Spacer(Modifier.height(4.dp))

        // 1. HERO
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(22.dp),
            colors = CardDefaults.cardColors(containerColor = LocalPlColors.current.darkTeal),
            border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.3f))
        ) {
            Column(Modifier.padding(22.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Surface(
                        shape = RoundedCornerShape(8.dp),
                        color = LocalPlColors.current.mustard.copy(alpha = 0.2f),
                        border = BorderStroke(1.dp, LocalPlColors.current.mustard.copy(alpha = 0.45f))
                    ) {
                        Text(
                            "UI PROMPT REVIEW",
                            style = MaterialTheme.typography.labelSmall.copy(
                                fontWeight = FontWeight.Bold,
                                color = LocalPlColors.current.mustard,
                                letterSpacing = 1.sp
                            ),
                            modifier = Modifier.padding(horizontal = 9.dp, vertical = 4.dp)
                        )
                    }
                    PlLogo(modifier = Modifier.size(34.dp))
                }

                Spacer(Modifier.height(18.dp))
                Text(
                    "Better interfaces start before the first line of UI code.",
                    style = MaterialTheme.typography.headlineSmall.copy(
                        fontWeight = FontWeight.Bold,
                        color = Color.White,
                        lineHeight = 29.sp
                    )
                )
                Spacer(Modifier.height(8.dp))
                Text(
                    "Catch missing labels, colours, placement and actions in natural-language UI prompts before they reach a generator. Prompt Linter detects elements, links attributes, clears up ambiguity and produces a validated rewrite.",
                    style = MaterialTheme.typography.bodyMedium.copy(
                        color = Color.White.copy(alpha = 0.88f),
                        lineHeight = 21.sp
                    )
                )
                Spacer(Modifier.height(18.dp))
                PromptExaminationVisual()
                Spacer(Modifier.height(20.dp))
                Button(
                    onClick = { vm.closeDetail(); vm.selectedTab = Tab.NEW_ANALYSIS },
                    modifier = Modifier.fillMaxWidth().height(50.dp),
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = LocalPlColors.current.mustard, contentColor = LocalPlColors.current.darkTeal)
                ) {
                    Icon(Icons.Default.Analytics, contentDescription = null, modifier = Modifier.size(18.dp))
                    Spacer(Modifier.width(8.dp))
                    Text("Analyze a Prompt", fontWeight = FontWeight.Bold)
                }
            }
        }

        // 2. THE PROBLEM
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(18.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
            border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline)
        ) {
            Column(Modifier.padding(18.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier.size(36.dp).clip(CircleShape).background(LocalPlColors.current.critical.copy(alpha = 0.12f)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(Icons.Default.ReportProblem, contentDescription = null, tint = LocalPlColors.current.critical, modifier = Modifier.size(20.dp))
                    }
                    Spacer(Modifier.width(10.dp))
                    Text(
                        "A prompt can look clear and still generate the wrong UI.",
                        style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
                        modifier = Modifier.weight(1f)
                    )
                }
                Spacer(Modifier.height(12.dp))
                Text(
                    "UI generators fill the gaps themselves. Missing labels, vague colours and ambiguous actions become assumptions in the generated screen.",
                    style = MaterialTheme.typography.bodyMedium.copy(color = MaterialTheme.colorScheme.onSurfaceVariant, lineHeight = 22.sp)
                )
                Spacer(Modifier.height(14.dp))
                ValueItem(Icons.Default.Warning, "Missing details", "“Add a button” says nothing about its text, colour, placement or what clicking it does. The generator has to guess.")
                Spacer(Modifier.height(12.dp))
                ValueItem(Icons.Default.Visibility, "Vague values", "“Some nice colour”, “somewhere on the side” and “does something useful” are not actionable. Prompt Linter asks instead of pretending.")
                Spacer(Modifier.height(12.dp))
                ValueItem(Icons.Default.Link, "Attribute ambiguity", "With several elements on screen, it is easy to attach a colour or action to the wrong component. The engine links every attribute to an element.")
            }
        }

        // 3. HOW IT WORKS
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(18.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
            border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline)
        ) {
            Column(Modifier.padding(18.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier.size(36.dp).clip(CircleShape).background(LocalPlColors.current.teal.copy(alpha = 0.12f)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(Icons.Default.Tune, contentDescription = null, tint = LocalPlColors.current.teal, modifier = Modifier.size(20.dp))
                    }
                    Spacer(Modifier.width(10.dp))
                    Text("How Prompt Linter Works", style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold))
                }
                Spacer(Modifier.height(14.dp))
                val steps = listOf(
                    WorkflowStep("1", "Describe", "Provide the natural-language UI request: the screen, elements, colours, placement and behaviour.", Icons.Default.EditNote),
                    WorkflowStep("2", "Detect", "Choose Rules, BERT or LLM from prompt features, then detect elements and link their attributes.", Icons.Default.Analytics),
                    WorkflowStep("3", "Ask", "Missing, vague or low-confidence details become targeted questions. Answers are merged and re-checked.", Icons.Default.QuestionAnswer),
                    WorkflowStep("4", "Improve", "Get a risk score, prioritised recommendations and a validated final prompt with placeholders.", Icons.Default.VerifiedUser)
                )
                steps.forEachIndexed { i, step ->
                    AnimatedVisibility(
                        visible = showSteps,
                        enter = fadeIn(tween(300, delayMillis = i * 120)) +
                                slideInVertically(initialOffsetY = { 20 }, animationSpec = tween(300, delayMillis = i * 120))
                    ) {
                        Column {
                            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.Top) {
                                Surface(shape = CircleShape, color = MaterialTheme.colorScheme.primaryContainer, modifier = Modifier.size(32.dp)) {
                                    Box(contentAlignment = Alignment.Center) {
                                        Text(
                                            step.number,
                                            style = MaterialTheme.typography.labelMedium.copy(
                                                fontWeight = FontWeight.Bold,
                                                color = MaterialTheme.colorScheme.onPrimaryContainer
                                            )
                                        )
                                    }
                                }
                                Spacer(Modifier.width(12.dp))
                                Column(Modifier.weight(1f)) {
                                    Text("${step.number}. ${step.title}", style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold))
                                    Spacer(Modifier.height(2.dp))
                                    Text(
                                        step.description,
                                        style = MaterialTheme.typography.bodySmall.copy(color = MaterialTheme.colorScheme.onSurfaceVariant, lineHeight = 17.sp)
                                    )
                                }
                            }
                            if (i < steps.size - 1) {
                                Box(
                                    modifier = Modifier
                                        .padding(start = 15.dp, top = 4.dp, bottom = 4.dp)
                                        .width(2.dp)
                                        .height(18.dp)
                                        .background(MaterialTheme.colorScheme.outline.copy(alpha = 0.5f))
                                )
                            }
                        }
                    }
                }
            }
        }

        // 4. WHAT MAKES IT USEFUL
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(18.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
            border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline)
        ) {
            Column(Modifier.padding(18.dp)) {
                Text("What makes Prompt Linter useful?", style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold))
                Spacer(Modifier.height(14.dp))
                ValueItem(Icons.Default.Layers, "Element-aware findings", "Every missing detail is attached to a specific element — not just “the prompt is incomplete”.")
                Spacer(Modifier.height(12.dp))
                ValueItem(Icons.Default.Verified, "Grounded suggestions", "Recommendations use the confirmed prompt and answers. Placeholders remain where the user has not decided.")
                Spacer(Modifier.height(12.dp))
                ValueItem(Icons.Default.Speed, "Shared risk score", "Completeness, vagueness, detector confidence and unresolved questions combine into a deterministic 0–100 score.")
                Spacer(Modifier.height(12.dp))
                ValueItem(Icons.Default.AutoFixHigh, "Three engines, one result", "Rules, a fine-tuned DistilBERT tagger and an optional grounded LLM feed the same checker and final recommendation.")
            }
        }

        // 5. ANALYSIS APPROACH
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(18.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
            border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline)
        ) {
            Column(Modifier.padding(18.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier.size(36.dp).clip(CircleShape).background(MaterialTheme.colorScheme.primaryContainer),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(Icons.Default.PrivacyTip, contentDescription = null, tint = MaterialTheme.colorScheme.onPrimaryContainer, modifier = Modifier.size(20.dp))
                    }
                    Spacer(Modifier.width(10.dp))
                    Text("Analysis Approach", style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold))
                }
                Spacer(Modifier.height(12.dp))
                Text(
                    "The core analysis is deterministic and explainable. Rules and BERT only label words that exist in the prompt. The LLM layer is grounded: values that cannot be found in the prompt or in the user’s answers are rejected.\n\n" +
                            "On mobile the router scores the prompt, runs the Rules, BERT or LLM detector that is expected to perform best, and verifies that choice against the confidence each detector actually produced. Rules runs fully on-device; BERT downloads its model once and then runs on-device; the LLM uses the endpoint configured in Settings and always writes the final explanation. Clarification questions block the risk score until the prompt is unambiguous, and nothing is fabricated when a model is unreachable.",
                    style = MaterialTheme.typography.bodySmall.copy(color = MaterialTheme.colorScheme.onSurfaceVariant, lineHeight = 19.sp)
                )
            }
        }

        // 6. RESPONSIBLE USE
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(18.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
            border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline)
        ) {
            Column(Modifier.padding(18.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier.size(36.dp).clip(CircleShape).background(LocalPlColors.current.mustard.copy(alpha = 0.2f)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(Icons.Default.Security, contentDescription = null, tint = LocalPlColors.current.darkTeal, modifier = Modifier.size(20.dp))
                    }
                    Spacer(Modifier.width(10.dp))
                    Text(
                        "A useful checkpoint, not a guarantee.",
                        style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
                        modifier = Modifier.weight(1f)
                    )
                }
                Spacer(Modifier.height(12.dp))
                Text(
                    "The risk score is a heuristic, not a guarantee. It highlights missing details and uncertainty; it does not replace design review or a human check of the generated UI.\n\n" +
                            "Always review the final prompt and validate the generated screen against your product requirements, accessibility baseline and design system.",
                    style = MaterialTheme.typography.bodySmall.copy(color = MaterialTheme.colorScheme.onSurfaceVariant, lineHeight = 19.sp)
                )
            }
        }

        // 7. CTA
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(18.dp),
            colors = CardDefaults.cardColors(containerColor = LocalPlColors.current.darkTeal),
            border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.3f))
        ) {
            Column(Modifier.padding(22.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                Text(
                    "Make the missing details visible.",
                    style = MaterialTheme.typography.titleLarge.copy(fontWeight = FontWeight.Bold, color = Color.White)
                )
                Spacer(Modifier.height(6.dp))
                Text(
                    "Start with the UI you want to build. Review what the prompt left out before generating the screen.",
                    style = MaterialTheme.typography.bodyMedium.copy(color = Color.White.copy(alpha = 0.88f)),
                    textAlign = androidx.compose.ui.text.style.TextAlign.Center
                )
                Spacer(Modifier.height(14.dp))
                Button(
                    onClick = { vm.closeDetail(); vm.selectedTab = Tab.NEW_ANALYSIS },
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = LocalPlColors.current.mustard, contentColor = LocalPlColors.current.darkTeal)
                ) {
                    Text("Analyze a Prompt", fontWeight = FontWeight.Bold)
                    Spacer(Modifier.width(6.dp))
                    Icon(Icons.AutoMirrored.Filled.ArrowForward, contentDescription = null, modifier = Modifier.size(16.dp))
                }
            }
        }

        Spacer(Modifier.height(24.dp))
    }
}

private data class WorkflowStep(val number: String, val title: String, val description: String, val icon: ImageVector)

@Composable
private fun ValueItem(icon: ImageVector, title: String, description: String) {
    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.Top) {
        Box(
            modifier = Modifier.size(32.dp).clip(CircleShape).background(MaterialTheme.colorScheme.primaryContainer),
            contentAlignment = Alignment.Center
        ) {
            Icon(icon, contentDescription = null, tint = MaterialTheme.colorScheme.onPrimaryContainer, modifier = Modifier.size(18.dp))
        }
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f)) {
            Text(title, style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold))
            Spacer(Modifier.height(2.dp))
            Text(description, style = MaterialTheme.typography.bodySmall.copy(color = MaterialTheme.colorScheme.onSurfaceVariant, lineHeight = 18.sp))
        }
    }
}

@Composable
private fun PromptExaminationVisual() {
    val transition = rememberInfiniteTransition(label = "pulse")
    val alpha by transition.animateFloat(
        initialValue = 0.5f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(tween(1200, easing = FastOutSlowInEasing), RepeatMode.Reverse),
        label = "pulseAlpha"
    )

    Surface(
        shape = RoundedCornerShape(14.dp),
        color = Color(0xFF1E2E30),
        border = BorderStroke(1.dp, LocalPlColors.current.mustard.copy(alpha = 0.35f))
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(14.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Stage(Icons.Default.EditNote, "Prompt", Color.White, Color.White.copy(alpha = 0.12f))
            Icon(Icons.AutoMirrored.Filled.ArrowForward, contentDescription = null, tint = LocalPlColors.current.mustard.copy(alpha = alpha), modifier = Modifier.size(16.dp))
            Stage(Icons.Default.Analytics, "Rules", LocalPlColors.current.mustard, LocalPlColors.current.mustard.copy(alpha = 0.25f))
            Icon(Icons.AutoMirrored.Filled.ArrowForward, contentDescription = null, tint = LocalPlColors.current.mustard.copy(alpha = alpha), modifier = Modifier.size(16.dp))
            Stage(Icons.Default.CheckCircle, "Validated", Color.White, LocalPlColors.current.teal.copy(alpha = 0.4f))
        }
    }
}

@Composable
private fun Stage(icon: ImageVector, label: String, tint: Color, bg: Color) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Surface(shape = RoundedCornerShape(8.dp), color = bg, modifier = Modifier.size(36.dp)) {
            Box(contentAlignment = Alignment.Center) {
                Icon(icon, contentDescription = null, tint = tint, modifier = Modifier.size(20.dp))
            }
        }
        Spacer(Modifier.height(4.dp))
        Text(label, style = MaterialTheme.typography.labelSmall.copy(color = tint, fontSize = 10.sp))
    }
}
