# WHO CAN ASK. THE OWNER OPENS A BASALITH TO ONE PERSON AT A TIME.

October 6, 2026. Written to disk in basalith-official, uncommitted. David type
checks, previews, commits, and promotes. One migration to paste by hand.

Triggered by David: contributors, or the client, should be able to let the
people they choose experience the client's Basalith sooner than later, so
family, friends, and contributors see the product and their own effort in it.

The answer was yes, with the client as the only one who grants it. Recon then
changed the size of the job. Most of this already existed and none of it
worked.

---

## 0. WHAT THE RECON FOUND

Read from the live files on October 6, not from the docs.

**The mechanism has been in the schema since April 30.**
`archives.contributor_entity_access` (`none`, `preview`, `open`) and
`entity_preview_contributor_ids`, with an owner gated API at
`/api/archive/entity-readiness` and a question box on the contributor page.

**No contributor could reach it on the web. Four separate breaks.**

1. `app/contribute/[token]/page.tsx` passed `'none'` to the client whatever
   the owner had set. The comment said "until the migration is run." The box
   never rendered.
2. The box sent no contributor token. The route answered 401.
3. Nothing on the web could turn access on. The control was cut on September
   16 with the progress ladder. What survived, `FamilyAccessCard` on the
   dashboard, only shows when access is already on, and only revokes.
4. The rating buttons under each answer posted to an owner only route with a
   body that route does not read. They failed silently.

**Three real defects sat behind the breaks.**

1. **The preview list was not enforced where it counts.** The answering route
   checked that the mode was not `none` and never read the list. With one
   relative invited, every active contributor's token was answered.
2. **A session cookie beat the contributor token.** A contributor who began a
   Basalith of their own (the referral loop built this morning) and stayed
   signed in would, on the inviter's page, have been answered by their own
   record, and a statement they typed would have been saved to it.
3. **A removed contributor stayed on the list.** Removal sets
   `status = 'inactive'`. Adding the same email back reuses the row id (the
   route upserts on archive and email), so the person returned with access the
   owner never gave again.

**Two things from September 16 are fixed and stayed fixed.** A contributor's
turn is no longer saved as the owner's deposit. On the grounded path the
frozen layer is the owner's own words only, so a relative's account cannot
ground an answer. Both confirmed in `entity-chat/route.ts` and
`lib/familyEntity.ts`.

**Not confirmed, because it needs live data.** Whether any Basalith has access
switched on today (query in section 5). The iOS app was read afterward; see
section 7.

---

## 1. THE RULE

The owner decides who can ask, one person at a time, and can close it to
anyone at any time. Nobody else grants it. A contributor cannot pass it on.

A contributor is answered only when all of these hold. One function,
`hasEntityAccess` with `accessBlock` in `lib/entityAccess.ts`, is the check for
the answering route, the contributor page, and the owner's control, so the
three cannot disagree.

| Condition | Why |
| --- | --- |
| The owner granted this person | Consent |
| The Basalith is `active` | A trial has no contributors |
| The tier is not `succession` | The successor has a sign in; that is the product |
| `entity_pipeline = 'grounded'` | The `context` builder has no verifier |

The last row is the integrity rule applied. A relative should meet the thing
the site describes: an answer from the record, or a plain "the record is
silent." On `context` they would meet Opus with no check on it.

---

## 2. FILES WRITTEN

