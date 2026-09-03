# Erebor Wealth Management — Design System

> **Authoritative UI/UX contract for the mobile app.**
>
> This document defines how Erebor should look, feel, and behave. It is intentionally implementation-aware enough for Claude Code and future contributors to make consistent UI decisions without rediscovering the design language screen by screen.
>
> **Current direction: Erebor V2.** V2 supersedes the earlier six-tab, dark-only V1 presentation while preserving the underlying financial model, currency logic, local-first architecture, and Dropbox backup/restore behavior.

---

## 1. Product character

Erebor is a personal wealth-management tool, not a generic expense tracker.

The product should make the user feel that their finances are an understandable system they are in control of. The visual language should therefore combine:

- **Precision** — financial figures are exact, structured, and easy to scan.
- **Calm confidence** — no noisy dashboards, excessive decoration, or gamification.
- **Depth** — the interface can feel sophisticated and premium without becoming visually heavy.
- **Actionability** — important problems and next actions should be obvious without being alarmist.
- **Trust** — money information must always be presented consistently; visual polish must never obscure meaning.

The product name and visual metaphor are inspired by Erebor: a place where wealth is accumulated, organized, protected, and ultimately used with intent. Avoid literal Tolkien imagery in ordinary UI. The connection should be felt through the product's atmosphere and language, not through decorative fantasy elements.

### Design principle

**Position → Performance → Action.**

The user should first understand where they stand, then how they are progressing, then what deserves attention or action.

---

## 2. V2 information architecture

V2 uses a **four-tab primary navigation shell**:

1. **Dashboard** — the user's financial home and current position.
2. **Accounts** — where money is held and how each account is performing.
3. **Transactions** — the detailed ledger and transaction operations.
4. **Analytics** — trends, composition, spending and other analytical views.

### Not primary tabs

The following should not receive dedicated bottom-navigation tabs:

- Categories
- Tags
- Commitments
- Goals
- Settings
- Calendar
- Account detail
- Transaction detail/edit flows
- Backup/restore

These are secondary destinations reached from the relevant parent screen or Settings.

**Important shortcut rule:** Dashboard shortcuts should contain only destinations that do **not** already have a dedicated primary tab. Do not add shortcuts for Accounts, Transactions, or Analytics when those are already visible in the bottom navigation.

### Settings

Settings replaces the old Profile tab. It is a grouped settings experience, not a user-profile page. There is no account/login requirement and therefore no password, sign-out, or authentication UI.

Settings should group related controls into clear sections such as:

- Appearance
- Financial preferences
- Transaction behavior
- Notifications / reminders
- Backup & restore
- About / support

The exact grouping can evolve, but unrelated controls should not be presented as one undifferentiated list.

---

## 3. Visual language

### 3.1 Overall aesthetic

Erebor is a **premium glassy fintech interface** with a dark/modern visual base, strong semantic colors, subtle depth, and restrained neon accents.

It should feel closer to a high-end financial terminal than to a generic budgeting app, while remaining comfortable and readable on a phone.

Do not introduce decorative gradients, glows, shadows, or illustrations merely because they look attractive. Every visual effect must support hierarchy or state.

### 3.2 Surfaces

Use a small, repeated set of surface tiers rather than inventing a new card treatment for every screen:

- Page background
- Standard surface/card
- Elevated surface
- Strong elevated/interactive surface
- Frosted/glass surface

The glass treatment is part of the Erebor language. It should read as a subtle translucent panel over the page background, not as a strong blur effect that harms legibility.

Prefer one shared card/panel primitive with variants rather than custom containers per screen.

### 3.3 Borders and depth

Depth should come primarily from:

- surface contrast
- restrained borders
- translucency
- spacing and grouping

Avoid heavy drop shadows, especially in dark mode.

### 3.4 Accent philosophy

The primary accent is a cool cyan/aqua family in the current dark theme, paired with a blue-violet secondary accent where needed.

Accent should be used for interaction and emphasis, not sprayed across every label or card.

---

## 4. Color tokens

Never hardcode UI colors in components. Components consume semantic token names.

The current implementation exposes these concepts through `theme/palette.ts` and the corresponding NativeWind/CSS variables.

### Core semantic tokens

```text
bg
surface
surface-2
surface-3
border
border-strong
fg
fg-muted
fg-subtle
accent
accent-strong
accent-soft
success
success-soft
danger
danger-soft
transfer
transfer-soft
```

### Glass tokens

```text
glass-fill
glass-fill-strong
glass-fill-press
glass-border
glass-border-strong
```

