package com.promptlinter.app.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.graphics.Color

private val LightColors = lightColorScheme(
    primary = LightVectorColors.teal,
    onPrimary = Color.White,
    primaryContainer = LightVectorColors.softGreen,
    onPrimaryContainer = LightVectorColors.darkTeal,
    secondary = LightVectorColors.mustard,
    onSecondary = LightVectorColors.darkTeal,
    secondaryContainer = Color(0xFFFBF8EE),
    onSecondaryContainer = LightVectorColors.textMain,
    tertiary = LightVectorColors.high,
    onTertiary = Color.White,
    background = LightVectorColors.background,
    onBackground = LightVectorColors.textMain,
    surface = LightVectorColors.card,
    onSurface = LightVectorColors.textMain,
    surfaceVariant = Color(0xFFEFECE2),
    onSurfaceVariant = LightVectorColors.textSecondary,
    outline = LightVectorColors.border,
    outlineVariant = Color(0xFFECE9DF),
    error = LightVectorColors.critical,
    onError = Color.White,
)

private val DarkColors = darkColorScheme(
    primary = DarkVectorColors.teal,
    onPrimary = Color(0xFF0E1617),
    primaryContainer = DarkVectorColors.darkTeal,
    onPrimaryContainer = Color(0xFFE6EFE6),
    secondary = DarkVectorColors.mustard,
    onSecondary = Color(0xFF241F0A),
    secondaryContainer = Color(0xFF33301E),
    onSecondaryContainer = Color(0xFFF9ECA8),
    tertiary = DarkVectorColors.mustard,
    onTertiary = DarkVectorColors.background,
    background = DarkVectorColors.background,
    onBackground = DarkVectorColors.textMain,
    surface = DarkVectorColors.card,
    onSurface = DarkVectorColors.textMain,
    surfaceVariant = Color(0xFF263538),
    onSurfaceVariant = DarkVectorColors.textSecondary,
    outline = DarkVectorColors.border,
    outlineVariant = Color(0xFF3B4B4F),
    error = DarkVectorColors.critical,
    onError = Color(0xFF2A0E0B),
)

@Composable
fun VectorTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val colors = if (darkTheme) DarkVectorColors else LightVectorColors
    CompositionLocalProvider(LocalVectorColors provides colors) {
        MaterialTheme(
            colorScheme = if (darkTheme) DarkColors else LightColors,
            typography = Typography,
            content = content
        )
    }
}
