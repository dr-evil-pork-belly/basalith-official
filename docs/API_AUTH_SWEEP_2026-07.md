# API auth sweep, `/api/archive/*` and `/api/mobile/*` (July 2026)

Produced during `fix/mirror-ownership`. This is the input document for the
category-(d) session. It is a snapshot of live code read on 2026-07-26, not a
design doc. Re-verify before acting on any single line.

## Status as of commit `fix/contributors-write-auth`

**Fixed in `fix/mirror-ownership` (7 route files).** `mirror` GET, `mirror/react`
POST, `photo-url`, `contributors` GET, `documents/[id]`,
`archive-videos/[id]/play`, `archive-videos/[id]`. Each verifies
`archives.owner_user_id === session.userId` and, where addressed by row id,
filters the row query on `archive_id` too. Regression coverage is part 3 of
`app/api/archive/unauth-access.test.ts`.

**Fixed in `fix/contributors-write-auth`.** `contributors` POST, PATCH, and
DELETE. The `contributors` route file is now closed on all four methods. Each
write derives `archiveId` from the session; the caller-supplied parameter was
removed rather than validated. DELETE additionally scopes the target row to the
session archive before writing, so an archive id plus an arbitrary contributor id
is no longer authority. Regression coverage is part 4 of
`app/api/archive/unauth-access.test.ts`.

**Still open.** The remaining category-(d) routes in the table below, plus the
category-(a) routes that check `session.archiveId` without verifying ownership.

**Recorded, not fixed.** `proxy.ts` uses `pathname.startsWith('/archive')`, which
also matches `/archive-login`, so an unauthenticated hit on the login page
appears to redirect to itself. Untouched here because this was a security commit
and that is a security file.

## The lesson this document exists to carry

The July 2026 mobile-shim hotfix (OWASP A01, CLAUDE.md section 7) hardened
`/api/mobile/*` and the mobile-facing `/api/archive/*-mobile` routes, and left
the rest of `/api/archive/*` open. The most likely reason is that the dashboard
pages sit behind `proxy.ts`, so the routes those pages call were assumed to
inherit that gating.

They do not. **Pages are gated. The API routes they call are not.** Page-level
protection says nothing about who can call an endpoint directly, and every one
of these routes runs on the service-role client, so RLS is not a second line of
defence either. Any future auth work on this codebase should assume an API route
is unprotected until its own handler is read.

## Why this exists

The web mirror route authorized on `session?.archiveId` alone. Because
`lib/auth/getSessionUser.ts` fills `archiveId` from the successor row when the
caller owns no archive, a signed-in successor could read the owner's latest
reflection. Sweeping for siblings of that bug turned up a second and worse
class: routes with no authentication at all.

## The structural finding

`proxy.ts` is edge middleware whose matcher covers everything except static
assets, but `PROTECTED` lists only three page prefixes:

```ts
const PROTECTED: { prefix: string; loginPath: string }[] = [
  { prefix: '/archive',           loginPath: '/archive-login' },
  { prefix: '/archivist',         loginPath: '/archivist-login' },
  { prefix: '/succession/portal', loginPath: '/succession/login' },
]
...
  const match = PROTECTED.find(p => pathname.startsWith(p.prefix))
```

`/api/archive/journal` does not start with `/archive`. **No route under `/api/`
is gated by middleware.** The dashboard pages are protected; the API routes they
call are not. Every route below runs on `supabaseAdmin` (service role), which
bypasses RLS, so RLS is not a second line of defence here.

This is very likely why the July 2026 mobile-shim hotfix (OWASP A01, CLAUDE.md
section 7) closed the routes iOS called and left the ones the web dashboard
calls: those were assumed covered by page-level protection.

## Categories

- **(a)** checks `session.archiveId` only. Cross-role read/write: any signed-in
  successor of that archive passes.
- **(b)** also verifies `archives.owner_user_id === session.userId`. Correct.
- **(c)** some other auth (cron secret, magic token, bcrypt password, contributor
  bearer token, god-mode cookie, caller-scoped listing).
- **(d)** no auth at all. Reachable unauthenticated with only an archive UUID or
  a row id.

Totals at time of sweep: **(a) 13 · (b) 17 · (c) 9 · (d) 38** across 77
`/api/archive` routes, plus 5 `/api/mobile` routes all in (b) or (c).

## `app/api/archive/` — 77 routes

