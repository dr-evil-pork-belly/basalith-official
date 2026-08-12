# BASALITH FLOW INVENTORY

Layer 0 reconnaissance. Read-only pass, July 2026.

What this is: a map of every user journey the code actually supports. Each cell is
sourced from a file that was read, not inferred. Where a fact could not be confirmed
from code, the cell says `unconfirmed`.

Route gate note, confirmed first: the repo has `proxy.ts` at the root. There is no
`middleware.ts`. `proxy.ts` gates three prefixes above route resolution, `/archive`,
`/archivist`, and `/succession/portal`, redirecting an unauthenticated visitor to
`/archive-login`, `/archivist-login`, and `/succession/login` respectively. It gates
pages only in practice, because API routes under `/api` are matched by the config
regex but every API route also carries its own check. No API route relies on
`proxy.ts` alone.

Vocabulary note: "Legacy Guide" is the role. Literal route and column names such as
`/archivist-login`, `archivists`, and `assigned_archivist` are kept verbatim.

---

## SECTION A. JOURNEY TABLES

### Journey 1. B2C owner. Apply intake through daily depositing.

| # | Step | Entry point | Route or handler | Writes | Sends | Gate | Next step trigger |
|---|------|-------------|------------------|--------|-------|------|-------------------|
| 1 | Submit the apply form | `/apply`, Submit button | `app/apply/ApplyForm.tsx` posts to `app/api/apply/route.ts` | `archive_applications` | Lead notification to `ADMIN_EMAIL`, HTML built inline in `app/api/apply/route.ts` | none. Honeypot field `company_website`, a gibberish heuristic, and an in-memory 5-per-hour IP limit | none, manual operator action. A human reads the email |
| 2 | Operator generates a checkout link | God Mode UI at `/god` | `app/api/admin/checkout/route.ts` | none. Creates a Stripe Checkout session only | none | `god-mode-auth` cookie via `getGodModeAuth` in `lib/apiSecurity.ts` | none, manual operator action. The operator sends the URL by hand |
| 3 | Family pays | Stripe Checkout URL | `app/api/stripe/webhook/route.ts`, `checkout.session.completed` | `stripe_events`, `billing` | none | Stripe signature via `constructEvent`, plus `stripe_events` dedupe on `event.id` | `invoice.paid` with `billing_reason` `subscription_create` emits the Inngest event `founding_fee.paid` |
| 4 | Archive is provisioned | Inngest event `founding_fee.paid` | `lib/inngest/billingFunctions.ts` `provisionOnFoundingFee`, served at `app/api/inngest/route.ts` | `archives`, `archive_credentials`, `archives.owner_user_id`, `billing`, `archive_lifecycle`, `commissions`, `archive_applications.status` | Founding welcome email from `lib/emails/foundingWelcome.ts`. Admin notice only if the commission insert fails | Inngest idempotency on `event.data.subscriptionId`, plus the `billing.founding_paid_at` gate | The welcome email carries a magic link |
| 5 | Owner signs in | Magic link in the welcome email, or `/archive-login` | `app/auth/callback/route.ts` | none. Supabase session cookies | none | Supabase OTP or code exchange | Role-based redirect. `owner` lands on `/archive/dashboard` |
| 6 | Dashboard | `/archive/dashboard` | `app/archive/dashboard/page.tsx`, `DashboardClient.tsx` | none | none | `proxy.ts` on `/archive`, plus a `getSessionUser` redirect in the page | none, user must return unprompted |
| 7 | Daily question email | Vercel cron `0 8 * * *` on `/api/cron/daily-reflection` | `app/api/cron/daily-reflection/route.ts` | `question_history` via `lib/selectNextQuestion.ts`, `email_reply_sessions`, `archives` magic-link cleanup | "Today's question" email, `buildDailyReflectionEmail` inside the cron route | `CRON_SECRET` by `Authorization: Bearer` header or `?secret=`, plus a UTC hour 8 check | The owner replies to the email, calls the phone number in it, or returns to the web app on their own |
| 8 | Email reply lands | Reply to `reply+{token}@reply.basalith.ai` | `app/api/resend/inbound/route.ts` | `owner_deposits`, `question_history.answered_deposit_id` and `answered_at`, `training_pairs` via `lib/trainingPipeline.ts`, `deposit_domain_scores` via `lib/classifyDeposit.ts`, `email_reply_sessions.replied` | "Your memory has been saved" confirmation, `buildConfirmationEmail` in the inbound route | Token lookup on `email_reply_sessions`, plus the `session.replied` single-use guard | The next morning's cron |
| 9 | Web deposit | `/archive/deposit` form | `app/api/archive/owner-deposit/route.ts` | `owner_deposits`, `labels` when a `photographId` is present, `archives.archive_score`, `training_pairs`, `deposit_domain_scores` | none | `proxy.ts`, plus `getSessionUser` and an `archives.owner_user_id` match | none, user must return unprompted |
| 10 | Phone deposit | Phone number printed in the daily email | `app/api/twilio/voice/route.ts`, then `app/api/twilio/continue/route.ts` and `app/api/twilio/recording/route.ts` | `voice_recordings`, `owner_deposits`, `labels`, `owner_notifications`, Storage bucket `voice-recordings` | none | `validateTwilioRequest` signature check on `/api/twilio/voice` only. `/api/twilio/recording` and `/api/twilio/continue` have no signature check | none, user must return unprompted |
| 11 | Weekly Mirror | Vercel cron `0 17 * * 0` on `/api/cron/weekly-mirror` | `app/api/cron/weekly-mirror/route.ts`, generation in `lib/generateMirror.ts` | `mirror_reflections`, `email_reply_sessions` | "What I am learning about you", `buildMirrorEmail` and `buildMirrorText` in the cron route | `CRON_SECRET`, plus a floor of 2 deposits in the trailing 7 days | The owner replies to the thread question, or reacts on the dashboard card |
| 12 | Mirror reaction | Mirror card on `/archive/dashboard` or in iOS | `app/api/archive/mirror/react/route.ts`, `app/api/mobile/mirror/react/route.ts` | `mirror_reflections.owner_reaction`, `reacted_at` | none | `getSessionUser` plus an `archives.owner_user_id` match | A `not_quite_right` reaction inside 7 days makes the next `selectNextQuestion` call return a P0 repair question |

Where this journey terminates today: it does not terminate, it loops on the daily
email. Termination is by absence, not design. Steps 1 and 2 are the real wall.
Nothing in the code moves an application to a checkout link, so every B2C archive
that exists today was created either by the Inngest path after a hand-generated
checkout, or by `app/api/archivist/onboard-client/route.ts`, which is still live.

---

### Journey 2. B2C contributor. Invite through contribution.

