/**
 * Cron auth regression gate.
 *
 * Vercel's scheduler authenticates a scheduled invocation by sending
 * `Authorization: Bearer $CRON_SECRET`, taking the value from the project's
 * CRON_SECRET environment variable. It does not append anything to the path.
 * See https://vercel.com/docs/cron-jobs/manage-cron-jobs, "Securing cron jobs".
 *
 * Until this change every path in vercel.json carried the secret as a
 * `?secret=` query parameter, which put a live credential in the repo and in
 * every request line Vercel logs. The paths are now bare and the header is the
 * credential. The `?secret=` branch stays accepted in this deploy as the
 * recovery path during rotation and is removed in a later commit.
 *
 * For every entry in vercel.json crons[] this asserts:
 *
 *   1. valid Bearer header                 -> authorizes
 *   2. wrong Bearer header                 -> 401
 *   3. no credential at all                -> 401
 *   4. valid ?secret= query                -> authorizes  (transition path)
 *   5. stale ?secret= + valid header       -> authorizes  (rotation recovery)
 *   6. empty CRON_SECRET + empty header    -> 401
 *   7. empty CRON_SECRET + empty ?secret=  -> 401
 *
 * Case 5 is the one that fails without this change on the routes that read
 * `searchParams.get('secret') || header`: a non-empty but wrong query parameter
 * short-circuits the `||` and the correct header is never consulted. During a
 * rotation that is precisely the request shape a stale caller sends.
 *
 * Cases 6 and 7 are the empty-secret guard. Without `!!expected &&`, an unset
 * CRON_SECRET makes `'' === ''` true and every anonymous caller authorizes.
 *
 * "Authorizes" is asserted as "not 401" rather than as 200. What is under test
 * is the guard. Past the guard these routes do real work against a stubbed DB
 * and may legitimately return a `skipped` 200 for a day-of-week gate, or throw
 * when a stub runs out of road. Either outcome proves the request got through.
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { readFileSync } from 'node:fs'
import path from 'node:path'

// ── Boundaries ────────────────────────────────────────────────────────────────
// Only the DB and the heavy downstream are mocked, so the auth block itself is
// what runs. Nothing here can send email, call a model, or reach Supabase.

const H = vi.hoisted(() => {
  function makeBuilder() {
    const b: Record<string, unknown> = {}
    const pass = () => b
    for (const m of [
      'select', 'insert', 'upsert', 'update', 'delete', 'eq', 'neq', 'in', 'is',
      'not', 'order', 'limit', 'range', 'gt', 'gte', 'lt', 'lte', 'contains',
      'ilike', 'or', 'match', 'filter', 'overlaps',
    ]) b[m] = pass
    b.single      = async () => ({ data: null, error: null })
    b.maybeSingle = async () => ({ data: null, error: null })
    // Every list-style query resolves empty, so each cron's main loop is a
    // no-op and the handler returns without touching anything real.
    b.then = (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) =>
      Promise.resolve({ data: [], error: null, count: 0 }).then(res, rej)
    return b
  }
  const supabaseAdmin = {
    from: () => makeBuilder(),
    storage: {
      from: () => ({
        createSignedUrl: async () => ({ data: { signedUrl: 'https://signed.test/x' }, error: null }),
        upload:          async () => ({ error: null }),
      }),
    },
    rpc: async () => ({ data: null, error: null }),
  }
  return { supabaseAdmin }
})

vi.mock('@/lib/supabase-admin', () => ({ supabaseAdmin: H.supabaseAdmin }))
vi.mock('@/lib/resend', () => ({ resend: { emails: { send: async () => ({}) } } }))
vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    messages = { create: async () => ({ content: [{ type: 'text', text: 'text' }] }) }
  },
}))
vi.mock('elevenlabs', () => ({
  ElevenLabsClient: class {
    textToSpeech = { convert: async () => new Uint8Array() }
  },
}))
vi.mock('@/lib/generateMirror', () => ({ generateMirror: async () => null }))
// The two-path fan-out children (send-photo, life-event) fall through to a
// Supabase owner session when no cron secret is presented. Pin that to "no
// session" so what this file measures is the cron branch alone, and so a
// rejection is a real 401 rather than a throw out of the cookie store. The
// owner branch is asserted in app/api/archive/unauth-access.test.ts.
vi.mock('@/lib/auth/getSessionUser', () => ({ getSessionUser: async () => null }))
vi.mock('@/lib/trainingPipeline', () => ({
  createTrainingPairFromDeposit: vi.fn(async () => {}),
  createTrainingPairsFromVoice:  vi.fn(async () => {}),
}))
// send-photos fans out to sibling routes over HTTP. Stub the network so the
// gate never leaves the process.
vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 200 })))

// ── The routes under test, one per vercel.json crons[] entry ──────────────────

import { GET as sendPhotos }          from './send-photos/route'
import { GET as dailyReflection }     from './daily-reflection/route'
import { GET as anniversaryTriggers } from './anniversary-triggers/route'
import { GET as annualPreview }       from './annual-preview/route'
import { GET as weeklyPrompt }        from './weekly-prompt/route'
import { GET as storyPromptMonday }   from './story-prompt-monday/route'
import { GET as memoryGameStart }     from './memory-game-start/route'
import { GET as storyPromptFriday }   from './story-prompt-friday/route'
import { GET as memoryGameReminder }  from './memory-game-reminder/route'
import { GET as memoryGameSummary }   from './memory-game-summary/route'
import { GET as monthlyReport }       from './monthly-report/route'
import { GET as monthlyAccuracy }     from './monthly-accuracy/route'
import { GET as contributorMirror }   from './contributor-mirror/route'
import { GET as memoryGameMonthly }   from './memory-game-monthly/route'
import { GET as gratitudeNote }       from './gratitude-note/route'
import { GET as entityLetter }        from './entity-letter/route'
import { GET as voicePortrait }       from './voice-portrait/route'
import { GET as weeklyReplay }        from './weekly-replay/route'
import { GET as weeklyMirror }        from './weekly-mirror/route'

// ── The send-photos fan-out children ──────────────────────────────────────────
// These are NOT vercel.json crons[] entries and must stay out of ROUTES, which
// is asserted to match crons[] one for one. They are POST routes that
// send-photos (and, for contribution-alert, poll-replies) reaches over HTTP,
// and until fix/cron-secret-batch-3 every one of them was unauthenticated.
import { POST as sendPhoto }         from '@/app/api/archive/send-photo/route'
import { POST as morningDigest }     from '@/app/api/archive/morning-digest/route'
import { POST as contributionAlert } from '@/app/api/archive/contribution-alert/route'
import { POST as lifeEvent }         from '@/app/api/archive/life-event/route'

type Handler = (req: NextRequest) => Promise<Response>

const ROUTES: { path: string; handler: Handler }[] = [
  { path: '/api/cron/send-photos',          handler: sendPhotos          },
  { path: '/api/cron/daily-reflection',     handler: dailyReflection     },
  { path: '/api/cron/anniversary-triggers', handler: anniversaryTriggers },
  { path: '/api/cron/annual-preview',       handler: annualPreview       },
  { path: '/api/cron/weekly-prompt',        handler: weeklyPrompt        },
  { path: '/api/cron/story-prompt-monday',  handler: storyPromptMonday   },
  { path: '/api/cron/memory-game-start',    handler: memoryGameStart     },
  { path: '/api/cron/story-prompt-friday',  handler: storyPromptFriday   },
  { path: '/api/cron/memory-game-reminder', handler: memoryGameReminder  },
  { path: '/api/cron/memory-game-summary',  handler: memoryGameSummary   },
  { path: '/api/cron/monthly-report',       handler: monthlyReport       },
  { path: '/api/cron/monthly-accuracy',     handler: monthlyAccuracy     },
  { path: '/api/cron/contributor-mirror',   handler: contributorMirror   },
  { path: '/api/cron/memory-game-monthly',  handler: memoryGameMonthly   },
  { path: '/api/cron/gratitude-note',       handler: gratitudeNote       },
  { path: '/api/cron/entity-letter',        handler: entityLetter        },
  { path: '/api/cron/voice-portrait',       handler: voicePortrait       },
  { path: '/api/cron/weekly-replay',        handler: weeklyReplay        },
  { path: '/api/cron/weekly-mirror',        handler: weeklyMirror        },
]

const SECRET = 'test-cron-secret'
const STALE  = 'basalith-cron-2026-secure-old'
const U      = 'http://localhost'

/**
 * Returns the guard's decision. A throw past the guard is reported as 'threw',
 * which counts as authorized: the request was let through and failed later on a
 * stub, not on auth. Only a literal 401 counts as rejected.
 */
