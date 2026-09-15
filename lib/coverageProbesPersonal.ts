/**
 * Coverage probe set for personal archives, p1.
 *
 * Same rules as the business set in lib/coverageProbes.ts, and read that file's
 * header first, because the mistake v1 made there is the mistake this set is
 * built not to repeat. Every probe here is:
 *
 *   1. POSITION-FORCING. It cannot be answered honestly without landing on a
 *      stance, a named rule, or a specific action.
 *
 *   2. ON THE PERSON'S OWN GROUND. It asks about a call this person has
 *      actually made in their own life, not a scenario this file invented.
 *      "Name your own X and commit to it," never "here is my situation, pick."
 *
 * The one addition: a probe may land AT HOME OR AT WORK, and several say so.
 * The taxonomy is by kind of judgment, not by sphere (see
 * lib/personalDomains.ts), so a founder answering about the company and a
 * grandmother answering about the family are read by the same map.
 *
 * Where a business probe was already sphere-neutral it is kept nearly as is,
 * under its own key. That is not laziness. The kinds of judgment are shared
 * and the question was already the right question. Where the business probe
 * named a company mechanism (hiring, pricing, a competitor) it is replaced by
 * the life equivalent.
 *
 * Probes are never rendered to a customer. lib/foundingProof.ts shows the
 * owner a small separate list (REFUSAL_CANDIDATES), and a test pins that no
 * probe in either set appears there.
 *
 * Copy rules apply as if rendered: no em dashes, no exclamation points,
 * American English, short declarative sentences.
 */

import { PERSONAL_DOMAINS } from './personalDomains'
import { PROBES_PER_DOMAIN, type CoverageProbe } from './coverageProbes'

/**
 * Bump on ANY edit to a probe question, to set membership, or to a domain name
 * in lib/personalDomains.ts. A reading under one version is not comparable to
 * one under another, and coverage_runs.probe_set_version is what makes that
 * impossible to forget. Versions are prefixed p so a personal reading can never
 * be mistaken for a business one in a query.
 *
 * p1  48 probes, 6 per domain. Own-ground form. September 15, 2026.
 */
export const PERSONAL_PROBE_SET_VERSION = 'p1'

