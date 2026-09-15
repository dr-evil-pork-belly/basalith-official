# Copy pass: The Founding, September 15, 2026

The Founding Sequence shipped to production on September 14 and was run end to
end on a real archive (three calls, 38 deposits, both completion emails
received). This pass brings the public site into line with what is now
delivered. Rule applied throughout: describe only what exists. The Founding
Sequence, the first-read call, and the successor session are described. The
day-three proof card and the owner coverage map are not, because neither is an
owner-facing surface yet.

Fourteen files. Full unified diff at `docs/COPY_PASS_FOUNDING_2026-09-15.diff`.
Every file parses. No em dashes or exclamation points introduced. Nothing
deployed.

Also in this commit, from the live test: the owner completion email subject
read "The The Dr Ha Archive" (a prepended "The" on an archive name that
already carries it), fixed in `lib/emails/foundingSequenceComplete.ts`; and the
internal email's "turns answered by voice" counted every linked recording the
archive ever made, now scoped to recordings since the first founding call
opened, in `app/api/archive/b2b-question/answer/route.ts`.

---

## Vocabulary

"Founding Session" is retired everywhere public. The fee and the phase are
"The Founding." The three calls are "the Founding Sequence." The live call
after the calls is "the first read." The business-only live session is "the
successor session." The URL /founding-session is unchanged; only its title
and labels change.

## What changed, by page

### /founding-session (the page about it)

Full rewrite of the body. Was: 90 minutes for a person, longer for a business,
the founder sits with you. Now: three of the hardest calls you ever made, in
your own time, in your own words, speak or type, about ten minutes each, saved
as you go; each call starts with one question and the next few follow what you
say (what tipped it, where it stops, who was in the room, how sure you were);
when the three are in, the founder reads every word and within 48 hours sets
up the first read by video; for a business, one more session by video with the
successor in the room. Title and meta updated. CTA "Request a Founding Session"
became "Begin your archive" (it routes to /apply, which is not where the
founding begins). "After the session" became "After the three calls."

### /pricing

- The six founding deliverables were rewritten to what The Founding delivers:
  your archive opened; the Founding Sequence; the people around you
  (contributors invited by email, no login); what you already have (documents,
  photographs, recordings brought in); the first read (video call with the
  founder); for a business, the successor session. Cut: "Document
  Compatibility Review. Attorney-ready output," "Data Migration," and
  "Custodian Designation." All three were flagged as unverified on September 8
  and have no mechanism behind them.
- "The Founding Session" eyebrow became "The Founding." The Founding paragraph
  no longer says "extended session led in person."
- $5,000 block: "Led in person." became "Three calls in your own words, then a
  first read by video."
- Succession features: "Extended 3-hour founding session" became "The Founding,
  with a live successor session by video."
- "+ $5,000 founding session (one-time)" became "+ $5,000 Founding (one-time)."
  Meta description likewise.

### /succession

Handoff step 01 now describes the sequence and the successor session. Features
list and the $5,000 line as on /pricing. "Every engagement begins with a
founding session" became "with The Founding."

### /families

Step 01 was "A 90-minute session, led in person." Now the three calls, in
their own words and time, speak or type, about ten minutes each, not an
interview.

### /faq

"How does it work" describes The Founding as the three calls plus the first
read by video. "How do I begin" no longer promises to "schedule your Founding
Session"; it says we reply within 48 hours and The Founding starts whenever
you are ready. The footer note reads "before you begin." The pricing answer
says "Founding fee."

### /method, /about, PricingTiers, PricingFAQ

The single-line references updated. /about section 4 is now "Every archive is
read by a person," with the founder reading every Founding Sequence and running
every first read himself today. PricingFAQ's "What exactly is The Founding"
answer lists the sequence, contributors, records, and the first read.

### Nav and Footer

The link label "Founding Session" became "The Founding." Same URL.

### /apply

The personal submit button "Request a Founding Session" became "Request The
Founding."

### /terms §02, surgical

"your first Founding Session" became "The Founding as described in the service
documentation current at the time of your Founding." Nothing else in the terms
changed. Have counsel glance at the sentence once.

### lib/emails/foundingWelcome.ts (Stripe path, not yet live)

"Your Legacy Guide will contact you" and "Your Legacy Guide will walk you
through the first steps" replaced. The default sender name is now "The
founder of Basalith," and the next-steps line points at The Founding.

## Still unverified on the site, unchanged by this pass

The succession feature list still carries "Quarterly calibration sessions,"
"Board-level reporting," and "Priority support," flagged September 8 with
nothing in the code behind them. Product decision, yours. The transfer review
suggested calibration sessions become the founder's review of probe answers;
until something is built, the honest move is to cut all three.

Two contrast notes on /pricing seen while editing, not touched: the founding
deliverable descriptions render at `rgba(250,248,244,0.35)` and the two-layer
line at `0.28`, both under the 0.46 floor in the globals.css table. Same class
as yesterday's milestone ladder fix.

## Deploy

    git add -A
    git commit -m "Copy: The Founding replaces the founding session; email fixes"
    git push origin main        # main is git-wired; this is production

Then read /founding-session, /pricing, and /families in a private window.
