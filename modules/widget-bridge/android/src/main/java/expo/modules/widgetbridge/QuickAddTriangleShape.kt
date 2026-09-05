package expo.modules.widgetbridge

import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.LinearGradient
import android.graphics.Paint
import android.graphics.Path
import android.graphics.RadialGradient
import android.graphics.RectF
import android.graphics.Shader

// Faithful transcription of the finalized Figma export
// ("01 - Master 2x2 - 320x320.svg", supplied 2026-09-05) -- exact
// cubic-bezier petal paths, real gradient stops, badge circles and
// icon strokes, all defined in the SVG's own 320x320 coordinate space
// and scaled onto the widget's actual allocated size with a single
// canvas.scale() at draw time. Because the gradients below are defined
// in that same pre-scale space, they land correctly under the scale
// too -- Android's Shader sampling respects the canvas's active
// transform.
//
// Two deliberate departures from the source SVG, both noted to the
// user before implementing:
//  - The three badge circles are drawn as real circles (drawCircle),
//    not the SVG's own bezier-approximated circles -- visually
//    identical, meaningfully simpler.
//  - The three word labels ("Expense"/"Income"/"Transfer") are
//    Figma-flattened vector glyph outlines in the SVG; they are
//    rendered here as real Glance Text instead (see
//    QuickAddGlanceWidget.kt), not transcribed path-for-path -- this
//    matches how every other label in this app (including the
//    existing widget) is real text, never a baked glyph.

private const val SOURCE_SIZE = 320f

private val EXPENSE_BADGE = Color.argb(245, 0xB5, 0x2F, 0x36)
private val INCOME_BADGE = Color.argb(245, 0x07, 0x8A, 0x4C)
private val TRANSFER_BADGE = Color.argb(245, 0x0B, 0x55, 0xB6)

// Fractions of the 320-unit source square, reused by
// QuickAddGlanceWidget.kt to position the matching clickable regions
// and labels on top of this bitmap without hand-tuning two separate
// sets of numbers.
internal const val HUB_LEFT_FRAC = 117f / SOURCE_SIZE
internal const val HUB_TOP_FRAC = 144f / SOURCE_SIZE
internal const val HUB_SIZE_FRAC = 86f / SOURCE_SIZE
internal const val TOP_REGION_HEIGHT_FRAC = 144f / SOURCE_SIZE
internal const val EXPENSE_LABEL_BOTTOM_PAD_FRAC = 23f / SOURCE_SIZE
internal const val INCOME_TRANSFER_LABEL_BOTTOM_PAD_FRAC = 40f / SOURCE_SIZE

internal fun drawQuickAddComposition(sizePx: Int): Bitmap {
  val size = sizePx.coerceAtLeast(1)
  val bitmap = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
  val canvas = Canvas(bitmap)
  val scale = size / SOURCE_SIZE
  canvas.scale(scale, scale)

  drawExpensePetal(canvas)
  drawIncomePetal(canvas)
  drawTransferPetal(canvas)
  drawBadgesAndIcons(canvas)
  drawHub(canvas)

  return bitmap
}

private fun drawExpensePetal(canvas: Canvas) {
  val path = Path().apply {
    moveTo(158.5f, 18f)
    cubicTo(130.785f, 18f, 111.978f, 33.9886f, 98.1205f, 57.9716f)
    lineTo(36.7512f, 168.893f)
    cubicTo(28.8326f, 182.883f, 30.8122f, 197.872f, 42.6901f, 207.865f)
    cubicTo(54.5681f, 218.857f, 71.3951f, 216.859f, 86.2426f, 203.868f)
    cubicTo(107.029f, 185.881f, 127.815f, 176.887f, 158.5f, 176.887f)
    cubicTo(189.185f, 176.887f, 209.971f, 185.881f, 230.757f, 203.868f)
    cubicTo(245.605f, 216.859f, 262.432f, 218.857f, 274.31f, 207.865f)
    cubicTo(286.188f, 197.872f, 288.167f, 182.883f, 280.249f, 168.893f)
    lineTo(218.879f, 57.9716f)
    cubicTo(205.022f, 33.9886f, 186.215f, 18f, 158.5f, 18f)
    close()
  }
  val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
    shader = LinearGradient(
      158.5f, 18f, 158.5f, 179.885f,
      Color.parseColor("#FF7775"), Color.parseColor("#E94E57"),
      Shader.TileMode.CLAMP,
    )
  }
  canvas.drawPath(path, paint)
}

