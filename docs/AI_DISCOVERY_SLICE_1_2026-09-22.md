# AI DISCOVERY, SLICE 1. ENTITY RESOLUTION.

September 22, 2026. Written to disk, uncommitted. David commits, type-checks,
previews, and promotes.

Recon this implements: `claude/BASALITH_AI_DISCOVERY_RECON_2026-09-21.md` in
the project. This slice is tier one of that document, entity resolution, plus
the robots and sitemap floor. Tier two, the question-shaped pages, is not in
this slice. Tier three, the measurement panel, ships as a scheduled task rather
than as code.

---

## 0. CORRECTION TO THE RECON

The recon document states that basalith.ai carries no JSON-LD structured data.
That is wrong. An `ORG_SCHEMA` constant has been sitting in `app/page.tsx` and
rendering on the homepage. The finding came from a fetch that converts pages to
markdown, which strips `script` tags, so the absence in the converted output
was read as absence on the page.

This is the documented failure mode from the principles file, an unverified
assumption surviving a step it should not have. The reading tool was wrong for
the question. The filesystem was the right source and was not consulted until
the build step.

The recon document has not been edited, because corrections are made publicly
rather than by quietly editing. This section is the correction.

What it changes: this slice fixes and extends existing structured data rather
than introducing it. The rest of the recon holds. The robots.txt, sitemap.xml
and llms.txt 404s were confirmed a second time against `public/`, which
contains none of them.

---

## 1. FILES WRITTEN

### basalith-official

| File | State | What it does |
| --- | --- | --- |
| `lib/structuredData.ts` | new | Organization and WebSite nodes, FAQPage builder, canonical origin constant. |
| `app/layout.tsx` | edited | Emits Organization and WebSite on every route. |
| `app/page.tsx` | edited | Inline `ORG_SCHEMA` removed. It now comes from the layout. |
| `app/what-is-basalith/page.tsx` | new | The page that gives the name a textual anchor. Carries FAQPage schema. |
| `app/faq/page.tsx` | edited | FAQPage schema added. Each JSX answer gained a `plain` twin for the schema. No visible copy changed. |
| `app/components/Footer.tsx` | edited | One link added under Company. |
| `app/robots.ts` | new | Allow all, deny the authenticated surface, declare the sitemap. |
| `app/sitemap.ts` | new | Eighteen confirmed public routes. |

### basalith-xyz

| File | State | What it does |
| --- | --- | --- |
| `app/layout.tsx` | edited | Reciprocal Organization node pointing back at basalith.ai. |

No schema change. No API change. No auth change. Nothing in `lib/` other than
the new file. No dependency added.

---

## 2. WHAT CHANGED IN THE ORGANIZATION BLOCK, AND WHY

The previous block was not broken, but four things in it were working against
the problem the recon found.

**`logo` pointed at a file that does not exist.** It read
`https://basalith.ai/logo.png`. There is no `logo.png` in `public/`. The
directory holds `favicon.ico`, three PNG favicons, `apple-touch-icon.png`,
`icon-192x192.png`, `icon-512x512.png`, `site.webmanifest`, and two photographs.
Repointed at `icon-512x512.png`, which is real and is already the OpenGraph
image. A schema property pointing at a 404 is a quality signal against us.

**The description led with families and used pre-pivot vocabulary.** It said
Basalith "builds cognitive reference entities from the way a person thinks,
decides, and sees the world. For families preserving generational wisdom and
organizations preserving institutional knowledge." That string is one of the
things an answer engine quotes back. Google AI Mode currently quotes the
family sentence from the homepage to anyone asking about the company, which
means a B2B buyer's first machine-written impression of us is the consumer
story. Rewritten to the B2B frame with the second door stated second.

**There was no `disambiguatingDescription`.** That field exists for exactly the
case where a name collides with a better known word. Google resolves the query
`what is Basalith` entirely to basalt and returns nothing of ours. The field
now says what the name is and what it is not, in the vocabulary a search engine
indexes.

**`sameAs` held two URLs.** basalith.xyz and basalith.life. It now also holds
the OSF registration and the ORCID record, both of which are public, durable,
and third-party hosted, which is what makes them worth more than another domain
we own. basalith.xyz now points back, so the pair is reciprocal.

Also added: `@id` on both nodes so they can be referenced rather than repeated,
`knowsAbout` so the entity attaches to a subject area, `sameAs` on the founder
Person carrying ORCID, and a `WebSite` node publishing to the Organization.

Not touched: `foundingDate`, `address`, `contactPoint`, `legalName`. See open
items.

---

## 3. WHAT I FOUND AND DID NOT CHANGE

Surfacing these by name rather than fixing them, because each is a copy or an
auth decision.

**The FAQ contradicts the September 17 operating model.** The last entry says
"How do I begin? Apply. We review every application ourselves and will be in
touch within 48 hours," and the page CTA is "Apply to begin" pointing at
`/apply`. The September 17 decision was that B2C is product-led with no
application approval, a free first call and the proof card before payment, then
self-serve Checkout, with `/begin` as the entry. Either the FAQ is stale or the
decision moved. I left the copy exactly as it is, including in the new schema,
because publishing schema that contradicts the visible page would be worse than
either version alone. This needs your call before the schema goes live, since
structured data makes a stale claim machine-readable.