| Route | Cat | Note |
|---|---|---|
| accuracy-mobile | b | |
| archive-videos | **d** | GET `?archiveId` → video list |
| archive-videos/[id] | **d** | GET by id → transcript, summary. Fixed in `fix/mirror-ownership` |
| archive-videos/[id]/play | **d** | GET by id → signed URL, no scoping. Fixed in `fix/mirror-ownership` |
| b2b-question/answer | b | + `tier === 'succession'` gate |
| b2b-question/next | b | + `tier === 'succession'` gate |
| bulk-upload | **d** | POST formData `archiveId` → write |
| check-credentials | **d** | GET `?archiveId` |
| contribution-alert | **d** | POST `archiveId` |
| contributors | b | All four methods closed. GET in `fix/mirror-ownership`, POST/PATCH/DELETE in `fix/contributors-write-auth` |
| daily-session | **d** | GET `?archiveId`; POST derives archive from caller-supplied session row |
| dashboard | **d** | GET `?archiveId` → full dashboard |
| dashboard-mobile | b | |
| dates | **d** | GET/POST/DELETE `archiveId` |
| debug-gallery | **a** | |
| deposit-prompt | **d** | POST `archiveId` |
| documents | **d** | GET `?archiveId` |
| documents/[id] | **d** | GET by id → `transcript`. Fixed in `fix/mirror-ownership` |
| entity-accuracy | **d** | GET `?archiveId` |
| entity-chat | b / c | owner session verified; contributor `Bearer` token path also |
| entity-feedback | **d** | POST `archiveId` |
| entity-readiness | b | GET + POST both |
| export | b | |
| gallery | b | |
| init | **d** | POST |
| invite | **d** | POST `archiveId` → sends email |
| invite-witness | **d** | POST |
| journal | **d** | GET `?archiveId` reads entries; POST `archiveId` writes |
| life-event | **d** | POST `archiveId` |
| magic-login | c | `magic_link_token`, 24h expiry |
| memory-game-mobile | b | GET + POST |
| memory-map | **a** | |
| mirror | **a** | fixed in `fix/mirror-ownership` |
| mirror/react | **a** | fixed in `fix/mirror-ownership` |
| mobile-login | c | email + bcrypt |
| mobile-spark | **d** | GET `?archiveId` |
| morning-digest | **d** | POST `archiveId` |
| my-archives | c | caller-scoped, `.eq('owner_user_id', session.userId)` |
| owner-deposit | b | reference pattern for the whole codebase |
| photo-labels | **d** | GET `?archiveId` |
| photo-url | **d** | GET `?path` → signed URL for any path in `photographs`. Fixed in `fix/mirror-ownership` |
| poll-replies | c | `Bearer CRON_SECRET` |
| preferences | **d** | GET + POST `archiveId` |
| process-document | **d** | POST |
| process-video | **d** | POST |
| processing-status | **d** | GET `?archiveId` |
| push-token | **d** | POST `archiveId` + `token` → overwrites `expo_push_token` |
| random-thought | b | |
| receive-reply | c | Resend webhook; signature logged, **not verified** (own comment says so) |
| recordings-mobile | b | |
| register-photo | **d** | POST `archiveId` |
| save | **d** | POST `archiveId` → photo upload + deposit + training pair |
| scenarios/respond | **a** | |
| send-photo | **d** | POST `archiveId` → sends email, builds reply token |
| send-summary | **d** | POST |
| setup-voice-clone | c + **a** | god-mode cookie OR session; session branch has no owner check |
| significant-dates-mobile | b | GET + POST |
| succession/add | **a** | creates a successor + auth user |
| succession/remove | **a** | |
| switch | c | verifies target archive is caller-owned |
| terminate | **a** | |
| test-inbound | **d** | diagnostic, reports env-configured booleans |
| test-voice | c + **a** | same shape as setup-voice-clone |
| timeline | **a** | |
| training-data | **a** | |
| transcribe-voice | b | |
| update-profile | **a** | |
| upload | b | |
| upload-url | **a** | issues signed upload URL |
| voice-recordings | **d** | GET `?archiveId` |
| voice-recordings/[id]/play | **d** | GET by id → signed URL |
| wechat-link | **d** | GET `?archiveId` |
| wisdom-exchange | **a** | |
| wisdom-exchange-mobile | b | GET + POST |
| wisdom-session | **d** | GET/POST/PATCH `archiveId` |
| witness-sessions | **d** | GET `?archiveId` |

## `app/api/mobile/` — 5 routes

