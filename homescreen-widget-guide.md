# Home Screen Widgets — Step-by-Step Build Guide

Two separate Android home-screen widgets, selectable independently
when the user long-presses their home screen and picks a widget from
this app:

1. **Accounts & Quick Add** — selected accounts' current balances,
   plus Income/Expense/Transfer quick-add icon buttons.
2. **Portfolio Rings & Allocation** — the net worth gauge and asset
   allocation donut from the Dashboard, in miniature.

Android-only for now (matches the earlier decision to ship Android
first, iOS deferred — see spec.md §2). Everything below is additive:
new native module, new config screens, new background data-read path.
**Nothing here touches existing screens, calculations, or the data
model.**

---

## 0. The one hard technical constraint to understand first

A home screen widget is not a smaller version of your app's screens —
it renders through Android's `RemoteViews` (or Jetpack Glance), a
constrained native view system, not React Native. This means:

- No Erebor glass/blur/gradient backgrounds — solid fills only.
- No arbitrary custom fonts guaranteed to render — stick to system-safe
  fonts.
- **No live interactive charts.** `GaugeRing`/`AssetAllocationDonut`
  are React Native components — a widget can't embed them directly.
  **Revised after the compatibility spike (§1)**: `react-native-
  android-widget`'s `SvgWidget` accepts a raw SVG string, so Widget 2
  (rings/allocation) generates its chart as an **SVG string** (the
  same arc-path math the two Dashboard components already compute,
  serialized to markup instead of rendered as RN components) rather
  than a pre-rendered bitmap screenshot — simpler than originally
  assumed, still a real added step Widget 1 doesn't need, but no
  screenshot/bitmap-capture pipeline required.
- Widgets must ship **two explicit appearances** (light/dark) — not
  one CSS-variable-adaptive theme like the app has now. Android picks
  the right one automatically based on system theme.

## 1. Library and compatibility check — DONE, passed 2026-08-28

