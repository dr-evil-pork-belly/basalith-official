# Churches page, October 12, 2026

## What changed

- New route `/churches` (`app/churches/page.tsx`). Static server page, no data, no API, no schema.
- `app/components/Footer.tsx`: one new link, "Churches", under Solutions, after Individuals and Families.

Nothing else was touched. `app/sitemap.ts` is unchanged on purpose: its own rule is to add a route only after it returns 200 in production.

## Why

A pastor who looked at the site said it had nothing for churches. The page is the reply. It ends in the free first call at `/begin`, so his response is something he does.

## Where each claim comes from

| Claim on the page | Already real at |
| --- | --- |
| First call is fifteen to thirty minutes, by voice or typed | `/begin` metadata and `BeginClient.tsx` |
| After the first call it answers one question in your own words, shows the words it drew from, and declines one | The founding proof (`lib/foundingProof.ts`), same sentence as `/begin` |
| Where you never took a position, it is built to say so | `/families` step 04, `/integrity` Memory Vault card |
| Nothing is owed until your Basalith has answered you | Homepage doors (`HomeDoors.tsx`), `/families` close |
| No application and no approval | `/families` close |
| Never shared, sold, or used to train another company's model. Export at any time | `/families` trust cards, `/integrity` |
| Nothing reaches the record unless you or someone you invite puts it there | Deposits come from the owner and invited contributors only |
| A language model made by one of the large labs sits underneath | The stack. New disclosure on this site |

Not on the page: any church pricing, any claim that a church uses Basalith, any trial deletion window, any grief framing, the word "entity", the word section 8 keeps off the site.

## Calls that are the founder's to keep or cut

1. **"What is underneath."** The page says plainly that a lab's language model sits under the product. `/families` says "No general AI speaks for the record." The two can both be true, but a careful reader may ask. The church page is the more exact of the two.
2. **"From the founder."** Written in his voice from what he said happened. Cut it if he would not say it that way.
3. **"It does not preach."** Stated as what the product was built for. It is not a tested refusal. Nobody has asked a Basalith for a sermon and pasted the result.
4. **The church handover door** goes to `/contact`. The Succession product's questions are written for a business. A church handover is a conversation first, and the page says so.

## After deploy

- `curl -sI https://basalith.ai/churches` expecting 200.
- Then add `/churches` to `app/sitemap.ts`.
