# THE BEGIN PATH. RETIRING THE PERSONAL APPLICATION.

September 22, 2026. Written to disk, uncommitted. David commits, type-checks,
previews, and promotes.

Triggered by one line. David said "We review every application ourselves and
will be in touch within 48 hours" no longer applies. Recon found the claim in
five reader-facing places and found something larger underneath it.

---

## 0. THE FINDING UNDER THE LINE

`/begin` was linked from nowhere.

Zero occurrences of `href="/begin"` anywhere in `app/`. The self-serve front
door built in slice A on September 17 and merged straight to production has had
no entrance from the public site since the day it shipped. Every Begin control
on the marketing site pointed at `/apply`, which routed the visitor into an
application form that promised a human review the operating model no longer
performs.

The buttons already said the right thing. Nav says "Begin." `/about` and
`/founding-session` say "Begin your Basalith." `/families` and `/method` say
"Begin a family Basalith." Only `/faq` said "Apply to begin." So this was never
a labeling problem. Seven links and one label were pointing at the wrong door.

The copy and the code had been separated since September 17 and nothing caught
it, because nothing reads a page and a route together.

---

## 1. WHAT THE PERSONAL PATH ACTUALLY DOES

Confirmed by reading the route, not by memory.

`/begin` is one page. Name, email, and "This Basalith is for: me / someone I am
helping." It sends a magic link, then opens the first call. The page says:
"Tell us about the hardest call you ever made. Fifteen to thirty minutes, by
voice or typed, on your own time. Nothing you say has to be important. When you
are done, your Basalith answers one question in your own words and declines one
it has no grounds for. That is how you know it is you."

No application. No approval. No card.

`/begin/tier`, `/begin/details`, `/begin/review` and `/begin/confirmed` are
already retired 308s from September 19. They were the old three-step
application flow.

There is no checkout-session route in the repo. `app/api/stripe/` contains a
webhook and nothing else, and no route under `app/api/archive/` creates a
session. Slice C, owner-initiated Checkout, is not built. So no copy in this
pass says or implies that anyone can pay online yet. The furthest any new
sentence goes is "before anything is owed," which is true and claims no
mechanism.

---

## 2. THE DECISION

Two calls, both David's, made September 22:

1. Fix the whole B2C path, not the FAQ line alone.
2. `/apply` becomes business only. The "A person or family" option comes out.

The reasoning behind the second: a scoping call for a succession or an
acquisition is real work done by a person, so the 48 hour reply on that branch
is a promise we keep. On the personal branch it was describing a review that no
longer happens.

---

## 3. FILES WRITTEN

| File | What changed |
| --- | --- |
| `app/components/Nav.tsx` | Both Begin CTAs, desktop and mobile, now point at `/begin`. |
| `app/families/page.tsx` | Both CTAs point at `/begin`. The line "A personal Basalith is accepted by application. We review every one ourselves." is replaced. |
| `app/faq/page.tsx` | "How do I begin?" rewritten for both doors. CTA points at `/begin` and reads "Begin your Basalith." The "Ask it in the application" line now points at `/contact`. |
| `app/about/page.tsx` | CTA points at `/begin`. |
| `app/founding-session/page.tsx` | CTA points at `/begin`. |
| `app/method/page.tsx` | "Begin a family Basalith" points at `/begin`. |
| `app/apply/page.tsx` | Title and description rewritten for business. |
| `app/apply/ApplyForm.tsx` | `legacy` removed from the type union. Two type buttons instead of three. Dead personal branches cut. One line added pointing a personal visitor at `/begin`. |
| `docs/BEGIN_PATH_2026-09-22.md` | This file. |

Untouched on purpose: every `/apply?type=succession` and `/apply?type=acquisition`
link on `/succession`, `/pricing` and in the footer. Those are the business door
and they are correct.

---

## 4. NEW AND CHANGED COPY, IN FULL

So you can approve the words rather than read a diff.

**FAQ, "How do I begin?"**