async function decide(handler: Handler, url: string, headers: Record<string, string> = {}) {
  try {
    const res = await handler(new NextRequest(url, { method: 'GET', headers }))
    return res.status === 401 ? 401 : `pass(${res.status})`
  } catch {
    return 'pass(threw)'
  }
}

afterEach(() => { vi.unstubAllEnvs() })

describe('vercel.json crons[] carry no secret in the path', () => {
  const cfg = JSON.parse(
    readFileSync(path.resolve(process.cwd(), 'vercel.json'), 'utf8'),
  ) as { crons: { path: string; schedule: string }[] }

  it('no cron path contains a query string', () => {
    for (const c of cfg.crons) {
      console.log(`vercel.json  ${c.path.padEnd(36)} ${c.schedule}`)
      expect(c.path).not.toContain('?')
      expect(c.path).not.toContain('secret')
    }
  })

  it('every scheduled path is covered by this gate', () => {
    // Guards against drift: a cron added to vercel.json without a case here
    // would otherwise ship unverified.
    const covered = new Set(ROUTES.map(r => r.path))
    const missing = cfg.crons.map(c => c.path).filter(p => !covered.has(p))
    expect(missing).toEqual([])
    expect(cfg.crons).toHaveLength(ROUTES.length)
  })
})

describe('every cron route authenticates by Authorization header', () => {
  for (const { path: routePath, handler } of ROUTES) {
    const label = routePath.replace('/api/cron/', '')

    it(`${label} — header authorizes, wrong and empty secrets reject`, async () => {
      vi.stubEnv('CRON_SECRET', SECRET)

      // 1. What Vercel actually sends.
      const ok = await decide(handler, `${U}${routePath}`, { authorization: `Bearer ${SECRET}` })
      console.log(`${label.padEnd(22)} | valid header           -> ${ok}`)
      expect(ok).not.toBe(401)

      // 2. Wrong header.
      const wrong = await decide(handler, `${U}${routePath}`, { authorization: 'Bearer wrong-secret' })
      console.log(`${label.padEnd(22)} | wrong header           -> ${wrong}`)
      expect(wrong).toBe(401)

      // 3. Nothing at all.
      const bare = await decide(handler, `${U}${routePath}`)
      console.log(`${label.padEnd(22)} | no credential          -> ${bare}`)
      expect(bare).toBe(401)

      // 4. The query branch stays live for this deploy.
      const query = await decide(handler, `${U}${routePath}?secret=${SECRET}`)
      console.log(`${label.padEnd(22)} | query secret           -> ${query}`)
      expect(query).not.toBe(401)

      // 5. Rotation recovery: a stale query parameter must not shadow a good
      //    header. This is the case the `query || header` form got wrong.
      const both = await decide(handler, `${U}${routePath}?secret=${STALE}`, {
        authorization: `Bearer ${SECRET}`,
      })
      console.log(`${label.padEnd(22)} | stale query + header   -> ${both}`)
      expect(both).not.toBe(401)

      // 6 and 7. An unset CRON_SECRET authorizes nobody.
      vi.stubEnv('CRON_SECRET', '')

      const emptyHeader = await decide(handler, `${U}${routePath}`, { authorization: 'Bearer ' })
      console.log(`${label.padEnd(22)} | empty secret + header  -> ${emptyHeader}`)
      expect(emptyHeader).toBe(401)

      const emptyQuery = await decide(handler, `${U}${routePath}?secret=`)
      console.log(`${label.padEnd(22)} | empty secret + query   -> ${emptyQuery}`)
      expect(emptyQuery).toBe(401)
    })
  }
})

