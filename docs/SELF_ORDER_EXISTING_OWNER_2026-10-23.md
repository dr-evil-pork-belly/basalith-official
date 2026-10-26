# SELF ORDERS FOR EXISTING OWNERS, THE SCORING CLAIM, AND THE TERMS ADDRESS.

October 23, 2026, afternoon. Follows docs/OWNER_BUYER_FIXES_2026-10-23.md.
Written to disk in basalith-official, uncommitted. David runs tsc, the tests,
previews, commits, and promotes.

## 1. An owner with a Basalith can order a report on himself

Built as option (a) of the October 9 recon
(claude/BASALITH_B2C_PRODUCT_LINE_RECON_1_2026-10-09.md, section O3), which
David said yes to on October 9: a second, separate assessment record under the
same sign in. His paying record is never pointed at, so nothing built for
assessment records (the 90 day purge, when it exists) can ever reach it.

| File | Change |
| --- | --- |
| `app/api/assessment/start/route.ts` | Reads `buyer_email`. On a self order (`isSelfOrdered`), owning a Basalith by email or by sign in no longer refuses. A successor or a guide is still refused. A buyer's order on an existing client is still refused. An existing owner's role is not forced. His new record is named "<family> Dependency Report" so the switcher can tell it from his Basalith. The response sets the `archive-id` cookie to the new record (httpOnly, secure, SameSite lax, 7 days), so his first sign in on that browser opens the assessment. The internal notice says when it is a self order and when he is already a client. |
| `app/api/assessment/start/route.test.ts` | Five new tests: existing owner gets a second record with his Basalith byte for byte untouched, no forced role, and the cookie; a self order from someone new runs exactly as before with no cookie; successor and guide still refused on a self order; a double submit makes one record; a buyer order on an existing client is still refused. |
| `app/assessment/begin/page.tsx` | A signed in owner who opens the invitation link now sees the form. Before, any signed in owner was sent to the dashboard, which would have hidden the only way in. Without an order in the link, he still goes to the dashboard. |

### Why SameSite lax

`/api/archive/switch` sets the same cookie as strict. The sign in link comes
from a mail client, which is a cross site navigation, and a strict cookie is not
sent on it, so the first dashboard load would fall back to whichever record
Supabase returns first. Lax is sent on that top level navigation. The cookie is
only a selector: `getSessionUser` honours it only for a record the signed in
user owns.

### What he sees

1. You set up the row with the owner as buyer (SQL in
   docs/OWNER_BUYER_FIXES_2026-10-23.md) and send the link.
2. He opens it, types his email, gets the sign in link.
3. On the same browser he lands on "Your assessment". On another browser he
   lands on whichever record comes first and uses the switcher at the top of
   the sidebar ("<family> Dependency Report").
4. The portal switcher moves him between his Basalith and the assessment at any
   time. The assessment record shows only the assessment nav.

### What this does not do

- **No run on his existing record.** Option (b) of the recon (a Succession
  client's own record) is not built. He does the eight calls fresh.
- **A later buyer order on the same founder** is still refused (recon O4,
  "upgrade in place", not built).
- **No column for who ordered.** Self order is still `buyer_email =
  founder_email`. The recon's additive migration (`ordered_by`, a `kept`
  closed status) is needed once release and closing are built, because a self
  order that is read is none of `released`, `not_released`, `not_completed`.

### Test results here

`app/api/assessment/start/route.test.ts` (15 tests, 10 old and 5 new) and
`lib/assessment.test.ts` (20 tests), run in an isolated copy with next 16.1.6
installed and the three IO modules stubbed: 35 passed. NOT run: tsc, the full
suite, `next build`, a live start.

## 2. The scoring claim

What the code does (`lib/trainingPipeline.ts`, `scoreTrainingPair`): every
training pair is scored at creation by Haiku on specificity, authenticity
("sounds like a real person speaking naturally in their own voice"), and
trainability ("how much this teaches about how this person thinks"), plus a
length score, into `quality_score`. If the scorer call fails, a length only
score is used. Turns under 20 characters never become a pair.

What it gates and orders:
- A standalone deposit enters the frozen layer only at 50 or above.
- An interview turn (founding and area calls, most of a new record) is
  included whatever its score. The score is recorded, never consulted
  (`includeInTraining`).
- `lib/frozenLayer.ts` presents included pairs in quality order.

So the old lines were partly false:

| Claim | Verdict |
| --- | --- |
| Every response is scored | True, with the two small exceptions above |
| ...before it can shape the model | False. No model is shaped, and for interview turns the score gates nothing |
| Lower confidence responses get a closer pass | False. There is no second pass anywhere |

Rewritten to what the code does:

| File | Now |
| --- | --- |
| `app/families/page.tsx` | Every response is scored for how specific it is, how natural it sounds, and how much it shows the way they think. The strongest are put first when their Basalith answers. |
| `app/faq/page.tsx` (twice, page and plain text) | Every deposit is scored for how specific it is, how natural it sounds, and how much it shows the way you think, and the strongest are put first when your Basalith answers. |
| `app/answers/founder-judgment-when-a-business-is-sold/page.tsx` | same, for the operator |

## 3. The terms address

`app/terms/page.tsx`: legacy@basalith.xyz becomes legacy@basalith.ai (the
cancellation clause and the contact block). "Last updated" moves from September
2026 to October 2026.

**Before promoting: make sure legacy@basalith.ai receives mail.** The terms now
tell customers to send cancellation notice there. If the mailbox or alias does
not exist yet, create it first, or the notice goes nowhere.

## Found and not changed

- **`/answers/founder-judgment...`** still says "the operator works through 20
  real business scenarios and 29 decision questions across 8 domains."
  Scenarios were cut from the product September 16. Worth a read.
- **`/method`** says "Your record is not scored by the cheapest available
  model. It is scored by the right model for each decision." The scorer is
  Haiku, the smallest current model. That line reads false.
- **`lib/internalNotify.ts`** still falls back to legacy@basalith.xyz when
  `ADMIN_EMAIL` is unset. Internal only.

## Gates before promote

1. `npx tsc --noEmit`.
2. `npx vitest run app/api/assessment/start/route.test.ts lib/assessment.test.ts lib/assessmentGates.test.ts`
3. `npm test`
4. Confirm legacy@basalith.ai receives mail.
5. Live, after deploy: insert a self order on mrdavidha@gmail.com with
   `amount_cents = 500000`, open the link signed in, submit, follow the sign in
   link. Confirm you land on the assessment, the switcher shows both records,
   and your Basalith is unchanged. Delete the test row and record after, or
   leave it as your own first report.

## Rollback

`git checkout --` the changed files. No migration.