| File | What changed |
| --- | --- |
| `lib/entityAccess.ts` | New. Pure: the access check, grant, revoke, prune, where the control is offered, reading the token off a request. |
| `lib/entityAccess.test.ts` | New. 21 tests. |
| `lib/entityAccessStore.ts` | New. The reads and the one write. Every read fails closed. |
| `lib/emails/entityAccessGranted.ts` | New. The one email, html and text. |
| `app/api/archive/entity-chat/route.ts` | Contributor branch only: token wins over session, list enforced, grounded only, length and history caps, rate limit, asker on the saved rows. The owner path behaves as it did. |
| `app/api/archive/entity-readiness/route.ts` | New actions `grant` and `revoke`, one contributor each. The three older actions are untouched. |
| `app/api/archive/contributors/route.ts` | GET also returns `entityAccess` for the control. DELETE drops the removed person from the list. |
| `app/contribute/[token]/page.tsx` | Reads the real state and decides `entity_can_ask` on the server. |
| `app/contribute/[token]/ContributeClient.tsx` | The box sends the token, shows a reason when refused, keeps a failed question in the field. Rating buttons removed. Copy rewritten (section 3). |
| `app/archive/contributors/ContributorsClient.tsx` | New "Who can ask" section between the table and the portal links. |
| `supabase/migrations/20261006_entity_conversations_asker.sql` | One nullable column, `entity_conversations.contributor_id`. Paste by hand. |
| `app/api/mobile/contributor-session/route.ts` | Tells the app what this person may do, not the archive's mode. See section 7. |
| `CLAUDE.md` | One paragraph in section 4. |

Nothing touches `lib/entitySystemPrompt.ts`, `lib/verifyGrounding.ts`,
`lib/familyEntity.ts`, or any model facing prompt. No probe gate applies and no
same day A/B is needed.

---

## 3. THE COPY, IN FULL

Yours to approve. Every mechanism sentence is true of the grounded path.

### Owner, Contributors page, new section

Eyebrow: Who can ask

> **Let them ask your Basalith.**
>
> Choose who can put questions to your Basalith. It answers from everything
> you have recorded, and where the record is silent, it says so. You can close
> it to anyone at any time.

Each contributor is a row: the name, then "Can ask your Basalith" or "Cannot
ask", and one button. "Let them ask" opens a second step:

> {First} will be able to ask about anything you have recorded, and will get
> an email saying so. Nothing is held back from the answers yet.
>
> [Cancel] [Confirm]

After: "{First} has been sent an email." A person who can ask has a "Close"
button. At the cap: "10 people can ask at once. Close it to someone first."

When the Basalith is still on the `context` builder:

> This is not open on your Basalith yet. Write to us and we will turn it on.

### Contributor page, when it is closed to them

Eyebrow: {First}'s Basalith

> What you add here goes into {First}'s record.
>
> {First} decides who can ask their Basalith questions. If {First} opens it to
> you, you will ask from this page.

This replaces "{First}'s Entity Is Learning ... teaches it something specific
about how {First} thinks ... You are making it more accurate." Two problems
with the old lines. Section 8 forbids saying it knows how a person thinks. And
on the grounded path a contribution never reaches an answer, so "you are
making it more accurate" described a mechanism that is not there.

### Contributor page, when it is open to them

Eyebrow: Ask {First}'s Basalith

> It answers from what {First} has recorded, in {First}'s own words. Where the
> record is silent, it says so.
>
> [Ask a question] [Ask]
>
> Your questions are saved to {First}'s Basalith.

While it works: "Reading the record". The old line was "{FIRST} IS THINKING".

The old intro said the entity "has learned from {First}'s deposits,
photographs, and your contributions." On the grounded path it reads the
owner's words and nothing else.

Refusals: "That is enough questions for now. Come back in a little while."
"This is not open to you right now. {First} decides who can ask." "That did
not go through. Your question is still here. Try again."

### The email

Subject: {First} has opened their Basalith to you.

> {Name},
>
> {First} has invited you to ask their Basalith questions.
>
> It answers from what {First} has recorded, in {First}'s own words. Where the
> record is silent, it says so.
>
> [Ask a question]
>
> Your questions are saved to {First}'s Basalith.
> This link is yours. Please do not pass it on.

English only. On the void palette, like every other email, until the email
pass moves them together.

---

## 4. CALLS IN HERE THAT ARE YOURS

- **Grounded only closes the door on any Basalith still on `context`.** If a
  family Basalith has access on today and sits on `context`, its contributors
  lose the box on the iOS app when this deploys. The query in section 5 tells
  you before you deploy. The fix for one Basalith is the September 16 step:
  read a conversation on it, then flip `entity_pipeline`. To drop the rule
  instead, remove `pipeline` from `accessBlock`; one line.
