# Idea Backlog

## Inbox
- 
## Triaged
- **Currency API is completely broken (HTTP 404), not just missing a fallback.** Confirmed live 2026-08-11: `services/currency.ts`'s endpoint (`/v2/latest?base=X&symbols=Y`) 404s against the real Frankfurter API. Correct shape (confirmed against the live API, matching the source repo's `getRatesToINR`): `/v2/rates?base=INR&quotes=X,Y`, response is `[{date,base,quote,rate}]` needing inversion (`1/rate`). Also needs the stale-cache fallback + batching from knowledge-transfer.md §2.7. Accepted into current work — Phase 5.
- **Category isn't required on transactions**, and **amount isn't validated as positive.** `TransactionForm.handleSubmit()` (components/TransactionForm.tsx) submits with `categoryId: null` and lets a negative/zero amount through — source's Zod schema requires both (`categoryId: min(1)`, `amount: positive()`). Reproduced live during device testing 2026-08-11. Accepted into current work — Phase 5.
- **Account currency isn't validated as exactly 3 letters**; credit limit / monthly budget aren't validated as positive. `components/AccountForm.tsx` accepts any string/number. Source validates both via Zod. Accepted into current work — Phase 5.
- **Opening balance of ₹0 shouldn't create a ledger row at all.** `db/actions/accounts.ts`'s `createAccount`/`updateAccount` always insert/update an opening-balance row unconditionally — this is why the golden-path test produced an "Uncategorized · Opening balance · ₹0.00" row (50k was mistakenly typed into Credit Limit, leaving Opening Balance at its 0 default). Source's `syncOpeningBalanceTransaction` deletes the row when amount is 0, creates/updates otherwise. Accepted into current work — Phase 5.
- **Opening-balance transaction rows can be edited/deleted from the normal transaction list**, which shouldn't be possible — source blocks this server-side, redirecting to the account's own edit page instead. Mobile has no such guard on `app/transaction/[id]/edit.tsx`. Accepted into current work — Phase 5.
- **Account deletion has no UI entry point, and a naive one would always fail.** `deleteAccount()` + the FK `onDelete: restrict` policy exist, but every account always has its own opening-balance row referencing it, so deletion must delete that row first or the FK always blocks it — a detail only visible in source's actual `deleteAccount` action, not the summary doc. spec.md §5.1 lists account deletion as v1 scope. Accepted into current work — Phase 5.
- **Balance isn't "as of" the viewed period.** `getAccountBalanceMinor` (services/balance.ts) and `useAccountBalances` (db/queries/balances.ts) always sum the entire ledger with no date filter, so the account detail page's Balance figure doesn't change when navigating to a past month, even though Income/Expense right next to it do. Resolved 2026-08-11: only the account detail page (Balance, credit ring, available-credit) becomes period-scoped; Dashboard's net-worth stays "as of today." Accepted into current work — Phase 5.

## In Progress
- **Visual design system port** (spec.md §5.12) — full token-based theming (light/dark), system-monospace money figures, Card/Button/EmptyState primitives, FAB coordinate audit. Values verified directly against github.com/jsphemil/claude-spending-tracker's `src/app/globals.css`. Started 2026-08-11.

## Done
