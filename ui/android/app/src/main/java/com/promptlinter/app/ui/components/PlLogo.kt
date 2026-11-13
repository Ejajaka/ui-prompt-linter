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
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.unit.dp
import com.promptlinter.app.ui.theme.PlBrandGreen
import com.promptlinter.app.ui.theme.PlBrandYellow

/**
 * Prompt Linter mark: a dark-green rounded tile with a bold yellow "PL"
 * monogram. Geometry is taken from the source artwork and mirrors
 * `ui/web-app/public/logo.svg`, `ui/web-app/src/components/ui/Logo.tsx` and
 * the extension icon set.
 */
@Composable
fun PlLogo(
    modifier: Modifier = Modifier.size(28.dp),
    tileColor: Color = PlBrandGreen
) {
    Canvas(modifier = modifier) {
        val w = size.width
        val h = size.height
        val s = minOf(w, h)

        drawRoundRect(
            color = tileColor,
            cornerRadius = CornerRadius(s * 0.2105f, s * 0.2105f)
        )

        val glyphStroke = Stroke(
            width = s * 0.1085f,
            cap = StrokeCap.Round,
            join = StrokeJoin.Round
        )

        // P stem.
        drawLine(
            color = PlBrandYellow,
            start = Offset(s * 0.2464f, s * 0.3429f),
            end = Offset(s * 0.2464f, s * 0.6571f),
            strokeWidth = glyphStroke.width,
            cap = StrokeCap.Round
        )

        // P bowl.
        drawCircle(
            color = PlBrandYellow,
            radius = s * 0.1396f,
            center = Offset(s * 0.3717f, s * 0.4283f)
        )
        drawRoundRect(
            color = tileColor,
            topLeft = Offset(s * 0.3006f, s * 0.3804f),
            size = Size(s * 0.0996f, s * 0.0933f),
            cornerRadius = CornerRadius(s * 0.0335f, s * 0.0335f)
        )

        // L stem and foot.
        val lStroke = Stroke(
            width = s * 0.1157f,
            cap = StrokeCap.Round,
            join = StrokeJoin.Round
        )
        val lPath = Path().apply {
            moveTo(s * 0.5929f, s * 0.3466f)
            lineTo(s * 0.5929f, s * 0.6516f)
            lineTo(s * 0.7601f, s * 0.6516f)
        }
        drawPath(path = lPath, color = PlBrandYellow, style = lStroke)
    }
}