- **Not gated on payment.** Any active personal Basalith can use it, including
  the four family records. If it should be a paid feature, the gate is
  `archiveHasPaid` from this morning, in `accessBlock`'s caller.
- **Nothing can be held back.** A relative can ask what you think of them and
  be answered from a deposit that names them. The owner is told at the moment
  of granting, in those words. Private deposits are slice 2 and should land
  before you tell anyone outside your own family about this.
- **The link is still the credential.** A forwarded email is forwarded access.
  The email asks people not to pass it on, which is a request, not a control.
  Sign in by emailed code is slice 3.
- **The rate limit is weak by construction.** `checkRateLimit` is in memory,
  per function instance. Thirty questions an hour per contributor per warm
  instance. It stops a burst. It is a cost guard, and no copy states it.
- **The cap of ten is enforced on access, not on invitations.**
  `POST /api/archive/contributors` still has no count check. This morning's
  record flagged it; it is still open.
- **The old email and the two old actions are left in place.**
  `enable_preview` and `enable_open` and their invitation email ("Their entity
  has learned enough to meet the people who know them best") have no caller on
  the web and none in the iOS app (section 7). They are dead and should be
  deleted in their own commit, so that email can never send again.
- **`FamilyAccessCard` on the dashboard still works** and still revokes
  everyone at once. It now overlaps with the new section. Keep or cut.
- **The owner cannot yet read what was asked.** The rows are saved and, after
  the migration, say who asked. There is no page that shows them. The
  contributor is told their questions are saved, which is true. Nothing tells
  the owner they can read them, because they cannot yet.

---

## 5. GATES BEFORE PROMOTE

Checked here: `tsc` over the eleven changed and new files against the real
dependencies came back clean except one import this session did not stage
(`@/app/components/VoiceRecorder`, untouched). `lib/entityAccess.test.ts` 21
of 21 and `lib/familyEntity.test.ts` 6 of 6 pass. That is not the repo's own
run. These are.

1. `npx tsc --noEmit`. Clean except the five known `lib/frozenLayer.test.ts`
   errors.
2. `npm test`. In particular `app/api/archive/unauth-access.test.ts`: it
   drives `entity-chat`, `entity-readiness`, and all four `contributors`
   methods through a stub, and all three files changed.
3. Paste this in the Supabase editor and paste the rows back. It says which
   Basaliths have access on and which are grounded.

   ```sql
   select id, name, tier, status, entity_pipeline,
          contributor_entity_access,
          coalesce(array_length(entity_preview_contributor_ids, 1), 0) as listed
   from archives
   where contributor_entity_access is distinct from 'none'
      or entity_pipeline = 'grounded'
   order by name;
   ```

4. Paste `20261006_entity_conversations_asker.sql` and paste back its three
   confirms. The code is safe before this lands; rows written in the gap have
   no asker.
5. Preview, signed in as the owner of the Dr Ha Basalith. `/archive/contributors`
   shows "Who can ask" with every contributor closed. Open it to one. Confirm
   the email arrives and the row reads "Can ask your Basalith".
6. Open that contributor's link in a private window. Ask one question the
   record covers and one it does not. Expect an answer and a refusal.
7. Open a second contributor's link, one you did not grant. The box must show
   the closed copy. Then call the route with that second token and expect 403:

   ```powershell
   curl.exe -s -o NUL -w "%{http_code}" -X POST https://<preview>/api/archive/entity-chat `
     -H "Content-Type: application/json" -H "Authorization: Bearer <second token>" `
     -d '{\"message\":\"What do you think about debt?\"}'
   ```

   This is the defect from section 0. The 403 is the proof it is closed.
8. In the same browser where you are signed in as owner, open the first
   contributor's link and type a statement over thirty characters with no
   question mark. Then:

   ```sql
   select count(*) from owner_deposits
   where archive_id = 'a38e4503-c7d2-4af3-af8c-cacd66974e0b'
     and prompt = 'Entity chat deposit' and created_at > now() - interval '10 minutes';
   ```

   Expect 0. Before this change it would have been 1.
9. Close it to the first contributor. Reload their link. The box is gone.
10. After the migration, ask once more as a contributor and paste:

    ```sql
    select role, contributor_id, left(content, 60), created_at
    from entity_conversations
    where archive_id = 'a38e4503-c7d2-4af3-af8c-cacd66974e0b'
    order by created_at desc limit 4;
    ```

    The top two rows carry the contributor's id. This is the `after()` class
    of write; only the live table proves it.
11. Remove a contributor who can ask, add the same email back, and confirm
    the row reads "Cannot ask".

---

## 6. WHAT COMES NEXT, IN ORDER

Each is in the irreversible class (consent, identity, or provenance), so each
gets a skeleton for your sign off before code.

1. **Private deposits.** The owner marks a deposit as not for anyone else. It
   leaves the frozen layer for every contributor question and stays for the
   owner's own. This changes what the verifier is shown for one class of
   caller, so it needs the two layer probe.
2. **What they asked.** A page for the owner: who asked what, and what it
   answered or declined. The data starts accruing the day the migration lands.
   A relative's unanswered question is also the best next question to put to
   the owner; that is the gap queue with a name on it.
3. **Sign in by emailed code for anyone who can ask.** The app already
   provisions an auth user for a contributor (`/api/mobile/prepare-sign-in`).
   The web portal would do the same, and the link stops being the credential.
4. **Someone who only asks.** Today a person has to be a contributor to be
   granted access. A friend who should hear it answer, and add nothing, needs
   a lighter invitation. `contributors.role` once listed `viewer`; whether a
   CHECK still allows it has not been read.
5. **The referral block after a first question.** "Begin your own" shows after
   a first contribution. The stronger moment is right after the first refusal.
   Reversible, copy and placement only.
6. **Third parties.** An advisor, a lender, a buyer. Same consent table, a
   different role, and the September 30 decision to design it before launch.
   Steps 1 to 3 are its foundation.

---

## 7. THE iOS APP, READ THE SAME DAY

`basalith-app/src` read on October 6: `lib/api.ts`, `ContributorAskScreen`,
`ContributorHomeScreen`, `EntityScreen`, `AuthContext`. Nothing in the app was
changed.

**What holds.**

- The owner's chat sends a Supabase session token and no contributor token.
  The route reads that as an owner, as before.
- The contributor's chat sends the token in the body as `contributorToken`
  with no session header. The route reads that as a contributor, as before.
- The app never calls `/api/archive/entity-readiness`. An owner cannot open or
  close access from the app. The web Contributors page is the only control.

**One mismatch, fixed on the server so no app release is needed.** The app
shows its live conversation whenever `/api/mobile/contributor-session` returns
an `entityAccess` other than `none`. That route returned the archive's mode.
After today a contributor who is not on the owner's list, or whose Basalith is
not on the grounded pipeline, would have seen a live box and been answered 403.
The route now returns what this one person may do.

**One finding that is bigger than this slice. Not changed. Your call.**

When the app is told `none`, its Ask screen falls back to
`POST /api/contribute/wisdom-exchange`. That route:

- answers any active contributor, with no grant from the owner;
- generates with the prompt "You are {owner}. You think, speak, and reason
  exactly as {owner} does ... You never say you are an AI", and tells the model
  to "draw on general wisdom" when the record is thin;
- reads the twenty newest rows of `owner_deposits` with no filter, so
  contributor deposits and test artifacts are in the context;
- runs no verifier and returns the answer to the contributor at once;
- emails the owner a review link to `/archive/wisdom-exchange`, which has been
  a redirect since September 18.

So in the app every contributor can already put questions to the owner's
Basalith, and what answers them is the thing the site says Basalith is not.
The web contributor page does not call this route. Wisdom Exchange was cut from
the product on September 16; this is the part of it that is still live.

It also makes one new line untrue for an app user: "{First} decides who can ask
their Basalith questions."

Recommended, as its own change with its own gate: the route answers only a
contributor the owner has granted, through `generateGroundedFamilyReply`, and
otherwise saves the question for the owner and says so without answering. The
app's fallback line ("Sent to {First} ... {First} has been notified") then has
to be true, which means an owner notification that points at a page that
exists. That is the "What they asked" page in section 6, step 2.

