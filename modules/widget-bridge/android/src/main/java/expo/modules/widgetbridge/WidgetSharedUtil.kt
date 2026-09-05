package expo.modules.widgetbridge

import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.Canvas
import android.net.Uri

// Shared by the three NEW widgets (Quick Add, Monthly Cash Flow, Net
// Worth) only. The existing "Accounts & Quick Add" widget
// (AccountsGlanceWidget.kt) keeps its own private copies of the
// equivalent logic untouched -- this file exists so the new widgets
// don't have to reach into that file (which would couple them to its
// presentation logic) or modify it.

internal fun currentAppIconBitmap(context: Context): Bitmap {
  val drawable = context.packageManager.getApplicationIcon(context.packageName)
  val width = drawable.intrinsicWidth.coerceAtLeast(1)
  val height = drawable.intrinsicHeight.coerceAtLeast(1)
  val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
  val canvas = Canvas(bitmap)
  drawable.setBounds(0, 0, canvas.width, canvas.height)
  drawable.draw(canvas)
  return bitmap
}

internal fun launchAppIntent(context: Context): Intent =
  context.packageManager.getLaunchIntentForPackage(context.packageName)
    ?: Intent(Intent.ACTION_VIEW, Uri.parse("spendingtracker://"))

// Same spendingtracker://transaction/new?type=... deep link the existing
// widget's own quick-add pills already use (AccountsGlanceWidget.kt) --
// app/transaction/new.tsx already reads this param, so no JS change is
// needed for any new widget or the launcher shortcuts to reuse it.
internal fun newTransactionIntent(type: String): Intent =
  Intent(Intent.ACTION_VIEW, Uri.parse("spendingtracker://transaction/new?type=$type"))
