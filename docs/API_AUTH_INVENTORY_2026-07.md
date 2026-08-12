# API Auth Inventory, July 2026

A complete, filesystem-derived inventory of every API route in this repository.

**Method.** The route list came from `Get-ChildItem -Recurse -Path app/api -Filter route.ts`
and nothing else. No prior sweep, triage, flow inventory, or context doc was opened as a
source of routes. Every one of the 169 files was read before its row was written.

**Denominator.** 169 files.

**Scope.** This pass records what is literally in each file. It assigns no severity, no risk
rating, and no recommendation. Judgment is a separate pass.

---

## Reference: the auth helpers these labels refer to

Read from source, so the labels below are grounded rather than assumed.

| Helper | File | What it actually proves |
| --- | --- | --- |
| `getSessionUser()` | `lib/auth/getSessionUser.ts` | A real Supabase Auth session. Resolves `archiveId`, `archivistId`, `successorId` from linkage columns. Fills `archiveId` for successors too, so `session.archiveId` alone is not proof of ownership. |
| `getArchiveSession()` | `lib/apiSecurity.ts` | Presence of the `archive-id` and `archive-auth` cookies. Returns the archive id straight from the cookie. No signature, no lookup. Not called by any route in this inventory. |
| `getArchivistSession()` | `lib/apiSecurity.ts` | Presence of the `archivist-id` and `archivist-auth` cookies. Not called by any route in this inventory. |
| `getGodModeAuth(req)` | `lib/apiSecurity.ts` | Cookie `god-mode-auth` equals `GOD_MODE_PASSWORD` or, as a fallback, `CRON_SECRET`. |
| `getContributorByToken()` | `lib/contributorToken.ts` | `contributors.access_token` lookup with `status = 'active'`. |
| `checkRateLimit()` | `lib/apiSecurity.ts` | In-memory per-instance throttle. No identity. |

Several routes inline their own copy of the god check or the cron check rather than importing
a helper. Those are labeled the same way.

**Middleware note.** `proxy.ts` gates the page prefixes `/archive`, `/archivist`, and
`/succession/portal`. None of those prefixes match `/api/...`, so no API route in this
inventory receives any protection from edge middleware. Every gate below is in-route.

**Shared writers.** Three lib helpers write tables that do not appear in the calling route's
own SQL. Their targets were confirmed by reading the helper.

- `classifyDeposit()` writes `deposit_domain_scores` (upsert).
- `createTrainingPairFromDeposit()` and `createTrainingPairsFromVoice()` write `training_pairs`.
- `createEmailReplySession()` writes `email_reply_sessions`.

Where a route calls one of these, the target table is listed in its Writes cell.

---

# Section 1. The full table

## /api/admin (3)

| Route path | File | Methods | Auth mechanism | Identity source | Writes | Sends |
| --- | --- | --- | --- | --- | --- | --- |
| /api/admin/checkout | app/api/admin/checkout/route.ts | POST | `god` | request body (`applicationId`) | none | none |
| /api/admin/guide | app/api/admin/guide/route.ts | POST | `god` | request body (`email`, `id`) | archivists, Supabase Auth users | none (mints a magic link, does not send it) |
| /api/admin/test-cron | app/api/admin/test-cron/route.ts | POST | `god` | request body (allowlisted `cronRoute`) | none | none |

## /api/apply (1)

| Route path | File | Methods | Auth mechanism | Identity source | Writes | Sends |
| --- | --- | --- | --- | --- | --- | --- |
| /api/apply | app/api/apply/route.ts | POST | `rate_limit_only` | request body | archive_applications | resend to `ADMIN_EMAIL`, plus `mrdavidha@gmail.com` on business leads |

## /api/archive (69)

