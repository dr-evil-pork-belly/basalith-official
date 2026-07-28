# API auth triage, category (d) and category (a) (July 2026)

Recon only. No file was edited, no SQL was run, no deploy was made, no branch was
created. Production was not called.

Input document was `docs/API_AUTH_SWEEP_2026-07.md`. Its table was treated as an
inventory to check, not as truth. Every route below was re-read from live code on
2026-07-27. Where this document and the sweep disagree, this document wins, and
the disagreement is listed in the final section.

Scope is every route the sweep still marks **(d)**, plus every route it marks
**(a)**. Routes closed in `fix/mirror-ownership` and `fix/contributors-write-auth`
are excluded. Two routes the sweep marked **(c)** are pulled in because reading
them showed the (c) label is wrong: `poll-replies` and `receive-reply`.

Caller search covered this repo, `C:\Users\mrdav\basalith-app` (read only), and
`C:\Users\mrdav\basalith-xyz`. The third was added at Batch 5 time and returned
zero matches for every route considered for deletion.

## Status

**Closed in `a409eaf` (`fix/delete-dead-routes-poll-replies-auth`), Batch 5 plus
`poll-replies`.** Eight route files deleted: `init`, `invite`, `bulk-upload`,
`deposit-prompt`, `send-summary`, `check-credentials`, `test-inbound`,
`debug-gallery`. `poll-replies` lost the `{"manual": true}` bypass and gained a
two-path guard. `setup-voice-clone` and `test-voice` kept their routes and lost
their unused owner-session fallback. Regression coverage is part 5 of
`app/api/archive/unauth-access.test.ts`. Preview deployed, not promoted.

**Held back from Batch 5.** `terminate`. It has no caller either, but it
implements a real lifecycle promise (`archive_lifecycle`,
`scheduled_deletion_at`) and reads as an unbuilt UI rather than a retired
feature. Deleting it would remove a promised capability rather than an accident.
It stays in Batch 2 for the owner-guard.

**Correction to this document.** The Batch 5 paragraph below says "nine routes"
and then lists eight. Eight is right. The ninth no-caller route is `terminate`,
which the same paragraph and the dead-code section explicitly hold back from
deletion, so it was never a delete-route candidate. The count was wrong, not the
list.

**Closed in `33cbf99` and the second commit of `fix/owner-guard-batch-2`, the
owner-guard batch.** Every route in this document whose fix shape is
owner-guard, 33 in total, now takes the `owner-deposit` pattern. This cut
across the batch numbering below rather than following it: the batch was
defined as "fix shape owner-guard" and so absorbed all of Batch 1, all of
Batch 2, and all four of Batch 4.

- `33cbf99`, commit A, the 20 high-severity routes: `dashboard`, `documents`,
  `archive-videos`, `voice-recordings`, `voice-recordings/[id]/play`,
  `photo-labels`, `witness-sessions`, `wisdom-session`, `dates`, `save`,
  `entity-feedback`, `process-document`, `process-video`, `push-token`,
  `wechat-link`, `succession/add`, `succession/remove`, `terminate`, `journal`,
  `daily-session`.
- Commit B, the 13 medium and low routes: `entity-accuracy`, `preferences`,
  `invite-witness`, `register-photo`, `upload-url`, `timeline`,
  `wisdom-exchange`, `scenarios/respond`, `processing-status`, `mobile-spark`,
  `memory-map`, `training-data`, `update-profile`.

Regression coverage is parts 6a and 6b of `app/api/archive/unauth-access.test.ts`.
Both commits preview deployed, neither promoted.

**`terminate` is closed.** It was held back from Batch 5 rather than deleted,
and it took the owner-guard in commit A as planned.

**The four iOS routes now require an authenticated session.** `journal`,
`daily-session`, `push-token` (commit A) and `mobile-spark` (commit B) were the
last routes `basalith-app` could still reach. The app sends no cookie and no
token, so it can no longer reach any of them. This was a deliberate call, not an
oversight: iOS is dark until OTP auth ships, so these were not serving a working
client, only anyone holding an archive UUID. **Whoever builds the Phase 7 OTP
session must put these four back on the list**, together with the routes that
already required a session. Guarding them makes the OTP session the single thing
that revives the app, which is the point.

**Nothing was skipped.** Every owner-guard route in the table was fixed. The
`ContributeClient.tsx:1243` call into `entity-feedback` was left alone because it
omits `conversationId` and 400s today, so the contributor rating control has
never worked; restoring it needs the contributor-token shape, not an owner guard.
No client file was changed in either commit.

**Closed in `5f6bcf9` (`fix/cron-secret-batch-3`), the cron-secret batch.** The
four remaining Batch 3 routes, `send-photo`, `morning-digest`,
`contribution-alert` and `life-event`, now verify `CRON_SECRET`. Recon
corrected the table on one point: the table implies these routes were
partially gated, and they were not. **All four had no auth of any kind**, not
just `send-photo` and `morning-digest`. Each takes the block normalized in
`08b8c6d`: header and query as an independent OR, guarded by
`!!expectedSecret`.

Both halves shipped together, because the callers were sending no credential
at all and a guard alone would have been four broken crons.
`app/api/cron/send-photos/route.ts` now sends `Authorization: Bearer` on its
three fan-out calls, and `app/api/archive/poll-replies/route.ts` sends it on
the `contribution-alert` forward. Header only, never a query parameter.

`send-photo` and `life-event` have a browser caller as well and took the
two-path shape from `a409eaf` rather than a single cron check. The owner path
ignores the `archiveId` in the body rather than validating it and derives the
archive from the session, so no client file needed changing.
`morning-digest` and `contribution-alert` have no browser caller and took a
single check.

One change beyond the guard: `life-event` read its `significant_dates` row by
`dateId` alone, so a verified owner could pass another archive's `dateId` and
have that family's `person_name`, `year` and `notes` rendered into an email
sent to their own contributor list. The lookup is now scoped to the resolved
archive. Without it the owner path would not have been archive-scoped.

