# TRIAL TO PAID. SLICE C.

October 9, 2026. Written in a sandbox against copies of the files read from
David's disk that morning. NOT type checked in the repo, NOT run against
Supabase or Stripe, NOT seen in a browser. David runs tsc, the tests, git, and
the deploy.

Design basis: `docs/SELF_SERVE_SKELETON_2026-09-17.md` section 3, approved
September 17, and the recon of October 9
(`claude/BASALITH_B2C_PRODUCT_LINE_RECON_1_2026-10-09.md`, section P4).

## The defect this closes

A trial owner who paid got a NEW, empty record. `provisionOnFoundingFee`
called `createArchiveWithCredentials` on every first payment and never looked
for the trial. The record holding their first call and the proof they had just
seen stayed a trial and was deleted at thirty days. There was also no way to
pay without the founder building a link by hand.

## What a trial owner can now do

1. Under the proof card on `/archive/founding`: the price, a yearly or monthly
   choice, and one button.
2. The button opens Stripe Checkout for their own record.
3. They pay and land on `/archive/founded`.
4. The record they already have is founded. Same id, same deposits. No second
   row in `archives`.

The button shows to nobody until `TRIAL_CHECKOUT` is set. See "Turning it on."

## How a record is founded

One conditional update, `markTrialFounded` in `lib/billing/convertTrial.ts`:
`status` trial to active, `converted_at` set, `trial_expires_at` cleared. It
does nothing to a record that is not a trial. It has three callers, safe in
any order and any number of times:

| Caller | When | Why |
|---|---|---|
| Stripe webhook, inline | `checkout.session.completed`, paid, metadata `archive_id` plus `source: trial` | Founding does not wait on Inngest. The billing functions were once unregistered for weeks and nobody knew (CLAUDE.md section 6). |
| `provisionOnFoundingFee`, trial branch | `invoice.paid` | Links billing, writes the lifecycle row, sends the welcome, marks the lead won, records a referral credit. |
| `POST /api/archive/checkout/confirm` | The landing page, once, after a minute with no change | Asks Stripe itself. A person who paid is never left on the expiry clock because a webhook did not land. |

## What David receives per sale

1. "Checkout opened: <name>" when they reach the Stripe page. Nothing is paid.
2. "Trial paid: the record is founded" from the webhook.
3. "Founded: <name>" from Inngest, with the plan, the fee, and the counts.

Number 2 without number 3 inside ten minutes means the Inngest function did
not run. "FOUNDED BY THE FALLBACK" means the webhook did not land in a minute:
read the webhook deliveries in Stripe.

Four more can arrive, each a fault to act on the same day: "PAID, NO RECORD",
"PAID, NOT FOUNDED", "PAID TWICE", "Checkout refused: a Stripe price is
missing".

## Files

New:

| File | What |
|---|---|
| `lib/trialCheckout.ts` | Pure rules: who sees the button, who may pay, the plan, the metadata, the sentences and figures the page prints |
| `lib/trialCheckoutStore.ts` | Reads: env, the trial's lead row and its referral tag, whether the prices exist |
| `lib/billing/convertTrial.ts` | `markTrialFounded` and `convertTrialOnPayment`, every dependency injected |
| `lib/emails/trialFounded.ts` | The owner's email: "Your Basalith is founded." |
| `app/api/archive/checkout/route.ts` | GET (am I founded) and POST (open Checkout) |
| `app/api/archive/checkout/confirm/route.ts` | The fallback |
| `app/archive/founded/page.tsx`, `FoundedClient.tsx` | Where a payer lands. Writes nothing |
| Five test files | 71 tests |

Edited, LIVE:

| File | Change |
|---|---|
| `lib/inngest/billingFunctions.ts` | Trial branch added ahead of record creation. The two closing steps (application won, referral credit) lifted into shared helpers under their original step ids. The application branch is otherwise untouched |
| `app/api/stripe/webhook/route.ts` | The inline flip, ahead of the application linkage, no return |
| `app/archive/founding/page.tsx` | Reads the offer on the server, passes it down |
| `app/archive/founding/FoundingClient.tsx` | `FoundOffer` under the proof card. With no offer the page is what it was |
| `CLAUDE.md` | One paragraph, two sentences corrected |

No migration. Every column written already exists: `archives.converted_at`
and `trial_expires_at` (pasted September 17), and the `billing` and
`archive_lifecycle` columns the application branch already writes.

**`FoundingClient.tsx` and `CLAUDE.md` also carry yesterday's uncommitted
slice 4b edits.** Commit 4b first, or commit the two slices together. They
cannot be separated by file.

## Run, in this order

    npx tsc --noEmit
    npx vitest run lib/trialCheckout.test.ts lib/billing lib/emails/trialFounded.test.ts app/api/archive/checkout lib/inngest/billingFunctions.test.ts
    npm test

Expected: tsc prints nothing. The second line reports 5 files, 71 tests
passed. That is what the sandbox printed, against copies. It is not the repo:
paste the real output. `npm test` matters because `lib/assessmentGates.test.ts`
reads `FoundingClient.tsx` and the founding page as text; both of its
assertions on those files were left intact, and the sandbox could not run the
whole of that file.

## Turning it on

`TRIAL_CHECKOUT` in the Vercel environment:

| Value | Who sees the button |
|---|---|
| unset, empty, `off` | Nobody. The page is what it was before this slice |
| `you@example.com, second@example.com` | Those owners only, on any key |
| `on` | Every trial owner. On production with a Stripe TEST key this is treated as closed, so a stranger never meets a declined card |

A missing Stripe price id also hides the button, in either mode.

Before a referred trial can pay, on the test key:

    npx tsx scripts/stripe-setup.ts

and paste the `b2c_founding_referral` id into `TEST_PRICES`. It has been empty
since October 6. A trial with no referral does not need it.

## The live test

Set `TRIAL_CHECKOUT` to one test address of your own (Gmail; the ufl.edu
address failed sign in on October 8). Then:

1. `/begin` with that address. Finish call 1. Press "Show me."
2. Under the proof: the price lines, Yearly and Monthly, "Found your Basalith."
3. Pay with the Stripe test card.
4. Land on `/archive/founded`.

Paste back:

    select id, name, status, tier, converted_at, trial_expires_at
    from archives where owner_email = '<the address>';
    -- one row. status active, converted_at set, trial_expires_at null,
    -- the same id the trial had.

    select stripe_subscription_id, archive_id, application_id, founding_paid_at
    from billing where archive_id = '<that id>';
    -- one row, founding_paid_at set.

    select archive_id, segment, commercial_state
    from archive_lifecycle where archive_id = '<that id>';

    select id, status from archive_applications where email = '<the address>';
    -- status won.

    select count(*) from owner_deposits where archive_id = '<that id>';
    -- the same count as before paying.

And: the three internal emails, the owner email, and the Inngest app page
showing the deployed commit (the standing check in CLAUDE.md section 6).

Then replay the `checkout.session.completed` event from the Stripe dashboard
and paste that nothing changed.

**Check before the test: does Stripe have a webhook endpoint for this
deployment in the mode you are paying in?** If not, nothing lands, the page
waits a minute, and the fallback founds the record. That is a fair test of the
fallback and not of the main path.

## Rollback

Unset `TRIAL_CHECKOUT`. The button is gone and no new trial session can be
made. The trial branch and the inline flip run only for a session this slice
created, so with the flag off they are unreachable. A session already paid
still founds its record, which is what you want.

## Known limits, by name

1. **Not seen in a browser.** The computer went out of reach before
   `globals.css` could be read, so the offer block and the landing page were
   never rendered. They use the portal stone tokens and the page's own button
   and panel styles. Look at both on a phone before any stranger does.
2. **The FAQ may contradict Checkout.** The October 6 record found the
   pricing FAQ saying "Your annual plan begins after The Founding is
   complete." It was not read again today. Checkout charges the founding fee
   and the first period on the same day, and the new page copy says so. If the
   FAQ still says that, one of the two must change before a stranger pays.
3. **Live mode cannot sell yet.** `LIVE_PRICES` is empty. With a live key the
   button stays hidden until you fill it.
4. **Tax is off** (`STRIPE_TAX_ENABLED`), exactly as on the admin route.
5. **The day 23 warning email still says "reply to this email."** It does not
   link to Checkout. That line is still true and the reply still reaches you.
6. **A person can pay before finishing call 1** by calling the route directly.
   The page only offers it after the proof is available. Not blocked: there is
   no reason to refuse the money, but such a sale is not a tripwire data point.
7. **The expiry job and a payment can cross.** A trial is refused Checkout
   once the job has marked it for deletion. A payment that lands in the seconds
   between the job's first step and its delete is not handled. One run a day,
   at 09:00 Pacific.
8. **Sending `founding_fee.paid` by hand** within 24 hours of the original
   event is dropped by the function's idempotency key if the original was
   received. Use the rerun control on the failed run in Inngest.
9. **Not done from skeleton section 3:** the password cut (3.4), and `/welcome`
   is left as the page built September 25.
10. **Names.** A trial is "Ha Basalith." A record made by the admin link is
    "The Ha Basalith." Founding does not rename.
11. **Whether Stripe emails a receipt** is a dashboard setting this code does
    not read.

## The tripwire is now a count

Decided October 6: of the first 50 people who finish call 1 and see the proof,
fewer than 5 paying triggers a test. The numerator used to need a hand match,
because a paid record was a new row. It is now:

    select count(*)
    from archives a
    where a.converted_at is not null
      and not exists (select 1 from referral_credits r where r.referred_archive_id = a.id);

Referred payers are excluded, as decided. The denominator is still the "call 1
complete" notices.

## Decisions taken October 9, recorded here

On the recon's five calls, David said yes to all, and trial to paid first:

1. An existing owner who orders his own dependency report gets a second,
   business record under the same sign in.
2. A buyer who orders later on a founder who already has his own report: the
   founder releases the report he has read, the buyer pays list less the
   credit, good until the 90 day purge.
3. A gift is a one time payment. The paid year starts at redemption. The
   record rests in the existing paused state at the end of it unless the
   recipient subscribes.
4. Household means same payer, applied by hand at launch. **The amount is
   still open.**
5. The referral half fee and the household discount can both apply. No $500
   credit when the referrer is the one paying.

## Next

Step 1 of the recon's build order is the stripe-setup run above. Step 2 is the
one time payment path, which the owner ordered report and the gift both need.
This slice's "checkout onto an existing record" was step 4, done first.
