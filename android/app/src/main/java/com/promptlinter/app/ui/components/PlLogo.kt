package com.promptlinter.app.ui.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.unit.dp
import com.promptlinter.app.ui.theme.PlBrandMustard
import com.promptlinter.app.ui.theme.PlBrandTeal

/**
 * Prompt Linter mark: a teal tile with a white outline chat bubble and a
 * mustard checkmark. Mirrors frontend/src/components/ui/Logo.tsx and the
 * store icon used by the web app and extension.
 */
@Composable
fun PlLogo(
    modifier: Modifier = Modifier.size(28.dp),
    tileColor: Color = PlBrandTeal
) {
    Canvas(modifier = modifier) {
        val w = size.width
        val h = size.height
        drawRoundRect(
            color = tileColor,
            cornerRadius = CornerRadius(w * 0.22f, h * 0.22f)
        )

        val stroke = w * 0.055f
        val left = w * 0.16f
        val top = h * 0.14f
        val right = w * 0.84f
        val bottom = h * 0.62f
        val radius = w * 0.10f

        // bubble outline
        drawRoundRect(
            color = Color.White,
            topLeft = Offset(left, top),
            size = Size(right - left, bottom - top),
            cornerRadius = CornerRadius(radius, radius)
        )
        val tail = Path().apply {
            moveTo(w * 0.40f, bottom)
            lineTo(w * 0.20f, h * 0.80f)
            lineTo(w * 0.20f, bottom)
            close()
        }
        drawPath(tail, Color.White)

        // bubble interior
        drawRoundRect(
            color = tileColor,
            topLeft = Offset(left + stroke, top + stroke),
            size = Size(right - left - stroke * 2, bottom - top - stroke * 2),
            cornerRadius = CornerRadius((radius - stroke).coerceAtLeast(1f), (radius - stroke).coerceAtLeast(1f))
        )
        val innerTail = Path().apply {
            moveTo(w * 0.40f - stroke, bottom - stroke)
            lineTo(w * 0.20f + stroke, h * 0.80f - stroke)
            lineTo(w * 0.20f + stroke, bottom - stroke)
            close()
        }
        drawPath(innerTail, tileColor)

        // checkmark
        val lw = w * 0.07f
        drawLine(
            color = PlBrandMustard,
            start = Offset(w * 0.36f, h * 0.40f),
            end = Offset(w * 0.46f, h * 0.50f),
            strokeWidth = lw,
            cap = StrokeCap.Round
        )
        drawLine(
            color = PlBrandMustard,
            start = Offset(w * 0.46f, h * 0.50f),
            end = Offset(w * 0.64f, h * 0.32f),
            strokeWidth = lw,
            cap = StrokeCap.Round
        )
    }
}
