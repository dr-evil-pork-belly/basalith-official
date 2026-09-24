# Tailored questions: how Basalith learns who it is asking. September 24, 2026.

Skeleton for approval. No code written. Read against the repo on disk today
(`lib/selectNextQuestion.ts`, `lib/areaCalls.ts`, `lib/incidentSession.ts`,
`lib/incidentSaturation.ts`, `lib/questionEngine.ts`, `app/api/trial/start`,
`app/api/archive/b2b-question/answer`, CLAUDE.md sections 4 to 6).

---

## 0. What the code does today

Four facts decide the design.

1. **The question text is a fixed bank.** B2C draws from `elicitation_questions`
   (104 rows), B2B from `b2b_questions` (37 rows, 29 non-seed) in `order_index`
   order. The only personal touch is one bridge sentence ("You once
   mentioned...") written from the single highest-weight deposit in the domain.
   Every HVAC owner and every dentist gets the same 29 questions in the same
   order.

2. **The selector and the coverage map still do not talk.** `selectNextQuestion`
   picks the domain with the lowest `deposit_domain_scores` density. That is the
   deposit count wearing a new shirt, the exact thing the coverage map was built
   to replace. Area calls fixed this for owner-initiated calls only.

3. **Nothing knows who the client is.** `/begin` stores name, email, for-whom, and
   one free-text prompt. The B2B apply form stores industry, company, employees,
   timeline on `archive_applications`, and nothing reads them. There is no
   profile, no list of the people, places, projects, or recurring decisions a
   client has named.

4. **The daily question gets no answers.** CLAUDE.md section 6 (verified July):
   all 224 `question_history` rows are `daily_email`; on the Dr Ha archive, 27
   served and zero answered. Deposits come from the
   incident calls, spark, journal, and capture. Inside an incident the follow-ups
   are already personal (the classifier's anchor is the founder's own words). The
   generic part is the opener.

So the real problem is narrower and sharper than "make questions personal":
**the opener is generic, the target is density, and the product has no memory
of the client's world between calls.**

---

## 1. The idea in one paragraph

Hold the *target* fixed and tailor the *situation*. Every question aims at one of
the eight domains with one position-forcing form (a real moment, a rule, the
exception, the one you would redo). That part never changes per client, so the
coverage map stays comparable across clients and over time. What changes is the
situation the question names. Early on the situation comes from their industry
or life stage. Later it comes from their own record: the job that slipped, the
partner they bought out, the move to Texas, the track they never released. The
best next question is almost always about something the client already
mentioned and never explained. We do not need a questionnaire to learn who they
are. They have been telling us every time they answer.

### A frank note on industry

Industry is the weakest axis of tailoring, not the strongest. Two HVAC owners
differ more in how they read people than an HVAC owner and a dental practice
owner do. Industry gives vocabulary and a list of decisions the business forces
on everyone in it. That is worth a lot in week one, before the record has
threads, and it is worth something forever as a map of *what they have not
mentioned yet*. But the thing that makes question forty feel written for one
person is their own record, not their NAICS code.

---

## 2. Four stages of knowing a client

Each stage adds a source. Nothing is removed. The bank is the permanent floor.

| Stage | When | Source of the situation | B2B example (hypothetical HVAC contractor) | B2C example (hypothetical retired nurse who gardens) |
|---|---|---|---|---|
| 0. Generic | Before call 1 | The bank | "Tell me about a hire you agonized over." | "Tell me about a time you had to decide whether to trust someone." |
| 1. Lens | After intake + call 1 | Industry, role, life stage, interests, confirmed by the client | "Tell me about a lead tech you almost let go in peak season." | "Tell me about a time on a ward when you went over a doctor's head." |
| 2. Record | After ~10 owner deposits | Threads: people, projects, decisions, places they named | "You mentioned the Riverside job slipped two months. Tell me about the week you decided whether to eat the overrun." | "You mentioned leaving Manila at 24. Tell me about the week you decided to go." |
| 3. Error | After the first coverage reading | Where the entity overreaches, the gap log, saturation failures, later the successor's own questions | "Your successor would be guessing on when you walk away from a GC. Tell me about the last one you walked away from." | "The record has your rule on lending to family and nothing on when you break it. Tell me about a time you broke it." |

Stage 3 is the most valuable per minute of the client's time, because it
aims at the exact place the entity is wrong. Stages 1 and 2 make stage 3 land in
their language instead of ours.

---

## 3. The three objects

### 3.1 The lens (one per client, small, confirmed)

What kind of world this person decides in. Built by the model from intake plus
the first calls, then **shown to the client and corrected by them** on one
screen. The confirmation is what turns a model's guess into something we are
allowed to put in a question.

B2B lens fields: what the business sells and to whom (their words); their role;
size band; the cycle (seasonal, project, subscription, deal); counterparties
(GCs, suppliers, payers, landlords); the **recurring decision inventory**, the
decisions this kind of business forces every year, each mapped to one of the
eight domains.

B2C lens fields: life chapters (where they lived, what they did, roughly when);
the people they name most; arenas (work, craft, faith community, a sport, a
garden, music). Arenas matter because we never ask *about* the interest. We ask
about judgment made *inside* it. "What is your favorite thing about gardening"
is small talk. "Tell me about a plant you pulled out that everyone told you to
keep" is Standards.

The recurring decision inventory is where industry earns its keep. Expected
decisions with no matching thread in the record are industry-specific gaps: "HVAC
owners decide every spring whether to carry a second crew. You have never
mentioned it." That is a question no generic bank would ask and no record-only
system would think of.

### 3.2 Threads (many per client, extracted, cited)

A thread is anything the client named that could carry a decision: a person, a
project, an event, a place, a recurring call, a chapter, an arena. Every thread
carries a **verbatim quote from a deposit** and the deposit id. Extracted by one
Haiku call per owner deposit, in the same `after()` block where `classifyDeposit`
already runs. A thread whose quote is not a literal substring of the deposit is
dropped by code, not by prompt.

Threads have a state: `open` (named, not explored), `explored` (an incident ran
on it), `exhausted` (saturation says the entity can already reconstruct it),
`muted` (the owner said do not ask). They also carry emotional weight 1 to 3 so
the existing weight-3 rules (five days apart, never back to back) apply to
threads, not just domains.

### 3.3 The queue (a few per client, pre-written, validated)

The next three questions, written ahead of time by a nightly job, each with the
domain it targets, the thread it uses, the deposits it cites, and the validator
result. Serving becomes a read. Watch mode gets a place to look: David can read
every client's next three questions before they go out.

---

## 4. How the next question is chosen

A pure, deterministic planner (same pattern as `selectNextQuestion`: pure
functions, injected deps, unit-tested). No model call in the choice. Models write
the words; code decides what to aim at.

```
target score (domain d, thread t, form f) =
    gap(d)            // archive_coverage: open 1.0, partial 0.6, backed 0.2
  + overreach(d)      // +0.5 if the last reading flagged overreach in d
  + gapLog(d)         // grounding_gaps hits in d, decayed over 30 days
  + threadValue(t)    // open 1.0, explored 0.3, exhausted 0, muted excluded
  + inventoryGap(t)   // expected recurring decision with no thread yet
  - fatigue(d, t)     // same domain yesterday, same thread in 14 days
  - weightGuard(t)    // weight-3 rules, carried over from getEligibleDomains
```

Then the same 80 / 20 split the engine already uses: 80 percent take the top
target, 20 percent take a random eligible one, so the record does not collapse
into the three threads the client talks about most. This matters. Following
threads alone builds an echo chamber. The coverage map is what forces the
domains they never bring up.

The numbers above are starting weights, reversible, tuned on data.

---

## 5. How the question is written, and why it cannot lie

One Sonnet call per queued question. Input: the target (domain, form), the
thread's quote, the confirmed lens, and the last ten questions asked (so it does
not repeat). Output: one question and the deposit ids it cites.

