# Founder details cut, 2026-10-26

Decision (David, Oct 26, 2026): the doctorate (D.B.A.) and the broker's license stay off the web copy. Neither lowers a buyer's risk, and the license raises a question the site is not answering. Standing copy rule from here on.

## Files changed

### app/partner/page.tsx
Section 7, "From the founder." Removed the opening sentence "I hold a broker's license." The paragraph now opens with "I built Basalith because..." The rest of the section is unchanged.

### app/dependency-report/page.tsx
Closing section, credit line. "Built by David Ha, D.B.A., Visiting Scholar at the Fisher School of Accounting, University of Florida." is now "Built by David Ha, Visiting Scholar at the Fisher School of Accounting, University of Florida."

## Checked and left alone

- app/about/page.tsx: name, "Founder, Basalith," company line. No credentials. "I am a researcher by training" stays.
- app/what-is-basalith/page.tsx: "Who makes Basalith?" FAQ names David Ha as a Visiting Scholar at the Fisher School. No DBA, no license.
- lib/structuredData.ts: founder Person record carries name, jobTitle, University of Florida affiliation, and ORCID. No DBA, no license.
- app/integrity, app/churches, app/partner sign-offs: "David Ha, Founder" only.
- "broker" elsewhere on the site refers to business brokers (partner page audience) and data brokers (privacy, integrity). Not about David.

The Visiting Scholar affiliation remains in three places (what-is-basalith FAQ, dependency-report credit, structured data). It was not part of this cut. It backs the "method is published" claim and the ORCID cross reference.

## Verification

David runs `npx tsc --noEmit` and deploys. Both edits are text inside existing JSX paragraphs; no imports, props, or structure changed.
