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