| # | Step | Entry point | Route or handler | Writes | Sends | Gate | Next step trigger |
|---|------|-------------|------------------|--------|-------|------|-------------------|
| 1 | Owner adds a contributor | `/archive/contributors`, add form | `app/api/archive/contributors/route.ts` POST | `contributors` upsert on `(archive_id, email)`, `contributors.access_token` via `lib/contributorToken.ts`, `contributor_questions` | Contributor invite, `buildContributorInviteEmail` in the same route | `proxy.ts`, plus `getSessionUser` and an `archives.owner_user_id` match | The portal link in the invite email |
| 2 | Contributor opens the portal | `/contribute/{token}` link in the invite | `app/contribute/[token]/page.tsx`, `app/api/contribute/questions/route.ts` | none on load | none | `contributors.access_token` lookup plus `status = 'active'` in `getContributorByToken`. No expiry column is read | The contributor answers a question |
| 3 | Contributor answers | Answer form in the portal | `app/api/contribute/answer/route.ts` | `contributor_questions` claim to `answered`, `owner_deposits` with `source_type = 'contributor'`, `labels` for photo questions, `contributors.questions_answered`, `training_pairs`, `contributor_photo_sends.responded` | "X answered a question about you" to the owner, built inline. Memory chain email via `lib/memoryChain.ts` | Token only | A replacement question is generated inline and returned as `nextQuestion` |
| 4 | Owner invites a witness | `/archive/contributors`, witness invite | `app/api/archive/invite-witness/route.ts` | `witness_sessions`, `owner_notifications` | Witness invitation, HTML inline in the route | `getSessionUser` plus an `archives.owner_user_id` match | The `/witness/{sessionId}` link in the email |
| 5 | Witness completes a session | `/witness/{sessionId}` | `app/witness/[sessionId]/page.tsx`, `app/api/witness/[sessionId]/route.ts` PATCH | `witness_sessions`, `witness_deposits`, `labels`, `owner_notifications` | Owner notification email from `app/api/witness/[sessionId]/route.ts` | Session id in the URL. No token, no auth check | none, user must return unprompted |
| 6 | Monday story prompt | Vercel cron `0 9 * * 1` on `/api/cron/story-prompt-monday` | `app/api/cron/story-prompt-monday/route.ts` | `contributor_story_prompts`, `photographs.story_prompt_sent_at`, `story_prompt_sessions`, `email_reply_sessions` | Text story prompt email, or the "Monday mystery" photo email, both built in the route | `CRON_SECRET`, plus a Monday check, plus a 2-contributor floor per archive | The contributor replies to the email |
| 7 | Story prompt reply lands | Reply to the token address | `app/api/resend/inbound/route.ts` | `contributor_story_prompts.answered`, or `labels` for a photograph session, plus `owner_deposits` and `training_pairs` in every case | Confirmation email | Token lookup plus the `replied` guard | Friday reveal, or the next Monday |
| 8 | Friday reveal | Vercel cron `0 9 * * 5` on `/api/cron/story-prompt-friday` | `app/api/cron/story-prompt-friday/route.ts` | `story_prompt_sessions.reveal_sent` | Reveal email built in the route | `CRON_SECRET`, plus a Friday check, plus `reveal_sent = false` on a session at least 7 days old | none, user must return unprompted |
| 9 | Nightly photograph | Vercel cron `0 21 * * *` on `/api/cron/send-photos`, which fans out | `app/api/cron/send-photos/route.ts` calls `app/api/archive/send-photo/route.ts` | `contributor_photo_sends`, `owner_photo_sends`, `email_sessions`, `photographs` | Photograph email from `app/api/archive/send-photo/route.ts` | `CRON_SECRET` on the parent, and `CRON_SECRET` forwarded in the `Authorization` header to each fan-out child | The contributor replies to the photograph email |

Where this journey terminates today: the contributor loop is the healthiest chain in
the codebase, because every step is pushed by a cron or by an inline next-question
generator. It terminates only when `getNextStoryPrompt` runs out of prompts, which
logs and skips. Termination is by design for step 3, by absence for steps 5 and 8.

---

### Journey 3. B2B founder, succession trigger. Apply through certified.

| # | Step | Entry point | Route or handler | Writes | Sends | Gate | Next step trigger |
|---|------|-------------|------------------|--------|-------|------|-------------------|
| 1 | Submit the apply form as Business Succession | `/apply`, the three-way toggle | `app/api/apply/route.ts` with `applyType = 'succession'` | `archive_applications` including `apply_type`, `company_name`, `industry`, `employees`, `business_timeline` | Lead notification to both `mrdavidha@gmail.com` and `ADMIN_EMAIL` | none, same spam heuristics as Journey 1 | none, manual operator action |
| 2 | Operator generates a succession checkout | God Mode at `/god` | `app/api/admin/checkout/route.ts`, segment `succession`, prices `succession_founding` and `succession_year` | none. Stripe session only | none | `god-mode-auth` cookie | none, manual operator action |
| 3 | Founder pays | Stripe Checkout URL | `app/api/stripe/webhook/route.ts` | `stripe_events`, `billing` | none | Stripe signature plus event dedupe | `founding_fee.paid` |
| 4 | Archive is provisioned | Inngest `founding_fee.paid` | `lib/inngest/billingFunctions.ts` `provisionOnFoundingFee` | `archives`, `archive_credentials`, `billing`, `archive_lifecycle`, `archive_applications.status` | Founding welcome email | Inngest idempotency plus `founding_paid_at` | Magic link in the welcome email |
| 5 | Founder signs in | Magic link, or `/archive-login` | `app/auth/callback/route.ts` | none | none | Supabase | Redirect to `/archive/dashboard` |
| 6 | Daily incident invitation | Vercel cron `0 8 * * *` on `/api/cron/daily-reflection` | `app/api/cron/daily-reflection/route.ts`, succession branch | none. The branch is explicitly stateless. It reads an open incident or picks a seed, and creates nothing | "Your reflection is ready", `buildSuccessionInviteEmail` in the cron route. No `replyTo` is set | `CRON_SECRET`, UTC hour 8, and `archives.tier = 'succession'` | The portal link in the email. Answering the email cannot advance the chain |
| 7 | Founder opens the interview | `/archive/dashboard`, incident card | `app/api/archive/b2b-question/next/route.ts` GET | `incident_sessions` when no incident is open, via `createIncident` and `persist` in `lib/incidentSession.ts` | none | `getSessionUser`, an `archives.owner_user_id` match, and `archives.tier === 'succession'` | The founder submits an answer |
| 8 | Founder answers a probe | Answer box in the incident card | `app/api/archive/b2b-question/answer/route.ts` POST | `owner_deposits` with `source_type = 'web_capture'` on acceptance, `incident_sessions`, `question_history` on the SEED turn, `training_pairs` with `metadata.probe_type` and `metadata.dimension`, `deposit_domain_scores` | none | Same triple check as step 7 | The reducer in `lib/incidentSession.ts` renders and stashes the next probe. A re-probe writes no deposit |
| 9 | Incident completes | Reducer decides `incidentComplete` | `completeIncident` in `lib/incidentSession.ts` | `incident_sessions` closed | none | none beyond step 8 | none, user must return unprompted. The next daily email will offer a fresh seed |
| 10 | Certified state | not implemented | not implemented | not implemented | not implemented | not implemented | not implemented |

Where this journey terminates today: at step 9, a completed incident. There is no
"certified" state for a founder archive anywhere in the code. `lib/fidelityEval.ts`
and the `eval_runs` and `eval_results` tables exist, but the only caller is
`scripts/run-fidelity-eval.ts`, a command-line script. No route, no page, and no
email surfaces a coverage map, a fidelity score, or a certification to a founder.
Termination is by absence.

---

### Journey 4. B2B founder, acquisition trigger. Apply through delivery.

| # | Step | Entry point | Route or handler | Writes | Sends | Gate | Next step trigger |
|---|------|-------------|------------------|--------|-------|------|-------------------|
| 1 | Submit the apply form as Business Acquisition | `/apply?type=acquisition`, reached from the `/pricing` acquisition block | `app/api/apply/route.ts` with `applyType = 'acquisition'` | `archive_applications` with `apply_type = 'acquisition'` and the business fields. `business_timeline` carries the deal stage | Lead notification to `mrdavidha@gmail.com` and `ADMIN_EMAIL`, labeled "New Acquisition Lead" | none, same spam heuristics as Journey 1 | none, manual operator action |
| 2 | Quote or invoice | not implemented | not implemented | not implemented | not implemented | not implemented | not implemented |
| 3 | Onsite days 1 to 3 | not implemented | not implemented | not implemented | not implemented | not implemented | not implemented |
| 4 | Remote CDM weeks | not implemented | not implemented | not implemented | not implemented | not implemented | not implemented |
| 5 | Fidelity check and coverage map | not implemented | not implemented | not implemented | not implemented | not implemented | not implemented |
| 6 | Successor provisioned at close | not implemented as an acquisition step | `app/api/archive/succession/add/route.ts` exists but is generic and owner-driven, with no acquisition linkage | see Journey 5 | see Journey 5 | see Journey 5 | see Journey 5 |

Where this journey terminates today: at the apply form. `app/api/admin/checkout/route.ts`
lines 120 to 125 return HTTP 422 with "Acquisition deals are billed by manual invoice,
not checkout" for `apply_type = 'acquisition'`. There is no invoice route, no
acquisition price in `lib/stripe/prices.ts`, no acquisition segment in
`archive_lifecycle`, and no engagement or delivery table anywhere in the repo. An
acquisition lead lands in `archive_applications` and an email arrives. After that,
there is nothing. Termination is by absence.

---

### Journey 5. Successor. Provisioning through grounded chat.

