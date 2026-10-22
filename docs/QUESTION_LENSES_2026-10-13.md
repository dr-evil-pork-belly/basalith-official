# QUESTION LENSES. BUILD RECORD.

October 13, 2026. Written to disk in basalith-official, uncommitted. Nothing
is deployed. Follows the skeleton (claude/BASALITH_QUESTION_LENSES_2026-10-13.md
in the project), which David approved the same day: decisions 1 to 3 as
recommended, copy approved, "build it."

Decided:

1. The follow up fix goes first and applies to every client.
2. A church record is marked by one nullable column, `archives.audience`.
3. A church record rides the personal eight and the personal probe set for now.

## What a person now gets

One call, run through the real reducer and renderer with invented answers
(no model, no database). The lines starting with a probe name are what the
person is asked.

```
[personal] SEED: Tell me about a time someone close to you crossed a line you hold.
   > My site manager Marcus was skimming on a job in Riverside. I found out in March and let him go in April.
TIMELINE: Walk me through what happened, in order. Do not explain the reasons yet, just the sequence.
   > First the invoices came in late. Then a supplier called me directly. I pulled the books that weekend and then I fired him.
CUE: You said "a supplier called me directly." What was the first sign, before that, that something was off?
   > It just felt wrong.
CUE (second ask): Take me to the day. What did you see or hear first?
   > The supplier said he had been paid in cash twice. Nobody pays cash on my jobs.
OPTION: You mentioned "he had been paid in cash twice." Once you saw that, what did you seriously consider doing? Include what you decided against.
   > I thought about calling him in that night, or going to the police. I decided to check the books first.
BASIS: You said "I decided to check the books first." Why that one over the next best option?
   > Nine years of loyalty, but I needed certainty before I said a word.
GOAL: You said "I needed certainty before I said a word." Set the decision aside. What were you actually trying to protect?
   > My name with the general contractors.
BOUNDARY: You mentioned "My name with the general contractors." What would have had to be different for you to go the other way?
   > If it had been one payment I would have just asked him.
ERROR: You said "If it had been one payment I would have just asked him." What is the trap here that is not obvious?
   > They confront him before they have the paper.
CUE: What was the first sign that something was off?
   > When I saw the second ledger.
OPTION: You mentioned "When I saw the second ledger." Once you saw that, what did you seriously consider doing? Include what you decided against.
   > Moving him to the yard, or firing him.
STAKE: In that moment, what were you most trying to protect?
   > The crew. They watch what I tolerate.
READ: What was your read on Marcus while this was happening?
   > Marcus was scared, not sorry.
CALIBRATION: How sure were you when you decided? What would have made you surer?
   > Completely sure by Sunday night.
BOUNDARY: When would you tell someone you love to do the opposite?
   > If he had come to me first.
ERROR: You said "If he had come to me first." Someone you love faces this same choice years from now. Where do they go wrong?
   > They wait a quarter to be nice.
TRADEOFF: Suppose you could not protect both. Loyalty or certainty, which goes, and why?
   > Loyalty went.
TRADEOFF: What did this decision cost you? Would you pay it again?
   > A month of margin.
   (complete)
```

Against the same call before today: every question after the opener was a
fixed sentence, "It just felt wrong" was answered with the same question
again, and the last question read "Someone capable but new inherits this
exact situation."

## Slice 1. Follow ups, every lens

`lib/renderProbe.ts`. Still deterministic. No model writes a question.

- **The quote is guarded.** A fragment is quoted only if it is a literal span
  of the answer it came from: whole words, three to fourteen of them, in the
  person's own casing, inside quotation marks (`verbatimSpan`). A paraphrase
  gets the plain question. Before, "You said X" was unchecked and the
  question text is stored as the deposit prompt.
- **The quote is used** on seven probe types (CUE, OPTION, BASIS, BOUNDARY,
  ERROR, ANALOGUE, GOAL). Before, one.
- **A second ask is a different question.** Five new sentences, one per spine
  position. It never quotes the thin answer back.
- **The tradeoff does not lead.** Two goods are named only when both are the
  person's own words in that call. Otherwise one of three plain questions, by
  position, so the battery never asks the same one twice.
- **A name is the person's.** The people probe names someone only if the
  person used that name. FOUND WHILE TESTING: the old code took any
  capitalized word in the timeline summary for a name, so a summary reading
  "Let Marcus go" could render "your read on Marcus and Let."
- CALIBRATION gained a second sentence: "What would have made you surer?"

## Slice 2. Four lenses

`lib/questionLens.ts`: `lensFor` reads tier, status, and audience and returns
`personal`, `succession`, `acquisition`, or `church`. The lens is stamped on
the call when it opens (`incident_sessions.state.lens`, no schema change) and
the answer route reads it from there.

| What | personal | succession | acquisition | church |
|---|---|---|---|---|
| Founding openers | unchanged | unchanged | none (no founding calls) | 3 new |
| Area openers | unchanged | unchanged | 8 new | 8 new |
| "Where do they get it wrong" | someone you love | the person who takes over | a new owner, first ninety days | the next person in your seat |
| The rule question | when to do the opposite | when to break it | where it is written down | where practice departs from what is written |
| The people probe | names | names | names | never names |
| Line above each question | none | none | none | the confidence line |

