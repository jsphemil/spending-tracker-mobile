# Development Status Report — Spending Tracker

_Generated as a snapshot comparison of the current codebase against `spec.md`. Written to stand alone — no prior conversation context assumed._

---

## 1. Overview

The app is a personal finance / multi-account expense tracker built as a Next.js 16 (App Router) + TypeScript + Tailwind v4 web app, backed by Supabase Postgres via Prisma 7, deployed on Vercel with auto-deploy from `main`. **v1 as defined in `spec.md` sections 1–9 is essentially feature-complete** — every core section (Accounts, Transactions, Recurring, Categories, Tags, Spending Summary, Budget Mode, Show/Hide Future, Dashboard, Navigation, Profile) has a working implementation, verified live in-browser at each step per the session history recorded in `spec.md`'s "Build Progress" section. Beyond the original v1 scope, a sizeable roadmap of value-add features has also shipped (net worth trend chart, Goals, debt payoff projection, category-level budgets, asset allocation view, a Quick Add floating button). The two pieces of v1 still outstanding — Claude-powered natural-language entry (spec 5.7) and threshold alerts/notifications (roadmap #12) — are **explicitly on hold per user instruction**, not abandoned or forgotten. A separate "v2" scope (native mobile app via Capacitor, offline-first local storage/sync, backup & restore, Dropbox-style third-party sync) is documented in spec.md section 10 but has **zero implementation** — it's blocked on open architecture decisions (conflict resolution strategy, backup file format, Dropbox's actual role) that need to be made before any code is written. The codebase is small-to-medium sized, single-package (no monorepo), with a conventional Next.js App Router structure (`src/app`, `src/components`, `src/lib/{actions,services,validation,constants}`).

---

## 2. Built and working

### 5.1 Accounts
- Full CRUD for all 5 account types (`SAVINGS`, `INVESTMENT`, `DEPOSIT`, `WALLET`, `CREDIT_CARD` — `prisma/schema.prisma`'s `AccountType` enum), name/color/icon/currency fields.
- Opening balance + opening balance date on creation; internally materialized as a real system `Transaction` row (`isOpeningBalance: true`), kept in sync on edit, cleaned up on delete (`src/lib/actions/accounts.ts`).
- Credit Limit field (optional, credit cards only) drives an "available credit" figure and a limit-scaled utilization gauge (`CategoryPieChart` reused in gauge mode) on the account detail page (`src/app/(app)/accounts/[accountId]/page.tsx`).
- Balances computed live from transactions on every read (never stored) via `src/lib/services/balance.ts` — deliberate, avoids drift on edits/deletes/recurring materialization.
- Account deletion blocked while any transaction (as either leg) references it, including closed recurring rules (`onDelete: Restrict` on the `Transaction`/`RecurringRule` → `Account` relations).
- Multi-currency accounts (`Account.currency`, default `INR`) with live FX conversion to INR for portfolio-level aggregates (`src/lib/services/currency.ts`, Frankfurter v2 API).
- Account list (`src/app/(app)/accounts/page.tsx`) and account detail page both implemented; detail page reuses the same gauge visual as the Dashboard, scoped to that account.
- Account detail page has the three spec'd action buttons: `+ Income`, `+ Expense`, `+ Transfer` (lines ~359–371 of the account detail page).

### 5.2 Transactions
- Single `Transaction` model covers Income/Expense/Transfer (`TransactionType` enum); transfers store both account legs on one row (`fromAccountId`/`toAccountId`), not two linked rows, for atomic edit/delete.
- Full entry form (`src/components/transactions/TransactionForm.tsx`) capturing amount, date, category, account, optional description, optional tags.
- **Recurring transactions** fully implemented: "Make recurring" toggle at entry time (`RECURRENCE_UNITS`: DAY/WEEK/MONTH/YEAR), interval count + unit, optional end date. Materialization is lazy-on-read (`ensureMaterialized` in `src/lib/services/recurrence.ts`) with a rolling 3-month-ahead horizon, backstopped by a daily Vercel Cron (`src/app/api/cron/materialize-recurring/route.ts`, guarded by `CRON_SECRET`).
- Edit/delete of a recurring transaction always prompts "just this one" vs. "this and all future occurrences" (`editSingleOccurrence`/`editFutureOccurrences`/`deleteSingleOccurrence`/`deleteFutureOccurrences` in `recurrence.ts`), matching spec exactly.
- Transactions list (`src/app/(app)/transactions/page.tsx`) with filters by account, category, type (Income/Expense/Transfer), and date range (`src/components/transactions/TransactionFilters.tsx`); defaults to the current month on a fresh visit, with an explicit "Clear (show all time)" override.
- Summary band (green income / red expense two-color bar) above the list (`src/components/transactions/SummaryBand.tsx`), updates with filters.
- Calendar view (`src/app/(app)/transactions/calendar/page.tsx`, shared `src/components/calendar/CalendarMonthGrid.tsx`) with day-level entry and per-day expense totals — also embedded directly in the Dashboard.
- Duplicate-last-transaction quick entry (`?duplicateId=` param on the New Transaction route), prefilling everything except the date (defaults to today).

### 5.3 Categories
- Separate Expense/Income lists, full CRUD (`src/app/(app)/categories/*`, `src/lib/actions/categories.ts`), each with name/icon/color.
- Starter categories auto-seeded on signup (15 expense + 6 income — larger than the spec's illustrative example list, same idea) and backfilled onto existing users via migration (`prisma/migrations/20260809120000_expand_default_categories`).
- Deleting a category reassigns its transactions to "Uncategorized" (`categoryId: null`) rather than blocking, exactly as spec'd — `onDelete: SetNull` on `Transaction.category`.
- Inline "+ New category" quick-add directly from the transaction form (`src/components/categories/InlineCategoryCreate.tsx`) — not in the original spec, an added convenience.
- Category-level monthly budgets (`Category.monthlyBudget`, expense categories only) with progress bar + over-budget banner — this is a roadmap addition (#11), not spec 5.3, but lives in the same UI area.

### 5.3a Tags
- Free-form, reusable, cross-account/cross-category tags (`Tag` model, `TransactionTag`/`RecurringRuleTag` join tables).
- Inline creation at transaction entry time via a comma-separated text input with a `<datalist>` autocomplete (`TransactionForm.tsx`), matching spec's "create a new one anytime while adding a transaction."
- Per-tag summary view (`src/app/(app)/tags/[tagName]/page.tsx`) showing total income/expense/net for that tag plus the full transaction list, exactly as spec describes.
- Tags automatically inherited into every materialized occurrence of a recurring series (`RecurringRuleTag`).
- 8 starter tags seeded per user (Personal, Work, Family, Shared Expense, Reimbursable, Emergency, Gift, Recurring) — an addition beyond spec.

### 5.4 Spending Summary
- Folded entirely into the Dashboard (`src/app/(app)/page.tsx`) rather than a separate page — see **Deviations** below for what changed.
- Month navigation (prev/next), Carry Forward as its own labeled line, Income/Expense as plain figures alongside the visual, all present.
- "All Accounts" total is a true net-worth figure in INR, with credit card debt broken out as its own line (`getAccountBalanceDeltas`/`applyDelta` in `balance.ts`).
- Foreign-currency accounts show both native and INR-equivalent amounts (`src/components/shared/CurrencyAmount.tsx`).
- Indian numbering format (`₹1,53,168.00`) implemented via `Intl.NumberFormat("en-IN", ...)` in `src/lib/services/format.ts`.

### 5.5 Budget Mode
- Global toggle (`Profile.budgetModeGlobal`) plus per-account override (`Account.budgetModeEnabled`, nullable = inherit), resolved via `resolveAccountSettings()` in `src/lib/services/settings.ts`.
- Set on `/settings` (global) and in the account edit form (per-account tri-state select).
- When effectively on, shows a spend-vs-budget progress bar on the account detail page.

### 5.6 Show/Hide Future Transactions
- Same global+per-account override pattern as Budget Mode, same `resolveAccountSettings()` resolution.
- When effectively off, hides future-dated transaction *rows* from the account detail page's current-month list (does not touch totals/balance — a future-dated transaction is still treated as a real recorded commitment).

### 5.8 Dashboard
- `src/app/(app)/page.tsx` is the post-login landing page.
- Shows: net-worth ring/gauge (`src/components/charts/NetWorthRing.tsx`), 12-month (or shorter, if the account history is younger) net worth trend line (`src/components/charts/NetWorthTrendChart.tsx`), Carry Forward/Income/Expense/Credit-card-debt metric strip, embedded month calendar, Accounts list with balances, Recent Transactions (with a working "View all" link scoped to the month being viewed), and Quick Add access.
- Also includes two roadmap additions not in spec: an Asset Allocation composition pie and a compact Goals teaser.

### 5.9 Navigation
- Desktop: 72px icon-only side rail (`SideNav` in `src/components/nav/NavShell.tsx`).
- Mobile: bottom tab bar (`BottomTabBar`, same file) with 6 items (Dashboard/Accounts/Transactions/Commitments/Categories/Profile — Commitments is a roadmap addition beyond spec's listed 5).
- Both nav surfaces are genuinely fixed to the viewport (`(app)/layout.tsx` uses `h-[100dvh] overflow-hidden` with only `<main>` scrolling internally) — this was a real bug found and fixed mid-session; see Known Issues history for the root cause (a `flex-1` + explicit `height` conflict).
- Quick Add floating button (5.12) and the Claude assistant icon slot (5.7, inert placeholder) both present and correctly spaced apart from each other and from the mobile theme toggle (also floating, bottom-left).

### 5.10 Profile Page
- Editable display name, read-only email, change-password form (`src/app/(app)/profile/*`).
- Export Transactions as CSV (matches spec's literal "CSV" requirement) by account (multi-select) and date range, via `GET /api/export/transactions` (`src/app/api/export/transactions/route.ts`), server-side re-verified against the signed-in user's own accounts.
- Sign out present.

### 5.12 Quick Add (Floating Button) — built after spec.md was updated to include it
- `src/components/transactions/QuickAddButton.tsx`, mounted in `(app)/layout.tsx`, visible on every page.
- Opens the transaction form as a modal (not a page navigation) via a dedicated `quickAddTransaction` server action (`src/lib/actions/transactions.ts`) that returns `{ success: true }` instead of redirecting.
- Pre-fills the current account when opened from that account's detail page.
- Supports recurring transactions too (added after an initial "keep it simple" cut that omitted this, per direct user feedback).
- Hides itself entirely for a brand-new user with zero accounts.

### Cross-cutting / infrastructure
- Auth: Supabase email+password (signup/login/logout/password reset), session refresh + route protection in `src/proxy.ts` (see **Tech stack** section for why this isn't called `middleware.ts`).
- Dark/light theme system (not in original spec, added mid-project per user request): CSS custom-property tokens in `globals.css`, manual toggle (`src/components/theme/ThemeToggle.tsx`) persisted to `localStorage`, one instance in the desktop side rail and a second floating instance on mobile.
- Loading/error/404 states: `(app)/loading.tsx`, `(app)/error.tsx`, `(auth)/error.tsx`, root `not-found.tsx`, `global-error.tsx`.
- Accessibility pass: `aria-current="page"` on active nav links, labeled `<nav>` landmarks, skip-to-main-content link.

---

## 3. Partially built

- **Budget Mode / Show-Hide Future Transactions are account-detail-page-only.** Spec 5.5/5.6 don't explicitly scope where these apply, but the current implementation only affects the account detail page — the Transactions list and Dashboard don't yet respect either toggle. This was a deliberate scoping decision (documented in `spec.md`'s Build Progress: "which account's setting applies is ambiguous for a multi-account view") rather than an oversight, but it means the feature is incomplete relative to a reasonable reading of the spec. **To finish:** decide how a global/multi-account view should combine per-account overrides (e.g., "hide future transactions" could apply per-row using each row's own account setting), then apply to `src/app/(app)/transactions/page.tsx` and `src/app/(app)/page.tsx`.
- **Recurring transaction interval is not editable after creation.** `intervalCount`/`intervalUnit` can be set at creation but `editFutureOccurrences()` (`src/lib/services/recurrence.ts`) always carries the old rule's interval over unchanged — only amount, category, account, date, and end date are editable post-creation. Not explicitly required by spec, but a reasonable user expectation gap. **To finish:** add interval fields to the recurring-edit UI in `TransactionForm.tsx` and thread them through `editFutureOccurrences`.
- **Tags have no rename/delete.** Categories and Accounts have full CRUD; Tags only support creation (inline, at transaction entry) and viewing (`/tags/[tagName]`) — there's no tag management UI at all, no `DeleteTagButton` component exists. Not explicitly required by spec 5.3a either, but is asymmetric with how every other entity in the app works. **To finish:** a simple tags list/management page with rename and delete (delete would need a decision on whether it un-tags existing transactions or is blocked while in use, mirroring the Category vs. Account deletion policies).
- **Credit card "second warning lap" is a text note, not a visual.** Spec 5.1 describes overshooting the credit limit as triggering "the same second warning lap as overspending does elsewhere" — implying a distinct ring-animation metaphor. What's actually built is a plain text line, "Over limit by ₹X" (`src/app/(app)/accounts/[accountId]/page.tsx`, ~line 336), with no second-lap ring visual anywhere in the app (the gauge just shows the Used slice at 100% and stops). **To finish:** needs a design decision on what the "second lap" should actually look like before building it — this was flagged as an open design question early in the project and never revisited.

---

## 4. Not started

- **Section 5.7 — Smart Features (Claude-powered natural-language entry + Q&A).** Zero implementation beyond a disabled placeholder button (`src/components/nav/ClaudeFabPlaceholder.tsx` — literally `disabled`, `cursor-not-allowed`, no click handler). No LLM integration, no chat panel, no parsing logic exists anywhere in the codebase. **Explicitly on hold per user instruction** — do not start without being asked again.
- **Roadmap #12 — Threshold alerts / notifications.** No implementation, no schema support (no notification/alert model in `schema.prisma`). **Explicitly on hold per user instruction.**
- **Section 10.1 — Native mobile app (Capacitor).** No Capacitor config, no mobile build target, nothing beyond the responsive web layout. The app is web-only today.
- **Section 10.2 — Offline-first local storage & sync.** No local database, no sync engine, no conflict-resolution logic. The app has zero offline capability — every page/action requires a live connection to Supabase. This needs the conflict-resolution and sync-trigger decisions in `spec.md` §10.2 made before any code can start.
- **Section 10.3 — Backup & restore.** No export/import of a full account snapshot (accounts, categories, tags, goals, recurring rules, settings). The only export that exists is the Profile page's transactions-only, one-way CSV export (`/api/export/transactions`) — it cannot be re-imported and doesn't cover non-transaction data.
- **Section 10.4 — Third-party sync (Dropbox-style).** No OAuth integration, no Dropbox/Drive SDK usage anywhere in `package.json` or the codebase. Entirely conceptual at this point — even its exact scope (backup destination vs. full sync transport) is still an open question in the spec.
- **Sign in with Google/Apple.** Spec 4 mentions this as a possible later convenience; not built, email+password only.
- **Passcode/biometric lock, reminders/notifications, reports/charts beyond monthly summary + pie charts.** All still explicitly out-of-scope per spec §6, untouched.

---

## 5. Deviations from spec

- **Spec 5.4's two category pie charts (income-by-category, expense-by-category) were replaced with capacity gauges + a separate text breakdown.** The Dashboard and account-detail pages originally had literal category-composition pies; over the course of the session these were redesigned twice — first into a 2-segment (Dashboard) / 4-segment (account) flow-ratio pie, then finally into a 2-segment **capacity gauge** (Used vs. Available, or Owed vs. Available Credit for credit cards) because "how much is left" wasn't visible in a pure ratio pie. The actual category/counterpart-account breakdown that spec 5.4 asked for as a pie chart now lives as a **text list with subtotals** in the account detail page's "Breakdown" section (`addToBucket`/`sortedBuckets` in `src/lib/services/breakdown.ts`), not a chart. This was a deliberate, iteratively-arrived-at design choice (documented across several Build Progress entries), not an oversight — but it is a real functional deviation from what spec 5.4 literally describes.
- **The separate `/summary` page was removed; its functionality was absorbed into the Dashboard.** Spec 5.4 implies "Spending Summary" as its own place you navigate to and pick a month; the actual app makes the Dashboard itself month-navigable and IS the summary view — there is no standalone `/summary` route (confirmed: no such file under `src/app/(app)`).
- **Recurring transaction editing only supports amount/category/account/date/end-date changes, not the repeat interval itself** (see Partially Built above) — spec 5.2 doesn't explicitly separate "at creation" vs. "after creation" editability, so this reads as a narrower interpretation than a literal reading might expect.
- **Opening balance is a real, protected `Transaction` row, not just an `Account` field.** Spec 5.1 just says "you enter an opening balance" without specifying the data model; the implementation deliberately materializes it as a system transaction (`isOpeningBalance: true`) so it flows through every ledger query uniformly. This is a positive-direction deviation (fixed a real bug where the opening balance was invisible to the Transactions list) but is still a data-model choice beyond what spec specifies.
- **Dark/light theme system exists**, even though spec §6 originally listed "Dark mode / theme customization" as explicitly out-of-scope for v1. This was added mid-project at direct user request and spec.md has since been updated to mark it "shipped" — not an unplanned scope-creep so much as a documented, requested pivot.
- **CSV export is per spec (spec explicitly says "CSV")** — flagged here only to note the export is one-way (download only, no re-import), which matters for anyone assuming it doubles as a backup mechanism; it does not.

---

## 6. Known issues / bugs

- **Latent Prisma interactive-transaction risk in `editFutureOccurrences()` (`src/lib/services/recurrence.ts`, line ~279).** Supabase's pooled connection (pgbouncer, transaction mode) is documented elsewhere in this codebase as unreliable for Prisma's interactive `$transaction(async (tx) => {...})` pattern — it can time out (Prisma error P2028). This exact issue was found and fixed in `src/lib/actions/accounts.ts` (converted to sequential calls instead), and the fix note explicitly flags that **the same pattern still exists in `editFutureOccurrences` and was never fixed** — editing "this and all future occurrences" on a recurring transaction is the one code path in the app still at risk of this timeout. Low-frequency user action, but a real unresolved bug.
- **Hydration warning on every page load (dev-mode only, cosmetic).** The theme-init inline script (`src/app/layout.tsx`) sets `data-theme` on `<html>` synchronously before React hydrates, which is an intentional flash-of-wrong-theme fix — but it produces a React hydration mismatch warning in the browser console on every load. Confirmed harmless (doesn't affect rendered output) but noisy; a future cleanup could suppress it more cleanly (e.g. `suppressHydrationWarning` on the `<html>` tag).
- **Mobile bottom tab bar labels truncate on narrow screens.** With 6 nav items, labels like "Transactions" and "Commitments" visibly truncate at 375px width. Explicitly accepted as matching the approved design mockup rather than a bug, but worth knowing it's a real constraint, not just a hypothetical one.
- No other unresolved bugs are recorded in `spec.md`'s Build Progress log — every other bug mentioned there (balance-calculation-as-of-today vs. as-of-month-end, account-deletion crash on closed recurring rules, "Left to Spend" ignoring Carry Forward, locked recurring-edit date field, credit card pie showing nothing with zero activity, currency list missing AED, etc.) has a corresponding "fixed" entry with live verification notes.

---

## 7. Tech stack actually in use

| Area | What's actually used | Notes vs. assumptions |
|---|---|---|
| Framework | **Next.js 16.3.0**, App Router, React 19.2.8 | Matches the original plan (Next.js 14+ App Router), but Next 16 introduced real breaking changes from what most training data assumes — see below. |
| Language | TypeScript 5, strict | As planned. |
| Styling | **Tailwind CSS v4** (`@tailwindcss/postcss`), CSS custom-property design tokens in `globals.css`, `@theme inline` mapping | As planned; v4's config-in-CSS approach (no `tailwind.config.js`) is itself a v3→v4 breaking change worth knowing about if extending styles. |
| Database | **Supabase Postgres**, accessed via **Prisma 7.9.1** using `@prisma/adapter-pg` (driver adapter) over `pg` | As planned. Prisma 7's driver-adapter model is newer than a lot of Prisma docs/training data assume (no longer just `new PrismaClient()` — requires an explicit adapter, see `src/lib/db/prisma.ts`). |
| Auth | Supabase Auth (email+password) via `@supabase/ssr` | As planned (spec's recommended v1 choice). |
| Charts | **Recharts 3.10.1** (`LineChart` for net worth trend, `PieChart` for gauges/allocation) plus one **hand-rolled SVG gauge** (`NetWorthRing.tsx`) for the Dashboard hero figure — not Recharts, because CSS custom properties don't reliably resolve as raw SVG presentation attributes but do via inline `style`. | Matches the original "charting via Recharts" plan, with one deliberate custom-SVG exception. |
| Hosting | **Vercel**, auto-deploy from `main`, Vercel Cron (`vercel.json`) for the daily recurring-materialization backstop | As planned. |
| Validation | **Zod 4.4.3** at the Server Action boundary (`src/lib/validation/*`) | As planned. |
| Currency | **Frankfurter API v2** (`api.frankfurter.dev/v2`), no API key, 6-hour local cache (`ExchangeRateCache` table) | Matches spec's explicit recommendation, including the v1-vs-v2 endpoint-shape gotcha spec called out in advance. |
| Auth/session middleware | **`src/proxy.ts`**, not `middleware.ts` | **Real deviation from Next.js convention most training data assumes.** This project's `AGENTS.md` explicitly warns "This is NOT the Next.js you know" — Next.js 16 apparently renamed the middleware entry point/convention to `proxy.ts` with an exported `proxy()` function instead of `middleware()`. Anyone picking this codebase up should read `node_modules/next/dist/docs/` before assuming standard Next.js 14/15 middleware behavior. |
| Package manager | npm (only `package.json`/lockfile present, no `pnpm-lock.yaml`/`yarn.lock`) | As planned. |
| Env vars required | `DATABASE_URL`, `DIRECT_URL` (Supabase pooled + direct Postgres), `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `CRON_SECRET` — see `.env.example` | Matches the original plan's pooled-vs-direct connection split for migrations. |

---

## 8. Suggested next priorities

Ranked by the same value/effort lens `spec.md` §9 already uses (the app's core promise: never overspend, always know net worth, always know fixed commitments — plus "don't let people stop logging transactions"):

1. **Fix the `editFutureOccurrences` P2028 risk** (Known Issues, item 1). Small, contained fix (mirror the sequential-calls pattern already used in `lib/actions/accounts.ts`), but it's a real correctness bug sitting in a code path users will eventually hit — recurring transactions are a headline feature, and a silent timeout on "edit this and all future occurrences" would be a bad first impression of that feature. High value-to-effort ratio, should be done before any bigger new feature.
2. **Extend Budget Mode / Show-Hide Future Transactions beyond the account detail page** (Partially Built, item 1). These are v1 spec features that are only half-applied today. Given the app's core promise is "never overspend," having Budget Mode not visible on the Dashboard or Transactions list undercuts that promise for anyone who set a budget and expects to see it everywhere.
3. **Resolve the v2 decisions blocking section 10**, even if implementation itself waits. Specifically: pick a conflict-resolution strategy (last-write-wins is almost certainly the right v1-of-v2 answer given the effort/value tradeoff already spelled out in spec §10.2), and decide Dropbox's role (backup destination is the much smaller, faster win vs. making it the sync transport). These are pure decisions, not code — unblocking them costs nothing and lets the next phase of work start immediately once you're ready.
4. **Ship the simple JSON backup/restore file** (spec §10.3's "simplest version") independent of any mobile work. It's valuable on the web app *today* (protects against Supabase account loss, lets a user move data between accounts) and doesn't require Capacitor, offline storage, or any v2 architecture decision to build — purely additive to what exists now.
5. **Tag management (rename/delete)** — smallest of the group, but closes a real asymmetry (every other entity in the app is fully manageable; tags aren't) and is a natural companion to whichever of the above gets picked up first.
6. Once 1–5 are through, the roadmap table in `spec.md` §9 already has the next value-ranked candidate queued: **natural-language quick entry (#10, spec 5.7)** — still on hold per explicit instruction, but it's the single biggest differentiator left unbuilt and the FAB slot for it already exists and is wired up (`ClaudeFabPlaceholder`), so it's a "when you're ready" rather than "figure out where it goes" project.
