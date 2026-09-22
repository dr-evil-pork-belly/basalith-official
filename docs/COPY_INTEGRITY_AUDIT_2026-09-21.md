# Copy integrity audit: every public claim against what the code does

September 21, 2026. 78 files swept: every page and component outside `app/api`,
the signed-in portal, and the demos. Prompted by one question, whether anything
claims a backup verification cadence, and it found five other things instead.

## The question that prompted this: no, and the backup fix is clear to ship

Every durability claim on the site, and its status:

    security/page.tsx        "Offsite backup: Backblaze B2"                    TRUE
    privacy/page.tsx         Backblaze, "offsite backup copies of photographs,
                             voice recordings, video, and documents"           TRUE
    data-ownership/page.tsx  "copied to a second location so that a failure at
                             one provider cannot lose it"                      TRUE

The privacy line names four categories and the sync allowlist is exactly four
buckets: photographs, voice-recordings, archive-videos, archive-documents.

**Nothing claims backups are verified, re-hashed, checksummed, or verified on
any cadence.** So the standing A8_CAPPED coverage gap, where weekly
verification re-hashes only the first 300 of 383 manifest rows from an
unordered read, contradicts no public claim. It is an engineering defect to fix
on its merits, not a copy emergency.

One caveat worth recording: the second-location claim was **false between
August 13 and September 18, 2026**, the five weeks the sync cron never reached
production. Objects created in that window existed in one place only. Nothing
was lost, and the September 18 sync copied the backlog, but the page asserted
a mechanism that was not running.

## Finding 1: the security page names an authentication mechanism that does not exist

`app/security/page.tsx:116`

    'Owners: Authenticated via bcrypt-hashed passwords with 12 salt rounds.'

`bcrypt` appears **exactly once in the entire repository**: in that string. It
is not a dependency, not imported, and not called. Owner authentication is
Supabase Auth with an emailed one-time link (`signInWithOtp`), and
`app/api/archivist-login/route.ts` recorded the password path as removed in the
Phase 4a Supabase Auth migration before that file was deleted.

So the security page describes a named hashing algorithm and a specific cost
factor for a credential the product does not have. The page is dated
"Last updated: September 2026."

This is the standing integrity rule's exact shape: a mechanism, with a number,
that is not real. It is worse than a marketing overstatement because it is on
the page a security-conscious buyer reads to decide whether to trust the
product, and because a reader who knows what 12 salt rounds means will conclude
the rest of the page was written with the same care.

## Finding 2: the same page gives password advice, and tells owners to share it

`app/security/page.tsx:150-152`

    'Use a unique, strong password for your Basalith.'
    'Do not share your password with anyone except designated Legacy Guide contacts.'

Three problems in two lines. There is no password to make strong. The Legacy
Guide role was retired on September 20 and exists nowhere else in the product.
And the advice is to share a credential with a third party, which is advice no
security page should give even when the credential exists.

This is also the only Legacy Guide reference left in genuinely reachable public
copy. The others, in `app/(auth)/join`, `app/(curator)/curator` and
`app/(dashboard)/layout.tsx`, all sit behind the 308s in the uncommitted
route-group change and stop being reachable when it ships.

## Finding 3: the MFA section describes the wrong product

`app/security/page.tsx`, section 4, reads "Multi-Factor Authentication: Not yet
available" followed by the password advice above.

With emailed one-time links there is no password factor to add a second factor
to. The honest description is not "MFA is on the roadmap" but that sign-in
requires control of the email address, with no stored password to steal,
reuse, or phish in the usual way, and that account security therefore rests on
the owner's email account. That is a stronger and more accurate story than the
one currently on the page, and it is what is actually true.

## Finding 4: two of the five email addresses offered to the public may not exist

Every address in public copy, with use counts:

    privacy@basalith.xyz      10
    legacy@basalith.xyz        9
    hello@basalith.xyz         8
    security@basalith.ai       4
    enterprise@basalith.ai     2

The three on .xyz are aliases on `davidha@basalith.xyz` and work, and now also
answer at .ai through the user alias domain.

`security@` and `enterprise@` were **not in the alias list** as of
September 21. Verify, because if they are absent then the security page invites
vulnerability reports to an address that bounces, and the enterprise section's
data-residency line does the same to the highest-value inbound lead the site
can produce. Both are free to add.

The domain split is also worth settling in one pass rather than leaving three
addresses on the research domain and two on the product domain.

## Finding 5: one mechanism claim I could not verify

`app/integrity/page.tsx:93`

    "When you pass your Cognitive Fingerprint Layer is permanently frozen at
     the database level."

Repeated on `app/pricing/page.tsx:436` as "permanently frozen after you pass"
and "Nobody can change what you said."

"At the database level" is a specific technical assertion: a constraint, a
trigger, or an RLS policy that refuses writes, as opposed to application code
that declines to make them. I could not confirm which it is. `lib/schema.sql`
is stale, it does not contain `storage_backup_objects`, so it is not the live
schema and the real answer is in the migrations.

If the freeze is enforced in application code only, the words "at the database
level" claim a guarantee the system does not make, and the same page's own
promise is "Nothing we cannot point to." Either point to it or say "frozen"
without the mechanism.

## Checked and fine, so nobody chases them later

- **"100 years"** on `continuity/page.tsx:187` is inside a quotation about the
  world becoming unrecognizable. Not a retention claim.
- **"Forever. Without exception."** on `integrity/page.tsx` is qualified in the
  same page: "We cannot promise we will exist forever. We can promise your
  Basalith is always yours to hold, in full, in formats you can take
  anywhere." Honest in shape, and the export path backs it.
- **"within 48 hours"**, five places, is a response-time commitment on
  applications and contact forms. Yours to keep, not a mechanism claim.
- **"within 30 business days"** for exports, `privacy/page.tsx:196`. A
  commitment; the export path exists and has a reaper.
- **"12 months"** dissolution hold, `data-ownership/page.tsx:42`, matches the
  code, which describes up to 365 days between request and deletion.
- **AES-256 at rest, TLS 1.3 in transit**, SOC 2 and ISO 27001 for the
  providers, Anthropic not training on API data, OpenAI used only for
  transcription: all accurate as provider-level statements.
- **Contributor tokens**, "64-character cryptographically random, generated
  using crypto.getRandomValues": matches `lib/contributorToken.ts`.
- **Row Level Security enforced on every table**: consistent with the
  `unauth-access.test.ts` suite, though that suite proves route guards rather
  than RLS policies. Worth a separate check some day; not a claim defect.

## What to do

Two commits, in this order, because the first is a correctness fix to live
public copy and the second is a change to a system that just stabilized.

**One: the security page.** Replace the bcrypt line with what the product
actually does, replace the password advice with email-account advice, rewrite
the MFA section to describe passwordless sign-in honestly, and remove the last
Legacy Guide reference. Add `security@` and `enterprise@` as aliases, or change
the addresses to ones that exist.

**Two: the verification rotation.** `last_verified_at` on
`storage_backup_objects`, a deterministic sort taking the 300
least-recently-verified rows with `b2_key` as tiebreak, a write-back step, and
A8_CAPPED reframed from a permanent notice into a staleness alarm that fires
only when rotation cannot keep up. It degrades to current behavior if anything
about it is wrong, which is what makes it safe to ship immediately.
