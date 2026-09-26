# Succession checkout fixes. September 25, 2026.

Found while preparing David's walk through the paid succession path as a client
would take it (MOAFly Technologies, Stripe test mode). Four defects, fixed
before the walk so the walk tests the real experience, not the known bugs.
Written to disk in basalith-official by Cowork, uncommitted. No migration.

## Recon (read from the code)

1. **A succession purchase became a family Basalith.** `provisionOnFoundingFee`
   read `archive_tier` from the subscription metadata and defaulted it to
   `'estate'`. The admin checkout wrote `archive_tier: archiveTier ?? 'estate'`
   for every segment. So `archives.tier` came out `'estate'` for a succession
   buyer, and every consumer keyed on `tier === 'succession'` (coverage set,
   Founding seeds, question selector, classifier, thread scope, the
   b2b-question routes, the daily reflection) treated the business as a
   family.
2. **The buyer landed on a 404.** Checkout's `success_url` is `/welcome`, and no
   such page existed.
3. **The welcome email said "Your founding is complete."** Payment opens the
   Basalith. The Founding (three calls, `lib/foundingSequence.ts`) has not
   started.
4. **The welcome email printed a password.** Password sign-in is retired:
   `app/api/archive-login` and `app/api/archive/mobile-login` both answer 410.
   The password opened nothing and sat in an inbox in plain text. It was also
   returned from the `create-archive` step, and Inngest keeps step results in
   the run history, so every provisioning run stored it there too.

Found while fixing 3 and 4:

5. The email told the buyer to "Save this link. It is your entry to your
   Basalith." A generated sign-in link works once and expires, so that was a
   mechanism the link does not have.
6. The sign-in link was also returned from a step, so it sat in the run
   history as a live bearer credential until used or expired.
7. `firstName` comes from the application form and was interpolated into the
   HTML unescaped.

## What changed

New
- `lib/billing/archiveTier.ts`: `provisionedTier(segment, requested)`. A
  succession segment is always `'succession'`; b2c keeps archive, estate, or
  dynasty, default estate; an unknown value never reaches `archives.tier`.
- `lib/billing/archiveTier.test.ts`: the rule, plus source pins that checkout
  and provisioning both use it and that the `create-archive` step returns no
  password and no sign-in link.
- `lib/emails/foundingWelcome.test.ts`: no "founding is complete", no password,
  no "save this link", succession and family wording, copy rules, escaping.
- `app/welcome/page.tsx`: the Stripe return page. It reads nothing and claims
  only what is true when it renders: payment received, the Basalith is being
  set up, the welcome email is on its way, and a link to request a sign-in
  link. `noindex`. Not gated by `proxy.ts`.

Changed
- `app/api/admin/checkout/route.ts`: `archive_tier` metadata through
  `provisionedTier`.
- `lib/inngest/billingFunctions.ts`: tier through `provisionedTier` (so a link
  generated before this fix still provisions correctly); the `create-archive`
  step returns only the archive id; the `welcome-email` step mints the sign-in
  link itself, so a retry sends a fresh one and a reused archive gets one too;
  `TIER_LABELS` gains succession.
- `lib/billing/createArchive.ts`: link generation extracted to
  `generateOwnerSignInLink`, same call, same options. Other callers unchanged.
- `lib/emails/foundingWelcome.ts`: rewritten copy. Subject "The <name>
  Basalith is open." Says payment went through and the Basalith is open, gives
  the one-time link with an honest note, names the Founding as the first step
  with its address, and says the founder will be in touch. Succession wording
  talks about the business and drops "Generation I" and photographs. The
  `password` input is gone; `segment` is new.

Two more callers, found by David's `tsc` run (they passed `password`):
- `lib/billing/legacyActivation.ts` (manual activation shim, also resumes a
  paused Basalith): no longer regenerates or emails a password. The email now
  sends the owner to `/archive-login` rather than the legacy
  `magic_link_token` route, whose behavior was not verified, and passes
  `paid: false`, which says "is active" instead of "your payment went
  through" and "If you have not begun the Founding" instead of "The first
  step". Segment follows `archives.tier`.
- `scripts/stripe-acceptance.ts`: `password` dropped, `segment: 'b2c'` added.

Not touched: `createArchiveWithCredentials` still generates and stores an
`archive_credentials` password nothing reads. Its comment calls it the mobile
login shim, which is retired. Removing it is its own change.

## Verified in Cowork

- `tsc` clean on every changed file (modules outside the slice stubbed).
- vitest: 13 new tests pass; the local suite otherwise unchanged.
- First run on David's machine: 42 files, 741 passed, and two `tsc` errors from
  the callers above, now fixed.

## Run order

1. `npx tsc --noEmit 2>&1 | Select-String "error TS"` prints nothing. If
   anything else calls `buildFoundingWelcomeEmail` with `password`, it shows
   here.
2. `npm test 2>&1 | Select-Object -Last 6` shows 0 failed.
3. Commit on a branch, fast-forward main, push. Confirm the Inngest app page
   shows the new commit (standing check).
4. The walk: `/apply` as Business Succession with a non-owner email, checkout
   link from `/api/admin/checkout`, pay with 4242 4242 4242 4242, land on
   `/welcome`, read the email, sign in, open the Founding.
5. Prove the tier: `select id, name, tier, status from archives where name =
   'The MOAFly Technologies Basalith';` expect `succession`, `active`.
