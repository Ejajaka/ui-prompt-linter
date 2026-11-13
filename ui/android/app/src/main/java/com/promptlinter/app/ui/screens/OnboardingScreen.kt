package com.promptlinter.app.ui.screens

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.core.tween
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.automirrored.filled.MenuBook
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.promptlinter.app.ui.components.PlLogo
import com.promptlinter.app.ui.theme.*

data class OnboardingFeature(val icon: ImageVector, val title: String, val description: String)
data class OnboardingStep(
    val badge: String,
    val title: String,
    val subtitle: String,
    val icon: ImageVector,
    val cards: List<OnboardingFeature>
)

@Composable
fun OnboardingScreen(onFinish: () -> Unit) {
    val steps = remember {
        listOf(
            OnboardingStep(
                badge = "WELCOME TO PROMPT LINTER",
                title = "Review UI prompts before you generate",
                subtitle = "Prompt Linter checks a natural-language UI request for missing labels, colours, placement and actions — then produces a validated rewrite.",
                icon = Icons.Default.ChatBubbleOutline,
                cards = listOf(
                    OnboardingFeature(Icons.Default.CheckCircle, "Pre-generation review", "Catch gaps in the prompt before an AI UI generator turns them into assumptions."),
                    OnboardingFeature(Icons.Default.Layers, "Element-aware findings", "Every missing detail is linked to a specific element: button, navbar, input, card, modal and more."),
                    OnboardingFeature(Icons.Default.CloudOff, "Runs offline first", "The Rules engine runs entirely on-device with no account or server. BERT and the LLM are optional.")
                )
            ),
            OnboardingStep(
                badge = "THE 4-STEP WORKFLOW",
                title = "Describe → Detect → Ask → Improve",
                subtitle = "The same deterministic workflow as the website and browser extension.",
                icon = Icons.Default.Tune,
                cards = listOf(
                    OnboardingFeature(Icons.Default.EditNote, "1. Describe", "Enter the screen, elements, colours, placement and behaviour you want — or pick an example."),
                    OnboardingFeature(Icons.Default.Biotech, "2. Detect", "The router picks Rules, BERT or LLM, then the winning detector tags elements and links colour, location, action and label."),
                    OnboardingFeature(Icons.Default.QuestionAnswer, "3. Ask", "Missing or vague details become targeted clarification questions. Answers are merged and re-checked."),
                    OnboardingFeature(Icons.Default.AutoFixHigh, "4. Improve", "Get a 0–100 risk score, recommendations and a copy-ready validated prompt.")
                )
            ),
            OnboardingStep(
                badge = "BASELINE & HISTORY",
                title = "Guidelines, scores and local history",
                subtitle = "A fixed completeness baseline keeps every platform honest and consistent.",
                icon = Icons.Default.History,
                cards = listOf(
                    OnboardingFeature(Icons.AutoMirrored.Filled.MenuBook, "Prompt guidelines", "Browse the 10 supported UI elements, required attributes, annotation rules and risk bands."),
                    OnboardingFeature(Icons.Default.History, "Audit history", "Search, filter by risk, sort and reopen previous evaluations. Stored only on this device."),
                    OnboardingFeature(Icons.Default.Shield, "Honest scoring", "The score highlights missing details and uncertainty. It is a heuristic, not a guarantee.")
                )
            ),
            OnboardingStep(
                badge = "READY TO START",
                title = "Make the missing details visible",
                subtitle = "Start with the UI you want to build. Review what the prompt left out before generating the screen.",
                icon = Icons.Default.RocketLaunch,
                cards = listOf(
                    OnboardingFeature(Icons.Default.CheckCircle, "Rules engine ready", "The deterministic engine is embedded locally and works offline."),
                    OnboardingFeature(Icons.Default.Settings, "Revisit anytime", "Change theme, clear local data or read the project information in Settings.")
                )
            )
        )
    }

    var index by remember { mutableIntStateOf(0) }
    val step = steps[index]
    val last = index == steps.size - 1
    val scroll = rememberScrollState()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .padding(horizontal = 20.dp, vertical = 16.dp),
        verticalArrangement = Arrangement.SpaceBetween
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Surface(
                shape = RoundedCornerShape(12.dp),
                color = MaterialTheme.colorScheme.surface,
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline)
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    PlLogo(modifier = Modifier.size(18.dp))
                    Spacer(Modifier.width(6.dp))
                    Text(
                        "PROMPT LINTER",
                        style = MaterialTheme.typography.labelSmall.copy(
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.primary,
                            letterSpacing = 1.sp
                        )
                    )
                }
            }
            if (!last) {
                TextButton(onClick = onFinish) {
                    Text("Skip", fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            } else {
                Spacer(Modifier.width(48.dp))
            }
        }

        Column(
            modifier = Modifier.weight(1f).verticalScroll(scroll).padding(vertical = 12.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Spacer(Modifier.height(8.dp))
            Surface(
                shape = RoundedCornerShape(8.dp),
                color = LocalPlColors.current.darkTeal,
                border = BorderStroke(1.dp, LocalPlColors.current.mustard.copy(alpha = 0.4f))
            ) {
                Text(
                    step.badge,
                    style = MaterialTheme.typography.labelSmall.copy(
                        fontWeight = FontWeight.Bold,
                        color = LocalPlColors.current.mustard,
                        letterSpacing = 1.sp
                    ),
                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
                )
            }
            Spacer(Modifier.height(16.dp))
            Box(
                modifier = Modifier.size(76.dp).clip(CircleShape).background(MaterialTheme.colorScheme.surfaceVariant),
                contentAlignment = Alignment.Center
            ) {
                Icon(step.icon, contentDescription = null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(40.dp))
            }
            Spacer(Modifier.height(16.dp))
            Text(
                step.title,
                style = MaterialTheme.typography.headlineSmall.copy(fontWeight = FontWeight.Bold),
                textAlign = TextAlign.Center
            )
            Spacer(Modifier.height(8.dp))
            Text(
                step.subtitle,
                style = MaterialTheme.typography.bodyMedium.copy(color = MaterialTheme.colorScheme.onSurfaceVariant, lineHeight = 22.sp),
                textAlign = TextAlign.Center,
                modifier = Modifier.padding(horizontal = 12.dp)
            )
            Spacer(Modifier.height(20.dp))
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                step.cards.forEach { card ->
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(14.dp),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline)
                    ) {
                        Row(Modifier.padding(14.dp), verticalAlignment = Alignment.Top) {
                            Box(
                                modifier = Modifier.size(36.dp).clip(CircleShape).background(MaterialTheme.colorScheme.primaryContainer),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(card.icon, contentDescription = null, tint = MaterialTheme.colorScheme.onPrimaryContainer, modifier = Modifier.size(20.dp))
                            }
                            Spacer(Modifier.width(12.dp))
                            Column(Modifier.weight(1f)) {
                                Text(card.title, style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold))
                                Spacer(Modifier.height(3.dp))
                                Text(card.description, style = MaterialTheme.typography.bodySmall.copy(color = MaterialTheme.colorScheme.onSurfaceVariant, lineHeight = 18.sp))
                            }
                        }
                    }
                }
            }
        }

        Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally) {
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalAlignment = Alignment.CenterVertically) {
                steps.indices.forEach { i ->
                    val current = i == index
                    Box(
                        modifier = Modifier
                            .height(8.dp)
                            .width(if (current) 24.dp else 8.dp)
                            .clip(CircleShape)
                            .background(if (current) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outline.copy(alpha = 0.5f))
                    )
                }
            }
            Spacer(Modifier.height(18.dp))
            if (last) {
                Button(
                    onClick = onFinish,
                    modifier = Modifier.fillMaxWidth().height(52.dp),
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = LocalPlColors.current.mustard, contentColor = LocalPlColors.current.darkTeal)
                ) {
                    Icon(Icons.Default.RocketLaunch, contentDescription = null, modifier = Modifier.size(20.dp))
                    Spacer(Modifier.width(8.dp))
                    Text("Get Started", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                }
            } else {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    if (index > 0) {
                        OutlinedButton(
                            onClick = { index-- },
                            modifier = Modifier.weight(1f).height(50.dp),
                            shape = RoundedCornerShape(12.dp),
                            border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline)
                        ) { Text("Previous", fontWeight = FontWeight.SemiBold) }
                    }
                    Button(
                        onClick = { index++ },
                        modifier = Modifier.weight(if (index > 0) 1.5f else 1f).height(50.dp),
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary, contentColor = MaterialTheme.colorScheme.onPrimary)
                    ) {
                        Text("Next", fontWeight = FontWeight.Bold, fontSize = 15.sp)
                        Spacer(Modifier.width(6.dp))
                        Icon(Icons.AutoMirrored.Filled.ArrowForward, contentDescription = null, modifier = Modifier.size(16.dp))
                    }
                }
            }
            Spacer(Modifier.height(10.dp))
        }
    }
}
