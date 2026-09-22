# The Immutability Vault does not exist, and the cheapest fix makes most of it true

September 21, 2026. Follows the copy integrity audit. This is the one claim that
audit could not verify from code. It is now verified: read every one of the 53
migrations, `lib/schema.sql`, and the application.

**RESOLVED September 21, 2026 by option A: the trigger shipped and the copy now
describes immutability as a property held from the moment of deposit rather than
a state entered at death. What follows is the finding, then what shipped.**

## What the site says

`app/integrity/page.tsx`, the section titled "The Immutability Vault":

    "When you pass your Cognitive Fingerprint Layer is permanently frozen at
     the database level."
    "What they cannot do is change what you built."

`app/pricing/page.tsx`, as one of three TRUST_BADGES:

    { icon: 'lock', label: 'Immutability Vault after passing' }

and again below the tiers:

    "Your cognitive fingerprint is permanently frozen after you pass."
    "Heirs can add context. Nobody can change what you said."

## What exists

Nothing named, nothing triggered by death, and nothing enforced by the database.

Searched all 53 migrations and the schema for `deceased`, `passed_at`,
`date_of_death`, `death`, `posthumous`, `immutab`, `frozen`, `freeze`,
`memorial`, `locked_at`. The only hits are `death_year` on the `people` face
registry and `death_anniversary` in `significant_dates`, both about remembering
*other* people, and two comments about the "frozen layer," which is something
else entirely.

Searched for anything that blocks a write: `before update`, `before delete`,
`create rule`, `for update using`, `for delete using`, `raise exception`.
**Zero matches across every migration and the schema.** No trigger, no rule, no
policy anywhere refuses a write to anything.

Searched the application for a death state. `archives` has `active`, `resting`
and `paused`. There is no status, column, or code path that records an owner has
died, so there is no moment at which anything could freeze.

The phrase "frozen at the database level" is the specific problem. It names an
enforcement layer. That layer contains no enforcement.

## What is actually true, and it is better than it looks

Across the entire codebase, `owner_deposits` is touched by **7 inserts and 15
selects. Zero updates. Zero deletes.** `training_pairs` is select-only from
application code.

So "Nobody can change what you said" is **true today**. Nothing in the product
can edit or delete a deposit. There is no route, no admin tool, and no portal
button that does it.

It is true as a property of the current code rather than as a guarantee. A route
added next month could break it and nothing would notice, which is exactly the
distinction between "our code happens not to do that" and "the database will not
let it."

## The fifteen lines that close the gap

Because nothing writes to these tables except inserts, a trigger that refuses
updates and deletes **changes no behavior whatsoever**. It cannot break a
feature, because the feature it forbids does not exist. It converts a property
into a guarantee, and it makes "at the database level" literally true.

    -- Immutability of the record, enforced where the copy says it is.
    -- Nothing in the application updates or deletes an owner deposit: as of
    -- September 21, 2026 the codebase holds 7 inserts and 15 selects against
    -- owner_deposits and no update or delete of any kind. This trigger asserts
    -- that, so a future route cannot quietly change it, and so /integrity's
    -- claim of database-level immutability is a thing that can be pointed to.
    --
    -- Corrections are additive by design. A deposit that is wrong is answered
    -- by a later deposit, not by an edit, which is the same rule the archive
    -- applies to a successor's context.

    create or replace function refuse_record_mutation()
    returns trigger
    language plpgsql
    as $$
    begin
      raise exception
        'Basalith records are append only: % on %.% is refused. Add a correcting row instead.',
        tg_op, tg_table_schema, tg_table_name;
    end;
    $$;

    drop trigger if exists owner_deposits_append_only on owner_deposits;
    create trigger owner_deposits_append_only
      before update or delete on owner_deposits
      for each row execute function refuse_record_mutation();

Run it, then prove it, which is the point of doing it at all:

    -- expect: ERROR, Basalith records are append only
    update owner_deposits set content = content where id = (
      select id from owner_deposits limit 1
    );

Whether to put the same trigger on `training_pairs` and `voice_recordings` is a
judgment call. Training pairs are derived, so regenerating them is legitimate
and a blanket refusal would block the pipeline. Deposits are what the owner
actually said, which is what the copy is about, so that is where the guarantee
belongs.

## What still has to change in the copy, whatever you decide

