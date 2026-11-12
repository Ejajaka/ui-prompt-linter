package com.promptlinter.app.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.promptlinter.app.data.model.HistoryItem
import com.promptlinter.app.ui.components.PlLogo
import com.promptlinter.app.ui.theme.*
import com.promptlinter.app.ui.viewmodel.MainViewModel
import com.promptlinter.app.ui.viewmodel.Tab

@Composable
fun OverviewScreen(vm: MainViewModel) {
    val all = vm.historyRepo.getAll()
    val total = all.size
    val avgRisk = if (total > 0) all.map { it.riskScore }.average().toInt() else 0
    val avgCoverage = if (total > 0) all.map { it.coverageScore }.average().toInt() else 0
    val highRisk = all.count { it.riskLevel == "HIGH" || it.riskLevel == "CRITICAL" }
    val distribution = listOf("CRITICAL", "HIGH", "MEDIUM", "LOW", "MINIMAL").associateWith { lvl -> all.count { it.riskLevel == lvl } }
    val recent = all.take(5)

    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            Spacer(Modifier.height(4.dp))
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(22.dp),
                colors = CardDefaults.cardColors(containerColor = LocalPlColors.current.darkTeal),
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.3f))
            ) {
                Column(Modifier.padding(20.dp)) {
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
                                "UI/UX PROMPT REVIEW",
                                style = MaterialTheme.typography.labelSmall.copy(
                                    fontWeight = FontWeight.Bold,
                                    color = LocalPlColors.current.mustard,
                                    letterSpacing = 1.sp
                                ),
                                modifier = Modifier.padding(horizontal = 9.dp, vertical = 4.dp)
                            )
                        }
                        PlLogo(modifier = Modifier.size(32.dp))
                    }
                    Spacer(Modifier.height(14.dp))
                    Text("Prompt Linter", style = MaterialTheme.typography.headlineMedium.copy(fontWeight = FontWeight.Bold, color = Color.White))
                    Spacer(Modifier.height(4.dp))
                    Text(
                        "Identify missing labels, colours, placement and actions before your prompt reaches a UI generator.",
                        style = MaterialTheme.typography.bodyMedium.copy(color = Color.White.copy(alpha = 0.88f), lineHeight = 21.sp)
                    )
                    Spacer(Modifier.height(18.dp))
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        Button(
                            onClick = { vm.selectedTab = Tab.NEW_ANALYSIS },
                            modifier = Modifier.weight(1.5f).height(48.dp),
                            shape = RoundedCornerShape(12.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = LocalPlColors.current.mustard, contentColor = LocalPlColors.current.darkTeal)
                        ) {
                            Icon(Icons.Default.AddCircle, contentDescription = null, modifier = Modifier.size(18.dp))
                            Spacer(Modifier.width(8.dp))
                            Text("New Analysis", fontWeight = FontWeight.Bold)
                        }
                        OutlinedButton(
                            onClick = { vm.selectedTab = Tab.ABOUT },
                            modifier = Modifier.weight(1f).height(48.dp),
                            shape = RoundedCornerShape(12.dp),
                            border = BorderStroke(1.dp, Color.White.copy(alpha = 0.4f)),
                            colors = ButtonDefaults.outlinedButtonColors(contentColor = Color.White)
                        ) {
                            Icon(Icons.Default.Info, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(Modifier.width(6.dp))
                            Text("About", fontWeight = FontWeight.SemiBold)
                        }
                    }
                }
            }
        }

        item { RiskDistributionCard(all, distribution) }

        item {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Text("Saved Prompt Activity", style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold))
                if (all.isNotEmpty()) {
                    Text(
                        "View History",
                        style = MaterialTheme.typography.labelMedium.copy(fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary),
                        modifier = Modifier.clickable { vm.selectedTab = Tab.HISTORY }.padding(vertical = 4.dp)
                    )
                }
            }
        }

        item {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    MetricCard("Total Analyses", if (total > 0) total.toString() else "0", "Prompts evaluated", Icons.Default.Layers, LocalPlColors.current.teal, Modifier.weight(1f))
                    MetricCard("Avg Risk", if (total > 0) "$avgRisk/100" else "—", "Across all prompts", Icons.Default.Warning, LocalPlColors.current.mustard, Modifier.weight(1f))
                }
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    MetricCard("Avg Completeness", if (total > 0) "$avgCoverage%" else "—", "Required details stated", Icons.Default.TaskAlt, LocalPlColors.current.low, Modifier.weight(1f))
                    MetricCard("High Risk", highRisk.toString(), "High or Critical", Icons.Default.Shield, LocalPlColors.current.critical, Modifier.weight(1f))
                }
            }
        }

        item {
            Text("Recent Analyses", style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold))
        }

        if (recent.isEmpty()) {
            item {
                Card(
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    shape = RoundedCornerShape(16.dp),
                    border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline)
                ) {
                    Column(Modifier.padding(18.dp)) {
                        Text("No analyses found", fontWeight = FontWeight.SemiBold)
                        Text("Start your first UI prompt completeness review.", color = LocalPlColors.current.textSecondary, style = MaterialTheme.typography.bodySmall)
                        Spacer(Modifier.height(8.dp))
                        Button(onClick = { vm.selectedTab = Tab.NEW_ANALYSIS }, colors = ButtonDefaults.buttonColors(containerColor = LocalPlColors.current.teal)) {
                            Text("Start first analysis")
                        }
                    }
                }
            }
        } else {
            items(recent) { item -> RecentItem(item) { vm.openFromHistory(item) } }
        }
        item { Spacer(Modifier.height(12.dp)) }
    }
}