Regression coverage is the new fan-out block in
`app/api/cron/cron-auth.test.ts`, which also asserts both caller files send the
header and put no secret in a URL, plus part 7 of
`app/api/archive/unauth-access.test.ts` for the two owner paths. Preview
deployed, not promoted.

**Still open.** Only the two needs-decision items. Batches 1, 2, 3, 4 and 5 are
now closed.

## Reference patterns used to name the fix shapes

- **owner-guard** is `app/api/archive/owner-deposit/route.ts:12-28`. Session, then
  `archives.owner_user_id === session.userId`, then the caller-supplied archiveId
  is dropped rather than validated.
- **cron-secret** is `app/api/cron/send-photos/route.ts:6-20`. `CRON_SECRET` from
  either the `authorization` header or a `?secret=` query parameter.
- **token-auth** is `lib/contributorToken.ts:18-48`, `getContributorByToken`.
- **signature** would be svix verification against `RESEND_WEBHOOK_SECRET`. No
  route in this repo implements it today.

---

## Triage table

| Route | Caller | Caller type | What it exposes or does | Fix shape | Severity |
|---|---|---|---|---|---|
| `dashboard` | `app/archive/dashboard/DashboardClient.tsx:1287`, `app/archive/entity/EntityClient.tsx:133`, `app/archive/preferences/PreferencesClient.tsx:12`, `app/archive/dashboard/SuccessionDashboard.tsx:29` | owner-session | Reads the whole archive in one call: `archives.*`, `contributors` (name and email), every `photographs` row, `labels`, `owner_deposits`, `decade_coverage`, counts | owner-guard. **CLOSED in `33cbf99`** (commit A, high severity) | **High.** One archive UUID returns contributor email addresses and every label the family has written |
| `documents` | `app/archive/writing/WritingClient.tsx:44` | owner-session | Reads `archive_documents`: titles, AI summaries, and `linguistic_patterns` of personal letters and journals | owner-guard. **CLOSED in `33cbf99`** (commit A, high severity) | **High.** Summaries of private correspondence |
| `archive-videos` | `app/archive/videos/VideosClient.tsx:51` | owner-session | Reads `archive_videos`: title, summary, duration, uploader name | owner-guard. **CLOSED in `33cbf99`** (commit A, high severity) | **High.** Home video contents by summary |
| `voice-recordings` | `app/archive/voice/VoiceClient.tsx:69` | owner-session | Reads `voice_recordings`: first 200 chars of every transcript plus `storage_path` | owner-guard. **CLOSED in `33cbf99`** (commit A, high severity) | **High.** Transcript text of the owner speaking |
| `voice-recordings/[id]/play` | `app/archive/voice/VoiceClient.tsx:107` | owner-session | Returns a 1 hour signed URL to the audio file. Keyed on row id only, no archive filter | owner-guard. **CLOSED in `33cbf99`** (commit A, high severity) | **High.** A row id alone yields the owner's recorded voice. Same shape as `archive-videos/[id]/play`, which was already fixed |
| `photo-labels` | `app/archive/deposit/DepositClient.tsx:34` | owner-session | Reads `labels.what_was_happening` for a photograph | owner-guard. **CLOSED in `33cbf99`** (commit A, high severity) | **High.** The label text is the family memory itself |
| `witness-sessions` | `app/archive/contributors/ContributorsClient.tsx:191` | owner-session | `select('*')` on `witness_sessions`: contributor email, relationship, and the full answers array | owner-guard. **CLOSED in `33cbf99`** (commit A, high severity) | **High.** Contributor PII plus their written answers |
| `wisdom-session` | `app/archive/wisdom/WisdomClient.tsx:135,156,188`, `app/archive/entity/EntityClient.tsx:180` | owner-session | GET `select('*')` on `wisdom_sessions` including the answers array. POST creates a session. PATCH writes an answer to `owner_deposits` and a training pair, scoped by session id only | owner-guard. **CLOSED in `33cbf99`** (commit A, high severity) | **High.** Reads the owner's wisdom answers and writes into the training corpus |
| `dates` | `app/archive/dates/DatesClient.tsx:112,144,168`, `app/archive/dashboard/DashboardClient.tsx:250` | owner-session | GET reads `significant_dates` (birthdays, death anniversaries, names). POST inserts. DELETE soft-deletes on a bare row id with no archive filter | owner-guard. **CLOSED in `33cbf99`** (commit A, high severity) | **High.** Family birth and death dates are PII, and DELETE takes a row id as authority |
| `journal` | `basalith-app/src/lib/api.ts:614` (GET), `:621` (POST) | ios | GET reads `journal_entries` for today and the last 7 days. POST upserts an entry, inserts `owner_deposits`, and creates a training pair | owner-guard. **CLOSED in `33cbf99`** (commit A, high severity) | **High.** Private daily journal, readable and writable |
| `daily-session` | `basalith-app/src/lib/api.ts:560` (GET), `:575`, `:587` (POST) | ios | GET creates a `daily_sessions` row and returns a **signed URL to an unlabelled photograph**, contributor names, and a contributor's answer text. POST writes `owner_deposits`, `labels`, `journal_entries`, `daily_spark_responses`, and streak fields | owner-guard. **CLOSED in `33cbf99`** (commit A, high severity) | **High.** Hands out a family photograph and a contributor's words, and writes into five tables |
| `save` | `app/archive/label/LabelClient.tsx:533` | owner-session | Uploads a base64 photograph, inserts `photographs`, `labels`, `people`, `decade_coverage`, `milestones`, updates archive totals, creates a training pair | owner-guard. **CLOSED in `33cbf99`** (commit A, high severity) | **High.** Unauthenticated write into storage and six tables |
| `entity-feedback` | `app/archive/entity/EntityClient.tsx:331,344`. Also `app/contribute/[token]/ContributeClient.tsx:1243`, which omits `conversationId` and therefore 400s today | mixed (owner-session, contributor-portal call is already broken) | Updates any `entity_conversations` row by id, inserts a correction into `owner_deposits`, and moves `entity_accuracy` | owner-guard. **CLOSED in `33cbf99`** (commit A, high severity) | **High.** Writes attacker text into the training corpus, which is entity poisoning |
| `process-document` | `app/archive/upload/UploadClient.tsx:167` | owner-session | Accepts any file, uploads to the `archive-documents` bucket, runs a Sonnet vision call and a second Sonnet call, inserts `archive_documents` and `owner_deposits` | owner-guard. **CLOSED in `33cbf99`** (commit A, high severity) | **High.** Unmetered model spend plus an arbitrary write into any archive |
| `process-video` | `app/archive/upload/UploadClient.tsx:203` | owner-session | Same shape up to 500MB. Whisper transcription plus a Sonnet call, inserts `archive_videos` and `owner_deposits` | owner-guard. **CLOSED in `33cbf99`** (commit A, high severity) | **High.** 500MB unauthenticated upload and unmetered spend |
| `bulk-upload` | None found in either repo | none-found | Multipart upload of N photographs into the `photographs` bucket, inserts `photographs`, fires `photo/uploaded` Inngest events | delete-route. **DELETED in `a409eaf`** | **High.** Superseded by `upload-url` plus `register-photo`, which is what `LabelClient.uploadFileDirect` (LabelClient.tsx:113-161, used at :197 and :270) actually calls |
| `invite` | None found in either repo | none-found | Upserts an **active** row into `contributors` with a caller-supplied email, inserts `email_sessions`, sends a branded email | delete-route. **DELETED in `a409eaf`** | **High.** An active contributor row makes that address a recipient of the nightly `send-photo` run, so this is a durable photograph exfiltration channel, not just one email |
| `init` | None found in either repo. `docs/BASALITH_SUCCESSION_TEST_LOOP.md:32` names it as an insert handler | none-found | Inserts a row into `archives` with a caller-supplied name, email, and tier | delete-route. **DELETED in `a409eaf`** | **High.** Anonymous archive creation. The live path is `lib/billing/createArchive.ts:57`, called by `provisionOnFoundingFee` (`lib/inngest/billingFunctions.ts:143`) |
| `push-token` | `basalith-app/src/lib/api.ts:303` | ios | Overwrites `archives.expo_push_token` for any archive id | owner-guard. **CLOSED in `33cbf99`** (commit A, high severity) | **High.** Redirects the owner's push notifications to an attacker device |
| `wechat-link` | `app/archive/dashboard/DashboardClient.tsx:800` | owner-session | Returns `wechat_link_code`, and **mints and persists one** if the archive has none | owner-guard. **CLOSED in `33cbf99`** (commit A, high severity) | **High.** That code is the bearer credential the WeChat webhook accepts to set `wechat_open_id` (`app/api/wechat/webhook/route.ts:91-105`), and it does not check whether the archive is already linked |
| `poll-replies` | `app/api/cron/send-photos/route.ts:51`, `app/archive/preferences/PreferencesClient.tsx:125` | mixed (cron, owner-session) | Polls the Resend inbox, runs Sonnet per email, inserts `email_replies` and `labels`, calls `contribution-alert`, sends confirmation emails | cron-secret. **CLOSED in `a409eaf`**: cron path takes `CRON_SECRET` by header or query and stays archive-wide; owner path takes a verified session and is scoped to that owner's archive | **High.** The sweep marked this (c). It was not gated: the old line 79 accepted `{"manual": true}` in the body as an alternative to `CRON_SECRET` |
| `receive-reply` | `app/api/resend/inbound/route.ts:366` | webhook (now an internal forward, not a live webhook target) | Takes `from`, `to`, `text` from the body, matches `email_sessions.reply_address`, runs Sonnet, inserts `email_replies` and `labels`, marks the photograph labelled, sends email | needs-decision | **High.** Confirmed: it logs svix headers and processes regardless (lines 67-75). Reachable directly, and the address is a guessable `{family-slug}-{6 chars}` pattern |
| `test-voice` (session branch) | `app/god/GodModeClient.tsx:313` only | god | God branch is correct. The session branch takes `session.archiveId` with no ownership check and synthesizes the owner's cloned voice saying caller-supplied text, then returns a signed URL | **CLOSED in `a409eaf`**: session branch deleted, route stays live on the god path | **High.** A signed-in successor could generate audio of the owner saying anything. Confirmed, the sweep is right about the branch |
| `succession/add` | `app/archive/succession/SuccessionClient.tsx:51` | owner-session | Creates a `successors` row and a Supabase Auth user via `getOrCreateAuthUser` | owner-guard. **CLOSED in `33cbf99`** (commit A, high severity) | **High.** A successor can provision another successor on the same archive, which is access creation |
| `succession/remove` | `app/archive/succession/SuccessionClient.tsx:82` | owner-session | Hard-deletes a `successors` row (scoped to the session archive, so the row filter is correct) | owner-guard. **CLOSED in `33cbf99`** (commit A, high severity) | **High.** Destructive, and a successor can remove peers |
| `terminate` | None found in either repo | none-found | Sets `termination_requested_at` and `scheduled_deletion_at` 365 days out, emails the owner and the admin | owner-guard. **CLOSED in `33cbf99`** (commit A, high severity). Held back from `a409eaf` rather than deleted, because it implements a real lifecycle promise and reads as an unbuilt UI, not a retired feature. It took the guard as planned | **High.** Destructive lifecycle change reachable by any successor. No UI calls it |
| `setup-voice-clone` (session branch) | `app/god/GodModeClient.tsx:265` only | god | God branch is correct. Session branch deletes the existing ElevenLabs voice and rebuilds the clone from up to 5 recordings | **CLOSED in `a409eaf`**: session branch deleted, route stays live on the god path | **Medium.** Destroys an existing voice id and spends ElevenLabs quota, but produces nothing the caller can read |
| `entity-accuracy` | `app/archive/voice/VoiceClient.tsx:82`, `app/archive/entity/EntityClient.tsx:160,198`, `app/archive/dashboard/DashboardClient.tsx:36` | owner-session | Reads all `owner_deposits`, `entity_conversations`, and `labels` to compute scores, returns scores and totals, upserts `entity_accuracy` | owner-guard. **CLOSED in commit B of `fix/owner-guard-batch-2`** (medium and low) | **Medium.** Returns numbers, not the source text, but it does write on a GET |
| `preferences` | `app/archive/preferences/PreferencesClient.tsx:89` (GET), `:106` (POST) | owner-session | Reads and upserts `email_preferences`: cadence, send time, timezone | owner-guard. **CLOSED in commit B of `fix/owner-guard-batch-2`** (medium and low) | **Medium.** Setting `cadence: 'paused'` silences an archive's whole email programme |
| `send-photo` | `app/api/cron/send-photos/route.ts:36`, `app/archive/preferences/PreferencesClient.tsx:149` | mixed (cron, owner-session) | Sends the photograph email to every active contributor, creates `email_sessions` and `email_reply_sessions`, records `contributor_photo_sends`, fires WeChat, advances `email_preferences` | cron-secret. **CLOSED in `5f6bcf9`** (`fix/cron-secret-batch-3`): had **no auth at all**, not partial. Cron path takes `CRON_SECRET` by header or query and keeps the archive from the body; owner path takes a verified session and derives the archive from it, ignoring the body `archiveId`. `send-photos:36` now sends the header | **Medium.** Emails real people and burns the send queue, but sends only to addresses already in the archive |
| `life-event` | `app/api/cron/send-photos/route.ts:121`, `app/archive/dates/DatesClient.tsx:179` | mixed (cron, owner-session) | Sonnet call, then emails the owner and every active contributor with a photograph | cron-secret. **CLOSED in `5f6bcf9`**: had **no auth at all**. Same two-path shape as `send-photo`, plus the `significant_dates` lookup is now scoped to the resolved archive, so a verified owner can no longer mail another archive's date. `send-photos:121` now sends the header | **Medium.** Email to real people plus model spend |
| `morning-digest` | `app/api/cron/send-photos/route.ts:96` | cron | Emails the owner a digest containing recent label text and a photograph | cron-secret. **CLOSED in `5f6bcf9`**: had **no auth at all**. Single cron check, no browser caller. `send-photos:96` now sends the header | **Medium.** Triggers email to a real person |
| `contribution-alert` | `app/api/archive/poll-replies/route.ts:253` | cron (server to server, sends no credential today) | Emails the owner that a contributor added a memory, inserts `owner_notifications` | cron-secret. **CLOSED in `5f6bcf9`**: had **no auth at all**. Single cron check. `poll-replies:295` now sends the header on the forward, on both of that route's paths | **Medium.** Triggers email to a real person |
| `invite-witness` | `app/archive/contributors/ContributorsClient.tsx:276` | owner-session | Inserts `witness_sessions` and emails a caller-supplied address a `/witness/{id}` link | owner-guard. **CLOSED in commit B of `fix/owner-guard-batch-2`** (medium and low) | **Medium.** Sends a branded invitation to an arbitrary address and creates the session it points at |
| `deposit-prompt` | None found in either repo | none-found | Emails the owner a prompt built from the most recent contributor label, inserts `owner_notifications` | delete-route. **DELETED in `a409eaf`** | **Medium.** Triggers email to a real person |
| `send-summary` | None found in either repo | none-found | Emails every recipient of any `email_sessions` row a digest of that session's replies | delete-route. **DELETED in `a409eaf`** | **Medium.** Replays contributor reply text to the whole recipient list of any session id |
| `register-photo` | `app/archive/label/LabelClient.tsx:138` | owner-session | Inserts a `photographs` row for a caller-supplied storage path and fires `photo/uploaded` | owner-guard. **CLOSED in commit B of `fix/owner-guard-batch-2`** (medium and low) | **Medium.** Write plus a background job, but the path must already exist |
| `upload-url` | `app/archive/label/LabelClient.tsx:116` | owner-session | Issues a signed upload URL into `photographs/{archiveId}/...` | owner-guard. **CLOSED in commit B of `fix/owner-guard-batch-2`** (medium and low) | **Medium.** A successor can write into the owner's photograph bucket. Extension allowlist is present and correct |
| `timeline` | `app/archive/timeline/TimelineClient.tsx:62`. Also `basalith-app/src/lib/api.ts:641`, which 401s today because the route ignores `?archiveId` and reads the session | mixed (owner-session, ios call is already broken) | Counts across six tables plus `significant_dates` labels and years | owner-guard. **CLOSED in commit B of `fix/owner-guard-batch-2`** (medium and low) | **Medium.** Leaks significant date labels and years to a successor |
| `wisdom-exchange` | `app/archive/wisdom-exchange/page.tsx:26,35` | owner-session | GET reads `wisdom_exchanges` with contributor names. POST writes `owner_deposits` and a training pair. Row query is already scoped to the session archive | owner-guard. **CLOSED in commit B of `fix/owner-guard-batch-2`** (medium and low) | **Medium.** Contributor names plus a training corpus write |
| `scenarios/respond` | `app/archive/scenarios/ScenariosClient.tsx:50` | owner-session | Deletes and reinserts `b2b_scenario_responses`, inserts `owner_deposits`, creates a training pair | owner-guard. **CLOSED in commit B of `fix/owner-guard-batch-2`** (medium and low) | **Medium.** A successor can write founder positions into the training corpus |
| `check-credentials` | None found in either repo | none-found | Returns `archive_credentials` rows (id, is_active, created_at, created_by) for an archive. No hash | delete-route. **DELETED in `a409eaf`** | **Low.** Confirms an archive has a live mobile password and leaks `created_by` |
| `processing-status` | `app/archive/gallery/GalleryClient.tsx:122` | owner-session | Photograph counts by status | owner-guard. **CLOSED in commit B of `fix/owner-guard-batch-2`** (medium and low) | **Low.** Counts only |
| `mobile-spark` | `basalith-app/src/lib/api.ts:254,274` | ios | Returns today's spark text and `archives.preferred_language` | owner-guard. **CLOSED in commit B of `fix/owner-guard-batch-2`** (medium and low) | **Low.** The spark is deterministic and shared, the only archive data is the language |
| `test-inbound` | None found in either repo | none-found | Returns `RESEND_REPLY_DOMAIN`, `RESEND_FROM_EMAIL`, and five booleans for which env vars are set | delete-route. **DELETED in `a409eaf`** | **Low.** No secret value, but it confirms the deployment's configuration to anyone |
| `debug-gallery` | None found in either repo | none-found | Photograph counts and sample ids for the caller's own session archive | delete-route. **DELETED in `a409eaf`** | **Low.** A successor sees counts for an archive they can already reach |
| `contributor-activity-mobile` | `basalith-app/src/lib/api.ts:469` | ios | Reads contributor `labels` and `wisdom_exchanges` for the owner's activity feed | no-change | **None.** Added here to complete the inventory: the July 2026 sweep table omitted this route entirely. It already verifies session plus `archives.owner_user_id === session.userId` (`route.ts:8-19`), so it is category (b) and correct. Like every other hardened mobile route, iOS cannot currently reach it |
| `memory-map` | `app/archive/memory-map/MemoryMapClient.tsx:38` | owner-session | Decade and dimension coverage percentages | owner-guard. **CLOSED in commit B of `fix/owner-guard-batch-2`** (medium and low) | **Low.** Scores only |
| `training-data` | `app/archive/dashboard/TrainingDataCard.tsx:60` | owner-session | `getTrainingStats(archiveId)` counts | owner-guard. **CLOSED in commit B of `fix/owner-guard-batch-2`** (medium and low) | **Low.** Counts only |
| `update-profile` | `app/archive/preferences/PreferencesClient.tsx:21` | owner-session | Writes `owner_birth_year` and `owner_birth_decade` | owner-guard. **CLOSED in commit B of `fix/owner-guard-batch-2`** (medium and low) | **Low.** One validated integer, but a successor can overwrite it |