| Route path | File | Methods | Auth mechanism | Identity source | Writes | Sends |
| --- | --- | --- | --- | --- | --- | --- |
| /api/archive/accuracy-mobile | .../accuracy-mobile/route.ts | GET | `session_owned` | session | none | none |
| /api/archive/archive-videos | .../archive-videos/route.ts | GET | `session_owned` | session | none | none |
| /api/archive/archive-videos/[id] | .../archive-videos/[id]/route.ts | GET | `session_owned` | session (URL segment scoped by `archive_id`) | none | none |
| /api/archive/archive-videos/[id]/play | .../archive-videos/[id]/play/route.ts | GET | `session_owned` | session (URL segment scoped by `archive_id`) | none (mints a signed storage URL) | none |
| /api/archive/b2b-question/answer | .../b2b-question/answer/route.ts | POST | `session_owned` (also requires `tier = 'succession'`) | session | owner_deposits, question_history, incident_sessions (via `persist`/`completeIncident`), deposit_domain_scores, training_pairs | none |
| /api/archive/b2b-question/next | .../b2b-question/next/route.ts | GET | `session_owned` (also requires `tier = 'succession'`) | session | incident_sessions (via `createIncident`/`persist`) | none |
| /api/archive/contribution-alert | .../contribution-alert/route.ts | POST | `cron_secret` | request body (`archiveId`, `labelId`) | owner_notifications | resend to `archives.owner_email` |
| /api/archive/contributor-activity-mobile | .../contributor-activity-mobile/route.ts | GET | `session_owned` | session | none | none |
| /api/archive/contributors | .../contributors/route.ts | GET, POST, PATCH, DELETE | `session_owned` | session | contributors | resend to `contributors.email` |
| /api/archive/daily-session | .../daily-session/route.ts | GET, POST | `session_owned` | session | daily_sessions, owner_deposits, daily_spark_responses, labels, journal_entries, archives, deposit_domain_scores, training_pairs | none |
| /api/archive/dashboard | .../dashboard/route.ts | GET | `session_owned` | session | none | none |
| /api/archive/dashboard-mobile | .../dashboard-mobile/route.ts | GET | `session_owned` | session | owner_photo_sends (insert and delete) | none |
| /api/archive/dates | .../dates/route.ts | GET, POST, DELETE | `session_owned` | session | significant_dates | none |
| /api/archive/documents | .../documents/route.ts | GET | `session_owned` | session | none | none |
| /api/archive/documents/[id] | .../documents/[id]/route.ts | GET | `session_owned` | session (URL segment scoped by `archive_id`) | none | none |
| /api/archive/entity-accuracy | .../entity-accuracy/route.ts | GET | `session_owned` | session | entity_accuracy (upsert on a GET) | none |
| /api/archive/entity-chat | .../entity-chat/route.ts | POST | `session_owned` + `token` | session, or `contributors.access_token` from the Authorization header or request body | entity_conversations, owner_deposits, deposit_domain_scores, training_pairs | resend to `contributors.email` on first use of a deposit |
| /api/archive/entity-feedback | .../entity-feedback/route.ts | POST | `session_owned` | session | entity_conversations, owner_deposits, entity_accuracy, deposit_domain_scores | none |
| /api/archive/entity-readiness | .../entity-readiness/route.ts | GET, POST | `session_owned` | session | archives | resend to `contributors.email` on `enable_preview` |
| /api/archive/export | .../export/route.ts | GET | `session_owned` | session | none (mints signed storage URLs) | none |
| /api/archive/gallery | .../gallery/route.ts | GET | `session_owned` | session | none | none |
| /api/archive/invite-witness | .../invite-witness/route.ts | POST | `session_owned` | session | witness_sessions, owner_notifications | resend to a body-supplied `contributorEmail` |
| /api/archive/journal | .../journal/route.ts | GET, POST | `session_owned` | session | journal_entries, owner_deposits, deposit_domain_scores, training_pairs | none |
| /api/archive/life-event | .../life-event/route.ts | POST | `cron_secret` + `session_owned` | request body `archiveId` on the cron path, session on the owner path | owner_notifications | resend to `archives.owner_email` and active contributors |
| /api/archive/magic-login | .../magic-login/route.ts | GET | `token` (`archives.magic_link_token`, 24h expiry, single use) | query string token, resolved to a token row | archives (clears the token) | none (sets `archive-auth` and `archive-id` cookies) |
| /api/archive/memory-game-mobile | .../memory-game-mobile/route.ts | GET, POST | `session_owned` | session | owner_deposits, deposit_domain_scores | none |
| /api/archive/memory-map | .../memory-map/route.ts | GET | `session_owned` | session | none | none |
| /api/archive/mirror | .../mirror/route.ts | GET | `session_owned` | session | none | none |
| /api/archive/mirror/react | .../mirror/react/route.ts | POST | `session_owned` | session (body `reflectionId` scoped by `archive_id`) | mirror_reflections | none |
| /api/archive/mobile-login | .../mobile-login/route.ts | POST | `token` (email plus bcrypt password against `archive_credentials`) | request body | archive_credentials (`last_used_at`) | none |
| /api/archive/mobile-spark | .../mobile-spark/route.ts | GET | `session_owned` | session | none | none |
| /api/archive/morning-digest | .../morning-digest/route.ts | POST | `cron_secret` | request body (`archiveId`) | owner_notifications | resend to `archives.owner_email` |
| /api/archive/my-archives | .../my-archives/route.ts | GET | `session_only` | session | none | none |
| /api/archive/owner-deposit | .../owner-deposit/route.ts | POST | `session_owned` | session | owner_deposits, labels, archives, deposit_domain_scores, training_pairs | none |
| /api/archive/photo-labels | .../photo-labels/route.ts | GET | `session_owned` | session | none | none |
| /api/archive/photo-url | .../photo-url/route.ts | GET | `session_owned` | session | none (mints a signed storage URL) | none |
| /api/archive/poll-replies | .../poll-replies/route.ts | POST | `cron_secret` + `session_owned` | cron path is archive-wide, owner path is scoped to the session archive | email_replies, labels, contributor_photo_sends, email_sessions | resend to the reply sender |
| /api/archive/preferences | .../preferences/route.ts | GET, POST | `session_owned` | session | email_preferences | none |
| /api/archive/process-document | .../process-document/route.ts | POST | `session_owned` | session | archive_documents, owner_deposits, deposit_domain_scores, storage `archive-documents` | none |
| /api/archive/process-video | .../process-video/route.ts | POST | `session_owned` | session | archive_videos, owner_deposits, deposit_domain_scores, storage `archive-videos` | none |
| /api/archive/processing-status | .../processing-status/route.ts | GET | `session_owned` | session | none | none |
| /api/archive/push-token | .../push-token/route.ts | POST | `session_owned` | session | archives (`expo_push_token`) | none |
| /api/archive/random-thought | .../random-thought/route.ts | POST | `session_owned` | session (body `archiveId` is parsed but never used) | owner_deposits, deposit_domain_scores, training_pairs | none |
| /api/archive/receive-reply | .../receive-reply/route.ts | POST | `token` (`email_sessions.reply_address`) | request body `to` address, resolved to a session row | email_replies, labels, photographs, email_sessions | resend to the reply sender |
| /api/archive/recordings-mobile | .../recordings-mobile/route.ts | GET | `session_owned` | session | none | none |
| /api/archive/register-photo | .../register-photo/route.ts | POST | `session_owned` | session | photographs | none (fires an Inngest event) |
| /api/archive/save | .../save/route.ts | POST | `session_owned` | session | photographs, labels, people, decade_coverage, archives, milestones, training_pairs, storage `photographs` | none |
| /api/archive/scenarios/respond | .../scenarios/respond/route.ts | POST | `session_owned` | session | b2b_scenario_responses, owner_deposits, deposit_domain_scores, training_pairs | none |
| /api/archive/send-photo | .../send-photo/route.ts | POST | `cron_secret` + `session_owned` | request body `archiveId` on the cron path, session on the owner path | email_reply_sessions, email_sessions, contributor_photo_sends, owner_photo_sends, email_preferences | resend to contributors and to the owner, plus WeChat |
| /api/archive/setup-voice-clone | .../setup-voice-clone/route.ts | POST | `god` | request body (`archiveId`) | archives (`elevenlabs_voice_id`) | none |
| /api/archive/significant-dates-mobile | .../significant-dates-mobile/route.ts | GET, POST | `session_owned` | session | significant_dates | none |
| /api/archive/succession/add | .../succession/add/route.ts | POST | `session_owned` | session | successors, Supabase Auth users | none |
| /api/archive/succession/remove | .../succession/remove/route.ts | POST | `session_owned` | session (body `successorId` scoped by `archive_id`) | successors (delete) | none |
| /api/archive/switch | .../switch/route.ts | POST | `session_owned` | request body `archiveId`, verified against `owner_user_id` or `contributors.email` | none (sets the `archive-id` cookie) | none |
| /api/archive/terminate | .../terminate/route.ts | POST | `session_owned` | session | archives (`termination_requested_at`, `scheduled_deletion_at`) | resend to `archives.owner_email` and `ADMIN_EMAIL` |
| /api/archive/test-voice | .../test-voice/route.ts | POST | `god` | request body (`archiveId`) | storage `voice-recordings` | none |
| /api/archive/timeline | .../timeline/route.ts | GET | `session_owned` | session | none | none |
| /api/archive/training-data | .../training-data/route.ts | GET | `session_owned` | session | none | none |
| /api/archive/transcribe-voice | .../transcribe-voice/route.ts | POST | `session_owned` | session | voice_recordings, owner_deposits, deposit_domain_scores, training_pairs, storage `voice-recordings` | none |
| /api/archive/update-profile | .../update-profile/route.ts | POST | `session_owned` | session | archives (birth year and decade) | none |
| /api/archive/upload | .../upload/route.ts | POST | `session_owned` | session | photographs, archives, storage `photographs` | none |
| /api/archive/upload-url | .../upload-url/route.ts | POST | `session_owned` | session | none (mints a signed upload URL) | none |
| /api/archive/voice-recordings | .../voice-recordings/route.ts | GET | `session_owned` | session | none | none |
| /api/archive/voice-recordings/[id]/play | .../voice-recordings/[id]/play/route.ts | GET | `session_owned` | session (URL segment scoped by `archive_id`) | none (mints a signed storage URL) | none |
| /api/archive/wechat-link | .../wechat-link/route.ts | GET | `session_owned` | session | archives (`wechat_link_code`) | none |
| /api/archive/wisdom-exchange | .../wisdom-exchange/route.ts | GET, POST | `session_owned` | session (body `exchangeId` scoped by `archive_id`) | wisdom_exchanges, owner_deposits, deposit_domain_scores, training_pairs | none |
| /api/archive/wisdom-exchange-mobile | .../wisdom-exchange-mobile/route.ts | GET, POST | `session_owned` | session (body `exchangeId` scoped by `archive_id`) | wisdom_exchanges, training_pairs | none |
| /api/archive/wisdom-session | .../wisdom-session/route.ts | GET, POST, PATCH | `session_owned` | session (body `sessionId` scoped by `archive_id`) | wisdom_sessions, owner_deposits, deposit_domain_scores, training_pairs | none |
| /api/archive/witness-sessions | .../witness-sessions/route.ts | GET | `session_owned` | session | none | none |

