package com.promptlinter.app.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.graphics.Color

private val LightColors = lightColorScheme(
    primary = LightPlColors.teal,
    onPrimary = Color.White,
    primaryContainer = LightPlColors.softGreen,
    onPrimaryContainer = LightPlColors.darkTeal,
    secondary = LightPlColors.mustard,
    onSecondary = LightPlColors.darkTeal,
    secondaryContainer = LightPlColors.softGreen,
    onSecondaryContainer = LightPlColors.darkTeal,
    tertiary = LightPlColors.high,
    onTertiary = Color.White,
    background = LightPlColors.background,
    onBackground = LightPlColors.textMain,
    surface = LightPlColors.card,
    onSurface = LightPlColors.textMain,
    surfaceVariant = Color(0xFFEFECE2),
    onSurfaceVariant = LightPlColors.textSecondary,
    outline = LightPlColors.border,
    outlineVariant = LightPlColors.border,
    error = LightPlColors.critical,
    onError = Color.White,
)

private val DarkColors = darkColorScheme(
    primary = DarkPlColors.teal,
    onPrimary = Color(0xFF0E1617),
    primaryContainer = Color(0xFF26383A),
    onPrimaryContainer = DarkPlColors.textMain,
    secondary = DarkPlColors.mustard,
    onSecondary = Color(0xFF241F0A),
    secondaryContainer = Color(0xFF2A2B1C),
    onSecondaryContainer = DarkPlColors.mustard,
    tertiary = DarkPlColors.high,
    onTertiary = Color(0xFF24130A),
    background = DarkPlColors.background,
    onBackground = DarkPlColors.textMain,
    surface = DarkPlColors.card,
    onSurface = DarkPlColors.textMain,
    surfaceVariant = Color(0xFF243234),
    onSurfaceVariant = DarkPlColors.textSecondary,
    outline = DarkPlColors.border,
    outlineVariant = DarkPlColors.borderStrong,
    error = DarkPlColors.critical,
    onError = Color(0xFF2A0E0B),
)

@Composable
fun PromptLinterTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val colors = if (darkTheme) DarkPlColors else LightPlColors
    CompositionLocalProvider(LocalPlColors provides colors) {
        MaterialTheme(
            colorScheme = if (darkTheme) DarkColors else LightColors,
            content = content
        )
    }
}