export const PERSONAL_COVERAGE_PROBES: CoverageProbe[] = [
  // ── Decision-Making: how you make the call when you cannot know enough ─────
  { key: 'p-decision-01', domain: 'Decision-Making', question: 'Name the test you use to settle a decision once you have thought about it as long as you can. State the test itself, not a description of your style.' },
  { key: 'p-decision-02', domain: 'Decision-Making', question: 'When your gut and the facts disagree, say which one you follow and what it takes to override it.' },
  { key: 'p-decision-03', domain: 'Decision-Making', question: 'Name a kind of decision you make fast on purpose and one you sleep on, and say what puts a decision in each group.' },
  { key: 'p-decision-04', domain: 'Decision-Making', question: 'Say what you do when you notice you are building the case for what you already wanted.' },
  { key: 'p-decision-05', domain: 'Decision-Making', question: 'Name a decision you got wrong, at home or at work, say what you missed, and say what you check for now because of it.' },
  { key: 'p-decision-06', domain: 'Decision-Making', question: 'Say who you talk to before a hard call, and who you deliberately keep out of it.' },

  // ── People: how you read people, who you trust, and when you step back ─────
  { key: 'p-people-01', domain: 'People', question: 'Name the one thing you watch for when deciding whether to trust someone, and say what you do when you see it.' },
  { key: 'p-people-02', domain: 'People', question: 'Say what someone has to do to lose your trust, and whether they can get it back.' },
  { key: 'p-people-03', domain: 'People', question: 'Name what you do to keep the people you cannot afford to lose, and say who you do it for.' },
  { key: 'p-people-04', domain: 'People', question: 'Say what you do when someone close to you is making a choice you think is a mistake.' },
  { key: 'p-people-05', domain: 'People', question: 'Say how you decide when to step back from a relationship, and name the last time you did.' },
  { key: 'p-people-06', domain: 'People', question: 'Say how you handle someone who is difficult and who you cannot walk away from.' },

  // ── Risk: what you bet on and what you walk away from ──────────────────────
  { key: 'p-risk-01', domain: 'Risk', question: 'Name the line you will not cross for money or advantage, and say what holding it has cost you.' },
  { key: 'p-risk-02', domain: 'Risk', question: 'Say what size of loss you can carry without it changing how you live, and what happens above that.' },
  { key: 'p-risk-03', domain: 'Risk', question: 'Name the risk you watch most closely in your own life, and say the point at which you act on it.' },
  { key: 'p-risk-04', domain: 'Risk', question: 'Say what you do when a chance is right and the timing is wrong.' },
  { key: 'p-risk-05', domain: 'Risk', question: 'Name a bet you took with your years or your money that you would not take again, and say what changed in how you decide.' },
  { key: 'p-risk-06', domain: 'Risk', question: 'Say what you insist on knowing before you commit to something big, and what you accept not knowing.' },

  // ── Money: how you spend, save, give, and when you hold ────────────────────
  { key: 'p-money-01', domain: 'Money', question: 'Say where the next spare dollar goes, and why that before the alternatives.' },
  { key: 'p-money-02', domain: 'Money', question: 'Name what you will borrow for and what you will not.' },
  { key: 'p-money-03', domain: 'Money', question: 'Say what money is for, in your house, and name one thing you refuse to spend on.' },
  { key: 'p-money-04', domain: 'Money', question: 'Say when you hold cash instead of using it, and what level of savings makes you uncomfortable.' },
  { key: 'p-money-05', domain: 'Money', question: 'Name what you give money to, and say how you decide how much.' },
  { key: 'p-money-06', domain: 'Money', question: 'Name the last thing you spent real money on over something else, and say what decided it.' },

  // ── Standards: the lines you hold and what you do when one is crossed ──────
  { key: 'p-standards-01', domain: 'Standards', question: 'Name a standard you hold that costs you, and say what it costs.' },
  { key: 'p-standards-02', domain: 'Standards', question: 'Say what happens when someone you love breaks a rule you set.' },
  { key: 'p-standards-03', domain: 'Standards', question: 'Name the thing you never hand to anyone else, and say why it has to be you.' },
  { key: 'p-standards-04', domain: 'Standards', question: 'Say what someone can do that ends their place in your life, regardless of the history.' },
  { key: 'p-standards-05', domain: 'Standards', question: 'Name what you want the people who learned from you doing when you are not in the room, and say how they learned it.' },
  { key: 'p-standards-06', domain: 'Standards', question: 'Say what you put up with that others in your position would not.' },

  // ── Direction: where you put your years and what you say no to ─────────────
  { key: 'p-direction-01', domain: 'Direction', question: 'Name what you have deliberately chosen not to do with your life, and say what would change your mind.' },
  { key: 'p-direction-02', domain: 'Direction', question: 'Say what you do when someone you owe asks for more of your time than you have.' },
  { key: 'p-direction-03', domain: 'Direction', question: 'Say how you choose between the safe path and the one you want more, and name the last time you chose.' },
  { key: 'p-direction-04', domain: 'Direction', question: 'Say who you turn away from, and name the tell you go on.' },
  { key: 'p-direction-05', domain: 'Direction', question: 'Name something you believe about how to live that most people around you do not.' },
  { key: 'p-direction-06', domain: 'Direction', question: 'Say what you would do if the thing you built your life around stopped being possible, and commit to it.' },

  // ── Adversity: how you act when things break ───────────────────────────────
  { key: 'p-adversity-01', domain: 'Adversity', question: 'Name the worst stretch of your life, and say what you did first.' },
  { key: 'p-adversity-02', domain: 'Adversity', question: 'Say what you cut first when you have to cut back, and what you protect.' },
  { key: 'p-adversity-03', domain: 'Adversity', question: 'Name what you do when a mistake is yours and everyone can see it.' },
  { key: 'p-adversity-04', domain: 'Adversity', question: 'Say who you call when something breaks, and in what order.' },
  { key: 'p-adversity-05', domain: 'Adversity', question: 'Name what you have learned to do earlier than you used to when things go wrong.' },
  { key: 'p-adversity-06', domain: 'Adversity', question: 'Say how you deliver bad news to the people closest to you, and when.' },

  // ── Legacy: what you want carried forward, and what you would change ───────
  { key: 'p-legacy-01', domain: 'Legacy', question: 'Name the one thing you would tell the people who come after you not to change, and say why.' },
  { key: 'p-legacy-02', domain: 'Legacy', question: 'Name the first thing you would tell them to change.' },
  { key: 'p-legacy-03', domain: 'Legacy', question: 'Say how you decide who to trust with what you leave behind, and what you weight most heavily.' },
  { key: 'p-legacy-04', domain: 'Legacy', question: 'Say how you hand a responsibility to someone, at home or at work, and when you let go of it.' },
  { key: 'p-legacy-05', domain: 'Legacy', question: 'Name what you know that is written down nowhere.' },
  { key: 'p-legacy-06', domain: 'Legacy', question: 'Say what you would want them to do when they are not sure what you would have done.' },
]

/**
 * Fails at import time if the set drifts out of shape. Same two traps as the
 * business set: a probe naming a domain that is not in the personal taxonomy,
 * and a duplicate key colliding on the Inngest step id.
 */
function assertPersonalProbeSetShape(): void {
  const domainNames = new Set(PERSONAL_DOMAINS.map(d => d.name))

  const keys = new Set<string>()
  for (const p of PERSONAL_COVERAGE_PROBES) {
    if (keys.has(p.key)) throw new Error(`[coverageProbesPersonal] duplicate probe key: ${p.key}`)
    keys.add(p.key)
    if (!domainNames.has(p.domain)) {
      throw new Error(`[coverageProbesPersonal] probe ${p.key} names a domain that is not in the personal taxonomy: ${p.domain}`)
    }
  }

  for (const d of PERSONAL_DOMAINS) {
    const n = PERSONAL_COVERAGE_PROBES.filter(p => p.domain === d.name).length
    if (n !== PROBES_PER_DOMAIN) {
      throw new Error(`[coverageProbesPersonal] domain ${d.name} has ${n} probes, expected ${PROBES_PER_DOMAIN}`)
    }
  }
}

assertPersonalProbeSetShape()
