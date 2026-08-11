# Knowledge Transfer — Reusable Logic & Design Principles

_Written for a **new Claude Code session in a different project** (a mobile-only app) that has no memory of this one. This is not a status report on this codebase — it's a distillation of what's worth carrying over: the correctness rules that took real bugs to discover, the architecture patterns that held up, and the visual design language, separated from the web-specific mechanics they happen to be implemented in here._

---

## 0. How to use this document

Two kinds of content are mixed together below, and they're labeled as such throughout:

- **Domain logic** (marked 🏦) — rules specific to tracking money, transactions, and recurring schedules. Directly reusable if the new app is also a finance/expense tracker (or anything with a similar "ledger + recurring entries + budgets" shape). Skip these if the new app is unrelated to money.
- **General patterns** (marked 🔧) — architecture and design principles that apply regardless of what the new app does. These are the higher-value carryover if the new app's domain is different.

Section 6 is the important one to read first if you're about to start building: it says explicitly what does **not** carry over unchanged, because the new app is mobile-only (and, almost certainly, needs to work offline — the source project never solved that; don't assume you can defer it the way it did).

---

## 1. What the source project is

A personal finance / multi-account expense tracker: Next.js (App Router) + TypeScript + Tailwind, Supabase Postgres accessed via Prisma, deployed on Vercel. Single-user-per-account web app (email+password auth), fully server-rendered with Server Actions for all mutations — no client-side data-fetching library, no separate API layer. Core features: multi-account balances (bank/cash/credit card/investment/deposit), income/expense/transfer transactions, recurring transactions with "just this one vs. this and future" editing, categories, free-form cross-cutting tags, a month-navigable dashboard, multi-currency support, budgets (global + per-account, and separately per-category), and a dark/light theme system. It was built iteratively over many sessions, with a living `spec.md` tracking what shipped and why, and a `status-report.md` doing a full audit of spec vs. actual code partway through. If you want the full detail behind any point below, those two files (in this project's repo) are the primary source.

---

## 2. 🏦 Domain business logic — the hard-won correctness rules

Each of these encodes a real bug that was found and fixed, or a design tension that was deliberately resolved one way. The "why" matters more than the specific implementation — reproduce the reasoning, not necessarily the exact code shape, if your schema differs.

### 2.1 Balances

- **Never store a running balance. Always compute it from the transaction ledger**, on every read. Storing a cached balance and updating it on every write is a classic source of drift the moment any edit/delete/recurring-materialization path forgets to update it. Compute it live; if performance ever demands a cache, cache it as a derived, invalidatable value — never as the source of truth.
- **A balance is "as of a specific date," never "as of today."** Compute a past month's ending balance by filtering the ledger to `date <= thatMonth'sEnd`, not by taking today's live balance and trying to subtract later activity back out. The source project shipped a real bug here: a future month's already-materialized recurring transactions were inflating the *current* month's balance, because balance was computed "as of now" instead of "as of the period being viewed."
- **An entity contributes nothing before it existed.** An account's opening balance must not leak backward into periods before its own opening date (another real bug: a new account's opening balance was appearing in *last* month's numbers).
- **"Carry Forward" (prior period's ending balance) is always its own labeled figure** — never silently merged into "income," even though mechanically it's just "yesterday's ending balance." Merging it hides where money actually came from this period vs. what rolled in.
- **Model an opening balance as a real ledger entry, not a special field re-added into every calculation.** The source project initially had `Account.openingBalance` as a bare field that three different pages each manually re-added into their income/expense math — meaning any *new* page (like an export or a transaction list) that queried the ledger directly missed it entirely. Fixed by making account creation generate a real, flagged transaction row instead. General lesson: if a value needs to show up everywhere a normal ledger entry would, *make it a ledger entry* (with a flag distinguishing it), don't special-case it at each call site.

### 2.2 Transfers

- **Model a transfer between two of the user's own accounts/wallets as one row with both endpoints referenced** (a "from" and a "to" foreign key on the same row), not two separately-linked rows. This makes edit and delete atomic — there's no way for the two sides to drift out of sync, because there's only one row. Compute each account's own signed contribution at query time: negative for the "from" leg, positive for the "to" leg.

### 2.3 Recurring / scheduled entries

This is the highest-complexity piece of domain logic and the one most likely to be needed again (any app with subscriptions, reminders, recurring bills, habit tracking, etc.).

- **Materialize real rows up to a rolling horizon** (e.g. "today + 3 months"), rather than (a) generating infinitely far ahead — impossible for an indefinite/no-end-date rule — or (b) computing occurrences purely virtually at read time. Real rows are needed because individual occurrences must be editable/deletable with a stable identity.
- **Two materialization triggers, one primary and one backstop:**
  - **Lazy-on-read** (primary): whenever a screen is about to display a date range, first ensure materialization covers at least that range. This is what actually keeps things correct as a user browses around.
  - **A periodic backstop job** (secondary): covers users who haven't opened the app in a while, so a rule doesn't go stale from complete inactivity. On mobile with no persistent server, the backstop's job is instead done implicitly by "materialize on app foreground."
- **Idempotency via a unique constraint** on `(ruleId, occurrenceDate)`, and insert with a "skip duplicates" mode. This makes materialization safe to call redundantly (every page load, potentially) without needing external locking — a second call just does nothing where rows already exist.
- **"Just this one" vs. "this and all future occurrences" is the standard recurring-edit shape** (mirrors how calendar apps implement RRULE + EXDATE + RECURRENCE-ID):
  - *Edit/delete just this one*: mark that specific occurrence as an exception (so future materialization runs skip regenerating it), and either update or delete that one row. The rule itself is untouched.
  - *Edit/delete this and all future*: close the *old* rule as of the day before the split point (set its end date, deactivate it), remove already-materialized rows at/after the split date, and — for an edit — open a **new** rule from the split point forward with the edited values, linked back to the old one (a `supersedes` pointer) for lineage/debugging.
  - **Always ask which scope, every time — never default to one.** Silently picking "just this one" surprises a user who meant to reschedule the whole series; silently picking "all future" is worse (unexpected blast radius).
- **When performing the "close old + create new" edit as a multi-step write with no atomic transaction available (see §3.3 below on why), order the steps create-before-destroy.** Create the new rule (and anything that depends on it, like tags) *first*; only after that succeeds, close the old rule and delete its now-superseded rows. If something fails partway through, this ordering means the failure mode is "old and new both briefly exist, causing visible/recoverable duplicate entries" rather than "the old series is closed and its future entries are already deleted, with nothing to replace them" (silent, unrecoverable data loss). This exact reordering fixed a real latent bug in the source project.
- **Normalize different cadences to one common unit using average calendar length, not a fixed 30-day month.** To compare a weekly charge and a yearly charge on the same "per month" basis, use `365.25 / 12` days per month (and derive weeks-per-month from that), not a flat `30`. A flat 30 makes a weekly rule's monthly-equivalent silently shift depending on which real month you happen to be viewing it from.

### 2.4 Deletion policy varies by relationship — pick it deliberately per entity

Two different policies were used for two different entities, on purpose:

- **"In use" blocks deletion** (Accounts): if any transaction references it, deletion is refused with a clear message telling the user to move/delete that history first. Appropriate when silently losing the reference would corrupt historical records the user actually cares about (which account did this money move through?).
- **Reassign to a fallback, deletion succeeds** (Categories → "Uncategorized"): appropriate when the reference is more classificatory than structural — losing "what category was this" is a much smaller loss than losing "what account was this," and blocking deletion here would just be annoying.

Don't default to one policy everywhere; ask what's actually being lost if the reference disappears.

### 2.5 Cross-cutting labels vs. classification — keep them as two separate dimensions

- **Category** = "what kind of thing is this" (mutually-exclusive-ish, drives per-kind charts/budgets).
- **Tag** = "what occasion does this belong to" (free-form, many-to-many, spans multiple categories *and* multiple accounts).
- Don't conflate them. Modeling "a trip" as a category means either losing the item's real category, or cluttering the category list (and skewing any category-based chart) with one-off entries. A tag is the right shape for "these things belong together for a reason unrelated to what kind of thing each one is."

### 2.6 Settings resolution: global default + optional per-entity override

- Store the per-entity value as **nullable**; `null` means "inherit the global default." Effective value = `entityOverride ?? globalDefault`, resolved through **one shared helper function**, called everywhere the setting is read — never re-implement the `??` inline at each call site (it *will* drift).

### 2.7 Multi-currency

- Fix a single reporting currency for the whole app (don't build a general bidirectional any-to-any rate table unless you actually need one — "always convert TO the reporting currency" is dramatically simpler).
- **Batch every currency you need into one external rate-API call**, not one call per currency.
- **Cache with a TTL, and on a cache miss + API failure, fall back to the last-known cached rate (however stale) rather than crashing or silently treating the currency as 1:1.** An external FX API being briefly unavailable should degrade gracefully, not break the app or silently corrupt a total.
- **Per-entity figures stay in their own native currency; only portfolio-level aggregates convert.** Don't force every number in the app into the reporting currency — only the ones that need to sum across currencies.
- If you adopt a "recommended" external API from a spec/plan, **confirm its actual request/response shape against the live API before writing code against it** — the source project's plan correctly named an API but got the exact endpoint/parameter names wrong from assumption, and that would have silently produced empty results everywhere if not caught.

### 2.8 Gauges vs. pies vs. lists — match the chart to the actual question being asked

- **"How much of a capacity have I used, and how much is left?"** → a 2-segment gauge: a fixed total, a "used" arc, a "remaining" arc, with the *remaining amount* as the literal center figure. A flow-ratio pie (each slice sized against the others) buries "how much is left" in subtext instead of making it the headline — this was tried first and reworked after the fact for exactly that reason.
- **"What's the breakdown/composition of a total?"** (asset allocation, spend by category) → a genuine ratio pie, or — once there's also a subtotal per bucket that matters — just a **text list with subtotals**, which is often more legible than forcing a category breakdown into a chart. (The source project ended up moving its category breakdown from a pie into a plain list for exactly this reason.)
- Don't reuse one chart component for both jobs just because it's already built — the two questions need visually different answers.

---

## 3. 🔧 Engineering / architecture patterns (domain-agnostic)

### 3.1 Authorization discipline when the data layer bypasses platform-level row security

If your ORM/data access talks directly to the database and bypasses any platform-provided row-level security (e.g., Prisma connecting straight to Postgres, bypassing Supabase's RLS which only applies to its own REST/client SDK path) — **every single query must filter by the authenticated user's own id, at the query itself, not rely on the platform to do it for you.** Treat platform RLS (if present) as defense-in-depth on top of this, never as the only layer. Re-verify the authenticated user's identity at the top of *every* mutation, not just once somewhere upstream.

### 3.2 Validate once, at the boundary

Validate untrusted input (form submission, API payload) at a single, clearly-defined boundary, producing a typed/safe object that everything downstream simply trusts. Don't scatter re-validation deeper in the call stack — it's redundant and it's also where "which layer is actually responsible for this" bugs come from.

### 3.3 Pooled/serverless Postgres connection gotchas — read this before using an interactive multi-statement transaction

If the database is accessed through a connection pooler running in "transaction mode" (pgbouncer, and equivalents used by Supabase, Neon, PlanetScale, etc.), an **interactive** ORM transaction that spans multiple network round-trips (Prisma's `$transaction(async (tx) => { ...multiple awaits... })`) can silently fail to commit and time out, because the pooler can't guarantee the same physical connection stays pinned to your session across those round-trips. This is a real, documented Prisma error class (P2028), and it bit this project twice.

What actually works reliably against this kind of pooled connection:
- A **single-round-trip batch transaction** (an array of independent operations submitted together, e.g. Prisma's `$transaction([op1, op2, ...])` array form) — this is one request, so it doesn't need session pinning.
- **Plain sequential calls with no transaction wrapper at all**, when a batch isn't expressive enough (e.g., a later step depends on an id produced by an earlier one). When you do this, you've given up atomicity, so **you must explicitly order the steps so a partial failure leaves the system in a safe state** — see §2.3's "create before destroy" rule above; that principle isn't specific to recurring transactions, it applies to any multi-step non-atomic write.

If your new project uses a similarly pooled/serverless Postgres (very common for edge/serverless deployments), assume this constraint from day one rather than discovering it after shipping a bug.

### 3.4 Idempotency via unique constraints, for anything that might run twice

Any process that might legitimately execute more than once for the same logical input (a lazy materializer, a sync job, a webhook handler) should have a database-level unique constraint that makes the second run a safe no-op, rather than depending on external locking or "we'll just be careful." Insert in "skip duplicates" mode against that constraint.

### 3.5 Batch instead of loop for anything that scales with input size

- N sequential round-trips inside a loop (`for (const x of xs) { await db.upsert(x) }`) should become one batched `createMany` + one `findMany`, not N round-trips.
- N independent async operations with no shared state between them should run via `Promise.all`, not a sequential `for...of` with `await` inside.
Both of these were real fixes found during a deliberate N+1 review pass late in the source project — worth doing that kind of pass explicitly once the core features exist, not just reactively when something feels slow.

### 3.6 Never trust a client-supplied id at face value

Any id that arrives from client input (a query string, a request body) — even one that only your own UI could plausibly have sent — must be **re-verified server-side against the authenticated user's own records** before being used in a query (e.g., "export data for these account ids" must re-check that every one of those ids actually belongs to the requesting user). Never assume "it came from our own app" is a safety guarantee.

### 3.7 File export correctness details, if you ever export to CSV

- Emit a UTF-8 byte-order-mark at the start of the file — spreadsheet apps often guess text encoding from the first bytes rather than the file extension, and without a BOM, non-ASCII characters (currency symbols, accented names) render as mojibake when opened in Excel.
- Quote fields per RFC 4180 (any field containing a comma, quote, or newline gets wrapped in quotes with internal quotes doubled) — don't hand-roll comma-joining.

---

## 4. 🔧 Visual design system

The source project went through a deliberate redesign mid-project (the user explicitly asked for "minimalist and futuristic," and a mockup was agreed on before building) — the result is a design language worth reproducing, even though the exact CSS mechanism is web-specific.

### 4.1 Token-based semantic theming, never a hardcoded color in a component

Define a small, named palette and consume only the names, never a raw hex value, from any component:

| Token | Role |
|---|---|
| `bg` | page background |
| `surface`, `surface-2`, `surface-3` | card background, then two levels of "slightly more emphasized" surface (e.g. inputs, pills) |
| `border`, `border-strong` | default and emphasized borders |
| `fg`, `fg-muted`, `fg-subtle` | primary text, secondary text, tertiary/placeholder text |
| `accent`, `accent-soft`, `accent-strong` | brand/interactive color, its soft background tint (e.g. active nav item), and its hover/pressed shade |
| `success`, `success-soft` | positive semantic color (e.g. income) |
| `danger`, `danger-soft` | negative semantic color (e.g. expense, over-budget) |
| a third neutral-but-distinct semantic color (this project used `transfer`, gold/amber) | for any state that must read as clearly "neither positive nor negative" — don't let it fall back to plain foreground color, which reads as invisible/undifferentiated next to a green/red pair |

Define the **same token names** for light and dark, with different values — components never branch on theme directly, they just consume whichever value is currently active. On web this was CSS custom properties (redefined under a dark-mode media query, plus an explicit override attribute for a manual toggle that wins over the OS preference in either direction) mapped into Tailwind's token system. On native mobile the mechanism is different (a theme object consumed through a ThemeProvider/context, or platform-native semantic colors) but the principle — name the roles, never hardcode a hex value in a component, define both themes with equal care — carries over exactly.

**Real bug to avoid**: when you introduce a new dark (or light) background, audit every existing hardcoded color class/value across the whole codebase before shipping — the source project's redesign initially left old hardcoded near-black text classes in place on several screens, which became **literally invisible** (near-black text on the new near-black background) the moment the shared background changed. This is a systemic risk any time a shared background/theme changes after components were built against the old assumption; do a full find-and-replace sweep, don't assume you caught every usage by memory.

### 4.2 "Fintech terminal" numeric styling

- Every money figure renders in a **monospace / tabular-numeral font**, so columns of numbers visually align and the app reads as precise rather than casual. (CSS: a monospace font stack + `font-variant-numeric: tabular-nums`; native: pick a monospace font family for numeric labels.)
- Use the platform's real locale-aware number formatter for digit grouping (this project needed Indian-style grouping, `₹1,53,168.00`, not the Western `₹153,168.00`) — never hand-roll comma insertion, locale grouping rules are genuinely irregular.

### 4.3 Gauges over flow-ratio pies for capacity questions — see §2.8. The same visual idea (fixed-radius ring, a colored arc for "used," a colored arc for "remaining," the remaining amount as the actual center label) ports directly to any native charting/drawing approach (a native charting library, or a custom-drawn arc via the platform's 2D drawing API).

One implementation detail worth knowing if you draw a gauge with inline SVG (or an SVG-like drawing API) and a design-token system: **set color via `style`/inline property, not via a raw `stroke="var(--x)"`-style attribute** — CSS custom properties don't reliably resolve when passed as a raw presentation attribute in every renderer, but do resolve reliably through an actual style object. Not directly relevant to native mobile drawing (different color-binding mechanism entirely), but worth knowing if any part of the new app still renders SVG.

### 4.4 One repeated card primitive, reused everywhere

A single visual container (rounded corners, subtle border, surface-color background, consistent internal padding, a soft shadow) used for every discrete block of content on every screen, rather than bespoke containers designed per-screen. Consistency comes from **reusing one primitive**, not from eyeballing a match each time. On a mobile-only app this matters just as much even without the "responsive grid vs. single column" question that a web app has to solve — the card-as-the-atomic-unit-of-layout idea is the transferable part.

### 4.5 Compact icon actions over repeated text links

A row with several repeated actions (edit / duplicate / delete, applied to many list items) should use small icon-only buttons with an accessible label, not full-word text links repeated down a list — this avoids the row overflowing when content is long, and reads faster once a user recognizes the icon set. Pair this with:
- a **truncating** primary-content column (don't let a long description/name push the row wider than the screen — truncate with an ellipsis instead), and
- a **non-shrinking actions column** (the icon cluster keeps a fixed compact width regardless of how long the content column gets).
This exact combination fixed a real horizontal-overflow bug in the source project's transaction list.

### 4.6 Floating action buttons: plan coordinates, don't just default to "bottom-right"

- Before placing a FAB, check whether that corner is already claimed by something else on the screen (pagination arrows, a system control, another FAB) — a screenshot-based visual check is more reliable here than assuming a corner is free. This project hit a real regression where a newly added floating control sat directly on top of a month-navigation arrow that most screens render in the same corner, blocking it.
- Where multiple floating buttons coexist, stack them with deliberately measured spacing (confirm the actual pixel gap via layout inspection, not by eye) — don't let "roughly stacked" ship as "confirmed non-overlapping."

### 4.7 Cover loading / empty / error explicitly, for every list and every async boundary

- Every list-type screen needs a real empty-state message ("No X yet"), not a bare blank area.
- Every async screen/route needs both a loading placeholder and an error boundary with an explicit recovery action (retry, or go back to a known-good screen) — never a silent freeze or a raw crash.

### 4.8 On "make it look distinctive" requests: actively avoid the generic AI-generated-design cluster

When asked for something like "minimalist and futuristic," there's a well-known cluster of defaults that reads as generic/AI-generated (a lone gradient hero, `rounded-lg` on everything with no real hierarchy, a "safe" geometric sans-serif everywhere, emoji as section markers). This project's actual differentiation came from a handful of *specific, deliberate* choices rather than a vague vibe: a genuinely dark-first palette (not just "dark mode as an afterthought"), monospace tabular numerals as a signature recurring detail across every screen, and an icon-only navigation rail instead of a labeled sidebar. The transferable lesson is the *method* — pick a small number of specific, consistently-applied details that add up to an identity — not the specific palette itself.

---

## 5. 🔧 Process / working style

These are less about code and more about how this session's collaboration actually worked — useful for the new Claude Code session to know upfront, though it should still confirm with you rather than assume these apply identically in the new project.

- **The user drives pacing on multi-phase work.** Plans were broken into explicit phases, and each new phase started only after an explicit go-ahead ("start phase N") — never assume permission to continue into the next phase just because the current one finished cleanly.
- **A living plan/spec file, updated after every commit.** `spec.md` in the source project had a "Build Progress" section appended to after every single commit — brief, factual notes describing what was *actually built* (including bugs found and fixed along the way), not a restatement of intentions. This turned out to be genuinely useful much later in the project for reconstructing "why does this work this way" without re-reading diffs.
- **Auto-push was a standing instruction in this project** — commits were pushed to the remote immediately without asking each time. Don't assume this by default in a new project; confirm it explicitly, since it's a meaningfully consequential default to inherit silently.
- **Verify UI-observable changes live before calling something done** — and when the live-preview tooling itself becomes unreliable (this happened mid-session: a browser-automation pane stopped compositing frames / returning accurate layout measurements), don't paper over it by trusting stale reads. Fall back to a more direct verification method (in this case, a throwaway script that called the actual changed function directly against the database, then was deleted) and say plainly that's what happened, rather than asserting a UI-based test passed when it didn't actually run cleanly.
- **Clean up any test data created against real user data during verification.** Several verification passes in this project created real rows in the user's actual database to confirm a fix worked, then explicitly deleted them afterward — never leave verification artifacts sitting in someone's real data.
- **For genuinely open design/architecture questions, state a recommendation and the main trade-off in a couple of sentences and let the user redirect** — rather than either silently picking one option and building it, or stalling entirely on something you could reasonably make a judgment call on. Reserve actually stopping and asking for decisions with real, hard-to-reverse consequences (e.g., which of two fundamentally different sync architectures to build).

---

## 6. What does *not* carry over unchanged — mobile-only implications

This is the most important section if you're about to start building. The new app being **mobile-only** changes more than the visual layer.

- **The entire mutation layer (Next.js Server Actions) is web-specific and has no mobile equivalent.** The new app needs its own answer: either a real backend API the mobile app calls over HTTP, or — if you're going local-first — a local on-device database as the primary write target, with a separate sync layer reconciling to a backend later. **This is the single biggest architectural fork, and it needs deciding before you write the data layer, not after.**
- **Design for offline-first from day one; don't plan to retrofit it.** The source project explicitly deferred offline support to an unbuilt future phase, and that was a defensible choice *for a web app* (a browser tab reasonably assumes connectivity). It is not a defensible choice for a mobile-only app, where losing signal is a normal, frequent occurrence, not an edge case. Concretely, this means: the domain logic in §2 (balance computation, recurring materialization, budget resolution) needs to be written so it **can run entirely against locally-cached/local-first data**, not assumed to only ever execute behind a trusted server boundary. If you build the business logic server-side first "to get something working" and plan to push it on-device later, expect that port to be a substantial rewrite, not a small adjustment — factor for local execution from the start instead.
- **CSS custom properties / Tailwind's token system don't exist on native mobile.** The *pattern* (a semantic token layer, both themes defined with equal care, no hardcoded colors in components) carries over exactly; the *mechanism* is whatever your mobile framework's equivalent is (a theme object + context/provider, a native ThemeData/resource-file system, etc.).
- **Recharts and inline SVG are web-specific.** The visual *ideas* (a capacity gauge for "used vs. remaining," a ratio pie for composition, tabular-numeral money figures) port directly; the implementation is a native charting library or the platform's own drawing API.
- **A cron-based backstop job has no equivalent on a device with no persistent server process.** The mobile equivalent of "lazy materialize on read + a daily cron backstop for inactive users" is just "materialize on-device whenever the app is opened/foregrounded" — which, notably, was already the *primary* mechanism in the source project, not the backstop, so this is a smaller adjustment than it might sound.
- **The pooled-Postgres connection gotchas in §3.3 are specific to that kind of backend infrastructure.** If the new app's backend uses a different database or a non-pooled connection, that specific constraint may not apply — but the underlying principle (understand your specific infrastructure's transaction/consistency guarantees before writing multi-step non-atomic logic, and order destructive operations after additive ones as a general safety habit) is worth keeping regardless.

---

## Appendix A — reference: core schema shape (adapt field names/types to your own domain)

```
Account
  id, userId, name, type, color, icon, currency (default reporting currency)
  openingBalance, openingBalanceDate   // materialized as a real Transaction row, see §2.1
  creditLimit?                         // credit-card-specific
  budgetModeEnabled?, monthlyBudget?, showFutureTransactions?   // nullable = inherit global, see §2.6

Category
  id, userId, type (INCOME | EXPENSE), name, icon, color, monthlyBudget?

Transaction   // income, expense, AND transfer all live on one model
  id, userId, type (INCOME | EXPENSE | TRANSFER), amount (always positive), date, description?
  accountId?                 // required for INCOME/EXPENSE, null for TRANSFER
  fromAccountId?, toAccountId?   // TRANSFER only, see §2.2
  categoryId?                // required for INCOME/EXPENSE, null for TRANSFER
  isOpeningBalance (bool)    // see §2.1
  recurringRuleId?, occurrenceDate?, isRecurringGenerated (bool), isRecurringException (bool)
  @@unique([recurringRuleId, occurrenceDate])   // idempotent materialization, see §3.4

RecurringRule
  id, userId, type, amount, accountId?/fromAccountId?/toAccountId?, categoryId?, description?
  intervalCount, intervalUnit (DAY|WEEK|MONTH|YEAR), startDate, endDate?, isActive
  lastGeneratedDate?         // materialization cursor
  supersedesRuleId?          // lineage from a "this and future" edit, see §2.3

RecurringException
  id, recurringRuleId, occurrenceDate, action (SKIPPED | MODIFIED), transactionId?
  @@unique([recurringRuleId, occurrenceDate])

Tag                          // free-form, orthogonal to Category — see §2.5
TransactionTag / RecurringRuleTag   // join tables; the latter lets a tag be inherited by every future materialized occurrence

ExchangeRateCache
  currency (id), rateToReportingCurrency, fetchedAt   // see §2.7
```

## Appendix B — reference: design tokens (values from the source project's dark theme; treat as a starting point, not a mandate)

```
--bg: #0b0c10        --surface: #14161c     --surface-2: #1a1d25    --surface-3: #20232d
--border: #262a35    --border-strong: #333748
--fg: #ecedf2         --fg-muted: #8b90a0     --fg-subtle: #5c6072
--accent: #8b7ffb      --accent-soft: rgba(139,127,251,.14)   --accent-strong: #a89bff
--success: #35d0a0     --success-soft: rgba(53,208,160,.12)
--danger: #ff6b80      --danger-soft: rgba(255,107,128,.12)
--transfer: #f5c451    --transfer-soft: rgba(245,196,81,.14)   // "third state," see §4.1
```

Light-theme values were the same token names, tuned separately for contrast against a light background — never derived by mechanically inverting the dark values.
