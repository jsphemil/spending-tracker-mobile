# Spending Tracker (mobile)

A personal finance app for tracking money across multiple accounts —
bank accounts, credit cards, cash, savings, and investments — built
**local-first** for iOS and Android. There is no developer-hosted
backend: all data lives on the device in a local SQLite database, and
the app works fully offline.

This is a from-scratch mobile rebuild of an existing web app
([jsphemil/claude-spending-tracker](https://github.com/jsphemil/claude-spending-tracker)),
carrying over its feature set and lessons learned but built
mobile-only and local-first, for distribution through the App Store
and Play Store as a standalone, sellable product. See
[`spec.md`](spec.md) for the full product spec and current build
status, and [`backlog.md`](backlog.md) for the detailed change/bugfix
history.

## Status

Feature-complete for v1 as of 2026-08-28 (see `spec.md`'s Status
Dashboard) — every planned feature is built and confirmed working on
a physical device, with a full visual redesign ("Erebor," §5.18) also
shipped. Not yet started: Play Store submission prep (store assets,
privacy policy hosting, monetization, developer account, closed
testing).

## Tech stack

- **[Expo](https://expo.dev) (React Native) + TypeScript**, Expo
  Router for navigation
- **[Drizzle ORM](https://orm.drizzle.team) + `expo-sqlite`** — local
  SQLite is the only data store; there is no server/API
- **NativeWind (Tailwind CSS)** for styling, with a custom dark-only
  design system ("Erebor")
- **Jest** for the service-layer test suite (`__tests__/`)
- **EAS** (Expo Application Services) for production builds and store
  submission

## Getting started

```bash
npm install
npx expo start
```

A native rebuild (`npx expo run:android` / `npx expo run:ios`) is
required after adding any native dependency — a plain Metro/JS reload
isn't enough. This project targets Expo SDK 57, which is newer than
what Expo Go supports; use a development build, not Expo Go.

```bash
npx tsc --noEmit   # type-check
npx jest           # run the test suite
```

## Project structure

- `app/` — screens and navigation (Expo Router, file-based)
- `components/` — shared UI components and forms
- `db/` — Drizzle schema, migrations, queries, and actions
- `services/` — business logic (balances, recurrence, currency
  conversion, CSV export, etc.), covered by the Jest suite
- `theme/` — design tokens, palette, icon mapping
- `spec.md` / `backlog.md` — living product spec and change log;
  check these before making product decisions

## License

**Not yet decided.** The `LICENSE` file currently present is the
default MIT license from the Expo project template (copyright held by
Expo, not this project) — it doesn't reflect an actual licensing
decision for this app and should not be treated as one. This is a
private repository for a paid, closed-source product; an appropriate
license (or an explicit "all rights reserved, no LICENSE file" choice)
still needs to be decided before publishing.