---

## Batches

### Batch 1, owner-guard on web dashboard routes

Nineteen routes whose only caller is a page behind `proxy.ts`: `dashboard`,
`documents`, `archive-videos`, `voice-recordings`, `voice-recordings/[id]/play`,
`photo-labels`, `witness-sessions`, `wisdom-session`, `dates`, `save`,
`register-photo`, `entity-feedback`, `process-document`, `process-video`,
`invite-witness`, `preferences`, `processing-status`, `wechat-link`,
`entity-accuracy`. Each takes the `owner-deposit` pattern verbatim, comment
included, and the caller-supplied `archiveId` parameter is deleted rather than
validated, which is what `fix/contributors-write-auth` did to the `contributors`
writes. Four of them need a second change beyond the guard, because they are
addressed by a row id rather than an archive id: `voice-recordings/[id]/play`
must filter the recording query on `archive_id`, `dates` DELETE must scope the
target row to the session archive, `wisdom-session` PATCH must scope the session
row, and `entity-feedback` must scope the `entity_conversations` update. Removing
the query parameter changes the client call sites too, so this batch touches
roughly a dozen `*Client.tsx` files. The one caller that will genuinely break is
`ContributeClient.tsx:1243`, and it is already broken: it omits `conversationId`
and the route 400s on it today, so the contributor rating control has never
worked.

