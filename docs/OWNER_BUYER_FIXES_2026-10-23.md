# THE OWNER BUYER, FIXES. SELF ORDERS, THE CONTACT ROW, TRAINING CLAIMS, ONE PRICE.

October 23, 2026, afternoon. Follows docs/OWNER_BUYER_2026-10-23.md. Written
to disk in basalith-official, uncommitted. David runs tsc, the tests, previews,
commits, and promotes.

David asked for every item in the morning's "fix before you send owners" list
fixed, and set the dependency report at $5,000 for everyone.

## 1. A report the owner orders for himself

There is no column that says who ordered a report. A self order is set up by
hand with the owner as the named buyer, so `buyer_email = founder_email`. Both
columns are lowercase by CHECK, so the compare is exact. No migration.

| File | Change |
| --- | --- |
| `lib/assessment.ts` | New `isSelfOrdered(row)`. |
| `lib/assessment.test.ts` | Two tests for it. |
| `lib/assessmentStore.ts` | `AssessmentRow` and `ROW_COLS` carry `buyer_email` and `founder_email`. |
| `app/api/archive/assessment/route.ts` | Returns `selfOrdered`. |
| `app/api/archive/assessment/report/route.ts` | Selects both emails, returns `selfOrdered`. |
| `app/archive/assessment/AssessmentClient.tsx` | Self order: "You ordered this report for yourself." in place of "Requested by <buyer>." |
| `app/archive/assessment/report/ReportClient.tsx` | Self order: "Only you can see this. You ordered it for yourself." |
| `app/archive/assessment/report/ReportView.tsx` | Self order: "Ordered by <owner>, the subject of this report." in place of "Prepared for <buyer>." This is the October 9 "ordered by the subject" label. |
| `app/assessment/begin/AssessmentBeginClient.tsx` | The invitation line now fits both kinds of order: "A report on how this business runs through you. This is where you give your side of it, by voice or typed, on your own time. You read the report before anyone else does." |

The invitation page still shows nothing about the row, by design. The neutral
line is why it can stay that way.

### Setting up a self order (paste by hand)

    insert into dependency_reports
      (buyer_name, buyer_email, founder_name, founder_email, amount_cents)
    values
      ('<Owner Name>', '<owner@email>', '<Owner Name>', '<owner@email>', 500000)
    returning id;

Send the owner `https://basalith.ai/assessment/begin?order=<id>`.

**One block on this.** `/api/assessment/start` still refuses an email that
already owns a Basalith (the October 8 rule). On October 9 you decided an owner
who has a Basalith can order his own report, but that was never built. Until it
is, a client of yours cannot run a self order on the same email, and neither
can you on mrdavidha@gmail.com.

## 2. The contact row

`app/api/contact/route.ts` now tries to store a report request with intent
`report`. If Postgres refuses the value (23514 check violation, or 22P02 if the
column turns out to be an enum), it stores the row as `general` with
`[Dependency report request]` at the front of the message. Whichever happens,
you get an internal email with the whole request and the way it was stored. If
both inserts fail, the email subject starts with UNSAVED and carries the
person's details, so the lead still reaches you. No SQL to run first.

## 3. The questions

Not fixed in code, on purpose. The fix is the conversational interview, and
your own rollout order for it stands: the question side probe passes, your own
records run on it, and only then an outside founder. Assessment calls are area
calls, so they qualify once a record is named.

For the first owners, in order:

1. Run `npx tsx scripts/question-side-probe.ts` with `QUESTION_SIDE_RULE=on`.
   Pass means LEAD and MOTIVE blocked, STATED kept (thresholds in the slice 1
   doc).
2. When an owner starts, his record id appears on the report row
   (`select archive_id from dependency_reports where id = '<id>'`). Add it to
   `CONVERSATIONAL_INTERVIEW` in Vercel production and redeploy.
3. Read the interview log after each of his calls (queries in
   docs/CONVERSATIONAL_INTERVIEW_SLICE_1_2026-10-22.md).

Two limits: the within person A/B still puts every other area call on the
fixed follow up unless you set `CONVERSATIONAL_INTERVIEW_ARM=interviewer`, and
the round of six after each call is fixed questions either way. If redeploying
per owner gets old, the next slice is a flag value that arms every assessment
record.

