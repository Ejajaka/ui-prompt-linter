package com.promptlinter.app.ui.screens

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.promptlinter.app.ui.theme.*
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
        Text("System Settings", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
        Text("Theme, engine information and local data for Prompt Linter.", color = PlSecondaryText, style = MaterialTheme.typography.bodySmall)

        Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
            Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("Appearance & Theme", fontWeight = FontWeight.Bold)
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    FilterChip(selected = !dark, onClick = { onDarkChange(false) }, label = { Text("Light") })
                    FilterChip(selected = dark, onClick = { onDarkChange(true) }, label = { Text("Dark") })
                }
                Text("Both themes preserve Prompt Linter's teal and mustard accents.", color = PlSecondaryText, style = MaterialTheme.typography.bodySmall)
                OutlinedButton(onClick = onShowOnboarding) { Text("Replay onboarding guide") }
            }
        }

        Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
            Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("Analysis Engine", fontWeight = FontWeight.Bold)
                Text("Active on mobile: Rules (deterministic, runs fully on-device via embedded JS engine).", fontWeight = FontWeight.SemiBold, color = PlDarkTeal)
                Text("• Auto — chooses Rules, BERT or LLM from prompt features (web full engine).", style = MaterialTheme.typography.bodySmall, color = PlSecondaryText)
                Text("• Rules — deterministic lexicons, regexes and heuristics (default, on-device).", style = MaterialTheme.typography.bodySmall, color = PlSecondaryText)
                Text("• BERT — fine-tuned DistilBERT BIO token classifier (full engine).", style = MaterialTheme.typography.bodySmall, color = PlSecondaryText)
                Text("BERT and the grounded LLM run in the full Streamlit engine. The mobile app runs the same Rules engine locally for parity and offline use.", style = MaterialTheme.typography.bodySmall, color = PlSecondaryText)
                OutlinedButton(onClick = {
                    ctx.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("https://ui-prompt-linte-ecdeszwu2gpoaebpkgus3y.streamlit.app/")))
                }) { Text("Open full engine (BERT + LLM)") }
            }
        }

        Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
            Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("Local Data & Storage", fontWeight = FontWeight.Bold)
                Text("All prompt history is stored locally on this device. No data is sent to remote servers by the Rules engine.", color = PlSecondaryText, style = MaterialTheme.typography.bodySmall)
                OutlinedButton(
                    onClick = { vm.historyRepo.clear() },
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = PlCritical)
                ) { Text("Clear Local Storage") }
            }
        }

        Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
            Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Text("About Prompt Linter", fontWeight = FontWeight.Bold)
                InfoRow("Application", "Prompt Linter — UI/UX Prompt Review")
                InfoRow("Version", "v1.0 (Android)")
                InfoRow("Engine Type", "Rules (on-device) · BERT+LLM via full engine")
                InfoRow("Execution", "Deterministic JS Rules engine embedded locally")
            }
        }
        Spacer(Modifier.height(20.dp))
    }
}

@Composable private fun InfoRow(label: String, value: String) {
    Column {
        Text(label, color = PlSecondaryText, style = MaterialTheme.typography.labelSmall)
        Text(value, fontWeight = FontWeight.SemiBold)
    }
}
