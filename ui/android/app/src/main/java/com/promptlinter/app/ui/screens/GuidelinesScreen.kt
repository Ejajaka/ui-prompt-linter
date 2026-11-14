package com.promptlinter.app.ui.screens

import androidx.compose.animation.animateContentSize
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ExpandMore
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.promptlinter.app.ui.theme.*

data class GControl(val name: String, val desc: String, val detail: String, val badge: String)
data class GCategory(val title: String, val desc: String, val detailLabel: String, val items: List<GControl>)

private val categories = listOf(
    GCategory("Supported UI Elements", "The ten interface elements Vector detects, and the required details each one must state to be considered complete.", "Required attributes", listOf(
        GControl("Button", "A clickable action: its text, colour, placement and what it does.", "LABEL, ACTION, COLOR, LOCATION", "4 required"),
        GControl("Navbar", "A top navigation bar with links.", "COLOR, LOCATION, LABEL", "3 required"),
        GControl("Input", "A text field or form control.", "LABEL, LOCATION", "2 required"),
        GControl("Card", "A content container with a title.", "COLOR, LOCATION, LABEL", "3 required"),
        GControl("Modal", "A dialog or overlay window.", "ACTION, LABEL, COLOR", "3 required"),
        GControl("Image", "A picture or illustration.", "LOCATION, LABEL", "2 required"),
        GControl("Dropdown", "A select menu with options.", "LABEL, LOCATION, ACTION", "3 required"),
        GControl("Sidebar", "A side navigation panel.", "LOCATION, COLOR, LABEL", "3 required"),
        GControl("Footer", "The page footer.", "COLOR, LABEL", "2 required"),
        GControl("Checkbox", "A tick box with label text.", "LABEL, LOCATION", "2 required"),
    )),
    GCategory("Required Attribute Kinds", "What each attribute kind means when it is attached to an element.", "What it means", listOf(
        GControl("LABEL", "The text or purpose shown on the element.", "Text on a button, navbar links, input purpose, card/modal title, image description, dropdown selection, footer content, or checkbox text.", "10 elements"),
        GControl("LOCATION", "Where the element sits on the screen.", "Absolute (e.g. top right corner) or relational (e.g. below the navbar). Vague placement does not count.", "8 elements"),
        GControl("COLOR", "The colour of the element.", "Named colours, hex values, or joined forms. Vague colours do not count.", "6 elements"),
        GControl("ACTION", "What interacting with the element does.", "What a button click does, what opens a modal, or what selecting a dropdown option does.", "3 elements"),
    )),
    GCategory("Annotation Rules", "Deterministic rules the engine follows when labelling the words in a prompt.", "Guidance", listOf(
        GControl("No implicit inference", "Only stated details are labelled — nothing is assumed.", "A login button has label context but no stated ACTION, so action counts as missing.", "Rule 1"),
        GControl("Vague values are not labelled", "Non-actionable phrasing is treated as missing.", "“Some nice colour”, “somewhere on the side” etc. are too vague to label.", "Rule 2"),
        GControl("Landmark references are not elements", "Placement nouns stay part of a location span.", "In “above the footer”, footer belongs to a LOCATION span — not a new element.", "Rule 3"),
        GControl("Attributes follow their clause", "A value belongs to the element it is closest to.", "“A red button and a blue card” links red to button and blue to card.", "Rule 4"),
        GControl("Only the words themselves are labelled", "Function words stay outside the tag.", "Quotes, “labelled”, “colour” remain unlabelled; only value words carry tags.", "Rule 5"),
        GControl("Coreference is out of scope", "Pronouns and forward references are not resolved.", "“Make it blue” or “another one next to it” are left for the user to clarify.", "Rule 6"),
    )),
    GCategory("Risk Score Bands", "Shared deterministic 0–100 risk score and its four severity bands.", "Band", listOf(
        GControl("Low", "The prompt is essentially complete.", "Few or no missing details — safe to proceed to generation.", "0–24"),
        GControl("Medium", "Some details are missing or vague.", "Answer clarification questions before generating to avoid assumptions.", "25–49"),
        GControl("High", "Important details are missing or ambiguous.", "Resolve missing attributes before relying on the generated UI.", "50–74"),
        GControl("Critical", "Core details are missing or risky assumptions exist.", "Block generation until the prompt is completed and validated.", "75–100"),
    )),
)

@Composable
fun GuidelinesScreen() {
    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item {
            Spacer(Modifier.height(4.dp))
            Column {
                Text(
                    "Prompt Guidelines",
                    style = MaterialTheme.typography.headlineSmall.copy(fontWeight = FontWeight.Bold)
                )
                Spacer(Modifier.height(4.dp))
                Text(
                    "Reference catalog of UI elements, required attributes, annotation rules and risk bands evaluated by Vector.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
        items(categories) { cat ->
            var expanded by remember { mutableStateOf(cat.title == "Supported UI Elements") }
            val arrowRotation by animateFloatAsState(
                targetValue = if (expanded) 180f else 0f,
                animationSpec = tween(durationMillis = 250),
                label = "guidelineArrow"
            )
            Card(
                modifier = Modifier.fillMaxWidth().animateContentSize(),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline)
            ) {
                Column {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { expanded = !expanded }
                            .padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Box(
                            modifier = Modifier.size(36.dp).clip(CircleShape)
                                .background(MaterialTheme.colorScheme.primaryContainer),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                "${categories.indexOf(cat) + 1}",
                                style = MaterialTheme.typography.labelMedium.copy(
                                    fontWeight = FontWeight.Bold,
                                    color = MaterialTheme.colorScheme.onPrimaryContainer
                                )
                            )
                        }
                        Spacer(Modifier.width(12.dp))
                        Column(Modifier.weight(1f)) {
                            Text(cat.title, style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold))
                            Text(
                                cat.desc,
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                maxLines = if (expanded) 5 else 1
                            )
                        }
                        Icon(
                            Icons.Default.ExpandMore,
                            contentDescription = if (expanded) "Collapse" else "Expand",
                            tint = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.rotate(arrowRotation)
                        )
                    }
                    if (expanded) {
                        Column(Modifier.padding(start = 16.dp, end = 16.dp, bottom = 16.dp)) {
                            cat.items.forEach { c ->
                                Card(
                                    modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                                    shape = RoundedCornerShape(12.dp),
                                    colors = CardDefaults.cardColors(
                                        containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.55f)
                                    ),
                                    border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.6f))
                                ) {
                                    Column(Modifier.padding(12.dp)) {
                                        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                                            Text(
                                                c.name,
                                                style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold),
                                                modifier = Modifier.weight(1f)
                                            )
                                            Surface(
                                                shape = RoundedCornerShape(6.dp),
                                                color = MaterialTheme.colorScheme.primaryContainer
                                            ) {
                                                Text(
                                                    c.badge,
                                                    style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.Bold),
                                                    color = MaterialTheme.colorScheme.onPrimaryContainer,
                                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                                                )
                                            }
                                        }
                                        Spacer(Modifier.height(4.dp))
                                        Text(
                                            c.desc,
                                            style = MaterialTheme.typography.bodySmall,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant
                                        )
                                        Spacer(Modifier.height(6.dp))
                                        Text(
                                            "${cat.detailLabel}: ${c.detail}",
                                            style = MaterialTheme.typography.bodySmall,
                                            color = LocalVectorColors.current.darkTeal
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        item { Spacer(Modifier.height(20.dp)) }
    }
}
