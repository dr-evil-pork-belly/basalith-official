# The B2C annual claims, and the annual email that does exist

Heritage Nexus Inc. September 22, 2026. Addendum to
`docs/SUCCESSION_CLAIMS_CUT_2026-09-22.md`. Written to disk, uncommitted.

## Files written

- `app/components/PricingTiers.tsx` — two bullets replaced. Parses under
  esbuild.
- `docs/B2C_ANNUAL_CLAIMS_2026-09-22.md` — this file.

Also updated in the other repo: `basalith-xyz/app/page.tsx`, Section 05
limitations. The paper said "a monthly letter" and understated the gap. See
below.

## The two bullets

| tier | was | now | why |
|---|---|---|---|
| Active | `Annual accuracy report` | `A map of where your record is thin, measured by asking` | No annual accuracy report exists. `monthly-accuracy` runs on the 1st of each month and computes the deposit-count readiness figure that came off the dashboard on September 15. The personal coverage map is real, is already in the product, and is the honest version of what that bullet was promising |
| Legacy | `Annual entity report to family` | `A second copy offsite under a ninety-day lock nobody can shorten` | No cron produces an annual report to family. The B2 lock is real and is the thing a family on the Legacy tier actually wants to hear |

`Quarterly entity letter` on Active is real: `entity-letter` runs
`0 9 1 1,4,7,10 *`. Left alone.

## What the cron sweep turned up

`app/api/cron/annual-preview/route.ts` exists, is scheduled, and sends. It is
not an accuracy report.

It generates an imagined conversation between the owner and a future
grandchild, emails it on the anniversary of the Basalith's founding, from the
Basalith's own name as sender, with the subject
`Year N · A preview from the future`.

The gating is correct and I want to say so plainly, because the schedule looks
alarming and is not: `"0 9 * * *"` fires daily, and the route then requires the
founding month and day to match today, requires the Basalith to be at least a
year old, and carries a `last_annual_preview_year` idempotency check. One send
per owner per year.

The generation is the problem.

- System prompt: `You are ${ownerName}. You think, speak, and reason exactly as
  ${ownerName} does... You never break character. You never say you are an AI.`
- Instruction: `Make it feel real and moving.`
- Model: `claude-sonnet-4-6`, 400 tokens. **No verifier.**
- Context: `select('prompt')` from `training_pairs`, top 8 by quality score,
  each truncated to 80 characters.

That last line is the one to sit with. It passes the *questions the owner was
asked*, cut to 80 characters. Not their answers. The completion column is never
read. So the model is asked to write a moving first-person exchange in a real
person's voice, from eight question stubs, with nothing checking the result, and
to send it to that person over their own name.

This is the failure mode in Section 05 of the white paper, running on a
schedule, as a feature. It is also close to the mechanism G7 is preregistered to
study: an instruction to sound a certain way, followed by fabricated content
underneath it.

I did not change it. A cron is a build decision, not copy, and there is a real
argument on the other side, which is that the email is framed as an imagined
future rather than as the entity answering a question. That framing is worth
something. It is not worth eight truncated prompts and no check.

**Three options, in the order I would take them.**

1. Feed it completions instead of prompts and put the output through
   `verifyGrounding`. On `unsupported`, send nothing rather than send the gap
   reply, because a refusal is the wrong shape for an anniversary email. Small
   change, and it makes the send defensible.
2. Retire it, and move the anniversary slot to the annual report below.
3. Leave it and label it unmistakably inside the email as an imagined scene, not
   a retrieval. Weakest of the three, because the sender is the Basalith's own
   name and nobody reads the disclaimer under the part that made them cry.

## On whether an annual deliverable is worth keeping

Yes, and you now have material for one that did not exist when that bullet was
written.

At conception the only annual artifact anyone could think of was a score, which
is why the bullet said accuracy. A score was the wrong idea then and the
measurement work has since replaced it with two things that are real:

- **The coverage map.** Eight areas, six probes each, measured by asking the
  entity and recording what the verifier said. It states its denominator. It is
  the honest answer to "is this working."
- **The gap log.** Since July 19, every question the entity could not ground.
  What somebody wanted to know that you never settled.

An annual note built on those two writes itself, and it is the opposite of a
vanity number: *this year your Basalith could answer from the record in five of
eight areas, up from three. Here are the eleven questions it could not answer.
Three of them came up more than once.* That is worth opening. It gives the owner
something to do, which is the whole problem with an engagement product, and the
thing it asks them to do is deposit.

It is not built, so it does not go on the page until it is. That is the same
rule that took the other two bullets off today.

## Verification run here

- esbuild parse of `PricingTiers.tsx` and of the xyz `page.tsx`. Clean.
- `Annual accuracy report` and `Annual entity report to family`: zero matches
  remaining.
- No em dashes introduced in either file.

Not verified here: tsc, the build, or whether the new Active bullet wraps
badly on a narrow tier card. It is the longest bullet in that list.

## Correction carried into the white paper

Section 05 said "A monthly letter sent to owners is generated by a third prompt
and is also unchecked." Two errors. The entity letter is quarterly, not monthly.
And there is more than one: the quarterly letter and the annual preview are both
generated outside the checked path. The paragraph now names both and describes
the annual preview specifically, including that it is built from questions
rather than answers. Understating a gap in a paper whose argument is that it
finds its own gaps was not a sentence worth keeping.