Openers are in `lib/areaSeeds.ts` (`LENS_AREA_SEEDS`) and
`lib/foundingSequence.ts` (`CHURCH_FOUNDING_SEEDS`), word for word as in the
skeleton.

**The church door.** The three links on /churches now go to
`/begin?from=churches`. That adds one question to the form: "Your role," with
"I lead a church, as a pastor or an elder" (the default) or "I am here for
myself or my family." Only the first sets `audience = 'church'`. Nothing on
/churches itself changed, and it still says nothing about questions written
for churches.

## Where the build departs from the skeleton

1. **The quote went on different probes.** The skeleton listed STAKE and
   CALIBRATION. Each follows an answer about something else, so a quote there
   would be off the point. It is on ERROR, ANALOGUE, and GOAL instead.
2. **Two lead ins**, "You said" and "You mentioned," so five quoted questions
   in a row do not read as a form.
3. **Two new plain tradeoff questions**: "What did this decision cost you?
   Would you pay it again?" and "What did you give up to do it this way?"
4. **The "Your role" question on /begin.** New copy, not in the skeleton.
   Without it, anyone who came through /churches, a congregant included,
   would be asked about leading a church. It also sits on /begin, where the
   September 24 decision put no intake; it is needed before call 1 because
   call 1's opener depends on it.
5. **The confidence line shows on every turn** of a church call, not only
   above the opener. A name can come up on any answer.
6. **The owner demo** (`/archive/demo/incident`) asks what a succession client
   is asked, so it does not show the old follow ups.

## Files

New:
- `lib/questionLens.ts`, `lib/questionLensStore.ts`
- `lib/questionLens.test.ts`, `lib/renderProbe.test.ts`
- `supabase/migrations/20261013_archives_audience.sql`
- `docs/QUESTION_LENSES_2026-10-13.md` (this file)

Changed:
- `lib/renderProbe.ts`, `lib/incidentSession.ts` (the `lens` field on the
  state; `deriveReadAnchor` takes what was said), `lib/areaSeeds.ts`,
  `lib/areaCalls.ts`, `lib/foundingSequence.ts`, `lib/demoIncidentBuffer.ts`
- `app/api/archive/b2b-question/answer/route.ts`, `.../b2b-question/next/route.ts`,
  `app/api/archive/founding/start/route.ts`, `app/api/archive/area-call/start/route.ts`,
  `app/api/trial/start/route.ts`
- `app/begin/page.tsx`, `app/begin/BeginClient.tsx`, `app/churches/page.tsx`
  (three hrefs), `app/archive/founding/FoundingClient.tsx`
- `CLAUDE.md` section 4, two paragraphs

Not touched: `lib/entitySystemPrompt.ts`, `lib/verifyGrounding.ts`, the
frozen layer, the classifier prompts, the reducer's transitions, the coverage
probe sets, the round of six. So the three grounding probes are not gated by
this change.

## The migration and the deploy, in either order

`supabase/migrations/20261013_archives_audience.sql`: one nullable text
column, no CHECK, no grant change. Paste it by hand; the confirm query is in
the file.

The code is safe before the paste. `audience` is read in one place
(`lib/questionLensStore.ts`) where a failed read answers null, and the trial
route names the column only on a church signup and retries without it. Until
the paste, a church signup gets the personal questions and the internal
"Trial started" notice says so in capitals. `lib/questionLens.test.ts` fails
the suite if a route puts `audience` in its own archives select.

## Gate, David's to run

1. `npx tsc --noEmit`. Expect nothing new (the five known
   `lib/frozenLayer.test.ts` errors aside).
2. `npm test`. Two new files, 50 tests.
3. Paste the migration, run its confirm query.
4. After deploy, one area call on your own record. Give one thin answer on
   purpose and read the second ask. Then open /churches, take the door, and
   read call 1's opener on a throwaway address.

## What was and was not checked here

Checked in a copy of the changed files, outside the repo: `tsc` on the
nineteen changed or new TypeScript files, clean except four imports of files
that were not in the copy; and every test file that was in the copy: 174
tests passed, the 50 new ones included. Twelve more, in three existing files,
could not run there because they read source files that were not copied.

NOT CHECKED: the full suite in the repo; the build; anything in a browser;
the form and the confidence line on a phone; a real call with the live
classifier. How often the live classifier returns a fragment that is a
literal span is NOT MEASURED: when it does not, the person gets the plain
question, which is today's behavior.

## Open

- **An assessment in progress changes openers mid way.** Area calls already
  done keep counting; the remaining ones open with the acquisition openers.
  If a founder is part way through a test, finish it or deploy first.
- **The second decision point.** When a call moves to the next decision in
  the same story, the first question is "What was the first sign that
  something was off?" and nothing tells the person which decision it means.
  The quote is now withheld there (it used to quote an answer about the
  previous decision), so it is plainer, not better. Naming the decision means
  showing model written text to the person, which is a design call.
- **A pastor who already signed up** through the main door is on the personal
  lens. The one line UPDATE is at the bottom of the migration file.
- **Church coverage is read with personal probes** (decision 3).
- **Language.** Every question above is English only.