### Current palette reference

These are implementation values, not permission to bypass the token system.

**Dark**

```text
bg              #0c1120
surface         #131a2c
surface-2       #1a2338
surface-3       #212b45
border          #1f2432
border-strong   #2e323f
fg              #f6f8fc
fg-muted        #97a1bc
fg-subtle       #5c6584
accent          #48e7f5
accent-strong   #4c7dff
success         #2fe39b
danger          #ff5c72
transfer        #ffc24b
```

**Light**

```text
bg              #eef6f8
surface         #ffffff
surface-2       #e3eff3
surface-3       #d5e6ec
border          #d0e2e8
border-strong   #b0c9d1
fg              #0f1a1e
fg-muted        #566a72
fg-subtle       #89a1aa
accent          #5b4fe0
accent-strong   #4a3fd0
success         #12a57c
danger          #e0435a
transfer        #b45309
```

Soft and glass values should continue to be maintained centrally in the theme implementation.

### Semantic color rules

**Success** communicates positive financial flow or healthy status.

**Danger** communicates spending, debt, destructive actions, or attention-required financial risk.

**Transfer** is deliberately distinct from both income and expense. A transfer is movement between owned accounts, not profit or loss.

Never use color alone to communicate a critical state. Pair it with text, iconography, position, or a number sign.

---

## 5. Typography and numbers

### 5.1 Hierarchy

Use a clear hierarchy:

- Page title: strong, compact, confident.
- Section heading: clear but subordinate to the page title.
- Primary financial figure: visually dominant.
- Supporting figure: quieter, but still highly legible.
- Metadata/helper text: muted/subtle.

Avoid excessive all-caps labels. Use them only where compact terminal-like labeling genuinely improves scanning.

### 5.2 Money figures

Money is product-critical information and gets special treatment.

Every prominent monetary value should use a **monospace/tabular-numeral treatment** so digits align visually when scanning lists and comparisons.

Use Indian grouping when the locale calls for it:

```text
₹1,53,168.00
```

Never mix grouping conventions within the same user experience.

### 5.3 Foreign currencies

Per-account amounts remain in the account's native currency.

When an equivalent reporting-currency figure is relevant, show both:

```text
AED 500.00 · ≈ ₹11,310.00
```

Do not silently convert every number to the reporting currency.

---

## 6. Layout and spacing

The interface should feel spacious enough to scan, but not waste phone screen real estate.

Use a consistent spacing scale and rely on reusable layout primitives. New screens should not introduce arbitrary one-off gaps to make a composition "look right."

Priorities:

1. Respect device safe areas.
2. Keep primary content visually grouped.
3. Give sections enough separation to establish hierarchy.
4. Keep repeated list rows vertically compact.
5. Keep actions discoverable without making every row visually noisy.

Avoid fixed top padding used as a substitute for safe-area handling.

### Cards

Cards are useful for discrete content blocks such as:

- net worth / position
- performance
- goals
- attention items
- accounts
- recent transactions
- analytical summaries

A screen should not become a wall of individually bordered cards. Related information should live together when that improves comprehension.

---

## 7. Component rules

### 7.1 One shared card primitive

Use the common card/panel primitive everywhere possible. Variant through semantic properties such as elevation, glass strength, padding, and interaction state.

Do not create near-identical one-off card wrappers.

### 7.2 Buttons

Primary actions should be visually obvious without overpowering the rest of the screen.

Use:

- filled/strong treatment for the primary action
- outlined or glass treatment for secondary actions
- compact icon buttons for repeated row-level actions

Buttons must have clear pressed/disabled/loading states.

### 7.3 Iconography

Use a consistent icon family. The current implementation uses Material Community Icons in places where icons are required.

Never render an icon's internal name/slug as visible text.

An icon identifier such as `wallet-outline` is implementation data, not user-facing copy.

### 7.4 Row actions

Repeated actions such as Edit and Delete belong in a compact trailing action area rather than repeated text links.

The content column should be allowed to truncate; the action column should not shrink.

Destructive actions require a confirmation or clear scope choice when data loss is involved.

### 7.5 FABs

A floating action button is not a default component of Erebor.

Before adding one, audit the screen for existing bottom-right controls such as month navigation, keyboard interactions, or system overlays. Choose placement based on the actual composition rather than habit.

The dropped Claude/AI assistant FAB must **not** return unless the product scope explicitly changes.

---

## 8. Data visualization

Choose visualization according to the question the user needs answered.

### Capacity questions

For questions such as "how much of my available money/limit have I used?":

