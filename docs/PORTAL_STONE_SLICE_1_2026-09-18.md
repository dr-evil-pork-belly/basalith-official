# Portal stone, slice 1, written to disk September 18, 2026

Nine files in `basalith-official`, written directly to the working tree by
Cowork (not Claude Code). Nothing is committed and nothing is deployed. The
working tree was whatever branch you had checked out when the files landed;
branch before committing:

    git checkout -b portal-stone-2026-09-18
    git add app/globals.css app/archive/ArchiveLayoutClient.tsx app/archive/components/ArchiveSwitcher.tsx app/archive/components/CoverageMap.tsx app/archive/components/FoundingBanner.tsx app/archive/founding/FoundingClient.tsx app/archive/dashboard/DashboardClient.tsx app/archive/dashboard/SuccessionDashboard.tsx app/archive/dashboard/TrainingDataCard.tsx
    git commit -m "Portal stone, slice 1: shell, founding, dashboard onto the stone register"
    npx tsc --noEmit
    vercel

Do not merge to main until slice 3 is in. Twelve portal files that slice 1
does not touch paint no ground of their own; on production with only the shell
changed they would render bone text on stone.

Decision and tokens: `claude/BASALITH_PORTAL_PALETTE_DECISION_2026-09-18.md`.
Recon and the slice plan: `claude/BASALITH_PORTAL_STONE_BUILD_1_2026-09-18.md`.
Comp: the Artifact "Basalith Portal in Stone".

## Files

    app/globals.css                              111 lines changed
    app/archive/ArchiveLayoutClient.tsx          rewritten
    app/archive/components/ArchiveSwitcher.tsx    55
    app/archive/components/CoverageMap.tsx        56
    app/archive/components/FoundingBanner.tsx     20
    app/archive/founding/FoundingClient.tsx      219
    app/archive/dashboard/DashboardClient.tsx    308
    app/archive/dashboard/SuccessionDashboard.tsx 66
    app/archive/dashboard/TrainingDataCard.tsx   rewritten

CRLF preserved on the four files that had it (globals.css, FoundingClient,
DashboardClient, FoundingBanner), so `git diff` shows the real change.

## What is in globals.css

- `.portal-stone` block at the bottom of the file: every `--portal-*` and
  `--invert-*` token, `--portal-serif` (Newsreader) and `--portal-mono`, plus
  form control, focus ring, placeholder and selection rules scoped to it.
- Three tokens beyond the decision doc, all measured: `--portal-ok` #2F6B3A
  (5.62:1, confirmations only), `--invert-field` rgba(247,245,241,0.07) for
  text fields on the inverted block, `--invert-gold-line` rgba(196,162,74,0.45).
- Contrast table extended with ON STONE (PORTAL), ON THE INVERTED BLOCK and
  ON PORTAL BUTTON, every ratio computed, including two NEVER USE lines:
  `--color-gold-on-light` #8A6E30 (4.24:1 on stone) and the homepage
  `--stone-label` #8A847B (3.26:1).
- The dark `--portal-*` tokens in `:root` (lines 33 to 44) were never read by
  any component. Annotated as retired, left in place. Delete after slice 4.
- File header comment updated.

## What changed in each component

Common to all eight: every hex and rgba literal is now a `var(--portal-*)` or
`var(--invert-*)` read; every inline `fontFamily` serif string is
`var(--portal-serif)`; mono is eyebrows and group labels only and never below
11px. Sub-11px mono was everywhere: the sidebar nav rendered at 8.3px, group
labels at 6.7px, TrainingDataCard's counters at 6.1px.

