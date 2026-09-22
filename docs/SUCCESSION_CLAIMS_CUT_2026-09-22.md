# Succession claims: cut and replace

Heritage Nexus Inc. September 22, 2026. Written to disk in `basalith-official`,
uncommitted. Run before the basalith.xyz v4.0 white paper deploys, so the paper
does not say a feature was never built while the pricing page sells it.

## Files written

- `app/pricing/page.tsx` — `SUCCESSION_FEATURES` replaced.
- `app/succession/page.tsx` — `FEATURES` replaced (byte-identical array to the
  one on /pricing, so both pages move together). `HANDOFF` steps 02 and 03
  rewritten.
- `docs/SUCCESSION_CLAIMS_CUT_2026-09-22.md` — this file.

Both files parse under esbuild. tsc, git, and the deploy are yours.

## Two corrections to what I told you first

**The scenario library is not dead. It is half alive, which is worse.**

I said on the strength of the September 16 note that the scenario library had
been cut. That note was about the owner's sidebar, not the feature. Recon:

- `lib/b2bScenarios.ts` holds exactly 20 scenarios. Not "20+". Nine categories,
  not eight, and one of them (Governance) is not one of the eight coverage
  areas, so "across 8 domains" on /succession was wrong about the scenario set
  as well.
- `app/succession/portal/scenarios/SuccessorScenariosClient.tsx` is live. It
  renders "The Founder's Playbook" and a counter reading "N of 20 scenarios
  answered."
- `app/archive/scenarios/page.tsx` is a `permanentRedirect`. Its own comment:
  "Retired September 18, 2026. This surface was cut from the archive sidebar on
  September 16 and nothing links to it."

So a founder buying the succession tier today has no way to answer the twenty
scenarios, and their successor opens the playbook to a permanent "0 of 20."
That is a worse defect than a feature that was never built, because the display
exists and reports the emptiness. `/api/archive/scenarios/respond` still exists
and nothing reaches it.

**The "Extended 3-hour founding session" line is not in the source.** I reported
it from the rendered page through a summarizing fetch. Both `FEATURES` and
`HANDOFF` in `app/succession/page.tsx` already carry the September 15 language,
"The Founding, with a live successor session by video," and no "hour" string
appears anywhere in the file. Either production is behind your working tree or
the fetch was wrong. I could not tell which from here and did not want a second
unverified claim sitting on top of the first. Worth one look at the live page
after you deploy.

## The feature list, before and after

Both pages carried the same eight. Four were unsupported and a fifth was the
density number.

| was | status |
|---|---|
| The Founding, with a live successor session by video | real, kept |
| Business decision framework capture | real, kept |
| 20+ scenario training library | library exists, capture surface is a 308. Cut |
| Successor access portal | real, kept |
| Quarterly calibration sessions | never built. Cut |
| Annual accuracy report | `lib/entityAccuracy.ts` computes the deposit-count readiness figure you pulled off the dashboard on September 15. Cut |
| Board-level reporting | never built. Cut |
| Priority support | never built. Cut |

The calibration recon said to delete and not replace. I differed, and the reason
is that the list was thin because it was a list of services when the things
nobody else can claim here are mechanisms. Five replacements, each pointable:

| now | what backs it |
|---|---|
| A map of where the record is thin, area by area, before the handover | `archive_coverage`, `app/archive/components/CoverageMap.tsx`, 8 areas at 6 probes each, measured not inferred |
| Every answer checked against the record, or a plain no | `lib/verifyGrounding.ts` on the succession chat route |
| Deposits are append-only. The database refuses the edit | `20260921_owner_deposits_append_only.sql` |
| A second copy offsite under a ninety-day lock nobody can shorten | B2, Object Lock in compliance mode, four allowlisted buckets |
| Full export in open formats, any time | `/api/archive/export`, and /pricing already claims it in `TRUST_BADGES` |

Nothing was added that the white paper does not also document.

## The two process steps

Step 02 described capture that cannot happen. Step 03 described a gate that
changed on September 16, when interview pairs began entering on the interview's
judgment with the score recorded and not consulted.

- **02** was "Scenario capture. The operator works through 20 real business
  scenarios and 29 decision questions across 8 domains." Now "Filling the gaps,"
  describing area calls: the map shows which of the eight areas are thin, each
  opens its own interview seeded on a real moment rather than a hypothetical,
  because a position can be grounded in what the operator did and never in what
  they say they believe.
- **03** was "The check. Every response is scored before it can shape the
  model." Now the verifier: every answer the successor gets is read by a second
  model against the operator's own words before it is returned, and where
  nothing backs it the answer is replaced with a plain no. Step 04 already ended
  on "Where the record holds no position, the model says so," so the page now
  says the same thing twice on purpose instead of once by accident.

## Verification run here

- esbuild parse of both files. Clean.
- `scenario`, `calibration`, `Board-level`, `Priority support`, `accuracy
  report`: zero matches remaining in either file.
- No banned words introduced.
- Pre-existing em dashes at `app/pricing/page.tsx` lines 23, 199, 265, 298, 379,
  all inside code comments. The copy rule covers comments. Left alone so this
  diff stays about one thing. Five one-character fixes when you want them.

Not verified here: tsc, the build, or how the eight bullets wrap on a phone. The
new strings are longer than the ones they replace and two of them will wrap on a
narrow tier card.

## Three things still open

**1. The B2C "Annual accuracy report."** It is still on the Active tier, and
Legacy carries "Annual entity report to family." Section 02 of the white paper
now says of that number, by name, "Nothing measured accuracy." I did not touch
the individual tiers because the calibration recon did not cover them and I have
no evidence either way about whether an annual report is actually delivered to a
B2C owner. The check is whether any cron or route produces one; there is a
monthly accuracy cron and a quarterly entity letter, and I found nothing annual.
If it is not real, it should go the same way.

**2. The scenario code.** Twenty scenarios, a live successor-facing playbook,
and no way to populate it. Three options: retire the successor page too and
delete `lib/b2bScenarios.ts`, or re-open owner capture, or fold the twenty into
area call seeds. The area calls doc already argues against scenarios on the
merits: a hypothetical answer is a stated belief, and the verifier cannot ground
a position in a belief. That points at retiring them. It is a route change, not
copy, so it is not in this pass.

**3. Order of deploy.** This one first, the white paper second, close together.
Right now both properties overclaim in the same direction, which is wrong but
consistent. Shipping the paper alone would make the company publicly contradict
itself on its own pricing page, and the paper's whole argument is that this
company catches its own errors before anyone else does.
