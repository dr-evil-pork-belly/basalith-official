# LAUNCH REVENUE. THE PERSONAL DOOR, THE TIER LINE, THE CONTRIBUTOR LOOP.

October 6, 2026. Written to disk, uncommitted. David type checks, previews,
commits, and promotes.

Triggered by David's question: B2B is the long run, but it is slow to close, so
should launch lean harder on the personal path for early revenue. The answer
was yes, aimed at the owner and the professional buying for themselves, with
five changes. This is the record of all five.

---

## 0. THE FINDING THAT OUTRANKS THE FIVE CHANGES

**A stranger still cannot pay.**

There is no owner checkout route. `app/api/stripe/` holds the webhook and
nothing else. `app/api/admin/checkout` is God authed and makes a link by hand.
A trialist who finishes call 1 and sees the proof card reads "Found your
Basalith to keep going." and has no button under it. Slice C from September 17
is not built.

Two more facts sit under that one.

1. `provisionOnFoundingFee` creates a new row in `archives` from the
   application. It does not link the trial row the person has already been
   depositing into. A trialist who pays through an admin link today gets a
   second, empty Basalith.
2. Live Stripe was gated on corporate formation. This pass did not check
   whether that has cleared.

Everything below makes the personal door wider. None of it earns a dollar
until the door has a till. Slice C is the next build, ahead of anything else
in the launch queue, and it touches billing and identity, so it gets a
skeleton and a recon before code.

---

## 1. FILES WRITTEN

| File | What changed |
| --- | --- |
| `app/page.tsx` | Homepage order is now Hero, Doors, Succession, Contrast demo, Personal, Closing. Meta description names both doors. |
| `app/components/home/HomeDoors.tsx` | New. Two cards side by side under the hero: a business changing hands, and one person. Carries `id="audience"`. |
| `app/components/home/HomePersonal.tsx` | New. The ink block near the bottom, reframed for the owner and the professional, pointing at `/begin`. |
| `app/components/home/HomeHero.tsx` | The single CTA is removed. It lives in HomeDoors now. |
| `app/components/home/HomeClosing.tsx` | Default and family CTAs pointed at `/apply`, which has been business only since September 22. Both now go to `/begin`. |
| `app/pricing/page.tsx` | Hero sub, the personal section header, and a new "Personal or Succession" section with `id="which"`. |
| `app/components/PricingTiers.tsx` | Active CTA pointed at `/apply`. Now `/begin`, label "Begin with one call". Note line rewritten. |
| `app/components/PricingFAQ.tsx` | New question: "I own a business. Personal or Succession?" |
| `app/contribute/[token]/ContributeClient.tsx` | New `BeginYourOwnSection`, shown in English after a first contribution. |
| `lib/referral.ts` | New. Resolves a contributor id to a live contributor on an active Basalith. |
| `app/begin/page.tsx` | Reads `?ref=`, resolves it on the server, passes the result down. |
| `app/begin/BeginClient.tsx` | Sends the ref with the trial start. Shows one waiver line when the ref resolved. |
| `app/api/trial/start/route.ts` | Records the referral in `archive_applications.reason` and in the internal notice. |
| `app/api/admin/checkout/route.ts` | New `waiveFounding` flag. Leaves the founding line off the session and writes `founding_waived: referral` into the metadata. |

`HomeSecondDoor.tsx` is left in place and is no longer imported.

No schema change. No migration. Nothing touches `lib/entitySystemPrompt.ts`,
`lib/verifyGrounding.ts`, or any model facing prompt, so no probe gate applies.

---

## 2. THE COPY, IN FULL

So you can approve the words and not read a diff.

### Homepage, the two doors (under the hero)

**A business changing hands**
For an acquisition or a succession.
How the operator decides, captured before the handoff, for the people who take
over. It starts with a conversation.
[See how it transfers] to `/succession`

**One person**
For your own judgment.
For anyone whose work is the calls they make, in a company, a practice, or a
family. It starts with one call, and nothing is owed until your Basalith has
answered you.
[Begin with one call] to `/begin`

### Homepage, the personal block (was "The second door")

Eyebrow: For one person

> You do not keep one mind for work and another for home.
>
> The calls you make about money, people, and risk come from the same place. A
> Basalith holds how you make them, in your own words, while you are still the
> one who can say why.
>
> Begin with the hardest call you ever made. Fifteen to thirty minutes, by voice
> or typed, on your own time. Then your Basalith answers one question in your
> own words and declines one it has no grounds for. Where the record is silent,
> it says so.
>
> [Begin with one call]
>
> Nothing is owed until you have seen it. Pricing · For a family