| Route | Cat | Note |
|---|---|---|
| companion | b | |
| mirror | **b** | already correct before this sweep |
| mirror/react | **b** | already correct before this sweep |
| my-archives | c | caller-scoped |
| spark/random | b | |

## Closed in `fix/mirror-ownership` (seven route files)

`mirror`, `mirror/react`, `photo-url`, `contributors` (GET), `documents/[id]`,
`archive-videos/[id]/play`, `archive-videos/[id]`. Regression coverage is part 3
of `app/api/archive/unauth-access.test.ts`.

## Closed in `fix/contributors-write-auth` (`contributors` POST, PATCH, DELETE)

All three had a single caller: `app/archive/contributors/ContributorsClient.tsx`,
the owner's Contributors page, which sits behind `proxy.ts`. `basalith-app` has
no reference to the string `contributors` anywhere in its TypeScript sources, so
there is no iOS caller. No cron and no contributor-portal caller either.
`app/api/archive/invite/route.ts` writes to the `contributors` table directly
rather than through this route. Nothing was left open for a live caller.

**DELETE is a soft delete, not a hard delete.** The statement was, and still is:

```ts
supabaseAdmin.from('contributors').update({ status: 'inactive' }).eq('id', contributorId)
```

The old handler applied `.eq('archive_id', archiveId)` only when `?archiveId=`
was present, so omitting the parameter dropped the archive filter and a
contributor id alone was sufficient.

Because no row is removed, **no foreign key cascade ever fired**. Related rows
are untouched, not orphaned: `contributor_questions`, `email_reply_sessions`,
`contributor_photo_sends`, `contributor_story_prompts`, `daily_spark_responses`,
`wisdom_exchanges`, and every `owner_deposits` row carrying that
`contributor_id` all survive intact. (Per the migration files those first four
declare `ON DELETE CASCADE` and `owner_deposits.contributor_id` declares no
delete action at all, so a hard delete would have been both destructive and
partly blocked. Not re-confirmed against live schema, and moot while the handler
only updates a status column.)

What a successful attack destroyed was access, not data. `status = 'inactive'`
removes the person from every active-filtered path at once: their
`/contribute/{token}` portal stops resolving (`lib/contributorToken.ts`,
`app/contribute/[token]/page.tsx`), the nightly photograph and the weekly,
Monday-story and voice-portrait sends skip them, `lib/memoryChain.ts` stops
passing memories to them, the Twilio phone deposit line no longer recognizes
their number, the contributor `Bearer` path into `entity-chat` closes, and they
disappear from the owner's own contributor list and dashboard counts. The
existing deposits stay in the archive. It is recoverable, but there is no
reactivate control in the UI: the only path back is re-adding the same email,
which the POST upsert resolves on `(archive_id, email)` and sets back to active.

Regression coverage is part 4 of `app/api/archive/unauth-access.test.ts`,
including an owner session passing a contributor id from a different archive.

## Still open, for the category-(d) session

Roughly 33 category-(d) routes plus 11 category-(a) routes. Notes for whoever
picks this up:

1. **Not every (d) route wants an owner-session check.** At least four distinct
   legitimate caller types exist: the owner's browser session, cron with
   `CRON_SECRET`, the contributor portal with `contributors.access_token`, and
   the iOS app. `receive-reply` is a Resend webhook and needs signature
   verification, not a session. `poll-replies` is already cron-gated. Some
   routes may be dead code. Each needs its caller identified before it gets a
   guard, the same way the six above did.
2. **A shared helper is still premature** for that reason. It has to be designed
   around those caller types, not extracted from a handful of owner-session
   routes. Ten route files now carry the same copied guard, which is uncomfortable
   but still cheaper than a helper shaped by only one of the four caller types.
3. **Do not verify exploitability against production.** The code is unambiguous.
   Confirming would mean pulling real family material through an
   unauthenticated route.
4. **Separate, real, logged:** `proxy.ts` uses
   `pathname.startsWith('/archive')`, which also matches `/archive-login`, so an
   unauthenticated hit on the login page appears to redirect to itself. Not
   touched here because it is a security file and this was a security commit.

## Method

`app/api/archive/owner-deposit/route.ts` is the reference pattern. Its comment
states the reason the check exists, and that comment should be copied, not
paraphrased, so the reason travels with the code:

```ts
    // Auth: Supabase owner session only. Ownership is verified against the
    // archives table — a session carrying an archiveId is not proof of ownership
    // (getSessionUser fills archiveId for successors too).
```

Where a route is addressed by row id rather than archive id, the row query also
filters on `archive_id`, so a row id alone is never authority.
