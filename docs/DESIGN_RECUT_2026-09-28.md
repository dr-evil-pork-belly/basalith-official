# The design recut, September 28, 2026

90 files in `basalith-official` and 9 in `basalith-app`, written to the working
trees by Cowork, uncommitted. The comp is the Artifact "Basalith Recut" (before
and after across the homepage, a pricing card, the owner portal, the threshold
and the iOS app). This doc is the record; the comp is the picture.

    npx tsc --noEmit
    git checkout -b design-recut-2026-09-28
    git add app CLAUDE.md tailwind.config.ts docs/DESIGN_RECUT_2026-09-28.md
    git commit -m "Design recut: one palette, bronze as a thread, ink buttons, one serif"
    vercel

Preview first. This touches every rendered route. Walk the homepage, /pricing,
/succession, /begin, /archive-login, the dashboard, the founding page, the
entity page and one gallery view, at phone width and desktop, before it goes
near main.

## What the feedback was pointing at

Several people said the design was lacking and the colors did not feel right.
They were right, and the cause is specific.

1. The gold was a fill, not a thread. #C4A24A is a saturated yellow. Poured
   into full-width buttons, pricing panels, feature strips and the whole
   sign-in screen it read as brass, and brass reads as cheap. Serious brands
   use gold as a hairline, an eyebrow, a mark.
2. Five grounds on one site. The homepage sat on #F2F0EC, pricing on #FAFAF8,
   the B2B pages on #F4F1EA, the portal on #ECE8E1, the login on near-black.
   Each was fine alone. Together they read as five companies, all skewing
   khaki.
3. The small type was the wrong voice. Space Mono is a display face with
   quirky letterforms, set at 7 to 11 px uppercase with 0.25 to 0.35em
   tracking on nav, buttons, footers, labels and entire feature lists. It said
   "developer tool," fought the serif, and failed the seventy year old on an
   iPad that CLAUDE.md section 10 names.
4. Weight 300 on a warm ground. Two display serifs (Cormorant on older pages,
   Newsreader on newer) at weight 300 print grey on paper.
5. The app never left the vault. iOS was still the retired void palette: black
   ground, gold glow shadows, Georgia and Menlo, a different product from the
   web portal a founder had just left.
