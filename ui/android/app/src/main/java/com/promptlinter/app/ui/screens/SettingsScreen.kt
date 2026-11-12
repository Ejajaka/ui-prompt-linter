package com.promptlinter.app.ui.screens

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.MenuBook
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.Info
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.promptlinter.app.ui.theme.*
import com.promptlinter.app.ui.viewmodel.DetailPage
import com.promptlinter.app.ui.viewmodel.MainViewModel

@Composable
fun SettingsScreen(
    vm: MainViewModel,
    dark: Boolean,
    onDarkChange: (Boolean) -> Unit,
    onShowOnboarding: () -> Unit = {}
) {
    val ctx = LocalContext.current
    Column(
        modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
            Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("Appearance & Theme", fontWeight = FontWeight.Bold)
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    FilterChip(selected = !dark, onClick = { onDarkChange(false) }, label = { Text("Light") })
                    FilterChip(selected = dark, onClick = { onDarkChange(true) }, label = { Text("Dark") })
                }
                Text("Both themes preserve Prompt Linter's teal and mustard accents.", color = LocalPlColors.current.textSecondary, style = MaterialTheme.typography.bodySmall)
                OutlinedButton(onClick = onShowOnboarding) { Text("Replay onboarding guide") }
            }
        }

        Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
            Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("Analysis Engine", fontWeight = FontWeight.Bold)
                Text("Active on mobile: Rules (deterministic, runs fully on-device via embedded JS engine).", fontWeight = FontWeight.SemiBold, color = LocalPlColors.current.darkTeal)
                Text("• Auto — chooses Rules, BERT or LLM from prompt features (web full engine).", style = MaterialTheme.typography.bodySmall, color = LocalPlColors.current.textSecondary)
                Text("• Rules — deterministic lexicons, regexes and heuristics (default, on-device).", style = MaterialTheme.typography.bodySmall, color = LocalPlColors.current.textSecondary)
                Text("• BERT — fine-tuned DistilBERT BIO token classifier (full engine).", style = MaterialTheme.typography.bodySmall, color = LocalPlColors.current.textSecondary)
                Text("BERT and the grounded LLM run in the full Streamlit engine. The mobile app runs the same Rules engine locally for parity and offline use.", style = MaterialTheme.typography.bodySmall, color = LocalPlColors.current.textSecondary)
                OutlinedButton(onClick = {
                    ctx.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("https://ui-prompt-linte-ecdeszwu2gpoaebpkgus3y.streamlit.app/")))
                }) { Text("Open full engine (BERT + LLM)") }
            }
        }

        Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
            Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("Local Data & Storage", fontWeight = FontWeight.Bold)
                Text("All prompt history is stored locally on this device. No data is sent to remote servers by the Rules engine.", color = LocalPlColors.current.textSecondary, style = MaterialTheme.typography.bodySmall)
                OutlinedButton(
                    onClick = { vm.historyRepo.clear() },
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = LocalPlColors.current.critical)
                ) { Text("Clear Local Storage") }
            }
        }

        Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
            Column {
                Text(
                    "Learn & Info",
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.padding(start = 14.dp, end = 14.dp, top = 14.dp, bottom = 6.dp)
                )
                NavRow(
                    icon = Icons.AutoMirrored.Filled.MenuBook,
                    title = "Prompt Guidelines",
                    subtitle = "Elements, attributes, annotation rules and risk bands",
                    onClick = { vm.openDetail(DetailPage.GUIDELINES) }
                )
                HorizontalDivider(color = LocalPlColors.current.border.copy(alpha = 0.6f))
                NavRow(
                    icon = Icons.Default.Info,
                    title = "About Prompt Linter",
                    subtitle = "What the app does and how the review works",
                    onClick = { vm.openDetail(DetailPage.ABOUT) }
                )
            }
        }
        Spacer(Modifier.height(20.dp))
    }
}

@Composable
private fun NavRow(icon: ImageVector, title: String, subtitle: String, onClick: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(horizontal = 14.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(icon, contentDescription = null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(20.dp))
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f)) {
            Text(title, fontWeight = FontWeight.SemiBold)
            Text(
                subtitle,
                style = MaterialTheme.typography.bodySmall,
                color = LocalPlColors.current.textSecondary,
                maxLines = 2
            )
        }
        Icon(
            Icons.Default.ChevronRight,
            contentDescription = null,
            tint = LocalPlColors.current.textSecondary,
            modifier = Modifier.size(20.dp)
        )
    }
}
