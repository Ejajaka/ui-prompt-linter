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
    secondaryContainer = Color(0xFFFBF8EE),
    onSecondaryContainer = LightPlColors.textMain,
    tertiary = LightPlColors.high,
    onTertiary = Color.White,
    background = LightPlColors.background,
    onBackground = LightPlColors.textMain,
    surface = LightPlColors.card,
    onSurface = LightPlColors.textMain,
    surfaceVariant = Color(0xFFEFECE2),
    onSurfaceVariant = LightPlColors.textSecondary,
    outline = LightPlColors.border,
    outlineVariant = Color(0xFFECE9DF),
    error = LightPlColors.critical,
    onError = Color.White,
)

private val DarkColors = darkColorScheme(
    primary = DarkPlColors.teal,
    onPrimary = Color(0xFF0E1617),
    primaryContainer = DarkPlColors.darkTeal,
    onPrimaryContainer = Color(0xFFE6EFE6),
    secondary = DarkPlColors.mustard,
    onSecondary = Color(0xFF241F0A),
    secondaryContainer = Color(0xFF33301E),
    onSecondaryContainer = Color(0xFFF9ECA8),
    tertiary = DarkPlColors.mustard,
    onTertiary = DarkPlColors.background,
    background = DarkPlColors.background,
    onBackground = DarkPlColors.textMain,
    surface = DarkPlColors.card,
    onSurface = DarkPlColors.textMain,
    surfaceVariant = Color(0xFF263538),
    onSurfaceVariant = DarkPlColors.textSecondary,
    outline = DarkPlColors.border,
    outlineVariant = Color(0xFF3B4B4F),
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
            typography = Typography,
            content = content
        )
    }
}
