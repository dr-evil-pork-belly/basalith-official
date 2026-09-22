// The answer library index.
//
// One registry, three consumers: the /answers index page, app/sitemap.ts, and
// anything else that needs to know which answers exist. A page added here and
// not built, or built and not added here, is the drift this file exists to
// prevent. Add an entry only when the route under app/answers/<slug>/ exists.
//
// Background in docs/ANSWERS_SLICE_1_2026-09-22.md.

export type AnswerMeta = {
  /** URL segment under /answers. */
  slug: string
  /** The question, exactly as it is the H1 on the page. */
  question: string
  /** One line for the index. Not the page's lead answer, a shorter pointer. */
  summary: string
}

export const ANSWERS: readonly AnswerMeta[] = [
  {
    slug:     'founder-judgment-when-a-business-is-sold',
    question: 'What happens to a founder’s judgment when the business is sold?',
    summary:  'The systems and the client list transfer. The reasoning behind them usually does not.',
  },
]

export const answerPath = (slug: string) => `/answers/${slug}`