- Library: [`react-native-android-widget`](https://github.com/sAleksovski/react-native-android-widget)
  v0.22.1 — lets you define widget layouts in JSX-like syntax that
  compiles to native `RemoteViews`, with an Expo config plugin for the
  native wiring (manifest entries, widget provider registration).
- **Confirmed compatible with this project's Expo SDK 57 / RN 0.86.2**
  on the `widget-spike` branch: `expo prebuild --clean` generated a
  correct `<receiver>` entry in `AndroidManifest.xml`
  (`.widget.Hello`, right label/metadata/intent-filters), the native
  build succeeded with no autolinking conflicts, and a minimal
  `FlexWidget`/`TextWidget` "hello world" widget rendered correctly
  when added to the home screen on the user's Pixel 10.
- **Key API surface confirmed by reading the installed package's type
  definitions** (`node_modules/react-native-android-widget/lib/typescript/`):
  `FlexWidget`/`TextWidget`/`ImageWidget`/`IconWidget`/`ListWidget`/
  `OverlapWidget`/**`SvgWidget`**, `registerWidgetTaskHandler` (the
  headless data-bridge task — see §2), `registerWidgetConfigurationScreen`,
  `requestWidgetUpdate`/`requestWidgetUpdateById`, `requestPinWidget`.
- **Important discovery: `SvgWidget` accepts a raw SVG string directly**
  (`svg: string | ImageRequireSource`). This changes Widget 2's plan
  below — instead of pre-rendering a bitmap screenshot, generate the
  ring/donut as an **SVG string** (the same arc-path math
  `GaugeRing`/`AssetAllocationDonut` already compute via
  `react-native-svg`, just serialized to a string instead of rendered
  as RN components) and hand it straight to `SvgWidget`. Simpler
  pipeline, no screenshot/bitmap-capture step needed — see §2 Data
  bridge, revised.
- Expo Router entry point: the app's `main` now points to a custom
  `index.ts` (`import "expo-router/entry"` then
  `registerWidgetTaskHandler(...)`) instead of `expo-router/entry`
  directly — required so the widget task handler is registered at JS
  load time, confirmed working.
- Widget config lives in `app.json`'s plugin entry as
  `["react-native-android-widget", { widgets: [...] }]` — each widget
  needs `name`/`label`/`minWidth`/`minHeight`, and `updatePeriodMillis`
  has a **hard 30-minute minimum** enforced by the library itself (not
  just an Android platform quirk — confirmed in the plugin's own type
  definitions), matching §6's known-risk note below.

## 2. Shared plumbing (both widgets need this)

- **Data bridge**: a background task (native or a headless JS task,
  depending on what the library supports) reads the SQLite database
  directly and computes whatever the widget needs, then calls the
  native widget-update API to refresh what's on the home screen. This
  runs independently of the main app being open.
  - Widget 1 needs: each selected account's current balance
    (`getAccountBalanceMinor`, already exists in `services/balance.ts`
    — just called from a new context, not new logic).
  - Widget 2 needs: net worth + capacity (same math `GaugeRing`
    already uses on the Dashboard) and the asset allocation buckets
    (same math the Dashboard's donut already uses).
- **Configuration screen**: shown when the widget is added to the home
  screen. This *is* a normal Expo Router screen (a real Activity, not
  RemoteViews-constrained) — reuse existing UI components directly.
  - Widget 1's config screen: a multi-select account picker ("any
    number of accounts").
  - Widget 2's config screen: likely no picker needed at all (it's
    whole-portfolio, not per-account) — confirm this against what you
    actually want shown before building it.
- **Deep links for quick-add** (Widget 1 only): each icon button opens
  `spendingtracker://transaction/new?type=income` (or `expense`/
  `transfer`) — **already fully supported**, `app/transaction/new.tsx`
  already reads `type`/`accountId` from route params, confirmed
  2026-08-28. No app-side changes needed for this part.
- **Update triggers**: widgets should refresh when their underlying
  data changes, not just on a timer. Practical approach: trigger a
  widget-refresh call from wherever transactions/accounts are
  created/edited/deleted (`db/actions/*.ts`), in addition to Android's
  own periodic update schedule (minimum 30 minutes, an OS-level
  constraint, not a design choice).

## 3. Claude Design briefs — DONE, mockups received and confirmed 2026-08-28

Both mockups delivered as Claude Design `.dc.html` components
(`Erebor Home Screen Widget.dc.html`, `Erebor Portfolio Widget.dc.html`
in the repo root) — interactive design-tool files, not static images;
open them in Claude Design itself to view/tweak, the specs below are
what's locked in from them.

**Widget 1 — Accounts & Quick Add, confirmed layout:**
- A card (~260×258dp total footprint, fits a 4×4 launcher cell) with:
  - Up to 4 account rows: name (left, truncates with ellipsis) +
    balance (right, tabular-numeral, bold), thin divider between rows
  - A heavier divider, then 3 icon action buttons in a row: Income
    (up-arrow, `neon-cyan` badge), Expense (down-arrow, `neon-blue`
    badge), Transfer (swap-arrows, `neon-violet` badge) — 44×44
    rounded-square badges, black-stroke icons for contrast on the
    neon fill, optional text label under each (toggleable)
  - Same 3 accent colors in both light and dark — only the
    surrounding card/background/text colors swap
- Light theme: white card, `#12172a` text on `#eef1f7` background.
  Dark theme: `--bg-elevated-2` card on `--bg-void`, theme-token text.

**Widget 2 — Portfolio Rings & Allocation, confirmed layout:**
- A single wide card (356px) with two halves separated by a vertical
  divider:
  - **Left: ring gauge** (112px, 12px stroke) — **confirmed metric
    2026-08-28: "% of net worth currently invested vs. liquid,"** a
    new derived metric specific to this widget, not the same as the
    Dashboard's `GaugeRing` (which is expense-used-against-
    carry-forward+income capacity). Center shows "Net Worth" label,
    the net worth figure, and an "X% invested" subtext. Used-color
    `neon-violet`, available-color a muted line-gray.
  - **Right: donut chart** (76px, 14px stroke) for Liquid/Deposits/
    Invested, plus a 3-line legend (colored dot + name + %) — same
    fixed cyan/blue/violet mapping as the Dashboard's asset
    allocation donut, just laid out as a legend instead of below the
    chart.
- Same card/background token pattern as Widget 1 for light/dark.

**Implementation note on `RingGauge`/`DonutChart` in the mockup**:
those are Claude Design's own preview components, not something to
import — they exist only to produce an accurate visual. The actual
widget renders equivalent shapes via `SvgWidget` (§1), generating SVG
arc strings with the same math already implemented in
`components/rings/GaugeRing.tsx` and the Dashboard's asset-allocation
donut component, just serialized to a string instead of react-native-
svg JSX. For stacking the center label/value/subtext text on top of
the ring SVG, use `OverlapWidget` (confirmed present in the library's
API, §1) — it exists for exactly this layering case.

## 4. Build order

1. ~~Library compatibility spike (§1)~~ — done, passed 2026-08-28.
2. Widget 1 end-to-end: config screen → data bridge → RemoteViews
   layout → quick-add deep links → light/dark variants → on-device test.
3. Widget 2 end-to-end: SVG-string generation for the ring+donut →
   data bridge → RemoteViews layout (`SvgWidget` showing the generated
   markup) → light/dark variants → on-device test.
4. Native rebuild (`expo prebuild --clean` + `expo run:android`) —
   required, same as every other native addition so far.
5. Add both widgets to a home screen and verify: correct data on
   first add, correct data after adding a transaction in the app,
   correct appearance in both light and dark system theme, quick-add
   buttons open the right pre-filled form.

## 5. What this doesn't touch

No changes to `db/schema.ts`, existing screens, `services/balance.ts`'s
actual math, or any already-shipped feature. The only touch to
existing app code is calling a "refresh the widgets" function from
`db/actions/*.ts` after a write — everything else is new files.

## 6. Known risks to flag early, not discover late

- ~~Library/SDK 57 compatibility~~ — confirmed working 2026-08-28.
- Widget 2's SVG-generation work is still more than Widget 1 — consider
  shipping Widget 1 first as its own milestone rather than building
  both simultaneously.
- Android's minimum widget-update interval is 30 minutes for scheduled
  updates (confirmed in the library's own type definitions, §1) — the
  "refresh on data change" trigger (§2) is what makes it feel instant
  in practice; without it, a balance change in the app could take up
  to 30 minutes to show on the home screen.
- The app's entry point now goes through a custom `index.ts` instead
  of `expo-router/entry` directly (confirmed working) — worth knowing
  if any future tooling assumes the default Expo Router entry path.