Then a deterministic validator, the same idea as `validateGroundedFraming`, which
already works:

- copy rules: no em dash, no exclamation point, American English, one question
  mark, at most 45 words, banned words
- **specifics check**: every proper noun, number, date, and place in the question
  must appear in a cited deposit or in the confirmed lens. This is the integrity
  rule in code. A question that says "the Riverside job" when the client wrote
  "the Riverside project" passes; one that invents "your 40 technicians" fails.
- no coverage probe text reused (same pin as `areaCalls.test.ts`), so capture
  never teaches to the test
- no muted thread, no weight-3 thread inside the guard window
- position-forcing: a real moment or a rule, never "how do you feel about"

A failure is logged with its reason and the planner's next target is tried. Two
failures and the bank question for that domain is served, with the old bridge
sentence. The client never sees a broken question and never waits on a model.

---

## 6. Hard boundaries (irreversible class, design once)

1. **The lens and threads steer questions. They are never evidence.** Nothing
   in them reaches `entitySystemPrompt`, the frozen layer, or `verifyGrounding`.
   The entity grounds in deposits only. If a derived profile ever leaked into the
   entity, it would answer from our summary of a person instead of the person,
   and the refusal would stop meaning anything.
2. **Every specific in a question traces to a deposit id or a confirmed lens
   line.** Stored on the queue row, so any question can be audited after the fact.
