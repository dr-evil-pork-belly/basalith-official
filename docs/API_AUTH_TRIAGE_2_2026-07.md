# API Auth Triage 2, July 2026

Triage of the routes surfaced by `docs/API_AUTH_INVENTORY_2026-07.md`, Sections 2, 3, and 4.

The inventory was used as an index only. Every route below was re-read from live code. Where
the code disagreed with the inventory, the code won and the disagreement is recorded in
Section 7.

Nothing was fixed. Nothing was committed. Fix shapes are proposed and batched for approval.

**Branch state note.** The inventory recorded `fix/guide-route-auth` as in flight against
`app/api/archivist/connect-stripe/route.ts` and `app/api/archivist/onboard-client/route.ts`.
That work has since landed: the repository is now on `main` at `821770d`, "fix: session-derive
Guide identity on connect-stripe, retire onboard-client to 410", and the working tree is clean.
Both files were re-read from live post-merge code for this pass. They are byte-identical to the
versions the inventory recorded, so no classification changed. The inventory's "in flight"
paragraph is now stale and is listed as disagreement 10 below.

---

# 1. The `mobile-login` answer

## Does this route currently mint a usable session?

**No. It mints nothing at all, and it never did.**

`app/api/archive/mobile-login/route.ts` sets no cookie and returns no token. On a correct
password it returns a plain JSON body: `archiveId`, `archiveName`, `familyName`, `ownerName`,
`preferredLanguage`. The "session" was always just the iOS app holding onto `archiveId` and
resending it.

That resend path is dead. `basalith-app/src/lib/api.ts` passes the archive id three different
ways, and every one of them is now ignored:

| How the app sends identity | Example call site | What the route does now |
| --- | --- | --- |
| Query string `?archiveId=` | `fetchDashboard`, `fetchGallery`, `fetchRecordings`, `fetchSignificantDates`, `fetchWisdomExchanges`, `fetchContribActivity`, `fetchEntityAccuracy`, `fetchMemoryGame`, `fetchLatestMirror`, `fetchDailySpark` | Ignored. `getSessionUser()` plus an `owner_user_id` comparison. |
| Header `x-archive-id` | `fetchGallery`, `saveOwnerDeposit`, `sendEntityChat`, `uploadPhoto`, `saveRandomThought` | Ignored. Same guard. |
| Body field `archiveId` | `saveOwnerDeposit`, `sendEntityChat`, `savePushToken`, `reactToMirror`, `saveSignificantDate`, `submitMemoryGameAnswer` | Ignored. Same guard. |

The app carries no cookie jar and no `Authorization` header on any of these calls. So every
authenticated screen in the iOS app returns 401 today. The app logs in successfully and then
does nothing, which is consistent with it being dark.

## Was it in scope for the July 17 fix, and if so what changed about it?

**No. It was not in scope, and nothing changed about it.**

