/**
 * Shared types for the fictional succession demo personas.
 *
 * These personas exist only to drive /succession/demo. They are fictional,
 * labeled fictional on the page, and hold no real archive data. All rendered
 * copy is transcribed verbatim from docs/BASALITH_DEMO_PERSONA_COPY.md. Any
 * change to that deck requires a matching change here.
 */

import type { FingerprintPair } from '@/lib/entitySystemPrompt'

/**
 * A fictional deposit. Extends FingerprintPair so an array of these feeds
 * formatFingerprintSection directly, exactly as real training_pairs rows do.
 * The id is a display pointer for the contrast cards, never an attribution.
 */
export type DemoPair = FingerprintPair & { id: string }

/**
 * A contrast card. groundedInPairId selects which deposit renders in reveal
 * two. It is authored in the deck, not produced by the pipeline, and is never
 * presented to the viewer as a per-deposit attribution of the live answer.
 */
export type ContrastCard = {
  id:               string
  question:         string
  successorAssumes: string
  groundedInPairId: string
}

/** A suggested question. pairId is null on the designed-to-refuse chip. */
export type Chip = {
  label:  string
  pairId: string | null
}

export type PersonaMetadata = {
  id:             string
  name:           string
  role:           string
  trigger:        string
  successorLabel: string
  bioLine:        string
  fictionalLabel: string
}

export type DemoPersona = {
  metadata:      PersonaMetadata
  /** Model-facing only. Names the fictional archive inside the system prompt. */
  archiveName:   string
  pairs:         DemoPair[]
  contrastCards: ContrastCard[]
  chips:         Chip[]
}
