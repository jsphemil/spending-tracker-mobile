# Handoff — New Transaction quick-entry redesign (Erebor)

**From:** design session, 2026-10-28
**Repo:** `jsphemil/spending-tracker-mobile` (checked at `094f4ca`)
**Attached mockup:** `new-transaction.html` — open it in a browser at phone width. It is the visual and behavioural reference, not code to port.

---

## 0. Process (per CLAUDE.md)

1. Add this as a new entry in `project-docs/product/backlog.md` → **Inbox**, then triage it the usual way. Propose a new `spec.md` section (e.g. "New Transaction quick entry") with a Status Dashboard row.
2. Read the Expo v57 docs (`AGENTS.md`) before writing code.
3. Presentation and form-behaviour change only. No schema change and no migration. Financial logic is untouched, except for the read-only queries in §4.

## 1. Goal

Today `components/TransactionForm.tsx` renders every account, category, fund and tag as wrapping chip lists. On Emil's phone the Add Transaction button is two screens down.

**Success criterion:** on a ~6.1–6.7" Android phone, a common expense (amount → category → save) needs **no scrolling**, and **at most 3 taps after typing the amount**.

## 2. Target layout (top to bottom, one screen)

| # | Element | Replaces |
|---|---|---|
| 1 | Compact segmented control: Expense / Income / Transfer, keeping the existing `TYPE_STYLES` colours | 3 tall type buttons |
| 2 | **Amount card:** currency prefix from the selected account's currency, an expression display, a live "= ₹570" result line when the expression has an operator, and a row of **quick-amount chips** | `Input` + `AmountOperatorRow` |
| 3 | **Account chip + Date chip** side by side. Each opens a bottom sheet. Date sheet: Today / Yesterday / picker. The chip shows "Today"/"Yesterday"/"28 Oct". In Transfer mode the label reads "From account" | Full account chip list + full-width date field |
| 4 | **Category grid:** 4 columns × 2 rows of icon tiles using each category's own `icon` + `color` — the top 7 by usage plus **More** (sheet with all categories, and "+ New category" moves there). A category picked from More takes a visible slot. Hidden in Transfer mode | Full category chip list |
| 4b | Transfer mode only: a **To account** chip opening the account sheet, excluding the From account | Full "To Account" chip list |
| 5 | Note input (single line) | Description field (unchanged behaviour) |
| 6 | **Extras row:** Fund / Tags / Repeat as small outline buttons. Each opens a sheet; once set, the button fills and shows its value ("Amsterdam Trip", "2 tags", "Every 2 weeks · till 31 Mar 27"). Fund shows only for expenses with active funds | Fund chips, `TagPicker` block, recurring toggle block |
| 7 | **Sticky Save button** outside the scroll view, showing the running total ("Add Expense · ₹570") and disabled until the entry is valid | Button at the bottom of the scroll |

Keep `FormScrollView` as the container so small phones and large font scales still scroll gracefully. The target is no scroll at default font scale, not a fixed-height layout.

## 3. Calculator keypad (replaces the system keyboard for Amount)

- The Amount display must **not** raise the system keyboard. Use a `Pressable` display, or a `TextInput` with `showSoftInputOnFocus={false}` — check which is cleaner on Expo v57.
- A custom keypad slides up from the bottom and covers the sticky Save button while open:

```
C   ÷   ×   ⌫
7   8   9   −
4   5   6   +
1   2   3   [ACT]   ← spans 2 rows
00  0   .   [ACT]
```

- **ACT key states:**
  - `=` while an expression is open → collapse it to the evaluated value.
  - `Save · ₹X` when the entry is valid → submit.
  - `Next` otherwise → close the keypad and draw attention to the missing field (shake the category grid, or open the To-account sheet for transfers).
- Input rules:
  - A repeated operator replaces the previous one; no leading operator.
  - One decimal point per number.
  - Decimal places are capped at **`minorUnitsFor(currency)`** from `services/format.ts` — do not hardcode 2, since zero-decimal currencies exist.
  - "00" on an empty number behaves as "0".
  - Long-press ⌫ clears the amount.
- Display operators as `+ − × ÷` but store and evaluate with the existing **`evaluateExpression()` in `services/calculator.ts`**. Do not write a new parser. Map `−×÷` to `-*/` before evaluating.
- Show the amount with en-IN digit grouping in the display only; the stored text stays ungrouped.
- Quick chips: tapping one **sets** the amount; if the expression ends in an operator, it **appends** instead (450 + 250).
- Opens automatically on **new** entries. On **edit** it starts closed and opens on tap.
- Focusing the Note field or opening any sheet closes the keypad.
- A hardware keyboard should work while the keypad is open (digits, `+-*/`, Enter = ACT, Backspace, Esc closes). This is low priority; drop it if Expo makes it awkward.
- `AmountOperatorRow` is also used by `FundForm`, `AccountForm` and `FundAllocationSheet`. **Leave those alone**; only `TransactionForm` stops using it.