### Batch 2, owner-guard on the category (a) routes

Eleven routes that already require a session but authorize on `session.archiveId`
alone: `memory-map`, `timeline`, `training-data`, `update-profile`, `upload-url`,
`wisdom-exchange`, `scenarios/respond`, `succession/add`, `succession/remove`,
`terminate`, and `debug-gallery` if it is kept rather than deleted. The fix is
three lines each, the `archives.owner_user_id === session.userId` check, with no
client change at all, because none of these accept an archiveId parameter in the
first place. This is the cheapest batch by a wide margin and the lowest risk of
breaking a caller. The two that matter most are `succession/add` and
`terminate`: today a successor can provision another successor onto the archive
they were granted access to, and can schedule the owner's archive for deletion.

### Batch 3, cron-secret on the send and poll routes

Five routes reached by `app/api/cron/send-photos/route.ts`: `morning-digest`,
`life-event`, `send-photo`, `contribution-alert`, and `poll-replies`. The cron
entry point itself is correctly gated, but it fans out over plain `fetch` with no
credential on three of the five calls, so hardening the children means adding the
`Authorization: Bearer ${CRON_SECRET}` header to those fan-out calls at the same
time. Three of the five also have a legitimate second caller, the owner's own
browser: `send-photo` and `poll-replies` from the Preferences page, `life-event`
from the Dates page. Those need a two-branch guard, cron secret or owner session,
which is the shape `poll-replies` was already reaching for and got wrong.
`poll-replies` is the urgent one in this batch: line 79 treats a body of
`{"manual": true}` as equivalent to holding `CRON_SECRET`, so the gate is
decorative. Separately, and not part of the fix, the cron secret is written as a
literal query-string value in `vercel.json` and is therefore in git history.

