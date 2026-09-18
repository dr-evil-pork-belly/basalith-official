# Portal stone, slice 2, written to disk September 18, 2026

Twenty-one files in `basalith-official`, written directly to the working tree
by Cowork. Nothing committed, nothing deployed. With this slice every route
under `/archive/*` is on stone, so the slice 1 bridge in the layout is gone.
Slice 1 record: `docs/PORTAL_STONE_SLICE_1_2026-09-18.md`.

    npx tsc --noEmit
    git checkout -b portal-stone-slice-2
    git add app/globals.css app/archive app/components/OnboardingGuide.tsx app/components/VoiceRecorder.tsx docs/PORTAL_STONE_SLICE_2_2026-09-18.md
    git rm app/archive/wisdom/WisdomClient.tsx app/archive/scenarios/ScenariosClient.tsx
    git commit -m "Portal stone, slice 2: every /archive route onto the stone register; retire wisdom, wisdom-exchange, scenarios"
    git checkout main
    git merge portal-stone-slice-2
    git push origin main

The two `git rm` lines are yours because this session cannot delete files on
your machine. `WisdomClient.tsx` and `ScenariosClient.tsx` are no longer
imported by anything (their `page.tsx` files are now redirects) and still
carry 70 void literals between them; they should not survive the commit.
`lib/wisdomSessions.ts` and `app/api/archive/wisdom-session` stay until the
API inventory is checked for other callers.

## Files

    app/globals.css                                  +scrim token, font class map, button overrides
    app/archive/ArchiveLayoutClient.tsx              bridge removed (19 lines)
    app/archive/entity/EntityClient.tsx              255 lines, nudge removed, answers inverted
    app/archive/contributors/ContributorsClient.tsx  190
    app/archive/label/LabelClient.tsx                163
    app/archive/gallery/GalleryClient.tsx            147
    app/archive/videos/VideosClient.tsx              104
    app/archive/upload/UploadClient.tsx              102
    app/archive/succession/SuccessionClient.tsx      102
    app/archive/voice/VoiceClient.tsx                 86
    app/archive/preferences/PreferencesClient.tsx     86
    app/archive/writing/WritingClient.tsx             86
    app/archive/timeline/TimelineClient.tsx           78
    app/components/VoiceRecorder.tsx                  70
    app/archive/dates/DatesClient.tsx                 70
    app/components/OnboardingGuide.tsx                48
    app/archive/memory-map/MemoryMapClient.tsx        44
    app/archive/deposit/DepositClient.tsx             34
    app/archive/wisdom/page.tsx                       308 to /archive/dashboard
    app/archive/wisdom-exchange/page.tsx              308 to /archive/dashboard
    app/archive/scenarios/page.tsx                    308 to /archive/dashboard

OnboardingGuide moved up from slice 3 because it renders on the dashboard,
which shipped in slice 1. Videos and Writing were not in the slice 2 count
because they carried no hex literals; they were on the vault-era Tailwind
theme (`text-white-ghost`, `bg-monolith`, `font-compute`) instead, so they
are here.

## How it was done

The slice 1 pass was file by file. This slice is 16 files and 378 literals,
so it ran as a mechanical pass first (a script mapping each literal to a
token by the CSS property it sits in: `background`, `border`, `color`,
`fill`, `stroke`, and by the literal's family and alpha), then a hand pass
on the 21 lines the script could not classify, then a semantic review of
the whole tree for the three failure modes a mechanical pass produces: text
painted with a ground token, a ground painted with a text token, and text
sitting on a dark scrim in stone colors. Zero of the first two; four of the
third, all fixed (below).

The mapping, for the record:
- Grounds `#111112 #141210 #0C0C0D #0A0A0B #0C0B09` as background became
  `--portal-card`; at alpha (the lightbox and modal backdrops) they became
  the new `--portal-scrim`. As a text color `#0A0908` is the button label.
- Bone `#F0EDE6 #F0F0EE #E8E4DC #D4CFC7 #D0CBC0` and `rgba(240,237,230,>=.5)`
  became ink; lower alphas became secondary.
- `#9DA3A8 #B8B4AB` became body. `#5C6166 #706C65` became secondary, or
  label at low alpha. `#3A3F44 #3A3830` (the old faint) became label, the
  floor for readable text. Nothing on stone is allowed to be fainter.
- Gold as text became gold-ink. Gold as background: >=0.7 alpha is the
  filled button, 0.12 to 0.7 is the tint, under that the wash. Gold as a
  border: >=0.6 is gold-ink, else the gold line.
- `rgba(255,255,255,x)`: backgrounds became the inset, borders the card
  line or the rule.
- Greens (`#4CAF50`, `rgba(120,180,100,x)`) became `--portal-ok`. Reds
  (`#E05A5A #E57373 #8B5555 #B85C5C #C43E3E`, `rgba(224,90,90,x)`,
  `rgba(180,60,60,x)`) became `--portal-error`.
- Every inline serif string became `var(--portal-serif)`; every mono string,
  including bare `'monospace'`, became `var(--portal-mono)`.
- Font size floors: any mono under 11px became 11px; any serif under 13.5px
  became 14.5px. Tailwind `text-[0.52rem]` through `text-[0.85rem]` were
  raised the same way.
- Tailwind theme classes: `text-white-ghost` and its alphas, `text-gold`,
  `border-white/*`, `border-gold/*`, `bg-gold/*`, `bg-monolith`, `bg-obsidian`
  became arbitrary-value classes on the tokens (`text-[var(--portal-ink)]`).

## What is in globals.css

- `--portal-scrim: rgba(20,18,15,0.88)` for lightbox and modal backdrops.
  Anything drawn on it takes the `--invert-*` text tokens.
- Font class map inside `.portal-stone`: `.font-serif`, `.font-sans`,
  `.font-legacy` resolve to Newsreader; `.font-mono`, `.font-compute` to
  Space Mono. A two-class selector outranks the Tailwind utility, so the
  older files keep their classes and render in the portal faces.
- `.btn-monolith`, `.btn-monolith-amber`, `.btn-monolith-ghost` overridden
  inside `.portal-stone`: same shape, portal colors, no gradient, no glow,
  44px minimum height. Eleven buttons across preferences, label,
  contributors and deposit use them. Delete the overrides with the
  component definitions in `tailwind.config.ts` once no portal file uses
  them.
- The em dashes in the file's comments are gone (the copy rule covers every
  file). The box-drawing rules in the section headers are unchanged.

