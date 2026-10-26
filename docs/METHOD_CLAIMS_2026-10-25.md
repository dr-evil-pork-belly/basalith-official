# THE METHOD PAGE, THE SCENARIO COUNT, AND THE SCORING MODEL LINE.

October 25, 2026. Follows docs/SELF_ORDER_EXISTING_OWNER_2026-10-23.md, which
named two false lines and left them. David said fix them. Written to disk in
basalith-official, uncommitted. David runs tsc, previews, commits, promotes.

## What was false, and why

- **"20 real business scenarios."** `/archive/scenarios` has been a 308 to the
  dashboard since September 18 (cut from the sidebar September 16). An owner
  cannot answer a scenario. The 20 scenarios still exist in
  `lib/b2bScenarios.ts` and the successor portal still shows past answers, but
  nothing on the owner's side offers them.
- **"29 decision questions across 8 domains."** `B2B_TOTAL_QUESTIONS = 29` is
  a June 19 count. The product moved to area calls (one interview per domain,
  seeded on a real moment) on September 17. The number is stale and the shape
  is wrong.
- **"Not scored by the cheapest available model. Scored by the right model for
  each decision."** The scorer is one Haiku call (`lib/trainingPipeline.ts`).
- **The two tier "First Review / Second Review" grid on /method.** No second
  review of deposits exists. What does exist, and is the better story, is the
  verifier at the answer (`lib/verifyGrounding.ts`, Sonnet, every successor
  answer).
- **"The record becomes training data. The entity learns..."** and **"The
  model learns from the operator first."** Training claims, same as the ones
  removed October 23.

## Files

| File | Was | Now |
| --- | --- | --- |
| `app/method/page.tsx` step 01 | The model learns from the operator first. Recorded sessions, decision frameworks, scenario responses, written deposits. | The record starts with the operator. The Founding, then one interview for each of the eight areas of how the business runs, voice recordings, written deposits. |
| step 03 | The record becomes training data. The entity learns not just what they said but how they reason. Not their opinions. Their patterns. | The entity answers from the record and only from it. Not a list of their opinions. The patterns in how they reasoned, in their own words. |
| step 04 | ...20 real business scenarios and 29 decision questions across the 8 domains... / the more the model has to work with | ...the eight areas of how the business runs, one interview each, every one opened on a real moment rather than a hypothetical. / the more the record holds |
| quality grid, left | First Review: Volume scoring, Speed and coverage, Every deposit | At the deposit: Scored for how specific it is, how natural it sounds, and how much it shows the way the operator thinks; Every deposit; Sets the order the record is read in |
| quality grid, right | Second Review: Deep evaluation, Ambiguous cases, High stakes decisions | At the answer: Read against the operator's own words before it is returned to a successor; Every answer; Where nothing in the record backs it, a plain no |
| rule line | A deposit shapes your entity only after it has passed review | An answer reaches a successor only after it has been read against the record |
| closing | Your record is not scored by the cheapest available model. It is scored by the right model for each decision. | The score at the deposit is quick and never decides what a successor hears. The reading at the answer is the one that does, and it runs every time. |
| family bridge | The scenario library becomes the stories told at the table. | The eight areas of the business become the parts of a life. |
| `app/faq/page.tsx` (page and plain) | ...guided questions, real scenarios, voice recordings... | ...interviews on each area of your life or your work, the questions that follow, voice recordings... |
| `app/answers/founder-judgment-when-a-business-is-sold/page.tsx` | ...20 real business scenarios and 29 decision questions across 8 domains. | ...the eight areas of how the business runs, one interview each, opened on a real moment. Header comment updated. |

What each new sentence points at: area calls `lib/areaCalls.ts` and
`lib/areaSeeds.ts` (one interview per domain, seeded on a real moment); the
eight domains `lib/b2bDomains.ts`; the scorer `scoreTrainingPair`; the quality
order `lib/frozenLayer.ts`; the verifier on the successor route
`lib/verifyGrounding.ts` via `app/api/succession/entity/chat/route.ts`, which
`/succession` already describes in the same words (handoff step 03).

Left standing: the step 03 heading "Together, they make a model of how the
person thinks." "Cognitive reference model" is allowed copy and the heading
makes no training or consciousness claim.

## Gates before promote

1. `npx tsc --noEmit`.
2. Load `/method`, `/faq`, and the answers page. Read the changed lines. The
   first item in the "At the deposit" card is long; check it wraps cleanly at
   390px.

## Rollback

`git checkout --` the three files.
