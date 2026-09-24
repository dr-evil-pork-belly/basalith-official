import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, existsSync } from 'fs'
import path from 'path'

// The trial gate for scheduled email (docs/SELF_SERVE_SKELETON_2026-09-17.md
// 1.5). A trial archive carries status = 'trial' and no CHECK enforces it;
// what keeps the crons off a trial is that every one of them selects
// archives on status = 'active'. This test is the guard: any cron route that
// reads archives must carry that filter, in either spacing. A new cron that
// forgets it fails here before it ships.
//
// Asserted on the source text, the way lib/storageBackup.test.ts pins the
// Inngest triggers: importing a cron route pulls a live Supabase client.
//
// Exceptions are listed by name with the reason. A cron that fails the
// assertion today is not edited by this slice; changing a cron is its own
// slice. Two are listed as of September 17, 2026. Both select the paused and
// resting states on purpose, which excludes a trial by construction, and
// neither is scheduled in vercel.json, so neither runs on its own.
const SKIP: Record<string, string> = {
  'cold-storage-ping': "selects .in('status', ['paused', 'resting']) by design; not in vercel.json",
  'pause-reminder':    "selects .eq('status', 'paused') by design; not in vercel.json",
}

const CRON_DIR = path.resolve(__dirname, '..', 'app', 'api', 'cron')

function cronRoutes(): { name: string; source: string }[] {
  return readdirSync(CRON_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => ({ name: d.name, file: path.join(CRON_DIR, d.name, 'route.ts') }))
    .filter(r => existsSync(r.file))
    .map(r => ({ name: r.name, source: readFileSync(r.file, 'utf8') }))
}

const READS_ARCHIVES = /\.from\(\s*['"]archives['"]\s*\)/
const ACTIVE_FILTER  = /\.eq\(\s*['"]status['"]\s*,\s*['"]active['"]\s*\)/

describe('every cron that reads archives selects status = active', () => {
  const routes = cronRoutes()
  const readers = routes.filter(r => READS_ARCHIVES.test(r.source))

  it('finds the cron routes', () => {
    expect(routes.length).toBeGreaterThan(0)
    expect(readers.length).toBeGreaterThan(0)
  })

  for (const r of readers) {
    if (r.name in SKIP) {
      it.skip(`${r.name} (skipped: ${SKIP[r.name]})`, () => {})
      continue
    }
    it(`${r.name} filters archives on status = 'active'`, () => {
      expect(ACTIVE_FILTER.test(r.source)).toBe(true)
    })
  }

  it('the coverage monthly sweep filters on status = active too', () => {
    // Not a Vercel cron, and not under app/api/cron, so it is pinned here by
    // name rather than found by the walk.
    const source = readFileSync(path.resolve(__dirname, 'inngest', 'coverageFunctions.ts'), 'utf8')
    const sweep = source.slice(source.indexOf("id:          'coverage-monthly-sweep'"))
    expect(ACTIVE_FILTER.test(sweep)).toBe(true)
  })

  it('the thread extraction sweep reads only active Basaliths', () => {
    // lib/inngest/threadFunctions.ts selects through the SQL function
    // pending_thread_extractions, so the gate lives in the migration, not in a
    // .eq() call. Pin the SQL line, and pin that the sweep goes through it.
    const fn = readFileSync(path.resolve(__dirname, 'inngest', 'threadFunctions.ts'), 'utf8')
    expect(fn).toContain('loadPendingDeposits(')
    expect(fn).not.toMatch(READS_ARCHIVES)
    const sql = readFileSync(
      path.resolve(__dirname, '..', 'supabase', 'migrations', '20260924_record_threads.sql'),
      'utf8',
    )
    const body = sql.slice(sql.indexOf('CREATE OR REPLACE FUNCTION pending_thread_extractions'))
    expect(body).toMatch(/WHERE a\.status = 'active'/)
  })
})
