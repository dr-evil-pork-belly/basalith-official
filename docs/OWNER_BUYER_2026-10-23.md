# THE OWNER BUYER. HOMEPAGE, SUCCESSION, AND THE DEPENDENCY REPORT DOOR.

October 23, 2026. Written to disk in basalith-official, uncommitted. David runs
tsc, previews, commits, and promotes.

## Why

David read the Zidar and Zwick book excerpt ("The Everywhere Millionaire") and
named its subject as the B2B target: about 3 million owners of closely held
businesses (dealerships, distributors, dental groups), averaging around $25
million each. The paper under the book (Smith, Yagan, Zidar, Zwick, QJE 2019)
finds that pass through profit falls by three quarters after the owner retires
or dies.

Five calls came out of that conversation. David's answers, same day:

1. One buyer, one method, not two funnels. Addressed in copy (below). The
   product half (household plan, gift) is not built, so the site cannot offer
   that path yet.
2. Acquisition is a showcase, not the engine. Strategy only. No site change.
3. The dependency report is the front door for owners. Chose a request door
   that routes to David. No order button, because payment, release, and the
   buyer's view are not built.
4. The homepage was speaking to the wrong buyer. Chose "owner" in place of
   "founder" on the category line and the B2B pages only ("The Founding" keeps
   its name), and three named examples with no single vertical yet.
5. Price. Chose a written analysis, no price changes. See
   claude/BASALITH_OWNER_PRICING_2026-10-23.md in the project.

## Files

| File | Change |
| --- | --- |
| `lib/copy.ts` | `CATEGORY_LINE` is now "The owner's judgment, kept when a business changes hands. By acquisition or succession." |
| `app/page.tsx` | Title and description say owner. |
| `app/layout.tsx` | Default, OpenGraph, and Twitter descriptions say owner (three identical strings). |
| `app/components/home/HomeHero.tsx` | Sub copy opens "In a dealership, a distributor, a dental group, the owner knows when to walk from a deal..." Aria label says owner. |
| `app/components/home/HomeDoors.tsx` | Business door rewritten around the report (below), with a secondary link to /succession. Personal door says work and home are one place and that it works for a parent. New optional `also` link on a door. |
| `app/components/home/HomeSuccession.tsx` | New block "What the tax records show" between the editorial spine and the pillars, with the citation linked to NBER. |
| `app/components/home/HomeClosing.tsx` | Rendered labels "For owners and successors" and "Owners & Successors". The `founder` audience key is unchanged. |
| `app/dependency-report/page.tsx` | New. The request door. |
| `app/contact/page.tsx` | New topic "A dependency report for my business," preselected by `?intent=report`. |
| `app/api/contact/route.ts` | Accepts `report`. Stores it as intent `general` with `[Dependency report request]` at the front of the message, and sends David an internal notice under `after()`. |
| `app/components/Footer.tsx` | "Dependency Report" link under Succession. |
| `app/succession/page.tsx` | Six reader facing "founder" become "owner". Hero sub carries the three examples. New line under the demo note: "No handoff planned yet? Start with the dependency report." |

No schema change. No migration. Nothing touches `lib/entitySystemPrompt.ts`,
`lib/verifyGrounding.ts`, or any model facing prompt, so no probe gate applies.

## The copy

### Homepage, business door

Label: If you own the business
**Find out how much of it runs through you.**
Eight calls with you, one for each area of how the business runs. The report
shows which decisions run through you, and which of those are on the record.
You read it first.
[See the dependency report] then the line: Handing the business to a successor
or a buyer? See how succession works

### Homepage, personal door

Label: One person
**For your own judgment.**
The calls you make at work and at home come from the same place. It starts with
one call, and nothing is owed until your Basalith has answered you. It works the
same for a parent whose thinking you want to keep.

### Homepage, research block

What the tax records show
> When the owner of a closely held business retires or dies, its profits fall
> by about three quarters.

