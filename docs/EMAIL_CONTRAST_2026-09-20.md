# Slice 5a, revised: the emails are readable, and the wordmark drops the .xyz

September 20, 2026. Thirty-five files in `basalith-official`, written to the
working tree by Cowork, uncommitted. This replaces the earlier
`EMAIL_CONTRAST_2026-09-20.md`, which covered twenty-six of them and missed
thirteen.

## What I missed the first time, and how

The first pass swept `app/api/cron/*` and `lib/emails/*`, on the assumption that
those were the email senders. They are not all of them. Thirteen more routes
build and send customer email from elsewhere in `app/api`, and they carried the
same two failing greys:

    app/api/archive/contribution-alert   app/api/contribute/answer
    app/api/archive/contributors         app/api/demo/whitepaper
    app/api/archive/invite-witness       app/api/god/email
    app/api/archive/life-event           app/api/god/send-apology
    app/api/archive/morning-digest       app/api/god/send-magic-link
    app/api/archive/poll-replies         app/api/resend/inbound
    app/api/archive/send-photo

The right sweep was `grep -rl 'DOCTYPE html' app lib`, not a directory guess. It
is in the verification list below so the next pass starts from the senders
rather than from where I expect them to live.

Three of those are the ones that matter most: `invite-witness` and
`contributors` are the emails that bring a new family member into an archive,
and `morning-digest` is the daily one, with eleven undersized labels and nine
failing greys on its own.

## The totals, both passes together

    #5C6166  ->  #8B9196    98 replaced    3.18:1 -> 6.24:1
    #706C65  ->  #A29B90    63 replaced    3.81:1 -> 7.23:1
    #3A3830  ->  #8B9196     3 replaced    1.69:1 -> 6.24:1
    font-size:10px -> 11px 138 replaced
    font-size:9px  -> 11px   3 replaced
    BASALITH · XYZ -> BASALITH  31 replaced

164 pieces of customer-facing text were below AA. All of them measured, on the
email ground `#0A0908`, which is darker than the portal's `#14120F` and so has
its own numbers.

The ladder, which is now the whole email palette:

    #F0EDE6   17.02:1   headline and body          113 uses
    #B8B4AB    9.62:1   secondary                   84 uses
    #C4A24A    8.16:1   gold, and the button        75 uses
    #9DA3A8    7.80:1   cool secondary              16 uses
    #A29B90    7.23:1   explanatory prose           57 uses
    #8B9196    6.24:1   eyebrows, footers, labels   98 uses

Everything else measured and passing: `#9A968C` 6.74, `#A08A52` 5.92, `#8A7A4A`
4.70. The gold button's label, `#0A0908` and `#0A0A0B`, is 8.16:1 on the gold.

## The wordmark

`BASALITH · XYZ` is now `BASALITH`, in all 31 places. It does not need to name a
domain at all, the company line under it already says Heritage Nexus Inc., and
`BASALITH · AI` would have read as an AI product label, which the copy rules
rule out anyway.

This is the only part of the domain switch that is safe to do in code today.
The rest is below, and it is not a code problem.

## Copy

Two em dashes in emitted English in `memory-game-monthly`, and one more found in
the second pass: the apology email opened `${firstName} —`, now `${firstName},`.

The nine em dashes in `lib/emailTranslations.ts` stay. They are in Chinese,
Cantonese, Japanese, Vietnamese, Tagalog and Korean copy. The no-em-dash rule is
an American English style rule, and in Chinese and Japanese the em dash is the
standard 破折号. `CLAUDE.md` should say the rule is English-only before somebody
runs a global strip on that file.

## The Guide routes that are still on disk

`git rm -r app/archivist` does not match `app/archivist-login`, and
`git rm -r app/api/archivist` does not match `app/api/archivist-*`. My slice 4
command list was written as if it did. Seven paths survived:

    app/archivist-login                  the sign-in page
    app/api/archivist-apply              logs the body, returns 200
    app/api/archivist-interest           logs the body, returns 200
    app/api/archivist-login              returns 410, deprecated since Phase 4a
    app/api/guide-onboard                the onboarding handler
    app/api/admin/guide                  the admin tool for managing guides
    app/api/cron/guide-quality-audit     scores archives, emails guides a report
    app/api/cron/pay-residuals           12% commission, paid via Stripe Connect

The three `archivist-*` API routes are harmless stubs. `pay-residuals` is not.
It is a POST endpoint guarded only by `CRON_SECRET` that moves money to
contractors who no longer exist. It is not in `vercel.json`, so it has never
been scheduled and has never run, and it should not be sitting in the tree
waiting for someone to schedule it by mistake.

