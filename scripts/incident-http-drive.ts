/**
 * Drives ONE incident end to end over REAL HTTP against a running server, hitting
 * the actual route handlers in app/api/archive/b2b-question/{next,answer}/route.ts
 * (NOT the lib driver). Auth is a real Supabase Auth session cookie obtained via the
 * magic-link path: admin.generateLink -> GET /auth/callback?token_hash=... which
 * runs verifyOtp on the SSR server client and sets the sb-<ref>-auth-token cookie.
 *
 *   BASE=http://localhost:3000 npx tsx scripts/incident-http-drive.ts <archiveId>
 */
import './load-env'
import { supabaseAdmin } from '../lib/supabase-admin'

const BASE = process.env.BASE ?? 'http://localhost:3000'
const OWNER_EMAIL = 'mrdavidha@gmail.com'

// Cookie jar shared across requests.
const jar = new Map<string, string>()
function applySetCookie(res: Response) {
  for (const sc of res.headers.getSetCookie?.() ?? []) {
    const first = sc.split(';')[0]
    const eq = first.indexOf('=')
    if (eq > 0) jar.set(first.slice(0, eq).trim(), first.slice(eq + 1).trim())
  }
}
function cookieHeader(): string {
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join('; ')
}

const ANSWERS: Record<string, string> = {
  SEED: 'The hardest call was the winter we nearly missed payroll. A key client, Marcus at Vantage, wanted to renegotiate mid-contract, and my ops lead Priya wanted to hold the line while our CFO wanted to settle fast.',
  TIMELINE: 'First, Priya flagged that Marcus was stalling on the renewal. Then the CFO pushed me to accept his lower number to protect cash. I decided to counter, not accept. When Marcus escalated, I chose to keep Priya on the account instead of handing it to sales. Finally I set a walk-away price and held to it.',
  CUE: 'The first real sign was that Marcus stopped replying to Priya directly and started copying his lawyer. That formality was the tell.',
  OPTION: 'I seriously considered just accepting the CFO number to lock the cash. I also considered walking entirely. I decided against both and countered with a shorter term at a firm price.',
  BASIS: 'What tipped it was the cash runway math against the churn risk. I was almost completely certain we could survive a two week gap, so the downside of countering was small and I took it.',
  BOUNDARY: 'If the runway had dropped under thirty days I would have taken the CFO settlement without hesitation.',
  ERROR: 'Someone capable but new would read Marcus going quiet as agreement and ease off. The trap is that his silence meant the opposite.',
  STAKE: 'Honestly nothing was at stake for me personally here. The company would have been fine either way; it was a clean business judgment, not something that touched me.',
  READ: 'My read was that Priya was right but a little conservative, and that Marcus was posturing through his lawyer rather than truly ready to walk.',
  CALIBRATION: 'I was maybe eighty percent sure when I committed to the counter.',
  ANALOGUE: 'It reminded me of a 2016 renewal where I blinked too early and left money on the table.',
  GOAL: 'What I was really protecting was Priya\'s authority on the account, more than the dollars.',
  TRADEOFF: 'Cash certainty gives. The relationship and the price discipline mattered more than locking the money a week sooner.',
}
const answerFor = (p: string) => ANSWERS[p] ?? 'I made the call I thought was right at the time and stood behind it.'

async function login() {
  const { data, error } = await supabaseAdmin.auth.admin.generateLink({ type: 'magiclink', email: OWNER_EMAIL })
  if (error || !data?.properties?.hashed_token) throw new Error(`generateLink failed: ${error?.message}`)
  const tokenHash = data.properties.hashed_token
  const res = await fetch(`${BASE}/auth/callback?token_hash=${encodeURIComponent(tokenHash)}&type=magiclink`, { redirect: 'manual' })
  applySetCookie(res)
  const authCookies = [...jar.keys()].filter(k => k.startsWith('sb-'))
  console.log(`/auth/callback -> ${res.status} ${res.headers.get('location') ?? ''}`)
  console.log('  session cookies set:', authCookies.length ? authCookies.join(', ') : '(NONE)')
  if (!authCookies.length) throw new Error('no Supabase session cookie set by /auth/callback')
}

