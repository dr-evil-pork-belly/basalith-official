# THE ANSWER LIBRARY. SLICE 1, THE PATTERN.

September 22, 2026. Written to disk, uncommitted.

This is tier two of `docs/AI_DISCOVERY_SLICE_1_2026-09-22.md`: competing for the
unbranded answer. Slice 1 of that tier is one page plus the shape every other
page will take, so the shape can be approved before seven more are written.

---

## 0. WHY ONE PAGE AND NOT EIGHT

The recon listed eight candidate questions. Writing all eight now would put
several thousand words of new marketing copy in front of you at once, and copy
decisions are yours. Skeleton before build. This slice is the skeleton, built
and working, with one real page in it.

If the shape is right, the remaining seven are mostly writing.

---

## 1. WHAT IS ON DISK

| File | State | What it is |
| --- | --- | --- |
| `app/components/AnswerPage.tsx` | new | The shared shape. Renders the page and emits FAQPage schema from the same strings. |
| `lib/answers.ts` | new | The registry. One list, read by the index and the sitemap. |
| `app/answers/page.tsx` | new | The library index. |
| `app/answers/founder-judgment-when-a-business-is-sold/page.tsx` | new | The first answer. |
| `app/sitemap.ts` | edited | Adds `/answers` and maps the registry, so answer pages cannot be missing from the sitemap. |
| `app/components/Footer.tsx` | edited | One link added under Company. |

---

## 2. THE SHAPE, AND WHY EACH RULE IS THERE

`AnswerPage` enforces five things structurally rather than by discipline.

**The question is the H1.** Not a headline about the question. This is the
single thing timeless.ai did that we did not, and it is why their page is in
the answer and ours is not.

**The answer is the first thing under it.** Self-contained, no setup. The
published study of a hundred AI Overview citations found the majority of quoted
snippets come from the opening third of a source page, with a sharp drop after
that. A page that builds to its point does not get quoted.

**Every section heading is a question someone types.** Answer engines fan a
query out into several related searches. Headings phrased as questions give
those searches something to match.

**Every section body stands alone.** A retrieval system may take one paragraph
and leave the rest, so no paragraph may depend on the one above it.

**The schema is built from the rendered strings.** `AnswerPage` constructs the
FAQPage block from the same `lead` and `sections` it renders. The two cannot
drift, which was the failure mode worth designing out.

---

## 3. THE FIRST PAGE

Route: `/answers/founder-judgment-when-a-business-is-sold`
Question: "What happens to a founder's judgment when the business is sold?"

Chosen because it is the exact territory where we were absent. On September 21,
Google AI Mode answered the acquisition version of this question with a full
four-part playbook, described our product generically in its third section, and
cited timeless.ai, Qubit Capital, Serotonin Legal, Buttondown and two LinkedIn
posts. Basalith appeared zero times.

**Nothing on the page is new.** Every claim restates something already live,
and the file carries a provenance comment mapping each one to its source page:

- "usually does not transfer" and "systems and the client list" from `/succession`
- "the earnout assumes the judgment comes with the building" from `/succession`
- "20 real business scenarios and 29 decision questions across 8 domains" from `/succession`
- "every response is scored" from `/succession` and `/faq`
- "trained only on one operator's deposits, no general model speaks for the record" from `/succession` and `/faq`
- "locked at transition, the successor adds context, nobody rewrites" from `/succession` and `/faq`
- "where the record is silent, it says so" from `/integrity` and `/faq`
- pricing from `/pricing` and `/faq`

If any of those sources changes, this page changes in the same pass. That is
the cost of a restating page and it is worth paying, because a page that
introduces its own claims is a second place for the integrity rule to fail.

---

## 4. THE REMAINING SEVEN

Not written. In the order I would write them:

1. How do you do diligence on key person risk?
2. Can you document why a founder makes decisions, not just what they do?
3. How do CPA firms transfer a retiring partner's client judgment?
4. What should a buyer ask a founder during the transition period?
5. What is judgment transfer, and how is it different from documentation?
6. How do you measure whether a knowledge transfer actually worked?
7. What does an exit planner do about founder dependence after they diagnose it?

Number three is the Fisher and McGill beachhead in the form a person types it.
Number seven is the advisor gap from the GTM doc in the form a person types it.
Number six is the one only we can answer honestly, because the measurement is
filed publicly, and it should probably not be written until the verification
surface ships.

---

## 5. GATES BEFORE PROMOTE

1. `npx tsc --noEmit` clean except the five known `lib/frozenLayer.test.ts`
   errors.
2. In preview: `/answers` returns 200 and lists one entry.
   `/answers/founder-judgment-when-a-business-is-sold` returns 200 and renders.
   The footer link works from any page.
3. `/sitemap.xml` now contains twenty URLs, including both new routes.
4. Run the answer page through Google's Rich Results Test. It emits a FAQPage
   block with eight questions.
5. Read the page once on a phone. The H1 is long by design and has to hold.

---

## 6. ONE THING TO DECIDE

The page does not appear in the top navigation, only in the footer and the
sitemap. That is deliberate for one page. Once there are five or six, `/answers`
probably earns a nav slot, and that is a design call rather than a build one.
