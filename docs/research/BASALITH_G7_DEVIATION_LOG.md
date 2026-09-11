# G7 DEVIATION LOG

Study: Template Contamination in Honesty Instructions
Stage 1 registration: https://osf.io/25srd (registered September 2, 2026)
DOI: [pending issuance]
OSF project (this log's authoritative home): https://osf.io/pvw26
Author: David Ha, D.B.A. | ORCID 0009-0000-0795-0066

Header note, September 11, 2026: the header above originally gave https://osf.io/pvw26 as the registration. pvw26 is the project; the registration is 25srd. See Entry 004. The header is corrected here because it is a pointer, not an entry; the original wording is preserved in the entry.

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

## ENTRY 003 — September 11, 2026

**Type:** Clarification, closing Entry 002. No deviation in conduct has occurred.

**Registration text.** Study Design: "A fixed set of 24 position-forcing probes is administered to each persona" and "Three repetitions per arm per persona, 576 administrations total." Sample Size: "The exact probe set version and its count are fixed in the Stage 2 registration following a read-only reconnaissance pass."

**What was done.** The read-only reconnaissance pass was run on September 8, 2026 against `lib/coverageProbes.ts` at commit 4c4d87dd. `PROBE_SET_VERSION` is `'v2'`. `PROBES_PER_DOMAIN` is 6. Eight domains. Forty-eight probes per persona, enforced by an import-time assertion that throws if any domain does not hold exactly six. The figure of 24 was probe set v1, retired on August 16, 2026, seventeen days before registration.

**Why.** The Study Design field carried the v1 count forward from a working document without a check against the code, as Entry 002 anticipated.

**Effect on conclusions.** None on the primary comparison, which is within probe. The governing count is 48 probes per persona at v2. With two personas, three repetitions, and four arms, the total is 1,152 administrations, not 576. The Stage 2 registration fixes 48 and v2 and cites this entry. The methods section of any resulting paper discloses the correction.

---

## ENTRY 004 — September 11, 2026

**Type:** Defect in this log's header and in the repository copy of the Stage 1 document, identified when the DataCite metadata for pvw26 was inspected. No deviation in conduct has occurred.

**Registration text.** Not applicable. The defect is in the pointers, not in the registration. This log's header read: "Stage 1 registration: https://osf.io/pvw26 (registered September 2, 2026)." The repository copy of the Stage 1 document carried the same line.

**What was done.** The DataCite export for pvw26 gives `resourceType: Project` and an identifier of type URL with no DOI. pvw26 is the OSF project that holds this log and the materials. The Stage 1 registration is https://osf.io/25srd, registered September 2, 2026. Both headers now name 25srd as the registration and pvw26 as the project. The DOI line remains a placeholder until the registration DOI resolves; as of this entry https://doi.org/10.17605/OSF.IO/25SRD returns 404.

**Why.** The project and the registration were created the same evening and the project identifier was copied into the header as if it were the registration's. An error, recorded as one.

**Effect on conclusions.** None. The citable identifier in any resulting paper is the registration DOI once issued, with the project cited separately as the home of this log.

---

## ENTRY 005 — September 11, 2026

**Type:** Defect in the registration, identified by the reconnaissance pass. No deviation in conduct has occurred.

**Registration text.** Explanation of foreknowledge: "transcripts produced under the current production prompt exist in version control. A read-only reconnaissance pass will be run after this registration and before a Stage 2 registration. [...] It reads those transcripts for a single purpose: to count how many probes fall on the ungrounded branch."

**What was done.** The reconnaissance pass found that neither clause holds as written. First, no fixture transcript is in version control: the capture directory `.probe-out/` is listed in `.gitignore` and `git ls-tree` at the pack tip shows zero tracked files under it. The transcripts exist on the author's disk only. Second, the two fixture transcripts that carry per-probe verdicts (August 19 and August 20, 2026) were produced at commit efae692, whose prompt is the post-exemplar wording of August 16 and not the relabeled production prompt of September 1. They were produced under a prompt that is close to Arm C, not under Arm B as the registration states. The count the registration asked for was taken from those transcripts anyway and is recorded here: under that prompt, replies with verifier basis `unsupported` numbered 7 and 5 of 48 for Margaret Chen across two runs, and 3 and 5 of 48 for Joey Marchetti. Replies with any non-deposit basis numbered 22 and 19 of 48 for Margaret Chen and 30 and 29 of 48 for Joey Marchetti.

**Why.** The registration described the transcripts from memory rather than from a check of what was committed and under which commit they were produced.

**Effect on conclusions.** The registration's constraint on T is unaffected: T is still set from a marginal ungrounded count and from no arm-comparative quantity. What changes is the provenance of that count, which the Stage 2 registration and the paper's methods section must state as the post-exemplar prompt of commit efae692 rather than the current production prompt. Whether that count is an acceptable basis for T, or whether a read-only pilot under Arm A is needed first, is a Stage 2 decision and will be recorded in this log when made.

---

## TEMPLATE FOR FURTHER ENTRIES

## ENTRY NNN — [date]

**Type:** [deviation in conduct | defect in the registration | clarification]

**Registration text.** [quote the relevant registered text]

**What was done.** [what actually happened]

**Why.** [reason, stated plainly, including if the reason is an error]

**Effect on conclusions.** [what the paper may and may not claim as a result]