3. **The client can see and correct it.** A page, "What Basalith is asking from,"
   lists the lens and the threads with the quote each came from. Mute, correct,
   or delete any line. Deleting a deposit deletes its threads.
4. **Heavy threads are the client's to open.** A thread about a death, a
   divorce, or an illness is never pushed by the daily question. It can appear
   as an area-call option the client chooses. This also keeps the product off
   loss and grief framing.
5. **Owner deposits only in v1.** Contributor and successor text do not create
   threads until the governance line on third-party words is written (same
   blocker as the decision inbox).
6. **Named people and email.** A question naming a third party goes to the
   in-app surface, not the email body, until the reply-token expiry gap is
   closed. The email says "Your next question is ready."

---

## 7. Code shape

### New tables (SQL pasted by hand; `REVOKE ALL` from anon and authenticated on every one; service role only)

```sql
client_lens (
  archive_id     uuid primary key references archives(id) on delete cascade,
  segment        text not null,              -- 'b2b' | 'b2c'
  intake         jsonb not null default '{}', -- raw answers, their words
  lens           jsonb not null default '{}', -- model draft
  lens_version   int  not null default 0,
  confirmed      jsonb,                       -- what the client accepted or edited
  confirmed_at   timestamptz,
  updated_at     timestamptz not null default now()
)

record_threads (
  id             uuid primary key default gen_random_uuid(),
  archive_id     uuid not null references archives(id) on delete cascade,
  kind           text not null,   -- person|project|event|place|recurring_decision|chapter|arena
  label          text not null,   -- at most 8 words, their words
  label_norm     text not null,   -- lowercased, for dedupe
  domain_hint    text,            -- one of the eight, nullable
  weight         smallint not null default 1,
  quote          text not null,   -- verbatim span from the deposit, at most 40 words
  deposit_ids    uuid[] not null,
  status         text not null default 'open', -- open|explored|exhausted|muted
  times_asked    int  not null default 0,
  last_asked_at  timestamptz,
  created_at     timestamptz not null default now(),
  unique (archive_id, label_norm)
)

question_queue (
  id                 uuid primary key default gen_random_uuid(),
  archive_id         uuid not null references archives(id) on delete cascade,
  domain             text not null,
  form               text not null,   -- moment|rule|exception|redo|recurring|prospective
  thread_id          uuid references record_threads(id) on delete set null,
  text               text not null,
  cited_deposit_ids  uuid[] not null default '{}',
  generator          text not null,   -- 'tailored' | 'bank'
  status             text not null default 'ready', -- ready|served|rejected|expired
  validation         jsonb,
  created_at         timestamptz not null default now(),
  served_history_id  bigint
)
```

`question_history` gains `thread_id`, `queue_id`, `generator`. **Before adding a
new `source` value, read the CHECK on `question_history.source`**: the insert
only `console.warn`s on failure, so a rejected value would fail silently and the
A/B would measure nothing.

### New files

- `lib/threadExtract.ts`: Haiku, one call per owner deposit, returns threads with
  quotes; code drops any quote that is not a substring; upsert on `label_norm`.
  Called in the existing `after()` next to `classifyDeposit` in
  `b2b-question/answer` and the other deposit routes. Backfill script for
  existing archives.
- `lib/clientLens.ts`: Sonnet, builds the lens draft from intake plus top
  threads. Runs on `lens.rebuild.requested`: at founding call 1 close, founding
  complete, then every 15 new owner deposits. Never per question.
- `lib/questionPlanner.ts`: pure scoring from section 4. Reads `archive_coverage`
  (latest probe set for the segment), `grounding_gaps`, `record_threads`,
  `question_history`. Unit tests in the style of `selectNextQuestion.test.ts`.
- `lib/questionWriter.ts`: the Sonnet writer plus `validateTailoredQuestion`
  (section 5), exported separately so the validator is tested without a model.
- `lib/inngest/questionFunctions.ts`: `questions.refill`, nightly, gated to
  `status = 'active'` through `lib/cronGates` like every other cron. Keeps three
  `ready` rows per archive. Trials get one refill after call 1, not nightly.

### Changed files