## The inverted moments

Three more places now use the `--invert-*` block, the register reserved for
the archive speaking:
- `EntityClient`: the entity's answers in the chat. Dark block, gold left
  rule, 18px italic Newsreader in `--invert-fg`. The owner's own messages
  stay on the gold wash. This is the founding proof card's treatment carried
  into the conversation.
- `LabelClient` `MilestoneOverlay`: the full-screen milestone moment after
  an upload. It was a scrim with gold numerals; it is now the inverted
  ground with `--invert-gold` and `--invert-fg`.
- `GalleryClient` hover overlay on a photograph: scrim, `--invert-fg` title,
  `--invert-gold` year line.

## Copy strings changed

- Gallery: the em dash placeholder for a missing year is "Undated"; a
  missing location is now empty rather than a dash; "VIEW DETAILS" reads
  "View details"; the loading count shows nothing instead of a dash.
- Contributors: a missing contributor name reads "Unnamed" instead of a dash.
- Deposit: the attribution line no longer opens with a dash.
- Code comments in entity, label, succession, timeline and OnboardingGuide:
  em dashes replaced with colons. No rendered copy changed there.

## Verified here

- Zero remaining hits across the 19 `.tsx` files for the literal pattern
  (every hex and rgba family above, Cormorant, Georgia, Space Mono,
  `'monospace'`, `white-ghost`, `bg-monolith`, `bg-obsidian`,
  `border-white`, `text-gold`, `border-gold`, `bg-gold`).
- Zero em dashes in all 21 files. Zero mono under 11px, zero Tailwind sizes
  under 11px.
- No text painted with a ground token; no ground painted with a text token.
- `tsc` with `jsx: preserve`, `strict`, `isolatedModules`: no syntax errors.
  One `TS2322` in ContributorsClient line 569 is the `RELATIONSHIP_LABELS`
  import from `@/lib/witnessSessions` that this sandbox cannot resolve; the
  line is unchanged from the original and the repo's `tsc` types it.
- CRLF preserved on the four files that have it on disk (globals.css,
  ArchiveLayoutClient, LabelClient, PreferencesClient).

## Not verified here, for you

1. `npx tsc --noEmit` in the repo. The five frozenLayer.test.ts errors are
   the known ones.
2. Preview or production, signed in, one pass through every sidebar item:
   Dashboard, Founding Sequence, Upload photos, Gallery (open a photograph),
   Life timeline, Memory map, My entity (ask it one thing, so you see the
   inverted answer), Contributors (open the invite form), Voice (start and
   stop a recording), Writing, Videos, Docs and videos, Important dates,
   Email delivery, Succession. On a phone or narrow window as well; the
   mobile menu is in the layout and did not change this slice.
3. `curl -sI https://basalith.ai/archive/wisdom` should answer 308 with a
   Location of `/archive/dashboard` once deployed.
4. The `VideosClient` player keeps `bg-[var(--invert-bg)]` behind the video
   element on purpose; a black letterbox is correct there.

## Two things I did not change and want you to look at

- `EntityClient` line 305 still says "Talk to Your Entity" and the message
  label reads "Your Entity". Title case is the old register; the rest of
  the portal is sentence case now. I left them because they are headings
  the copy pass may already have an opinion on.
- `VoiceRecorder` reads "TAP TO RECORD · UP TO 5 MINUTES" in mono caps. It
  is 11px now and readable, but it is the only shouted instruction left in
  the portal. "Tap to record. Up to five minutes." in serif would match the
  founding page's recorder.

## Next

Slice 3: the successor portal (four files), the three login pages, `/begin`,
and the contributor page (`ContributeClient.tsx`, 48 literals, the largest
file left). The login pages and `/begin` use `#0C0C0D`, which is in the
pattern. After slice 3 the retired dark `--portal-*` block at the top of
`globals.css` can be deleted. Slice 4 is the Guide portal; slice 5 the
emails. The `(dashboard)`, `(curator)` and `(auth)` route groups still need
their own 308 commit.