Use a **two-segment gauge/ring** showing used versus remaining capacity.

The center should communicate the amount that matters most, usually remaining/available capacity or the current net position.

Do not use a standard ratio pie for a capacity question.

### Composition questions

For questions such as "how is my portfolio/spending distributed?":

Use a genuine composition visualization such as a donut/ring, or a text list with subtotals when the labels and exact amounts matter more than visual shape.

Do not force a chart where a simple ranked list is clearer.

### Trend questions

For questions about change over time, use line/trend visualizations with clear period labels and enough context to avoid implying false history.

Do not pad a new user's chart with artificial months simply to make it look complete.

### Chart rules

Charts must:

- use semantic theme tokens
- remain legible in both light and dark themes
- provide enough text context that color/shape is not the only source of meaning
- avoid decorative 3D effects
- avoid excessive animation

---

## 9. Dashboard V2

The Dashboard is the primary expression of the product philosophy.

Its visual and information hierarchy follows:

**Position → Performance → Action**

### Position

The first screenful should answer:

> Where am I financially right now?

Prioritize:

- current net worth / financial position
- available capacity where relevant
- major account/debt context
- the selected period

The month/period selector should remain easy to access and should scope every value it is intended to scope.

### Performance

The next section should answer:

> How is my financial position changing?

Useful content includes:

- income
- expense
- net change
- trend over time
- meaningful composition such as asset allocation or spending mix

Do not bury exact values behind charts.

### Action

The attention section should answer:

> What should I look at or do next?

Examples:

- over-budget categories
- goal pace concerns
- upcoming commitments
- reminders
- unusually important financial events

The attention area should be **dynamic**. If nothing needs attention, do not manufacture warnings merely to fill a card.

### Dashboard shortcuts

Shortcuts are for secondary destinations only. Do not duplicate dedicated primary tabs.

Appropriate shortcut destinations include things such as:

- Goals
- Categories
- Tags
- Commitments
- Calendar
- other supporting workflows

### Dashboard density

Do not copy the old V1 dashboard's entire collection of cards merely because they existed before.

V2 should optimize for decision usefulness, not feature inventory.

---

## 10. Accounts UX

Accounts represent where money exists.

The Accounts list should make it easy to answer:

- What accounts do I have?
- What is each one worth?
- Which account needs attention?

Each row/card should expose the account name, type/context, native balance, and relevant reporting-currency equivalent when needed.

Account detail should preserve the product's established financial correctness rules:

- balances are derived from the ledger
- balances are "as of" a specific date/period
- opening balances are represented as real ledger entries
- credit-card debt is handled distinctly from liquid assets
- transfers contribute negatively to the source and positively to the destination

### Account actions

Editing is available from a clear header action or equivalent compact control.

Deleting an account with transaction history must not silently destroy that history. Use the existing product rule: deletion is blocked when historical transactions still depend on the account.

---

## 11. Transactions UX

The Transactions area is the detailed ledger.

### List

Default ordering is newest first.

The list must support the existing filtering model, including:

- account / all accounts
- category / all categories
- date range
- type: All Types / Recurring / Transfers

Do not add a "carry forward" filter unless product scope explicitly changes.

### Summary band

A compact summary above the list should communicate total income and total expenses for the currently selected view.

Filtering should update the summary where the filter changes the meaning of the displayed dataset.

### Transaction rows

Each row should make the following easy to scan:

- transaction type
- description/category context
- date or period context
- amount with correct sign and semantic treatment
- account context when viewing across multiple accounts
- recurring/tag context where relevant

Use compact icon actions for edit/delete rather than verbose links.

### Transfer semantics

Transfers must be visually distinct from income/expense and must not be treated as spending or earnings in net-income calculations.

### Recurring semantics

The recurring toggle belongs directly on transaction entry.

When editing or deleting a recurring item, always ask whether the change applies to:

- just this occurrence
- this occurrence and all future occurrences

Never silently choose the broader scope.

---

## 12. Analytics UX

Analytics exists to answer questions that are difficult to answer from raw transactions.

The design should favor a small number of useful analytical views over a giant dashboard of charts.

Potential analytical groupings include:

- Spending
- Income
- Cash / asset position
- Category trends
- Account comparisons
- Period-over-period change

Every chart should answer a concrete question in its heading or supporting copy.

Avoid headings such as "Analytics" with no indication of what the visualization means.

Exact numbers should remain accessible without requiring users to interpret a graph.

---

## 13. Categories and tags

### Categories

Categories answer:

