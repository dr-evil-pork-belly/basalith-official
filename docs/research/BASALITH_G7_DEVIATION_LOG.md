# G7 DEVIATION LOG

Study: Template Contamination in Honesty Instructions
Stage 1 registration: https://osf.io/pvw26 (registered September 2, 2026)
DOI: [pending issuance]
Author: David Ha, D.B.A. | ORCID 0009-0000-0795-0066

This log is append only. Entries are never edited or removed after being written. Corrections to an entry are made by adding a later entry that references it.

Every departure from the Stage 1 registration is recorded here with its date, what the registration says, what was actually done, and why. This log is cited in any resulting paper alongside the registration DOI.

The authoritative copy lives in the connected OSF project. The copy in the source repository is a working convenience and is not the citable artifact.

---

## ENTRY 001 — September 2, 2026

**Type:** Defect in the registration, identified at archiving. No deviation in conduct has occurred.

**Registration text.** H2 states: "Substituting a semantically equivalent but lexically distinct exemplar reproduces the effect. Formally, M2(Arm D) is approximately equal to M2(Arm A)."

**Defect.** H2 asserts equivalence, and the registered analysis plan contains no equivalence test and no equivalence margin. The Analysis Plan specifies Holm corrected significance tests for secondary comparisons. Failing to reject a null is not evidence of equivalence. Stage 2 is restricted to fixing four items and an equivalence margin is not among them. As registered, H2 therefore has no testable decision rule.

**Resolution.** H2 will be reported descriptively only. The raw difference M2(Arm D) minus M2(Arm A) will be reported with its denominators and confidence interval. No confirmatory claim of equivalence will be made. No equivalence test will be added, because adding one after registration would be a post hoc analysis decision on a hypothesis that already has a stated direction.

The generalization claim is not lost. H5, which predicts that the substituted exemplar appears verbatim or near verbatim within Arm D, is testable as registered and carries the generalization argument on the mechanism side.

**Effect on conclusions.** The paper may claim generalization of the mechanism via H5. It may not claim that Arm D and Arm A produce equivalent ungrounded rates.

---

## ENTRY 002 — September 2, 2026

**Type:** Internal inconsistency in the registration, identified at archiving. No deviation in conduct has occurred.

**Registration text.** The Study Design field states: "A fixed set of 24 position-forcing probes is administered to each persona" and "Three repetitions per arm per persona, 576 administrations total."

The Sample Size field states: "Per condition: the probe set size multiplied by two fixtures and three repetitions... The exact probe set version and its count are fixed in the Stage 2 registration following a read-only reconnaissance pass."

**Defect.** The two fields disagree. Study Design commits to a specific figure of 24 probes and 576 total administrations. Sample Size treats the probe count as unknown pending reconnaissance. The figure of 24 was carried forward from a working document and was not verified against the live probe set definition before registration.

**Resolution.** The Sample Size field governs. The probe count will be read from the probe set definition during the reconnaissance pass and fixed in the Stage 2 registration. If the actual count differs from 24, that fact is recorded in a further entry in this log and disclosed in the methods section of any resulting paper.

**Effect on conclusions.** None on the primary comparison, which is within probe and does not depend on the total. The reported sample size will be the actual count, not 24.

**Note on cause.** This is an instance of a recurring failure mode in this project: a figure taken from a working document into an authoritative artifact without being checked against the code. It is recorded here as such.

---

## TEMPLATE FOR FURTHER ENTRIES

## ENTRY NNN — [date]

**Type:** [deviation in conduct | defect in the registration | clarification]

**Registration text.** [quote the relevant registered text]

**What was done.** [what actually happened]

**Why.** [reason, stated plainly, including if the reason is an error]

**Effect on conclusions.** [what the paper may and may not claim as a result]
