import { createHash } from 'crypto'
import { supabaseAdmin } from './supabase-admin'
import type { GroundingBasis } from './verifyGrounding'

/**
 * Grounding gap log — Slice A of the grounding gap queue.
 *
 * Records a succession question the frozen archive could not ground, so the gap
 * queue can later surface it to the founder. Written ONLY from the production
 * successor route (app/api/succession/entity/chat/route.ts).
 *
 * DO NOT import this from app/api/demo/succession-entity/route.ts. The public
 * demo is stateless fiction and must never write to any table. The only other
 * sanctioned importer is the regression gate scripts/gap-log-probe.ts.
 *
 * Fire-and-forget: every failure is swallowed here and logged through the same
 * console.error path the verifier uses. A gap-log failure must never change the
 * chat reply, its status code, or its latency beyond dispatching this call.
 * Callers invoke it WITHOUT awaiting.
 */

// A gap is only ever a non-'deposit' verdict; the table CHECK enforces the same.
type GapBasis = Exclude<GroundingBasis, 'deposit'> // 'unsupported' | 'no_position'

/**
 * question_hash normalization (v1, exact-ish): lowercase, collapse internal
 * whitespace, trim, strip terminal punctuation, sha256. No stemming, no
 * semantic clustering — that is explicitly out of scope for Slice A.
 */
export function questionHash(question: string): string {
  const normalized = question
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[.?!]+$/, '')
    .trim()
  return createHash('sha256').update(normalized).digest('hex')
}

export async function logGroundingGap({
  archiveId,
  question,
  basis,
}: {
  archiveId: string
  question: string
  basis: GapBasis
}): Promise<void> {
  try {
    // Atomic upsert-increment via a DB function: first sighting inserts the row
    // with this basis; a repeat increments hit_count and bumps last_seen_at and
    // LEAVES basis untouched (first classification wins). PostgREST's upsert
    // cannot express "hit_count + 1", so the increment lives in the function.
    // See supabase/migrations/20260718_grounding_gap_log_fn.sql.
    const { error } = await supabaseAdmin.rpc('log_grounding_gap', {
      p_archive_id:    archiveId,
      p_question:      question, // stored VERBATIM — no paraphrase, no truncation
      p_question_hash: questionHash(question),
      p_basis:         basis,
    })
    if (error) console.error('[logGroundingGap] rpc error:', error.message)
  } catch (err) {
    // Fire-and-forget: never let a logging failure touch the chat path.
    console.error('[logGroundingGap]', err instanceof Error ? err.message : err)
  }
}
