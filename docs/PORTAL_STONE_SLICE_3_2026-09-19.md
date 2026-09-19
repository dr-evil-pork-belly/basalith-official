# Portal stone, slice 3, written to disk September 19, 2026

Fifteen files in `basalith-official`, written to the working tree by Cowork,
uncommitted. This finishes the portal: no signed-in or token-gated surface
carries a void-palette literal any more.

    npx tsc --noEmit
    git checkout -b portal-stone-slice-3
    git add app/globals.css app/archive-login app/archivist-login app/succession app/begin app/contribute docs/PORTAL_STONE_SLICE_3_2026-09-19.md
    git rm app/components/BeginProgress.tsx
    git commit -m "Portal stone, slice 3: the threshold register, successor portal and contributor page; retire the old application flow"
    git checkout main
    git merge portal-stone-slice-3
    git push origin main

Each line separately. PowerShell does not take `&&`.

`BeginProgress.tsx` is the step indicator for the retired application flow and
is imported by nothing else; I cannot delete files on your machine, hence the
`git rm`.

## The decision this slice rests on

Slice 3 is not one register, it is three kinds of page, and they were three
different palettes on disk. Sorting that out is the substance here.

**The threshold.** Sign-in (owner, Guide, successor), `/begin`, and the
contributor not-found page. These carry no founder content; they are entirely
Basalith's own frame. They stay dark, and they move onto the same `--invert-*`
family as the spine and the block where the archive speaks. So the product now
has one dark with one meaning, not two darks with none: **dark is Basalith and
the archive; stone is the founder at work.** A founder signs in through the
dark and the workspace lights up. New scope: `.portal-threshold`.

**The successor portal** (four pages). A workspace, so stone, with the same
treatment as the owner portal. It has no sidebar, so its top bar became the
spine: ink, bone text, gold mark. That is the dark anchor every other portal
page gets from its sidebar.

**The contributor page.** This one was never on the void palette at all. It was
on the *marketing* light palette (`#FAFAF8`, `#1A1814`, `#B8963E`,
`rgba(26,24,20,…)`), which is why it looked nearly right and was nonetheless
a third system. It is now on the portal tokens like every other working
surface.

## globals.css restructured

The shared tokens moved from `.portal-stone` up to `:root`, so a value exists
once and both registers read it: the two font tokens, the whole `--invert-*`
family, and the gold button trio. `.portal-stone` keeps only what is specific
to stone; `.portal-threshold` is new and paints the ink ground.

The retired dark `--portal-*` block in `:root` (`--portal-surface`,
`--portal-alt`, `--portal-text`, `--portal-muted`, and the rest) is **deleted**.
It was marked for deletion after the last portal slice; this is that slice.
Nothing ever read it.

Two new measured tokens, both for text on ink: `--invert-error` #E08B8B
(7.33:1) and `--invert-ok` #7FB685 (7.95:1). The contrast table's spine section
is now **ON INK**, covering the spine, the threshold and the inverted block in
one place, with three NEVER USE lines: `#5C6166` (3.5:1), `#3A3F44` (1.7:1),
and `#C47D1A` (4.1:1, the marketing `.eyebrow` orange).

The font-class map, the `btn-monolith*` overrides and the focus ring now cover
`.portal-threshold` as well as `.portal-stone`. The marketing `.eyebrow`
component is orange public-sans; inside the threshold it is overridden to the
portal eyebrow, gold mono.

## Inverted blocks added

The successor's entity answers. The founder's judgment in the founder's words,
in the dark block, with a gold left rule. This is the moment the whole
succession product exists for, and it now gets the same treatment as the
founding proof card and the owner's entity.

The contributor page's entity section. It was already dark, on a stray
`#0F0F10` that appears nowhere else; it is now the real inverted block. Its
rating buttons (accurate, partial, inaccurate) were `#4CAF50` / `#C4A24A` /
`#ff6b6b` with a `${color}40` string-concatenated border, which cannot work
with tokens; they are now `--invert-ok` / `--invert-gold` / `--invert-error`
on a shared rule, 32px tall instead of 2px of padding.

## Two routes retired

`/begin/tier`, `/begin/details`, `/begin/review`, `/begin/confirmed`: the old
three-step application flow, replaced by the self-serve trial on September 17.
Nothing links to them, not even each other. All four are now 308 redirects to
`/begin`, on the same pattern as the wisdom routes in slice 2.

## A latent bug fixed on the way

The wordmark on all three sign-in pages and `/begin` rendered its "ai" suffix
with `color: var(--text-muted)`. That token does not exist; the file defines
`--color-text-muted`. The declaration was invalid, so the text inherited
whatever was above it. It is now `--invert-dim`.

## Copy touched

"Successor Portal" is now "Successor portal" in the top bar, and the mono
tracking across the successor portal went from a flat `3px` to the portal's
`0.24em`. Nothing else changed.

## Verified here

Zero hex literals in all fourteen components. Zero em dashes. No mono under
11px and no serif under 14.5px. No text painted with a ground token and no
ground painted with a text token; four such pairs were found and fixed, one of
which was a textarea with ink text on an ink background that has presumably
been invisible to every contributor who ever typed in it. No stone token
referenced inside a threshold file. `tsc` under strict with `isolatedModules`
reports no syntax errors; the only remaining diagnostics are the sandbox's
unresolvable `@/lib/*` imports. CRLF on every file, matching your tree.

## Not verified here

The rendered pages. In particular: the three sign-in pages and `/begin` on ink,
the successor portal end to end on a succession-tier archive (the four pages,
and one question asked so you see the inverted answer), and the contributor
page opened from a real invitation email link, which is the one page in the
product a stranger sees first.

`curl -sI https://basalith.ai/begin/tier` should answer 308 to `/begin`.

## What is left

Slice 4, the Guide portal (`app/archivist/*`), internal tooling, lowest
priority, and it needs its own recon first: only `layout.tsx` and
`dashboard/DashboardClient.tsx` were ever counted.

Slice 5, the emails. Five templates plus `lib/pauseEmails.ts` are still on the
void palette, and the Supabase OTP template is on the marketing light palette,
so a new owner still gets a light sign-in email and a dark welcome email the
same day. Needs a recon of `app/api/cron/*` and `app/api/contribute/*` for
inline email HTML first, then one shared `lib/emails/theme.ts`.

Still open from slice 2: the `(dashboard)`, `(curator)` and `(auth)` route
groups need their 308 commit.