| # | Step | Entry point | Route or handler | Writes | Sends | Gate | Next step trigger |
|---|------|-------------|------------------|--------|-------|------|-------------------|
| 1 | Founder adds a successor | `/archive/succession` form | `app/api/archive/succession/add/route.ts` POST | `successors` including `password_hash` and `auth_user_id`, plus a Supabase Auth user via `getOrCreateAuthUser` | none | `proxy.ts`, plus `getSessionUser` and an `archives.owner_user_id` match | none, user must return unprompted. Nothing tells the successor they have access |
| 2 | Successor requests a sign-in link | `/succession/login` | `app/succession/login/page.tsx` calling `supabase.auth.signInWithOtp` with `shouldCreateUser: false` | none | Supabase Auth magic link email, sent by Supabase, not by Resend | none. The form is public. `shouldCreateUser: false` means only a provisioned email resolves | The link in the Supabase email |
| 3 | Successor signs in | Magic link | `app/auth/callback/route.ts` | none | none | Supabase OTP verification, then role routing | `role === 'successor'` redirects to `/succession/portal` |
| 4 | Portal loads | `/succession/portal` | `app/succession/portal/page.tsx` | none | none | `proxy.ts` on `/succession/portal`, plus `getSessionUser` requiring both `successorId` and `archiveId` | The successor opens the entity or the context page |
| 5 | Successor injects context | `/succession/portal/context` | `app/api/succession/context/add/route.ts` POST | `successor_contexts` | none | `getSessionUser` requiring `successorId` and `archiveId` | The context is read on the next chat turn |
| 6 | Grounded entity chat | `/succession/portal/entity` | `app/api/succession/entity/chat/route.ts` POST | `grounding_gaps` via `after()` and the `log_grounding_gap` RPC, on any verdict basis other than `deposit` | none | `getSessionUser` requiring `successorId` and `archiveId` | none, user must return unprompted |
| 7 | Scenario review | `/succession/portal/scenarios` | `app/succession/portal/scenarios/page.tsx` | none. Read-only view of founder responses | none | `proxy.ts` plus the portal session | none, user must return unprompted |

Where this journey terminates today: at a working, gated, grounded chat. The chat
itself is complete and correct. The chain breaks at step 1. The provisioning route
requires a `password` and stores a `password_hash`, but `app/api/succession/login/route.ts`
returns HTTP 410 and says password sign-in was retired. The password collected at
provisioning is therefore unusable, and the route sends no email at all. A newly
provisioned successor has no way of knowing an account exists unless the founder tells
them out of band. Termination at step 6 is by design. The break at step 1 is by
absence.

---

### Journey 6. Legacy Guide. Portal login through commission visibility.

| # | Step | Entry point | Route or handler | Writes | Sends | Gate | Next step trigger |
|---|------|-------------|------------------|--------|-------|------|-------------------|
| 1 | Express interest | `/join-archivists`, interest form | `app/api/archivist-interest/route.ts` | none. The handler only calls `console.log` | none | none | none, manual operator action |
| 2 | Receive an invite code | not implemented as a send | `archivist_invites` rows are read by `app/api/guide-onboard/route.ts`. Nothing in the repo creates or emails one | none | none | none | none, manual operator action |
| 3 | Redeem the invite | `/guide-onboard` form | `app/api/guide-onboard/route.ts` POST | `archivists` with `status = 'provisional'`, `archivist_invites.status` to `used`, `archivists.auth_user_id`, plus a Supabase Auth user with role `guide` | none from this route. The client then calls `signInWithOtp` | Invite code must exist with `status = 'unused'`, plus a 10-per-15-minutes IP limit | The Supabase magic link email |
| 4 | Sign in | `/archivist-login`, or the magic link | `app/auth/callback/route.ts` | none | none | Supabase | `role === 'guide'` redirects to `/archivist/dashboard` |
| 5 | Dashboard | `/archivist/dashboard` | `app/archivist/dashboard/page.tsx`, `app/api/archivist/dashboard/route.ts` | none | none | `proxy.ts` on `/archivist`, plus `getSessionUser` requiring `archivistId`. Query-string ids are ignored | The Guide opens certification |
| 6 | Work through certification | `/archivist/certification` and `/archivist/certification/[module]` | `app/api/archivist/certification/route.ts` GET | `guide_certifications`, inserted on first read | none | none on the API. `archivistId` is taken from the query string with no session check. The page above it is gated | The Guide opens the module exam |
| 7 | Submit a module exam | `/archivist/certification/[module]/exam` | `app/api/archivist/submit-exam/route.ts` POST | `guide_module_answers`, `guide_certifications`, `archivists.certification_status` and `certification_level` after module 3 | "You are a Certified Legacy Guide" email, `sendCertificationEmail` in the route, after module 3 passes | none. `archivistId` comes from the body with no session check. A 24-hour retry cooldown is enforced | Passing module 1 unlocks 2, passing 2 unlocks 3, passing 3 sets `certified_at` |
| 8 | Connect a payout account | `/archivist/settings` or `/archivist/earnings` | `app/api/archivist/connect-stripe/route.ts` POST and GET | `archivists.stripe_account_id`, `stripe_account_status` | none | none. `archivistId` comes from the body or query with no session check | The Stripe onboarding return URL |
| 9 | Manage a pipeline | `/archivist/pipeline` | `app/api/archivist/prospects/route.ts` GET and POST | `prospects` | none | `getSessionUser` requiring `archivistId`. Body and query ids are ignored | none, user must return unprompted |
| 10 | Onboard a client | `/archivist/onboard` | The page is now a static notice. `app/api/archivist/onboard-client/route.ts` still exists and still works | `archives`, `archive_credentials`, `archives.owner_user_id`, `commissions`, `prospects` | Client welcome email plus an admin notification, both built in the route | none on the API. It verifies that the supplied `archivistId` names an active `archivists` row, and nothing else. There is no caller authentication | The welcome email carries a magic link |
| 11 | Founding commission appears | Written by step 10, or by `provisionOnFoundingFee` step 8 | `commissions` row, `type = 'founding'`, `amount_cents = 100000`, `status = 'pending'` | `commissions` | Admin escalation email only when the insert fails, from `lib/inngest/billingFunctions.ts` | none beyond the writer | Visible on the next dashboard load |
| 12 | Monthly residual | `/api/cron/pay-residuals` | `app/api/cron/pay-residuals/route.ts` POST | `commissions` with `type = 'residual'`, then `status = 'paid'` if a Stripe transfer succeeds | none | `CRON_SECRET`, `Authorization: Bearer` header only | none. This route is not in `vercel.json`, so nothing fires it |

Where this journey terminates today: at the dashboard, which does show commissions
and a residual MRR tile computed with the same 12 percent rate the payout cron uses.
The chain is broken at both ends. There is no code that creates or emails an invite
code, so step 2 is a manual operator action with no software behind it. And
`pay-residuals` has no schedule in `vercel.json`, so a residual commission row is
never written by anything. Termination is by absence at both ends.

---

### Journey 7. Prospect. Demo entry through apply.

| # | Step | Entry point | Route or handler | Writes | Sends | Gate | Next step trigger |
|---|------|-------------|------------------|--------|-------|------|-------------------|
| 1 | Land on the homepage | `basalith.ai/` | `app/page.tsx` | none | none | none | The prospect scrolls to the inline demo |
| 2 | Answer the inline contrast demo | `ContrastDemo` component on `/` and `/succession` | `app/components/ContrastDemo.tsx`, posting to `app/api/track/audience/route.ts` | `audience_selections` | none | none | The prospect opens the full demo or the apply form |
| 3 | Run the public succession demo | `/succession/demo` | `app/succession/demo/page.tsx`, `SuccessionDemoClient.tsx`, posting to `app/api/demo/succession-entity/route.ts` | none. Explicitly stateless. Personas come from `lib/demoPersonas/` | none | none. Public and login-free. A 10-per-hour IP limit, a persona whitelist, a 500-character question cap, a 20,000-character transcript cap, and a `MAX_USER_MESSAGES` turn cap | none, user must return unprompted |
| 4 | Guide runs the live consumer demo | `/archivist/demo` | `app/archivist/demo/page.tsx`, `DemoClient.tsx`, posting to `app/api/demo/entity/route.ts` | none. Ephemeral by design | none | The page requires a Guide session. The API is public with a 10-per-hour IP limit | The demo client links out to `https://basalith.ai/apply` |
| 5 | Guide runs the incident demo | `/archivist/demo/incident` | `app/archivist/demo/incident/page.tsx`, `app/api/archivist/demo/incident/start/route.ts` and `/turn/route.ts` | none persisted. Buffered in `lib/demoIncidentBuffer.ts` | none | Guide session on the page | none, user must return unprompted |
| 6 | Request the white paper | White paper request form | `app/api/demo/whitepaper/route.ts` | `unconfirmed` | White paper email, from `app/api/demo/whitepaper/route.ts` | `unconfirmed` | none, user must return unprompted |
| 7 | Apply | Any `/apply` link, including the demo CTA | `app/api/apply/route.ts` | `archive_applications` | Lead notification | none | Joins Journey 1, 3, or 4 at step 1 |

