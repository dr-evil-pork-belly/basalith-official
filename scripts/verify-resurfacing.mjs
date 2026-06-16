// Verification harness for /api/resurfacing/today.
//
// The route resolves archive_id from the owner session and then runs a fixed
// DB path. This script substitutes the known archive_id and runs that SAME path
// (same candidate filters, same ON CONFLICT (archive_id, shown_on) upsert, same
// payload assembly) via the service role, so the "hit twice -> identical" and
// "count = 1" behavior can be verified without an owner browser session.
//
// Usage: node scripts/verify-resurfacing.mjs
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

// Load .env.local without extra deps.
for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
  const m = /^([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line.trim())
  if (m) process.env[m[1]] ??= m[2]
}

const ARCHIVE_ID = 'a38e4503-c7d2-4af3-af8c-cacd66974e0b'
const MIN_AGE_DAYS = 30, MIN_CHARS = 80
const EXCLUDED = ['companion', 'entity_chat', 'contributor_ping']
const COOLDOWN_DAYS = 180, THROTTLE_DAYS = 3, DAY_MS = 86_400_000, YEAR_DAYS = 365

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const utcDate = ms => new Date(ms).toISOString().slice(0, 10)

function classifyBand(ageDays) {
  const n = Math.round(ageDays / YEAR_DAYS)
  if (n >= 1 && Math.abs(ageDays - n * YEAR_DAYS) <= 1) return { key: `anniversary_${n}y`, prio: 1 }
  if (ageDays >= 350 && ageDays <= 380) return { key: 'about_a_year', prio: 2 }
  if (ageDays >= 167 && ageDays <= 198) return { key: 'months_6', prio: 3 }
  if (ageDays >= 30 && ageDays <= 75) return { key: 'weeks', prio: 4 }
  return { key: 'kept', prio: 5 }
}
function frameTextFromKey(frameKey, language) {
  const lang = (language ?? 'en').toLowerCase()
  const anniv = /^anniversary_(\d+)y$/.exec(frameKey)
  if (anniv) {
    const n = Number(anniv[1])
    return n === 1 ? 'One year ago today, you told me this. I kept it.'
                   : `${n} years ago today, you told me this. I kept it.`
  }
  const map = {
    about_a_year: 'About a year ago, you told me this.',
    months_6:     'Six months ago, you said this to me.',
    weeks:        'A few weeks ago, you said this to me.',
    kept:         'You told me this a while back. I kept it.',
  }
  return map[frameKey] ?? map.kept
}

async function selectResurfacing(archiveId) {
  const now = Date.now()
  const ageCutoffIso = new Date(now - MIN_AGE_DAYS * DAY_MS).toISOString()
  const cooldownCutoff = utcDate(now - COOLDOWN_DAYS * DAY_MS)
  const throttleCutoff = utcDate(now - THROTTLE_DAYS * DAY_MS)

  const { data: prior } = await db.from('deposit_resurfacings')
    .select('deposit_id, shown_on').eq('archive_id', archiveId)
  const recentlyShown = new Set((prior ?? []).filter(r => r.shown_on >= cooldownCutoff).map(r => r.deposit_id))
  const everShown = new Set((prior ?? []).map(r => r.deposit_id))
  const shownWithinThrottle = (prior ?? []).some(r => r.shown_on >= throttleCutoff)

  const { data: depRows } = await db.from('owner_deposits')
    .select('id, created_at, source_type, prompt, response')
    .eq('archive_id', archiveId)
    .is('contributor_id', null)
    .neq('source_type', 'contributor')
    .not('source_type', 'in', `(${EXCLUDED.join(',')})`)
    .lte('created_at', ageCutoffIso)
    .order('created_at', { ascending: true })

  const candidates = (depRows ?? [])
    .filter(d => (d.response ?? '').trim().length >= MIN_CHARS)
    .filter(d => !recentlyShown.has(d.id))
    .map(d => ({ ...d, ageDays: (now - new Date(d.created_at).getTime()) / DAY_MS }))
    .map(d => ({ ...d, band: classifyBand(d.ageDays) }))

  if (!candidates.length) return { sel: null, eligible: 0 }
  const bestPrio = Math.min(...candidates.map(c => c.band.prio))
  const group = candidates.filter(c => c.band.prio === bestPrio)
  const isAnniversary = bestPrio === 1
  const ranked = [...group].sort((a, b) => {
    if (isAnniversary) {
      const da = Math.abs(a.ageDays - Math.round(a.ageDays / YEAR_DAYS) * YEAR_DAYS)
      const dbv = Math.abs(b.ageDays - Math.round(b.ageDays / YEAR_DAYS) * YEAR_DAYS)
      if (da !== dbv) return da - dbv
    }
    const sa = everShown.has(a.id) ? 1 : 0, sb = everShown.has(b.id) ? 1 : 0
    if (sa !== sb) return sa - sb
    return new Date(a.created_at) - new Date(b.created_at)
  })
  const w = ranked[0]
  if (!isAnniversary && shownWithinThrottle) return { sel: null, eligible: candidates.length }

  const { data: arch } = await db.from('archives').select('preferred_language').eq('id', archiveId).maybeSingle()
  return {
    eligible: candidates.length,
    sel: {
      deposit_id: w.id, created_at: w.created_at, source_type: w.source_type,
      prompt: w.prompt ?? null, frame_key: w.band.key,
      frame_text: frameTextFromKey(w.band.key, arch?.preferred_language ?? 'en'),
    },
  }
}