## /api/archive-login (1)

| Route path | File | Methods | Auth mechanism | Identity source | Writes | Sends |
| --- | --- | --- | --- | --- | --- | --- |
| /api/archive-login | app/api/archive-login/route.ts | POST | `none` | n/a | none | none |

## /api/archivist (8)

| Route path | File | Methods | Auth mechanism | Identity source | Writes | Sends |
| --- | --- | --- | --- | --- | --- | --- |
| /api/archivist/certification | .../certification/route.ts | GET, POST | `none` | query string `archivistId` (GET), request body `archivistId` (POST) | guide_certifications, guide_module_answers, archivists | none |
| /api/archivist/connect-stripe | .../connect-stripe/route.ts | POST, GET | `session_only` (POST), `session_owned` (GET) | session; GET also reads a Stripe `account` id from the query string and verifies `account.metadata.archivistId` against the session | archivists (`stripe_account_id`, `stripe_account_status`) | none |
| /api/archivist/dashboard | .../dashboard/route.ts | GET | `session_owned` | session (query params explicitly ignored) | none | none |
| /api/archivist/demo/incident/start | .../demo/incident/start/route.ts | POST | `session_only` + `rate_limit_only` | session | none | none |
| /api/archivist/demo/incident/turn | .../demo/incident/turn/route.ts | POST | `session_only` + `rate_limit_only` | session | none | none |
| /api/archivist/onboard-client | .../onboard-client/route.ts | POST | `none` | n/a | none | none |
| /api/archivist/prospects | .../prospects/route.ts | GET, POST, PATCH, DELETE | `session_owned` | session (all queries constrained by `archivist_id`) | prospects | none |
| /api/archivist/submit-exam | .../submit-exam/route.ts | POST | `none` | request body `archivistId` | guide_certifications, guide_module_answers, archivists | resend to `archivists.email` |

**In flight.** A branch `fix/guide-route-auth` is currently changing
`app/api/archivist/connect-stripe/route.ts` and `app/api/archivist/onboard-client/route.ts`.
Both rows above were read from `main` via `git show main:<path>`, not from the working tree.
On `main`, `onboard-client` is already a 410 stub with the original handler preserved as a
comment; its retirement note records that the live handler had no caller authentication and
no idempotency guard.

## /api/archivist-apply (1)

| Route path | File | Methods | Auth mechanism | Identity source | Writes | Sends |
| --- | --- | --- | --- | --- | --- | --- |
| /api/archivist-apply | app/api/archivist-apply/route.ts | POST | `none` | request body | none (console.log only) | none |

## /api/archivist-interest (1)

| Route path | File | Methods | Auth mechanism | Identity source | Writes | Sends |
| --- | --- | --- | --- | --- | --- | --- |
| /api/archivist-interest | app/api/archivist-interest/route.ts | POST | `none` | request body | none (console.log only) | none |

## /api/archivist-login (1)

| Route path | File | Methods | Auth mechanism | Identity source | Writes | Sends |
| --- | --- | --- | --- | --- | --- | --- |
| /api/archivist-login | app/api/archivist-login/route.ts | POST | `none` | n/a | none | none |

## /api/auth (1)

| Route path | File | Methods | Auth mechanism | Identity source | Writes | Sends |
| --- | --- | --- | --- | --- | --- | --- |
| /api/auth/logout | app/api/auth/logout/route.ts | GET, POST | `session_only` | session | none (clears cookies) | none |

## /api/contact (1)

| Route path | File | Methods | Auth mechanism | Identity source | Writes | Sends |
| --- | --- | --- | --- | --- | --- | --- |
| /api/contact | app/api/contact/route.ts | POST | `none` | request body | contact_requests | none |

## /api/contribute (11)

Every route in this group resolves the caller through `contributors.access_token`.

| Route path | File | Methods | Auth mechanism | Identity source | Writes | Sends |
| --- | --- | --- | --- | --- | --- | --- |
| /api/contribute/answer | .../answer/route.ts | POST | `token` | token row | contributor_questions, owner_deposits, labels, contributor_photo_sends, contributors, training_pairs | resend to `archives.owner_email` |
| /api/contribute/memory-map | .../memory-map/route.ts | GET | `token` | token row (direct `contributors` lookup, not the helper) | none | none |
| /api/contribute/questions | .../questions/route.ts | GET | `token` | token row | none | none |
| /api/contribute/register-media | .../register-media/route.ts | POST | `token` | token row | archive_videos, archive_documents, contributors | resend to `archives.owner_email` |
| /api/contribute/register-photo | .../register-photo/route.ts | POST | `token` | token row | photographs, labels, contributors | resend to `archives.owner_email` |
| /api/contribute/save-phone | .../save-phone/route.ts | POST | `token` | token row | contributors (`phone`) | none |
| /api/contribute/timeline | .../timeline/route.ts | GET | `token` | token row | none | none |
| /api/contribute/upload-media | .../upload-media/route.ts | POST | `token` | token row | archive_videos, archive_documents, contributors, storage `archive-videos` / `archive-documents` | resend to `archives.owner_email` |
| /api/contribute/upload-photo | .../upload-photo/route.ts | POST | `token` | token row | none (mints a signed upload URL) | none |
| /api/contribute/upload-url | .../upload-url/route.ts | POST | `token` | token row **and** request body `archiveId`, which takes precedence (`archiveId \|\| contributor.archive_id`) | none (mints a signed upload URL) | none |
| /api/contribute/wisdom-exchange | .../wisdom-exchange/route.ts | POST, GET | `token` | token row | wisdom_exchanges | resend to `archives.owner_email` |