Where this journey terminates today: at the apply form, which is the correct
destination. The demos themselves are complete, stateless, and correctly gated. The
break is that nothing connects a demo session to the application that follows it. A
prospect who runs the public succession demo and then applies arrives in
`archive_applications` with no record of which persona they talked to or what they
asked. Termination is by design. The missing attribution is by absence.

---

## SECTION B. ORPHANED ROUTES

Routes that exist and that no journey in Section A reaches. Known and accepted ones
are included so the list is complete rather than tidy.

### B1. Confirmed legacy redirects, accepted

| Route | Handler | Status |
|-------|---------|--------|
| `/archivist/demo/succession` | `app/archivist/demo/succession/page.tsx` | Confirmed. A `permanentRedirect` (308) to `/succession/demo`. The comment says the B2B demo moved out of the Guide-gated tree to a public URL. Working as intended |
| `/custodianship` | `app/custodianship/page.tsx` | 308 to `/data-ownership` |
| `/partner` | `app/partner/page.tsx` | Redirect to `/join-archivists` |
| `/partner/apply` | `app/partner/apply/page.tsx` | Client redirect to `/partner#apply`, which itself redirects. Two hops to `/join-archivists` |

### B2. Retired auth endpoints returning HTTP 410

These are reachable but always fail by design, after the Supabase Auth migration.

- `app/api/archive-login/route.ts`
- `app/api/archivist-login/route.ts`
- `app/api/succession/login/route.ts`

### B3. A parallel legacy application tree, unlinked from Nav and Footer

None of these appear in `app/components/Nav.tsx` or `app/components/Footer.tsx`.
None are covered by `proxy.ts`, which gates only `/archive`, `/archivist`, and
`/succession/portal`. Each page carries its own `supabase.auth.getUser()` check and
redirects to `/login`.

| Route | Handler | Note |
|-------|---------|------|
| `/login` | `app/(auth)/login/page.tsx` | Reachable only by direct URL. Links onward to `/begin/tier` |
| `/join` | `app/(auth)/join/page.tsx` | |
| `/register` | `app/(auth)/register/page.tsx` | |
| `/dashboard` | `app/(dashboard)/dashboard/page.tsx` | Own `getUser` guard, redirects to `/login` |
| `/dashboard/files` | `app/(dashboard)/dashboard/files/page.tsx` | |
| `/dashboard/curators` | `app/(dashboard)/dashboard/curators/page.tsx` | |
| `/dashboard/milestones` | `app/(dashboard)/dashboard/milestones/page.tsx` | |
| `/curator` | `app/(curator)/curator/page.tsx` | Own `getUser` guard |
| `/curator/essence` | `app/(curator)/curator/essence/page.tsx` | |
| `/api/dashboard/add-milestone` | route | Serves the tree above only |
| `/api/dashboard/invite-curator` | route | |
| `/api/dashboard/upload` | route | |
| `/api/curator/accept-invite` | route | |
| `/api/curator/seal-memory` | route | |

### B4. The `/begin` funnel, unlinked except from `/login`

`/begin/tier`, `/begin/details`, `/begin/review`, `/begin/confirmed`. Reached only
from `app/(auth)/login/page.tsx` line 171. `app/begin/review/page.tsx` writes to a
`signups` table using the browser anon client from `lib/supabase.ts`, which no other
code in the repo reads. Its prices disagree with `lib/stripe/prices.ts` and with both
context docs, see Section D.

### B5. iOS-only API surface

Reached by the Expo app at `C:\Users\mrdav\basalith-app`, not by any web journey. All
of the `/api/mobile/*` routes use `getSessionUser`. The `-mobile` suffixed routes were
not individually opened in this pass.

- `/api/mobile/companion`, `/api/mobile/mirror`, `/api/mobile/mirror/react`,
  `/api/mobile/my-archives`, `/api/mobile/spark/random`
- `/api/archive/accuracy-mobile`, `/api/archive/contributor-activity-mobile`,
  `/api/archive/dashboard-mobile`, `/api/archive/memory-game-mobile`,
  `/api/archive/mobile-spark`, `/api/archive/recordings-mobile`,
  `/api/archive/significant-dates-mobile`, `/api/archive/wisdom-exchange-mobile`
- `/api/archive/mobile-login`, a deprecated password shim against
  `archive_credentials`, with a header comment saying it is kept for the existing iOS
  build until the OTP build ships
- `/api/archive/push-token`

### B6. Orphaned crons, no schedule in `vercel.json`

`vercel.json` schedules 19 paths. These cron routes exist and are not among them.

| Route | Reachable by | Consequence |
|-------|--------------|-------------|
| `/api/cron/pay-residuals` | `CRON_SECRET` header, POST only | Nothing fires it. No residual commission is ever written |
| `/api/cron/guide-quality-audit` | `CRON_SECRET`, POST | Never runs |
| `/api/cron/cold-storage-ping` | `CRON_SECRET`, GET | Never runs. This is the paused-archive re-engagement email |
| `/api/cron/pause-reminder` | `CRON_SECRET`, GET | Never runs |
| `/api/cron/family-reactions` | `CRON_SECRET`, GET | Never runs |

`/api/cron/memory-game-monthly` is scheduled as a GET at `0 11 1 * *`, and its POST
handler is separately invoked by `/api/cron/send-photos` nightly.

### B7. Reachable only from God Mode or a script

`/api/god/*` (16 routes), `/api/admin/checkout`, `/api/admin/guide`,
`/api/admin/test-cron`. All gated on the `god-mode-auth` cookie.

### B8. Other unreached routes

| Route | Note |
|-------|------|
| `/api/archivist-apply` | The handler only calls `console.log`. Persists nothing |
| `/api/archivist-interest` | The handler only calls `console.log`. Persists nothing. This is the `/join-archivists` form target |
| `/api/wechat/webhook`, `lib/wechat.ts` | WeChat deposit path. No web journey reaches it |
| `/api/game/[sessionId]`, `/api/game/active`, `/api/game/story`, `/game/[sessionId]`, `/game/[sessionId]/leaderboard` | Memory game surfaces, driven by the memory-game crons and by email links, not by any of the seven journeys |
| `/api/archive/wechat-link` | |
| `/api/ping` | Health check |
| `/api/contact` | `/contact` page form |
| `/api/partner` | `/partner` redirects away, so nothing posts here |
| `/api/auth/logout` | Session teardown |
| `/api/photos/[photoId]` | The signed-URL proxy. Reached by rendered pages and emails, not a journey step |
| `/api/archive/export`, `/api/archive/terminate`, `/api/archive/switch` | Owner account operations outside the seven journeys |
| `/asset`, `/press`, `/faq`, `/method`, `/about`, `/families`, `/continuity`, `/integrity`, `/data-ownership`, `/privacy`, `/privacy-policy`, `/terms`, `/security`, `/posthumous-archive`, `/founding-session`, `/resume`, `/pricing` | Marketing and policy pages. Linked from Nav and Footer, not journey steps |

---

## SECTION C. BROKEN CHAINS AND MISSING STEPS

### C1. BROKEN CHAINS

Every row in Section A whose next step trigger is exactly
`none, user must return unprompted`.

