# THE NICHE PASS. SIX CHANGES SO THE SITE SPEAKS TO ONE BUYER.

October 25, 2026. Written to disk in basalith-official, uncommitted. 26 files
changed, no new pages, no schema change, no migration. David runs tsc, previews,
commits, and promotes.

David asked for a read of the whole public site against the owner buyer (the
owner of a closely held business: the dealership, the distributor, the dental
group) and for anything that had drifted off it. The read found eight audiences
on zero customers, three words for the same buyer, a pricing page that was two
thirds a consumer estate product, the front door missing from the nav's landing
page, three ways to raise a hand, and three training claims that survived the
October 23 pass. He said fix all six.

**The rule adopted:** a door earns a footer link and an intake option when it
has one paying customer. Until then it lives at a URL sent by hand.

## 1. Footer and intake

| File | Change |
| --- | --- |
| `app/components/Footer.tsx` | Solutions column is now Dependency Report, Succession, Advisors, One Person, The Founding, Pricing. Churches and Acquisition removed. |
| `app/components/Nav.tsx` | "Apply" removed from the mobile menu. |

**Correction to the audit.** The church option on /begin ("I lead a church, as
a pastor or an elder") was already gated: `BeginClient` shows it only when the
visitor arrives from /churches (`?from=churches`). A dealer principal never saw
it. Nothing changed there. The church record flag still works through that
link.

/churches is live and unchanged. Send it by hand.

## 2. One word for the buyer: owner

"Operator" and "founder" (meaning the customer) became "owner" on every
business surface and in the metadata Google shows. Code identifiers, the demo
`founder` audience key, "the founder of Basalith," "The Founding," and David's
own story on /about are untouched.

| File | Replacements |
| --- | --- |
| `app/succession/page.tsx` | 12 operator |
| `app/method/page.tsx` | 14 operator |
| `app/answers/founder-judgment-when-a-business-is-sold/page.tsx` | 14 operator; title, question, and one heading say owner. The slug is a URL and stays. |
| `app/what-is-basalith/page.tsx` | 4 operator, including the meta description |
| `app/faq/page.tsx` | 5 operator; "fictional founder" is "fictional owner" (twice) |
| `app/pricing/page.tsx` | 2 operator; "For founders and partners preparing to step back" is "For the owner or partner preparing to step back"; "before the founder steps back" is owner |
| `app/about/page.tsx` | 2 operator (meta description and body); "For a founder carrying thirty years of judgment" is "For the owner of a dealership, a distributor, or a practice, carrying thirty years of judgment" |
| `app/founding-session/page.tsx` | 1 operator |
| `app/answers/page.tsx`, `lib/answers.ts`, `lib/structuredData.ts` | meta description, the answer question, the `knowsAbout` keyword ("Owner dependence") |
| `app/components/ContrastDemo.tsx`, `app/components/home/HomeContrastDemo.tsx` | the demo toggle label "Founders & Successors" is "Owners & Successors" |
| `app/succession/demo/SuccessionDemoClient.tsx` | "Fictional Founder" is "Fictional Owner" |

## 3. /succession is the owner page

The nav's "For Business" still lands here. The page now runs report,
succession, acquisition.

- Eyebrow: "Basalith for Business · For the owner of a closely held business."
- Primary button: "Start with the dependency report." Second: "See the demo."
  The line under them: "Already planning a handoff? Tell us about the
  transition."
- The two equal transition cards (Acquisition first) are three numbered steps:
  01 The dependency report ($5,000, whoever orders it), 02 Succession, 03
  Acquisition, written to the buyer. The first card is lifted. Heading: "Three
  ways in. Most owners start with the first." One column below 1000px.
- Meta description rewritten in the same order.
- Every button goes to /contact with a topic (section 5).

## 4. /pricing

- Hero: "Pricing, in full." / "For the owner of a business, and for one
  person. Start with the report."
- New first section: The Dependency Report, $5,000, one time, whoever orders
  it, six lines that restate /dependency-report, "Request a report" to
  /contact?intent=report. `REPORT_FEATURES` sits beside `SUCCESSION_FEATURES`.
- Succession second, eyebrow "For Business · Closing the gap."
- Acquisition shrunk from a full section with its own button to a floor note:
  "Buying the company?" with the $50,000 line and a text link.
- The personal header is "For one person," and says the same method works for
  a parent. "Three plans, built to move with you as life changes" is gone.
- `PricingTiers.tsx`: Active, Resting, and Legacy keep their ids, prices, and
  billing. The copy changes: "While you are building the record," "When you
  need to step back," "After you have stepped back." Legacy no longer says
  "billed to estate or family," "for your heirs," or "through your estate." It
  says the record stays open to the people you named, billed to you, your
  business, or your family. The tax note asks a CPA or attorney how the fee is
  treated for you or the business, instead of whether it is an estate planning
  expense. "A life moves through all three" is "Built to move with you."
- The Immutability Vault block: "not after you pass" and "Heirs can add
  context" are gone.
- `app/families/page.tsx` (the footer's "One Person"): title, meta, eyebrow,
  h1, and lead rewritten to the owner at home and his parent. Both buttons say
  "Begin with one call." The rest of the page still speaks to the adult child
  of a parent and needs its own pass.

Left alone: the Pricing FAQ "Can my family access my Basalith after I am
gone?" It answers a question people ask, and the Custodian mechanism it
describes is real.

## 5. One way to raise a hand

Every business button on the public site goes to `/contact` with a topic.
The contact form has two new topics, "Handing my business to a successor" and
"Buying a business," preselected by `?intent=succession` and
`?intent=acquisition`.

`/apply` is not retired. It writes `archive_applications`, which the admin
checkout provisions a Succession client from, so killing it would break how a
Succession client is set up. It is unlinked (nav, footer, sitemap, every page),
`noindex`, and is now the form David sends after the scoping conversation.

| File | Change |
| --- | --- |
| `app/contact/page.tsx` | Two topics. Hero sub names the report. |
| `app/api/contact/route.ts` | `report`, `succession`, `acquisition` share one path: try the intent, fall back to `general` with a tag if the column refuses it, email the founder either way (subject starts UNSAVED if both inserts fail). |
| `app/apply/page.tsx` | `robots: noindex`. |
| `app/sitemap.ts` | `/apply` out, `/dependency-report` in (it returned 200 live on October 25). |
| `app/components/home/HomeClosing.tsx`, `app/succession/page.tsx` (4), `app/pricing/page.tsx` (3), `app/partner/page.tsx`, `app/continuity/page.tsx`, the answers page | every `/apply?type=...` is now `/contact?intent=...` |

## 6. Training claims

| File | Was | Now |
| --- | --- | --- |
| `app/integrity/page.tsx` card | We never use your record to train other people's entities. / What you deposit trains your entity. It does not make anyone else's entity smarter. | Your record answers for you and nobody else. / Your entity answers only from what you deposited. Nothing you put down is read by anyone else's entity, and nothing anyone else put down is read by yours. |
| `app/integrity/page.tsx` "The Voice Layer" | As your record grows a second system learns how you say things... | The entity answers in your own words, drawn from the record. As the record grows, so does what it has of your phrasing... Nothing is learned apart from the record. |
| `app/components/PricingTiers.tsx` Active | Your entity learns from you every week. | Your entity answers from a record that grows every week. |

No code anywhere learns a person's voice; the entity prompt asks for the
person's patterns of expression and the frozen layer supplies their words.

## Found and not changed

- **/families** below the hero: "What a family keeps," "A Basalith can be
  built for anyone whose way of thinking is worth keeping," the family
  subjects list. The page is now half owner, half adult child. Next copy pass.
- **The locked tagline** on the homepage close and "The infrastructure of human
  continuation" in every footer. Left as decided.
- **"Succession Basalith"** on /dependency-report ("A Succession Basalith is
  how you close it") is the first time that phrase appears; /pricing calls the
  product "Succession." Fine, but one of them should win eventually.
- **/begin** still asks "This Basalith is for: me / someone I am helping." The
  second option is how a child starts one for a parent. Kept.
- **`/continuity`** is not in the sitemap and may not be live; its button was
  repointed anyway.

## Gates before promote

1. `npx tsc --noEmit`. Every changed file parses under esbuild; that is syntax,
   not types. The contact route's `TAGS[cleanIntent as string]` and
   `NEW_INTENTS.has(cleanIntent)` are the lines to watch.
2. Preview `/succession` at desktop and 390px: the three step cards should sit
   in a row above 1000px and stack below.
3. Preview `/pricing`: report, succession, the acquisition note, The Founding,
   the three personal tiers.
4. `/contact?intent=succession` and `?intent=acquisition` preselect. Send one
   of each, confirm the email and the rows.
5. Footer on any page: six links, no Churches, no Acquisition. Mobile menu: no
   Apply.
6. `/apply` still loads directly (you will send it by hand) and is not in
   `/sitemap.xml`.

## Rollback

`git checkout --` the 26 files.