**`proxy.ts` will run a Supabase auth check on `/robots.txt` and
`/sitemap.xml`.** The matcher excludes `_next/static`, `_next/image`,
`favicon.ico` and image extensions, and nothing else. Neither new route is
under a `PROTECTED` prefix, so both still serve correctly. The cost is an auth
round trip on every crawler request for those two files. Adding them to the
matcher exclusion is a one-line fix. I did not make it. `proxy.ts` is the auth
surface, the irreversible class, and it is the file that produced the June 17
redirect loop from a `startsWith` prefix bug. It should be changed on purpose,
alone, and verified live, not carried in on a marketing slice.

**`/privacy` and `/privacy-policy` both exist as routes.** The footer links
`/privacy`. The sitemap lists `/privacy` only. If `/privacy-policy` is live and
reachable, two URLs are serving one document and that splits the signal. Worth
a 308 from one to the other, which is a separate change.

**Eleven routes exist in `app/` that the sitemap deliberately omits.** `/asset`,
`/press`, `/partner`, `/continuity`, `/custodianship`, `/posthumous-archive`,
`/privacy-policy`, `/join-archivists`, `/login`, `/register`, `/resume`,
`/game`, and the `(auth)`, `(curator)` and `(dashboard)` route groups. Several
are known 308s, one is the unlinked `/asset` page that carried "Digital Clone"
in September. I could not confirm which are live and public from the filesystem
alone, and a sitemap listing a URL that 404s or redirects teaches a crawler
that the file is unreliable. Add any of them to `app/sitemap.ts` once confirmed
to return 200.

---

## 4. OPEN ITEMS FOR YOU

**Confirm the pronunciation before commit.** The new page prints "It is said
BAS-uh-lith." You have never written the phonetic spelling anywhere I can find,
so that string is mine, not yours. Google's own "people also search for" line
on the branded query lists "Basalith pronunciation," so the line earns its
place, but the spelling has to be yours. Change it or cut it.

**Confirm `foundingDate: '2026'` and the Delaware address.** Both were already
in the block and I left them. The footer states "Heritage Nexus Inc. Registered
in Delaware, United States" on every page, so the address is consistent with
live copy. Corporate formation was still completing as of the last note I have,
and structured data asserting a founding date is a claim in a machine-readable
field. If formation has closed, this is fine as is. If not, cut `foundingDate`
until it has.

**LinkedIn and SSRN are missing from `sameAs` on purpose.** Both would be
strong entries. I did not add either, because I could not confirm that a
LinkedIn company page for Heritage Nexus Inc. exists or that an SSRN author
page is live, and an unreachable URL in `sameAs` is worse than a short array.
Add them the day they exist.

**Basalith Holdings Corp.** A live United States company operates under the
name in food grade and hazmat tanker transport at `basalithholdings.com`, and
holds the `.com`. This surfaced in recon. It belongs in front of counsel with
the trademark question, before launch. This document has no view on it.

---

## 5. GATES BEFORE PROMOTE

1. `npx tsc --noEmit` clean, except the five known pre-existing errors in
   `lib/frozenLayer.test.ts` since September 10.
2. Preview build, then confirm in the preview:
   - `/what-is-basalith` returns 200 and renders.
   - `/robots.txt` returns 200 and names the sitemap.
   - `/sitemap.xml` returns 200 and every URL in it returns 200.
   - The page source of any route contains both the Organization and the
     WebSite script blocks.
   - `/faq` renders identically to production. No visible copy changed, so any
     visible difference is a defect.
3. Run the Organization and FAQPage blocks through Google's Rich Results Test
   before promote. Schema errors are silent in the browser.
4. After promote, request indexing of `/what-is-basalith` in Search Console and
   submit the sitemap. This is the one step that cannot be done from a repo.

No probe gate applies. Nothing here touches `lib/entitySystemPrompt.ts`,
`lib/verifyGrounding.ts`, or any model-facing prompt, so the same-day A/B rule
and the three regression probes are not in scope for this slice.

---

## 6. WHAT THIS SLICE DOES NOT DO

It does not make us appear in an unbranded answer. The recon showed Google AI
Mode writing a four-part playbook on capturing founder judgment through an
acquisition, citing timeless.ai and two LinkedIn posts, with Basalith absent.
Nothing in this slice changes that. This slice makes the name resolve to the
company. Tier two, the question-shaped pages, is what competes for the answer,
and it should not ship before the name resolves, because driving strangers to a
name that returns volcanic rock is worse than not driving them at all.

---

## 7. ADDENDUM. SEARCH CONSOLE VERIFICATION.

Added to `app/layout.tsx` on September 22, after the rest of this slice was
written.

A URL-prefix property for `https://basalith.ai` was created in Google Search
Console under mrdavidha@gmail.com. Ownership is proved by the HTML tag method
rather than the HTML file method Google suggests by default, because a token in
the metadata object travels with the code and a loose file in `public/` is
something a future cleanup pass deletes without knowing what it was.

The token lives in `metadata.verification.google` and renders as
`<meta name="google-site-verification" content="...">`.

**It must not be removed.** Deleting it de-verifies the property. Nothing in
the app breaks when that happens, which is the problem: the sitemap submission,
the URL Inspection tool and the index coverage reports all stop working and
nothing reports it. The comment above the token in `layout.tsx` says the same
thing at the place someone would delete it.

Sequence, which matters: the token has to be live in production before the
VERIFY button is clicked, because Google fetches the page to check. So this
rides out with the rest of the push, and verification happens after.

Two things this does not cover. It is a URL-prefix property, so it sees
`https://basalith.ai` and not `www.` or any subdomain. The Domain property
that covers everything needs a DNS TXT record under "Domain name provider" and
is worth adding later. And basalith.xyz is a separate property that has not
been created at all, which matters because the white paper is the other half of
the entity and its indexing is currently unobserved.
