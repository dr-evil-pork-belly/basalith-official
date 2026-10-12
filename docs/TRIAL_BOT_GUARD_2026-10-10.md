# TRIAL FORM BOT GUARD

October 10, 2026. Written in a sandbox against copies of the files read from
David's disk that morning, then written into basalith-official. NOT type
checked in the repo, NOT deployed, NOT seen in a browser. David runs tsc, the
tests, git, and the deploy. This touches a public form, so preview first.

## October 12 addition: the random letters test

Five signups in four days, two on the morning of October 12. All five carry
the same mark: the name is one unbroken run of 16 to 21 letters that changes
from lower case to upper case three or more times, and the optional line is
another. The addresses are real looking and unrelated (msn.com, a dotted
gmail.com, web.de, a school district).

As of 09:52 Pacific on October 12 the public `/begin` page did not show the
hidden field's label when fetched, which suggests the October 10 guard was
not yet deployed. That was read from the page text, not the HTML. Confirm
with `git log -1 -- lib/botGuard.ts` and the Vercel deployment list.

Added to `lib/botGuard.ts`: `looksLikeRandomLetters` and
`randomLetterSignup`. The route runs it as step 1c. When the name is random
letters and the optional line is empty or random letters too, the route
answers `ok` and writes nothing, exactly as the honeypot does. 5 more tests,
15 in the file. All eight strings the script sent are in the test and are
caught. Sixteen real name shapes are in the test and are not.

Two things to know. It is a rule about this one script; its author can get
around it in a minute, and Turnstile is the lasting check. And a refused
signup is told `ok`, so in the very unlikely case of a real person whose name
trips it, they see "Check your mail" and nothing arrives. The route logs each
refusal with the address's domain so a wrong refusal can be found in the
Vercel logs under `[trial/start] random letter signup`.

Cleanup for all of them at once is at the end of the cleanup section.

## What happened

October 9, 06:57 UTC. A script filled `/begin` with twenty random letters in
"Your name" and twenty more in "What brought you here," and a real looking
address at msn.com. `POST /api/trial/start` did what it was built to do: an
auth user, a trial record (`9636f352-c53c-45c5-b0ea-b52606bada08`), a lead
row, and the "Trial started" notice.

The route itself mails nothing to the person. The page asks Supabase for a
sign in link after the route answers. Whether that link went to the stranger
depends on whether the script ran the page or posted straight to the route.
The cleanup section below reads the answer from `auth.users`.

## What changed

| File | Change |
|---|---|
| `lib/botGuard.ts` | New. The honeypot test, the Turnstile check, the hourly ceiling. Pure, fetch injected |
| `lib/botGuard.test.ts` | New. 10 tests |
| `app/api/trial/start/route.ts` | Three checks before any write: 1b, 2b, 2c |
| `app/begin/BeginClient.tsx` | A text input held off screen. The Turnstile widget, only when the site key is set |
| `.env.local.example` | The two new key names |

No migration. No new table. No new dependency.

### 1. Honeypot (on as soon as this deploys)

A text input a person cannot see, tab to, or hear in a screen reader. A script
that fills every input fills it. The route answers `ok` and writes nothing: no
user, no record, no lead, no notice. Because no user exists, the page's link
request to Supabase fails and no mail goes out. This alone would have stopped
the October 9 signup if the script fills every field, which the two random
strings suggest.

### 2. Turnstile (off until two keys are set)

`NEXT_PUBLIC_TURNSTILE_SITE_KEY` on the page, `TURNSTILE_SECRET_KEY` on the
route. Set both or neither.

| State | Behavior |
|---|---|
| Both unset | No script loads. The route skips the check. The form is exactly as before plus the honeypot |
| Both set | The page gets a token in the background and sends it. The route asks Cloudflare. No good token, no trial |
| Site key only | The page sends a token nobody checks. Harmless, not protected |
| Secret only | Every signup is refused, because the page never sends a token. DO NOT do this |

The widget runs in `interaction-only` mode: it takes no room on the page
unless Cloudflare decides to challenge that visitor.

It fails closed. If Cloudflare cannot be reached, the person sees "We could
not confirm your browser. Please reload the page and try again." and no trial
starts.

To turn it on:

1. Cloudflare dashboard, Turnstile, add a widget. Hostname `basalith.ai`.
   Mode: Managed.
2. Put the site key and the secret in Vercel, Production scope. You enter
   them. They are not in this repo and were not seen in this session.
3. For Preview, the real widget will refuse a `vercel.app` hostname unless
   you add it. Cloudflare publishes test keys that always pass, for exactly
   this: site key `1x00000000000000000000AA`, secret
   `1x0000000000000000000000000000000AA`. Preview scope only.