## /api/cron (24)

Every route in this group checks `CRON_SECRET`. The "Auth mechanism" column notes where the
secret is accepted. Identity source is `n/a` throughout: these routes sweep archives rather
than acting for a caller.

| Route path | File | Methods | Auth mechanism | Identity source | Writes | Sends |
| --- | --- | --- | --- | --- | --- | --- |
| /api/cron/anniversary-triggers | .../anniversary-triggers/route.ts | GET | `cron_secret` (header or `?secret=`) | n/a | owner_notifications, email_reply_sessions | resend to `archives.owner_email` |
| /api/cron/annual-preview | .../annual-preview/route.ts | GET | `cron_secret` (header or `?secret=`) | n/a | archives (`last_annual_preview_year`) | resend to `archives.owner_email` |
| /api/cron/cold-storage-ping | .../cold-storage-ping/route.ts | GET | `cron_secret` (header or `?secret=`) | n/a | owner_notifications | resend to `archives.owner_email` |
| /api/cron/contributor-mirror | .../contributor-mirror/route.ts | GET | `cron_secret` (header or `?secret=`) | n/a | owner_notifications, email_reply_sessions | resend to `archives.owner_email` |
| /api/cron/daily-reflection | .../daily-reflection/route.ts | GET | `cron_secret` (header or `?secret=`) | n/a (an optional `?archiveId=` narrows the run) | archives (clears expired magic links), email_reply_sessions, question_history (via `selectNextQuestion`), incident_sessions (read only on this route) | resend to `archives.owner_email` |
| /api/cron/entity-letter | .../entity-letter/route.ts | GET | `cron_secret` (header or `?secret=`) | n/a | owner_notifications, email_reply_sessions | resend to `archives.owner_email` |
| /api/cron/family-reactions | .../family-reactions/route.ts | GET | `cron_secret` (header or `?secret=`) | n/a | contributor_questions (`owner_notified`) | resend to `archives.owner_email` |
| /api/cron/gratitude-note | .../gratitude-note/route.ts | GET | `cron_secret` (header or `?secret=`) | n/a | none | resend to `contributors.email` |
| /api/cron/guide-quality-audit | .../guide-quality-audit/route.ts | POST | `cron_secret` (header only) | n/a | archivists (`quality_score`, `active_archives`) | none |
| /api/cron/memory-game-monthly | .../memory-game-monthly/route.ts | GET, POST | `cron_secret` (header or `?secret=`) | n/a | memory_game_sessions, training_pairs | resend to contributors and to the owner |
| /api/cron/memory-game-reminder | .../memory-game-reminder/route.ts | GET | `cron_secret` (header or `?secret=`) | n/a | none | resend to `contributors.email` |
| /api/cron/memory-game-start | .../memory-game-start/route.ts | GET | `cron_secret` (header or `?secret=`) | n/a | memory_game_sessions, photographs (`memory_game_used_at`) | resend to `contributors.email` |
| /api/cron/memory-game-summary | .../memory-game-summary/route.ts | GET | `cron_secret` (header or `?secret=`) | n/a | memory_game_sessions | resend to `contributors.email` |
| /api/cron/monthly-accuracy | .../monthly-accuracy/route.ts | GET | `cron_secret` (header or `?secret=`) | n/a | entity_accuracy, owner_notifications | resend to `archives.owner_email` |
| /api/cron/monthly-report | .../monthly-report/route.ts | GET | `cron_secret` (header or `?secret=`) | n/a | none | resend to `archives.owner_email` |
| /api/cron/pause-reminder | .../pause-reminder/route.ts | GET | `cron_secret` (header or `?secret=`) | n/a | owner_notifications | resend to `archives.owner_email` |
| /api/cron/pay-residuals | .../pay-residuals/route.ts | POST | `cron_secret` (header only) | n/a | commissions | none (creates Stripe Connect transfers) |
| /api/cron/send-photos | .../send-photos/route.ts | GET | `cron_secret` (header or `?secret=`) | n/a | none | none (fans out to child routes with a Bearer header) |
| /api/cron/story-prompt-friday | .../story-prompt-friday/route.ts | GET | `cron_secret` (header or `?secret=`) | n/a | story_prompt_sessions, email_reply_sessions | resend to `contributors.email` |
| /api/cron/story-prompt-monday | .../story-prompt-monday/route.ts | GET | `cron_secret` (header or `?secret=`) | n/a | contributor_story_prompts, photographs, story_prompt_sessions, email_reply_sessions | resend to `contributors.email` |
| /api/cron/voice-portrait | .../voice-portrait/route.ts | GET | `cron_secret` (header or `?secret=`) | n/a | voice_portraits, storage `voice-recordings` | resend to `contributors.email` |
| /api/cron/weekly-mirror | .../weekly-mirror/route.ts | GET | `cron_secret` (header or `?secret=`) | n/a | mirror_reflections, email_reply_sessions | resend to `archives.owner_email` |
| /api/cron/weekly-prompt | .../weekly-prompt/route.ts | GET | `cron_secret` (header or `?secret=`) | n/a | contributor_questions, contributor_questions via `generateQuestionsForContributor`, email_reply_sessions | resend to `archives.owner_email` and `contributors.email` |
| /api/cron/weekly-replay | .../weekly-replay/route.ts | GET | `cron_secret` (header or `?secret=`) | n/a | email_reply_sessions | resend to `archives.owner_email` |

## /api/curator (2)

| Route path | File | Methods | Auth mechanism | Identity source | Writes | Sends |
| --- | --- | --- | --- | --- | --- | --- |
| /api/curator/accept-invite | .../accept-invite/route.ts | POST | `session_only` + `token` | session for the acting user, request body `token` for the curator row | curators, profiles | none |
| /api/curator/seal-memory | .../seal-memory/route.ts | POST | `session_owned` | request body `vault_id`, checked against `profiles.vault_id` | essence_sessions, vault_files, vaults, vault_notifications | none |

## /api/dashboard (3)

