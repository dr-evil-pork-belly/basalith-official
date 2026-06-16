/**
 * "You told me this" — selection for the dashboard resurfacing card.
 *
 * PURE RETRIEVAL. There is zero AI generation in this path. The chosen
 * deposit's own `response` is the payload; the only added words are a fixed,
 * template-chosen time-frame line (see frameTextFromKey). Do not add a
 * generated reflection, summary, paraphrase, or commentary here.
 *
 * selectResurfacing(archiveId) returns the single deposit to surface today,
 * or null when nothing qualifies (the card then does not render).
 */
import { supabaseAdmin } from '@/lib/supabase-admin'

// ── Tunable constants ─────────────────────────────────────────────────────────
export const MIN_AGE_DAYS = 30 // floor: a deposit must be at least this old
export const MIN_CHARS    = 80 // substantive floor on trim(response) length

// Owner-authored is the canonical predicate from lib/holdoutAssignment.ts:170
// ( !contributor_id && source_type !== 'contributor' ). On top of that we drop
// channels whose `response` is not the owner's own verbatim writing:
//   companion      -> model's save_deposit tool output
//   entity_chat    -> can store the entity's (model-generated) reply
//   contributor_ping -> a reaction to a family contribution, orphaned without it
export const EXCLUDED_SOURCE_TYPES = ['companion', 'entity_chat', 'contributor_ping'] as const

const COOLDOWN_DAYS = 180 // a deposit shown within this window is not re-eligible
const THROTTLE_DAYS = 3   // suppress non-anniversary picks this soon after the last
const DAY_MS    = 86_400_000
const YEAR_DAYS = 365

export interface Resurfacing {
  deposit_id:  string
  created_at:  string
  source_type: string
  prompt:      string | null
  frame_key:   string
  frame_text:  string
}

// ── Frame bands (deterministic) ────────────────────────────────────────────────
// age = now - created_at. Pick the single highest-priority band a candidate
// falls into. frame_key is derived from the band, never generated.
interface Band { key: string; prio: number }

export function classifyBand(ageDays: number): Band {
  const n = Math.round(ageDays / YEAR_DAYS)
  if (n >= 1 && Math.abs(ageDays - n * YEAR_DAYS) <= 1) return { key: `anniversary_${n}y`, prio: 1 }
  if (ageDays >= 350 && ageDays <= 380) return { key: 'about_a_year', prio: 2 }
  if (ageDays >= 167 && ageDays <= 198) return { key: 'months_6',     prio: 3 }
  if (ageDays >= 30  && ageDays <= 75)  return { key: 'weeks',        prio: 4 }
  return { key: 'kept', prio: 5 }
}

// English frame text, keyed off frame_key. Anniversary N is parsed from the key.
function frameTextEn(frameKey: string): string {
  const anniv = /^anniversary_(\d+)y$/.exec(frameKey)
  if (anniv) {
    const n = Number(anniv[1])
    return n === 1
      ? 'One year ago today, you told me this. I kept it.'
      : `${n} years ago today, you told me this. I kept it.`
  }
  switch (frameKey) {
    case 'about_a_year': return 'About a year ago, you told me this.'
    case 'months_6':     return 'Six months ago, you said this to me.'
    case 'weeks':        return 'A few weeks ago, you said this to me.'
    case 'kept':
    default:             return 'You told me this a while back. I kept it.'
  }
}

// PLACEHOLDER — Cantonese copy is pending from David. Until he supplies real
// strings, non-English archives fall back to the dignified English line so
// nothing broken renders. Replace the values below with real Cantonese; the
// {N} token is substituted for the anniversary year count.
const FRAME_TEXT_ZH_PLACEHOLDER: Record<string, string> = {
  anniversary_1y: 'One year ago today, you told me this. I kept it.',
  anniversary_Ny: '{N} years ago today, you told me this. I kept it.',
  about_a_year:   'About a year ago, you told me this.',
  months_6:       'Six months ago, you said this to me.',
  weeks:          'A few weeks ago, you said this to me.',
  kept:           'You told me this a while back. I kept it.',
}

