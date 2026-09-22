import type { Metadata } from 'next'
import AnswerPage, { type AnswerSection } from '../../components/AnswerPage'

// First page of the answer library. See docs/ANSWERS_SLICE_1_2026-09-22.md.
//
// Provenance for every claim below, so this can be checked rather than trusted:
//   lead, "usually does not transfer"      -> /succession, opening
//   "systems and the client list"          -> /succession, succession block
//   "earnout assumes the judgment comes
//    with the building"                    -> /succession, acquisition block
//   "20 real business scenarios and 29
//    decision questions across 8 domains"  -> /succession, the depth block
//   "every response is scored"             -> /succession and /faq
//   "trained only on one operator's
//    deposits, no general model speaks
//    for the record"                       -> /succession and /faq
//   "frozen at transition, successor adds
//    context, nobody rewrites"             -> /succession and /faq
//   "where the record is silent it says
//    so"                                   -> /integrity and /faq
//   pricing figures                        -> /pricing and /faq
// Nothing here is new. If any source above changes, change this page in the
// same pass.

export const metadata: Metadata = {
  title:       'What happens to a founder’s judgment when the business is sold?',
  description: 'The systems and the client list transfer. The reasoning behind them usually does not. What a buyer loses at close, and what can be captured before the operator’s last day.',
  alternates:  { canonical: '/answers/founder-judgment-when-a-business-is-sold' },
}

const QUESTION = 'What happens to a founder’s judgment when the business is sold?'

const LEAD =
  'Most of it does not transfer. The systems and the client list move with the company. The reasoning behind them sits in one head and leaves on the operator’s last day. The buyer paid a multiple for how the company was run, and then owns everything except the way it was run.'

const SECTIONS: readonly AnswerSection[] = [
  {
    heading: 'Why does documentation not close the gap?',
    body:
      'Process documents record what to do. They rarely record why. What built a company is in which deals the operator walked away from, which hires they trusted against the resume, and when they held the line. Those are judgment calls made in specific conditions, and a manual written after the fact flattens them into steps. A successor following the steps still cannot tell which situation is the exception.',
  },
  {
    heading: 'What does a buyer actually lose at close?',
    body:
      'The earnout assumes the operator’s judgment comes with the building. Most of it lives in one head. When that person leaves, the new team can read the file on a decision but cannot ask why it went that way, what the operator was watching for, or how sure they were. Diligence priced the company on how it was run. After the last day, that is the one asset with no record.',
  },
  {
    heading: 'Can a founder’s reasoning be captured before they leave?',
    body:
      'Only while they are still there to do it. A Basalith is built with the operator present and taking part, not pieced together from old emails once they are gone. It starts with three of the hardest calls they ever made, in their own words and their own time. From there the operator works through 20 real business scenarios and 29 decision questions across 8 domains. Every response is scored before it can shape the model.',
  },
  {
    heading: 'How is this different from an internal chatbot on company files?',
    body:
      'Every model is trained only on one operator’s deposits. No general model speaks for the record. That is the difference between a system that answers in the operator’s reasoning and one that answers in the average of everything it read. It is also why the boundary holds: where the record is silent, the entity says so rather than producing a plausible position the operator never took.',
  },
  {
    heading: 'What stops the record from being rewritten after the sale?',
    body:
      'The operator’s cognitive fingerprint is locked at transition. The successor or acquirer gets portal access and can add today’s context, so the model stays useful as the business moves. Nobody can rewrite what the operator said. The record is the permanent asset and the entity is the instrument. If the technology changes, the record is what carries forward.',
  },
  {
    heading: 'When does this have to start?',
    body:
      'Before the transition is on the calendar, if there is a choice. The model has only what the operator deposits, so the longer they deposit, the more there is to transfer. Started during diligence it still works, and it is narrower. Started after the last day it does not work at all, because the person who has to answer is gone.',
  },
  {
    heading: 'What does it cost?',
    body:
      'For a business succession, $12,000 a year plus a one-time $5,000 Founding fee. Acquisition engagements start at $50,000, scaled to the transaction. Engagements begin with one conversation about the transition and whether this fits.',
  },
]

const RELATED = [
  { label: 'How the handoff works',  href: '/succession' },
  { label: 'Read the method',        href: '/method'     },
  { label: 'Open the demo',          href: '/succession/demo' },
  { label: 'Talk to us',             href: '/apply?type=acquisition' },
] as const

export default function Page() {
  return (
    <AnswerPage
      question={QUESTION}
      lead={LEAD}
      sections={SECTIONS}
      related={RELATED}
    />
  )
}
