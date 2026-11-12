package com.promptlinter.app.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.promptlinter.app.ui.theme.*
import com.promptlinter.app.ui.viewmodel.MainViewModel

@Composable
fun HistoryScreen(vm: MainViewModel) {
    var refresh by remember { mutableIntStateOf(0) }
    val items = remember(vm.historySearch, vm.historyRiskFilter, vm.historySort, refresh) {
        vm.historyRepo.filterAndSort(vm.historySearch, vm.historyRiskFilter, vm.historySort)
    }

    LazyColumn(modifier = Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        item {
            Text("Analysis History", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
            Text("Review, reopen, and manage previous UI prompt evaluations.", color = LocalPlColors.current.textSecondary, style = MaterialTheme.typography.bodySmall)
            Spacer(Modifier.height(8.dp))
            OutlinedTextField(
                value = vm.historySearch, onValueChange = { vm.historySearch = it },
                modifier = Modifier.fillMaxWidth(), placeholder = { Text("Search prompts or elements...") }, singleLine = true
            )
            Spacer(Modifier.height(6.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                var riskExpanded by remember { mutableStateOf(false) }
                Box {
                    OutlinedButton(onClick = { riskExpanded = true }) { Text(if (vm.historyRiskFilter == "ALL") "All Levels" else vm.historyRiskFilter) }
                    DropdownMenu(expanded = riskExpanded, onDismissRequest = { riskExpanded = false }) {
                        listOf("ALL","CRITICAL","HIGH","MEDIUM","LOW","MINIMAL").forEach { r ->
                            DropdownMenuItem(text = { Text(r) }, onClick = { vm.historyRiskFilter = r; riskExpanded = false })
                        }
                    }
                }
                var sortExpanded by remember { mutableStateOf(false) }
                Box {
                    OutlinedButton(onClick = { sortExpanded = true }) { Text(when(vm.historySort){"risk_desc"->"Highest Risk";"coverage_asc"->"Lowest Completeness";else->"Most Recent"}) }
                    DropdownMenu(expanded = sortExpanded, onDismissRequest = { sortExpanded = false }) {
                        DropdownMenuItem(text={Text("Most Recent")}, onClick={vm.historySort="date_desc"; sortExpanded=false})
                        DropdownMenuItem(text={Text("Highest Risk")}, onClick={vm.historySort="risk_desc"; sortExpanded=false})
                        DropdownMenuItem(text={Text("Lowest Completeness")}, onClick={vm.historySort="coverage_asc"; sortExpanded=false})
                    }
                }
            }
            if (items.isNotEmpty()) {
                Spacer(Modifier.height(4.dp))
                TextButton(onClick = { vm.historyRepo.clear(); refresh++ }, colors = ButtonDefaults.textButtonColors(contentColor = LocalPlColors.current.critical)) {
                    Text("Clear All")
                }
            }
        }

        if (items.isEmpty()) {
            item {
                Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface), modifier = Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(24.dp)) {
                        Text("No analysis history", fontWeight = FontWeight.Bold)
                        Text("Evaluate a UI prompt to see it here.", color = LocalPlColors.current.textSecondary, style = MaterialTheme.typography.bodySmall)
                    }
                }
            }
        } else {
            items(items, key = { it.id }) { item ->
                Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface), modifier = Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        Text(item.prompt, fontWeight = FontWeight.SemiBold, maxLines = 2, overflow = TextOverflow.Ellipsis)
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                            Surface(
                                shape = MaterialTheme.shapes.small,
                                color = riskColor(item.riskLevel).copy(alpha = 0.14f)
                            ) {
                                Text(
                                    item.riskLevel,
                                    style = MaterialTheme.typography.labelSmall,
                                    color = riskColor(item.riskLevel),
                                    fontWeight = FontWeight.Bold,
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                                )
                            }
                            Text("${item.riskScore}/100", fontWeight = FontWeight.Bold, color = riskColor(item.riskLevel))
                            Text("· ${item.coverageScore}% complete", color = LocalPlColors.current.textSecondary, style = MaterialTheme.typography.bodySmall)
                        }
                        if (item.elements.isNotEmpty()) {
                            Text(item.elements.joinToString(", "), style = MaterialTheme.typography.bodySmall, color = LocalPlColors.current.teal, maxLines = 1, overflow = TextOverflow.Ellipsis)
                        }
                        Text(item.createdAt.take(10), style = MaterialTheme.typography.labelSmall, color = LocalPlColors.current.textSecondary)
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Button(onClick = { vm.openFromHistory(item) }, colors = ButtonDefaults.buttonColors(containerColor = LocalPlColors.current.teal)) { Text("Reopen") }
                            OutlinedButton(onClick = { vm.historyRepo.delete(item.id); refresh++ }, colors = ButtonDefaults.outlinedButtonColors(contentColor = LocalPlColors.current.critical)) { Text("Delete") }
                        }
                    }
                }
            }
        }
        item { Spacer(Modifier.height(20.dp)) }
    }
}

@Composable
fun riskColor(level: String): Color = when (level) {
    "CRITICAL" -> LocalPlColors.current.critical
    "HIGH" -> LocalPlColors.current.high
    "MEDIUM" -> LocalPlColors.current.medium
    else -> LocalPlColors.current.low
}
