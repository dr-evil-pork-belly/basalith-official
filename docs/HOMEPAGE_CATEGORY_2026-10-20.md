# Homepage category line and founder line, October 20, 2026

## Why

An executive at Robinhood, told casually about Basalith, looked at the homepage
and said it brought up Glean and Bloomfire, then called it "less trustworthy"
because a search for the name returned little and it felt like "a guy in his
basement selling" rather than a company.

Two separate findings:

1. **Category.** "Knowledge transfer" opened the tab title, the Google snippet,
   the OG and Twitter link previews, and the eyebrow under the h1. "Knowledge"
   is the category word for enterprise search and wiki tools, so a corporate
   reader filed Basalith there before reading the body. The h1 ("What built the
   company is not in the data room.") was not the problem and is unchanged.
2. **Trust.** No human appeared on the homepage. The real credentials (UF
   Fisher appointment, the OSF preregistration) lived only on /about and in
   JSON-LD that a person never sees.

## What changed (5 files, copy and metadata only)

| File | Change |
| --- | --- |
| `lib/copy.ts` | `CATEGORY_LINE` is now "The founder's judgment, kept when a business changes hands. By acquisition or succession." |
| `app/page.tsx` | Homepage title: "Basalith · The founder's judgment, kept when a business changes hands" |
| `app/layout.tsx` | Default, OpenGraph and Twitter descriptions now open with the same line |
| `app/components/home/HomeHero.tsx` | Sub copy adds "so no search tool can find it" and closes on "Where the record is silent, it says so." Section aria label updated. |
| `app/components/home/HomeDoors.tsx` | Founder line under the two doors: name, D.B.A., Visiting Scholar at Fisher, the OSF preregistration; links to /about and https://osf.io/25srd |

Chosen by David from three drafts (founder judgment, key person risk, contrast
line). Not touched: the h1, the locked tagline, structured data, sitemap,
robots, and every other page. "Search tool" names no company, per the rule
against attacking named firms.

## Already in place before today (checked, no change needed)

- `app/sitemap.ts` serves 20 URLs at /sitemap.xml (confirmed live).
- `app/robots.ts` declares the sitemap.
- Google Search Console verified September 22, 2026.
- Organization and WebSite JSON-LD on every route, with
  `disambiguatingDescription` against basalt and the basilisk, founder ORCID,
  and both OSF links in `sameAs`.

## Before promoting

- `npx tsc --noEmit` (expect only the five known `lib/frozenLayer.test.ts` errors).
- Click https://osf.io/25srd signed out and confirm the registration is public,
  not embargoed. If it is embargoed, swap the link to https://osf.io/pvw26 or
  drop the second link.
- Look at the homepage at 390px: the founder line should sit under the doors,
  in secondary color, without crowding the buttons.

## Open, not done here

- Footer reads "Heritage Nexus Inc. Registered in Delaware." The October 7
  decision was to incorporate as Human Augmentation Technologies. If Heritage
  Nexus Inc. is not actually registered, that line breaks the integrity rule,
  and it is also the first thing a skeptical reader checks.
- Off-site presence is now the main lever for the "googled it, found nothing"
  reaction. Each item, once live, goes into `sameAs` in `lib/structuredData.ts`
  and `basalith-xyz/app/layout.tsx`:
  1. LinkedIn company page, plus Basalith and the UF title on David's profile
  2. Crunchbase organization entry
  3. App Store listing (the iOS app)
  4. SSRN author page and the first preprint under the Fisher/UF affiliation
  5. One podcast, CPA society talk listing, or article on a domain people trust
- `/succession` may still lead with "knowledge transfer" in its own copy.
  Worth the same read before the next advisor or VC send.