**ArchiveLayoutClient.** Root div carries `className="portal-stone"`. Sidebar
on `--portal-inset` with a hairline rule. Nav items are Newsreader 16.5px
sentence case; active is ink, weight 500, 2px gold-ink left rule, faint gold
wash; `aria-current="page"` added. Group labels renamed Archive / Contribute /
Manage ("Primary" was a code word, not a reader's word). Seven nav labels
recased: Upload photos, Life timeline, Memory map, My entity, Docs and videos,
Important dates, Email delivery. "Founding Sequence" keeps its capitals. Brand
block: BASALITH in serif, "Archive" under it, then the switcher. Sign out is
11px mono at the bottom; confirm copy is "Sign out of your archive?" with
"Yes, sign out". Mobile bar and overlay on the same tokens, hamburger lines
ink. `<main>` gained `className="portal-main"` and `minWidth: 0`.

**ArchiveSwitcher.** Serif 15px for archive names, dropdown on a white card
with a light shadow. Role chip reads "Contributor" instead of "Contrib". The
streak flame emoji became a mono "14d" count in label grey; say so if you want
the flame back.

**FoundingClient.** Matches the comp. Eyebrows carry a 22px gold hairline via
a `.founding-eyebrow` class in the page's style block. The three call cards
are one hairline row with a status dot (filled gold when done, white with a
gold ring when current, empty when upcoming); the next call's status reads
"Ready to begin". Panels are white cards with a 3px gold top. The question
block sits on `--portal-tint` with a gold-ink left rule. Textarea is a white
field, 18px, gold-ink focus border. The turn counter under the save button is
serif, not mono. `quietLink()` is an underlined serif link; `quietButton()`
(Speak instead, Show me, Try again) is a white bordered button in gold-ink
mono. The proof card's result blocks are the inverted block: one dark panel,
grounded answer on top with the deposit quoted under it, refusal under a
hairline; every color inside is `--invert-*`. Recording dot uses
`--portal-error`. The `textWrap: 'balance'` I wanted on the h1 is left out on
purpose; it depends on the csstype version in your `@types/react`.

**FoundingBanner.** Tint ground, gold-line border, gold-ink left rule,
headline 22px ink.

**CoverageMap.** White card. Backed areas sit on the tint; partial and open
areas sit on the inset, so the thin parts of the map read as the plain parts.
The per-question marks fill with `--portal-btn` gold. The "Read <date>"
stamp is serif, not mono.

**DashboardClient.** Every sub-card is a white card on a card-line border.
The Mirror card is the inverted block (the entity speaking): dark ground,
gold top rule, reflection at up to 26px in `--invert-fg`, thread question in
`--invert-body`, its textarea on `--invert-field`, reaction buttons in
`--invert-dim` with gold when active. Upcoming dates: day numerals serif 24px,
"Today" chip outlined in gold, countdown reads "in 3 days". Memory game:
white card with gold top when live; the copy-link button reads "Link copied"
in `--portal-ok`; the idle card reads "Memory game. The next one opens
Wednesday." Random thought: the dashed capture button lost its 💭 and gained
a gold "+"; button copy is sentence case. Paused banner on the tint with a
"Resume your archive" gold button. Quick links: serif titles at 19px, the
Tailwind `font-sans text-[0.72rem]` descriptions are serif 15.5px. Labels
recased: "Upload photos", "View the gallery", "Next photograph email".

**SuccessionDashboard.** Same treatment as the founding panel: white card,
gold top, tint question block, white textarea. Button copy "Answer a question"
became "Save your answer" (it saves; it does not fetch a question). Ellipsis
on "Saving" dropped.

**TrainingDataCard.** Rewritten. Deposit count is serif 28px ink. Progress
track on `--portal-rule`, fill gold. The em dash in an unrendered `unlocks`
string is gone. The final-stage line no longer says "Contact your Legacy
Guide"; it says "Ask us about voice fine-tuning." That still claims voice
fine-tuning exists as a thing to ask about; if it does not, cut the sentence.

## Verified here

- Zero remaining hits in the eight `.tsx` files for the full literal pattern
  (`#0C0B09 #0C0C0D #0A0908 #141210 #111009 #111112 #1C1A17 #F0EDE6 #F0F0EE
  #706C65 #B8B4AB #3A3830 #3A3F44 #5C6166 #9DA3A8 #4CAF50 #4A8A4A #C4A24A
  #D98C8C #C43E3E`, the rgba families, Cormorant, Georgia, Space Mono,
  `'monospace'`).
- Zero em dashes in the nine files. Zero mono sizes under 11px.
- Syntax: `tsc` with `jsx: preserve`, `strict`, `isolatedModules` on the
  eight files reports no TS1xxx errors. Module resolution errors (next/link,
  `@/lib/*`) are expected here and were filtered; the six TS7006 implicit-any
  errors are downstream of those and match patterns the originals already
  used. The real gate is `npx tsc --noEmit` in the repo.
- Contrast: every new text pair measured against its worst-case ground.

## Not verified here, for you

1. `npx tsc --noEmit` in the repo. lib/frozenLayer.test.ts carries five known
   errors since September 10; anything else is mine.
2. `vercel` preview, viewed signed in: `/archive/founding` in the not-started
   state and after a call, `/archive/dashboard` on the Dr Ha archive, and the
   succession dashboard on a succession-tier archive.
3. Two components on those pages are NOT in slice 1 and will render with
   their old dark values on stone until their slice: `OnboardingGuide.tsx`
   (dashboard, slice 3) and `VoiceRecorder.tsx` (mounted by other portal
   pages, slice 2). FoundingClient's own `VoiceCapture` is done. If
   `OnboardingGuide` shows on your dashboard it will look wrong; that is
   expected and not a slice 1 defect.
4. Tailwind classes in DashboardClient (`rounded-sm`, `border`, `px-6`) are
   unchanged and fine; `font-serif`/`font-sans` classes were replaced with
   inline `fontFamily` so the type is Newsreader.

## Copy strings changed (beyond the nav labels)

"Archive Portal" -> "Archive" (sidebar); "Confirm sign out?" -> "Sign out of
your archive?"; "Yes" -> "Yes, sign out"; "Contrib" -> "Contributor"; "Not yet
started" -> "Ready to begin" (next call only); "Upcoming Dates" -> "Upcoming
dates"; "TODAY" -> "Today"; "3d" -> "in 3 days"; "Memory Game · Next game:
Wednesday" -> "Memory game. The next one opens Wednesday."; "Share Game Link"
-> "Share the game link"; "✓ Copied" -> "Link copied"; "View Leaderboard" ->
"View the leaderboard"; "#1" -> "1"; "Capture This Thought" -> "Capture this
thought"; "Save This Thought" -> "Save this thought"; "✓ Saved" -> "Saved";
"What Your Entity Is Learning" -> "What your entity is learning"; "Respond ->"
-> "Respond"; "Resume Now" -> "Resume your archive"; "Upload Photos" ->
"Upload photos"; "View Gallery" -> "View the gallery"; "NEXT PHOTOGRAPH EMAIL"
-> "Next photograph email"; "Answer a question" -> "Save your answer";
"Contact your Legacy Guide to discuss voice fine-tuning." -> "Ask us about
voice fine-tuning."

## Next

Slice 2 after you have looked at the preview: the rest of `/archive/*` plus
`VoiceRecorder.tsx`, and the cut routes (wisdom, wisdom-exchange, scenarios)
deleted with the `EntityClient` nudge that links to them. Before slice 2, the
`(dashboard)`, `(curator)` and `(auth)` route groups get their 308s in a
commit of their own.
