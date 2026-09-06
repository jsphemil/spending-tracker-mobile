package expo.modules.widgetbridge

import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.RectF

// The widget's single defining visual: one horizontal bar representing
// 100% of monthly inflow, with outflow drawn as the filled portion.
// Drawn as a size-aware bitmap (same technique as the Quick Add widget's
// triangle) rather than fought out of Glance's fillMaxWidth/weight
// primitives, since the fill's width has to be an exact fraction of the
// track's actual pixel width, which Glance has no fractional-width
// modifier for.
//
// outflowFraction is not pre-clamped by the caller -- >1 (spending more
// than came in) is a real, expected state, not an error. This function
// clamps the drawn fill to the track's own width (never paints past it)
// but the caller is responsible for showing the true percentage as text.
internal fun drawCashFlowBar(widthPx: Int, heightPx: Int, outflowFraction: Float, overrun: Boolean): Bitmap {
  val w = widthPx.coerceAtLeast(1)
  val h = heightPx.coerceAtLeast(1)
  val bitmap = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888)
  val canvas = Canvas(bitmap)
  val cornerRadius = h / 2f

  val trackPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.argb(255, 0x24, 0x2A, 0x3D) }
  canvas.drawRoundRect(RectF(0f, 0f, w.toFloat(), h.toFloat()), cornerRadius, cornerRadius, trackPaint)

  val clampedFraction = outflowFraction.coerceIn(0f, 1f)
  if (clampedFraction <= 0f) return bitmap

  val fillPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
    color = if (overrun) Color.argb(255, 0xE2, 0x4B, 0x4A) else Color.argb(255, 0x48, 0xE7, 0xF5)
  }
  val fillWidth = w * clampedFraction
  // Clip to the fill width, then draw a rounded rect shaped exactly like
  // the track (same bounds, same corner radius). The clip leaves the
  // left end's curve intact (it's within the clipped region) while
  // cutting the right end flat at the true fill boundary -- simpler and
  // more robust than hand-computing a "rounded-left, square-right" path.
  canvas.save()
  canvas.clipRect(0f, 0f, fillWidth, h.toFloat())
  canvas.drawRoundRect(RectF(0f, 0f, w.toFloat(), h.toFloat()), cornerRadius, cornerRadius, fillPaint)
  canvas.restore()

  return bitmap
}