> For a person or a family, begin directly. Your name, your email, and the
> first call: fifteen to thirty minutes, by voice or typed, on your own time.
> There is no application and no approval. When the call is in, your Basalith
> answers one question in your own words and declines one it has no grounds
> for. For a business succession or an acquisition, it starts with a
> conversation instead, and we reply within 48 hours.

Every clause is drawn from `/begin` itself or from the business branch of
`/apply`. Nothing new is asserted.

**FAQ, closing line**

> Still have a question? Write to us and a real person answers within 48 hours.
> You do not have to ask before you begin.

"A real person answers within 48 hours" is the claim `/contact` already makes in
two places, so this is consistent rather than new.

**Families, under the closing CTA**

> No application and no approval. Your name, your email, and the first call.
> You see what your Basalith does with your own words before anything is owed.

**Apply, metadata**

> Talk to us about a business changing hands
>
> For a succession or an acquisition, tell us about the transition and we will
> reply within 48 hours. For a person or a family, begin directly at /begin.

**Apply, new line under the intro**

> Building one for a person or a family instead? Begin yours now.

---

## 5. WHAT I FOUND AND DID NOT CHANGE

**`app/api/apply/route.ts` still accepts `legacy`.** Left alone deliberately.
It defaults an unknown `applyType` to `legacy`, and there are stored rows with
that value. Removing it from the form does not break the route, and an old
`/apply?type=legacy` link now lands on succession rather than 404ing. Changing
the API would be a data decision, not a copy one.

**`form.subject` is now dead state.** The "Who this Basalith is built around"
select was the only thing that set it. It is still in the state object and
still posted as an empty string, which is harmless and keeps the diff small.
Cut it whenever the API stops reading it.

**`/founding-session` line 84 keeps its 48 hours.** "When the three calls are
in, the founder of Basalith reads every word. Within 48 hours we set up your
first read." That is not the application gate. It is the launch cohort watch
mode from September 17, where you read every first call and take every first
read yourself. It is still true. It stops being true when the first read
sunsets, and that line has to change on the same day.

**Twelve em dashes in JSX comments** in `Nav.tsx`, `method/page.tsx` and
`about/page.tsx`. All pre-existing, all in `{/* ... */}` comments, none
rendered. The standing rule covers code comments, so they are violations, but
they have nothing to do with this pass and rewriting them here would muddy the
review. Separate cleanup whenever you want it.

---

## 6. GATES BEFORE PROMOTE

1. `npx tsc --noEmit` clean except the five known `lib/frozenLayer.test.ts`
   errors. The `legacy` removal narrows a union, so this is the step that
   catches any reference I missed.
2. In preview, click Begin from Nav on desktop and mobile, from `/faq`,
   `/families` twice, `/about`, `/founding-session` and `/method`. Every one
   should land on `/begin`.
3. Load `/apply` and confirm two type buttons, not three, and that the personal
   line links to `/begin`.
4. Load `/apply?type=legacy` and confirm it lands on succession rather than
   breaking.
5. Load `/apply?type=acquisition` and `/apply?type=succession` and confirm the
   right branch still preselects. That param broke once before on the Next 16
   `searchParams` promise change.
6. Submit one business application in preview and confirm the success copy
   reads correctly and the admin email still arrives.
7. Confirm the FAQ page still renders and that the FAQPage structured data
   emitted from the September 22 entity slice now carries the new "How do I
   begin?" answer. The schema reads from the same array, so it updates itself,
   but it should be eyeballed once in the page source.

No probe gate applies. Nothing here touches `lib/entitySystemPrompt.ts`,
`lib/verifyGrounding.ts`, or any model-facing prompt.

---

## 7. THE STANDING LESSON

The September 17 decision changed the operating model and the code followed it
the same day. The copy did not, and the link graph did not, and for five days
the site sold a process the company had stopped running while hiding the one it
had started.

Nothing in the build discipline catches that class. The probes check the model.
`tsc` checks the types. Nothing checks whether a sentence on a page still
describes what the routes do. Worth a standing habit: when an operating model
changes, the same session greps the rendered copy for the old promise before it
closes.