| Route path | File | Methods | Auth mechanism | Identity source | Writes | Sends |
| --- | --- | --- | --- | --- | --- | --- |
| /api/dashboard/add-milestone | .../add-milestone/route.ts | POST | `session_owned` | session (vault resolved by `archivist_id = user.id`) | milestones | none |
| /api/dashboard/invite-curator | .../invite-curator/route.ts | POST | `session_owned` | session | curators | Supabase Auth `inviteUserByEmail` to a body-supplied address |
| /api/dashboard/upload | .../upload/route.ts | POST | `session_owned` | request body `vault_id`, checked against `vaults.archivist_id = user.id` | vault_files, vaults | none |

## /api/demo (3)

| Route path | File | Methods | Auth mechanism | Identity source | Writes | Sends |
| --- | --- | --- | --- | --- | --- | --- |
| /api/demo/entity | .../entity/route.ts | POST | `rate_limit_only` | request body | none | none |
| /api/demo/succession-entity | .../succession-entity/route.ts | POST | `rate_limit_only` | request body (`personaId` from a whitelist) | none | none |
| /api/demo/whitepaper | .../whitepaper/route.ts | POST | `rate_limit_only` | request body | none | resend to a caller-supplied address |

## /api/game (3)

| Route path | File | Methods | Auth mechanism | Identity source | Writes | Sends |
| --- | --- | --- | --- | --- | --- | --- |
| /api/game/active | .../active/route.ts | GET | `none` | query string `archiveId` | none | none |
| /api/game/story | .../story/route.ts | GET, POST | `none` | query string and request body (`archiveId`, `contributorId`) | memory_game_responses, training_pairs | none |
| /api/game/[sessionId] | .../[sessionId]/route.ts | GET, POST | `none` | URL segment plus request body | memory_game_contributions, labels, memory_game_sessions | none |

## /api/god (14)

| Route path | File | Methods | Auth mechanism | Identity source | Writes | Sends |
| --- | --- | --- | --- | --- | --- | --- |
| /api/god/auth | .../auth/route.ts | POST | `service_secret` + `rate_limit_only` | request body `password` compared to `GOD_MODE_PASSWORD` or `CRON_SECRET` | none (sets the `god-mode-auth` cookie) | none |
| /api/god/backfill-training | .../backfill-training/route.ts | POST | `god` | request body (`archiveId`, optional) | training_pairs | none |
| /api/god/data | .../data/route.ts | GET | `god` | n/a | none | none |
| /api/god/elicitation-metrics | .../elicitation-metrics/route.ts | GET | `god` | n/a | none | none |
| /api/god/email | .../email/route.ts | POST | `god` | request body (`archiveId`, `type`) | none | resend to `archives.owner_email` |
| /api/god/export-training | .../export-training/route.ts | GET | `god` | query string `archiveId` | none | none |
| /api/god/impersonate | .../impersonate/route.ts | POST | `god` | request body `archiveId` | none (sets `archive-auth` and `archive-id` cookies) | none |
| /api/god/impersonate/logout | .../impersonate/logout/route.ts | GET | `none` | n/a | none (clears cookies) | none |
| /api/god/photo-stats | .../photo-stats/route.ts | GET | `god` | query string `archiveId` | none | none |
| /api/god/rescore-training-pairs | .../rescore-training-pairs/route.ts | POST | `god` | request body (`archiveId`, optional) | training_pairs | none |
| /api/god/score-training-pairs | .../score-training-pairs/route.ts | POST | `god` | request body (`archiveId`, optional) | training_pairs | none |
| /api/god/send-apology | .../send-apology/route.ts | POST | `god` | request body (`contributorName`, optional `archiveId`) | none | resend to `contributors.email` |
| /api/god/send-magic-link | .../send-magic-link/route.ts | POST | `god` (compares `GOD_MODE_PASSWORD` only, no `CRON_SECRET` fallback) | request body `archiveId` | archives (`magic_link_token`, `magic_link_created_at`) | resend to `archives.owner_email` |
| /api/god/trigger | .../trigger/route.ts | POST | `god` | request body (allowlisted `route`, optional `archiveId`) | none | none |

## /api/guide-onboard (1)

| Route path | File | Methods | Auth mechanism | Identity source | Writes | Sends |
| --- | --- | --- | --- | --- | --- | --- |
| /api/guide-onboard | app/api/guide-onboard/route.ts | POST | `token` (`archivist_invites.code`) + `rate_limit_only` | request body | archivists, archivist_invites, Supabase Auth users | none |

## /api/inngest (1)

| Route path | File | Methods | Auth mechanism | Identity source | Writes | Sends |
| --- | --- | --- | --- | --- | --- | --- |
| /api/inngest | app/api/inngest/route.ts | GET, POST, PUT | `service_secret` (delegated to `serve()` from `inngest/next`; no check is visible in this file) | n/a | unconfirmed (the handler delegates to registered Inngest functions) | unconfirmed |

## /api/mobile (5)

| Route path | File | Methods | Auth mechanism | Identity source | Writes | Sends |
| --- | --- | --- | --- | --- | --- | --- |
| /api/mobile/companion | .../companion/route.ts | POST | `session_owned` | session | owner_deposits, deposit_domain_scores, training_pairs | none |
| /api/mobile/mirror | .../mirror/route.ts | GET | `session_owned` | session (the file comment says "archiveId via query param"; the code uses the session) | none | none |
| /api/mobile/mirror/react | .../mirror/react/route.ts | POST | `session_owned` | session (body `reflectionId` scoped by `archive_id`) | mirror_reflections | none |
| /api/mobile/my-archives | .../my-archives/route.ts | POST | `session_only` | session | none | none |
| /api/mobile/spark/random | .../spark/random/route.ts | POST | `session_owned` | session | none | none |

## /api/partner (1)

| Route path | File | Methods | Auth mechanism | Identity source | Writes | Sends |
| --- | --- | --- | --- | --- | --- | --- |
| /api/partner | app/api/partner/route.ts | POST | `none` | request body | partner_applications | none |

## /api/photos (1)

| Route path | File | Methods | Auth mechanism | Identity source | Writes | Sends |
| --- | --- | --- | --- | --- | --- | --- |
| /api/photos/[photoId] | .../[photoId]/route.ts | GET | `rate_limit_only` | URL segment | none (302 to a signed storage URL) | none |

## /api/ping (1)

| Route path | File | Methods | Auth mechanism | Identity source | Writes | Sends |
| --- | --- | --- | --- | --- | --- | --- |
| /api/ping | app/api/ping/route.ts | GET | `none` | n/a | none | none |

## /api/resend (1)

| Route path | File | Methods | Auth mechanism | Identity source | Writes | Sends |
| --- | --- | --- | --- | --- | --- | --- |
| /api/resend/inbound | .../inbound/route.ts | POST | `token` (`email_reply_sessions.token`, parsed out of the To address) | token row | email_reply_sessions, owner_deposits, question_history, contributor_questions, daily_spark_responses, contributor_story_prompts, labels, deposit_domain_scores, training_pairs | resend confirmation to the sender address |

