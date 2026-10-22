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
import type { QuestionLens } from './questionLens'

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

/**
 * LENS OPENERS. October 13, 2026 (lib/questionLens.ts,
 * docs/QUESTION_LENSES_2026-10-13.md). Two lenses have their own area
 * openers. The personal and succession lenses use AREA_SEEDS above.
 *
 * ACQUISITION, on the business eight. An assessment used to open with the
 * succession openers, which ask how the founder decides. A buyer is asking a
 * second thing: what happens here without him. THE RULE FOR THESE: neutral on
 * dependency. An opener that presumes the founder is the only one who can do
 * it would tilt a report someone is paying to trust. Each asks who did what
 * and lets the answer say whether it runs through one person.
 *
 * CHURCH, on the personal eight. Written for a pastor or an elder. Each asks
 * for the leader's own decision, never a congregant's private matter.
 */
export const LENS_AREA_SEEDS: { acquisition: AreaSeed[]; church: AreaSeed[] } = {
  acquisition: [
    { area: 'Decision-Making', category: 'judgment', question: 'Tell me about the last big call made here while you were out. Who made it, and what did you think when you heard?' },
    { area: 'People',          category: 'judgment', question: 'Tell me about the last key person who left. What went with them, and what did you do about it?' },
    { area: 'Risk',            category: 'risk',     question: 'Tell me about an agreement this business runs on that is not on paper. How did it come about, and who knows the terms?' },
    { area: 'Capital',         category: 'judgment', question: 'Tell me about the last time the business needed money fast. Who found it, and what did it take?' },
    { area: 'Culture',         category: 'conflict', question: 'Tell me about a time a standard slipped. Who caught it, and what happened next?' },
    { area: 'Strategy',        category: 'judgment', question: 'Tell me about your largest customer. How did that start, and who do they call when something goes wrong?' },
    { area: 'Adversity',       category: 'risk',     question: 'Tell me about the worst week this business has had. Who did what in the first day?' },
    { area: 'Succession',      category: 'judgment', question: 'Tell me about the last thing you handed off. How did it go, and did it stay handed off?' },
  ],
  church: [
    { area: 'Decision-Making', category: 'judgment', question: 'Tell me about a time you had to decide for the church before you were sure. What did you know, what did you not, and what did you do?' },
    { area: 'People',          category: 'judgment', question: 'Tell me about a time you had to decide whether someone was ready to lead. What did you see, and what did you do?' },
    { area: 'Risk',            category: 'risk',     question: 'Tell me about a step this church took that could have failed in front of everyone. What was on the line, and what did you do?' },
    { area: 'Money',           category: 'judgment', question: 'Tell me about a year giving fell short and something had to give. What did you protect?' },
    { area: 'Standards',       category: 'conflict', question: 'Tell me about a time someone in leadership crossed a line. What was the line, and what did you do?' },
    { area: 'Direction',       category: 'judgment', question: 'Tell me about something good this church said no to. What was it, and why?' },
    { area: 'Adversity',       category: 'risk',     question: 'Tell me about the hardest week this church has had, and what you did in the first day.' },
    { area: 'Legacy',          category: 'judgment', question: 'Tell me about a ministry or a responsibility you handed to someone else, and how you decided they were ready.' },
  ],
}

/**
 * The opener for one area. With a lens that has its own openers and whose
 * taxonomy is this scope (acquisition on business, church on personal), that
 * lens's opener; otherwise the scope's. A lens on the wrong scope is ignored,
 * so a mismatch can only fall back to the opener the record got before.
 */
export function seedForArea(scope: FoundingScope, area: string, lens?: QuestionLens | null): AreaSeed | null {
  const own =
    lens === 'acquisition' && scope === 'business' ? LENS_AREA_SEEDS.acquisition
    : lens === 'church' && scope === 'personal'    ? LENS_AREA_SEEDS.church
    : null
  return own?.find(s => s.area === area) ?? AREA_SEEDS[scope].find(s => s.area === area) ?? null
}
