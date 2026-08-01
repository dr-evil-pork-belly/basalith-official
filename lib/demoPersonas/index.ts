/**
 * Registry for the fictional succession demo personas, plus the shared page
 * copy. All rendered strings are transcribed verbatim from
 * docs/BASALITH_DEMO_PERSONA_COPY.md.
 */

import { margaretChen } from './margaretChen'
import { joey } from './joey'
import type { DemoPersona, PersonaMetadata } from './types'
import type { GroundingBasis } from '@/lib/verifyGrounding'

export type { DemoPersona, DemoPair, ContrastCard, Chip, PersonaMetadata } from './types'
export { margaretChen } from './margaretChen'
export { joey } from './joey'

export const DEMO_PERSONAS = { margaret: margaretChen, joey } as const

export type DemoPersonaId = keyof typeof DEMO_PERSONAS

export const DEMO_PERSONA_IDS = Object.keys(DEMO_PERSONAS) as DemoPersonaId[]

/** Whitelist guard for the demo API route. */
export function isDemoPersonaId(v: unknown): v is DemoPersonaId {
  return typeof v === 'string' && Object.prototype.hasOwnProperty.call(DEMO_PERSONAS, v)
}

export function getDemoPersona(id: DemoPersonaId): DemoPersona {
  return DEMO_PERSONAS[id]
}

// ── ANSWER STATE ─────────────────────────────────────────────────────────────

/**
 * Which of the three answer panels the demo renders.
 *
 * 'checked'     a deposit directly takes the position. The gold panel.
 * 'reasoned'    the entity reasoned from adjacent deposits and landed no
 *               position. Its own words survive.
 * 'no_deposit'  the entity offered no reasoning to show. Either the verifier
 *               replaced an overreaching draft with the templated gap, or the
 *               basis could not be read at all.
 *
 * 'reasoned' and 'no_deposit' share the dim panel. Neither is grounding, and
 * neither may ever wear the gold.
 */
export type DemoAnswerState = 'checked' | 'reasoned' | 'no_deposit'

/**
 * Selects the panel from the verifier's basis, and nothing else.
 *
 * There is no length or shape heuristic here on purpose. The two refusal
 * shapes are two code paths in app/api/demo/succession-entity/route.ts, not
 * two moods of one path: on 'unsupported' the draft is discarded for the
 * template, on 'no_position' the entity's own reasoning is kept. Basis is the
 * signal that already distinguishes them.
 *
 * An unreadable basis falls to 'no_deposit', the claim that asserts least.
 *
 * The client component and scripts/demo-refusal-probe.ts both call this, so
 * what the gate scores is what the page renders.
 */
export function demoAnswerState(basis: GroundingBasis | null): DemoAnswerState {
  if (basis === 'deposit')     return 'checked'
  if (basis === 'no_position') return 'reasoned'
  return 'no_deposit'
}

// ── SHARED PAGE COPY (deck section: SHARED PAGE COPY) ────────────────────────

/** Tag on a 'no_deposit' answer. Rendered uppercase. */
export const REFUSAL_TAG = 'No Deposit'

/** Fixed line under a 'no_deposit' answer. */
export const REFUSAL_EXPLAINER = 'No deposit covers this. The entity does not guess.'

/** Tag on a 'reasoned' answer. */
export const REASONED_TAG = 'REASONED, NOT DECIDED'

/**
 * Line under a 'reasoned' answer. Takes pronouns from the persona because the
 * sentence is about one specific founder. It claims exactly what the basis
 * establishes: no settled position, and reasoning drawn from what was settled.
 */
export function reasonedExplainer(m: PersonaMetadata): string {
  return `${m.pronounSubjectCap} never settled this one. This is how ${m.pronounSubject} reasons, from what ${m.pronounSubject} did settle.`
}

/** Collapsed intro block, two-layer explanation. */
export const COLLAPSED_INTRO =
  'Every founder archive has two layers. The frozen layer is the founder\'s judgment, captured while they ran the company, and it never changes after transition. The mutable layer is where a successor adds current business reality. This demo runs the frozen layer. Ask anything. Every answer is checked against the archive before you see it. Questions with no covering deposit get a refusal, on purpose.'

/** Shown once the session question cap is reached. */
export const SESSION_CAP_CARD =
  'That is the demo session. In a real engagement, the archive holds the founder\'s actual judgment, and the successor asks these questions for years. Your Legacy Guide can walk you through what a real archive holds.'

/** Server-enforced and client-enforced ceiling on user questions per session. */
export const MAX_USER_MESSAGES = 12
