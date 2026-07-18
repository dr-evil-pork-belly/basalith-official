/**
 * Registry for the fictional succession demo personas, plus the shared page
 * copy. All rendered strings are transcribed verbatim from
 * docs/BASALITH_DEMO_PERSONA_COPY.md.
 */

import { margaretChen } from './margaretChen'
import { joey } from './joey'
import type { DemoPersona } from './types'

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

// ── SHARED PAGE COPY (deck section: SHARED PAGE COPY) ────────────────────────

/** Fixed line under any refusal. */
export const REFUSAL_EXPLAINER = 'No deposit covers this. The entity does not guess.'

/** Collapsed intro block, two-layer explanation. */
export const COLLAPSED_INTRO =
  'Every founder archive has two layers. The frozen layer is the founder\'s judgment, captured while they ran the company, and it never changes after transition. The mutable layer is where a successor adds current business reality. This demo runs the frozen layer. Ask anything. Every answer is checked against the archive before you see it. Questions with no covering deposit get a refusal, on purpose.'

/** Shown once the session question cap is reached. */
export const SESSION_CAP_CARD =
  'That is the demo session. In a real engagement, the archive holds the founder\'s actual judgment, and the successor asks these questions for years. Your Legacy Guide can walk you through what a real archive holds.'

/** Server-enforced and client-enforced ceiling on user questions per session. */
export const MAX_USER_MESSAGES = 12