| Journey | Step | What ends |
|---------|------|-----------|
| 1. B2C owner | 6 | The dashboard. Nothing pulls the owner back except the next morning's cron email |
| 1. B2C owner | 9 | A web deposit. Making one deposit does not schedule, prompt, or unlock anything |
| 1. B2C owner | 10 | A phone deposit. Same |
| 2. B2C contributor | 5 | A completed witness session. No follow-up, no second session, no return path |
| 2. B2C contributor | 8 | The Friday reveal email. The thread closes |
| 3. B2B founder, succession | 9 | A completed incident. The founder is not told what it covered or what remains |
| 5. Successor | 1 | Successor provisioning. No email is sent. The successor is never told the account exists |
| 5. Successor | 6 | Grounded entity chat. No summary, no digest, no reason to come back |
| 5. Successor | 7 | Scenario review |
| 6. Legacy Guide | 9 | Pipeline management. Nothing prompts a Guide to work their pipeline |
| 6. Legacy Guide | 12 | The residual cron. Nothing fires it, so nothing ends because nothing starts |
| 7. Prospect | 3 | The public succession demo. No capture, no follow-up, no attribution |
| 7. Prospect | 5 | The Guide-run incident demo |
| 7. Prospect | 6 | The white paper request |

### C2. Manual operator dead ends

Listed separately so the C1 list stays exactly what was asked for. These rows have no
software trigger either, but the party who must act is an operator, not the user.

| Journey | Step | What must happen by hand |
|---------|------|-------------------------|
| 1, 3, 4 | 1 | A human reads the lead notification email. Nothing moves `archive_applications.status` off `pending` except `provisionOnFoundingFee` after payment |
| 1, 3 | 2 | A human opens God Mode and calls `/api/admin/checkout` with a `familyName` they supply by hand, then sends the URL themselves |
| 6. Legacy Guide | 1 and 2 | A human reads a `console.log` line, then creates an `archivist_invites` row and communicates the code out of band |

### C3. MISSING STEPS

Journey stages with no software behind them at all.

**Acquisition, checked specifically.** What exists past the apply form for an
acquisition lead: nothing.

Evidence:
- `app/api/apply/route.ts` accepts `applyType = 'acquisition'`, writes
  `archive_applications` with `apply_type = 'acquisition'`, and emails a lead
  notification. That is the whole implementation.
- `app/api/admin/checkout/route.ts` lines 26 to 31 map `acquisition` to a sentinel,
  and lines 120 to 125 return HTTP 422, "Acquisition deals are billed by manual
  invoice, not checkout".
- `lib/stripe/prices.ts` defines nine `PriceName` values. None is an acquisition
  product.
- A repository-wide search for `acquisition` returns marketing copy, one scenario in
  `lib/b2bScenarios.ts`, one demo persona file (`lib/demoPersonas/joey.ts`), the apply
  form and route, the checkout rejection, and doc files. No engagement table, no
  invoice route, no delivery route, no onsite scheduling, no coverage-map delivery.
- `archive_lifecycle` is written with `segment` taken from `billing.segment`, which is
  only ever `b2c` or `succession`. No acquisition archive can reach it, because no
  acquisition checkout can complete.

**Other missing stages.**

| Journey | Stage with no software | Evidence |
|---------|------------------------|----------|
| 3. B2B founder | "Certified", or any founder-facing delivery of fidelity or coverage | `lib/fidelityEval.ts` has no route caller. Only `scripts/run-fidelity-eval.ts` imports it |
| 3. B2B founder | Handoff from founder to successor at the transition moment | `app/api/archive/succession/add/route.ts` is an owner-driven form with no transition trigger, no freeze step, and no notification |
| 5. Successor | Successor is notified they have access | `app/api/archive/succession/add/route.ts` imports no mailer |
| 5. Successor | The password collected at provisioning is usable | It is stored as `password_hash`. `app/api/succession/login/route.ts` returns HTTP 410 |
| 6. Legacy Guide | Invite code creation and delivery | Nothing in the repo writes `archivist_invites`. `app/api/guide-onboard/route.ts` only reads them |
| 6. Legacy Guide | Residual payout actually running | `pay-residuals` is absent from `vercel.json` crons |
| 1. B2C owner | Application to checkout | No route moves an application forward. Two manual operator steps sit in the middle of the only revenue path |
| 7. Prospect | Demo to application attribution | The demo routes persist nothing, by design, and `archive_applications` has no demo linkage column |

---

## SECTION D. DOC CONFLICTS

