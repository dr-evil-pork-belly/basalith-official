# KEY PERSON DEPENDENCY REPORT. ARE THE QUESTIONS RIGHT?

October 8, 2026. David ran one live assessment call (Decision-Making) and
said the questions felt generic and the follow ups did not dig. This is a
read of the code that produces them. No transcript was read: the test record
was cleaned up. Files: lib/areaSeeds.ts, lib/renderProbe.ts,
lib/incidentSession.ts, lib/incidentClassifier.ts, lib/coverageProbes.ts.

Short answer: he is right, and the cause is structural, not a wording problem.

## 1. What a call actually asks

One opener, then a fixed script.

- **The opener** is the only domain specific sentence in the call. One per
  domain, in lib/areaSeeds.ts. Capital: "Tell me about a time cash was tight
  and you had to choose what got funded and what did not."
- **Everything after it is the same in all eight calls.** The follow ups are
  fixed strings in lib/renderProbe.ts, chosen by a fixed order
  (CUE, OPTION, BASIS, BOUNDARY, ERROR, then the dimension and tradeoff
  probes). Word for word, in every domain:
  - "Walk me through what happened, in order."
  - "Once you saw that, what did you seriously consider doing?"
  - "What finally tipped it?"
  - "What would have had to be different for you to go the other way?"
  - "What is the trap here that is not obvious?"
  - "How sure were you when you decided?"
- **Only two of the thirteen follow up types use anything the founder said.**
  CUE quotes a fragment back, and READ names the people from the timeline.
  The classifier returns a quotable fragment on every turn; eleven probe types
  throw it away.

So a founder doing eight calls answers eight openers and then the same dozen
questions eight times. By call three it reads as a form. That is the
"generic" he felt.

## 2. Why the digs do not dig

A good interviewer's second question could not have been written before the
first answer. These were all written before any answer. The engine decides
WHICH kind of question comes next from the answer (it can re-ask once, and it
can detour), but the WORDS are fixed. "What finally tipped it?" is a fine
question after a rich answer and an empty one after a thin answer, and the
engine cannot tell the difference in its wording.

This was a deliberate design: a deterministic spine, with the model only
classifying. It keeps the interview honest (the model cannot lead the
witness) and testable. The cost is the one David felt.

## 3. The bigger problem for the report: the calls and the test do not match

This matters more than tone, because it decides what the report says.

The report counts how many of six fixed questions per domain the entity can
answer from the record. Those six cover six different subjects. Capital:

1. Where the next spare dollar goes
2. What you will borrow for
3. When you hold cash
4. The last thing you funded over something else
5. What you do with a profitable part that is not growing
6. What you would give up ownership for

The Capital call asks about ONE incident: a time cash was tight. A full,
honest answer to that grounds question 4, perhaps 1 and 3. It says nothing
about borrowing, a flat business line, or ownership, because nobody asked.

So a founder who does everything asked of them will most likely read about
1 to 3 of 6 in every domain, for every founder. The report would then be
measuring the width of the interview, not the founder. Two different
businesses would get near identical reports. NOT MEASURED: no real run exists.
It is a prediction from the code, and the two fixture personas (15 and 17
deposits, written by hand to spread across subjects) are not evidence either
way for a record built from eight incident calls.

This is the same concern as the "thin record" defect in the skeleton, one
level down: eight calls fixed the count of calls, not their reach.

## 4. And nothing asks about dependency

The report is about how much runs through one person. The only place that is
asked is the eight radio buttons. No call asks: who else could have made this
call, what happened the last time you were away, where is this written down,
who did you teach it to. Those are the questions a buyer is paying for, and
they would be answered in the founder's own words, on the record.

## 5. What I would change, in order

A. **Widen each call to the domain** (largest effect on the report). After the
   incident, a short rules round: four or five direct questions, one per
   subject the incident did not reach. Asked as "what do you do when," in the
   founder's words. They aim at the same judgment the test measures without
   repeating a test question, which is the rule lib/areaCalls.ts already sets
   for openers.

B. **Add the dependency questions to every call.** Two per domain: "Who else
   here could make that call today?" and "What do they still come to you for?"
   This gives the report evidence in the founder's words where today it has a
   radio button.

C. **Make the follow ups use what was said.** Cheap version, still
   deterministic: thread the fragment the classifier already returns, and the
   option the founder chose, into BASIS, BOUNDARY, ERROR, and OPTION. "You went
   with X. What finally tipped it?" No model writes a question.

D. **Vary the script by domain.** A second opener per domain and domain
   specific wording for ERROR and BOUNDARY, so call five does not read like
   call two.

A and B are assessment only and touch no client. C and D change the interview
every client uses, so they need the same day A/B discipline as any prompt
change and their own slice.

## 6. What this means for the build order

The report page (slice 4a) is worth having either way. But I would not build
release, the buyer's view, or payment on top of the calls as they are. The
honest next step is A and B, then ONE real end to end run on a real record,
then look at the report before anything is sold. If that report reads the
same in every domain, no amount of page design fixes it.
