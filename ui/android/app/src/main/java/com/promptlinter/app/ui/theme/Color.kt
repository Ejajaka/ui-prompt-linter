package com.promptlinter.app.ui.theme

import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color

// Brand mark colours - constant across light/dark (used by the logo tile).
val PlBrandGreen = Color(0xFF185345)
val PlBrandYellow = Color(0xFFFAD237)

/**
 * Semantic palette for the whole app. Mirrors `frontend/src/index.css` so the
 * Android app, web app and extension share the exact same light/dark tokens.
 */
data class PlColors(
    val background: Color,
    val card: Color,
    val subtle: Color,
    val hover: Color,
    val teal: Color,
    val darkTeal: Color,
    val mustard: Color,
    val mustardHover: Color,
    val softGreen: Color,
    val softGreenText: Color,
    val textMain: Color,
    val textSecondary: Color,
    val border: Color,
    val borderStrong: Color,
    val critical: Color,
    val high: Color,
    val medium: Color,
    val low: Color,
    val minimal: Color,
    val warningText: Color,
    val warningBg: Color,
)

val LightPlColors = PlColors(
    background = Color(0xFFF6F4EC),
    card = Color(0xFFFFFFFF),
    subtle = Color(0xFFFAFAF8),
    hover = Color(0xFFF0EDE3),
    teal = Color(0xFF49686C),
    darkTeal = Color(0xFF30494B),
    mustard = Color(0xFFD1B653),
    mustardHover = Color(0xFFBDA241),
    softGreen = Color(0xFFE4EBDD),
    softGreenText = Color(0xFF2D5A27),
    textMain = Color(0xFF283638),
    textSecondary = Color(0xFF737A72),
    border = Color(0xFFE5E2D8),
    borderStrong = Color(0xFFCDC9BC),
    critical = Color(0xFFB94D42),
    high = Color(0xFFC05621),
    medium = Color(0xFF9E7D1B),
    low = Color(0xFF2E6F40),
    minimal = Color(0xFF49686C),
    warningText = Color(0xFF856C16),
    warningBg = Color(0xFFFEFCE8),
)

val DarkPlColors = PlColors(
    background = Color(0xFF141C1E),
    card = Color(0xFF1D282A),
    subtle = Color(0xFF182123),
    hover = Color(0xFF263538),
    teal = Color(0xFF6F999D),
    darkTeal = Color(0xFF49686C),
    mustard = Color(0xFFE2C969),
    mustardHover = Color(0xFFD1B653),
    softGreen = Color(0xFF33463E),
    softGreenText = Color(0xFF8AE07E),
    textMain = Color(0xFFF4F6F4),
    textSecondary = Color(0xFFA6AEA8),
    border = Color(0xFF2E3E42),
    borderStrong = Color(0xFF3B4B4F),
    critical = Color(0xFFE57368),
    high = Color(0xFFED8936),
    medium = Color(0xFFECC94B),
    low = Color(0xFF68D391),
    minimal = Color(0xFF6F999D),
    warningText = Color(0xFFE2C969),
    warningBg = Color(0xFF33301E),
)

val LocalPlColors = staticCompositionLocalOf { LightPlColors }
