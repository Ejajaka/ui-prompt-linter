package com.promptlinter.app

import android.content.Context
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.core.view.WindowCompat
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Analytics
import androidx.compose.material.icons.filled.History
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.promptlinter.app.ui.components.VectorLogo
import com.promptlinter.app.ui.screens.*
import com.promptlinter.app.ui.theme.VectorTheme
import com.promptlinter.app.ui.viewmodel.DetailPage
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

            // Keep the system bar icons legible against the current in-app theme,
            // since the app's dark mode is controlled here rather than by the system.
            SideEffect {
                val activity = ctx as? android.app.Activity ?: return@SideEffect
                val insets = WindowCompat.getInsetsController(activity.window, activity.window.decorView)
                insets.isAppearanceLightStatusBars = !dark
                insets.isAppearanceLightNavigationBars = !dark
            }

            VectorTheme(darkTheme = dark) {
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

private val tabTitles = mapOf(
    Tab.OVERVIEW to "Overview",
    Tab.NEW_ANALYSIS to "New Analysis",
    Tab.HISTORY to "History",
    Tab.SETTINGS to "Settings"
)

private val tabSubtitles = mapOf(
    Tab.OVERVIEW to "Prompt completeness dashboard",
    Tab.NEW_ANALYSIS to "Pre-generation UI prompt review",
    Tab.HISTORY to "Saved prompt evaluations",
    Tab.SETTINGS to "Engine, appearance & local data"
)

private val detailTitles = mapOf(
    DetailPage.ABOUT to "About Vector",
    DetailPage.GUIDELINES to "Prompt Guidelines"
)

private val detailSubtitles = mapOf(
    DetailPage.ABOUT to "Product overview & responsible use",
    DetailPage.GUIDELINES to "Elements, attributes & risk bands"
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AppScaffold(vm: MainViewModel, dark: Boolean, onDarkChange: (Boolean) -> Unit, onShowOnboarding: () -> Unit) {
    val title = vm.detailPage?.let { detailTitles[it] } ?: tabTitles[vm.selectedTab] ?: "Overview"
    val subtitle = vm.detailPage?.let { detailSubtitles[it] } ?: tabSubtitles[vm.selectedTab]

    BackHandler(enabled = vm.detailPage != null || vm.selectedTab != Tab.OVERVIEW) {
        if (vm.detailPage != null) vm.closeDetail() else vm.selectedTab = Tab.OVERVIEW
    }

    Scaffold(
        topBar = {
            TopAppBar(
                navigationIcon = {
                    if (vm.detailPage != null) {
                        IconButton(onClick = { vm.closeDetail() }) {
                            Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                        }
                    }
                },
                title = {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        if (vm.detailPage == null) {
                            VectorLogo(modifier = Modifier.size(28.dp))
                            Spacer(Modifier.width(10.dp))
                        }
                        Column {
                            Text(
                                title,
                                style = MaterialTheme.typography.titleLarge.copy(
                                    fontWeight = FontWeight.Bold,
                                    color = MaterialTheme.colorScheme.onBackground
                                ),
                                maxLines = 1
                            )
                            if (subtitle != null) {
                                Text(
                                    subtitle,
                                    style = MaterialTheme.typography.bodySmall.copy(
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                        fontSize = 11.sp
                                    ),
                                    maxLines = 1
                                )
                            }
                        }
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.background
                )
            )
        },
        bottomBar = {
            NavigationBar(containerColor = MaterialTheme.colorScheme.surface, tonalElevation = 3.dp) {
                listOf(
                    Triple(Tab.OVERVIEW, "Overview", Icons.Filled.Home),
                    Triple(Tab.NEW_ANALYSIS, "Analyze", Icons.Filled.Analytics),
                    Triple(Tab.HISTORY, "History", Icons.Filled.History),
                    Triple(Tab.SETTINGS, "Settings", Icons.Filled.Settings)
                ).forEach { (tab, label, icon) ->
                    NavigationBarItem(
                        selected = vm.detailPage == null && vm.selectedTab == tab,
                        onClick = {
                            vm.detailPage = null
                            vm.selectedTab = tab
                        },
                        icon = { Icon(icon, contentDescription = label) },
                        label = { Text(label, maxLines = 1) },
                        colors = NavigationBarItemDefaults.colors(
                            selectedIconColor = MaterialTheme.colorScheme.onPrimary,
                            selectedTextColor = MaterialTheme.colorScheme.primary,
                            indicatorColor = MaterialTheme.colorScheme.primary,
                            unselectedIconColor = MaterialTheme.colorScheme.onSurfaceVariant,
                            unselectedTextColor = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    )
                }
            }
        }
    ) { padding ->
        Surface(modifier = Modifier.padding(padding), color = MaterialTheme.colorScheme.background) {
            when {
                vm.detailPage == DetailPage.ABOUT -> AboutScreen(vm)
                vm.detailPage == DetailPage.GUIDELINES -> GuidelinesScreen()
                else -> when (vm.selectedTab) {
                    Tab.OVERVIEW -> OverviewScreen(vm)
                    Tab.NEW_ANALYSIS -> NewAnalysisScreen(vm)
                    Tab.HISTORY -> HistoryScreen(vm)
                    Tab.SETTINGS -> SettingsScreen(vm, dark, onDarkChange, onShowOnboarding)
                }
            }
        }
    }
}
