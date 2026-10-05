// "What's new" (spec.md §5.22). One entry per shipped version, newest
// first — the same wording family as the Play release notes in
// project-docs/store/closed-testing-guide.md, so a tester reads the same
// story in both places. Adding a release means adding an entry here; the
// release checklist in that guide says so.
//
// The version strings must match app.json's "version" exactly: the
// first-launch sheet compares settings.lastSeenVersion against it.

export interface ChangelogEntry {
  version: string;
  date: string; // YYYY-MM-DD
  title: string;
  highlights: string[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: "4.0.0",
    date: "2026-10-06",
    title: "A calmer, clearer Erebor",
    highlights: [
      "A new look in light and dark: quiet neutrals, one clear blue, and colour only where it means something.",
      "The Dashboard now answers four questions at a glance — your net worth and how it moved this month, this month's income and spending, your funds, and anything that needs attention. Tap net worth for the full breakdown.",
      "Transactions has search, a filter sheet, and day-by-day grouping. Tap a transaction to edit it, or press and hold for duplicate and delete.",
      "Accounts are grouped by type, Analytics leads with what changed, and the + button asks whether it's an expense, income or transfer.",
      "Funds, Commitments, Categories and Tags now live under Settings → Manage, and the app runs lighter on older phones.",
    ],
  },
  {
    version: "3.2.1",
    date: "2026-10-05",
    title: "Quick add that closes itself",
    highlights: [
      "Adding a transaction from the home screen widget or an app shortcut now takes you straight back to your home screen once it's saved, instead of leaving the form open — so a second tap can no longer save it twice.",
    ],
  },
  {
    version: "3.2.0",
    date: "2026-10-04",
    title: "What's coming up, and room to tap it",
    highlights: [
      "Commitments now shows when each one is next due, and lists them in the order they'll actually happen rather than by size.",
      "On the Dashboard, each thing needing your attention shows the amount, the account it comes from and your note, so you can recognise it at a glance.",
      "Buttons and last rows no longer hide behind the system navigation bar if you use the three-button layout — forms, settings, the intro and the currency list all sit clear of it.",
    ],
  },
  {
    version: "3.1.1",
    date: "2026-10-02",
    title: "Smaller and quicker",
    highlights: [
      "A build-only release: Erebor is now compiled with full code and resource optimisation, so the app downloads smaller and starts a little faster. Nothing has changed in how it works.",
    ],
  },
  {
    version: "3.1.0",
    date: "2026-09-16",
    title: "Tags with character, accounts a tap apart",
    highlights: [
      "Tags now have their own icon and colour. The Tags screen is a grid of cards showing each tag's transaction count and net amount — switch to a list if you prefer, and the choice sticks.",
      "Edit a tag from its page: rename it, pick a colour and icon, or delete it (its transactions stay, they just lose the label).",
      "On an account's page, tap its name to switch to another account without going back to the list. The month you're viewing carries over.",
    ],
  },
  {
    version: "3.0.1",
    date: "2026-09-15",
    title: "Typing and reading, tidied",
    highlights: [
      "The keyboard no longer covers the field you're typing into — forms scroll the focused field up above it, and the Add money sheet lifts itself out of the way.",
      "Every transaction row now shows the account it belongs to, alongside its category and description, on the Transactions, Account and Tag screens alike.",
    ],
  },
  {
    version: "3.0.0",
    date: "2026-09-11",
    title: "Lock, learn, customise",
    highlights: [
      "Unlock with biometrics: Erebor can ask for your fingerprint, face, or your phone's PIN when it opens. Turn it on under Privacy & Security.",
      "Customise the Dashboard: choose which cards appear and in what order, and which shortcuts sit at the bottom.",
      "Analytics: the net worth trend is a smooth curve, the asset ring marks what's earmarked in funds, and a new chart follows this month's spending day by day against last month's.",
      "Help & Support is now a proper FAQ, with Send feedback and a way to replay the introduction.",
      "First-visit hints on each screen point out what it's for; dismiss them once and they stay gone.",
      "This What's new page, shown once after each update.",
    ],
  },
  {
    version: "2.3.0",
    date: "2026-09-10",
    title: "Widget rebuilt, funds for recurring expenses",
    highlights: [
      "The Accounts home screen widget shows one account at a time with its balance and this month's income, spending and transfers. Tap the name to switch accounts; resize to zoom the whole card.",
      "Recurring expenses can be paid from a Fund, so a pre-funded commitment like an EMI draws the fund down month by month as each instalment lands.",
    ],
  },
  {
    version: "2.2.0",
    date: "2026-09-10",
    title: "Funds",
    highlights: [
      "Set money aside for something specific — a laptop, a trip, next year's insurance — without moving it between accounts. Your net worth doesn't change; the Dashboard now shows what's Earmarked and what's Unallocated.",
      "Spend an expense straight from a fund and it draws down automatically. Edit or delete the expense and the fund adjusts.",
      "Goals has been replaced by Funds.",
      "Net worth is hidden each time you open the app.",
    ],
  },
  {
    version: "2.1.0",
    date: "2026-09-09",
    title: "Quick Add widget",
    highlights: [
      "A Quick Add home screen widget for one-tap Expense, Income and Transfer entry, plus matching long-press app icon shortcuts.",
      "The Dashboard's net worth card gained a privacy toggle.",
      "Fixed the widget picker showing a blank preview.",
    ],
  },
  {
    version: "2.0.1",
    date: "2026-09-05",
    title: "Smaller release builds",
    highlights: ["Android code shrinking turned on for smaller, more secure release builds. No visible changes."],
  },
  {
    version: "2.0.0",
    date: "2026-09-02",
    title: "Erebor V2",
    highlights: [
      "A new four-tab layout: Dashboard, Accounts, Transactions, Analytics — with Commitments, Categories, Funds, Tags and Calendar reachable from Dashboard shortcuts.",
      "A Dashboard built around three questions: where do I stand, how am I doing this month, what needs my attention.",
      "Light, dark and system themes; a daily expense reminder; a new Analytics tab.",
      "Fixed net worth counting next month's already-scheduled transactions, and repeated Save taps writing duplicate transactions.",
    ],
  },
];

// Highest version in the list, i.e. what the What's new sheet shows.
export const LATEST_CHANGELOG_VERSION = CHANGELOG[0].version;

// The one-time sheet fires on the first launch after an update — never on
// a fresh install, whose onboarding writes lastSeenVersion itself.
export function shouldShowWhatsNew(
  settings: { onboardingCompleted: boolean; lastSeenVersion: string | null },
  currentVersion: string,
): boolean {
  if (!settings.onboardingCompleted) return false;
  if (settings.lastSeenVersion === currentVersion) return false;
  // Only fire when there is actually an entry to show for this version.
  return CHANGELOG.some((e) => e.version === currentVersion);
}

export function changelogFor(version: string): ChangelogEntry | undefined {
  return CHANGELOG.find((e) => e.version === version);
}
