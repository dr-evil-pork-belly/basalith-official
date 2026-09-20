# Slice 5a: the emails are readable

September 20, 2026. Twenty-six files in `basalith-official`, written to the
working tree by Cowork, uncommitted. This is the contrast fix only. The theme
file and the shared shell are slice 5b, deliberately separate, and the reason
is at the bottom.

## First: one thing slipped through slice 4

`git rm -r app/archivist` does not match `app/archivist-login`, and my command
list did not include it. The directory is still on disk. It is harmless right
now, because `/archivist-login` is a 308 in `next.config.ts` and redirects run
above route resolution, so the page is unreachable dead code. Still, delete it:

    git rm -r app/archivist-login

Two Guide-era cron routes also survived, because they live under `app/api/cron`
rather than `app/api/archivist`:

    app/api/cron/guide-quality-audit    scores archives, emails guides a report
    app/api/cron/pay-residuals          computes a 12% commission, pays via Stripe Connect

Neither is registered in `vercel.json`, so neither is scheduled and neither has
been running. But `pay-residuals` is a money-moving POST endpoint guarded only
by `CRON_SECRET`, sitting in the tree for a commission model that does not
exist. It should not be one misconfigured schedule away from paying somebody.

    git rm -r app/api/cron/guide-quality-audit
    git rm -r app/api/cron/pay-residuals

## The decision: emails stay dark

The register rule from slice 3 settles this without a debate. Dark is Basalith
and the archive; stone is the founder at work. An email is not a workspace. It
is Basalith speaking to you in your inbox, which is the same voice as the
sign-in page and the block where the entity answers.

So slice 5 is not a repaint. Nothing changes color family. What changes is that
the text becomes readable, which it currently is not.

## What was broken

Measured on the email ground `#0A0908`, which is one step darker than the
portal's `#14120F`, so these numbers are specific to email:

    #5C6166   3.18:1   FAIL   78 uses   mono eyebrows, footers, labels
    #706C65   3.81:1   FAIL   50 uses   Georgia explanatory paragraphs
    #3A3830   1.69:1   FAIL    1 use    the founding welcome footer

129 pieces of text below AA, in mail that has already been sent to customers.
And 101 instances of `font-size:10px`, letterspaced mono, which is under the
floor the rest of the product now holds.

The worst of it is not a label. In `entity-letter`, the paragraph that tells an
owner the entity may be wrong and they should correct it was `#706C65` at
3.81:1. That is the instruction that makes the correction loop work, rendered
close to invisible, in the quarterly email whose whole job is to reopen the
conversation.

## What changed

    #5C6166  ->  #8B9196   6.24:1   the dim tier, cool, chrome
    #706C65  ->  #A29B90   7.23:1   the muted tier, warm, explanatory prose
    #3A3830  ->  #8B9196   6.24:1
    font-size:10px -> 11px          101 instances

The two replacements keep the hue each one had, because the warm and cool greys
were doing different jobs and the difference is worth keeping. The muted tier
sits above the dim tier deliberately: explanatory prose should read louder than
footer chrome, which is the same hierarchy mistake the dashboard had in the
contrast revision.

The full ladder on the email ground now runs:

    #F0EDE6   17.02:1   headline and body          92 uses
    #B8B4AB    9.62:1   secondary                  94 uses
    #C4A24A    8.16:1   gold, and the button       59 uses
    #A29B90    7.23:1   explanatory prose          49 uses
    #8B9196    6.24:1   eyebrows, footers, labels  79 uses

Every other literal still in these files was measured and passes: `#9DA3A8`
7.80, `#9A968C` 6.74, `#A08A52` 5.92, `#8A7A4A` 4.70. The gold button's label
`#0A0908` on `#C4A24A` is 8.16:1.

## Deliberately not touched

**The internal admin alerts.** `buildExportAdminAlert` in
`lib/emails/archiveExport.ts` and the plain fallback in
`foundingSequenceComplete.ts` are light-themed on purpose: `#111` on `#fff`,
`#1A1814` on the client default. They go to you, not to a customer, and they
are meant to be plain. They read as failures in an automated sweep, which is
why this says so here. They are a third register, internal plain, and they
should stay that way.