"When you pass" and "after passing" cannot stay, because no death state exists
and nothing happens at that moment. Even with the trigger shipped, the claim
would be true about the wrong time.

And the honest version is a better promise. Immutability does not begin when you
die. It is true from the moment you speak:

    What you say is fixed the moment you say it. Not after you pass, not when
    a setting is switched on. A deposit cannot be edited or deleted, by you, by
    your heirs, or by us, because the database refuses the write. A record that
    turns out to be wrong is answered by a later record, never by a revision.
    Your heirs can add what happened after you. They cannot reach back.

That is stronger than the current text, it is verifiable, and after the trigger
it is enforced exactly where it says.

## Shipped: option A

Three files. The migration must be applied before the pages deploy, or the site
claims an enforcement that is not yet there, which is the same defect pointing
the other way.

    supabase/migrations/20260921_owner_deposits_append_only.sql   new
    app/integrity/page.tsx                                        the vault section
    app/pricing/page.tsx                                          badge and vault block

### The migration

A `refuse_record_mutation()` trigger function that raises on any UPDATE or
DELETE, wired to `owner_deposits` as a BEFORE trigger. The file carries its own
reasoning: why it exists, why it is safe, why deposits and not `training_pairs`,
and that corrections are additive.

It ends with three queries to run afterward, and they are not decoration. A
guarantee nobody has watched fail is not yet a guarantee. Run the UPDATE and the
DELETE and see them refused, then list the trigger.

### The copy

The eyebrow "After You Pass" became "From The Moment You Say It", which is the
whole correction in four words.

    Before: "When you pass your Cognitive Fingerprint Layer is permanently
             frozen at the database level."

    After:  "What you say is fixed the moment you say it. Not after you pass.
             Not when a setting is switched on."
            "A deposit cannot be edited or deleted. Not by your heirs, not by
             you, and not by us. The database refuses the write."

"Frozen." became "Fixed.", because frozen implies a state something entered and
fixed is a property it always had.

"What they cannot do is change what you built" became "What nobody can do is
reach back", which includes Heritage Nexus and says so.

A paragraph was added that the old copy had no room for, because it is the part
that makes an append-only record livable rather than brittle:

    "A record that turns out to be wrong is answered by a later record, never
     by a revision. You correct yourself the way you would in a conversation,
     by saying the next thing, and both remain."

On `/pricing`, the trust badge "Immutability Vault after passing" became
"Immutability Vault: a deposit cannot be edited or deleted, by anyone", and the
block below the tiers now reads "not after you pass. The database refuses any
edit or deletion." and "Nobody can reach back, including us."

The name Immutability Vault stays. It was never the problem. The timing and the
unearned mechanism were.

### Verified

Both pages compile with no new diagnostics. No em dash in emitted copy. A sweep
of all 78 public pages and components for "after you pass", "when you pass",
"upon your death", "frozen at the database" and "permanently frozen" leaves only
the two page-scope lines on `/integrity` that describe what the page covers, the
two new lines that explicitly say "not after you pass", and the estate-transfer
language in `/terms` and `/privacy`, which is a legal position about ownership
rather than a technical mechanism. CRLF on all three files.

### Not verified

The trigger firing. Run the two queries in the migration's footer against
production after applying it. And after the pages deploy, read the vault section
on `/integrity` as a stranger would: it is now making a stronger claim than it
was yesterday, and it should sound like one.

### What option C would still need

Building the vault as originally described is a real feature and this change is
its prerequisite, not its replacement. It would need a death state on `archives`,
a way to declare and verify one, a decision about who may declare it and what
proof is required, a path for a declaration made in error, and an answer for how
a family reaches an archive during the gap. None of that is blocked by what
shipped today, and none of it is required for the copy to be true.

## One thing to notice about how this got here

Twelve lines above the trust badge on `app/pricing/page.tsx` there is this
comment, on the `FOUNDING_DELIVERABLES` array:

    // Rewritten September 15, 2026 to list what The Founding actually delivers.
    // The prior list described steps with no mechanism behind them and was
    // flagged as unverified in the September 8 pass. Nothing here is a promise
    // the product or the founder does not keep today.

The same audit, on the same page, six days ago, doing exactly this. It fixed the
deliverables list and did not look at the badges immediately below it. The
discipline is already in the file. What it lacked was a sweep that reads a page
whole rather than the part that prompted it.