// Emulates exactly what GET /api/resurfacing/today does after archive resolution.
async function hitEndpoint(archiveId) {
  const today = new Date().toISOString().slice(0, 10)
  async function payloadFor(depositId, frameKey, reaction) {
    const [{ data: dep }, { data: arch }] = await Promise.all([
      db.from('owner_deposits').select('id, created_at, source_type, prompt, response')
        .eq('id', depositId).eq('archive_id', archiveId).maybeSingle(),
      db.from('archives').select('preferred_language').eq('id', archiveId).maybeSingle(),
    ])
    if (!dep) return { resurfacing: null }
    return { resurfacing: {
      deposit_id: dep.id, created_at: dep.created_at, source_type: dep.source_type,
      prompt: dep.prompt ?? null, response: dep.response,
      frame_key: frameKey, frame_text: frameTextFromKey(frameKey, arch?.preferred_language ?? 'en'),
      reaction: reaction ?? null,
    } }
  }
  const { data: existing } = await db.from('deposit_resurfacings')
    .select('deposit_id, frame_key, reaction').eq('archive_id', archiveId).eq('shown_on', today).maybeSingle()
  if (existing) return payloadFor(existing.deposit_id, existing.frame_key, existing.reaction)

  const { sel } = await selectResurfacing(archiveId)
  if (!sel) return { resurfacing: null }
  await db.from('deposit_resurfacings').upsert(
    { archive_id: archiveId, deposit_id: sel.deposit_id, shown_on: today, frame_key: sel.frame_key },
    { onConflict: 'archive_id,shown_on', ignoreDuplicates: true },
  )
  const { data: row } = await db.from('deposit_resurfacings')
    .select('deposit_id, frame_key, reaction').eq('archive_id', archiveId).eq('shown_on', today).maybeSingle()
  if (!row) return { resurfacing: null }
  return payloadFor(row.deposit_id, row.frame_key, row.reaction)
}

async function main() {
  const probe = await db.from('deposit_resurfacings').select('id').limit(1)
  if (probe.error) {
    console.log('TABLE CHECK: deposit_resurfacings not reachable ->', probe.error.message)
    console.log('Run supabase/migrations/20260616_deposit_resurfacings.sql first, then re-run this script.')
    const dry = await selectResurfacing(ARCHIVE_ID)
    console.log('\n(selection dry-run still works — eligible candidates:', dry.eligible, ')')
    console.log('would-select:', JSON.stringify(dry.sel, null, 2))
    return
  }
  console.log('=== CALL 1 ===')
  const r1 = await hitEndpoint(ARCHIVE_ID)
  console.log(JSON.stringify(r1, null, 2))
  console.log('\n=== CALL 2 ===')
  const r2 = await hitEndpoint(ARCHIVE_ID)
  console.log(JSON.stringify(r2, null, 2))
  console.log('\nIDENTICAL:', JSON.stringify(r1) === JSON.stringify(r2))
  const today = new Date().toISOString().slice(0, 10)
  const { count } = await db.from('deposit_resurfacings')
    .select('*', { count: 'exact', head: true })
    .eq('archive_id', ARCHIVE_ID).eq('shown_on', today)
  console.log('count(*) for (archive, today):', count)
}
main().catch(e => { console.error(e); process.exit(1) })