6. A long tail of failing text. `rgba(250,248,244,0.28)` and its siblings
   carried real copy on dark sections at 2.5:1 and below. The vault-era greys
   (#5C6166, #9DA3A8) on the game and witness pages measured 3.5:1.

## The system

One palette, two grounds, one button, one serif, one mono.

Grounds
- Paper #F5F3EE, every marketing page. `.b2b-paper` and `.home-stone` both
  resolve to it now; they survive as scopes for their type and layout tokens.
- Stone #ECE9E2, every signed-in surface and the app.
- White #FFFFFF cards, lifted off both.
- Ink #15130F: text, the spine, the threshold, every dark marketing section,
  the block where the record speaks. `--color-void` resolves to it.

Text on light: ink #15130F (15.3:1 on stone), body #3B3730 (9.76), secondary
#5C574F (5.91), label #665F56 (5.19, the floor). Text on ink: bone #F7F5F1
(17.04), #C9C3BA (10.60), #A8A199 (7.26, the floor).

Gold is a thread
- Bronze #6B5522 on light: eyebrows, rules, numbers, accent text. 5.88:1 on
  stone, 6.42 on paper, 7.1 on white. `--color-gold` is bronze at :root,
  because the default ground is paper.
- Champagne #CDB27A on ink: the same jobs. 9.05:1. Every dark scope
  (`.section-dark`, `.stone-invert`, `.portal-threshold`, `.portal-invert`)
  re-points `--color-gold` to it, so a dark block must carry one of those
  classes. Every inline `var(--color-void)` ground in the marketing tree now
  does, and `Section.tsx` adds it for `tone="dark"`. A white card inside a
  dark section carries `paper-card`, which points the text tokens back at the
  light values.
- Hairlines and washes that sit on either ground use `rgba(160,132,80,a)`, a
  mid gold that reads as a line on both.
- Mustard #C4A24A and the old on-light #8A6E30 are gone from every token and
  every component.

The one button
- `--btn` ink with `--btn-label` bone on paper and stone.
- The dark scopes (`.section-dark`, `.stone-invert`, `.portal-threshold`,
  `.portal-invert`) flip the same tokens: bone with an ink label.
- Quiet: 1px outline in the ground's text color. Disabled: outline in the rule
  color. Gold never fills a button.

Type
- Newsreader everywhere, weight 400 and 500. `--font-cormorant`,
  `--font-serif` and `--font-public-sans` all resolve to it. Cormorant
  Garamond is no longer loaded.
- IBM Plex Mono, loaded by `layout.tsx` into `--font-space-mono` so every
  existing `var()` read resolves to it. Eyebrows, timestamps, button labels.
  Floor 11.5 px, tracking 0.14 to 0.18em.

Every ratio above is measured with the WCAG formula on the exact pair. The
table in `app/globals.css` is replaced and is the record.

## What changed, by layer

`app/globals.css`. The whole token layer: root marketing tokens, `--on-dark`
and `--btn` families (new), the paper scope, the stone scope, the portal scope
(`--portal-btn` now reads `--btn`), the threshold, `.section-dark` (now also
carries champagne gold and the flipped button so a dark block inside a light
scope reads correctly), the eyebrow, the button classes, the range input, the
contrast table.

`app/layout.tsx`. Loads Newsreader and IBM Plex Mono only.

`tailwind.config.ts`. Base resets off the amber vault palette (selection,
focus ring, scrollbar); font families and the `gold` and `eyebrow` utilities
onto the tokens; the `amber` and `obsidian` scales onto champagne and ink.

`app/**/*.tsx`, 84 files, by a scripted pass with every rule written down:
- Every gold button became the one button. An ink label meant a gold fill
  within five lines; both were retokened. Buttons on dark grounds (the pricing
  and about closers, the succession, families and integrity CTAs, the game,
  leaderboard, witness, resume and continuity pages) read `--on-dark` with an
  ink label.
- `#0A0908`, `#0D0C0A`, `#0C0B09`, `#141210`, `#111009`, `#14120F` and the
  `var(--void, #0A0908)` fallbacks became `var(--color-void)`.
- `#C4A24A` and `#B8963E` became `var(--color-gold)`, which reads bronze on
  a light ground and champagne inside a dark scope. Alpha gold used as a text
  color became full `var(--color-gold)`.
- `rgba(250,248,244,a)`, `rgba(250,250,248,a)` and `rgba(240,237,230,a)` as
  text became `--on-dark` (a at or above 0.85), `--on-dark-2` (0.55 to 0.85)
  or `--on-dark-3` (0.2 to 0.55). Below 0.2 they are hairlines and were kept
  at bone.
- The vault greys (#5C6166, #9DA3A8, #706C65, #B8B4AB, #3A3830, #3A3F44) and
  the amber (#FFB347, #C47D1A) became the on-ink tokens.
- Old light literals (#FAFAF8, #1A1814, #4A4640, #6A6660, #9A9690) became the
  root tokens.
- Every mono font size below 0.7rem became 0.72rem or 0.78rem; every pixel
  size below 11 became 11.5; every tracking above 0.2em became 0.18em; every
  `fontWeight: 300` became 400. 442 pixel floors, 299 rem floors, 428
  tracking caps, 318 weights.
- Font stacks: Cormorant and Space Mono literals, bare `monospace`, bare
  Georgia, and `"Courier New", monospace` all point at the two loaded faces.

Hand edits after the pass:
- `PricingTiers.tsx`: the featured tier is a lifted white card with a 2px
  bronze top rule, not a black panel.
- `pricing/page.tsx`: the Succession block moved from a black section onto
  paper, its feature list is serif sentences with a bronze dash instead of
  9 px mono checkmarks, and the nested dark Founding card carries
  `section-dark`.
- `ArchiveLayoutClient.tsx`: the active sidebar item is bone with a 1px
  champagne rule, not gold text on a wash.
- `DashboardClient.tsx` and `FoundingBanner.tsx`: the card accent rules are
  bronze; the two buttons that filled with `--invert-gold` read `--portal-btn`.
- `ContributeClient.tsx`: the tier badge is a bronze outline, not a bronze fill
  with bronze text.
- Every inline `var(--color-void)` ground in the marketing tree (36 elements,
  including the footer, the mobile nav drawer, the game, leaderboard and
  witness pages) carries `section-dark`; `Section.tsx` adds it for
  `tone="dark"`. The white cards inside dark sections on /about and /method
  carry `paper-card`.
- Two review passes by a second reader caught and fixed: the pricing
  Succession CTA and the Nav, ApplyForm and PricingTeaser hover handlers still
  painting gold; the dashboard MirrorCard and the contributor entity block
  lacking `portal-invert` (their buttons were ink on ink); on-ink text left on
  the light sections of /posthumous-archive, /asset, /privacy and the featured
  pricing tier; text painted with the 0.12 and 0.2 hairline alphas on the game
  and leaderboard pages; the founding proof note and the contributor chat
  textarea on the inverted block; `.eyebrow` on `bg-obsidian` grounds; the
  demo score bar reading `--portal-btn`.
- `terms/page.tsx`: its light re-theme overrides `.text-amber` to bronze.
- `posthumous-archive/page.tsx`: the one gold hover on paper reads the text
  color instead.
- `CLAUDE.md` section 9 replaced.

`basalith-app`, 9 files:
- `src/theme.ts` rewritten onto the system. Token names were kept so no screen
  had to change; `bone` and `text` are ink, `bg` is stone, `gold` is bronze,
  new `ink`, `onInk`, `onInkBody`, `onInkDim`, `champagne`, `btn`, `btnLabel`.
- `components/index.tsx`: dark status bar and keyboard, ink primary button
  with a bone label, ink outline secondary, cards lifted on a hairline, the
  toast as an ink block with a champagne rule, bronze sigil, mono wordmark.
- `navigation/index.tsx`: the tab bar is the spine, ink with bone and
  champagne; the spark button is ink.
- `components/Chat.tsx`: the entity's messages sit in an ink bubble with a
  champagne rule, as on the web portal. The person's messages are white cards.
- `components/RecordButton.tsx`: ink, red while recording.
- `TimelineScreen.tsx`, `PhotosScreen.tsx`, `App.tsx`, `app.json`: the last
  literals, the root background, light interface style, splash on stone,
  notification accent bronze.

## Verified here

- No hex literal left in any `app/**/*.tsx` except #FFFFFF (three, all card
  fills). No `#C4A24A`, `#0A0908`, `#8A6E30`, `Space Mono` or `Cormorant` in
  any component.
- Every `--btn-label` has a `--btn` within six lines. Every element that
  paints `var(--color-void)` carries a dark scope class.
- No em dash added anywhere (the diff was grepped).
- Every file re-saved with the line endings it had (82 CRLF, 21 LF in the
  web tree).
- Syntax: every edited file parses under strict TypeScript with `--noResolve`.
  The only reports are three pre-existing `unknown` notes that come from
  `--noResolve`, not from the edit.
- Every pair in the contrast table measured on its worst-case ground.

## Not verified here

- The rendered page. Nothing in this pass was previewed. The comp is the
  closest thing. The homepage hero photograph scrim was measured against the
  old bone and is unchanged; check the h1 once.
- `tsc` in the repo with real module resolution. Run it.
- The Tailwind vault palette (`amber`, `obsidian`, `text.amber`,
  `border.amber`, the glow shadows and the monolith button gradients) was
  re-pointed to champagne and ink rather than deleted, because
  `data-ownership`, `ContinuityPillar`, `not-found` and the `[data-theme-terms]`
  block still read those classes. No `text-gold` or `bg-gold` class is used
  anywhere. Deleting the vault utilities is its own pass.
- The mechanical floors flattened some size hierarchy inside mono groups
  (a 0.43rem list under a 0.52rem title are now 0.72 and 0.78). Where a page
  looks flat in preview, the fix is the serif, not a smaller mono.
- `app/components/Hero.tsx`, `HeroSection.tsx`, `IntelligenceLayer.tsx`,
  `ContinuityPillar.tsx` and `AncestorSection.tsx` carry vault-era gradients
  and glows that were retokened, not redesigned. If they are unused, delete
  them.

## Left for the next pass

- The transactional emails (`emails/`, `lib/emails/`) are still on the old
  palette. Slice 5 of the portal decision; same tokens, in inline styles.
- The iOS threshold. The app's sign-in stays on stone; the web threshold is
  ink. Making the app match is a Screen-level change (ink ground, on-ink
  inputs) and is optional.
- Bundling Newsreader and IBM Plex Mono in the app through `expo-font`.
  Georgia and Menlo are the system stand-ins until then.
- The app icon and adaptive icon are dark-with-gold artwork and were left
  alone; `app.json` keeps the #0A0908 adaptive background to match them.
- Nav and footer labels are still mono uppercase. The comp moves them to
  serif sentence case; that is a `Nav.tsx` and `Footer.tsx` layout change,
  not a token change.
- The remaining `text-gold`, `bg-gold`, `font-compute` and `btn-monolith`
  Tailwind utilities in the vault-era route groups.
