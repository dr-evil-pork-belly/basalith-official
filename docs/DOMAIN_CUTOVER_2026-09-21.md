# The basalith.ai cutover: live DNS state, and the order to do it in

September 21, 2026. Measured, not assumed. Every record below was queried
directly.

    basalith.xyz         MX    1  SMTP.GOOGLE.COM
    basalith.xyz         TXT      v=spf1 include:_spf.google.com ~all
    send.basalith.xyz    MX   10  feedback-smtp.us-east-1.amazonses.com
    send.basalith.xyz    TXT      v=spf1 include:amazonses.com ~all
    _dmarc.basalith.xyz           NXDOMAIN

    basalith.ai          MX   10  inbound-smtp.us-east-1.amazonaws.com
    basalith.ai          TXT      none
    send.basalith.ai     MX   10  feedback-smtp.us-east-1.amazonses.com
    send.basalith.ai     TXT      v=spf1 include:amazonses.com ~all
    reply.basalith.ai    MX   10  inbound-smtp.us-east-1.amazonaws.com
    _dmarc.basalith.ai            NXDOMAIN

DNS for basalith.xyz is at Hostinger, basalith.ai at Porkbun. Both are verified
for sending in Resend, both have Enable Receiving off.

## The answer on Google Workspace: keep it, add an alias

Do not cancel the basalith.xyz Workspace and do not buy a second one. Add
basalith.ai to the existing account as a **user alias domain**. Google's
documentation is explicit: no extra cost per user or group, up to 20 alias
domains. Every mailbox you have starts answering at @basalith.ai as well, and
@basalith.xyz keeps working untouched.

A *secondary* domain is the one that costs money, because it means separate user
accounts with their own licenses. That is not what this is.

Later, if you want the account itself to read as .ai, you can change the primary
domain and leave basalith.xyz as an alias. That is supported and not urgent.

Cancel-and-restart is the worst of the three: onboarding again, a mailbox
migration, and a broken reply path for every email already sent, all at once.

## Finding 1: replies to archive@basalith.xyz were never dropped

`basalith.xyz MX 1 SMTP.GOOGLE.COM`. Google Workspace has held the mail for that
domain the whole time. So every reply to the twenty-eight senders that set no
`Reply-To` has been delivered to Google, not blackholed at DNS.

An earlier note in the email slice said those replies were "almost certainly
being dropped." That was a guess from the repo, and the DNS says otherwise.

Where they went from there depends on whether `archive@` exists in Workspace as
a user, an alias, a group, or a catch-all. Check three places:

    Admin -> Directory -> Users              is there an archive@ user
    Admin -> Directory -> Groups             is there an archive@ group
    Admin -> Apps -> Gmail -> Default routing  is there a catch-all

If any of those exists, there may be months of family replies sitting there
unread, and each one is a memory somebody typed out. That is the first thing to
look at, before any DNS change.

## Finding 2: nobody can email you at basalith.ai today

`basalith.ai MX 10 inbound-smtp.us-east-1.amazonaws.com`, the same SES inbound
host as `reply.basalith.ai`. But Resend shows Enable Receiving **off** for
basalith.ai, so there is no receiving rule behind that MX.

Mail to any @basalith.ai address is therefore handed to SES and then goes
nowhere. The apex has no SPF record either. The product's own domain, the one on
every page of the site, does not accept mail. Anyone who guesses
hello@basalith.ai gets silence or a bounce.

This is also what would have made the from-address flip look like a regression.
Changing `RESEND_FROM_EMAIL` to `archive@basalith.ai` while the apex MX points
at an SES inbound with no rule would mean replies and bounces to the new
address vanish. Adding Workspace as an alias domain is what fixes it, because
it replaces that apex MX with Google's.

## Finding 3: DMARC does not exist on either domain

Both Resend dashboards display a `_dmarc` row reading `v=DMARC1; p=none;` with
no status badge. That is the record Resend *suggests*, not one that is published.
`_dmarc.basalith.ai` and `_dmarc.basalith.xyz` are both NXDOMAIN.

Worth publishing on both, and free. Start at `p=none`, which changes nothing
about delivery, and add a `rua=` so you get the aggregate reports:

    v=DMARC1; p=none; rua=mailto:dmarc@basalith.ai

That mailbox needs to exist, so do it after the alias domain is in.

## Finding 4: SPF is already scoped correctly, so nothing collides

Resend's SPF lives on `send.basalith.ai` and `send.basalith.xyz`, not on the
apex, because SPF is checked against the envelope sender and Resend uses that
subdomain as the return path. Google's SPF lives on the apex.

So adding Google's records to the basalith.ai apex cannot disturb Resend
sending, and `reply.basalith.ai` keeps its own MX on its own subdomain either
way. The capture loop is not in the blast radius of any of this.

## The order

1. Look for `archive@basalith.xyz` in Workspace: user, alias, group, or
   catch-all routing. Read whatever is in there.
2. Add basalith.ai as a user alias domain in Workspace.
3. At Porkbun, on the basalith.ai apex: replace
   `MX 10 inbound-smtp.us-east-1.amazonaws.com` with Google's MX records, and
   add `TXT v=spf1 include:_spf.google.com ~all`. Leave every `send.` and
   `reply.` record alone.
4. Leave Enable Receiving off for basalith.ai in Resend. It is off already, and
   now it is off for the right reason: Google has the apex.
5. Send something to `archive@basalith.ai` and confirm it arrives.
6. Only then change `RESEND_FROM_EMAIL` to `archive@basalith.ai` in Vercel.
   That is the whole sending cutover; every `?? 'archive@basalith.xyz'` in the
   repo is already a dead fallback in production.
7. Publish DMARC on both domains.
8. Leave the basalith.xyz Workspace subscription running for months. Replies to
   already-sent mail keep arriving, and basalith.xyz is becoming the research
   site, so it will want a mailbox of its own regardless.

## Still a code change, not covered by any of the above

`unsubscribe@basalith.xyz`, 39 hardcoded `List-Unsubscribe` headers with no
environment variable behind them. It wants a `RESEND_UNSUBSCRIBE_EMAIL` so it
is never a 39-file edit again, and an address that actually receives.

And slice 5c: the twenty-eight senders with no `Reply-To`. Finding 1 changes
that from a leak into a routing decision. The ones that ask a question or show a
memory want a capture `Reply-To` on `reply.basalith.ai`, like the eleven that
already have one. The ones a person would answer expecting a human, the witness
invitation and the contributor invitation above all, want an address you read.
The heartbeat and internal alerts want no reply path at all.