// Deterministic frame text. Respects the archive's preferred_language.
export function frameTextFromKey(frameKey: string, language?: string | null): string {
  const lang = (language ?? 'en').toLowerCase()
  if (lang === 'en' || lang.startsWith('en')) return frameTextEn(frameKey)

  // Non-English: use the clearly-marked placeholder map (English fallback for now).
  const anniv = /^anniversary_(\d+)y$/.exec(frameKey)
  if (anniv) {
    const n = Number(anniv[1])
    const tpl = n === 1 ? FRAME_TEXT_ZH_PLACEHOLDER.anniversary_1y : FRAME_TEXT_ZH_PLACEHOLDER.anniversary_Ny
    return tpl.replace('{N}', String(n))
  }
  return FRAME_TEXT_ZH_PLACEHOLDER[frameKey] ?? frameTextEn(frameKey)
}

// ── Selection ──────────────────────────────────────────────────────────────────
function utcDate(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10)
}

export async function selectResurfacing(archiveId: string): Promise<Resurfacing | null> {
  const now = Date.now()
  const ageCutoffIso   = new Date(now - MIN_AGE_DAYS * DAY_MS).toISOString()
  const cooldownCutoff = utcDate(now - COOLDOWN_DAYS * DAY_MS)
  const throttleCutoff = utcDate(now - THROTTLE_DAYS * DAY_MS)

  // Prior resurfacings for this archive: drive the 180-day per-deposit cooldown,
  // the "never resurfaced" tiebreak, and the 3-day throttle.
  const { data: priorRows } = await supabaseAdmin
    .from('deposit_resurfacings')
    .select('deposit_id, shown_on')
    .eq('archive_id', archiveId)

  const prior = priorRows ?? []
  const recentlyShown       = new Set(prior.filter(r => r.shown_on >= cooldownCutoff).map(r => r.deposit_id))
  const everShown           = new Set(prior.map(r => r.deposit_id))
  const shownWithinThrottle = prior.some(r => r.shown_on >= throttleCutoff)

  // Candidate pool. The canonical owner-authored predicate is expressed as
  // query filters; excluded source_types are removed; age and recency applied.
  const { data: depRows } = await supabaseAdmin
    .from('owner_deposits')
    .select('id, created_at, source_type, prompt, response')
    .eq('archive_id', archiveId)
    .is('contributor_id', null)
    .neq('source_type', 'contributor')
    .not('source_type', 'in', `(${EXCLUDED_SOURCE_TYPES.join(',')})`)
    .lte('created_at', ageCutoffIso)
    .order('created_at', { ascending: true })

  const candidates = (depRows ?? [])
    .filter(d => (d.response ?? '').trim().length >= MIN_CHARS)
    .filter(d => !recentlyShown.has(d.id))
    .map(d => {
      const ageDays = (now - new Date(d.created_at).getTime()) / DAY_MS
      return { ...d, ageDays, band: classifyBand(ageDays) }
    })

  if (candidates.length === 0) return null

  // Highest-priority band with a candidate.
  const bestPrio = Math.min(...candidates.map(c => c.band.prio))
  const group    = candidates.filter(c => c.band.prio === bestPrio)
  const isAnniversary = bestPrio === 1

  const neverShownRank = (id: string) => (everShown.has(id) ? 1 : 0)
  const oldestFirst    = (a: typeof group[number], b: typeof group[number]) =>
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()

  const ranked = [...group].sort((a, b) => {
    if (isAnniversary) {
      // Nearest the exact year boundary, then never-shown, then oldest.
      const da = Math.abs(a.ageDays - Math.round(a.ageDays / YEAR_DAYS) * YEAR_DAYS)
      const db = Math.abs(b.ageDays - Math.round(b.ageDays / YEAR_DAYS) * YEAR_DAYS)
      if (da !== db) return da - db
    }
    // All bands prefer never-resurfaced rows, then oldest created_at first.
    const sa = neverShownRank(a.id), sb = neverShownRank(b.id)
    if (sa !== sb) return sa - sb
    return oldestFirst(a, b)
  })

  const winner = ranked[0]

  // Throttle: keep it a treat. A recent resurfacing suppresses everything but
  // an anniversary.
  if (!isAnniversary && shownWithinThrottle) return null

  // Language for the deterministic frame line.
  const { data: arch } = await supabaseAdmin
    .from('archives')
    .select('preferred_language')
    .eq('id', archiveId)
    .maybeSingle()

  return {
    deposit_id:  winner.id,
    created_at:  winner.created_at,
    source_type: winner.source_type,
    prompt:      winner.prompt ?? null,
    frame_key:   winner.band.key,
    frame_text:  frameTextFromKey(winner.band.key, arch?.preferred_language ?? 'en'),
  }
}