### Batch 4, the iOS surface

Four routes whose only caller is `basalith-app`: `daily-session`, `journal`,
`mobile-spark`, `push-token`. They are the last unguarded remnants of the mobile
shim. The app authenticates against `mobile-login`, which is bcrypt against
`archive_credentials` and returns an archive id but establishes no Supabase
session and sets no cookie. The `x-archive-id` header the app still sends on
several calls is read by nothing in this repo outside a negative test assertion.
Every other route the app calls, `dashboard-mobile`, `gallery`, `owner-deposit`,
`upload`, `timeline`, `recordings-mobile` and the rest, already requires a real
session and therefore already 401s for iOS. So these four are not a working
mobile surface that hardening would break, they are the only four holes the app
still fits through. Guarding them makes iOS uniformly dead instead of partly
dead, which is the state the July 2026 shim hotfix already chose for everything
else. `daily-session` needs more than a guard, see the note below.

### Batch 5, delete-route

Nine routes with no caller in either repo: `init`, `invite`, `bulk-upload`,
`deposit-prompt`, `send-summary`, `check-credentials`, `test-inbound`,
`debug-gallery`, and, if Batch 3 lands, nothing else. Three are genuinely
dangerous and are the reason this batch should not wait for its turn in a queue:
`init` creates archives anonymously, `invite` adds an attacker-controlled email
as an active contributor so the nightly send starts mailing them family
photographs, and `bulk-upload` writes arbitrary files into any archive's storage
bucket. The other five are diagnostics and superseded helpers. Deletion is
cleaner than a guard here because a guard on a route nobody calls is dead code
that still has to be reasoned about at the next sweep. If any of these turn out
to be called by something outside both repos, a Postman collection or a Legacy
Guide bookmark, deletion surfaces that immediately as a 404 rather than hiding it.

