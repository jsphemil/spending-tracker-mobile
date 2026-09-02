// widgets/refresh.ts reaches the Glance widget through a native Expo
// module, which Jest's node environment can't load — importing it in a test
// fails the whole suite at parse time. services/recurrence.ts legitimately
// needs to trigger a widget refresh (materializing a rule moves real
// balances), so the native boundary is stubbed here rather than pushing
// that call somewhere less correct just to keep the service importable.
export function refreshAccountsWidget(): void {}
