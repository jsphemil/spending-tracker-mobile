# Production access application — answers as submitted

Submitted 2026-09-16 07:13 from Play Console ("We're reviewing your
application form … usually takes seven days or less"). Kept here so
the record of what Google was told sits beside the closed-testing
history in `closed-testing-guide.md`, and so a future app's form can
start from a real, accepted-or-rejected example.

**Why these and not the Testers Community draft.** The paid tester
round came with pre-filled answers (`project-docs/product/
erebor_production.pdf`). Its answers 4, 8 and 10 said the app had
*added Google Sign-in and email sign-in* — the two suggestions
deliberately declined as contrary to the local-first design — and the
rest was generic. A reviewer reading the release notes would have
found the form contradicting the app. These were rewritten from what
actually happened.

Facts the answers rest on: eight closed-testing updates between
2026-09-01 and 2026-09-15 (versionCode 9 → 18); a Testers Community
report finding no crashes and no bugs with eight suggestions, six
built, two declined; two defects found by the developer's own
second-device testing and fixed; Pre-launch report showing nothing
flagged; two "User experience" advisories (portrait lock, RN-internal
deprecated edge-to-edge calls) noted as non-blocking.

---

**1. How did you recruit users for your closed test?**

I used Testers Community's paid tester service, which supplied testers
across a range of Android devices and OS versions, together with a
public Google Group opt-in link (erebor-wealth-management-testers) so
people could join without handing over an email address individually.
I also ran every build on two of my own phones with real financial
data alongside the testers. Testers Community returned a written
feedback report and a device-compatibility summary at the end of the
round.

**2. How easy was it to recruit testers?** — Easy

**3. Describe the engagement you received from testers**

Testers installed each of the eight closed-testing updates I shipped
between 1 and 15 September (versionCode 9 through 18) and exercised
the full flow: creating accounts, recording income, expenses and
transfers, using the home-screen widgets, backing up to Dropbox and
restoring. The formal report found no crashes and no functional bugs
across all devices and returned eight concrete enhancement
suggestions. My own testing on a second device surfaced two real
defects (a recurring expense couldn't be linked to a fund; a fund's
balance wasn't stable after closing), both fixed in later updates.

**4. Summary of the feedback received, and how it was collected**

Feedback arrived as a written Testers Community report plus notes from
my own two-device testing. The report's key points: no crashes or
bugs; the app lacked an in-app walkthrough for new users; it should
offer in-app feedback, a "what's new" page, a FAQ, richer charts and a
customisable dashboard; and it suggested adding Google/email sign-in.
My own testing found the keyboard covering form fields near the bottom
of the screen on edge-to-edge Android, and inconsistent transaction
rows between screens. I built six of the report's suggestions and
declined the sign-in ones, because Erebor is deliberately local-first
with no server — its cross-device story is the user's own Dropbox
backup.

**5. Who is the intended audience?**

Individuals who want to understand their whole financial position —
net worth across bank accounts, cash, credit cards, deposits and
investments — rather than only log expenses. It suits people with
several accounts, sometimes in more than one currency, who prefer
their financial data to stay on their own device with no account to
create and no server holding it. It is not aimed at businesses or
shared household ledgers.

**6. How does the app provide value?**

Erebor answers three questions on one screen: where do I stand (net
worth, assets, debt), how is this month going (income, spending,
what's left), and what needs my attention (over-budget categories,
commitments due, funds coming up). Beyond recording transactions it
adds recurring commitments normalised to a monthly figure, Funds for
earmarking money for a purpose without moving it between accounts,
category budgets, multi-currency conversion, analytics over time,
home-screen widgets, CSV export, and backup to the user's own Dropbox.
Everything works offline and nothing leaves the device unless the
user backs it up.

**7. Expected installs in the first year** — the modest band (0–500 /
501–1,000), as chosen on the form.

**8. What changes did you make based on the closed test?**

Eight updates shipped during testing. From the tester report:
first-visit hints on each screen and a replayable introduction (the
"walkthrough" request); Help & Support rebuilt as a FAQ with Send
feedback; a What's new page shown once after each update; a
customisable Dashboard (hide, reorder, choose shortcuts); a smoothed
net-worth trend, an earmarked-funds marker on the asset ring and a
day-by-day spending chart. From my own testing: the keyboard no longer
covers the field being typed into; every transaction row now shows
account, category and description consistently; recurring expenses
can draw from a Fund; the Accounts widget was rebuilt; a biometric app
lock was added. Two suggestions — Google and email sign-in — were
deliberately not built, as they conflict with the app's no-server
design.

**9. How did you decide the app is ready for production?**

Three signals. The independent tester report found no crashes and no
functional bugs across all devices tested, and every update since has
been verified on two physical phones before release, including a
Dropbox backup-and-restore round trip after each schema change. Every
enhancement the testers asked for that fits the product has shipped,
and the two that don't were declined with a reason rather than left
hanging. Release builds run with code shrinking enabled and have been
stable for six updates. What remains on the backlog is refinement, not
missing basics.

**10. What did you do differently this time?** — not applicable on a
first application.