### What remains in this triage

Batches 1, 2, 3, 4 and 5 are closed. **Two needs-decision items are left, and
they are not equal in weight.**

1. **`receive-reply` is the substantive one.** It is the only route in the
   document that is still reachable, still on a live path, and still
   unverified. `app/api/resend/inbound/route.ts:366` falls through to it by
   `fetch` for the legacy `email_sessions` reply-address pattern, so it cannot
   simply be deleted. It reads `svix-id`, `svix-timestamp` and `svix-signature`
   at lines 67-75, logs them, and processes regardless. It is no longer a
   webhook target, so svix verification is the wrong fix. The choice is between
   making it a function in `lib/` that `inbound` calls directly, and keeping the
   route behind an internal shared secret, which is now the same shape the four
   Batch 3 routes just took. The forward at `inbound:366` would need the header
   in the same commit, exactly as `poll-replies` did for `contribution-alert`.
   Worth recording alongside it: **`inbound` itself verifies no signature
   either**, and it is the route Resend actually posts to. That is a wider
   question than `receive-reply` and is not tracked anywhere else in this
   document.

2. **The `setup-voice-clone` and `test-voice` owner path is a product question,
   not a security one.** `a409eaf` already deleted both session branches, so
   nothing is open today: the routes are god-only and a successor can no longer
   synthesize the owner's voice. What is left to decide is whether an
   owner-initiated voice clone path should exist at all. If yes, the branch
   comes back with the standard owner-guard. If no, nothing happens. Either way
   no hole stays open while it waits.

Outside the two, the orphan cron section above is the other thing this document
now carries that needs David rather than an engineer, and `pay-residuals` is
the item in it that matters.

### Batch 6, needs-decision

Three routes where the fix depends on a product call, not on reading more code.
`receive-reply` is still reachable and still used, but only as an internal
`fetch` forward from `app/api/resend/inbound/route.ts:366` for the legacy
`email_sessions` path. It is no longer a webhook target, so svix verification is
the wrong fix. It should either become a function in `lib/` that `inbound` calls
directly, or keep its route and gate on an internal shared secret. The
`setup-voice-clone` and `test-voice` session branches have no caller at all, only
the god surface calls them, so the branch can simply be deleted. Keeping an
owner-initiated voice clone path is a product decision, and if the answer is yes
the branch takes the standard owner-guard. `test-voice` is the one to settle
first: its session branch synthesizes the owner's cloned voice saying arbitrary
caller-supplied text and returns a signed URL to it.

---

## Recommended order

1. **Batch 5, delete-route.** First, because it removes three of the worst holes
   in the sweep (`init`, `invite`, `bulk-upload`) with no guard to design, no
   client change, and zero risk to a live caller. It also shrinks every batch
   that follows.
2. **Batch 2, category (a) owner-guard.** Second, because it is eleven copies of
   a three-line check with no client change, so it ships in one sitting, and it
   closes the successor privilege escalation on `succession/add` and `terminate`.
3. **Batch 3, cron-secret.** Third, and `poll-replies` should be split out and
   done first inside it. That one line is currently an open door to the Resend
   inbox poll, Sonnet spend, and outbound email across every archive.
4. **Batch 1, owner-guard on web routes.** Fourth despite holding the highest
   severity findings, because it is the only batch that changes client call sites
   and therefore the only one that can break the owner's dashboard. It wants its
   own regression pass and should not be rushed behind three other batches in the
   same commit. Within it, the read routes that return family material
   (`dashboard`, `documents`, `voice-recordings`, `voice-recordings/[id]/play`,
   `photo-labels`, `witness-sessions`) are worth doing as the first sub-group.
5. **Batch 6, needs-decision.** Fifth, because it needs an answer from David
   before any code moves. `test-voice` is the one that should not sit long.
6. **Batch 4, iOS.** Last, because it is the only batch whose blast radius is a
   shipped client rather than this repo, and because it is the batch most likely
   to be superseded by the OTP work rather than fixed here.

The one exception to that order: if the OTP build is close, Batch 4 should be
folded into it rather than done twice.

---

## The specific questions

**`daily-session` POST.** It is a different bug shape from a missing guard, and a
guard alone does not fix it. The handler takes `sessionId` from the body, reads
`daily_sessions` by that id, and then does `const archiveId = session.archive_id`
(lines 174-182). The archive is derived from a caller-supplied row, so the row id
is the authority. Adding an owner-guard on top would leave that intact: a
signed-in owner could still pass another archive's session id and write into it.
The fix has two parts. Derive `archiveId` from the session as usual, then scope
the `daily_sessions` lookup with `.eq('id', sessionId).eq('archive_id',
archiveId)` so the row id is never authority on its own. This is the same
correction `fix/contributors-write-auth` applied to the contributors DELETE. The
GET half has its own problem, unrelated to the POST: it inserts a
`daily_sessions` row for any archive id passed to it, so an unauthenticated
caller can create rows, and it returns a signed photograph URL.