## Run it

    npx tsc --noEmit
    git checkout -b email-contrast
    git rm -r app/archivist-login
    git rm -r app/api/archivist-apply
    git rm -r app/api/archivist-interest
    git rm -r app/api/archivist-login
    git rm -r app/api/guide-onboard
    git rm -r app/api/admin/guide
    git rm -r app/api/cron/guide-quality-audit
    git rm -r app/api/cron/pay-residuals
    git add app/api lib/emails lib/pauseEmails.ts app/contribute/not-found.tsx
    git add docs/EMAIL_CONTRAST_2026-09-20.md
    git commit -m "Email contrast: 164 failing text colors fixed, type floor raised, wordmark drops the .xyz; delete the last Guide routes"
    git checkout main
    git merge email-contrast
    git push origin main

Check `git status` after the `git rm` lines and before the commit. If any of
those paths is already gone, git says so and the line is a no-op, which is fine.

## The domain switch, which is mostly not a code change

Every `basalith.xyz` reference in the repo, counted:

    archive@basalith.xyz        45   the sending address, and the inbound reply address
    unsubscribe@basalith.xyz    39   the List-Unsubscribe header
    BASALITH · XYZ              31   the footer wordmark            DONE, above
    legacy@basalith.xyz          8   the admin inbox
    hello@basalith.xyz           4   the public contact address
    davidha@basalith.xyz         3   the internal-alert sender
    guide@basalith.xyz           2   Guide-era, deleted above
    archivists@basalith.xyz      1   Guide-era, deleted above
    https://basalith.xyz         1   the white paper URL

That last one is already right under the split you described. `demo/whitepaper`
points the boardroom demo at the research site, which is what .xyz is becoming.
Leave it.

The other 99 are mail, and this is the part worth being careful about. Nothing
in the product sends from basalith.ai today. All 35 `from:` literals are
`archive@basalith.xyz`, and the internal alerts are `davidha@basalith.xyz`.

`archive@basalith.xyz` is not only the sending address. It is the address
families reply to, and `app/api/resend/inbound` is what catches those replies
and turns them into deposits. Changing the from-address in code without moving
inbound routing first would not degrade anything visibly. It would just quietly
stop the reply loop, which is the part of the product where a grandmother
answers a photograph, and you would find out weeks later.

So the order has to be:

1. Add basalith.ai as a domain in Resend. Publish the SPF, DKIM and DMARC
   records it gives you. Wait for verification.
2. Set up inbound routing for `archive@basalith.ai` in Resend, and confirm a
   test reply reaches `/api/resend/inbound`. Keep the .xyz inbound route
   running in parallel, because replies to old emails will keep arriving for
   months and each one is a real memory someone typed.
3. Create `unsubscribe@`, `legacy@`, `hello@` on basalith.ai and forward them
   wherever you read mail now.
4. Only then, the code: flip the literals, or better, set `RESEND_FROM_EMAIL`
   and `ADMIN_EMAIL` in Vercel so the literals stop mattering.

Which brings up the one thing I cannot see from here, and it changes how much
work step 4 is: **are `RESEND_FROM_EMAIL` and `ADMIN_EMAIL` set in Vercel
today?** If they are, every `?? 'archive@basalith.xyz'` in the repo is a dead
fallback, the live from-address is whatever the env var says, and step 4 is two
environment variables rather than 84 edits. If they are not, the fallbacks are
the live addresses. I did not read your `.env` to find out, and you should not
paste it here either. Vercel's project settings will say.

## Verified here

Every `color:` value in all 35 files measured on the email ground; the only ones
below 4.5:1 are the two internal admin alerts, which are deliberately light
(`#111` on `#fff`), and the gold button labels, which are 8.16:1 on gold. No
type under 11px. No em dashes in emitted English. No `BASALITH · XYZ` left.
TypeScript under strict with `isolatedModules` reports no errors; the only
diagnostics are the sandbox's missing `@types/node` and unresolved `@/lib/*`.
Line endings match each file's original.

## Not verified here

Any of these actually rendering in a mail client. The three worth sending
yourself before you trust the pass: the morning digest, which had the most
damage; a witness invitation, which a stranger sees first; and the quarterly
entity letter, where the paragraph asking the owner to correct the entity was
the worst single instance at 3.81:1.

## What is left

**Slice 5b.** The theme file and the shared shell. Twenty-eight files now carry
their own copy of the same `<!DOCTYPE>`, body style, eyebrow, button and footer.
That duplication is why one sweep missed thirteen senders, and it is why the
wordmark needed 31 edits instead of one. Extracting `lib/emails/theme.ts` and a
`renderEmail()` shell is what makes the next change one edit.

**The Supabase magic link.** Still the dashboard, not the repo. The drop-in
template is in the earlier version of this document and unchanged by this pass.

**The iOS app.** `basalith-app/src/theme.ts`, its own pass. Not connected here.
