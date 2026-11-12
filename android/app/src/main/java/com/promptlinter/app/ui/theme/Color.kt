package com.promptlinter.app.ui.theme

import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color

// Brand mark colours — constant across light/dark (used by the logo tile).
val PlBrandTeal = Color(0xFF49686C)
val PlBrandMustard = Color(0xFFD1B653)

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
    high = Color(0xFFC96839),
    medium = Color(0xFFD1B653),
    low = Color(0xFF688E5E),
    minimal = Color(0xFF49686C),
    warningText = Color(0xFF856C16),
    warningBg = Color(0xFFFEFCE8),
)

val DarkPlColors = PlColors(
    background = Color(0xFF131A1B),
    card = Color(0xFF1B2426),
    subtle = Color(0xFF172022),
    hover = Color(0xFF222E30),
    teal = Color(0xFF5A8084),
    darkTeal = Color(0xFF3B575A),
    mustard = Color(0xFFE2C768),
    mustardHover = Color(0xFFD1B653),
    softGreen = Color(0xFF1F2D21),
    softGreenText = Color(0xFF8AE07E),
    textMain = Color(0xFFF2F5F3),
    textSecondary = Color(0xFF9AA6A2),
    border = Color(0xFF29383A),
    borderStrong = Color(0xFF384C4F),
    critical = Color(0xFFDE5B50),
    high = Color(0xFFDE7B4A),
    medium = Color(0xFFE2C768),
    low = Color(0xFF7BB071),
    minimal = Color(0xFF5A8084),
    warningText = Color(0xFFE2C768),
    warningBg = Color(0xFF2D2A17),
)

val LocalPlColors = staticCompositionLocalOf { LightPlColors }