/**
 * The send-photos fan-out children — fix/cron-secret-batch-3.
 *
 * `send-photos` is gated, but until this change it fanned out over plain fetch
 * with no credential on three of its calls, and the children accepted that. All
 * four routes below had NO auth of any kind: an anonymous POST carrying an
 * archive UUID mailed a family's photographs to every active contributor
 * (send-photo), mailed the owner a digest of recent label text and a photograph
 * (morning-digest), mailed the owner a quoted contributor memory
 * (contribution-alert), or mailed the owner and every contributor a
 * significant-date email plus a Sonnet call (life-event).
 *
 * Each now verifies CRON_SECRET with the same normalized block as the scheduled
 * routes above: header and query as an independent OR, guarded by
 * `!!expectedSecret`. The callers send the header in the same commit —
 * send-photos for three of them, poll-replies for contribution-alert — because
 * a route that starts requiring a secret its caller does not send is a broken
 * cron rather than a hardened one.
 *
 * `send-photo` and `life-event` also have a browser caller and therefore a
 * second, owner-session path. It is pinned to "no session" here (see the mock
 * above) so these cases measure the cron branch only. The owner branch is part
 * 7 of app/api/archive/unauth-access.test.ts.
 *
 * As above, "authorizes" is asserted as "not 401". Past the guard these routes
 * do real work against a stubbed DB and legitimately answer 404 or a `skipped`
 * 200. Either outcome proves the request got through.
 */
const CHILDREN: { path: string; handler: Handler; body: unknown }[] = [
  { path: '/api/archive/send-photo',         handler: sendPhoto,         body: { archiveId: 'arch-1' } },
  { path: '/api/archive/morning-digest',     handler: morningDigest,     body: { archiveId: 'arch-1' } },
  { path: '/api/archive/contribution-alert', handler: contributionAlert, body: { archiveId: 'arch-1', labelId: 'label-1' } },
  { path: '/api/archive/life-event',         handler: lifeEvent,         body: { archiveId: 'arch-1', dateId: 'date-1', force: true } },
]

