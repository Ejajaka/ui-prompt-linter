package com.promptlinter.app.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val LightColors = lightColorScheme(
    primary = PlPrimaryTeal,
    onPrimary = Color.White,
    primaryContainer = PlSoftGreen,
    onPrimaryContainer = PlDarkTeal,
    secondary = PlMustard,
    onSecondary = PlDarkTeal,
    background = PlBackground,
    onBackground = PlPrimaryText,
    surface = PlCard,
    onSurface = PlPrimaryText,
    surfaceVariant = Color(0xFFEFECE2),
    onSurfaceVariant = PlSecondaryText,
    outline = PlBorder,
    error = PlCritical,
    onError = Color.White
)

private val DarkColors = darkColorScheme(
    primary = PlDarkPrimaryTeal,
    onPrimary = PlDarkBackground,
    primaryContainer = PlDarkSurfaceVariant,
    onPrimaryContainer = PlDarkText,
    secondary = PlDarkMedium,
    onSecondary = PlDarkBackground,
    background = PlDarkBackground,
    onBackground = PlDarkText,
    surface = PlDarkSurface,
    onSurface = PlDarkText,
    surfaceVariant = PlDarkSurfaceVariant,
    onSurfaceVariant = PlDarkSecondaryText,
    outline = PlDarkBorder,
    error = PlDarkCritical,
    onError = PlDarkBackground
)

@Composable
fun PromptLinterTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    MaterialTheme(
        colorScheme = if (darkTheme) DarkColors else LightColors,
        content = content
    )
}