## /api/stripe (1)

| Route path | File | Methods | Auth mechanism | Identity source | Writes | Sends |
| --- | --- | --- | --- | --- | --- | --- |
| /api/stripe/webhook | .../webhook/route.ts | POST | `stripe_sig` + `service_secret` (an `x-manual-secret` header override checked before signature verification) | request body | stripe_events, billing, archives | none |

## /api/succession (3)

| Route path | File | Methods | Auth mechanism | Identity source | Writes | Sends |
| --- | --- | --- | --- | --- | --- | --- |
| /api/succession/context/add | .../context/add/route.ts | POST | `session_owned` | session (`successorId` and `archiveId`) | successor_contexts | none |
| /api/succession/entity/chat | .../entity/chat/route.ts | POST | `session_owned` | session (`successorId` and `archiveId`) | grounding_gaps (via `after()` and the `log_grounding_gap` RPC) | none |
| /api/succession/login | .../login/route.ts | POST | `none` | n/a | none | none |

## /api/track (1)

| Route path | File | Methods | Auth mechanism | Identity source | Writes | Sends |
| --- | --- | --- | --- | --- | --- | --- |
| /api/track/audience | .../audience/route.ts | POST | `none` | n/a | audience_selections | none |

## /api/twilio (3)

| Route path | File | Methods | Auth mechanism | Identity source | Writes | Sends |
| --- | --- | --- | --- | --- | --- | --- |
| /api/twilio/voice | .../voice/route.ts | POST | `twilio_sig` (skipped entirely when `TWILIO_AUTH_TOKEN` is unset) | request body `From` phone number | none | none |
| /api/twilio/continue | .../continue/route.ts | POST | `none` | query string (`contributorId`, `archiveId`, `isOwner`) | none | none |
| /api/twilio/recording | .../recording/route.ts | POST | `none` | query string (`archiveId`, `contributorId`, `questionId`, `isOwner`) | voice_recordings, owner_deposits, contributor_questions, labels, owner_notifications, deposit_domain_scores, training_pairs, storage `voice-recordings` | none |

## /api/wechat (1)

| Route path | File | Methods | Auth mechanism | Identity source | Writes | Sends |
| --- | --- | --- | --- | --- | --- | --- |
| /api/wechat/webhook | .../webhook/route.ts | GET, POST | `service_secret` (WeChat signature over `WECHAT_TOKEN`) | request body (`FromUserName` in the XML payload) | archives (`wechat_open_id`), owner_deposits, deposit_domain_scores, training_pairs | none |

## /api/witness (2)

| Route path | File | Methods | Auth mechanism | Identity source | Writes | Sends |
| --- | --- | --- | --- | --- | --- | --- |
| /api/witness | .../witness/route.ts | POST, GET | `none` | request body `archiveId` (POST), query string `sessionId` (GET) | witness_sessions | none |
| /api/witness/[sessionId] | .../[sessionId]/route.ts | PATCH | `none` | URL segment | witness_sessions, witness_deposits, labels, owner_notifications | resend to `archives.owner_email` |

## Group counts

| Group | Count |
| --- | --- |
| /api/admin | 3 |
| /api/apply | 1 |
| /api/archive | 69 |
| /api/archive-login | 1 |
| /api/archivist | 8 |
| /api/archivist-apply | 1 |
| /api/archivist-interest | 1 |
| /api/archivist-login | 1 |
| /api/auth | 1 |
| /api/contact | 1 |
| /api/contribute | 11 |
| /api/cron | 24 |
| /api/curator | 2 |
| /api/dashboard | 3 |
| /api/demo | 3 |
| /api/game | 3 |
| /api/god | 14 |
| /api/guide-onboard | 1 |
| /api/inngest | 1 |
| /api/mobile | 5 |
| /api/partner | 1 |
| /api/photos | 1 |
| /api/ping | 1 |
| /api/resend | 1 |
| /api/stripe | 1 |
| /api/succession | 3 |
| /api/track | 1 |
| /api/twilio | 3 |
| /api/wechat | 1 |
| /api/witness | 2 |

**Sum: 3 + 1 + 69 + 1 + 8 + 1 + 1 + 1 + 1 + 1 + 11 + 24 + 2 + 3 + 3 + 3 + 14 + 1 + 1 + 5 + 1 + 1 + 1 + 1 + 1 + 3 + 1 + 3 + 1 + 2 = 169.**

---

# Section 2. Routes with auth mechanism `none`

Twenty rows. The Notes column records whether the file itself supports reading the route as
public by design, and what the evidence is.

| Route path | Methods | Writes | Sends | Note |
| --- | --- | --- | --- | --- |
| /api/ping | GET | none | none | Public by design. The whole handler returns `{status, timestamp}`. No input is read and no table is touched. |
| /api/archive-login | POST | none | none | Public by design. Returns 410 to every caller. The file comment records that password sign-in was retired in the Supabase Auth migration. No body is read. |
| /api/archivist-login | POST | none | none | Public by design. Same 410 stub shape. |
| /api/succession/login | POST | none | none | Public by design. Same 410 stub shape. |
| /api/archivist/onboard-client | POST | none | none | Public by design as it stands on `main`. Returns 410 to every caller, authenticated or not. The retired handler is preserved as a comment and is not executed. A further change is in flight on `fix/guide-route-auth`. |
| /api/god/impersonate/logout | GET | none | none | Public by design. Clears the `archive-auth` and `archive-id` cookies and redirects. Clearing your own cookies needs no identity. |
| /api/archivist-apply | POST | none | none | Public form endpoint. The handler parses JSON and `console.log`s it. Nothing is persisted. |
| /api/archivist-interest | POST | none | none | Public form endpoint. Same shape as archivist-apply. |
| /api/contact | POST | contact_requests | none | Public form endpoint. Validates name, email, and an intent enum, then inserts. The table is a lead capture table. |
| /api/partner | POST | partner_applications | none | Public form endpoint. Validates name, email, and a profession enum, then inserts and returns a generated referral code. |
| /api/track/audience | POST | audience_selections | none | Public by design, stated in a file comment: "Public, unauthenticated, fire-and-forget." Accepts only the literal values `founder` or `family`. No PII, no IP, no user agent. |
| /api/game/active | GET | none | none | No note in the file claiming public intent. Reads an active memory-game session and a leaderboard for any `archiveId` supplied in the query string. |
| /api/game/story | GET, POST | memory_game_responses, training_pairs | none | No note in the file claiming public intent. `archiveId` and `contributorId` are taken from the query string and the request body. |
| /api/game/[sessionId] | GET, POST | memory_game_contributions, labels, memory_game_sessions | none | No note in the file claiming public intent. The session id in the URL is the only thing gating the read and the write. |
| /api/witness | POST, GET | witness_sessions | none | No note in the file claiming public intent. POST creates a witness session for any `archiveId` in the body. GET returns a full session plus archive owner and family names for any `sessionId`. |
| /api/witness/[sessionId] | PATCH | witness_sessions, witness_deposits, labels, owner_notifications | resend to `archives.owner_email` | No note in the file claiming public intent. The session id in the URL is the only gate on writing answers and, on completion, mailing the archive owner. |
| /api/twilio/continue | POST | none | none | Telephony callback. No signature check in this file. `archiveId` and `contributorId` come from the query string. Returns TwiML only. |
| /api/twilio/recording | POST | voice_recordings, owner_deposits, contributor_questions, labels, owner_notifications, deposit_domain_scores, training_pairs, storage `voice-recordings` | none | Telephony callback. No signature check in this file, unlike `/api/twilio/voice` which does validate. `archiveId` comes from the query string. |
| /api/archivist/certification | GET, POST | guide_certifications, guide_module_answers, archivists | none | No note in the file claiming public intent. `archivistId` comes from the query string on GET and the request body on POST. |
| /api/archivist/submit-exam | POST | guide_certifications, guide_module_answers, archivists | resend to `archivists.email` | No note in the file claiming public intent. `archivistId` comes from the request body. |

