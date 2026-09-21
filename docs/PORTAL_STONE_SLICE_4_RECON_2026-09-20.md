# Slice 4 recon: the Guide portal, and the vault route groups retired
September 20, 2026

Two things in this document. The route groups are done and on disk. The Guide
portal is a recommendation with a question, because the honest answer to
"recolor slice 4" is that most of slice 4 should not exist.

## Done: the vault route groups

Nine files written to the working tree, uncommitted.

    npx tsc --noEmit
    git checkout -b retire-vault-routes
    git add "app/(dashboard)" "app/(curator)" "app/(auth)" docs/PORTAL_STONE_SLICE_4_RECON_2026-09-20.md
    git rm "app/(dashboard)/dashboard/curators/page.tsx.orig" 2>$null
    git commit -m "Retire the vault route groups: 308 /dashboard, /curator and /join"
    git checkout main
    git merge retire-vault-routes
    git push origin main

(One line each. The `git rm` line is only there if git reports a leftover; skip
it otherwise.)

    /dashboard             308 -> /archive/dashboard
    /dashboard/curators    308 -> /archive/contributors
    /dashboard/files       308 -> /archive/gallery
    /dashboard/milestones  308 -> /archive/dashboard
    /curator               308 -> /archive/dashboard
    /curator/essence       308 -> /archive/dashboard
    /join                  308 -> /begin

The two group layouts became pass-throughs. They were client components that
gated with `supabase-browser` after the shell had already shipped, and both
redirected unauthenticated visitors to `/login`, which has itself been a 308
since September 17. Each redirect points at the page that replaced the old one
rather than dumping everything on the dashboard.

Why they were safe to retire, from the September 18 recon: `proxy.ts` never
gated them, nothing outside the groups linked in, `/dashboard` linked to
`/dashboard/vault` which has no page, and every file was untouched since
May 19.

## The recommendation: do not recolor the Guide portal

The slice plan assumed slice 4 was two files and 23 literals. The full recon
says it is closer to twenty files. But the size is not the argument. This is:

**The Guide portal is the apparatus for a business model you cancelled on
September 14.** Its navigation is Dashboard, My Practice, Earnings, Marketing,
Certification, Settings, with Leaderboard, Onboard, Resources and Training
behind it. Read that list as a stranger would: a prospect pipeline, a
commission ledger, sales collateral, certification modules and a leaderboard.
That is a contractor sales force, and the GTM decision says there will not be
one, "now or later."

Evidence from disk, September 20:

- Nothing anywhere in `app/` or `lib/` links to `/archivist/*`. The only
  matches outside the tree are the `archivist_id` database column in the
  vault-era route groups retired above.
- Every file predates the September 14 decision. The most recent is
  `training/page.tsx` in mid-August; most are June or earlier.
- `CLAUDE.md` already records the position: the public site no longer
  describes a Guide network, and the term "survives only inside the gated
  Guide portal."

Recoloring it would be the same mistake I have now avoided three times in this
migration, at three times the size: the wisdom routes in slice 2, the
application flow in slice 3, and the route groups above. Roughly 168 color
literals across eleven files, plus the certification module and exam clients
that were never counted, to make a cancelled business model look good on a
screen nobody opens.

## What is worth keeping, and the precedent for it

Two things in that tree are yours, not a Guide's:

    app/archivist/demo/DemoClient.tsx              32 literals
    app/archivist/demo/incident/IncidentDemoClient.tsx   18 literals

The consumer walkthrough and the CDM incident-capture demo. You pitch with
these. They are gated behind a "certified Legacy Guide" session for a role
that no longer exists, which means today you have to sign in as a Guide to
demo your own product.

The precedent is already in the repo and it is the right one. The B2B
succession demo used to live at `/archivist/demo/succession`; it was moved to
`/succession/demo`, public and login-free with `robots: noindex`, and the old
URL left as a 308. That file is still there doing exactly that.

So the proposal is to finish that move:

    /archivist/demo           ->  /demo          public, noindex, recolored
    /archivist/demo/incident  ->  /demo/incident public, noindex, recolored
    everything else under /archivist/*  ->  308 to /archive/dashboard
    /archivist-login          ->  308 to /archive-login
    proxy.ts                  ->  drop the /archivist gate

That is two files recolored instead of thirteen, one fewer login surface to
maintain, and the word "Archivist" finally gone from the routes as well as the
copy. The Guide portal's git history keeps everything if the model ever comes
back.

## The question

Do you want that, or do you want the Guide portal kept alive and recolored?

Keep it if there is something I cannot see from disk: a Guide friend actually
using it, or a plan to revive the model that has not been written down. If it
is being kept only because it exists, retire it. It has been sitting there
since May collecting a palette it will now never need.

If you say go, slice 4 becomes: free the two demos, 308 the rest, and the
portal migration is finished except for the emails.

## Still open after this

**Slice 5, the emails.** Unchanged since slice 2 flagged it. Five templates
plus `lib/pauseEmails.ts` on the void palette, the Supabase OTP template on
the marketing light palette, so a new owner gets a light sign-in email and a
dark welcome email on the same day. Needs a recon of `app/api/cron/*` and
`app/api/contribute/*` for inline email HTML first, then one shared
`lib/emails/theme.ts` (email clients do not read CSS variables, so it is plain
hex imported from one file).

**The iOS app.** `basalith-app/src/theme.ts`, its own pass after the web
settles. That folder is not connected to this session.
