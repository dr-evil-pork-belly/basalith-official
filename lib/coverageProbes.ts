/**
 * Coverage probe set, v2.
 *
 * WHAT V1 GOT WRONG, kept here because the mistake is easy to make again.
 *
 * v1 probes were position-forcing and orthogonal to the archive. They invented a
 * scenario and demanded a stance on it: "two candidates, equal on paper, one has
 * done this exact job before, which do you hire." Margaret Chen has four dense
 * People deposits (what she listens for in an interview, who makes partner, how
 * she keeps people, how she pays them) and scored 0 of 3 on People, because none
 * of those deposits is about that hypothetical. The verifier was right every
 * time. The questions missed.
 *
 * So "open" under v1 meant "the entity could not answer my arbitrary question,"
 * not "there is nothing deposited here." Only the second claim is worth showing
 * anyone, and it is the claim the customer-facing label makes.
 *
 * THE V2 RULE. A probe must be BOTH:
 *
 *   1. POSITION-FORCING. It must be impossible to answer honestly without
 *      landing on a stance, a named rule, or a specific action. Otherwise a
 *      'no_position' verdict carries no information: a densely covered founder
 *      and an empty archive produce the same result.
 *
 *   2. ON THE FOUNDER'S OWN GROUND. It must ask about a decision an operator in
 *      this domain has actually made, not one this file invented for them. The
 *      form that satisfies both is "name your own X and commit to it," not
 *      "here is my scenario, choose A or B."
 *
 * The v1 control that proves the mechanism: succession-02 asked which of two
 * capable people you hand the business to, the one who agrees or the one who
 * argues. Margaret's m14 answers exactly that. It scored 'deposit' and
 * Succession was her best domain. When a probe touches deposited ground the
 * pipeline works cleanly. The fix was never the verifier.
 *
 * SIX PER DOMAIN, not three. Two reasons. Orthogonality is a coverage problem
 * that more shots partly solve, and three probes let a single flipped verdict
 * move a whole domain. Observed v1 drift was 21 to 29 percent of probes changing
 * basis across two identical runs on an identical fixture, which moved three of
 * eight domains. Six probes make a domain state a majority reading rather than a
 * coin flip.
 *
 * Probes are never rendered to a customer. They are still approved as rendered
 * copy, and they obey the copy rules: no em dashes, American English, short
 * declarative sentences.
 */

import { B2B_DOMAINS } from './b2bDomains'

/**
 * Bump on ANY edit to a probe question or to set membership. A result computed
 * under one version is not comparable to one computed under another, and
 * coverage_runs.probe_set_version is what makes that impossible to forget.
 *
 * v1  24 probes, 3 per domain. Scenario-locked. Retired 2026-08-16 after the
 *     fixture run showed 0 of 8 domains backed on a dense fictional B2B archive.
 * v2  48 probes, 6 per domain. Own-ground form.
 */
export const PROBE_SET_VERSION = 'v2'

export const PROBES_PER_DOMAIN = 6

export type CoverageProbe = {
  /** Stable, unique across the set. Used as the Inngest step id, so it must not collide. */
  key:      string
  /** Matches a B2B_DOMAINS name exactly. */
  domain:   string
  question: string
}

