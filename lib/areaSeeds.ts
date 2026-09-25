/**
 * The area call seeds: one opener per area of each coverage taxonomy.
 *
 * Moved out of lib/areaCalls.ts on September 24, 2026 (tailored questions,
 * slice 2) so the question planner and the incident seed picker can use the
 * same openers without importing the area call engine, which imports
 * lib/incidentSession.ts and would make a cycle. lib/areaCalls.ts re-exports
 * everything here, so nothing that imported from it changes.
 *
 * SEEDS. Same form as the founding openers: a real moment, not a value
 * statement, because the verifier can ground a position in what someone did
 * and cannot ground one in what they believe. A seed and a coverage probe aim
 * at the same kind of judgment on purpose; a probe measures, a seed elicits.
 * No seed repeats a probe word for word (lib/areaCalls.test.ts pins it).
 *
 * Seeds are rendered to the owner, so they are copy: no em dashes, no
 * exclamation points, American English.
 */

import type { FoundingScope } from './foundingSequence'

export type AreaSeed = {
  /** Matches a domain name in the scope's taxonomy exactly. */
  area:     string
  category: 'judgment' | 'conflict' | 'risk'
  question: string
}

export const AREA_SEEDS: Record<FoundingScope, AreaSeed[]> = {
  personal: [
    { area: 'Decision-Making', category: 'judgment', question: 'Tell me about a time you had to decide before you could know enough, at home or at work. What did you know, what did you not, and what did you do?' },
    { area: 'People',          category: 'judgment', question: 'Tell me about a time you had to decide whether to trust someone, and how it turned out.' },
    { area: 'Risk',            category: 'risk',     question: 'Tell me about the biggest bet you ever made with your own money or your own years. What was on the line, and what did you do?' },
    { area: 'Money',           category: 'judgment', question: 'Tell me about a time money was tight and something had to give. What was going on, and what did you choose to protect?' },
    { area: 'Standards',       category: 'conflict', question: 'Tell me about a time someone close to you crossed a line you hold. What was the line, and what did you do about it?' },
    { area: 'Direction',       category: 'judgment', question: 'Tell me about a time you turned down something most people would have taken, or took something most people would have turned down. What was it, and why?' },
    { area: 'Adversity',       category: 'risk',     question: 'Tell me about a time everything broke at once, at home or at work, and what you did in the first day.' },
    { area: 'Legacy',          category: 'judgment', question: 'Tell me about a time you handed something that mattered to someone else, and how you decided they were ready.' },
  ],
  business: [
    { area: 'Decision-Making', category: 'judgment', question: 'Tell me about a time you had to make a call for the business before the numbers could tell you anything. What did you know, and what did you do?' },
    { area: 'People',          category: 'judgment', question: 'Tell me about a hire or a firing you agonized over. What did you see, and what did you do?' },
    { area: 'Risk',            category: 'risk',     question: 'Tell me about a bet you decided not to make, one that looked good to everyone else, and why you walked away.' },
    { area: 'Capital',         category: 'judgment', question: 'Tell me about a time cash was tight and you had to choose what got funded and what did not. What was going on, and what gave?' },
    { area: 'Culture',         category: 'conflict', question: 'Tell me about a time someone senior broke a standard you had set. What did you do, and what did it cost?' },
    { area: 'Strategy',        category: 'judgment', question: 'Tell me about a time you turned away business you could have taken. What was it, and why?' },
    { area: 'Adversity',       category: 'risk',     question: 'Tell me about a time everything broke at once in the business, and what you did in the first day.' },
    { area: 'Succession',      category: 'judgment', question: 'Tell me about a time you handed a relationship or a responsibility to someone else in the business, and how you decided they were ready.' },
  ],
}

export function seedForArea(scope: FoundingScope, area: string): AreaSeed | null {
  return AREA_SEEDS[scope].find(s => s.area === area) ?? null
}