The promoted merge `3d17c58` ("Merge fix/close-unauth-archive-access into main, iOS unauth
hotfix", 2026-07-18) touched 21 files. `app/api/archive/mobile-login/route.ts` is not one of
them. The full history of the file is four commits, the most recent being `d2b2652` on
**2026-06-11**, five weeks before the hotfix. That commit added only the DEPRECATED comment
block. No executable line has changed since `2becb8c`.

So the July 17 closure was not narrower than recorded in the way that matters most: it did
correctly close the **consumption** side. Every route that used to accept a caller-supplied
archive id now derives it from the session. What it did not do is retire the **credential
issuing** endpoint that fed the old model. That endpoint is still standing, still public, and
still has no rate limit.

## Is anything calling it?

Yes, one caller, and it is the dark app.

- `basalith-app/src/lib/api.ts`, function `mobileLogin()`, POSTs to
  `${API_URL}/api/archive/mobile-login`. Read only, not modified.
- In `basalith-official` there are no runtime callers. The only non-doc reference is
  `lib/billing/createArchive.ts`, which does not call the route but **still provisions the
  credential it consumes**: every archive created through the paid Stripe path or the manual
  path gets an `archive_credentials` row with a bcrypt hash at cost 12.

## What the route actually is today

It is not a session issuer. It is four other things, and this is the finding.

1. **A live password oracle with no rate limit.** Unauthenticated, unthrottled, and it
   distinguishes three states before any throttle: unknown email returns 401 "Invalid
   credentials", known owner email on a non-active archive returns 403 "Archive is not
   active", known owner email with a wrong password returns 401. The 403 confirms an email is
   a Basalith archive owner without knowing the password.

2. **A guessable password.** `lib/billing/createArchive.ts` generates the stored password as
   `generateClientPassword(familyName)`:

   ```
   `${familyNameLettersOnly}${new Date().getFullYear()}${4 chars from 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'}!`
   ```

   Given a family name and the year, which are both public or trivially inferred, the residual
   search space is 32^4 = 1,048,576. There is no rate limit, no lockout, and no attempt
   counter on this route.

3. **A CPU exhaustion vector.** bcrypt at cost 12 is roughly 250ms of CPU per attempt by
   design. An unauthenticated, unthrottled endpoint that runs one bcrypt compare per request
   is a cheap way to saturate serverless concurrency.

4. **An archive id disclosure on success.** A correct password returns `archiveId`. That UUID
   is a real capability elsewhere, because several routes still accept a raw `archiveId` from
   an anonymous caller. `/api/twilio/recording` is the sharpest: give it an `archiveId` in the
   query string and it writes `owner_deposits`, `labels`, and `voice_recordings` into that
   archive. See Section 2 below.

**Recommendation:** `retire_410`. The consumption side is already closed, the only caller is
dark, and the OTP build supersedes it. Retiring it removes the oracle, the brute force target,
and the DoS vector in one change. Stopping `createArchive.ts` from minting new passwords is a
sensible follow-on but is a separate change and is not proposed here.

---

# 2. The four named routes

## 2.1 `/api/twilio/recording`

Confirmed: `/api/twilio/continue` is the same shape. Neither route contains any reference to
`validateRequest`, `X-Twilio-Signature`, or `TWILIO_AUTH_TOKEN`. Only `/api/twilio/voice`
validates, and even there the check is skipped outright when `TWILIO_AUTH_TOKEN` is unset
(`if (!authToken) return true // dev: skip validation`). The practical consequence for
`/api/twilio/recording` is that an anonymous POST carrying `?archiveId={uuid}&isOwner=true`
and a `multipart/form-data` body writes, with no credential of any kind: a `voice_recordings`
row, an `owner_deposits` row with `source_type: 'phone_call'` (the placeholder text path fires
even when no audio downloads, because `depositText` falls back to a synthetic string when
`downloadOk` is false), an `owner_notifications` row, and, on the contributor branch, a
`labels` row and an `update` to `contributor_questions` marking a question answered. The
deposit then flows into `deposit_domain_scores` and `training_pairs`. In short: an anonymous
caller who holds any archive UUID can inject arbitrary text into that family's deposit stream
and into the entity's training corpus, and mark a contributor's question as answered.
`/api/twilio/continue` writes nothing itself, but it emits a `<Record action="...">` TwiML
element pointing back at `/api/twilio/recording` with attacker-chosen parameters, so it is
useful as a shaping step rather than as a hole in its own right.

## 2.2 `/api/contribute/upload-url`

Confirmed, and the difference is real. `upload-photo` builds its storage path from the token
row only: `const archiveId = contributor.archive_id as string`, then
`` `${archiveId}/${Date.now()}-...` ``. `upload-url` resolves the token, then computes
`const resolvedArchiveId = archiveId || contributor.archive_id`, where `archiveId` is read
straight off the request body. So **yes: a contributor token for archive A can produce a
signed upload URL that writes into archive B's storage prefix.** The signed URL is minted with
the service role against the real bucket (`photographs`, `archive-videos`, or
`archive-documents` depending on the file type), so the write lands in B's private bucket
under `B/{timestamp}-contrib-{rand}.{ext}`. The uploaded object is orphaned until a matching
`register-photo` or `register-media` call, and those two do use the token row's archive, so
the object does not automatically become a visible row in B. It is still an unauthorized write
into another family's private storage, and it consumes their bucket. This is the cleanest
`token_scope` case in the whole pass.

## 2.3 `/api/archive/receive-reply`

**Inherited, not deliberate.** The signature block has exactly one commit in its history:
`aac3f88` "resend email system", dated **2026-03-26**, which is the commit that created the
file. The file has been touched twice since, by `d90702c` (em dash removal) and `d49a84d`
(email contrast), neither of which is a security change. So the comment "We log but don't
block; verification can be added once RESEND_WEBHOOK_SECRET is set" is the original author's
placeholder from the day the route was written, not a decision anyone revisited. Two further
things the inventory did not capture: the route keys on `email_sessions.reply_address`, which
`send-photo` builds as `` `${familySlug}-${sessionCode}@${replyDomain}` `` where `sessionCode`
is `Math.random().toString(36).substring(2, 8)`, so the secret component is six base36
characters from a non-cryptographic PRNG behind a guessable family slug. And the lookup
applies no `reply_window_closes` filter, unlike `poll-replies` which does, so a reply address
stays valid forever.

## 2.4 `/api/archive/mobile-login`

Answered in full in Section 1 above.

---

# 3. Section 2 routes, auth `none`

| Route | Auth now | Identity source | Writes | Reachable by | Severity | Fix shape |
| --- | --- | --- | --- | --- | --- | --- |
| /api/twilio/recording | `none` | query string | voice_recordings, owner_deposits, contributor_questions, labels, owner_notifications, deposit_domain_scores, training_pairs, storage | anonymous | `high` | `signature_verify` |
| /api/witness (POST) | `none` | request body `archiveId` | witness_sessions | anonymous | `high` | `delete` |
| /api/witness/[sessionId] | `none` | URL segment | witness_sessions, witness_deposits, labels, owner_notifications | anonymous | `high` | see note 3 |
| /api/game/story | `none` | query string, request body | memory_game_responses, training_pairs | anonymous | `high` | see note 4 |
| /api/game/[sessionId] | `none` | URL segment | memory_game_contributions, labels, memory_game_sessions | anonymous | `high` | see note 5 |
| /api/archivist/certification | `none` | query string, request body `archivistId` | guide_certifications, guide_module_answers, archivists | anonymous | `high` | `session_derive` |
| /api/archivist/submit-exam | `none` | request body `archivistId` | guide_certifications, guide_module_answers, archivists | anonymous | `high` | `session_derive` |
| /api/witness (GET) | `none` | query string `sessionId` | none | anonymous | `medium` | see note 3 |
| /api/game/active | `none` | query string `archiveId` | none | anonymous | `medium` | see note 4 |
| /api/twilio/continue | `none` | query string | none | anonymous | `low` | `signature_verify` |
| /api/contact | `none` | request body | contact_requests | anonymous | `low` | see note 6 |
| /api/partner | `none` | request body | partner_applications | anonymous | `low` | see note 6 |
| /api/track/audience | `none` | n/a | audience_selections | anonymous | `low` | see note 6 |
| /api/archivist-apply | `none` | request body | none | anonymous | `low` | see note 7 |
| /api/archivist-interest | `none` | request body | none | anonymous | `low` | see note 7 |
| /api/ping | `none` | n/a | none | anonymous | `none` | `none, correct as is` |
| /api/archive-login | `none` | n/a | none | anonymous | `none` | `none, correct as is` |
| /api/archivist-login | `none` | n/a | none | anonymous | `none` | `none, correct as is` |
| /api/succession/login | `none` | n/a | none | anonymous | `none` | `none, correct as is` |
| /api/archivist/onboard-client | `none` | n/a | none | anonymous | `none` | `none, correct as is` |
| /api/god/impersonate/logout | `none` | n/a | none | anonymous | `none` | `none, correct as is` |

**Severity reasoning.**

1. `/api/twilio/recording` is high because an anonymous caller holding any archive UUID writes
   archive content, training data, and a contributor answer state change, across a trust
   boundary, with no credential.
2. `/api/archivist/certification` and `/api/archivist/submit-exam` are high because an
   anonymous POST naming an `archivistId` sets `archivists.certification_status = 'certified'`
   and `certification_level = 'certified'`, which is a credential grant, and `submit-exam`
   also mails the named Guide a "You passed" message from `guide@basalith.xyz`.
3. `/api/witness` POST is high because it mints a witness session against any `archiveId` and
   returns the working `sessionUrl`, and the PATCH on `/api/witness/[sessionId]` then writes
   `witness_deposits` and `labels` into that archive and mails the owner a quote of the
   attacker's text. The two together are one anonymous write chain into archive content, so
   the fix is one change: `delete` the POST, which is a field-for-field duplicate of the
   already owner-guarded `/api/archive/invite-witness`. Once minting is closed, the session id
   in the URL becomes a legitimate emailed capability and the PATCH is defensible as is. The
   GET is medium on its own because it discloses `contributor_email`, `contributor_name`,
   `ownerName`, and every stored answer to anyone holding the session id.
4. `/api/game/story` is high because an anonymous POST with an `archiveId` inserts a
   `memory_game_responses` row and then calls `createTrainingPairFromDeposit`, putting
   attacker text directly into `training_pairs`. `/api/game/active` is medium rather than high
   because it only reads, but its leaderboard falls back to `contributor_email` when
   `contributor_name` is null, so it discloses family email addresses to anyone holding an
   archive UUID.
5. `/api/game/[sessionId]` is high because the anonymous POST writes a `labels` row, and
   labels feed the entity system prompt. Its GET also returns `ownerName`, `familyName`, and
   signed URLs for every photograph in the session.
6. `/api/contact`, `/api/partner`, and `/api/track/audience` are low. They are correct as
   public forms and hold no protected data. The only exposure is unbounded anonymous insert
   with no throttle.
7. `/api/archivist-apply` and `/api/archivist-interest` are low. Their auth posture is correct
   for a public form. They write `console.log(JSON.stringify(body))` with no size bound, which
   is an unbounded anonymous write into the log stream. Separately, and this is not an auth
   finding, both discard the submission entirely. Neither persists anything. Any Guide
   applications submitted through them have been lost.
8. The five 410 stubs plus `/api/ping` and `/api/god/impersonate/logout` are `none`. They hold
   no data and grant nothing. `impersonate/logout` only clears the caller's own cookies.

**Where no listed fix shape fits.**

- Notes 4 and 5, the `/api/game/*` routes. None of the eight shapes applies. They have no
  credential at all, so `token_scope` has nothing to scope. The correct change is to introduce
  a bearer credential that already exists for exactly these people, the
  `contributors.access_token` that `cron/memory-game-start` already emails them, and then apply
  `token_scope` against it. `/api/game/[sessionId]` is the partial exception: its session id is
  already an emailed capability, so the smaller change there is to stop returning `ownerName`
  and signed photo URLs to an unauthenticated caller.
- Note 6 and note 7. The fix is a rate limit, which is not one of the eight shapes.
  `checkRateLimit` from `lib/apiSecurity.ts` is already used by `/api/apply`,
  `/api/guide-onboard`, and the demo routes, so the pattern exists in-repo.

---

# 4. Section 3 routes, identity not from the session

| Route | Auth now | Identity source | Writes | Reachable by | Severity | Fix shape |
| --- | --- | --- | --- | --- | --- | --- |
| /api/contribute/upload-url | `token` | token row, overridden by request body `archiveId` | none in Postgres, signed upload URL into any archive prefix | any contributor with a token | `high` | `token_scope` |
| /api/curator/accept-invite | `session_only` + `token` | session for the user, request body `token` for the vault | curators, profiles | any signed-in user holding an invite token | `medium` | `owner_guard` |
| /api/archive/entity-chat | `session_owned` + `token` | session, or contributor token from header or body | entity_conversations, owner_deposits, deposit_domain_scores, training_pairs | any contributor with a token, where the archive has opened contributor access | `medium` | see note 3 |
| /api/curator/seal-memory | `session_owned` | request body `vault_id`, verified | essence_sessions, vault_files, vaults, vault_notifications | any signed-in user with a matching profile | `low` | `none, correct as is` |
| /api/dashboard/upload | `session_owned` | request body `vault_id`, verified | vault_files, vaults | any signed-in archivist who owns the vault | `low` | `none, correct as is` |
| /api/archive/switch | `session_owned` | request body `archiveId`, verified | none, sets the `archive-id` cookie | any signed-in owner or contributor | `none` | `none, correct as is` |
| /api/archivist/connect-stripe (GET) | `session_owned` | session, plus a verified Stripe `account` from the query | archivists | any Guide | `none` | `none, correct as is` |
| /api/archive/send-photo | `cron_secret` + `session_owned` | body `archiveId` on the cron path, session on the owner path | email_reply_sessions, email_sessions, contributor_photo_sends, owner_photo_sends, email_preferences | cron only, or the owner for their own archive | `none` | `none, correct as is` |
| /api/archive/life-event | `cron_secret` + `session_owned` | body `archiveId` on the cron path, session on the owner path | owner_notifications | cron only, or the owner for their own archive | `none` | `none, correct as is` |
| /api/archive/poll-replies | `cron_secret` + `session_owned` | archive-wide on the cron path, session-scoped on the owner path | email_replies, labels, contributor_photo_sends, email_sessions | cron only, or the owner for their own archive | `none` | `none, correct as is` |

**Severity reasoning.**

1. `/api/contribute/upload-url` is high because it crosses a family trust boundary. A
   contributor invited to one archive can write objects into another family's private bucket.
   It is the only route in this pass where a caller-supplied id defeats a credential that was
   correctly validated one line earlier.
2. `/api/curator/accept-invite` is medium. The invite token is `randomBytes(24).toString('hex')`,
   which is not guessable, so this is not an anonymous hole. The gap is that the route never
   compares `curators.email` to `session.email`. Any signed-in user who comes into possession
   of an invite link, by forward, by paste, or by shared inbox, becomes a curator of that vault
   and has `profiles.role` set to `curator` and `profiles.vault_id` repointed. The only gate is
   `invite_accepted` being false.
3. `/api/archive/entity-chat` is medium and none of the eight shapes fits. `token_scope` is
   already correctly applied, because the token path derives the archive from the token row and
   ignores any body `archiveId`. The remaining problem is different: the `isDeposit()` heuristic
   auto-saves the caller's message into `owner_deposits` with `prompt: 'Entity chat deposit'`
   and **no `contributor_id`**, on both paths. So a contributor's words enter the owner's
   deposit stream unattributed and then flow into `training_pairs` as owner material. That is a
   provenance defect rather than an access defect. The change is to tag the deposit with the
   contributor id, or to suppress the auto-save on the contributor path.
4. The three two-path cron routes are `none`. Both branches are gated, the body `archiveId` is
   honored only under `CRON_SECRET`, and the owner branch ignores it. Parts 5 and 7 of the gate
   already lock this in.
5. `/api/archive/switch` is `none`. It verifies before use, and the cookie it sets cannot
   elevate scope: `getSessionUser` only consults `archive-id` when the caller owns more than one
   archive, and only accepts a value that is already in their owned set.

---

# 5. Section 4 routes, write-capable without a session

Routes already covered in Sections 3 and 4 above are not repeated.

| Route | Auth now | Identity source | Writes | Reachable by | Severity | Fix shape |
| --- | --- | --- | --- | --- | --- | --- |
| /api/archive/mobile-login | `token` | request body | archive_credentials | anonymous | `high` | `retire_410` |
| /api/archive/receive-reply | `token` | request body `to`, resolved to a session row | email_replies, labels, photographs, email_sessions | anonymous holding or guessing a reply address | `medium` | `signature_verify` |
| /api/resend/inbound | `token` | To address token | email_reply_sessions, owner_deposits, question_history, contributor_questions, daily_spark_responses, contributor_story_prompts, labels, deposit_domain_scores, training_pairs | anonymous holding a reply token | `medium` | `signature_verify` |
| /api/guide-onboard | `token` + `rate_limit_only` | request body invite code | archivists, archivist_invites, Supabase Auth users | anonymous holding an invite code | `medium` | `unconfirmed`, see note 3 |
| /api/archive/magic-login | `token` | query string token | archives | anonymous holding a token | `low` | `retire_410`, see note 4 |
| /api/apply | `rate_limit_only` | request body | archive_applications | anonymous | `low` | `none, correct as is` |
| /api/contribute/answer | `token` | token row | contributor_questions, owner_deposits, labels, contributor_photo_sends, contributors, training_pairs | any contributor with a token | `low` | `none, correct as is` |
| /api/contribute/register-photo | `token` | token row | photographs, labels, contributors | any contributor with a token | `low` | `none, correct as is` |
| /api/contribute/register-media | `token` | token row | archive_videos, archive_documents, contributors | any contributor with a token | `low` | `none, correct as is` |
| /api/contribute/upload-media | `token` | token row | archive_videos, archive_documents, contributors, storage | any contributor with a token | `low` | `none, correct as is` |
| /api/contribute/wisdom-exchange | `token` | token row | wisdom_exchanges | any contributor with a token | `low` | `none, correct as is` |
| /api/contribute/save-phone | `token` | token row | contributors | any contributor with a token | `low` | `none, correct as is` |
| /api/contribute/upload-photo | `token` | token row | none in Postgres, signed upload URL scoped to the token's archive | any contributor with a token | `none` | `none, correct as is` |

**Severity reasoning.**

1. `/api/archive/mobile-login` is high for the four reasons set out in Section 1: an
   unthrottled password oracle, a password with a 2^20 residual search space, a bcrypt cost 12
   CPU sink, and archive id disclosure that is a live capability at `/api/twilio/recording`.
   The write itself (`last_used_at`) is trivial. The severity is in what the route enables, not
   in what it stores.
2. `/api/archive/receive-reply` and `/api/resend/inbound` are medium. Both accept a webhook
   with no signature enforcement. `resend/inbound` is the better of the two: its token is 12
   crypto-random bytes and the `session.replied` guard makes each one effectively single use.
   `receive-reply` is weaker: its key is a guessable family slug plus six base36 characters
   from `Math.random()`, and it applies no `reply_window_closes` filter, so the address never
   expires. Neither is anonymous in the open, which is why neither is high.
3. `/api/guide-onboard` fix shape is **`unconfirmed`**. It creates Legacy Guide accounts and
   Supabase Auth users from an `archivist_invites.code`. The severity of that depends entirely
   on how strong the codes are, and **the repo never generates them**. `archivist_invites` is
   read at `app/api/guide-onboard/route.ts` lines 38 and 68 and written nowhere in
   `app/`, `lib/`, or `scripts/`. Codes are evidently inserted by hand in the Supabase editor.
   Their length and entropy cannot be established from this repository, and reading the table
   would require a live query, which is out of scope for this pass. If the codes are short or
   human-chosen, this is high, because the route mints a real Auth user with the `guide` role.
   Rate limiting is in place at 10 attempts per IP per 15 minutes, which bounds but does not
   close a weak-code attack.
4. `/api/archive/magic-login` is low, and the reason is a functional finding rather than a
   security one. The route sets `archive-auth` and `archive-id` cookies. **Nothing reads
   `archive-auth`.** The only reader is `getArchiveSession()` in `lib/apiSecurity.ts`, which is
   exported and never called from anywhere in `app/`, `lib/`, or `components/`. `proxy.ts`
   gates on `supabase.auth.getUser()`, not on these cookies. `getSessionUser` ignores
   `archive-auth` entirely and consults `archive-id` only to disambiguate archives the caller
   already owns. So this route grants access to nothing. The token itself is sound: 32
   crypto-random bytes, 24 hour expiry, cleared on use. `retire_410` is proposed because the
   route is dead weight, but it must be paired with `/api/god/send-magic-link`, which is the
   only thing that mints these tokens and which currently emails owners a sign-in link that
   logs them into nothing. The live owner login path is the Supabase one:
   `supabaseAdmin.auth.admin.generateLink` to `/auth/callback`, which `lib/billing/createArchive.ts`
   and `/api/admin/guide` both use, and `app/auth/callback/route.ts` exists to receive.
5. The seven `contribute/*` routes other than `upload-url` are low and correct. Each derives
   its archive from the token row and ignores caller-supplied ids. The tokens are
   `randomBytes(32).toString('hex')`, and `getContributorByToken` rejects anything under 32
   characters and requires `status = 'active'`. The residual concern, which is out of scope
   here, is that contributor tokens never expire.
6. `/api/apply` is low and correct as is. It validates, honeypots, applies a heuristic, and
   rate limits at 5 per IP per hour.

---

# 6. Proposed batches

Grouped by fix shape, because a shared shape shares a test. The regression gate is
`app/api/archive/unauth-access.test.ts`, currently parts 1 through 8.

## Batch 1. `signature_verify`, 4 routes

`/api/twilio/recording`, `/api/twilio/continue`, `/api/archive/receive-reply`,
`/api/resend/inbound`.

Two providers, one shape: verify the inbound signature before touching the body. Twilio has
`twilio.validateRequest` already imported and working in `/api/twilio/voice`, which is the
in-repo reference. Resend signs with svix. Worth deciding in the same change whether
`/api/twilio/voice` should keep its `if (!authToken) return true` dev bypass.

**Existing coverage: none.** No twilio, resend, or receive-reply module appears in the gate.
This batch needs a new part 9.

**Contains the single highest-severity item in the pass**, `/api/twilio/recording`.

## Batch 2. `session_derive`, 2 routes

`/api/archivist/certification`, `/api/archivist/submit-exam`.

Both take `archivistId` from the request. Both should take it from `getSessionUser()` and stop
reading it, which is exactly the `connect-stripe` pattern already landed in part 8.

**Existing coverage: part 8** covers the Guide side (`connect-stripe`, `onboard-client`) and
already has the session mocking and the "identity from session and never from request"
assertions these two need. Extend part 8 rather than adding a part.

## Batch 3. `token_scope`, 1 route

`/api/contribute/upload-url`.

Change `archiveId || contributor.archive_id` to `contributor.archive_id` and stop reading the
body field, matching its sibling `upload-photo`.

**Existing coverage: none.** No `contribute/*` module appears in the gate. One route, one
assertion: a token for archive A cannot produce a URL under archive B.

## Batch 4. `delete` and `retire_410`, 3 routes

`/api/witness` POST (`delete`, duplicate of the owner-guarded `/api/archive/invite-witness`),
`/api/archive/mobile-login` (`retire_410`), `/api/archive/magic-login` (`retire_410`, paired
with `/api/god/send-magic-link`).

Grouped because the test is the same in all three cases: assert the route returns 410 or 404
and writes nothing. `retire_410` has a landed in-repo precedent in
`/api/archivist/onboard-client`, including the convention of preserving the original handler as
a comment.

**Existing coverage: part 8** asserts the `onboard-client` 410. Same assertion shape, three
more routes.

**Sequencing note:** `mobile-login` should not be retired without confirming the iOS build is
in fact dark, since retiring it changes the app's failure from "logs in, then every screen
401s" to "cannot log in at all." Both are broken. The second is more honest.

## Batch 5. `owner_guard`, 1 route

`/api/curator/accept-invite`. Compare `curators.email` to `session.email` before accepting.

**Existing coverage: none.** No `curator/*` module appears in the gate.

**Open question before this batch runs:** the `vaults`, `curators`, `profiles`,
`vault_files`, `essence_sessions`, and `vault_notifications` tables are a separate subsystem
from `archives`. Whether any of it is live is **unconfirmed** from code alone. If the subsystem
is dead, Batch 5 and the two `low` curator and dashboard rows in Section 4 collapse into a
`delete` batch instead. Worth resolving before spending a fix on it.

## Batch 6. No listed shape fits, 5 routes

`/api/game/active`, `/api/game/story`, `/api/game/[sessionId]`, `/api/archive/entity-chat`,
plus the rate-limit group (`/api/contact`, `/api/partner`, `/api/track/audience`,
`/api/archivist-apply`, `/api/archivist-interest`).

Described rather than shaped, per the instruction not to invent shapes. The `/api/game/*` set
needs a credential introduced before any of the eight shapes becomes applicable. `entity-chat`
needs a provenance tag, not an access change. The form set needs `checkRateLimit`, which is not
a shape in the list but is an existing in-repo pattern.

**This batch is a decision, not an implementation.** It should not be scheduled until the
`/api/game/*` credential question is answered.

## Batch ordering recommendation

Batch 1, then 3, then 2, then 4, then 5. Batch 1 first because it contains the only anonymous
write path into archive content that needs no prior knowledge beyond a UUID. Batch 3 second
because it is one line and closes a cross-family boundary. Batch 6 is not scheduled.

---

# 7. Disagreements with `API_AUTH_INVENTORY_2026-07.md`

Nine. The inventory is not corrected here.

1. **`/api/archive/mobile-login`, "Auth mechanism `token`".** Defensible under the inventory's
   own vocabulary, but it obscures the point. The route performs a credential check, it does
   not resolve a bearer token. More importantly, the inventory's Section 4 note says it
   "Issues a login." It does not. It sets no cookie and returns no token.

2. **`/api/archive/magic-login`, Section 4 note "Issues a login. Sets `archive-auth` and
   `archive-id` cookies for 7 days on a valid token."** The cookie-setting is accurate. The
   conclusion is not. Nothing in `app/`, `lib/`, or `components/` reads `archive-auth`. The
   only reader, `getArchiveSession()`, is exported and never called. The route grants no
   access.

3. **`/api/god/impersonate`, Writes "none (sets `archive-auth` and `archive-id` cookies)".**
   Accurate as written, but the same dead-cookie finding applies. God mode impersonation does
   not currently impersonate anything, because `getSessionUser` accepts `archive-id` only for
   archives the calling session already owns.

4. **`/api/game/active`, Writes "none".** Correct on tables. The row does not record that the
   response discloses `contributor_email` when `contributor_name` is null, which makes an
   apparently harmless read a PII disclosure.

5. **`/api/witness` POST.** The inventory records it as creating a witness session. It does not
   record that it is a field-for-field duplicate of the owner-guarded
   `/api/archive/invite-witness`. That fact changes the fix from "add auth" to "delete".

6. **`/api/archive/receive-reply`, Section 4 note.** The inventory calls the access key "an
   email address rather than a random token" and stops there. It does not record that the
   secret component is six base36 characters from `Math.random()`, nor that the route applies
   no `reply_window_closes` filter while `poll-replies` does.

7. **`/api/guide-onboard`, Auth "`token` (`archivist_invites.code`)".** Accurate, but the
   inventory presents it as a settled mechanism. The codes are never generated anywhere in the
   repository, so the strength of that token is unestablished. The cell should have been
   `unconfirmed`.

8. **`/api/archive/entity-chat`.** The inventory records both auth paths correctly. It does not
   record that the auto-saved `owner_deposits` row carries no `contributor_id` on the
   contributor path, so contributor text is stored as owner material.

9. **`/api/twilio/voice`, Auth "`twilio_sig` (skipped entirely when `TWILIO_AUTH_TOKEN` is
   unset)".** Accurate and well flagged. Noted here only because the parenthetical deserves to
   be a finding in its own right rather than a qualifier, since it means the one twilio route
   that validates can be made not to validate by an environment misconfiguration.

10. **The "In flight" paragraph under `/api/archivist`.** Stale as of this pass. The branch
    landed as `821770d` on `main`. The two rows themselves remain correct against live code.

---

# 8. Coverage statement

- **Routes in scope:** 43 unique routes across Sections 2, 3, and 4 of the inventory.
  Section 2 contributes 20, Section 3 contributes 10 more, Section 4 contributes 13 more.
  Several routes appear in more than one section and are counted once.
- **Routes classified:** 43.
- **Routes I could not classify:** none.
- **Cells recorded as `unconfirmed`:** one. The fix shape for `/api/guide-onboard`, because
  `archivist_invites.code` is never generated in this repository and its entropy cannot be
  established without a live query, which this pass does not permit.
- **Open question, not a gap:** whether the `vaults` and `curators` subsystem is live. This
  affects the fix decision for three routes (`/api/curator/accept-invite`,
  `/api/curator/seal-memory`, `/api/dashboard/upload`) but not their classification.

Every route was re-read from live code in this pass. `basalith-app` was read only, and only
`src/lib/api.ts` was opened there.

## Prior examination

`docs/API_AUTH_TRIAGE_2026-07.md` was opened once, at the end, solely to check whether any
route in this scope had been examined and passed before. Result: that triage's scope was the
`/api/archive` and `/api/mobile` owner surface plus the Guide routes. Of the 43 routes here,
only `/api/archive/entity-chat`, `/api/archive/poll-replies`, `/api/archive/send-photo`,
`/api/archive/life-event`, and `/api/archivist/connect-stripe` appear in it, and all five were
fixed rather than passed. **No route carrying a `high` severity in this pass was examined and
passed by the prior triage.** The seven high-severity routes here sit in `/api/twilio`,
`/api/game`, `/api/witness`, `/api/archivist` certification, `/api/contribute`, and
`/api/archive/mobile-login`, none of which was in that triage's scope. This is the same gap the
inventory pass was commissioned to close, and it closed it.

## Gate coverage summary

Of the 43 routes in scope, the regression gate currently exercises 6:
`/api/archive/entity-chat` (parts 1 and 2), `/api/archive/poll-replies` (part 5),
`/api/archive/send-photo` and `/api/archive/life-event` (part 7), and
`/api/archivist/connect-stripe` and `/api/archivist/onboard-client` (part 8).

The remaining 37 have no gate coverage. The batches above add coverage for 11 of them.