async function decidePost(
  handler: Handler,
  url:     string,
  body:    unknown,
  headers: Record<string, string> = {},
) {
  try {
    const res = await handler(new NextRequest(url, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body:    JSON.stringify(body),
    }))
    return res.status === 401 ? 401 : `pass(${res.status})`
  } catch {
    return 'pass(threw)'
  }
}

describe('send-photos fan-out children require CRON_SECRET', () => {
  it('the children are deliberately not vercel.json crons[] entries', () => {
    // They are reached server to server, not by the scheduler. This assertion
    // exists so that adding one to crons[] without moving it into ROUTES fails
    // loudly rather than shipping unverified.
    const cfg = JSON.parse(
      readFileSync(path.resolve(process.cwd(), 'vercel.json'), 'utf8'),
    ) as { crons: { path: string }[] }
    const scheduled = new Set(cfg.crons.map(c => c.path))
    for (const c of CHILDREN) expect(scheduled.has(c.path)).toBe(false)
  })

  for (const { path: routePath, handler, body } of CHILDREN) {
    const label = routePath.replace('/api/archive/', '')

    it(`${label} — header authorizes, wrong and empty secrets reject`, async () => {
      vi.stubEnv('CRON_SECRET', SECRET)

      // 1. What the fan-out now sends.
      const ok = await decidePost(handler, `${U}${routePath}`, body, { authorization: `Bearer ${SECRET}` })
      console.log(`${label.padEnd(22)} | valid header           -> ${ok}`)
      expect(ok).not.toBe(401)

      // 2. Wrong header.
      const wrong = await decidePost(handler, `${U}${routePath}`, body, { authorization: 'Bearer wrong-secret' })
      console.log(`${label.padEnd(22)} | wrong header           -> ${wrong}`)
      expect(wrong).toBe(401)

      // 3. Nothing at all. This is the shape that used to succeed.
      const bare = await decidePost(handler, `${U}${routePath}`, body)
      console.log(`${label.padEnd(22)} | no credential          -> ${bare}`)
      expect(bare).toBe(401)

      // 4. The query branch stays live for this deploy, matching the scheduled
      //    routes. It is removed from all of them in a later commit.
      const query = await decidePost(handler, `${U}${routePath}?secret=${SECRET}`, body)
      console.log(`${label.padEnd(22)} | query secret           -> ${query}`)
      expect(query).not.toBe(401)

      // 5. Rotation recovery: a stale query parameter must not shadow a good
      //    header. The branches are an independent OR, not `query || header`.
      const both = await decidePost(handler, `${U}${routePath}?secret=${STALE}`, body, {
        authorization: `Bearer ${SECRET}`,
      })
      console.log(`${label.padEnd(22)} | stale query + header   -> ${both}`)
      expect(both).not.toBe(401)

      // 6 and 7. An unset CRON_SECRET authorizes nobody. Without
      //          `!!expectedSecret &&` these two would make '' === '' true and
      //          every anonymous caller would take the cron path.
      vi.stubEnv('CRON_SECRET', '')

      const emptyHeader = await decidePost(handler, `${U}${routePath}`, body, { authorization: 'Bearer ' })
      console.log(`${label.padEnd(22)} | empty secret + header  -> ${emptyHeader}`)
      expect(emptyHeader).toBe(401)

      const emptyQuery = await decidePost(handler, `${U}${routePath}?secret=`, body)
      console.log(`${label.padEnd(22)} | empty secret + query   -> ${emptyQuery}`)
      expect(emptyQuery).toBe(401)
    })
  }
})

describe('the fan-out callers send the secret', () => {
  // The other half of the fix. A route that starts requiring a secret its
  // caller does not send is a broken cron. This reads the two caller files and
  // asserts every fetch into a hardened child carries an Authorization header,
  // and that none of them puts the secret in the URL, where it would land in
  // every request line the platform logs.
  const CALLERS = [
    'app/api/cron/send-photos/route.ts',
    'app/api/archive/poll-replies/route.ts',
  ]

  for (const file of CALLERS) {
    it(`${file} — every child fetch carries a Bearer header and no ?secret=`, () => {
      const src = readFileSync(path.resolve(process.cwd(), file), 'utf8')
      for (const { path: routePath } of CHILDREN) {
        const at = src.indexOf(routePath)
        if (at === -1) continue
        // The options object of that fetch call: from the path to the end of
        // the call. Close enough to catch a missing header without parsing.
        const call = src.slice(at, at + 400)
        console.log(`${file.padEnd(42)} ${routePath.padEnd(34)} header=${/Authorization/.test(call)} urlSecret=${new RegExp('secret=').test(call)}`)
        // [\s\S] rather than the `s` flag, which this tsconfig target rejects.
        expect(call).toMatch(/Authorization[\s\S]*Bearer \$\{process\.env\.CRON_SECRET\}/)
        expect(call).not.toMatch(/secret=/)
      }
    })
  }
})
