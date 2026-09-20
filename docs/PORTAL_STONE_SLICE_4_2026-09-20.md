# Slice 4: the Guide portal retired, its two demos kept

September 20, 2026. Twelve files written to the working tree by Cowork,
uncommitted. Answers the question in
`docs/PORTAL_STONE_SLICE_4_RECON_2026-09-20.md`: the portal goes.

This finishes the portal migration. Nothing signed-in, token-gated or
demo-facing carries a void-palette literal any more. Only the emails are left.

## Run it

    npx tsc --noEmit
    npx vitest run app/api/archive/demo/incident/auth.test.ts
    git checkout -b retire-guide-portal
    git rm -r app/archivist
    git rm -r app/api/archivist
    git rm -r app/guide-onboard
    git add app/demo app/archive/demo app/api/archive/demo app/succession/demo
    git add app/globals.css next.config.ts proxy.ts CLAUDE.md
    git add docs/PORTAL_STONE_SLICE_4_2026-09-20.md
    git commit -m "Retire the Guide portal; free its two demos"
    git checkout main
    git merge retire-guide-portal
    git push origin main

One line each. PowerShell does not take `&&`.

The three `git rm -r` lines are the deletions. I cannot delete files on your
machine, so they are yours to run. Everything under them is a business model
you cancelled on September 14, and git history keeps all of it if the model
ever comes back.

## What moved, and the one change to the plan

    /archivist/demo           ->  /demo                   public, noindex
    /archivist/demo/incident  ->  /archive/demo/incident   owner-gated, noindex
    /api/archivist/demo/incident/*  ->  /api/archive/demo/incident/*
    everything else under /archivist/*  ->  308 /archive/dashboard
    /archivist-login          ->  308 /archive-login
    /guide-onboard            ->  308 /

The recon proposed making both demos public. One of them should not be, and I
changed it during the build rather than shipping the proposal as written.

The consumer walkthrough at `/demo` is public, because its APIs
(`/api/demo/entity`, `/api/demo/whitepaper`) were already deliberately public
behind a documented 10-per-IP-per-hour limit. Nothing new is exposed.

The incident demo is not, because its API carries a real gate with a
five-assertion regression test asserting it. Making the page public would have
meant either weakening that gate or shipping a page that 401s on first click.
So the page moved under `/archive` and the guard changed role rather than
strength: the same `getSessionUser()` door, now reading `archiveId` instead of
`archivistId`, because the founder runs every demo now. The test moved with it
and still asserts all five cases; the binding is named `owner` so it does not
shadow the demo session the route builds two lines later.

Both pages keep `robots: noindex`. The precedent is the succession demo, which
made exactly this move in August and is still doing it.

## The palette work

Three demo files, all of which held their colors in a local `C` object. That is
the one place in this migration where re-pointing was a five-line change, and it
is why the demos were worth keeping and the other eleven files were not.

    void/bg     ->  var(--invert-bg)
    gold        ->  var(--invert-gold)
    goldBright  ->  var(--invert-gold-pale)
    text        ->  var(--invert-fg)
    muted       ->  var(--invert-body)
    dim         ->  var(--invert-dim)
    ghost       ->  var(--invert-rule)

Two new tokens in `globals.css`, both measured and in the ON INK table:
`--invert-gold-pale` #D9C4A3 (11.02:1) and `--invert-raise` #1C1A17, the
lighter end of the demos' gradients.

Three contrast bugs fixed, all of them text that has been unreadable in front
of prospects:

    dim   #5C6166  2.99:1  DemoClient, sixteen pieces of text
    dim   #706C65  3.58:1  SuccessionDemoClient, eleven
    ghost #3A3F44  1.76:1  both, three

That last one is the public boardroom demo. It is the single page in this
product an acquisition prospect is most likely to see, and two of its lines
were sitting at 1.76:1.

Also: `#C98B8B` to `--invert-error`, `#121110` gradient stops to
`--invert-raise`, the `SERIF`/`MONO` constants in all three files onto
`--portal-serif` / `--portal-mono`, and every size under the floor raised to
11px mono / 14.5px serif (sixteen, nine and twenty-one instances).

## Two dead links found on the way

Both demos had a fixed "Exit" link in the top right pointing at
`/archivist/dashboard`. After this commit that path is a 308, so the link would
have worked by accident and dumped you on the wrong page. `/demo` now exits to
the homepage, because it is public and a stranger's way out is the front door.
`/archive/demo/incident` exits to `/archive/dashboard`.

## One Guide artifact deliberately left alone

`lib/auth/getSessionUser.ts` still has `'guide'` in `SessionRole`, an
`archivistId` field, and a live query against the `archivists` table. I did not
touch it. Removing the field means dropping or orphaning that table, which is a
migration, and migrations do not run from here. It costs one query per session
resolution and nothing else. When you next have the Supabase editor open, that
is the last piece.

`/join-archivists` needed nothing: it has been a 308 to `/contact` since
September 14.

## Copy

Em dashes stripped: five in DemoClient, six in SuccessionDemoClient, one in the
test. Every "Legacy Guide" and "Archivist" in the files this slice touched is
gone except where a comment records the date the role was retired.

`CLAUDE.md` section 9 now says the portal is deleted rather than "remains as
internal, gated tooling," and the copy rule is no longer "Legacy Guide, never
Archivist" but "the role no longer exists anywhere: not in copy, not in routes."

## Verified here

Zero color literals and zero font literals in the three demo clients. No text
painted with a ground token, no ground painted with a text token. No mono under
11px, no serif under 14.5px. No em dashes. No reference to `/archivist` outside
the redirect table and dated comments. TypeScript under strict with
`isolatedModules` reports no errors in any of the twelve files; the only
diagnostics are the sandbox's unresolvable `@/lib/*` imports. Line endings match
each file's original: CRLF everywhere except `app/demo/DemoClient.tsx` and
`app/demo/page.tsx`, which were LF in the tree they moved from.

## Not verified here

The rendered pages, and the test run. Worth doing in this order:

    npx vitest run app/api/archive/demo/incident/auth.test.ts
    curl -sI https://basalith.ai/archivist/demo        expect 308 -> /demo
    curl -sI https://basalith.ai/archivist/dashboard   expect 308 -> /archive/dashboard
    curl -sI https://basalith.ai/archivist-login       expect 308 -> /archive-login

Then `/demo` signed out, which is the one that matters: it is public now and it
has never been looked at by a signed-out browser. And `/succession/demo`, where
the three contrast fixes are most visible.

## What is left of the migration

**Slice 5, the emails.** Five templates plus `lib/pauseEmails.ts` on the void
palette, the Supabase OTP template on the marketing light palette, so a new
owner still gets a light sign-in email and a dark welcome email the same day.
Needs a recon of `app/api/cron/*` and `app/api/contribute/*` for inline email
HTML first, then one shared `lib/emails/theme.ts` in plain hex, since email
clients do not read CSS variables.

**The iOS app.** `basalith-app/src/theme.ts`, its own pass. That folder is not
connected to this session.