async function getNext() {
  const res = await fetch(`${BASE}/api/archive/b2b-question/next`, { headers: { cookie: cookieHeader() } })
  applySetCookie(res)
  const body = await res.json().catch(() => null)
  return { status: res.status, body }
}

async function postAnswer(answer: string) {
  const res = await fetch(`${BASE}/api/archive/b2b-question/answer`, {
    method: 'POST',
    headers: { cookie: cookieHeader(), 'content-type': 'application/json' },
    body: JSON.stringify({ answer }),
  })
  applySetCookie(res)
  const body = await res.json().catch(() => null)
  return { status: res.status, body }
}

async function main() {
  const archiveId = process.argv[2]
  if (!archiveId) throw new Error('usage: incident-http-drive.ts <archiveId>')

  await login()
  // Pin the active archive to the succession-tier Founder Test Archive; the owner
  // has two archives and unpinned would default to the tier-active Dr Ha archive.
  jar.set('archive-id', archiveId)

  console.log('\n===== GET /next (SEED) =====')
  const next = await getNext()
  console.log(JSON.stringify(next, null, 2))
  if (next.status !== 200 || !next.body?.probeType) throw new Error(`GET /next failed: ${next.status}`)

  const depositIds: string[] = []
  let incidentId: string | null = next.body.incidentId ?? null
  let currentProbe: string = next.body.probeType
  const answers: { probe: string; resp: unknown }[] = []

  console.log('\n===== POST /answer turns =====')
  for (let i = 0; i < 40; i++) {
    const resp = await postAnswer(answerFor(currentProbe))
    if (resp.status !== 200) { console.log(`answer turn ${i + 1} HTTP ${resp.status}:`, JSON.stringify(resp.body)); throw new Error('answer failed') }
    const b = resp.body
    incidentId = b.incidentId ?? incidentId
    if (b.depositId) depositIds.push(b.depositId)
    answers.push({ probe: currentProbe, resp: b })
    console.log(`turn ${String(i + 1).padStart(2)} answered=${String(currentProbe).padEnd(11)} -> ${JSON.stringify(b)}`)
    if (b.incidentComplete) break
    currentProbe = b.nextProbeType
    if (!currentProbe) break
  }

  // ── Wait for the fire-and-forget training-pair writes, then read artifacts ────
  console.log('\n===== training_pairs (poll for HTTP-written rows) =====')
  let pairs: any[] = []
  for (let t = 0; t < 20; t++) {
    const { data } = await supabaseAdmin
      .from('training_pairs')
      .select('id, source_id, prompt, quality_score, included_in_training, metadata, created_at')
      .in('source_id', depositIds.length ? depositIds : ['none'])
      .order('created_at', { ascending: true })
    pairs = data ?? []
    if (pairs.length >= depositIds.length) break
    await new Promise(r => setTimeout(r, 1500))
  }
  for (const p of pairs) {
    const m = p.metadata ?? {}
    console.log(`  pair ${p.id.slice(0, 8)} src=${String(p.source_id).slice(0, 8)} probe_type=${m.probe_type ?? '-'} dimension=${m.dimension ?? '-'} dimension_status=${m.dimension_status ?? '-'} q=${p.quality_score} incl=${p.included_in_training}`)
  }
  const tagged = pairs.filter(p => p.metadata?.dimension)
  console.log(`  rows carrying a dimension tag: ${tagged.length}`)

  console.log('\n===== incident_sessions.state.dimensions =====')
  const { data: inc } = await supabaseAdmin
    .from('incident_sessions').select('id, phase, status, state').eq('id', incidentId).single()
  console.log('incidentId:', inc?.id, 'phase:', inc?.phase, 'status:', inc?.status)
  console.log('state.dimensions:', JSON.stringify(inc?.state?.dimensions))
  console.log('probeBudgetUsed:', inc?.state?.probeBudgetUsed)
}

main().then(() => process.exit(0)).catch(e => { console.error('HTTP DRIVE FAILED:', e); process.exit(1) })
