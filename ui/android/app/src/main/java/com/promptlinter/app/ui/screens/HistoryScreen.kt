package com.promptlinter.app.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.automirrored.filled.Sort
import androidx.compose.material.icons.filled.Clear
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.History
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.promptlinter.app.data.model.HistoryItem
import com.promptlinter.app.ui.theme.*
import com.promptlinter.app.ui.viewmodel.MainViewModel

@Composable
fun HistoryScreen(vm: MainViewModel) {
    var refresh by remember { mutableIntStateOf(0) }
    var showClearConfirm by remember { mutableStateOf(false) }
    val items = remember(vm.historySearch, vm.historyRiskFilter, vm.historySort, refresh) {
        vm.historyRepo.filterAndSort(vm.historySearch, vm.historyRiskFilter, vm.historySort)
    }
    val allCount = remember(refresh) { vm.historyRepo.getAll().size }

    Column(
        modifier = Modifier.fillMaxSize().padding(horizontal = 16.dp)
    ) {
        Spacer(Modifier.height(4.dp))

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text(
                    "Analysis History",
                    style = MaterialTheme.typography.headlineSmall.copy(
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onBackground
                    )
                )
                Text(
                    "$allCount saved record(s)",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            if (allCount > 0) {
                IconButton(onClick = { showClearConfirm = true }) {
                    Icon(
                        Icons.Default.Delete,
                        contentDescription = "Clear all history",
                        tint = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        }

        Spacer(Modifier.height(12.dp))

        OutlinedTextField(
            value = vm.historySearch,
            onValueChange = { vm.historySearch = it },
            modifier = Modifier.fillMaxWidth(),
            placeholder = { Text("Filter past analyses by prompt keyword…") },
            leadingIcon = {
                Icon(Icons.Default.Search, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
            },
            trailingIcon = {
                if (vm.historySearch.isNotEmpty()) {
                    IconButton(onClick = { vm.historySearch = "" }) {
                        Icon(Icons.Default.Clear, contentDescription = "Clear search", tint = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            },
            singleLine = true,
            shape = RoundedCornerShape(12.dp),
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = MaterialTheme.colorScheme.primary,
                unfocusedBorderColor = MaterialTheme.colorScheme.outline
            )
        )

        Spacer(Modifier.height(10.dp))

        LazyRow(
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            val levels = listOf(
                "ALL" to "All ($allCount)",
                "CRITICAL" to "Critical",
                "HIGH" to "High",
                "MEDIUM" to "Medium",
                "LOW" to "Low",
                "MINIMAL" to "Minimal"
            )
            items(levels) { (level, label) ->
                val selected = vm.historyRiskFilter == level
                FilterChip(
                    selected = selected,
                    onClick = { vm.historyRiskFilter = level },
                    label = { Text(label, maxLines = 1) },
                    colors = FilterChipDefaults.filterChipColors(
                        selectedContainerColor = if (level == "ALL") MaterialTheme.colorScheme.primary else riskColor(level).copy(alpha = 0.18f),
                        selectedLabelColor = if (level == "ALL") MaterialTheme.colorScheme.onPrimary else riskColor(level)
                    )
                )
            }
            item {
                Spacer(Modifier.width(4.dp))
                OutlinedButton(
                    onClick = {
                        vm.historySort = when (vm.historySort) {
                            "risk_desc" -> "coverage_asc"
                            "coverage_asc" -> "date_desc"
                            else -> "risk_desc"
                        }
                    },
                    modifier = Modifier.height(32.dp),
                    contentPadding = PaddingValues(horizontal = 8.dp),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Icon(Icons.AutoMirrored.Filled.Sort, contentDescription = null, modifier = Modifier.size(14.dp))
                    Spacer(Modifier.width(4.dp))
                    Text(
                        when (vm.historySort) {
                            "risk_desc" -> "Highest Risk"
                            "coverage_asc" -> "Lowest Completeness"
                            else -> "Newest"
                        },
                        fontSize = 12.sp
                    )
                }
            }
        }

        Spacer(Modifier.height(12.dp))

        if (items.isEmpty()) {
            Box(
                modifier = Modifier.fillMaxSize().padding(vertical = 32.dp),
                contentAlignment = Alignment.Center
            ) {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline)
                ) {
                    Column(
                        modifier = Modifier.fillMaxWidth().padding(28.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Box(
                            modifier = Modifier.size(48.dp).clip(CircleShape)
                                .background(MaterialTheme.colorScheme.surfaceVariant),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                Icons.Default.History,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.primary,
                                modifier = Modifier.size(24.dp)
                            )
                        }
                        Spacer(Modifier.height(12.dp))
                        Text(
                            if (vm.historySearch.isNotEmpty() || vm.historyRiskFilter != "ALL") "No matching analyses found"
                            else "No saved analysis history",
                            style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold)
                        )
                        Spacer(Modifier.height(4.dp))
                        Text(
                            if (vm.historySearch.isNotEmpty() || vm.historyRiskFilter != "ALL")
                                "Try adjusting your search keywords or risk severity filter."
                            else "Your past UI prompt evaluations will appear here for auditing and re-analysis.",
                            style = MaterialTheme.typography.bodySmall.copy(color = MaterialTheme.colorScheme.onSurfaceVariant),
                            textAlign = TextAlign.Center
                        )
                        Spacer(Modifier.height(16.dp))
                        Button(
                            onClick = { vm.selectedTab = com.promptlinter.app.ui.viewmodel.Tab.NEW_ANALYSIS },
                            shape = RoundedCornerShape(10.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)
                        ) { Text("Start New Analysis") }
                    }
                }
            }
        } else {
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                items(items, key = { it.id }) { item ->
                    HistoryItemCard(
                        item = item,
                        onClick = { vm.openFromHistory(item) },
                        onDelete = { vm.historyRepo.delete(item.id); refresh++ }
                    )
                }
                item { Spacer(Modifier.height(20.dp)) }
            }
        }
    }

    if (showClearConfirm) {
        AlertDialog(
            onDismissRequest = { showClearConfirm = false },
            title = { Text("Clear all history?") },
            text = { Text("This permanently removes every saved analysis record from local storage. This action cannot be undone.") },
            confirmButton = {
                Button(
                    onClick = {
                        vm.historyRepo.clear()
                        refresh++
                        showClearConfirm = false
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = LocalVectorColors.current.critical)
                ) { Text("Clear All") }
            },
            dismissButton = {
                TextButton(onClick = { showClearConfirm = false }) { Text("Cancel") }
            }
        )
    }
}

@Composable
private fun HistoryItemCard(
    item: HistoryItem,
    onClick: () -> Unit,
    onDelete: () -> Unit
) {
    val levelColor = riskColor(item.riskLevel)
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
        onClick = onClick
    ) {
        Column(Modifier.padding(14.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Surface(
                    shape = RoundedCornerShape(6.dp),
                    color = levelColor.copy(alpha = 0.15f),
                    border = BorderStroke(1.dp, levelColor.copy(alpha = 0.45f))
                ) {
                    Row(Modifier.padding(horizontal = 8.dp, vertical = 3.dp), verticalAlignment = Alignment.CenterVertically) {
                        Box(Modifier.size(8.dp).clip(CircleShape).background(levelColor))
                        Spacer(Modifier.width(6.dp))
                        Text(
                            "${item.riskLevel.lowercase().replaceFirstChar { it.uppercase() }} (${item.riskScore}/100)",
                            style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.Bold),
                            color = levelColor
                        )
                    }
                }
                IconButton(onClick = onDelete, modifier = Modifier.size(28.dp)) {
                    Icon(
                        Icons.Default.Delete,
                        contentDescription = "Delete record",
                        tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.6f),
                        modifier = Modifier.size(16.dp)
                    )
                }
            }
            Spacer(Modifier.height(8.dp))
            Text(
                item.prompt,
                style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.Medium),
                maxLines = 2,
                overflow = TextOverflow.Ellipsis
            )
            Spacer(Modifier.height(10.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    "${item.createdAt.take(10)}  •  ${item.coverageScore}% coverage",
                    style = MaterialTheme.typography.bodySmall.copy(fontSize = 11.sp),
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        "Reopen",
                        style = MaterialTheme.typography.labelMedium.copy(
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.primary
                        )
                    )
                    Spacer(Modifier.width(4.dp))
                    Icon(
                        Icons.AutoMirrored.Filled.ArrowForward,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.size(14.dp)
                    )
                }
            }
        }
    }
}

@Composable
fun riskColor(level: String): Color = when (level) {
    "CRITICAL" -> LocalVectorColors.current.critical
    "HIGH" -> LocalVectorColors.current.high
    "MEDIUM" -> LocalVectorColors.current.medium
    "MINIMAL" -> LocalVectorColors.current.minimal
    else -> LocalVectorColors.current.low
}
