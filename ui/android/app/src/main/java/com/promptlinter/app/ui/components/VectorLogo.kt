package com.promptlinter.app.ui.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.unit.dp
import com.promptlinter.app.ui.theme.VectorBrandGreen
import com.promptlinter.app.ui.theme.VectorBrandYellow

/**
 * Vector mark: a dark-green rounded tile with the bold yellow "V" monogram.
 * Geometry mirrors `ui/web-app/public/logo.svg`, `Logo.tsx` and the extension
 * icon set.
 */
@Composable
fun VectorLogo(
    modifier: Modifier = Modifier.size(28.dp),
    tileColor: Color = VectorBrandGreen
) {
    Canvas(modifier = modifier) {
        val s = minOf(size.width, size.height)

        drawRoundRect(
            color = tileColor,
            cornerRadius = CornerRadius(s * 0.2105f, s * 0.2105f)
        )

        val vPath = Path().apply {
            moveTo(s * 0.2729f, s * 0.2375f)
            lineTo(s * 0.5000f, s * 0.7542f)
            lineTo(s * 0.7271f, s * 0.2375f)
        }
        drawPath(
            path = vPath,
            color = VectorBrandYellow,
            style = Stroke(
                width = s * 0.1542f,
                cap = StrokeCap.Round,
                join = StrokeJoin.Round
            )
        )
    }
}

/**
 * V-only mark used as a background watermark (no tile).
 */
@Composable
fun VectorVMark(
    modifier: Modifier = Modifier,
    color: Color = VectorBrandYellow
) {
    Canvas(modifier = modifier) {
        val s = minOf(size.width, size.height)

        val vPath = Path().apply {
            moveTo(s * 0.2729f, s * 0.2375f)
            lineTo(s * 0.5000f, s * 0.7542f)
            lineTo(s * 0.7271f, s * 0.2375f)
        }
        drawPath(
            path = vPath,
            color = color,
            style = Stroke(
                width = s * 0.1542f,
                cap = StrokeCap.Round,
                join = StrokeJoin.Round
            )
        )
    }
}
