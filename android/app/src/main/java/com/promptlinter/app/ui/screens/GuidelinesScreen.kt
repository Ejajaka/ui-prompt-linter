package com.promptlinter.app.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.promptlinter.app.ui.theme.*

data class GControl(val name: String, val desc: String, val detail: String, val badge: String)
data class GCategory(val title: String, val desc: String, val detailLabel: String, val items: List<GControl>)

private val categories = listOf(
    GCategory("Supported UI Elements", "The ten interface elements Prompt Linter detects, and the required details each one must state to be considered complete.", "Required attributes", listOf(
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
    LazyColumn(modifier = Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item {
            Text("Prompt Guidelines & Baseline", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
            Spacer(Modifier.height(4.dp))
            Text("Reference catalog of UI elements, required attributes, annotation rules and risk bands evaluated by Prompt Linter.", color = PlSecondaryText, style = MaterialTheme.typography.bodySmall)
            Spacer(Modifier.height(8.dp))
        }
        items(categories) { cat ->
            var expanded by remember { mutableStateOf(cat.title == "Supported UI Elements") }
            Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
                Column(Modifier.padding(14.dp)) {
                    TextButton(onClick = { expanded = !expanded }, modifier = Modifier.fillMaxWidth()) {
                        Column(Modifier.weight(1f)) {
                            Text(cat.title, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface)
                            Text(cat.desc, style = MaterialTheme.typography.bodySmall, color = PlSecondaryText, maxLines = if (expanded) 5 else 1)
                        }
                        Text(if (expanded) "▲" else "▼", color = PlSecondaryText)
                    }
                    if (expanded) {
                        cat.items.forEach { c ->
                            Spacer(Modifier.height(8.dp))
                            Card(colors = CardDefaults.cardColors(containerColor = PlBackground)) {
                                Column(Modifier.padding(12.dp)) {
                                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                        Text(c.name, fontWeight = FontWeight.Bold)
                                        AssistChip(onClick = {}, label = { Text(c.badge, style = MaterialTheme.typography.labelSmall) })
                                    }
                                    Text(c.desc, style = MaterialTheme.typography.bodySmall, color = PlSecondaryText)
                                    Spacer(Modifier.height(4.dp))
                                    Text("${cat.detailLabel}: ${c.detail}", style = MaterialTheme.typography.bodySmall, color = PlDarkTeal)
                                }
                            }
                        }
                    }
                }
            }
        }
        item { Spacer(Modifier.height(16.dp)) }
    }
}