From U.S. tax records linking 11 million firms to their owners. Smith, Yagan,
Zidar, and Zwick, Capitalists in the Twenty-First Century, Quarterly Journal of
Economics, 2019. What leaves is the work, the relationships, the reputation,
and the judgment. Judgment is the part that can be put on the record.

The paper's "human capital" is everything embodied in the owner (labor,
network, recruiting, reputation), so the copy does not claim the loss is all
judgment.

### /dependency-report

Hero: How much of the business leaves when you do? / The dealership, the
distributor, the dental group. The systems are on paper. The calls that make
them work are in one head. The report shows you which calls those are, before a
buyer, a lender, or your own family has to find out. [Request a report]

Then: the research block; four numbered steps (eight calls, two readings
measured twice, silent areas and no score, you read it first); who can order it;
three limits; "The report names the gap. A Basalith closes it." with links to
/succession and /begin; "A short conversation, then the first call."; the
founder line.

What each mechanism sentence points at is in the header comment of the page.

## Calls in here that are yours

- **"You read it first" and "Nobody else sees it unless you decide to share
  it."** True today because there is no buyer view. When release ships, this
  line has to match it.
- **"The founder reads every one."** That is you, by hand, until it is not.
- **"You can order it for yourself."** You decided October 9 that an owner can
  order his own. The invitation page at `/assessment/begin` still says "Someone
  considering this business has asked for a report on how it runs through
  you." That is wrong for an owner who ordered his own. Change it before the
  first self ordered report.
- **No price on the page.** The $5,000 and $1,500 figures are decided but
  nothing charges them, and the pricing note leaves the owner price open.
- **The questions.** The door is up, but the calls behind it still run the
  slice 4b set you called generic on October 8. Until the conversational
  interview lands, take reports from warm owners who will tell you what missed,
  not from a room.
- **The citation title keeps its hyphen** ("Twenty-First"). It is the paper's
  title; changing it would misquote.

## Found and not changed

- **`/succession`, the trust list:** "Every model is trained only on one
  operator's deposits." Nothing is trained per client (the September 28
  continual learning decision is record level, never weight updates). This
  reads as a training claim and may break the integrity rule. Worth a read.
- **`/contact`** still shows `legacy@basalith.xyz` beside the button. The
  October 12 sitewide address change to hello@basalith.ai did not reach it.
- **`contact_requests`** is not in `supabase/migrations`. Paste
  `select pg_get_constraintdef(oid) from pg_constraint where conrelid = 'contact_requests'::regclass;`
  and if there is no CHECK on `intent`, the route can store `report` directly.
- **Sitemap.** `/dependency-report` is not in `app/sitemap.ts`. Per that file's
  rule, add it after it returns 200 in production.
- **`/partner`** says the report "is not offered here, because its order flow
  is not live." Still true of an order flow. The advisor page could now link the
  door. Left alone.
- **`/families`** still pitches family memory. An owner buying for a parent
  lands there from the homepage personal block.

## Gates before promote

1. `npx tsc --noEmit`. Clean except the five known `lib/frozenLayer.test.ts`
   errors. Every changed file parses under esbuild here. That is syntax, not
   types. In particular confirm `after` imports from `next/server` in the
   contact route the way it does elsewhere.
2. Preview the homepage at 390px and desktop. The business card now carries a
   second link under its button; check the two cards still line up.
3. Load `/dependency-report` at both widths.
4. Load `/contact?intent=report`. The topic should preselect. Send one test
   request. Confirm the internal notice arrives and the `contact_requests` row
   has intent `general` and the tagged message.
5. Send one ordinary contact request and confirm nothing changed for it.
6. Click every new link: both door buttons, the succession line under the
   business door, the footer link, the line under the /succession demo note,
   and both links in "After the report."

## Rollback

`git checkout --` the eleven edited files and delete
`app/dependency-report/`. No migration.