export const COVERAGE_PROBES: CoverageProbe[] = [
  // ── Decision-Making: how you make the call when the data runs out ──────────
  { key: 'decision-01', domain: 'Decision-Making', question: 'Name the test you apply when the analysis will not settle a decision. State the test itself, not a description of your style.' },
  { key: 'decision-02', domain: 'Decision-Making', question: 'When your read of a situation and the numbers disagree, say which one you follow and what it takes to override it.' },
  { key: 'decision-03', domain: 'Decision-Making', question: 'Name a decision you make fast on purpose and one you make slowly on purpose. Say what puts a decision in each group.' },
  { key: 'decision-04', domain: 'Decision-Making', question: 'Say what you do when you catch yourself building the case for the answer you already wanted.' },
  { key: 'decision-05', domain: 'Decision-Making', question: 'Name a decision you got wrong, say what the tell was that you missed, and say what you check for now because of it.' },
  { key: 'decision-06', domain: 'Decision-Making', question: 'Say who you consult before a hard call, and who you deliberately do not.' },

  // ── People: how you hire, read, and let people go ──────────────────────────
  { key: 'people-01', domain: 'People', question: 'Name the one signal you trust most when deciding whether to hire someone, and say what you do when you see it.' },
  { key: 'people-02', domain: 'People', question: 'Say who gets promoted here, and what disqualifies someone who is hitting their numbers.' },
  { key: 'people-03', domain: 'People', question: 'Name what you do to keep the people you cannot afford to lose, and say who you do it for.' },
  { key: 'people-04', domain: 'People', question: 'Say how you pay people, and say what your pay system is built to protect.' },
  { key: 'people-05', domain: 'People', question: 'Name what someone has to do to lose your confidence, and say how long they get after that.' },
  { key: 'people-06', domain: 'People', question: 'Say what you do about a strong performer the rest of the team has learned to work around.' },

  // ── Risk: what you bet on and what you walk away from ──────────────────────
  { key: 'risk-01', domain: 'Risk', question: 'Name the line you will not cross for money, and say what holding it has cost you.' },
  { key: 'risk-02', domain: 'Risk', question: 'Say what size of loss you can carry without changing how you operate, and what happens above that.' },
  { key: 'risk-03', domain: 'Risk', question: 'Name the concentration you watch most closely, and say the point at which you act on it.' },
  { key: 'risk-04', domain: 'Risk', question: 'Say what you do when an opportunity is right and the timing is wrong.' },
  { key: 'risk-05', domain: 'Risk', question: 'Name a bet you took that you would not take again, and say what changed in how you decide.' },
  { key: 'risk-06', domain: 'Risk', question: 'Say what you insist on knowing before you commit, and what you accept not knowing.' },

  // ── Capital: how you allocate money and when you hold ──────────────────────
  { key: 'capital-01', domain: 'Capital', question: 'Say where the next spare dollar goes, and why that before the alternatives.' },
  { key: 'capital-02', domain: 'Capital', question: 'Name what you will borrow for and what you will not.' },
  { key: 'capital-03', domain: 'Capital', question: 'Say when you hold cash instead of deploying it, and what level of it makes you uncomfortable.' },
  { key: 'capital-04', domain: 'Capital', question: 'Name the last thing you funded over something else, and say what decided it.' },
  { key: 'capital-05', domain: 'Capital', question: 'Say what you do with a part of the business that is profitable and not growing.' },
  { key: 'capital-06', domain: 'Capital', question: 'Name what you would give up ownership or control for, if anything.' },

  // ── Culture: the standards you set and defend ──────────────────────────────
  { key: 'culture-01', domain: 'Culture', question: 'Name a standard you enforce that costs you money, and say what it costs.' },
  { key: 'culture-02', domain: 'Culture', question: 'Say what happens when someone senior breaks a rule you set.' },
  { key: 'culture-03', domain: 'Culture', question: 'Name the thing you never delegate, and say why it has to be you.' },
  { key: 'culture-04', domain: 'Culture', question: 'Say what behavior gets someone removed here regardless of their results.' },
  { key: 'culture-05', domain: 'Culture', question: 'Name what you want people doing when you are not in the room, and say how they learned it.' },
  { key: 'culture-06', domain: 'Culture', question: 'Say what you tolerate that others in your position would not.' },

  // ── Strategy: where you choose to play and where you won't ─────────────────
  { key: 'strategy-01', domain: 'Strategy', question: 'Name what you have deliberately chosen not to do, and say what would change your mind.' },
  { key: 'strategy-02', domain: 'Strategy', question: 'Say what you do when a large customer asks for something outside what you do.' },
  { key: 'strategy-03', domain: 'Strategy', question: 'Name how you price, and say what you will and will not trade on price.' },
  { key: 'strategy-04', domain: 'Strategy', question: 'Say who you turn away, and name the tell you go on.' },
  { key: 'strategy-05', domain: 'Strategy', question: 'Name something you believe about this business that most people in it do not.' },
  { key: 'strategy-06', domain: 'Strategy', question: 'Say what you would do if a competitor undercut you materially, and commit to it.' },

  // ── Adversity: how you act when things break ───────────────────────────────
  { key: 'adversity-01', domain: 'Adversity', question: 'Name the worst stretch this business has had, and say what you did first.' },
  { key: 'adversity-02', domain: 'Adversity', question: 'Say what you cut first when you have to cut, and what you protect.' },
  { key: 'adversity-03', domain: 'Adversity', question: 'Name what you do when a mistake is yours and it is visible.' },
  { key: 'adversity-04', domain: 'Adversity', question: 'Say who you call when something breaks, and in what order.' },
  { key: 'adversity-05', domain: 'Adversity', question: 'Name what you have learned to do earlier than you used to when things go wrong.' },
  { key: 'adversity-06', domain: 'Adversity', question: 'Say how you deliver bad news, and when.' },

  // ── Succession: what you want carried forward, and what you'd change ───────
  { key: 'succession-01', domain: 'Succession', question: 'Name the one thing you would tell a successor not to change, and say why.' },
  { key: 'succession-02', domain: 'Succession', question: 'Name the first thing you would tell a successor to change.' },
  { key: 'succession-03', domain: 'Succession', question: 'Say how you choose who takes over, and what you weight most heavily.' },
  { key: 'succession-04', domain: 'Succession', question: 'Say how you hand a relationship or an account to someone else.' },
  { key: 'succession-05', domain: 'Succession', question: 'Name what you know that is written down nowhere.' },
  { key: 'succession-06', domain: 'Succession', question: 'Say what you would do if they asked your view on a call after you had handed over.' },
]

/**
 * Fails at import time if the set drifts out of shape. Cheap, and it catches the
 * two mistakes that would silently corrupt a run: a probe naming a domain that
 * is not live, and a duplicate key colliding on the Inngest step id (the same
 * class of bug as the `rehash:${b2_key}` collision on the verify path).
 */
function assertProbeSetShape(): void {
  const domainNames = new Set(B2B_DOMAINS.map(d => d.name))

  const keys = new Set<string>()
  for (const p of COVERAGE_PROBES) {
    if (keys.has(p.key)) throw new Error(`[coverageProbes] duplicate probe key: ${p.key}`)
    keys.add(p.key)
    if (!domainNames.has(p.domain)) {
      throw new Error(`[coverageProbes] probe ${p.key} names a domain that is not live: ${p.domain}`)
    }
  }

  for (const d of B2B_DOMAINS) {
    const n = COVERAGE_PROBES.filter(p => p.domain === d.name).length
    if (n !== PROBES_PER_DOMAIN) {
      throw new Error(`[coverageProbes] domain ${d.name} has ${n} probes, expected ${PROBES_PER_DOMAIN}`)
    }
  }
}

assertProbeSetShape()

export function probesForDomain(domain: string): CoverageProbe[] {
  return COVERAGE_PROBES.filter(p => p.domain === domain)
}