**Not omitted, but not in this list.** The three demo routes (`/api/demo/entity`,
`/api/demo/succession-entity`, `/api/demo/whitepaper`) are public by design and each says so
in a file comment, but their mechanism is `rate_limit_only`, not `none`, so they do not
belong under this heading. All three appear in the Section 1 table. `/api/photos/[photoId]`
is likewise public by design (a file comment states the choice explicitly and reasons about
UUID unguessability) and is also `rate_limit_only`.

---

# Section 3. Routes where the identity source is not the session

Every row here has auth `session_only` or `session_owned`, but the acting id comes from the
request body, the query string, or a URL segment. A route in this section may be correct. It
is listed because that cannot be established from the auth label alone.

## 3a. Acting id from the request or a caller-supplied token

| Route path | Methods | Auth | Where the acting id comes from | What the file does with it |
| --- | --- | --- | --- | --- |
| /api/archive/switch | POST | `session_owned` | request body `archiveId` | Verified before use. Owner role checks `archives.owner_user_id = session.userId`; contributor role checks `contributors.email = session.email`. A failure returns 403. The route then writes the id into the `archive-id` cookie, which `getSessionUser` later reads to pick the active archive. |
| /api/curator/seal-memory | POST | `session_owned` | request body `vault_id` | Verified before use against `profiles.vault_id` for the session user. A mismatch returns 403. Four tables are then written scoped to that `vault_id`. |
| /api/dashboard/upload | POST | `session_owned` | request body `vault_id` | Verified before use by selecting the vault with both `id = vault_id` and `archivist_id = user.id`. A miss returns 403. |
| /api/curator/accept-invite | POST | `session_only` + `token` | request body `token` selects the curator row and therefore the `vault_id` | The session establishes who the caller is. The invite token alone selects which curator row and which vault they are attached to. There is no check that the invite was issued to this user; the only gate is `invite_accepted` being false. `profiles.role` is then set to `curator` and `profiles.vault_id` to the token's vault. |
| /api/archive/entity-chat | POST | `session_owned` + `token` | Authorization Bearer header, or request body `contributorToken` | Two independent doors. The session door verifies `owner_user_id`. The token door resolves an archive from `contributors.access_token` and then checks `archives.contributor_entity_access !== 'none'`. On the token path the acting archive id comes entirely from the caller-supplied token. |
| /api/archivist/connect-stripe | GET | `session_owned` | query string `account` | The archivist id comes from the session, not the query. The Stripe account id comes from the query and is verified: the route retrieves the account and compares `account.metadata.archivistId` to the session archivist. A mismatch redirects with an error. Read from `main`; a change is in flight. |

## 3b. Dual-path routes where a body `archiveId` is honored under the other mechanism

These three carry both a `cron_secret` label and a `session_owned` label. On the session
path the archive id comes from the session and any body `archiveId` is ignored. On the cron
path the body `archiveId` is used as given. Listed here so the body-supplied path is not
missed by a reader scanning for `session_owned`.

| Route path | Methods | Body `archiveId` honored when | Effect of that path |
| --- | --- | --- | --- |
| /api/archive/send-photo | POST | `CRON_SECRET` matches by header or `?secret=` | Mails the named archive's photographs to every active contributor, mints reply tokens, and advances the send queue. |
| /api/archive/life-event | POST | `CRON_SECRET` matches by header or `?secret=` | Mails the named archive's owner and every active contributor, and spends a Sonnet call composing the reflection. |
| /api/archive/poll-replies | POST | `CRON_SECRET` matches by header or `?secret=` | The cron path is not scoped to any archive at all. It sweeps every open email session across every archive. The owner path is scoped to the session archive. |

## 3c. Same class, different label

One route belongs to this class by shape but carries the label `token`, so it is recorded
here rather than silently dropped.

| Route path | Methods | Auth | Note |
| --- | --- | --- | --- |
| /api/contribute/upload-url | POST | `token` | The contributor token is validated, then the storage path is built from `archiveId \|\| contributor.archive_id`. A body-supplied `archiveId` takes precedence over the archive the token actually belongs to. The route returns a signed upload URL for that path. The sibling route `/api/contribute/upload-photo` derives the path from the token row only. |

---

# Section 4. Write-capable routes without a session

Routes that write to a table and whose auth is `none`, `rate_limit_only`, or `token`.
Ordered by what they write, with money, credentials, archives, and commissions first.

## Credentials, accounts, and session issuance

| Route path | Auth | Writes | Sends |
| --- | --- | --- | --- |
| /api/archive/magic-login | `token` | archives (clears `magic_link_token` and `magic_link_created_at`) | none |
| | | Issues a login. Sets `archive-auth` and `archive-id` cookies for 7 days on a valid token. Rejects tokens over 24 hours old and clears the token on use. | |
| /api/archive/mobile-login | `token` | archive_credentials (`last_used_at`) | none |
| | | Email plus bcrypt password against `archive_credentials`. The file marks itself DEPRECATED and describes itself as a mobile shim rather than a Supabase session. No rate limit in this file. | |
| /api/guide-onboard | `token` + `rate_limit_only` | archivists, archivist_invites, Supabase Auth users | none |
| | | Creates a Legacy Guide account and its Auth user from an invite code. Rate limited to 10 attempts per IP per 15 minutes. | |
| /api/archivist/certification | `none` | archivists (`certification_status`, `certification_level`), guide_certifications, guide_module_answers | none |
| /api/archivist/submit-exam | `none` | archivists (`certification_status`, `certification_level`), guide_certifications, guide_module_answers | resend to `archivists.email` |