Read after the inventory above was built, per the instruction. Both files live at
`C:\Users\mrdav\Downloads\`, not in the repo.

### D1. `BASALITH_BUILD_CONTEXT.md`

| Claim | Where it appears | What the code actually does |
|-------|------------------|-----------------------------|
| "Next.js 14 App Router" | Tech stack, line 23 | `package.json` line 25 pins `"next": "16.1.6"` exactly, with `react` 19.2.3. Next 16 renamed `middleware.ts`, which is why `proxy.ts` sits at the repo root |
| "residual 8% of annual fee" | Pricing, line 190 | `RESIDUAL_RATE = 0.12` in `app/api/cron/pay-residuals/route.ts` line 6, and the same 0.12 in `app/api/archivist/dashboard/route.ts` line 45. The B2B pivot doc already flags this. It is still wrong here |
| "Training pairs scored by Haiku (volume) with Sonnet escalation for ambiguous cases (60-75 range)" | Architectural decisions, item 6 | `lib/trainingPipeline.ts` makes exactly one model call, `claude-haiku-4-5-20251001`, with no escalation path of any kind. There is no Sonnet call and no 60 to 75 band. `QUALITY_THRESHOLD = 50` |
| "mirror_reflections table. Dedupe guard: one reflection per archive per week_of" | The Mirror section | `supabase/migrations/20260606_mirror_reflections.sql` creates one index, `idx_mirror_archive ON mirror_reflections(archive_id, created_at DESC)`. There is no unique constraint on `(archive_id, week_of)`. `app/api/cron/weekly-mirror/route.ts` never reads `mirror_reflections` before inserting. Nothing prevents a second reflection for the same week |
| "B2B question bank: 29 questions across 8 categories. daily-reflection serves these to succession-tier archives in sequence" | B2B Succession product | Two errors. `daily-reflection` no longer serves `b2b_questions` in sequence to succession archives. `app/api/cron/daily-reflection/route.ts` lines 67 to 98 take the succession branch, read an open incident or pick an incident seed, render a SEED probe, and send an invitation into the portal with no `replyTo`. The sequential B2B bank path in `lib/selectNextQuestion.ts` `pickQuestionB2B` is still present but is not reached from this cron. Separately, `CLAUDE.md` records 37 `b2b_questions` rows, not 29 |
| "Every owner-facing cron creates a session + sets replyTo" | Email reply pipeline | Not true for succession-tier archives. `app/api/cron/daily-reflection/route.ts` deliberately sets no `replyTo` on the succession branch, with a comment saying answering by email cannot drive the probe chain |
| "/archivist/demo/succession. B2B boardroom demo: fictional founder Margaret Chen of Meridian Capital, three-panel two-layer walkthrough. Static, read-only" | Legacy Guide demos | `app/archivist/demo/succession/page.tsx` is now a `permanentRedirect` to `/succession/demo`. That page is public and login-free, and the demo is interactive, not static. It posts to `app/api/demo/succession-entity/route.ts`, which runs a real Sonnet call plus the real `verifyGrounding` verifier. The Margaret Chen persona still exists at `lib/demoPersonas/margaretChen.ts` and now shares the demo with `lib/demoPersonas/joey.ts` |
| "Four-stage milestone system. Echo 10, Wisdom 50, Portrait 200, Fingerprint 500" | Milestone section | `lib/entityReadiness.ts` `MILESTONES` is Foundations, Taking Shape, Recognizable, Ready to Meet Your Family, with combined photograph, deposit, voice, and session criteria. `lib/selectNextQuestion.ts` bands at 10 and 200 with different names again. Three taxonomies, none matching this one |
| "Founder admin: /archive/succession to create/remove successor credentials" | B2B Succession product | The page exists and the route creates a row, but the credential it creates cannot be used. `app/api/succession/login/route.ts` returns HTTP 410. Sign-in is magic-link only |
| "Legacy tier: $1,200/year (post-death)" | Pricing, line 193 | Agrees with the pivot doc, but `app/begin/tier/page.tsx` and `app/begin/review/page.tsx` still render Legacy as "$2,500 one-time". That funnel is orphaned, see Section B4, but it is live code |
| "Stripe integration is THE revenue blocker, no way to charge" | Open items, item 1 | Stale. The full slice is built. `lib/stripe/prices.ts`, `app/api/admin/checkout/route.ts`, `app/api/stripe/webhook/route.ts`, `lib/inngest/billingFunctions.ts`, and three tables (`stripe_events`, `billing`, `archive_lifecycle`) all exist. Test price ids are populated, `LIVE_PRICES` is empty |

### D2. `BASALITH_B2B_PIVOT_CONTEXT.md`

| Claim | Where it appears | What the code actually does |
|-------|------------------|-----------------------------|
| "the broken Guide onboarding route was retired. All onboardings now flow through the single admin checkout path (app/api/admin/checkout)" | B2B apply intake section | Half true. `app/archivist/onboard/page.tsx` was reduced to a notice. But `app/api/archivist/onboard-client/route.ts` is fully intact and still creates `archives`, `archive_credentials`, an owner Auth user, a `commissions` row, and a `prospects` row, and emails a client welcome with a magic link. It has no caller authentication. It verifies only that the supplied `archivistId` names an active row in `archivists`. Retiring the page did not retire the route |
| "Guide residual: RESIDUAL_RATE = 0.12 (12%) is the live code truth" | Pricing section | Confirmed correct in both `app/api/cron/pay-residuals/route.ts` and `app/api/archivist/dashboard/route.ts`. Noted here because it contradicts the other doc, and the pivot doc is the one that matches the code |
| "Optional CHECK constraint limits apply_type to legacy/succession/acquisition" | Migration shape | `unconfirmed`. PostgREST does not expose CHECK constraints and no SQL was run in this pass. `app/api/apply/route.ts` line 40 does its own allow-list, so a rejected value cannot originate from that route |
| "No acquisition product exists in Stripe; acquisition is a manual invoice per deal" | Billing state | Confirmed for Stripe. Incomplete as a statement of the system: there is no software for the manual invoice either, nor for anything else past the apply form. See Section C3 |
| "Post-transition successor access $3,600/year" | Pricing section | The price name `succession_post_year` exists in `lib/stripe/prices.ts` with a test id. It is not in `SELLABLE_TIERS` in `app/api/admin/checkout/route.ts`, so no checkout can sell it. There is no code path that charges a successor |
| "Live succession smoke test: gated on the successor-login flow build" | Open items | The successor login flow is built. `app/succession/login/page.tsx` sends a Supabase OTP with `shouldCreateUser: false`, and `app/auth/callback/route.ts` routes `role === 'successor'` to `/succession/portal`. What is still missing is any notification to the successor that an account exists |
| "the apply funnel was broken for business leads. The API dropped applyType and all business fields" | B2B apply intake, problem statement | Fixed in live code. `app/api/apply/route.ts` persists `apply_type`, `company_name`, `industry`, `employees`, and `business_timeline`, requires `subject` only for `legacy`, and routes business leads to both inboxes. The problem statement is history, not current state |
| Delivery model for acquisition, "Days 1-3 onsite ... Weeks 2-5 remote ... Close: fidelity check against the harness, coverage map delivered, successor provisioned" | Pricing section | None of this exists in software. There is no engagement record, no onsite scheduling, no coverage map delivery, and no route that runs a fidelity check. `lib/fidelityEval.ts` is reachable only from `scripts/run-fidelity-eval.ts` |

### D3. Conflict against `CLAUDE.md`

Noted because `CLAUDE.md` is read at the start of every run and section 6 of it is
explicitly a "known broken" list.

`CLAUDE.md` says the question-to-deposit link is broken, and that "the inbound handler
does not know which question a reply answers. It marks the most recent unanswered row
served within 14 days." That is now the fallback, not the primary path.
`lib/emailReplySessions.ts` line 43 writes `question_history_id` onto the session,
`lib/selectNextQuestion.ts` returns `questionHistoryId` from
`defaultInsertQuestionHistory`, `app/api/cron/daily-reflection/route.ts` line 116
threads it through, and `app/api/resend/inbound/route.ts` lines 273 to 306 use the
exact row id when present and warn loudly when falling back to the 14-day heuristic.
The historical rows described in `CLAUDE.md` are still wrong. The mechanism is not.

---

## SECTION E. LAYER 2 BLOCKERS

### E1. Do `/api/cron/daily-reflection` and `/api/cron/weekly-mirror` have an extractable per-archive function, or are the archive sweep and the generation fused inside the route handler?

**Fused. Neither route exposes a per-archive function.**

`app/api/cron/daily-reflection/route.ts` exports exactly one symbol, `GET`, plus the
`dynamic` const. The archive sweep is lines 40 to 48, and the entire per-archive body
is inline in the `for` loop at lines 57 to 147: tier branch, incident read, question
selection, reply session creation, and the Resend send. The two module-level helpers
`buildDailyReflectionEmail` (line 161) and `buildSuccessionInviteEmail` (line 327) are
HTML builders only, and neither is exported.

`app/api/cron/weekly-mirror/route.ts` is the same shape. The sweep is lines 37 to 41,
and the per-archive body is inline at lines 46 to 120. It does delegate generation to
`generateMirror(archiveId, archiveName, deposits)` in `lib/generateMirror.ts` line 12,
which is the only exported function in that file. But the deposit fetch, the density
floor, the `mirror_reflections` insert, the reply-session creation, and the send are
all inline in the loop.

Consequence for a time travel harness: driving either cron for one archive requires
either an HTTP call with the `?archiveId=` parameter (which `daily-reflection`
supports at line 38, and `weekly-mirror` does not), or extracting the loop body first.

### E2. List every outbound send path in the archive lifecycle. Every one, not just the two crons.

50 files call `resend.emails.send`. Grouped by trigger.

**Scheduled crons, 19 paths in `vercel.json`.** All 19 send.

| Path | Schedule | Sends |
|------|----------|-------|
| `/api/cron/send-photos` | `0 21 * * *` | Fans out. Sends nothing itself |
| `/api/cron/daily-reflection` | `0 8 * * *` | Daily question, or the succession invitation |
| `/api/cron/anniversary-triggers` | `0 8 * * *` | Anniversary question |
| `/api/cron/annual-preview` | `0 9 * * *` | Annual preview |
| `/api/cron/weekly-prompt` | `0 8 * * 1` | Weekly prompt to contributors |
| `/api/cron/story-prompt-monday` | `0 9 * * 1` | Story prompt, or the Monday mystery photo |
| `/api/cron/memory-game-start` | `0 9 * * 3` | Memory game invitation |
| `/api/cron/story-prompt-friday` | `0 9 * * 5` | Friday reveal |
| `/api/cron/memory-game-reminder` | `0 9 * * 5` | Game reminder |
| `/api/cron/memory-game-summary` | `0 18 * * 5` | Game summary |
| `/api/cron/monthly-report` | `0 9 1 * *` | Monthly report |
| `/api/cron/monthly-accuracy` | `0 9 1 * *` | Accuracy check-in |
| `/api/cron/contributor-mirror` | `0 10 1 * *` | Contributor mirror |
| `/api/cron/memory-game-monthly` | `0 11 1 * *` | Monthly game |
| `/api/cron/gratitude-note` | `0 9 2 * *` | Gratitude note |
| `/api/cron/entity-letter` | `0 9 1 1,4,7,10 *` | Quarterly entity letter |
| `/api/cron/voice-portrait` | `0 10 15 * *` | Voice portrait |
| `/api/cron/weekly-replay` | `0 9 * * 0` | Weekly replay |
| `/api/cron/weekly-mirror` | `0 17 * * 0` | Weekly Mirror |

**Cron routes that send but are not scheduled.** These are live send paths with no
trigger. See Section B6.

- `/api/cron/cold-storage-ping`
- `/api/cron/pause-reminder`
- `/api/cron/family-reactions`

`/api/cron/guide-quality-audit` and `/api/cron/pay-residuals` are also unscheduled but
do not send.

**Fan-out children of `/api/cron/send-photos`.** All four require `CRON_SECRET` in the
`Authorization` header.

- `/api/archive/send-photo`
- `/api/archive/poll-replies`, which itself forwards to `/api/archive/contribution-alert`
- `/api/archive/morning-digest`
- `/api/archive/life-event`

**Inbound and reply paths.**

- `app/api/resend/inbound/route.ts`, the "your memory has been saved" confirmation
- `app/api/archive/receive-reply/route.ts`
- `lib/memoryChain.ts`, the memory chain email

**User-triggered sends.**

- `app/api/apply/route.ts`, lead notification
- `app/api/contact/route.ts`
- `app/api/archive/contributors/route.ts`, POST invite and PATCH resend
- `app/api/archive/invite-witness/route.ts`
- `app/api/witness/[sessionId]/route.ts`, owner notification on completion
- `app/api/contribute/answer/route.ts`, owner notification
- `app/api/contribute/wisdom-exchange/route.ts`
- `app/api/contribute/upload-media/route.ts`
- `app/api/contribute/register-photo/route.ts`
- `app/api/contribute/register-media/route.ts`
- `app/api/archive/entity-chat/route.ts`
- `app/api/archive/entity-readiness/route.ts`
- `app/api/archive/terminate/route.ts`
- `app/api/demo/whitepaper/route.ts`

**Billing and provisioning sends.**

- `lib/inngest/billingFunctions.ts`. Four functions send: `provisionOnFoundingFee`
  (founding welcome plus a commission-failure admin notice), `logPaymentFailed`
  (payment notice), `logSubscriptionCanceled` (archive paused notice)
- `lib/billing/legacyActivation.ts`, client welcome plus admin notice, reached from
  `app/api/stripe/webhook/route.ts` on a legacy `metadata.archiveId` session or via
  the `x-manual-secret` override
- `app/api/archivist/onboard-client/route.ts`, client welcome plus admin notification

**Guide sends.**

- `app/api/archivist/submit-exam/route.ts`, the certification email after module 3

**God Mode sends.**

- `app/api/god/email/route.ts`
- `app/api/god/send-magic-link/route.ts`
- `app/api/god/send-apology/route.ts`

**Supabase-sent, not Resend.** Magic links. `supabaseAdmin.auth.admin.generateLink` in
`lib/billing/createArchive.ts` and `app/api/admin/guide/route.ts` produce a URL that
another email carries. `supabase.auth.signInWithOtp` on the three login pages
(`/archive-login`, `/archivist-login`, `/succession/login`) makes Supabase send the
email directly, outside Resend and outside any template in this repo.

**Script.** `scripts/audit-reply-loop.ts` also sends. It is a command-line tool, not a
lifecycle path.

### E3. Do deposit and training pair inserts accept a test flag at insert time on every path? Name the exact column and its type.

**No. Not on any path.**

`owner_deposits.test_artifact` exists and is read as a filter in three places:

- `lib/entityContext.ts` line 67, `.not('test_artifact', 'is', true)`
- `lib/fidelityEval.ts` line 664, same predicate
- `lib/holdoutAssignment.ts` line 141, same predicate

A repository-wide search finds no write to `test_artifact` anywhere. Not in
`app/api/archive/owner-deposit/route.ts`, not in `app/api/resend/inbound/route.ts`,
not in `app/api/contribute/answer/route.ts`, not in
`app/api/archive/b2b-question/answer/route.ts`, not in the Twilio path, not in any
script. The column has readers and no writers.

Type: `unconfirmed`. `test_artifact` appears in no migration file in
`supabase/migrations/`. The read predicate `.not('test_artifact', 'is', true)` is
written to tolerate null, which implies a nullable boolean, but that is inference, not
confirmation. Reading it would require a live query, which was out of scope for this
pass.

The nearest thing that does work is `owner_deposits.eval_holdout`, `boolean not null
default false` per `supabase/migrations/20260612_eval_runs.sql` line 5. It is written
only after the fact, by `lib/holdoutAssignment.ts` line 315 and
`scripts/assign-holdout.ts`, never at insert time.

`training_pairs` has no test flag column at all. `metadata` is `jsonb` and already
carries `owner_name`, `archive_name`, and optionally `probe_type`, `dimension`, and
`dimension_status` (`lib/trainingPipeline.ts` lines 155 to 162). Nothing writes a test
marker into it.

Consequence for a time travel harness: there is no insert-time way to mark synthetic
data. Every synthetic deposit would land indistinguishable from real founder content
until a separate update pass marked it, and the three readers above would treat it as
real in the meantime.

### E4. What dedupe or state rows do the crons read before generating? Name each one and the table it lives in.

| Cron | Pre-read | Table | Strength |
|------|----------|-------|----------|
| `daily-reflection` | Open incident, succession only | `incident_sessions` via `loadOpenIncident` | Real. One open incident per archive, enforced by a partial unique index |
| `daily-reflection` | Full serve history, 500 rows | `question_history` via `defaultGetQuestionHistory` | Real, drives the 30 and 180 day question cooldowns |
| `daily-reflection` | Last "not quite right" reaction inside 7 days | `mirror_reflections` | Real, drives the P0 repair branch |
| `daily-reflection` | Coverage | `deposit_domain_scores` via the `get_domain_coverage` RPC | Real, drives domain selection |
| `daily-reflection` | none for send-once-per-day | | Weak. Only the `getUTCHours() !== 8` guard prevents a repeat. Two invocations in the 8am UTC hour both send |
| `weekly-mirror` | Deposits in the trailing 7 days, floor of 2 | `owner_deposits` | Density gate, not a dedupe |
| `weekly-mirror` | none | | **No dedupe at all.** It never reads `mirror_reflections` before inserting, and the table has no unique index on `(archive_id, week_of)`. Two Sunday invocations produce two reflections and two emails |
| `anniversary-triggers` | `metadata->>idempotencyKey` equal to `{date.id}-{year}` | `owner_notifications` | Real, one per significant date per year |
| `annual-preview` | `last_annual_preview_year` compared to the current year | `archives` | Real, one per year |
| `cold-storage-ping` | prior notification | `owner_notifications` | Real. Also reads `owner_deposits` for content |
| `pause-reminder` | prior notification | `owner_notifications` | Real |
| `contributor-mirror` | prior notification | `owner_notifications` | Real. Also reads `contributor_questions` and `contributors` |
| `entity-letter` | prior notification | `owner_notifications` | Real. Also reads `training_pairs` for content |
| `monthly-accuracy` | prior notification, read twice | `owner_notifications` | Real. Also reads `training_pairs` |
| `story-prompt-monday` | prompt already sent | `contributor_story_prompts`, insert-before-send with a unique index | Real |
| `story-prompt-monday` | photo already used | `photographs.story_prompt_sent_at` | Real |
| `story-prompt-monday` | photo already seen by this contributor | `contributor_photo_sends` | Real |
| `story-prompt-friday` | `reveal_sent = false` on a session at least 7 days old | `story_prompt_sessions` | Real |
| `memory-game-start` | open session, and photos used in the last 14 days | `memory_game_sessions`, `photographs.memory_game_used_at` | Real |
| `memory-game-reminder` | open session and existing contributions | `memory_game_sessions`, `memory_game_contributions` | Real |
| `memory-game-summary` | session state | `memory_game_sessions`, `memory_game_contributions` | Real |
| `memory-game-monthly` | session state | `memory_game_sessions`, `memory_game_responses` | Real |
| `voice-portrait` | prior portrait | `voice_portraits` | Real. Also reads `owner_deposits` |
| `gratitude-note` | labels in the last 30 days | `labels` | Content gate. The only send guard is `getDate() !== 2` |
| `monthly-report` | 30-day counts across many tables | various | **No dedupe row.** Only the `getDate() !== 1` guard |
| `weekly-replay` | deposits and questions from the week | `owner_deposits`, `contributor_questions` | Content gate. The only send guard is `getDay() !== 0` |
| `weekly-prompt` | weakest dimensions | `entity_accuracy`, `contributor_questions` | Content gate |
| `family-reactions` | pending questions | `contributor_questions` | Content gate. Unscheduled |
| `send-photos` | labels in the last 24 hours, per archive | `labels` | Content gate. The children own the real dedupe: `contributor_photo_sends` and `owner_photo_sends` |
| `pay-residuals` | a `type = 'residual'` commission since the first of the month | `commissions` | Real. Unscheduled, so it never runs |

Two crons have no dedupe row at all and rely purely on a date guard:
`weekly-mirror` and `monthly-report`. Any harness that replays a day would double-send
both.

### E5. Is archive provisioning callable outside the checkout path? Report what you see about idempotency, without fixing it.

**Yes. Three ways.**

The shared core is `createArchiveWithCredentials` in `lib/billing/createArchive.ts`. It
inserts an `archives` row, an `archive_credentials` row, creates or reuses a Supabase
Auth user, links `owner_user_id`, and generates a magic link.

**Caller 1, the paid path.** `provisionOnFoundingFee` in
`lib/inngest/billingFunctions.ts`. Idempotency here is layered and real:
- Inngest `idempotency: 'event.data.subscriptionId'` at the function level
- The `billing.founding_paid_at` gate at line 114, which returns early on a second run
- A `billing.archive_id` reuse check at line 142, so a partial prior run reuses the
  archive instead of creating a second one
- `archive_lifecycle` upsert on the `archive_id` primary key
- The founding commission is guarded by an exact `description` match lookup

**Caller 2, the Legacy Guide path.** `app/api/archivist/onboard-client/route.ts`. This
is the one to look at.
- **No caller authentication.** The route reads `archivistId` from the request body,
  confirms that row exists in `archivists` with `status = 'active'`, and proceeds.
  Anyone who knows an active `archivists` row id can call it
- **No idempotency of any kind.** No dedupe key, no existence check on
  `owner_email`, no lookup before insert. Two identical POSTs create two archives, two
  `archive_credentials` rows, two `commissions` rows (each $1,000), two `prospects`
  rows, and send two welcome emails
- The commission dedupe that exists in the Inngest path (the `description` match at
  `billingFunctions.ts` line 189) has no counterpart here
- The `increment_closings` RPC fires unconditionally

This is consistent with the `CLAUDE.md` note that "The Calder Archive was provisioned
four times as empty duplicate rows".

**Caller 3, the legacy activation path.** `activateArchiveById` in
`lib/billing/legacyActivation.ts`, reached from `app/api/stripe/webhook/route.ts` two
ways: a `checkout.session.completed` session carrying `metadata.archiveId`, or the
`x-manual-secret` header override matched against `MANUAL_ACTIVATION_SECRET`. This one
does not create an archive, it activates an existing one. It is idempotent on the
happy path (line 37 returns early when `status === 'active'`) but it regenerates the
login password and re-sends the welcome email on every call that finds a non-active
archive.

**Also relevant.** `scripts/seed-demo-archive.js` inserts an `archives` row directly
with the service role key, no dedupe. `scripts/onboard-client.js` exists and was not
opened in this pass.

### E6. How do `selectNextQuestion` and `question_history` interact, and what happens when a question bank is exhausted?

**Interaction, reads.** `defaultGetQuestionHistory` (line 559) pulls the 500 most
recent `question_history` rows for the archive, ordered by `served_at` descending,
selecting `domain_id`, `question_id`, `b2b_question_id`, `served_at`, `answered_at`.
That array drives three things:
- `getEligibleDomains` (line 150). Never repeats the immediately preceding domain.
  Weight-3 domains need a 5-day gap and never follow another weight-3
- `isQuestionEligible` (line 227). An answered question is excluded for 180 days from
  `answered_at`. An unanswered question is excluded for 30 days from `served_at`
- `lastServedQuestionAt` (line 274). Ties are broken toward the least recently served

**Interaction, writes.** `defaultInsertQuestionHistory` (line 676) inserts one row per
serve with `archive_id`, `domain_id`, `question_id`, `b2b_question_id`,
`question_text`, `source`, `channel`, and `framing_used` as a boolean.
`answered_deposit_id` and `answered_at` are deliberately left null. The insert returns
the new row id, which becomes `SelectNextQuestionResult.questionHistoryId`. A failed
insert logs `console.warn` and returns null rather than throwing, so a rejected value
(for example a CHECK violation on `channel` or `source`) fails silently and the email
still sends.

The answer side closes the loop in `app/api/resend/inbound/route.ts` lines 273 to 306,
which prefers `session.question_history_id` and falls back to the 14-day heuristic
with a warning.

**Exhaustion. It throws.**

Three distinct throw sites, all uncaught inside `selectNextQuestion`:

- Line 394: `if (!domain) throw new Error('selectNextQuestion: no eligible domain for
  archive ... (scope ..., band ...)')`. Reachable only if coverage itself is empty,
  because both domain pickers fall back to the unfiltered coverage array when
  cooldowns would empty the pool (lines 193 and 212)
- Line 406: `throw new Error('selectNextQuestion: no eligible b2b question for domain
  ...')`
- Line 412: `throw new Error('selectNextQuestion: no eligible elicitation question for
  domain ...')`

The question pickers have **no fallback**. Unlike the domain pickers, `pickQuestionB2C`
and `pickQuestionB2B` return null when every candidate is inside its cooldown, and the
caller throws.

What the caller does with that throw: `app/api/cron/daily-reflection/route.ts` wraps
the whole per-archive body in a try/catch at lines 58 and 144. The catch logs
`[daily-reflection] Failed for archive {id}` and moves to the next archive. So an
exhausted bank means **that archive silently gets no email that day**, and the cron
still reports success for every other archive. There is no retry, no widening of the
tier allow-list, and no alert.

Practical exhaustion math: `elicitation_questions` has 104 rows across all domains. A
`p1` archive is restricted to `tier = 'onramp'` questions in weight-1 domains only
(`tiersForBand`, line 247). That is the narrowest pool in the system, and it is the
pool a brand-new archive draws from for its first 10 deposits, at one per day, with a
30-day unanswered cooldown. Given that `CLAUDE.md` records 224 served rows and
effectively zero answered, every one of those is on the 30-day unanswered clock, not
the 180-day answered clock.

### E7. Can an archive's deposits be copied to a new archive id? If so, do training pairs copy with them or get regenerated, and do copied pairs carry their original scores?

**No. There is no copy path in the repository.**

A search for clone, copy, and duplicate across the repo returns only unrelated hits:
voice cloning (`app/api/archive/setup-voice-clone/route.ts`,
`app/api/archive/test-voice/route.ts`, `app/api/cron/voice-portrait/route.ts`), the
structural clone helpers in `lib/incidentSession.ts` and `lib/demoIncidentBuffer.ts`,
and copy in the prose sense. No route, no script, and no library function reads
`owner_deposits` for one `archive_id` and writes them under another.

`scripts/seed-demo-archive.js` creates an empty archive and nothing else. It inserts
one `archives` row and prints the id.

**If a copy were built, here is what the code says would happen.**

Training pairs would **not** copy. `training_pairs.archive_id` is a plain column
written at creation time by `lib/trainingPipeline.ts` line 167. Nothing rewrites it.
Copied deposits would arrive with no pairs attached.

Training pairs would **not** regenerate automatically either. Every pair-creating call
site is explicit and synchronous with a deposit write:
`app/api/archive/owner-deposit/route.ts`, `app/api/resend/inbound/route.ts`,
`app/api/contribute/answer/route.ts`, `app/api/archive/b2b-question/answer/route.ts`,
and the Twilio recording path. A bulk insert into `owner_deposits` triggers none of
them. There is no database trigger and no Inngest function watching the table.

The one route that could regenerate is `app/api/god/backfill-training/route.ts`. It is
god-authed, takes an optional `archiveId`, and walks `owner_deposits`,
`voice_recordings`, and `labels` in batches of up to 50, calling
`createTrainingPairFromDeposit` for each.

Scores on regenerated pairs would be **new, not original**. `createTrainingPairFromDeposit`
calls `scoreTrainingPair` inline every time (line 149), which makes a fresh Haiku call.
The model is non-deterministic, so a re-scored pair for identical text can land on a
different `quality_score`, and therefore on a different `included_in_training` value,
since that is computed as `quality_score >= 50` at line 175.

Two further consequences worth naming:

- The idempotency key is the `(source_id, source_type)` tuple (line 135). Copied
  deposits get new UUIDs, so they get new `source_id` values, so the guard would not
  recognize them as duplicates. The copy would produce a second full set of pairs
  under the new archive, at full model cost.
- `owner_deposits.eval_holdout` and `owner_deposits.test_artifact` would not carry
  across a naive column copy unless explicitly included. `exportTrainingData`
  (`lib/trainingPipeline.ts` line 295) filters holdouts by re-reading
  `owner_deposits.eval_holdout` at export time and matching against
  `training_pairs.source_id`, so a copy that dropped the flag would leak holdout
  content into a fine-tune set on the new archive.