> What kind of financial activity is this?

Category records have a name, icon, color, and optional budget.

Use category color consistently anywhere the category appears visually.

### Tags

Tags answer:

> What occasion, project, or context does this belong to?

Tags are intentionally orthogonal to categories.

Examples:

- `Dubai Trip 2026`
- `Wedding costs`
- `Office reimbursement`

A trip should not become a category.

A tag may span several accounts and categories, and may include both expenses and offsetting income.

### Tag presentation

Tags should usually appear as compact chips or labels, not as large primary visual objects.

Tag summary views should show total tagged income, total tagged expense, net result, and the related transactions.

---

## 14. Goals and Commitments

These are secondary financial-planning features, not primary navigation destinations.

### Goals

Goal progress should emphasize:

- target amount
- current progress
- target date where applicable
- pace/projection
- whether the user is behind pace

The visual should encourage understanding and adjustment, not guilt.

### Commitments

Commitments describe recurring financial obligations and their effect on recurring income.

Use clear monthly-equivalent numbers and avoid implying false precision where normalization is being used.

---

## 15. Onboarding V2

Onboarding should get the user to a usable financial home with minimal forced identity/profile work.

### Principles

- Do not force a display name before the user can use the app.
- Do not force creation of an account merely to get past onboarding unless the product explicitly requires it for a future feature.
- Base currency is important and should be easy to search/select.
- Explain what the app stores locally and how backup works in plain language where appropriate.
- Keep the first-run flow focused on establishing the minimum financial context required to use the app.

Use safe-area-aware layout. Never rely on arbitrary top padding to clear the status bar.

### Currency selection

The currency selector is a real picker/modal interaction, not a tiny inline list constrained by the onboarding layout.

The user should be able to search the supported currency list efficiently.

---

## 16. Settings and theme

V2 restores a real theme preference:

- **System** — follow device appearance.
- **Light** — explicitly light.
- **Dark** — explicitly dark.

Theme selection must update the semantic token set throughout the app. Do not maintain separate ad-hoc theme logic inside individual components.

### Theme quality bar

Light mode is not "dark mode inverted."

Light and dark values should each be deliberately tuned for:

- text contrast
- panel separation
- border visibility
- chart legibility
- pressed states
- destructive states
- disabled states

A screen is not considered design-complete until it remains coherent in all three theme preferences.

---

## 17. Notifications and reminders

Expense reminders are part of V2.

Notifications should feel like a useful assistant, not a growth or engagement system.

Good reminder copy is:

- specific
- calm
- actionable
- contextual

Avoid unnecessary repeated notifications or urgency language.

Where a reminder is tied to an expense/commitment, deep-link the user to the relevant financial context rather than merely opening the app home screen.

---

## 18. States: loading, empty, error, success

Every async or potentially empty view must have an explicit state.

### Loading

Prefer subtle skeleton/placeholder treatment or a compact progress indicator appropriate to the screen.

Avoid leaving a large blank region that could be mistaken for missing data.

### Empty

Explain:

1. what is empty
2. why the user might care
3. what action can populate it

Do not use meaningless messages such as "No data" when a useful next action is known.

### Error

Errors should be understandable and recoverable.

Do not expose raw database, foreign-key, stack-trace, or implementation messages to users.

### Success

Use brief confirmation for important mutations where the UI state change alone is not enough to provide confidence.

---

## 19. Interaction and motion

Motion should be restrained and purposeful.

Use animation to:

- clarify navigation
- show a state transition
- reinforce a completed action
- provide subtle feedback to direct manipulation

Do not animate financial figures constantly or turn the dashboard into a spectacle.

Financial information should feel stable and trustworthy.

Respect reduced-motion/accessibility settings when practical.

---

## 20. Accessibility and readability

Design for one-handed phone use and ordinary viewing conditions.

Requirements:

- sufficient contrast in both themes
- touch targets large enough for reliable interaction
- do not communicate meaning through color alone
- preserve readable text when accessibility font sizes increase where the platform permits
- labels for icon-only actions where needed by accessibility APIs
- avoid placing critical controls against the screen edge without safe-area consideration

Numbers must remain readable at a glance. Do not sacrifice monetary text legibility merely to make cards fit more content.

---

## 21. Copy and terminology

Use plain financial language.

Prefer:

- Income
- Expense
- Transfer
- Balance
- Net worth
- Available
- Spent
- Budget
- Goal
- Commitment
- Backup
- Restore

Avoid clever names that require the user to decode what a control does.

### Erebor flavor