private fun drawIncomePetal(canvas: Canvas) {
  val path = Path().apply {
    moveTo(34.085f, 168.956f)
    lineTo(17.3483f, 206.97f)
    cubicTo(10.3013f, 222.976f, 12.0631f, 243.983f, 20.8719f, 257.988f)
    cubicTo(32.3233f, 276.995f, 51.7026f, 289.999f, 74.6055f, 292f)
    lineTo(191.763f, 292f)
    cubicTo(208.499f, 292f, 220.832f, 282.997f, 226.998f, 269.992f)
    cubicTo(233.164f, 255.987f, 229.64f, 238.981f, 218.189f, 225.977f)
    cubicTo(200.571f, 204.969f, 181.192f, 189.964f, 158.289f, 179.96f)
    cubicTo(139.791f, 171.957f, 124.816f, 165.955f, 106.317f, 155.952f)
    cubicTo(91.3422f, 147.949f, 81.6525f, 138.946f, 74.6055f, 127.942f)
    cubicTo(70.2011f, 120.939f, 64.9158f, 119.939f, 59.6306f, 125.941f)
    cubicTo(50.8218f, 136.945f, 42.013f, 152.951f, 34.085f, 168.956f)
    close()
  }
  val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
    shader = LinearGradient(
      63.1541f, 129.943f, 168.35f, 280.007f,
      Color.parseColor("#64E79A"), Color.parseColor("#20BD70"),
      Shader.TileMode.CLAMP,
    )
  }
  canvas.drawPath(path, paint)
}

private fun drawTransferPetal(canvas: Canvas) {
  val path = Path().apply {
    moveTo(283.551f, 176.47f)
    lineTo(295.814f, 212.471f)
    cubicTo(300.977f, 227.63f, 299.687f, 247.525f, 293.232f, 260.789f)
    cubicTo(284.841f, 278.789f, 270.642f, 291.105f, 253.86f, 293f)
    lineTo(168.017f, 293f)
    cubicTo(155.754f, 293f, 146.718f, 284.473f, 142.2f, 272.157f)
    cubicTo(137.682f, 258.894f, 140.264f, 242.788f, 148.654f, 230.472f)
    cubicTo(161.563f, 210.577f, 175.763f, 196.366f, 192.544f, 186.892f)
    cubicTo(206.098f, 179.313f, 217.071f, 173.628f, 230.625f, 164.154f)
    cubicTo(241.597f, 156.575f, 248.697f, 148.049f, 253.86f, 137.627f)
    cubicTo(257.088f, 130.995f, 260.96f, 130.048f, 264.833f, 135.732f)
    cubicTo(271.287f, 146.154f, 277.742f, 161.312f, 283.551f, 176.47f)
    close()
  }
  val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
    shader = LinearGradient(
      262.251f, 139.522f, 156.785f, 255.921f,
      Color.parseColor("#4D9AFF"), Color.parseColor("#276FDB"),
      Shader.TileMode.CLAMP,
    )
  }
  canvas.drawPath(path, paint)
}

private fun drawBadgesAndIcons(canvas: Canvas) {
  val badgePaint = Paint(Paint.ANTI_ALIAS_FLAG)
  val iconFillPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
    color = Color.WHITE
    style = Paint.Style.FILL
  }
  val iconStrokePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
    color = Color.WHITE
    style = Paint.Style.STROKE
    strokeWidth = 5.5f
    strokeCap = Paint.Cap.ROUND
    strokeJoin = Paint.Join.ROUND
  }

  badgePaint.color = EXPENSE_BADGE
  canvas.drawCircle(160f, 73f, 31f, badgePaint)
  canvas.drawRoundRect(RectF(145f, 69f, 175f, 77f), 4f, 4f, iconFillPaint)

  badgePaint.color = INCOME_BADGE
  canvas.drawCircle(87f, 234f, 31f, badgePaint)
  canvas.drawRoundRect(RectF(83f, 218f, 91f, 250f), 4f, 4f, iconFillPaint)
  canvas.drawRoundRect(RectF(71f, 230f, 103f, 238f), 4f, 4f, iconFillPaint)

  badgePaint.color = TRANSFER_BADGE
  canvas.drawCircle(233f, 233f, 31f, badgePaint)
  val arrows = Path().apply {
    moveTo(216f, 227f); lineTo(247f, 227f)
    moveTo(239f, 235f); lineTo(247f, 227f); lineTo(239f, 219f)
    moveTo(250f, 243f); lineTo(219f, 243f)
    moveTo(227f, 251f); lineTo(219f, 243f); lineTo(227f, 235f)
  }
  canvas.drawPath(arrows, iconStrokePaint)
}

private fun drawHub(canvas: Canvas) {
  val fillPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
    shader = RadialGradient(
      155.7f, 176.68f, 61.92f,
      Color.parseColor("#263A5C"), Color.parseColor("#0E1A30"),
      Shader.TileMode.CLAMP,
    )
  }
  val strokePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
    style = Paint.Style.STROKE
    strokeWidth = 3f
    color = Color.parseColor("#101D34")
  }
  canvas.drawCircle(160f, 187f, 43f, fillPaint)
  canvas.drawCircle(160f, 187f, 43f, strokePaint)
}