**The em dashes in `lib/emailTranslations.ts`.** There are nine, in Chinese,
Cantonese, Japanese, Vietnamese, Tagalog and Korean copy. The no-em-dash rule is
an American English style rule. In Chinese and Japanese the em dash is the
standard 破折号 and removing it would be a typographic error, not a copy fix.
The rule should be read as English-only, and `CLAUDE.md` should say so before
someone runs a global strip on that file.

The em dashes in `console.log` calls and code comments were left alone for the
same reason: they are not copy.

## Copy

Two em dashes were in emitted English, both in `memory-game-monthly`:

    "Answers are shown without names — so be honest."
      -> "Answers are shown without names, so be honest."
    "N ANSWERS — NAMES NOT SHOWN"
      -> "N ANSWERS · NAMES NOT SHOWN"

## Run it

    npx tsc --noEmit
    git checkout -b email-contrast
    git rm -r app/archivist-login
    git rm -r app/api/cron/guide-quality-audit
    git rm -r app/api/cron/pay-residuals
    git add app/api/cron lib/emails lib/pauseEmails.ts
    git add docs/EMAIL_CONTRAST_2026-09-20.md
    git commit -m "Email contrast: 129 failing text colors fixed, type floor raised; drop the last Guide routes"
    git checkout main
    git merge email-contrast
    git push origin main

## The Supabase magic link, which is not in this repo

Sign-in uses `signInWithOtp` with `emailRedirectTo`, so what a new owner
actually receives is Supabase's **Magic Link** template, edited in the dashboard
under Authentication, Email Templates. It is still on the default light theme,
which is why a new owner gets a white sign-in email and a dark welcome email
within the same minute. I cannot reach the dashboard from here. Paste this in:

    <!DOCTYPE html>
    <html>
    <body style="background:#0A0908;font-family:Georgia,serif;color:#F0EDE6;max-width:600px;margin:0 auto;padding:0">
      <div style="padding:32px 32px 0">
        <p style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:4px;color:#C4A24A;margin:0 0 4px">BASALITH</p>
        <p style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:2px;color:#8B9196;margin:0">SIGN IN</p>
      </div>
      <div style="padding:32px">
        <p style="font-family:Georgia,serif;font-size:17px;font-weight:300;color:#F0EDE6;line-height:1.8;margin:0 0 28px">
          Use the link below to sign in. It works once, and it expires in an hour.
        </p>
        <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#C4A24A;color:#0A0908;font-family:'Courier New',monospace;font-size:11px;letter-spacing:3px;text-decoration:none;padding:14px 28px;border-radius:2px">
          SIGN IN TO BASALITH
        </a>
        <p style="font-family:Georgia,serif;font-size:15px;font-weight:300;color:#A29B90;line-height:1.8;margin:28px 0 0">
          If you did not ask to sign in, you can ignore this. Nothing happens until the link is used.
        </p>
      </div>
      <div style="padding:16px 32px 32px;border-top:1px solid rgba(240,237,230,0.06);margin-top:8px">
        <p style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:2px;color:#8B9196;line-height:1.8;margin:0">
          BASALITH<br>Heritage Nexus Inc.
        </p>
      </div>
    </body>
    </html>

Same ground, same gold, same two grey tiers as everything above. Send yourself
one and a welcome email back to back to confirm they now read as one product.

## Why 5b is a separate commit

Twenty of these files each carry their own copy of the same shell: the
`<!DOCTYPE html>`, the `background:#0A0908;font-family:Georgia,serif` body, the
wordmark eyebrow, the gold button, the `BASALITH · XYZ` footer. Extracting that
into `lib/emails/theme.ts` plus a `renderEmail()` shell is worth doing, and it
is what stops this drifting again.

It is also a refactor of twenty live customer email senders. This commit is 129
color values and 101 font sizes, mechanical and reversible with a single revert.
That one restructures the senders. If an email breaks next week, you want to
know which of the two did it, and you cannot know that if they ship together.

So: this one first, watch a send cycle, then 5b.

One thing to decide before 5b, which is a question and not a defect: the footer
reads `BASALITH · XYZ` in every template, while the live site is basalith.ai.
If that is deliberate, it stays. If it is a leftover from when basalith.xyz was
the primary domain, 5b is the moment to fix it in one place instead of twenty.

## What is left after this

**Slice 5b.** The theme file and the shared shell, above.

**The iOS app.** `basalith-app/src/theme.ts`, its own pass. That folder is not
connected to this session, so it needs either a connect or a paste.