**`receive-reply`.** Confirmed. Lines 67-75 read `svix-id`, `svix-timestamp`, and
`svix-signature`, log them, and the comment says verification can be added once
`RESEND_WEBHOOK_SECRET` is set. Nothing verifies. `app/api/resend/inbound` is the
live inbound path, and it is where the token-based `reply+{token}@` sessions
resolve. `receive-reply` is not fully superseded: `inbound` line 357-372 falls
through to it by `fetch` for the legacy `email_sessions` reply-address pattern.
So it is still reachable and still on a live path, which is why it is
needs-decision rather than delete-route. Note that `inbound` itself verifies no
signature either, and it is the route Resend actually posts to.

**The list routes.** Confirmed, all five take `archiveId` from the query string
and perform no auth of any kind: `photo-labels:5-10` (also requires
`photographId`), `voice-recordings:6-16`, `witness-sessions:5-12`,
`documents:6-16`, `archive-videos:6-16`. This is the identical shape closed on the
by-id routes in `fix/mirror-ownership`. `voice-recordings/[id]/play` is worse than
the list routes and was not in that fix: it takes only the row id, does not filter
on `archive_id`, and returns a signed audio URL.

**`setup-voice-clone` and `test-voice`.** Confirmed. Both compute
`isGodMode` from the `god-mode-auth` cookie compared against `GOD_MODE_PASSWORD`
or `CRON_SECRET`, then fall through to `session?.archiveId` with no ownership
check (`setup-voice-clone:19-32`, `test-voice:21-33`). One correction to the
sweep's framing: the fallback is not an alternative entry point for a real
caller. Grep across both repos finds exactly two call sites,
`app/god/GodModeClient.tsx:265` and `:313`, both of which send an archiveId and
therefore take the god branch. The session branch has no caller.

**`/api/mobile/*` authentication.** All five require a full Supabase owner
session and verify `archives.owner_user_id === session.userId`, which is correct
and matches `owner-deposit`. `my-archives` goes further and accepts no
caller-supplied identifier at all. The iOS app cannot satisfy any of them. It
authenticates through `app/api/archive/mobile-login`, which is bcrypt against
`archive_credentials`, returns an archive id, and sets no cookie and issues no
token. Its own header comment says it is a deprecated shim kept until the Phase 7
OTP build. So the answer to "how do the mobile routes authenticate today" is:
they authenticate correctly, and the app cannot reach them. The shim was not
deleted, but it was defanged: the `x-archive-id` header the app still sends is
read by no production code in this repo, only by
`app/api/archive/unauth-access.test.ts` as a negative assertion. What is still
live is `mobile-login` itself, which is a real bcrypt credential path that
predates Supabase Auth and should be deleted with the OTP build.

**Dead code.** Nine routes have no caller in either repo: `init`, `invite`,
`bulk-upload`, `deposit-prompt`, `send-summary`, `check-credentials`,
`test-inbound`, `debug-gallery`, `terminate`. Of those, `test-inbound` and
`debug-gallery` are the obvious diagnostics, and `check-credentials` is a third
one the sweep did not flag as such. `bulk-upload` is superseded rather than
merely unused: `LabelClient.tsx:116,138` uses `upload-url` plus `register-photo`
for the same job. `terminate` is listed here for completeness but is not proposed
for deletion, because it implements a real lifecycle promise, `archive_lifecycle`
and `scheduled_deletion_at` exist, and the absence of a caller reads as an
unbuilt UI rather than a retired feature. Two more are worth naming as partly
dead rather than dead: the `ContributeClient` call into `entity-feedback` has
never worked, and the `basalith-app` call into `timeline` cannot work, because the
route ignores `?archiveId` and reads the session.

---

## The orphan crons (recon only, nothing changed)

Found while doing Batch 3. Five routes under `app/api/cron/` have **no
`vercel.json` crons[] entry, no caller that can reach them, and have therefore
never run in production**. `vercel.json` has 19 entries; these five are not
among them. This section exists so the finding is not lost. **No file was
edited, nothing was scheduled, nothing was deleted.** This is input for David.

Auth is not the issue with any of them: all five already validate
`CRON_SECRET`, three of them with the older `query || header` form that
`08b8c6d` normalized elsewhere. If any is ever scheduled, it should take the
normalized block first.

Three of the five have a **God Mode button that cannot work**. `GodModeClient.tsx`
`CRON_BUTTONS` lists `family-reactions` (:113), `cold-storage-ping` (:118) and
`pause-reminder` (:123), and `handleTrigger` posts to `/api/god/trigger`. That
route's `CRON_ROUTES` map (`trigger/route.ts:11-21`) holds nine entries and
none of these three, so the button returns 400 `Unknown route` and renders
`✗`. So the buttons are not callers. They are evidence that someone intended
these to be runnable and stopped halfway.