## 4. "Trained" claims, sitewide

Nothing is trained per client. Every rendered sentence saying otherwise is
rewritten to what the code does.

| File | Was | Now |
| --- | --- | --- |
| `app/succession/page.tsx` | Every model is trained only on one operator's deposits. No general model speaks for the record. | Every answer is drawn from one owner's own deposits and checked against them before it is returned. Where the record is silent, it says so. |
| `app/answers/founder-judgment-when-a-business-is-sold/page.tsx` | same as /succession | Every answer is drawn from one owner's own deposits and checked against them before it is returned. (rest of the paragraph kept) |
| `app/faq/page.tsx` | Every model is trained only on that one person's deposits. No general AI speaks for the record. / The entity is the model trained on it. | Every answer is drawn only from that one person's deposits. / The entity is what answers from it. |
| `app/what-is-basalith/page.tsx` | same two lines as /faq | same two fixes |
| `app/families/page.tsx` | Every model is trained only on one person's deposits. No general AI speaks for the record. / ...and every answer trains the model. | Every answer is drawn only from one person's deposits. / ...and every answer goes onto the record. |
| `app/components/PricingFAQ.tsx` | a cognitive reference model trained only on your record | a cognitive reference model built only from your record |
| `app/about/page.tsx` | Where each Basalith is built, entities are trained, and... | Where each Basalith is built, where its entity answers, and where... |

The "checked against them" sentence is only used on the business pages, where
the verifier runs on the successor route. The personal pages say "drawn only
from," which the entity prompt and the per record retrieval support.

The FAQ structured data reads the same entries, so it changes with the page.

Left alone: "never used to train another company's model" (a promise about
your data, true as stated), the Anthropic lines on /privacy and /security, and
"language model fine tuning" on /about (a research field in your background).

## 5. The contact address

`/contact` and the error line on `/apply` now say hello@basalith.ai.

## 6. One price

$5,000 for the dependency report, whoever orders it. Supersedes the October 9
owner price of $1,500. `/dependency-report` now states it in the copy and the
meta description. Nothing charges it: every order is set up by hand with
`amount_cents = 500000`, as above. Pricing note updated in the project.

## Found and not changed

- **`/terms`** gives legacy@basalith.xyz twice, once as the address for
  cancellation notice. That is a legal term, so it is your call (and counsel's)
  whether it moves to hello@basalith.ai. Confirm legacy@ still receives mail
  either way, since it is also the `ADMIN_EMAIL` fallback.
- **`/families`** also says "Every response is scored before it can shape the
  model. Lower confidence responses get a closer pass." Not checked here. Worth
  the same read.
- **`/answers/founder-judgment...`** still lists "every response is scored"
  among its claims. Same.
- **`app/components/WhatBasalithIsNot.tsx`** says "trained exclusively" and
  "your archive." Nothing imports it. Left as is.
- **The credit toward Succession.** The pricing note suggested crediting the
  $5,000 against the Succession Founding fee. You set the price, not the credit,
  so nothing on the site promises one.
- **`/pricing`** does not list the report. Add it once you have run one at
  $5,000.

## Tests run here

`lib/assessment.test.ts` in isolation: 20 passed, including the two new ones.
Every changed file parses under esbuild. NOT run: tsc, the full suite (in
particular `lib/assessmentGates.test.ts`, which reads the assessment pages and
routes from the repo), `next build`.

## Gates before promote

1. `npx tsc --noEmit`. Expect only the five known `lib/frozenLayer.test.ts`
   errors.
2. `npx vitest run lib/assessment.test.ts lib/assessmentGates.test.ts app/api/assessment/start/route.test.ts`
3. `npm test`
4. Preview `/contact?intent=report`, send one request, confirm the email and
   the row. Send one ordinary request.
5. Load `/succession`, `/faq`, `/what-is-basalith`, `/families`, `/pricing`
   (the FAQ), `/about`, `/dependency-report`. Read the changed lines.
6. Make one self order on a test email with the SQL above, open the link,
   confirm the neutral line. After a test report exists, confirm "Ordered by
   <name>, the subject of this report."

## Rollback

`git checkout --` the changed files. No migration.