## Applications and lead capture

| Route path | Auth | Writes | Sends |
| --- | --- | --- | --- |
| /api/apply | `rate_limit_only` | archive_applications | resend to `ADMIN_EMAIL`, plus a personal inbox on business leads |
| /api/contact | `none` | contact_requests | none |
| /api/partner | `none` | partner_applications | none |
| /api/track/audience | `none` | audience_selections | none |

## Archive content: deposits, transcripts, labels, and training data

| Route path | Auth | Writes | Sends |
| --- | --- | --- | --- |
| /api/twilio/recording | `none` | voice_recordings, owner_deposits, contributor_questions, labels, owner_notifications, deposit_domain_scores, training_pairs, storage `voice-recordings` | none |
| | | The largest write surface in this section. `archiveId`, `contributorId`, `questionId`, and `isOwner` all come from the query string. No Twilio signature check in this file. | |
| /api/resend/inbound | `token` | email_reply_sessions, owner_deposits, question_history, contributor_questions, daily_spark_responses, contributor_story_prompts, labels, deposit_domain_scores, training_pairs | resend confirmation to the sender address |
| | | The token is parsed from the To address (`reply+{token}@`). No webhook signature verification in this file. The `session.replied` guard makes each token effectively single use. | |
| /api/archive/receive-reply | `token` | email_replies, labels, photographs (`status`), email_sessions (`reply_count`) | resend to the reply sender |
| | | The access key is `email_sessions.reply_address`, an email address rather than a random token. Svix signature headers are read and logged, then explicitly not verified: the file comment says "We log but don't block." | |
| /api/archive/entity-chat | `session_owned` + `token` | entity_conversations, owner_deposits, deposit_domain_scores, training_pairs | resend to `contributors.email` |
| | | Listed for the token path only. A contributor bearer token reaches the same writes as an owner session, gated on `archives.contributor_entity_access !== 'none'`. | |
| /api/contribute/answer | `token` | contributor_questions, owner_deposits, labels, contributor_photo_sends, contributors, training_pairs | resend to `archives.owner_email` |
| /api/contribute/register-photo | `token` | photographs, labels, contributors | resend to `archives.owner_email` |
| /api/contribute/register-media | `token` | archive_videos, archive_documents, contributors | resend to `archives.owner_email` |
| /api/contribute/upload-media | `token` | archive_videos, archive_documents, contributors, storage `archive-videos` / `archive-documents` | resend to `archives.owner_email` |
| /api/contribute/wisdom-exchange | `token` | wisdom_exchanges | resend to `archives.owner_email` |
| /api/contribute/save-phone | `token` | contributors (`phone`) | none |
| /api/witness/[sessionId] | `none` | witness_sessions, witness_deposits, labels, owner_notifications | resend to `archives.owner_email` |
| /api/witness | `none` | witness_sessions | none |
| /api/game/[sessionId] | `none` | memory_game_contributions, labels, memory_game_sessions | none |
| /api/game/story | `none` | memory_game_responses, training_pairs | none |

## Write-capable, storage only

| Route path | Auth | Writes | Sends |
| --- | --- | --- | --- |
| /api/contribute/upload-url | `token` | none in Postgres. Mints a signed upload URL into `photographs`, `archive-videos`, or `archive-documents` at a path built from a body-supplied `archiveId` when present. | none |
| /api/contribute/upload-photo | `token` | none in Postgres. Mints a signed upload URL into `photographs` at a path built from the token row's archive. | none |

**Not in this section.** `/api/photos/[photoId]` is `rate_limit_only` but writes nothing, so
it does not qualify. `/api/demo/whitepaper` is `rate_limit_only` and writes nothing, though
it does send mail to a caller-supplied address; it is recorded in Section 1.

---

# Section 5. Coverage statement

- **File count from `Get-ChildItem -Recurse -Path app/api -Filter route.ts`: 169.**
- **Rows in the Section 1 table: 169.**
- **They match.**

Every one of the 169 files was opened and read before its row was written. No row was
inferred from a filename, a sibling route, or a prior document.

## Files that needed a note about how they were read

| Path | Note |
| --- | --- |
| app/api/archivist/connect-stripe/route.ts | Modified in the working tree by the in-flight branch `fix/guide-route-auth`. Read from `main` with `git show main:<path>` so the row reflects `main`, as instructed. The branch was not read. |
| app/api/archivist/onboard-client/route.ts | Same. Read from `main`. |

## Cells recorded as `unconfirmed`

| Path | Cell | Reason |
| --- | --- | --- |
| app/api/inngest/route.ts | Writes, Sends | The file is a nine-line delegation to `serve()` from `inngest/next` with eight registered functions. Nothing is written or sent by this file. What the registered functions write was not traced, because that is library and lib-directory code, not this route. Recording a guess here would be a fabricated row. |
| app/api/inngest/route.ts | Auth mechanism | Labeled `service_secret` on the basis that `serve()` performs signing-key verification. That check is not visible in this file. Treat the label as delegated rather than observed. |

## Things worth knowing about how the labels were applied

- `session_owned` is used where the route both authenticates and constrains the acted-on rows
  to the caller's own scope. In the `/api/archive` group that almost always means the same
  pattern: `getSessionUser()`, then a re-read of `archives.owner_user_id` compared to
  `session.userId`, then a 403. Sixty of the 69 archive routes contain that literal
  comparison. The nine that do not are `contribution-alert` and `morning-digest`
  (`cron_secret`), `magic-login`, `mobile-login`, and `receive-reply` (`token`),
  `setup-voice-clone` and `test-voice` (`god`), `my-archives` (`session_only`, acts on no
  archive-scoped resource), and `switch`, which verifies ownership with a filtered query
  (`.eq('owner_user_id', session.userId)`) rather than a comparison. On the dual-path routes
  the comparison sits inside the session branch only.
- `session_only` is used where a session is required but the route constrains nothing further,
  because it acts on no caller-named resource. `/api/auth/logout`, `/api/mobile/my-archives`,
  and `/api/archive/my-archives` are the clear cases.
- Where a route applies two mechanisms across different methods, both labels are recorded and
  the method split is stated in the cell. `/api/archivist/connect-stripe` is the only route
  where the two labels differ by verb.
- `n/a` in Identity source means the route acts on no single caller-named user or archive.
  Every cron route is `n/a` because it sweeps.
- Storage buckets are named in the Writes column where a route uploads to them, because a
  bucket write is a write even though it is not a table.

No file could not be read. No route was skipped.