The brand can appear in page titles, onboarding language, empty states, and occasional supporting copy, but financial terminology itself should remain standard and immediately understandable.

Do not turn every interaction into a Tolkien reference.

---

## 22. Financial correctness is part of design

In Erebor, correctness is a UX requirement, not merely an engineering concern.

The interface must preserve these established rules:

### Balances

- Never treat a cached running balance as the source of truth.
- Compute balances from the transaction ledger.
- Compute a balance as of the relevant date/period.
- Do not let a newly-created account's opening balance leak into earlier periods.
- Carry Forward is its own labeled figure, not disguised as current-period income.

### Transfers

A transfer between owned accounts is one logical transaction with a source and destination.

For the source account it contributes a negative amount; for the destination it contributes a positive amount.

### Recurring entries

Materialize recurring occurrences in a safe, idempotent way and preserve stable occurrence identity.

When changing a recurring series, distinguish a single-occurrence edit/delete from a future-series change.

### Multi-currency

- Use one reporting/base currency for portfolio-level aggregation.
- Keep account-level values in their native currencies.
- Cache FX data and degrade gracefully when a live rate request fails.
- Do not silently treat a failed currency conversion as 1:1.

These rules must not be broken to simplify a visual component.

---

## 23. Local-first and backup UX

The app is local-first.

The device's SQLite database is the source of truth. There is no developer-hosted shared financial database.

Dropbox is a user-owned backup destination, not a real-time synchronization backend.

### Backup UI principles

Explain backup as:

> Your data is stored on this device. Backup copies it to your own Dropbox account so you can restore it later.

Avoid language that implies live sync when the product does not provide live sync.

Automatic daily backup is an app-open check rather than a promise of guaranteed operating-system background execution.

Restore is a significant operation. Make the selected backup, its date, and the fact that it replaces the local database clear before confirmation.

---

## 24. What not to build back into the UI

The following were deliberately removed or rejected and should not quietly return:

- AI/Claude transaction assistant or chat FAB
- six-tab V1 navigation
- Profile as a primary tab
- duplicate Dashboard shortcuts for Accounts, Transactions, or Analytics
- dark-only theme as the sole supported theme
- decorative pie charts for questions better answered by gauges/lists
- raw icon slugs displayed as text
- arbitrary hardcoded colors inside components
- blanket card-by-card decoration without information hierarchy

---

## 25. Implementation guardrails for Claude Code

When implementing or modifying UI, Claude Code should follow this order:

1. **Read this file first.** Treat it as the design contract.
2. **Inspect existing tokens/components before creating new ones.** Reuse them unless there is a demonstrated design gap.
3. **Use semantic theme tokens, never component-level hardcoded colors.**
4. **Keep business logic out of visual components where possible.** The financial engine is existing, tested functionality and should not be reimplemented during a visual redesign.
5. **Do not invent new navigation destinations or bottom tabs without updating the information architecture in this document.**
6. **For every new screen, define the hierarchy before styling it:** purpose, primary number/action, supporting information, secondary actions, empty/loading/error states.
7. **Test both Light and Dark themes.** System mode must resolve correctly as well.
8. **Check safe areas, keyboard behavior, touch targets, and long labels.**
9. **For financial numbers, verify sign, period, currency, and formatting before adjusting presentation.**
10. **Prefer a small reusable primitive over a one-off visual solution.**

### Before declaring a screen complete

Confirm:

- the hierarchy is obvious without explanation
- the primary action is discoverable
- repeated content uses existing primitives
- money figures are formatted consistently
- semantic colors are correct
- icons render as icons rather than implementation strings
- empty/loading/error states exist
- light/dark/system themes remain coherent
- no existing navigation destination has been duplicated unnecessarily
- no financial behavior was changed merely to achieve visual parity

---

## 26. Source-of-truth hierarchy

When design decisions conflict, use this order:

1. **Current product requirements / explicit user decisions**
2. **This `DESIGN.md`**
3. Existing reusable components and theme tokens
4. `project-docs/product/spec.md` for feature/business behavior
5. `knowledge-transfer.md` for historical lessons and reusable financial/engineering principles
6. Existing implementation details that are clearly superseded by the above

The old V1 dashboard/nav/profile description in `spec.md` remains useful for historical context, but V2's four-tab navigation, Dashboard structure, Settings approach, and theme direction take precedence where the documents differ.

---

## 27. Design philosophy in one sentence

**Make wealth visible, understandable, and actionable — with the precision of a financial terminal and the calm confidence of a premium personal tool.**
