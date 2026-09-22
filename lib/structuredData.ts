// Structured data for the public site.
//
// Why this file exists: as of September 2026, Google resolves the bare query
// "Basalith" to our two properties at positions one and two, but resolves
// "what is Basalith" entirely to basalt, the volcanic rock. Google AI Mode
// answers the branded query by citing basalith.ai alongside Wikipedia's
// Basilisk and Basalt entries, then asks the reader whether they meant a rock
// or a lizard. That is an entity resolution failure, not a ranking failure.
// Recon in docs/AI_DISCOVERY_SLICE_1_2026-09-22.md.
//
// Everything stated here must also be true on a rendered page. Schema that
// asserts more than the site does is the same integrity violation as copy that
// asserts more than the code does.

/** Canonical origin. Keep in sync with metadataBase in app/layout.tsx. */
export const SITE_URL = 'https://basalith.ai'

/**
 * The company. Emitted once per page tree from the root layout.
 *
 * Changes from the previous inline copy in app/page.tsx:
 *   - logo pointed at /logo.png, which does not exist in public/. Repointed at
 *     /icon-512x512.png, which does.
 *   - description led with families and used the pre-pivot vocabulary. Rewritten
 *     to the B2B frame, because this string is what answer engines quote back.
 *   - disambiguatingDescription added. This is the field that exists precisely
 *     for a name a search engine confuses with another word.
 *   - sameAs extended past the two sibling domains to the identifiers that
 *     already exist and are public.
 *   - knowsAbout added, so the entity attaches to the subject area rather than
 *     floating unlabeled.
 */
export const ORG_SCHEMA = {
  '@context': 'https://schema.org',
  '@type':    'Organization',
  '@id':      `${SITE_URL}/#organization`,
  name:       'Basalith',
  legalName:  'Heritage Nexus Inc.',
  url:        SITE_URL,
  logo:       `${SITE_URL}/icon-512x512.png`,
  // foundingDate is deliberately absent. The value read '2026' while Delaware
  // formation was still in progress, which asserts a date to a search engine
  // before it is true. Flagged by the AI discovery recon, September 21, 2026.
  // Restore it with the real date once formation completes, in this file and
  // in basalith-xyz/app/layout.tsx if that block ever carries one.

  description:
    'Basalith builds a cognitive reference model of the operator of a business, from what they deposit and from what the people around them observe, so the way they reason transfers through an acquisition or a succession. Also available for one person or a family.',

  // Read by search engines when a name collides with a better known word.
  // "Basalith" is basalt plus monolith. Google currently reads it as a
  // misspelling of basalt and answers with geology.
  disambiguatingDescription:
    'Basalith is a knowledge transfer company operating under Heritage Nexus Inc. It is not basalt, the volcanic rock, and not the basilisk. The name joins basalt and monolith.',

  knowsAbout: [
    'Knowledge transfer',
    'Business succession planning',
    'Mergers and acquisitions diligence',
    'Key person risk',
    'Tacit knowledge',
    'Founder dependence',
  ],

  founder: {
    '@type':   'Person',
    name:      'David Ha',
    jobTitle:  'Founder',
    affiliation: {
      '@type': 'Organization',
      name:    'University of Florida',
    },
    // ORCID is the durable identifier for the academic work and is the
    // strongest single cross-reference available to us today.
    sameAs: ['https://orcid.org/0009-0000-0795-0066'],
  },

  address: {
    '@type':         'PostalAddress',
    addressCountry:  'US',
    addressRegion:   'DE',
  },

  contactPoint: {
    '@type':      'ContactPoint',
    email:        'hello@basalith.xyz',
    contactType:  'customer service',
  },

  // Reciprocal links are how a search engine decides a string names a company
  // rather than a typo. Every URL here must resolve and must point back.
  // Add the LinkedIn company page and the SSRN author page when they exist.
  // Do not add a URL before it is live.
  sameAs: [
    'https://basalith.xyz',
    'https://basalith.life',
    'https://osf.io/pvw26',
    'https://orcid.org/0009-0000-0795-0066',
  ],
} as const

/**
 * The site itself. Separate node from the organization, linked by publisher.
 * Gives the name a second, differently typed anchor.
 */
export const WEBSITE_SCHEMA = {
  '@context': 'https://schema.org',
  '@type':    'WebSite',
  '@id':      `${SITE_URL}/#website`,
  name:       'Basalith',
  url:        SITE_URL,
  publisher:  { '@id': `${SITE_URL}/#organization` },
  inLanguage: 'en-US',
} as const

/** One question and its answer, as plain text. */
export type FaqEntry = { question: string; answer: string }

/**
 * Build FAQPage structured data.
 *
 * Every answer passed in must be the plain text of an answer that is visible
 * on the page that emits this. Schema that does not match the rendered page is
 * a violation, and Google treats it as one.
 */
export function faqSchema(entries: readonly FaqEntry[]) {
  return {
    '@context': 'https://schema.org',
    '@type':    'FAQPage',
    mainEntity: entries.map(({ question, answer }) => ({
      '@type':          'Question',
      name:             question,
      acceptedAnswer:   { '@type': 'Answer', text: answer },
    })),
  }
}

/** Serialize for a dangerouslySetInnerHTML script tag. */
export function ld(schema: unknown): string {
  return JSON.stringify(schema)
}
