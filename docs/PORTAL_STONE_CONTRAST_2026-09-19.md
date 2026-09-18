# Portal stone, the contrast revision, September 19, 2026

Ten files in `basalith-official`, written to the working tree by Cowork,
uncommitted. Follows slice 2. Amends the palette decision in
`claude/BASALITH_PORTAL_PALETTE_DECISION_2026-09-18.md`; the comp
"Basalith Portal in Stone" is republished with the revision.

    npx tsc --noEmit
    git checkout -b portal-stone-contrast
    git add app/globals.css app/archive/ArchiveLayoutClient.tsx app/archive/components app/archive/dashboard app/archive/founding/FoundingClient.tsx app/components/OnboardingGuide.tsx docs/PORTAL_STONE_CONTRAST_2026-09-19.md
    git commit -m "Portal stone: ink spine, deeper ground, lifted cards, dashboard hierarchy"
    git checkout main
    git merge portal-stone-contrast
    git push origin main

## What was wrong

The first production read of the dashboard was washed out. Four causes,
all visible in the screenshot, none of them contrast in the WCAG sense
(every text pair passed).

1. No dark anchor. Every surface on the page sat in one narrow band of
   near-white: ground #F2F0EC, sidebar #F4F2EE, cards #FFFFFF, tint
   #F7F2E6. The only dark object on the page was the greeting. A page with
   nothing dark on it has nothing to be light against.
2. No edges. The rules and card lines measured 1.2:1 and 1.5:1 against
   their grounds. The cards had borders the eye could not find, so the
   five stacked blocks read as one grey field with text in it.
3. No hierarchy. Banner, capture bar, getting-started guide, coverage map,
   memory game: five full-width rectangles of near-equal tone and weight.
   The loudest of them was the onboarding guide, because it was the only
   one with a gold top rule and a tinted ground, and it is the least
   important thing on the page.
4. Thin type on a pale ground. The greeting at weight 300 and the Newsreader
   body at 400 on stone read grey even at 10:1, because the strokes are
   thin and the ground is warm.

## What changed

**The spine.** The sidebar and the mobile bar are now the same ink as the
inverted block (`--portal-spine` #14120F). Nav items in `--spine-body`
#C7C1B8, group labels in `--spine-dim`, the active item in `--spine-gold`
#C4A24A on a faint gold wash. The wordmark is bone on ink. This is the one
move that fixes the read: every page now has a dark left edge, and the stone
content area reads as a lit desk against it instead of a grey field. It also
gives dark a second meaning alongside the archive speaking: dark is
Basalith's frame; stone is the founder's working space. The decision doc's
line that dark survives "in one place only" is superseded by this.

**The ground.** `--portal-bg` #F2F0EC became #ECE8E1, one step deeper.
White cards lift off it now instead of dissolving into it. `--portal-inset`
became #F3F0EB, a step lighter than the ground, for secondary surfaces.

**The edges.** `--portal-rule` #DDD9D2 became #D2CBC0; `--portal-card-line`
#D6D1C9 became #C8C0B4. And every white card gets a lift,
`--portal-lift: 0 1px 0 rgba(20,18,15,0.05), 0 10px 28px rgba(20,18,15,0.07)`,
applied by a scoped selector in `globals.css` to any `div`, `section` or `a`
whose inline style paints `var(--portal-card)`. Inputs, buttons and options
stay flat; a card inside a card does not double up.

**The ink.** `--portal-gold-ink` #7A6129 became #6B5522 (5.83:1 on the new
ground, up from 5.17:1 on the old). `--portal-label` #6E685F became #665F56,
because the old value fell to 4.52:1 on the deeper ground. Every pair in the
ON STONE table was re-measured on the new ground and the table is replaced.

**The dashboard hierarchy.**
- The Founding Sequence banner is the primary object: white card, 4px gold
  left rule, lift, headline 26px weight 500, and the Continue / Begin link is
  now a filled gold button instead of a mono text link.
- The getting-started guide is demoted to a plain white card with a card
  line. It had the gold top rule and the tinted ground; now the banner has
  the weight and the guide sits under it. Its eyebrow and Continue link are
  sentence case.
- The idle memory-game line is no longer a card. It is one line of text
  between two hairlines. It becomes a card again only when a game is live.
- The greeting, the succession greeting and the founding h1 are weight 400,
  not 300.
- Every card on the dashboard, the succession dashboard, the founding page
  and the coverage map carries the lift.

**One copy line.** The getting-started step 1 read "Our AI analyzes each
photo and removes screenshots automatically." That is AI framing on a
consumer surface, which the copy rules forbid. It now reads "Upload
everything from your phone. Screenshots are set aside for you
automatically." The mechanism claim (screenshots set aside) is unchanged
from the original; if that is not real, cut the second sentence.

## Files

    app/globals.css                                tokens, table, spine, lift selector
    app/archive/ArchiveLayoutClient.tsx            sidebar, mobile bar, overlay onto the spine
    app/archive/components/ArchiveSwitcher.tsx     trigger onto spine tokens, dropdown lift
    app/archive/components/FoundingBanner.tsx      primary object treatment
    app/archive/components/CoverageMap.tsx         lift
    app/archive/dashboard/DashboardClient.tsx      hierarchy, lift, h1 weight
    app/archive/dashboard/SuccessionDashboard.tsx  lift, h1 weight
    app/archive/dashboard/TrainingDataCard.tsx     lift
    app/archive/founding/FoundingClient.tsx        panel lift, h1 weight
    app/components/OnboardingGuide.tsx             demoted, copy fixed

All ten written with CRLF, matching what your checkout now has on every
file in the tree.

## Verified here

No hex literals outside `globals.css` (the spine and lift tokens live there
like every other token). No em dashes. No syntax errors under strict
TypeScript. Every text pair re-measured on the deeper ground: ink 15.31:1,
body 9.95:1, secondary 5.87:1, label 5.15:1, gold ink 5.83:1, error 6.62:1,
confirmation 5.23:1; on the spine, nav 10.46:1, group labels 7.08:1, active
gold 7.67:1.

## Not verified here

The rendered page. The comp is the closest thing to it. After the deploy,
the dashboard, the founding page, the entity page and one gallery view; and
the mobile menu, which is now ink with bone items and a gold active state.

## What this does to the remaining slices

Nothing structural. Slice 3 (successor portal, logins, /begin, contributor
page) and slice 4 (Guide portal) read the same tokens and inherit the new
values. The successor portal and the Guide portal have their own sidebars,
which get the spine treatment in their slice. The login pages and /begin
have no sidebar; they need one dark object each, which the slice will
decide.
