package expo.modules.widgetbridge

import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Path
import android.graphics.PointF
import kotlin.math.hypot
import kotlin.math.min

// Draws the Quick Add widget's smooth-cornered triangle as a bitmap sized
// to the widget's actual allocated pixels, not a static asset -- so it
// stays crisp and correctly proportioned at any launcher-chosen size,
// matching the app's translucent dark-glass surface tone (same values
// AccountsGlanceWidget.kt's widgetColors() uses for its card).
internal fun drawRoundedTriangle(widthPx: Int, heightPx: Int): Bitmap {
  val bitmap = Bitmap.createBitmap(widthPx.coerceAtLeast(1), heightPx.coerceAtLeast(1), Bitmap.Config.ARGB_8888)
  val canvas = Canvas(bitmap)

  val marginX = widthPx * 0.05f
  val marginTop = heightPx * 0.07f
  val marginBottom = heightPx * 0.05f
  val apex = PointF(widthPx / 2f, marginTop)
  val bottomLeft = PointF(marginX, heightPx - marginBottom)
  val bottomRight = PointF(widthPx - marginX, heightPx - marginBottom)
  val cornerRadius = min(widthPx, heightPx) * 0.16f

  val path = roundedPolygonPath(listOf(apex, bottomLeft, bottomRight), cornerRadius)

  val fillPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
    style = Paint.Style.FILL
    color = Color.argb(235, 12, 17, 32)
  }
  val borderPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
    style = Paint.Style.STROKE
    strokeWidth = (min(widthPx, heightPx) * 0.008f).coerceAtLeast(1.5f)
    color = Color.argb(255, 31, 36, 50)
  }
  canvas.drawPath(path, fillPaint)
  canvas.drawPath(path, borderPaint)
  return bitmap
}

// Generic corner-rounding for a convex polygon: at each vertex, pull back
// `radius` pixels along both adjacent edges, straight-line to the first
// pullback point, then a quadratic curve to the second one using the
// original vertex as the control point. Works for any polygon (not just
// triangles) and degrades gracefully -- pullback is clamped to at most
// half an edge's length, so a very small widget never produces a
// self-intersecting or inverted path.
internal fun roundedPolygonPath(points: List<PointF>, radius: Float): Path {
  val path = Path()
  val n = points.size

  fun pulledBackToward(from: PointF, toward: PointF, distance: Float): PointF {
    val dx = toward.x - from.x
    val dy = toward.y - from.y
    val len = hypot(dx, dy)
    if (len <= 0f) return from
    val t = (distance / len).coerceIn(0f, 0.5f)
    return PointF(from.x + dx * t, from.y + dy * t)
  }

  for (i in 0 until n) {
    val prev = points[(i - 1 + n) % n]
    val curr = points[i]
    val next = points[(i + 1) % n]
    val start = pulledBackToward(curr, prev, radius)
    val end = pulledBackToward(curr, next, radius)
    if (i == 0) path.moveTo(start.x, start.y) else path.lineTo(start.x, start.y)
    path.quadTo(curr.x, curr.y, end.x, end.y)
  }
  path.close()
  return path
}
