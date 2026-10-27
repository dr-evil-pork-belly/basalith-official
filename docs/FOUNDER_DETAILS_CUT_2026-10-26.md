# Founder details cut, 2026-10-26

Decisions (David, Oct 26, 2026):

1. The doctorate (D.B.A.) and the broker's license stay off the web copy. Neither lowers a buyer's risk, and the license raises a question the site is not answering.
2. The Visiting Scholar affiliation comes off every human-facing credit line. Operators cannot decode the title, and the method claim belongs on the method page.
3. No "Built by David Ha" credit line anywhere. It adds nothing a reader acts on. The About page and the "David Ha, Founder" sign-offs already put a person behind the product.

Standing copy rule from here on.

## Files changed

### app/partner/page.tsx
Section 7, "From the founder." Removed the opening sentence "I hold a broker's license." The paragraph now opens with "I built Basalith because..." The sign-off "David Ha, Founder" is unchanged.

### app/dependency-report/page.tsx
Closing section, credit line. Was: "Built by David Ha, D.B.A., Visiting Scholar at the Fisher School of Accounting, University of Florida. About the founder". Now: the About the founder link alone.

### app/components/home/HomeDoors.tsx
Home page, founder line under the two door cards. Missed in the first sweep (the component was not staged; the afternoon live-site check caught it). Was: "Built by David Ha, D.B.A., Visiting Scholar at the Fisher School of Accounting, University of Florida. The study that tests its refusals is preregistered on OSF. About the founder". Now: "The study that tests its refusals is preregistered on OSF. About the founder". The OSF sentence stays; it is the claim that does the work.

## Checked and left alone

- app/about/page.tsx: name, "Founder, Basalith," company line. No credentials. "I am a researcher by training" stays.
- app/partner, app/integrity, app/churches sign-offs: "David Ha, Founder" only. These are letters, and a letter is signed.
- app/what-is-basalith/page.tsx: "Who makes Basalith?" FAQ names David Ha as founder and Visiting Scholar at the Fisher School. Stays: the reader asked who makes it, and the affiliation is public.
- lib/structuredData.ts: founder Person record (name, jobTitle, University of Florida affiliation, ORCID). Stays: machine readable, no human sees it, backs the ORCID cross reference.
- "broker" elsewhere refers to business brokers (partner page audience) and data brokers (privacy, integrity, WhatBasalithIsNot). Not about David.

Sweep covered every file in app/ page routes, app/components (including home/), and lib/ (structured data, emails, report and certification content).

## Verification

David runs `npx tsc --noEmit` and deploys. All edits are text inside existing JSX paragraphs or comments; no imports, props, or structure changed. `Link` is still used in both edited files.