The frame is yours, from September 15: one mural, no line between the business
and the life. Every mechanism sentence is lifted from `/begin` or from the
proof card.

### Homepage, meta description

> What built the company is not in the data room. Basalith captures how a
> person reasons and decides, in their own words. For a business changing
> hands, and for one person whose judgment is worth keeping.

### Pricing, hero sub

> For a business changing hands, and for one person or a family. Every Basalith
> begins with The Founding.

### Pricing, personal section header

Eyebrow: For one person or a family (was "The second door · Individuals and
families")

> For your own judgment, at home or at work. (was "For a life, not a business.")
>
> The same method, pointed at one person: the calls your work depends on, and
> the way you see the world. The first call is yours before anything is owed.
> Three plans, built to move with you as life changes.

### Pricing, Active tier

CTA: Begin with one call. Note: The first call is yours. One time founding fee
of $2,500 to keep it.

### Pricing, new section "Personal or Succession"

Eyebrow: If you own a business

> A personal Basalith is yours. You deposit, you ask, and the people you invite
> add what they remember. If you run a company, how you run it belongs in there
> too.
>
> Succession is for the day someone else has to run the company from that
> judgment. It adds four things a personal Basalith does not have.
>
> 01 A sign in for your successor. The person taking over signs in separately
> and asks how you would decide.
> 02 The business questions. Questions built around how the company is run,
> area by area, so the record covers the calls a successor will face.
> 03 A live session with both of you. One session by video with your successor
> in the room, working through the calls together.
> 04 A layer your successor keeps. They record what has changed since you
> stepped back. Your judgment stays fixed. Their context stays current.
>
> If nobody else will have to consult it to run something, begin personal. If a
> successor or a buyer will, start with Succession.

What each row points at: `/succession/login` and the successor portal;
`lib/b2bDomains.ts` and `/api/archive/b2b-question`; the live session already
in `SUCCESSION_FEATURES`; `/succession/portal/context`.

This section tells an owner outright that business judgment belongs in a
personal Basalith. That is deliberate. The arbitrage existed anyway. Naming it
turns the $3,600 tier into the on ramp to the $12,000 one, and the line between
them becomes the successor, which is the thing Succession is actually for.

### Pricing FAQ, new question

> **I own a business. Personal or Succession?**
> Begin personal if the Basalith is for you. How you run the company belongs in
> it, and nobody will tell you to keep work out. Choose Succession when someone
> else will have to run the company from your judgment: it adds a separate sign
> in for your successor, the business questions, one live session by video with
> both of you, and a layer where your successor records what has changed.

### Contributor page, new block

Eyebrow: One of your own

> You have seen how {first name}'s Basalith is built.
>
> You can begin one for yourself. The first call is fifteen to thirty minutes,
> by voice or typed, on your own time. When it is in, your Basalith answers one
> question in your own words and declines one it has no grounds for.
>
> Because {first name} invited you here, the Founding fee is waived if you
> decide to keep yours.
>
> [Begin with one call]

### /begin, one line, only when the ref resolved

> You were invited by someone who has a Basalith. If you keep yours, the
> Founding fee is waived.

---

## 3. HOW THE CONTRIBUTOR REFERRAL WORKS

Before this pass the September 24 waiver was a decision with no code behind
it. Nothing recorded who referred whom, and the checkout route had no way to
leave the founding fee off. Printing the waiver without those would have
broken the integrity rule. So the mechanism came first.

1. The contributor page links to `/begin?ref=<contributors.id>`. The row id,
   not the access token. The token is a credential.
2. `/begin` resolves the id on the server. It must be an active contributor on
   an active Basalith. Anything else resolves to nothing and the page renders
   exactly as it does today.
3. `POST /api/trial/start` resolves it again and never trusts the client. On a
   hit, `archive_applications.reason` ends with
   `[referred by contributor <id>]` and the "Trial started" notice carries a
   "Referred by" line naming the contributor and the Basalith.
4. When that person pays, the admin checkout call takes
   `"waiveFounding": true`. The session carries the recurring tier only, and
   the subscription metadata carries `founding_waived: referral`.
5. Provisioning is unaffected. It keys on the first invoice of the
   subscription, not on the founding line.

`referral_source` stays `self-serve`. Its CHECK constraints have not been read,
and a failed insert there would silently drop the lead row.

### Calls in here that are yours

- **A contributor counts as a referred friend or family member.** Your decision
  of September 24 was that a client referring a friend or family member waives
  the fee. A contributor was invited to add memories, not referred to buy. I
  read the two as the same relationship. Say so if you do not.
- **The block shows on every active Basalith,** including the four family
  records that never paid. If the waiver should only flow from paying clients,
  it needs a gate on billing, and I did not add one.
- **English only.** Seven other portal languages have no checked translation
  of a sentence that promises money.
- **The contributor cap of 10 is not enforced.** `api/archive/contributors`
  has no count check. No copy in this pass states the cap.
- **The blind spot review said make the first sales at list.** This waiver
  cuts against that. It costs $2,500 per referred client and buys the only
  distribution the personal path has. I think it is the right trade at zero
  budget. It is still a trade.

---

## 4. THE PRICE TRIPWIRE

Decided October 6, 2026.

**Rule.** The $2,500 personal founding fee holds through the launch cohort.
Count the first 50 people who finish call 1 and see the proof card. If fewer
than 5 of them have paid, test folding the founding fee into the annual plan.

**Denominator.** People who finished call 1 and saw the proof. Not sign ups.
Someone who never spoke has not seen the product and tells you nothing about
the price.

**Numerator.** Paid founding fees from that same 50, counted 30 days after the
fiftieth, because a trial lasts 30 days.

**What tripping means.** A test, not a price cut. One alternative offer (no
founding fee, a higher first year) shown to the next 50, compared against this
50. The list price on the site does not move until the second number exists.

**What does not count.** Referred sign ups with the fee waived. They never saw
the $2,500, so they say nothing about whether it holds. Log them apart.

**How to count today.** By hand. The denominator is the "call 1 complete"
internal notices. The numerator is `billing` rows with `founding_paid_at` set
whose application email matches one of those people. There is no single query,
because a paid Basalith is a new row and does not point back at its trial.
Slice C should close that, and the count becomes one query the day it does.

---

## 5. FOUNDER HOURS

Decided October 6, 2026.

**Personal path: watch mode only.** Read every call 1. Take every first read
call. Log the minutes per Basalith, as agreed on September 17. No outbound
selling, no demo calls, no custom onboarding for a personal client.

**Selling hours go to Succession through the warm network.** Those are the
deals only you can close, and one is worth close to three personal clients in
year one ($17,000 against $6,100).

**The check.** If the minutes log shows personal clients taking more of a week
than Succession conversations, the first read call sunsets early or the cohort
pauses. The log is the only thing that will tell you, so it has to be kept.

---

## 6. GATES BEFORE PROMOTE

1. `npx tsc --noEmit`. Clean except the five known `lib/frozenLayer.test.ts`
   errors. Every changed file parses under esbuild here. That is syntax, not
   types. In particular confirm `StoneCard` accepts the children in HomeDoors
   and that `searchParams` on `/begin` types as a Promise.
2. Preview the homepage at 390px and at desktop. The two cards should stack on
   a phone and sit side by side on a laptop. The hero now ends on the sub copy
   with the cards directly under it. If the gap reads wrong, the fix is the
   `paddingTop: 0` on the HomeDoors block.
3. Click both door buttons, the personal block button, and the closing button.
   Three of the four land on `/begin`.
4. Load `/pricing`. Confirm the new section renders after the three tiers and
   that `/pricing#which` scrolls to it from the FAQ link.
5. Open a contributor link for a Basalith where that contributor has added
   something. Confirm the block shows in English and not in any other
   language. Follow its link and confirm the waiver line shows on `/begin`.
6. Load `/begin?ref=nonsense` and `/begin?ref=` plus a random uuid. Neither
   should show the waiver line.
7. Start one trial through a real ref in preview. Confirm the notice email
   carries the "Referred by" line and the application row's `reason` ends with
   the bracketed id.
8. On Stripe test keys, call the admin checkout once with
   `"waiveFounding": true`. Confirm the session shows one line item, pay it
   with a test card, and confirm the Basalith provisions.

---

## 7. FOUND AND NOT CHANGED

- **Pricing FAQ, "What exactly is The Founding?"** says "Your annual plan
  begins after The Founding is complete." The checkout route charges the tier
  and the founding fee on the same first invoice. One of the two is wrong.
- **`founding_paid_at` is set on a waived subscription too.** It is the
  provisioning gate, so it has to be. The name will mislead whoever reads the
  table next. The metadata flag is the truth.
- **`/families`** still frames the personal path around family memory. It is
  now one link down from the personal block, which is where it belongs, but an
  owner who lands there from search meets the wrong pitch. A page for the owner
  and the professional is the natural next piece of copy.
- **Nav** has no personal entry beyond the Begin button. "For Business" has a
  link and the personal path does not. Left alone because the label needs your
  word.
