@AGENTS.md

## Idea Backlog Protocol

At the start of every new task or session, before continuing planned work:

- Check `backlog.md`'s **Inbox** for unreviewed entries.
- For each one, propose one of:
  - **(a) accept now** — fold into `spec.md`, citing the exact section, and move the entry to **Triaged**.
  - **(b) accept later** — fold into `spec.md` as an explicitly deferred item, and move the entry to **Triaged**.
  - **(c) ask a clarifying question first.**
  - **(d) flag it** as a possible duplicate or conflict with existing scope.
- If accepting an idea would reasonably reprioritize currently planned or in-progress work, say so explicitly and ask before reprioritizing anything — never silently reorder the plan.
- When starting work on a **Triaged** item, move it to **In Progress**.
- When an item is actually built AND verified working (not just written), move it to **Done**, noting the date and which `spec.md` section it lives in.
- Only after this triage step, continue with previously planned work.

### Real-time status sync (spec.md ↔ backlog.md)

- `spec.md` has a Status Dashboard table near the top, and each
  numbered feature section (5.1, 5.2, etc.) carries the same status
  tag next to its own heading: ✅ Built & Verified, 🚧 In Progress,
  📋 Planned, ⏸️ Deferred, or ❌ Dropped.
- Whenever a feature's status genuinely changes — work starts on it, it
  is completed AND verified (not just written), it gets deferred, or
  it gets dropped — update **both** the dashboard row and that
  section's inline tag **immediately**, in the same turn the change
  happens. Do not batch this and do not wait to be asked for a status
  report. This applies to all planned work, not only backlog-originated
  changes.
- When a backlog item is marked **Done** (per the rule above), also
  update `spec.md`'s dashboard for the section(s) it touches at that
  same moment, so `backlog.md` and `spec.md`'s dashboard never drift
  out of sync with each other.