| Route | What it does | Tables touched | Reads as | Anything expecting its effects |
|---|---|---|---|---|
| `pay-residuals` | Monthly Legacy Guide residual. For each certified guide with an active Stripe account, sums 12% of annual tier price / 12 across their `Active Client` prospects, inserts a `commissions` row, then attempts a Stripe Connect transfer and marks it paid | reads `archivists`, `prospects`; writes `commissions` | **Finished job missing a schedule.** Complete: tier table, idempotency (one residual per guide per calendar month), Stripe transfer, paid/pending state, per-guide error isolation | **Yes, and this is the one that matters.** See below |
| `guide-quality-audit` | Scores each guide's client archives (photos, deposits, voice, contributors, archive_score) and writes an average back to the guide, flagging anyone under 50 | reads `archivists`, `prospects`, `archives`, `photographs`, `owner_deposits`, `voice_recordings`, `contributors`; writes `archivists.quality_score`, `archivists.active_archives` | **Finished job missing a schedule**, with one known-weak join (line 70 matches archives by `prospects.id`, which is a prospect id, not an archive id, so `archives` almost certainly returns nothing and every guide falls back to the flat 50) | **Yes.** `archivist/dashboard/route.ts:58` and `EarningsClient.tsx:76` both display `quality_score`. It is `DEFAULT 0` (`20260506_guide_portal.sql:40`) and **this cron is its only writer**, so every guide's quality score is permanently 0 |
| `family-reactions` | Weekly Monday digest of contributor answers from the 7-14 day window, then marks them notified | reads `archives`, `contributor_questions`, `contributors`; writes `contributor_questions.owner_notified` | **Finished job missing a schedule.** Idempotent by the `owner_notified` flag | No. `owner_notified` is written only here; nothing reads it |
| `cold-storage-ping` | Re-engagement email to paused/resting archives at 90/180/270 days, quoting one of the owner's own high-quality deposits | reads `archives`, `owner_deposits`; writes `owner_notifications` | **Finished job missing a schedule.** Idempotent per milestone | No |
| `pause-reminder` | Monthly reminder to archives paused ~6 or ~12 months | reads `archives`; writes `owner_notifications` | **Finished job missing a schedule.** Idempotent per calendar month. Overlaps `cold-storage-ping` in intent | No |

**None of the five reads as dead code.** Every one is complete, idempotent, and
coherent. The shared defect is a missing `vercel.json` entry, not an unfinished
implementation. `guide-quality-audit` is the only one with a real bug inside it
as well.

**`pay-residuals` is the one to settle.** The residual model is not just
declared, it is *displayed*. `archivist/dashboard/route.ts:43-55` computes a
`residualMRRCents` tile by deriving 12% of annual / 12 from the guide's active
prospects, and its own comment says the derivation exists "so the dashboard
tile agrees with the earnings page and with **what is paid**."
`EarningsClient.tsx:18-37` repeats the same arithmetic, and
`EarningsClient.tsx:239` states a Legacy archive "generates $144/year in
residuals." Nothing is paid. The cron that would write the `commissions` rows
has never run, so `thisMonthCents` on the same dashboard, which does read
`commissions` (`route.ts:21,37-38`), can never include a residual.

That is a live gap between what a Legacy Guide is shown and what exists, which
puts it under the standing integrity rule in CLAUDE.md section 8, not just
under this triage. It needs a decision from David, and the decision is a
product one: schedule the cron, or change what the guide portal claims. It
should not be scheduled as a side effect of an auth batch, because scheduling
it starts moving real money through Stripe Connect on the first run.

`residual_income_cents`, shown on the guide leaderboard
(`archivist/dashboard/route.ts:23`, `LeaderboardClient.tsx:13,102`), has **no
writer anywhere in the repo**, not even in these five. That is a separate
finding and a smaller one.

---

## Surprises, and where live code contradicts the sweep

**`poll-replies` is not cron-gated.** The sweep lists it as (c),
`Bearer CRON_SECRET`. Live code at `app/api/archive/poll-replies/route.ts:70-81`
accepts either the cron secret or `{"manual": true}` in the request body. The
bypass is not subtle and it is not vestigial: it exists to serve the owner's
"check replies" button at `PreferencesClient.tsx:125`, which sends no credential.
An anonymous POST with a two-word body triggers a Resend inbox fetch, up to fifty
Sonnet calls, writes into `email_replies` and `labels` across every archive with
an open session, and sends confirmation email to every sender. This is the single
finding in this pass that most changes the shape of the work, and the sweep's
own summary treats `poll-replies` as an example of a route that is already done
correctly.

**`invite` is worse than "sends email".** The sweep records it as
`POST archiveId → sends email`, which reads as a medium. The upsert at
`invite/route.ts:25-30` writes `status: 'active'` into `contributors`. Active
contributors are exactly the set `send-photo` iterates over every night, and the
photographs it mails carry permanent `/api/photos/{id}` proxy URLs that need no
auth by design. So one unauthenticated call subscribes an arbitrary address to a
family's photographs indefinitely. It is also the one route in this pass with no
caller at all, which is why the recommendation is deletion rather than a guard.

**`fix/contributors-write-auth` closed the front door and left this one open.**
That commit's own note says `invite` writes to the `contributors` table directly
rather than through the `contributors` route. It recorded the fact and did not
follow it. The hardened DELETE now prevents deactivating a contributor without a
session, while `invite` still permits creating one without a session.

**`daily-session` GET hands out a photograph.** The sweep lists it as
`GET ?archiveId`, in the same visual weight as `preferences` or `mobile-spark`.
It returns a one hour signed URL to an unlabelled family photograph, the name of
a contributor, and that contributor's answer text, and it inserts a
`daily_sessions` row as a side effect of a GET. It belongs with the high
severity reads, not with the metadata reads.

**`wechat-link` mints a credential.** Listed as `GET ?archiveId` alongside the
other reads. It generates and persists `wechat_link_code` when the archive has
none, and `app/api/wechat/webhook/route.ts:91-105` accepts that six character
code from any WeChat user to set `wechat_open_id`, with no check for an existing
link. That is a credential issuance endpoint, not a read.

**The sweep's route table is one row short.** The repo has 77 route files under
`app/api/archive`. The table lists 76 and omits `contributor-activity-mobile`.
That route is category (b), session plus ownership verified, so nothing is open,
but the totals line in the sweep should not be trusted as a census.

**Three routes write on a GET.** `entity-accuracy` upserts `entity_accuracy`,
`daily-session` inserts `daily_sessions`, and `wechat-link` updates `archives`.
None of them is idempotency-safe against a crawler, and all three are currently
unauthenticated.

**The `x-archive-id` header is fully dead, which is better news than expected.**
The sweep's framing of the mobile shim left open whether a header path still
exists. It does not. Nothing in `app/`, `lib/`, or `proxy.ts` reads that header.
The app still sends it, and the server ignores it. The remaining iOS exposure is
not a shim, it is four routes that were never guarded in the first place.
