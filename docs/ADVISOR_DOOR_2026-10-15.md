# The advisor door, October 15, 2026

Written to disk in basalith-official, uncommitted. David runs tsc and the deploy.

## Why

The partner prepay offer sheet (Claude doc, October 14) holds the terms of an
exclusivity deal with an M&A advisory firm. None of those terms belong on the
site: publishing a fee anchors every negotiation at the floor, no firm has
signed, and the non cash payment menu reads badly in public. What does belong
on the site is a door that makes an advisor want the conversation, built from
what is real today. This is that door.

## Files

| File | Change |
| --- | --- |
| `app/partner/page.tsx` | Was a permanent redirect to /contact (Guide era). Now the advisor door. Same structure and tokens as /churches. |
| `app/partner/apply/page.tsx` | Held URL. Now lands on /partner instead of /partner#apply (that anchor no longer exists). |
| `app/components/Footer.tsx` | Solutions column gains "Advisors" linking to /partner, after Churches. |
| `app/contact/page.tsx` | Reads `?intent=` from the URL in an effect and preselects the topic when it is a known value. The partner label now reads "Partnering as an advisor (M&A, CPA, exit planner, attorney)". No Suspense boundary needed; the page still renders statically. |

Not changed: `app/sitemap.ts`. Its header says a route is added only after it
returns 200 in production. Add `/partner` at priority 0.6 after the deploy is
confirmed live, and drop /partner from the excluded list in that comment.

## What the page claims, and where each claim already ships

| Claim on /partner | Already real at |
| --- | --- |
| The Founding, then interviews across eight areas of judgment, seeded on a real moment | /succession |
| Delivered by the founder; scoping, interviews, and the reveal run by Basalith | /succession, founder led delivery copy since September 14 |
| The record belongs to the client; the owner decides who sees it | /data-ownership, entity access model (October 6) |
| The entity answers from the record and says so where the record is silent | /integrity, Control B |
| The first call: one conversation, 15 to 30 minutes, voice or typed; one grounded answer with the deposit shown, one refusal | /begin, lib/foundingProof.ts |
| Acquisition engagements scoped one at a time | /succession ("start at $50,000") |
| Everything we say is on this site or at basalith.xyz | the integrity rule |

## The one claim that is new on the site

"When the introduction comes from you, your client pays the annual plan and
nothing else to start." This is the September 24, 2026 decision that the B2B
Succession Founding fee is waived when a partner introduces the client. It was
decided but never written on the site. /partner is the first public statement
of it. /pricing and /succession do not say it yet. Either add a line there or
be ready to honor it by hand at checkout, because an advisor will quote this
page to a client.

## Deliberately absent

- Any partner terms: fees, discounts, credit banks, exclusivity, territory.
  One sentence says we work with a small number of firms and set terms in
  conversation. No numbers.
- Any named partner firm. None has signed.
- The key person dependency report. Its order, release, buyer view, and
  payment slices are not all live (October 8). Add it when a buyer can order it.
- Nav. Advisors is a footer door, as Churches is.

## Copy rules checked

No em dashes, no hyphenated words in rendered copy ("sell side", "day
ninety", "one time"), no exclamation points, no banned words, none of the
October 2 AI tells, no "archive" in rendered copy. "Entity" is used once, on
a B2B page, which section 8 allows.

## After deploy

1. `curl -sI https://basalith.ai/partner` expecting 200 (was 308).
2. `curl -sI https://basalith.ai/partner/apply` expecting 200 then client redirect to /partner.
3. Open /contact?intent=partner and confirm the topic is preselected.
4. Add /partner to app/sitemap.ts.
5. Decide whether /pricing and /succession state the partner waiver.
