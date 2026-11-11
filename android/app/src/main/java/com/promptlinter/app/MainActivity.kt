package com.promptlinter.app

import android.content.Context
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.Column
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.promptlinter.app.ui.components.PlLogo
import com.promptlinter.app.ui.screens.*
import com.promptlinter.app.ui.theme.PromptLinterTheme
import com.promptlinter.app.ui.viewmodel.MainViewModel
import com.promptlinter.app.ui.viewmodel.Tab

class MainActivity : ComponentActivity() {
    private val vm: MainViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            val ctx = LocalContext.current
            val prefs = remember { ctx.getSharedPreferences("prompt_linter", Context.MODE_PRIVATE) }
            var dark by remember { mutableStateOf(prefs.getBoolean("theme_dark", false)) }
            var showOnboarding by remember { mutableStateOf(!prefs.getBoolean("onboarding_done", false)) }

            PromptLinterTheme(darkTheme = dark) {
                if (showOnboarding) {
                    OnboardingScreen(onFinish = {
                        prefs.edit().putBoolean("onboarding_done", true).apply()
                        showOnboarding = false
                    })
                } else {
                    AppScaffold(
                        vm = vm,
                        dark = dark,
                        onDarkChange = {
                            dark = it
                            prefs.edit().putBoolean("theme_dark", it).apply()
                        },
                        onShowOnboarding = { showOnboarding = true }
                    )
                }
            }
        }
    }
}

private data class TopInfo(val title: String, val subtitle: String)

private val topInfo = mapOf(
    Tab.OVERVIEW to TopInfo("Prompt Diagnosis Overview", "Dashboard"),
    Tab.NEW_ANALYSIS to TopInfo("New UI Prompt Analysis", "UI/UX Prompt Analyzer"),
    Tab.HISTORY to TopInfo("Analysis History", "Past Evaluations"),
    Tab.GUIDELINES to TopInfo("Prompt Guidelines", "Completeness Baseline"),
    Tab.ABOUT to TopInfo("About Prompt Linter", "UI/UX Prompt Review"),
    Tab.SETTINGS to TopInfo("System Settings", "Preferences & Engine")
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AppScaffold(vm: MainViewModel, dark: Boolean, onDarkChange: (Boolean) -> Unit, onShowOnboarding: () -> Unit) {
    val info = topInfo[vm.selectedTab] ?: topInfo[Tab.OVERVIEW]!!

    BackHandler(enabled = vm.selectedTab != Tab.OVERVIEW) {
        vm.selectedTab = Tab.OVERVIEW
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        PlLogo(modifier = Modifier.size(28.dp))
                        Spacer(Modifier.width(10.dp))
                        androidx.compose.foundation.layout.Column {
                            Text(
                                info.title,
                                style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold)
                            )
                            Text(
                                info.subtitle,
                                style = MaterialTheme.typography.labelSmall.copy(
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    fontSize = 11.sp
                                )
                            )
                        }
                    }
                },
                actions = {
                    Surface(
                        shape = MaterialTheme.shapes.small,
                        color = MaterialTheme.colorScheme.primaryContainer
                    ) {
                        Text(
                            "Rules · on-device",
                            style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.Bold),
                            color = MaterialTheme.colorScheme.onPrimaryContainer,
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                        )
                    }
                    Spacer(Modifier.width(8.dp))
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.background)
            )
        },
        bottomBar = {
            NavigationBar(containerColor = MaterialTheme.colorScheme.surface, tonalElevation = 3.dp) {
                listOf(
                    Triple(Tab.OVERVIEW, "Overview", Icons.Filled.Dashboard),
                    Triple(Tab.NEW_ANALYSIS, "Analyze", Icons.Filled.EditNote),
                    Triple(Tab.HISTORY, "History", Icons.Filled.History),
                    Triple(Tab.GUIDELINES, "Guide", Icons.Filled.MenuBook),
                    Triple(Tab.ABOUT, "About", Icons.Filled.Info),
                    Triple(Tab.SETTINGS, "Settings", Icons.Filled.Settings)
                ).forEach { (tab, label, icon) ->
                    NavigationBarItem(
                        selected = vm.selectedTab == tab,
                        onClick = { vm.selectedTab = tab },
                        icon = { Icon(icon, contentDescription = label) },
                        label = { Text(label, maxLines = 1, fontSize = 10.sp) },
                        colors = NavigationBarItemDefaults.colors(
                            selectedIconColor = MaterialTheme.colorScheme.onPrimary,
                            selectedTextColor = MaterialTheme.colorScheme.primary,
                            indicatorColor = MaterialTheme.colorScheme.primary
                        )
                    )
                }
            }
        }
    ) { padding ->
        Surface(modifier = Modifier.padding(padding), color = MaterialTheme.colorScheme.background) {
            when (vm.selectedTab) {
                Tab.OVERVIEW -> OverviewScreen(vm)
                Tab.NEW_ANALYSIS -> NewAnalysisScreen(vm)
                Tab.HISTORY -> HistoryScreen(vm)
                Tab.GUIDELINES -> GuidelinesScreen()
                Tab.ABOUT -> AboutScreen(vm)
                Tab.SETTINGS -> SettingsScreen(vm, dark, onDarkChange, onShowOnboarding)
            }
        }
    }
}