- `lib/selectNextQuestion.ts`: after P0 repair, if the archive has tailoring on
  and a `ready` queue row exists, serve it. Otherwise the existing bank path runs
  unchanged. The bank is the floor.
- `lib/areaCalls.ts`: `seedForArea` asks the planner for the best open thread in
  that area and the writer for a tailored seed. No thread or a validator failure
  returns today's static seed. The rest of the incident engine is untouched.
- The B2C founding page after call 1 and the proof card, and the succession scoping
  flow: three optional fields each (section 8).
- New owner page for the lens and threads (section 6.3), on stone.

---

## 8. Intake: three questions, skippable, in their words

Never ask what we can extract. Ask only what makes week one not generic.

**B2B** (asked at the scoping call)
1. What does the business sell, and to whom? (one line)
2. What is your role day to day? (one line)
3. **Name three decisions that come back every year or every season.** (three lines)

Question 3 is the single highest-leverage thing we can ask a founder. It seeds
the recurring decision inventory with their own words, and each answer is a
thread on day one.

**B2C** (asked after founding call 1 and the proof card, never on /begin)
1. What have you spent the most years doing? (work, raising kids, a craft, anything)
2. Where have you lived? (a list is fine)
3. What do you do when no one needs anything from you?

The first founding call does the rest. After call 3, the client sees the lens
("Here is what your questions will draw from") and corrects it. That screen is
also a quiet proof moment: it shows they are being listened to, with the source
of every line visible.

---

## 9. Build order

Irreversible pieces first and verified live; reversible pieces narrow.

0. **Recon, no code.** (a) Is the question-to-deposit link still broken, or does
   the `questionHistoryId` on the reply session now land? The code comment and
   CLAUDE.md section 6 disagree. Without the link there is no answer-rate
   measurement at all. (b) The CHECK on `question_history.source`. (c) Where the
   daily question should be served. Decided: a dashboard card plus an email
   pointer (section 12).
1. **Threads, write-only.** Tables, extractor, backfill on the Dr Ha archive.
   Nothing is served. David reads every thread against his own deposits. If the
   threads are wrong or dull, stop here; nothing downstream can be better than
   them.
2. **Planner on the coverage map.** Swap density for `archive_coverage` in the
   bank path. Useful on its own, even with no tailoring.
3. **Writer, validator, queue**, behind a per-archive flag, on Dr Ha and on
   MOAFly Technologies Corporation as the business test Basalith. Watch mode: read
   every queued question for two weeks.
4. **Lens and intake**, plus the owner page.
5. **Tailored area-call seeds.**
6. Later, same queue, new feeders: successor questions (C2), then open loop (C1).

## 10. How we will know it works

Pre-declared, so the result is not chosen after the fact:

- **Answer rate**, tailored against bank, within the same archive on alternating
  serves. The only honest test while archives are few.
- **Coverage movement per answered question**: did the targeted domain move on
  the next reading.
- **Skip and "not quite right" rate** on tailored questions.
- **Validator reject rate** by reason. Above 30 percent means the writer prompt
  is wrong, not the validator.

Not a metric: "felt personal." It is the goal, and it cannot be measured by
asking the client if they liked it.

## 11. Cost (estimate, not measured)

One Haiku call per owner deposit, one Sonnet call per queued question, one Sonnet
lens rebuild every 15 deposits, plus retries on validator failures. At daily
cadence that is tens of model calls per archive per month, mostly Haiku, and
fewer than one coverage run (96 calls). Confirm against the Anthropic console after slice 3.

## 12. Decisions (David, September 24, 2026)

1. **Approved.** Target fixed, situation tailored, the bank is the floor.
2. **Approved, permanent.** The lens and threads steer questions and never reach
   `entitySystemPrompt`, the frozen layer, or `verifyGrounding`. The entity
   grounds in deposits only.
3. **Approved with two changes.** B2C intake moves off `/begin` and is asked
   after founding call 1 and the proof card. B2B question 3 reads "Name three
   decisions that come back every year or every season." B2B intake stays at the
   scoping call. All fields optional.
4. **Dashboard card plus email pointer.** The email body says only "Your next
   question is ready." An answer on the card offers "Keep going," which opens a
   short incident. The card is new build; nothing serves questions on the
   dashboard today.
5. **MOAFly Technologies Corporation** is the B2B test Basalith for slice 3, run
   as a genuine succession Basalith (David wholly owns it, so there is no
   third-party consent question).

Build started the same day at step 0 and slice 1.