## 4. Smart defaults (new read-only queries)

Add these to `db/queries/` (likely `transactions.ts` or `categories.ts`), scoped to the current type's kind and the **last 90 days**, excluding opening balances:

1. **Category usage order:** count of transactions per category, descending. Ties and no-history fall back to the current `sortOrder, id`. This drives which 7 tiles show.
2. **Last-used account per category:** most recent transaction's `accountId`. Picking a category pre-selects it and labels the chip "Last used here". Picking an account manually overrides it.
   - Never override an `accountId` that came from a deep-link param (`?accountId=`) or a duplicate.
3. **Frequent amounts per category:** the top 3–4 most common `amountMinor` values. The chip label reads "Frequent for Groceries".
   - With no category picked (or no history), show generic chips: ₹100 / 500 / 1,000 / 5,000. Transfers get 1,000 / 5,000 / 10,000 / 25,000; Income gets none.
   - Format chips in the account's currency.

Add a unit test for the three queries with the existing `__tests__/testDb.ts` harness.

## 5. Repeat sheet — must keep every current option

These match the existing behaviour in `TransactionForm.tsx` and `services/recurrence.ts`:
- **Repeat every N** with a −/+ stepper plus a typed number. Keep the existing validation: a whole number of 1 or more, and the same error text.
- **Unit:** `RECURRENCE_UNITS` (day / week / month / year), labels from `UNIT_LABELS`.
- **End date:** optional; blank means indefinite. Offer a "No end" action, and the earliest allowed date is the transaction date.
- A "Don't repeat" action turns it off. The extras button label: "Monthly", "Every 2 weeks", "… · till 31 Mar 27".
- Only on create (`allowRecurring && !isRecurringEdit`).
- **Recurring edit stays as-is:** the "Part of a recurring series" info block, its end-date editing, and the *Just this one / This and all future occurrences* alert. That block can move into the Repeat sheet or stay inline, but its behaviour must not change.

## 6. Must not regress

- `dispatchOnce` double-tap guard (the five-duplicate-rows bug).
- Amount validation messages, and the `amount <= 0` check.
- Closed funds stay hidden from the picker, while an existing link to a closed fund is preserved. Keep both fund hint texts, including the recurring one.
- The `key=` remount logic and deep-link params in `app/transaction/new.tsx` (widget and shortcuts with `type`, `accountId`, `date`, `duplicateId`), plus the cold-start `BackHandler.exitApp()` close path.
- The edit screen `app/transaction/[id]/edit.tsx` uses the same form, so check it renders and saves correctly, including recurring occurrences.
- The currency of the selected account drives the prefix, chips and minor-unit conversion (`majorToMinor`). Switching to an AED account must switch the display.
- Light and dark themes: use existing tokens only (`accent`, `success`, `danger`, `transfer`, `glass`, `surface-2`, …), no new hex values.
- Accessibility:
  - Keypad keys get `accessibilityLabel`s ("plus", "backspace", …).
  - Chips and tiles keep `accessibilityRole="radio"`/`checkbox` and `accessibilityState`.
  - Hit targets are at least 44dp.

## 7. Reuse map

| Need | Use |
|---|---|
| Bottom sheets | Same bare-`Modal` sheet pattern as `AccountSwitcherSheet` / `AddTransactionSheet` |
| Expression maths | `services/calculator.ts` → `evaluateExpression` |
| Currency decimals and conversion | `services/format.ts` → `minorUnitsFor`, `majorToMinor`, `minorToMajor`, `formatMoney` |
| Category / account icons | `components/ui/Icon` with the row's `icon` + `color` |
| Tag selection | `TagPicker` (inside the Tags sheet) |
| Recurring create | Existing `onSubmitRecurring` → `createRecurringSeries` (no change) |
| Date picker | `@react-native-community/datetimepicker` (already used) |

## 8. Suggested phasing (verify on-device after each)

1. Layout compaction (§2) with static ordering, using the existing state and handlers.
2. Calculator keypad (§3).
3. Smart defaults and queries with tests (§4).
4. Final pass on the regression checklist (§6), then `tsc` + `jest`.

## 9. Open questions for Emil (ask, don't assume)

- **Health vs Healthcare** look like duplicate categories. Should they be merged? That is a data change, so it is out of scope unless approved.
- **Adjusting** reads like a balance correction rather than a spending category. Should it stay in the grid or be excluded from the usage ranking?
- Should the redesigned layout also apply to the **edit** screen? The default assumption is yes, since it is the same component; confirm.
