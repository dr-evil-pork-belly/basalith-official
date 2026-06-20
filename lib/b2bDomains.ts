// The eight succession (B2B) cognitive domains, used by the founder dashboard
// readiness map. domainId values are the live cognitive_domains.id values for
// scope = 'b2b' (confirmed against the database 2026-06-19). Descriptions are
// the approved founder-facing copy.

export interface B2BDomain {
  domainId:    number
  name:        string
  description: string
  order:       number
}

export const B2B_DOMAINS: B2BDomain[] = [
  { domainId: 11, name: 'Decision-Making', description: 'how you make the call when the data runs out',                 order: 1 },
  { domainId: 12, name: 'People',          description: 'how you hire, read, and let people go',                       order: 2 },
  { domainId: 13, name: 'Risk',            description: 'what you bet on and what you walk away from',                 order: 3 },
  { domainId: 14, name: 'Capital',         description: 'how you allocate money and when you hold',                    order: 4 },
  { domainId: 15, name: 'Culture',         description: 'the standards you set and defend',                            order: 5 },
  { domainId: 16, name: 'Strategy',        description: "where you choose to play and where you won't",                order: 6 },
  { domainId: 17, name: 'Adversity',       description: 'how you act when things break',                               order: 7 },
  { domainId: 18, name: 'Succession',      description: "what you want carried forward, and what you'd change",        order: 8 },
]

// Total number of b2b_questions across all eight domains (live count 2026-06-19).
export const B2B_TOTAL_QUESTIONS = 29