4. Redeploy. `NEXT_PUBLIC_` values are read at build time.

### 3. Hourly ceiling (on as soon as this deploys)

Before creating anything the route counts trial records started in the last
hour. At 30 it answers 429. The existing limiter in `lib/apiSecurity.ts` is
five per IP per hour but lives in memory per serverless instance, which its
own comment says. This one reads the table, so it holds across instances. 30
is a guess well above current volume. It is `MAX_TRIALS_PER_HOUR` in
`lib/botGuard.ts`.

## New sentences a person can see

Two. Both are yours to change.

- "Still checking your browser. Please try again in a few seconds." (the
  person pressed Begin before the token arrived)
- "We could not confirm your browser. Please reload the page and try again."
  (Cloudflare said no, or could not be reached)

## Run, in this order

    npx tsc --noEmit
    npx vitest run lib/botGuard.test.ts
    npm test

Sandbox result, against copies with five local modules stubbed: tsc printed
nothing, 1 file and 15 tests passed (10 on October 10, 15 after October 12). That is not the repo. Paste the real
output. `npm test` matters because other tests may read `BeginClient.tsx` or
the route as text, and the whole suite was not run.

## Check on preview

1. `/begin` looks exactly as it did. No new field, no box, no gap above the
   button.
2. Start a trial with a test address of your own. It works as before.
3. Prove the honeypot. In the browser console on `/begin`:

       fetch('/api/trial/start', { method: 'POST', headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ email: 'honeypot.test@example.com', name: 'Test Bot', subject_line: 'x' }) })
         .then(r => r.json()).then(console.log)

   Expected: `{ ok: true }`, no "Trial started" notice, and

       select count(*) from archives where owner_email = 'honeypot.test@example.com';
       -- 0
       select count(*) from auth.users where email = 'honeypot.test@example.com';
       -- 0

4. With the test keys set on Preview: the same fetch without `subject_line`
   and without a token answers 400.

## Cleanup of the October 9 signup

Paste by hand in the Supabase editor. Read first.

    -- A. The record.
    select id, name, status, owner_name, owner_email, owner_user_id, trial_started_at
    from archives where id = '9636f352-c53c-45c5-b0ea-b52606bada08';

    -- B. Did a sign in link go to that address, and was it used?
    select id, email, created_at, confirmation_sent_at, recovery_sent_at, last_sign_in_at
    from auth.users where email = 'bjstallman@msn.com';
    -- Either sent_at column set: a link was mailed to a stranger.
    -- last_sign_in_at set: someone clicked it. Stop and read before deleting.

    -- C. Is it empty?
    select
      (select count(*) from owner_deposits         where archive_id = '9636f352-c53c-45c5-b0ea-b52606bada08') as deposits,
      (select count(*) from email_replies          where archive_id = '9636f352-c53c-45c5-b0ea-b52606bada08') as replies,
      (select count(*) from storage_backup_objects where archive_id = '9636f352-c53c-45c5-b0ea-b52606bada08') as b2_objects;
    -- All three should be 0.

    -- D. Are there others like it?
    select a.id, a.owner_name, a.owner_email, a.trial_started_at,
           (select count(*) from owner_deposits d where d.archive_id = a.id) as deposits
    from archives a
    where a.status = 'trial'
    order by a.trial_started_at desc;

If A shows status `trial`, C is all zeros, and B shows no sign in, delete. The
order is the expiry job's order (`lib/trialExpiryRunner.ts`): the one FK that
does not cascade, the lead row, the record, then the user only if it holds
nothing else.

    begin;

    delete from email_replies
    where archive_id = '9636f352-c53c-45c5-b0ea-b52606bada08';

    delete from archive_applications
    where email = 'bjstallman@msn.com' and status = 'trial';

    delete from archives
    where id = '9636f352-c53c-45c5-b0ea-b52606bada08' and status = 'trial';

    delete from profiles p
    using auth.users u
    where u.id = p.id and u.email = 'bjstallman@msn.com'
      and not exists (select 1 from archives     a where a.owner_user_id = u.id)
      and not exists (select 1 from contributors c where c.email = u.email)
      and not exists (select 1 from successors   s where s.auth_user_id = u.id);

    delete from auth.users u
    where u.email = 'bjstallman@msn.com'
      and not exists (select 1 from archives     a where a.owner_user_id = u.id)
      and not exists (select 1 from contributors c where c.email = u.email)
      and not exists (select 1 from successors   s where s.auth_user_id = u.id);

    commit;

