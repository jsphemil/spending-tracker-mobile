# Creating Play Store Assets in Claude Design

This is a step-by-step guide for producing the three missing Play
Store visual assets (app icon, feature graphic, screenshots) using
Claude Design, then handing the results back so they can be wired
into the app and the store listing.

## Can I just give Claude Design the repo?

**No — Claude Design doesn't have file/repo access the way Claude
Code does.** It works from a chat conversation: text descriptions you
type, plus images you upload directly into that conversation. There's
no equivalent of "point it at a GitHub repo and let it explore."

The practical substitute is below: a **brand reference block** (exact
colors, gradient, fonts, tone) to paste into your Claude Design
conversation, plus **real screenshots of the app** to upload as
images. That gives Claude Design everything it would have gotten from
"the repo," just handed over explicitly instead of discovered.

If you already have the **"Erebor Wealth App Design System"** Claude
Design project open (the one used for the app's visual redesign), work
inside that same project so it inherits the design system
automatically — you may not even need to paste the reference block
below in that case, just link back to it ("using the same design
system as before").

---

## Brand reference block (paste this into Claude Design)

```
App: Erebor Wealth Management — a dark, glassy-neon fintech app for
personal finance tracking (accounts, budgets, goals, net worth).

Palette (dark-only design system):
- Background: #0c1120
- Surface: #131a2c
- Surface (elevated): #1a2338
- Text (primary): #f6f8fc
- Text (muted): #97a1bc
- Accent (cyan): #48e7f5
- Accent (blue): #4c7dff
- Success (mint green): #2fe39b
- Danger (coral red): #ff5c72

Primary brand gradient (cyan → blue → violet):
#48e7f5 → #4c7dff → #6e5cff

Typography: Manrope (display/headings, extra-bold/bold weights),
Inter (body text, semibold for numbers/data).

Visual language: dark glass panels (translucent white fills over the
dark background, hairline borders, soft glow shadows in the brand
gradient colors), pill-shaped gradient buttons, rounded-square icon
badges with the brand gradient behind line icons. No light theme
exists — everything is dark.
```

---

## Asset 1 — App icon

**Requirements (Google Play):** 512×512 px, 32-bit PNG with alpha
channel, under 1024 KB.

The app currently has only a generic placeholder icon
(`assets/icon.png`, predates the Erebor redesign) — this needs a real
icon, not just a resize of what's there.

**Prompt to use in Claude Design:**
```
Design a Play Store app icon, 512x512px, for Erebor Wealth
Management, using the brand reference above. A single bold, simple
symbol that reads clearly at small sizes (this will be shown as small
as ~48px on a phone home screen) — think a stylized "E," an abstract
mountain/vault/shield motif (fits the "Erebor" name — a mountain
stronghold), or a minimal wealth/growth glyph. Use the brand gradient
as the icon's fill or background. Avoid fine detail, text, or
photorealism — this needs to stay legible tiny. Export on a solid or
gradient-filled square background (Play Store icons shouldn't rely on
transparency for the main shape).
```

**After exporting:** save it as `project-docs/store/assets/icon-512.png` in the
repo and tell me — I'll generate the adaptive-icon layers (foreground/
background/monochrome) it needs for the in-app Android icon and wire
up `app.json`, since that's a native-asset-slicing step, not something
to do in Claude Design.

---

## Asset 2 — Feature graphic

**Requirements (Google Play):** 1024×500 px, JPG or 24-bit PNG, **no
alpha channel**. Shown at the top of the store listing.

**Prompt to use in Claude Design:**
```
Design a Play Store feature graphic, 1024x500px, for Erebor Wealth
Management, using the brand reference above. Landscape banner:
app name/wordmark ("Erebor Wealth Management") in Manrope bold,
the brand gradient as a background glow or accent element on the dark
background (#0c1120), optionally a glass-panel UI fragment (e.g. a
glowing ring chart or balance card) as a supporting visual on one
side. Keep it clean and readable at a glance — this is marketing, not
a screenshot. No transparency in the export.
```

**After exporting:** save as `project-docs/store/assets/feature-graphic.png` (or
`.jpg`).

---

## Asset 3 — Screenshots

**Requirements (Google Play):** 2–8 images, JPG or 24-bit PNG (no
alpha), each side between 320px and 3840px, long-side:short-side ratio
under 2:1. Portrait phone screenshots (e.g. 1080×2340) are the
standard choice.

**Important — these must show the real app, not an invented UI.**
Google's policy requires screenshots to represent actual app
functionality. Claude Design can dress up a real screenshot (device
frame, background, a short caption) but shouldn't design fictional
screens from scratch.

**Step 1 — get real screenshots.** Use ones already captured on your
Pixel 10 during testing, or take fresh ones now (they should reflect
the current Erebor-redesigned UI). Recommended screens, in order:
1. Dashboard (net worth gauge, trend chart, cards)
2. Account Detail (the ring + budget bar)
3. Transactions (list with filters)
4. Goals (progress bar + pace projection)
5. Commitments or Calendar view
6. Profile (optional — shows Dropbox backup, a differentiator)

**Step 2 — prompt to use in Claude Design** (upload each raw
screenshot as an image in the same message):
```
I'm uploading a real screenshot from my app, Erebor Wealth
Management (brand reference above). Place it inside a clean phone
device frame, on a background using the brand's dark palette and
gradient glow, with a short marketing caption above or beside it
(1 line, e.g. "See your whole net worth at a glance" for the
dashboard). Export at 1080x2340px, no transparency. Keep the actual
app screenshot content unedited and fully legible — don't alter or
redraw the UI itself. Change the account and transactions details such as names, values, etc.
```
Repeat per screenshot, swapping the caption for something specific to
that screen.

**After exporting:** save as `project-docs/store/assets/screenshot-1.png` through
`screenshot-N.png` (matching the order above).

---

## When you're done

Send me the exported files (or tell me they're saved under
`project-docs/store/assets/`) and I'll:
- Slice the icon into Android adaptive-icon layers and update
  `app.json`
- Update `spec.md`'s Store Listing checklist row to ✅
- Flag anything that doesn't meet Play Store's technical specs before
  you upload to Play Console

The actual upload into Play Console (Store listing → Graphics) is a
manual step you'll do yourself once these are ready — I can't submit
things to Play Console on your behalf.