@Composable
private fun RiskDistributionCard(all: List<HistoryItem>, distribution: Map<String, Int>) {
    val total = all.size
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline)
    ) {
        Column(Modifier.padding(16.dp)) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.PieChart, contentDescription = null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(20.dp))
                    Spacer(Modifier.width(8.dp))
                    Text("Risk Distribution", style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold))
                }
                Text("$total saved", style = MaterialTheme.typography.labelSmall, color = LocalPlColors.current.textSecondary)
            }
            Spacer(Modifier.height(4.dp))
            Text("Severity categorization across all stored analysis records.", style = MaterialTheme.typography.bodySmall, color = LocalPlColors.current.textSecondary)
            Spacer(Modifier.height(12.dp))
            if (total == 0) {
                Text("No analysis data. Evaluate a prompt to visualize risk distribution.", style = MaterialTheme.typography.bodySmall, color = LocalPlColors.current.textSecondary)
            } else {
                Row(Modifier.fillMaxWidth().height(12.dp).clip(RoundedCornerShape(6.dp)).background(LocalPlColors.current.border)) {
                    distribution.forEach { (level, count) ->
                        if (count > 0) {
                            Box(Modifier.weight(count.toFloat()).fillMaxHeight().background(riskColor(level)))
                        }
                    }
                }
                Spacer(Modifier.height(12.dp))
                distribution.forEach { (level, count) ->
                    val pct = if (total > 0) count * 100 / total else 0
                    Row(Modifier.fillMaxWidth().padding(vertical = 2.dp), horizontalArrangement = Arrangement.SpaceBetween) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Box(Modifier.size(8.dp).clip(CircleShape).background(riskColor(level)))
                            Spacer(Modifier.width(8.dp))
                            Text(level.lowercase().replaceFirstChar { it.uppercase() }, style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.Medium)
                        }
                        Text("$count ($pct%)", style = MaterialTheme.typography.bodySmall, color = LocalPlColors.current.textSecondary)
                    }
                }
            }
        }
    }
}

@Composable
private fun MetricCard(title: String, value: String, subtitle: String, icon: ImageVector, accent: Color, modifier: Modifier) {
    Card(
        modifier = modifier,
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline)
    ) {
        Column(Modifier.padding(14.dp)) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Text(title, style = MaterialTheme.typography.labelSmall, color = LocalPlColors.current.textSecondary, modifier = Modifier.weight(1f))
                Box(Modifier.size(28.dp).clip(CircleShape).background(accent.copy(alpha = 0.12f)), contentAlignment = Alignment.Center) {
                    Icon(icon, contentDescription = null, tint = accent, modifier = Modifier.size(16.dp))
                }
            }
            Spacer(Modifier.height(8.dp))
            Text(value, style = MaterialTheme.typography.titleLarge.copy(fontWeight = FontWeight.Bold), fontSize = 24.sp)
            Text(subtitle, style = MaterialTheme.typography.labelSmall, color = LocalPlColors.current.textSecondary)
        }
    }
}

@Composable
private fun RecentItem(item: HistoryItem, onClick: () -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
        onClick = onClick
    ) {
        Column(Modifier.padding(14.dp)) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Text(item.prompt, fontWeight = FontWeight.SemiBold, maxLines = 2, overflow = TextOverflow.Ellipsis, modifier = Modifier.weight(1f))
                Spacer(Modifier.width(8.dp))
                Surface(shape = RoundedCornerShape(6.dp), color = riskColor(item.riskLevel).copy(alpha = 0.12f)) {
                    Text(
                        item.riskLevel.lowercase().replaceFirstChar { it.uppercase() },
                        style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.Bold, color = riskColor(item.riskLevel)),
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                    )
                }
            }
            Spacer(Modifier.height(6.dp))
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text("${item.riskScore}/100 risk · ${item.coverageScore}% complete", style = MaterialTheme.typography.bodySmall, color = LocalPlColors.current.textSecondary)
                Text("Reopen", style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary))
            }
            if (item.elements.isNotEmpty()) {
                Spacer(Modifier.height(4.dp))
                Text(item.elements.joinToString(" · "), style = MaterialTheme.typography.labelSmall, color = LocalPlColors.current.teal, maxLines = 1, overflow = TextOverflow.Ellipsis)
            }
        }
    }
}