Then paste back:

    select
      (select count(*) from archives             where id = '9636f352-c53c-45c5-b0ea-b52606bada08') as archive,
      (select count(*) from archive_applications where email = 'bjstallman@msn.com')                 as leads,
      (select count(*) from auth.users           where email = 'bjstallman@msn.com')                 as users;
    -- 0, 0, 0

### All of the script's signups at once (October 12)

Read first. This lists every trial record whose owner name matches the
script's mark and has no deposits:

    select a.id, a.owner_name, a.owner_email, a.trial_started_at,
           u.last_sign_in_at,
           (select count(*) from owner_deposits d where d.archive_id = a.id) as deposits
    from archives a
    left join auth.users u on u.id = a.owner_user_id
    where a.status = 'trial'
      and a.owner_name ~ '^[A-Za-z]{12,}$'
      and a.owner_name ~ '[a-z][A-Z].*[a-z][A-Z].*[a-z][A-Z]'
    order by a.trial_started_at;

Expected as of the morning of October 12: five rows, zero deposits each,
`last_sign_in_at` null on each. Paste it back before deleting. If any row has
a deposit or a sign in, stop.

Then, with the same test in every statement so nothing else can match:

    begin;

    create temporary table bot_trials on commit drop as
    select a.id, a.owner_email, a.owner_user_id
    from archives a
    where a.status = 'trial'
      and a.owner_name ~ '^[A-Za-z]{12,}$'
      and a.owner_name ~ '[a-z][A-Z].*[a-z][A-Z].*[a-z][A-Z]'
      and not exists (select 1 from owner_deposits d where d.archive_id = a.id);

    delete from email_replies        where archive_id in (select id from bot_trials);
    delete from archive_applications where status = 'trial' and email in (select owner_email from bot_trials);
    delete from archives             where id in (select id from bot_trials);

    delete from profiles p
    using auth.users u
    where u.id = p.id
      and u.id in (select owner_user_id from bot_trials)
      and not exists (select 1 from archives     a where a.owner_user_id = u.id)
      and not exists (select 1 from contributors c where c.email = u.email)
      and not exists (select 1 from successors   s where s.auth_user_id = u.id);

    delete from auth.users u
    where u.id in (select owner_user_id from bot_trials)
      and not exists (select 1 from archives     a where a.owner_user_id = u.id)
      and not exists (select 1 from contributors c where c.email = u.email)
      and not exists (select 1 from successors   s where s.auth_user_id = u.id);

    commit;

Run the read query again afterward. Expected: no rows.

The expiry job's fourth guard, `archivists.auth_user_id`, is left out: the
Guide portal was removed September 20 and it was not confirmed that the table
still exists. A user made by this form on October 9 cannot hold that role.

Doing nothing is also safe. The expiry job deletes this record on November 9.
Deleting now keeps the tripwire count and God view clean.

## Known limits, by name

1. **Not seen in a browser.** The off screen input and the widget box were
   never rendered. Look at `/begin` on a phone on preview.
2. **A script can skip your site and call Supabase directly.** The anon key
   is public by design. `signInWithOtp` with `shouldCreateUser: true`, sent
   straight to Supabase, creates an auth user and mails a link without ever
   touching `/api/trial/start`. Nothing in this slice stops that. Two
   dashboard settings do, and neither was read: (a) Authentication, "Allow
   new users to sign up." Every user this codebase creates goes through the
   admin API, which still works with signups off, but confirm the iOS app
   does not rely on it before turning it off. (b) Supabase's own CAPTCHA
   setting, which takes the same Turnstile secret. Turning (b) on means every
   `signInWithOtp` call must send a token: `/begin`, `/archive-login`, the
   succession login, the app. That is its own slice.
3. **Verifying the mailbox before creating the record was not done, on
   purpose.** The route's header comment records why creation happens in the
   POST (recon B3, the zero record owner loop). Moving it is an identity and
   auth surface change, the irreversible class. The three checks here stop
   the script without reopening that.
4. **A honeypot stops scripts that fill every field.** A script written for
   this form specifically will leave it empty. Turnstile is the check for
   that one.
5. **The signed in state of `/begin`** posts to the same route and passes
   through the same checks.
6. **The ceiling refuses real people during a flood.** They see "Too many
   requests. Please wait a while." That is the trade.
7. **Other public forms were not read:** `/api/apply`, `/api/contact`,
   `/api/assessment`, `/api/demo`. The same script can find them.
   `lib/botGuard.ts` is written to be reused there.

## Rollback

Unset both Turnstile keys and redeploy: that check is gone. The honeypot and
the ceiling have no switch. Revert the commit to remove them.
