# Company name: Human Augmentation Technologies Corp., October 20, 2026

## Decision

David, October 20, 2026: the company is **Human Augmentation Technologies
Corp.**, a Delaware corporation. The filing is going in this week. This
replaces Heritage Nexus Inc. everywhere a reader or a customer sees it.

## Deployed before the filing was accepted

The footer, /press, /what-is-basalith and /pricing ("Delaware C Corp") state
that the company is registered in Delaware. On October 20, 2026 David was told
the rename would go live before the Delaware filing is accepted, and that the
terms would name a company not yet formed, and chose to deploy everything that
day. Until the certificate is accepted, those lines say more than is true.
Confirm the filing and record the acceptance date here.

## What changed (39 files, about 80 replacements)

Mechanical rename, with no wording changes beyond the name:
"Heritage Nexus Inc." became "Human Augmentation Technologies Corp." and bare
"Heritage Nexus" became "Human Augmentation Technologies".

- **Legal pages:** terms (12, the contracting party, liability cap, license,
  estate and wind down clauses), privacy (4), data ownership (5), integrity (2).
- **Public pages:** footer (2), about (3), press (2), what is Basalith (3),
  apply form label.
- **Signed in surfaces:** successor portal and scenarios footers, contribute page.
- **Every email footer:** founding welcome, founding complete, trial founded,
  trial warning, reply expired, entity access granted, export ready, pause
  emails, and the cron emails (daily reflection, weekly mirror, weekly replay,
  monthly report, monthly accuracy, annual preview, anniversary, entity letter,
  family reactions, contributor mirror, cold storage ping), plus send photo,
  entity readiness and the white paper demo email.
- **Export file:** `lib/archiveExport.ts` custodian line and signature.
- **Structured data:** `legalName` and `disambiguatingDescription` in
  `lib/structuredData.ts`.
- **CLAUDE.md:** "The company is Human Augmentation Technologies Corp."
- `lib/certificationContent.ts` (retired Guide material) renamed for consistency.

Not touched: Stripe account name and statement descriptor, Resend sender name,
Supabase project name, the Apple developer account, and the basalith-xyz and
basalith-life repos. Those live outside this repo (see below).

## OSF registration is embargoed

- Homepage founder line still says the study "is preregistered on OSF" (true),
  but no longer links to osf.io/25srd.
- `osf.io/25srd` removed from `sameAs` in `lib/structuredData.ts`, because a
  crawler cannot resolve an embargoed registration. `osf.io/pvw26` (the project)
  stays; confirm it opens signed out.
- Restore both when the embargo lifts.

## Outside this repo, after the filing lands

1. Stripe: business name, statement descriptor, and tax details.
2. Resend sender display names, if any say Heritage Nexus.
3. Apple developer account and the App Store seller name (Apple shows the
   legal entity on the listing, which is itself a trust signal).
4. basalith-xyz: `app/layout.tsx` structured data (keep `sameAs` identical to
   this repo, including dropping osf.io/25srd) and any footer.
5. basalith-life footer.
6. Google Search Console and Workspace org names.
7. Restore `foundingDate` in `lib/structuredData.ts` with the real
   incorporation date.
8. Counsel should read the terms and privacy pages with the new entity before
   launch; the contracting party changed.

## Em dashes in client copy (fixed the same day)

The rendered em dash in the Chinese daily reflection email heading became a
full width colon. A wider search found 34 more in client facing copy, all
fixed: `lib/dailyReflections.ts` (4 English, 4 Mandarin, 4 Cantonese),
`lib/weeklyPrompts.ts` (8 Mandarin, 8 Cantonese) and `lib/emailTranslations.ts`
(photo reply line in zh, yue, vi, tl, ja, ko). Sentences were reworded, not just
repunctuated; meaning unchanged. A fluent reader should check the Cantonese.
Em dashes left in code comments, log lines, test names and the internal admin
email subject in `lib/inngest/billingFunctions.ts`.
