package expo.modules.widgetbridge

import android.content.Context
import androidx.glance.GlanceId
import androidx.glance.action.ActionParameters
import androidx.glance.action.actionParametersOf
import androidx.glance.appwidget.action.ActionCallback

// The widget's in-place interactions. These are the first ActionCallbacks in
// this codebase — every other widget tap is an actionStartActivity, which
// leaves the home screen. Switching account has to happen without doing
// that, so it mutates Glance state and re-renders instead.
//
// Each callback writes state and then calls update() on the same glanceId.
// The write alone is not enough: updateAppWidgetState persists, but only
// update() asks Glance to recompose against it.

/** Parameter carrying which row of the picker was tapped. */
val AccountIndexParam = ActionParameters.Key<Int>("accountIndex")

fun accountIndexParams(index: Int): ActionParameters = actionParametersOf(AccountIndexParam to index)

/** Tapping the account name swaps the card for the picker list. */
class OpenAccountPickerAction : ActionCallback {
  override suspend fun onAction(context: Context, glanceId: GlanceId, parameters: ActionParameters) {
    savePickerOpen(context, glanceId, true)
    AccountsGlanceWidget().update(context, glanceId)
  }
}

/** Tapping the header while picking backs out without changing account. */
class CloseAccountPickerAction : ActionCallback {
  override suspend fun onAction(context: Context, glanceId: GlanceId, parameters: ActionParameters) {
    savePickerOpen(context, glanceId, false)
    AccountsGlanceWidget().update(context, glanceId)
  }
}

/**
 * Tapping a picker row selects that account and returns to the card.
 *
 * Falls back to index 0 if the parameter is somehow missing, which is
 * always a valid position for a non-empty list — better than throwing
 * inside a launcher's process.
 */
class SelectAccountAction : ActionCallback {
  override suspend fun onAction(context: Context, glanceId: GlanceId, parameters: ActionParameters) {
    saveSelectedIndex(context, glanceId, parameters[AccountIndexParam] ?: 0)
    AccountsGlanceWidget().update(context, glanceId)
  }
}
