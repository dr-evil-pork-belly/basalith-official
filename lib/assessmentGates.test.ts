import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import path from 'path'

// Source-level guards on where an assessment record (archives.status =
// 'assessment', lib/assessment.ts) touches code that was written for a
// client's Basalith. Each of these is a place where treating an assessment
// like any other record costs money, breaks a promise, or says something
// false. Asserted on source text, the way lib/cronGates.test.ts is: importing
// a route pulls a live Supabase client.

const root = path.resolve(__dirname, '..')
const read = (...p: string[]) => readFileSync(path.join(root, ...p), 'utf8')

describe('an assessment record', () => {
  it('fires no coverage run when an area call closes; it asks for the two readings instead', () => {
    const src = read('app', 'api', 'archive', 'b2b-question', 'answer', 'route.ts')
    expect(src).toMatch(/\.select\('id, owner_user_id, tier, status, /)

    const start = src.indexOf('if (next.state.areaCall && isAssessment(archive)) {')
    const other = src.indexOf('} else if (next.state.areaCall) {')
    expect(start).toBeGreaterThan(-1)
    expect(other).toBeGreaterThan(start)

    const assessmentBranch = src.slice(start, other)
    expect(assessmentBranch).toContain('requestReadingsIfDue(archiveId)')
    expect(assessmentBranch).toContain('after(async () => {')
    expect(assessmentBranch).not.toContain('coverage.run.requested')

    // Every other record still gets its map read again, exactly as before.
    expect(src.slice(other, other + 400)).toContain("name: 'coverage.run.requested'")
  })

  it('never reaches the readings job by a path that skips the check', () => {
    const store = read('lib', 'assessmentStore.ts')
    const fn = store.slice(store.indexOf('export async function requestReadingsIfDue('))
    const due  = fn.indexOf('if (!due) return')
    const send = fn.indexOf("inngest.send({ name: 'dependency.readings.requested'")
    expect(due).toBeGreaterThan(-1)
    expect(send).toBeGreaterThan(due)
    // A failed send is told to the founder of Basalith, not swallowed.
    expect(fn.slice(send)).toContain('notifyInternal(')
  })

  it('is kept out of B2 by both backup functions, with trials', () => {
    const src = read('lib', 'inngest', 'storageBackupFunctions.ts')
    const loads = src.split("step.run('load-trial-archives'").slice(1)
    expect(loads).toHaveLength(2)
    for (const block of loads) {
      const body = block.slice(0, 400)
      expect(body).toMatch(/\.in\('status', \['trial', 'assessment'\]\)/)
      expect(body).not.toMatch(/\.eq\('status', 'trial'\)/)
      // Throw, never default to an empty list.
      expect(body).toContain('throw new Error(`load-trial-archives:')
    }
  })

  it('is sent from the dashboard to its own page, and that page sends everyone else back', () => {
    const dash = read('app', 'archive', 'dashboard', 'page.tsx')
    expect(dash).toMatch(/if \(archive && isAssessment\(archive\)\) redirect\('\/archive\/assessment'\)/)
    const page = read('app', 'archive', 'assessment', 'page.tsx')
    expect(page).toMatch(/if \(!isAssessment\(archive\)\) redirect\('\/archive\/dashboard'\)/)
    expect(page).toMatch(/archive\.owner_user_id !== session\.userId/)
  })

  it('is never offered the Founding Sequence, and is told nothing about a map', () => {
    const page = read('app', 'archive', 'founding', 'page.tsx')
    expect(page).toMatch(/if \(assessment && !requestedArea\) redirect\('\/archive\/assessment'\)/)
    expect(page).toMatch(/assessment=\{assessment\}/)

    const client = read('app', 'archive', 'founding', 'FoundingClient.tsx')
    // Both sentences that promise a reading after the call are behind the flag.
    const promises = ['When it closes, your map is read again.', 'Your map is being read again now']
    for (const p of promises) {
      const at = client.indexOf(p)
      expect(at, p).toBeGreaterThan(-1)
      expect(client.slice(at - 420, at), p).toMatch(/\{assessment\s*\?/)
    }
    expect(client).toContain('<Link href="/archive/assessment" style={goldButton()}>Back to your assessment</Link>')
  })

  it('is created with the business tier and the assessment status, by a claim only one request wins', () => {
    const src = read('app', 'api', 'assessment', 'start', 'route.ts')
    expect(src).toMatch(/tier:\s+'succession',/)
    expect(src).toMatch(/status:\s+ASSESSMENT_STATUS,/)

    const claim = src.indexOf(".update({ status: 'capturing', updated_at: now })")
    // Whitespace tolerant: git checks this file out with CRLF on Windows.
    const insert = src.search(/\.from\('archives'\)\s*\.insert\(\{/)
    expect(claim).toBeGreaterThan(-1)
    expect(insert).toBeGreaterThan(claim)
    expect(src.slice(claim, claim + 200)).toMatch(/\.eq\('id', row\.id\)\s*\.eq\('status', 'ordered'\)/)

    // The id alone starts nothing: the typed email must match the row, and an
    // unknown id and a wrong email are answered identically.
    expect(src).toContain('if (!row || row.founder_email !== email) {')
    expect(src.match(/NextResponse\.json\(\{ error: NOT_FOUND \}, \{ status: 404 \}\)/g)).toHaveLength(2)
  })

  it('refuses an existing owner, successor, or guide before any role is forced', () => {
    const src = read('app', 'api', 'assessment', 'start', 'route.ts')
    const force = src.indexOf("getOrCreateAuthUser(email, 'owner', { forceRole: true })")
    expect(force).toBeGreaterThan(-1)
    for (const check of [
      "countBy('archives', 'owner_email', email)",
      "countBy('archives', 'owner_user_id', userId)",
      "countBy('successors', 'auth_user_id', userId)",
      "countBy('archivists', 'auth_user_id', userId)",
    ]) {
      const at = src.indexOf(check)
      expect(at, check).toBeGreaterThan(-1)
      expect(at, check).toBeLessThan(force)
    }
  })

  it('writes the intake once, on a record that is an assessment and still capturing', () => {
    const src = read('app', 'api', 'archive', 'assessment', 'route.ts')
    expect(src).toContain('if (!isAssessment(archive)) {')
    const write = src.slice(src.indexOf('.update({ intake: intake.responses'))
    expect(write.slice(0, 220)).toMatch(/\.eq\('archive_id', archiveId\)\s*\.eq\('status', 'capturing'\)\s*\.is\('intake', null\)/)
    expect(src).toContain("{ error: 'Your answers are already in.' }, { status: 409 }")
  })
})

describe('the assessment nav and report page', () => {
  it('gives an assessment record one nav item and nothing from a client\u2019s portal', () => {
    const layout = read('app', 'archive', 'layout.tsx')
    expect(layout).toMatch(/\.select\('tier, status'\)/)
    expect(layout).toMatch(/assessment=\{assessment\}/)

    const client = read('app', 'archive', 'ArchiveLayoutClient.tsx')
    const nav = client.slice(client.indexOf('const ASSESSMENT_NAV'), client.indexOf('function NavGroup('))
    expect(nav.match(/href:/g)).toHaveLength(1)
    expect(nav).toContain("href: '/archive/assessment'")
    expect(client).toMatch(/const primaryNav\s+= assessment \? ASSESSMENT_NAV : visible\(PRIMARY_NAV\)/)
    expect(client).toMatch(/const contributeNav = assessment \? \[\] : visible\(CONTRIBUTE_NAV\)/)
    expect(client).toMatch(/const manageNav\s+= assessment \? \[\] : visible\(MANAGE_NAV\)/)
  })

  it('serves the report to its own founder only, as stored, once it is built', () => {
    const src = read('app', 'api', 'archive', 'assessment', 'report', 'route.ts')
    expect(src).toContain('archive.owner_user_id !== session.userId')
    expect(src).toContain('if (!isAssessment(archive)) {')
    expect(src).toContain("!founderCanReadReport(row.status)")
    expect(src).toMatch(/report:\s+row\.report,/)
    // Read only: no write, no model, no coverage run.
    expect(src).not.toMatch(/\.(update|insert|delete|upsert)\(/)
    expect(src).not.toMatch(/inngest|runCoverage|buildDependencyReport|anthropic/i)
    expect(src).not.toMatch(/export async function (POST|PUT|PATCH|DELETE)/)
  })

  it('draws the snapshot and computes nothing: no score, no percent, no state word', () => {
    const view = read('app', 'archive', 'assessment', 'report', 'ReportView.tsx')
    const code = view.split('\n').filter(l => !l.trim().startsWith('//')).join('\n')
    expect(code).not.toMatch(/%/)
    expect(code).not.toMatch(/\bscore\b/i)
    expect(code).not.toMatch(/\b(backed|partial|overreach)\b/i)
    expect(code).not.toMatch(/Math\.(round|floor|ceil)|reduce\(/)
    expect(code).toContain('report.attribution')
    expect(code).toContain('report.limits.map(')
    expect(code).toContain('report.headline.map(')
    // Both readings, never one picked.
    expect(code).toContain('d.readings[0]')
    expect(code).toContain('d.readings[1]')
  })

  it('offers no release, because none is built', () => {
    for (const f of [
      read('app', 'archive', 'assessment', 'report', 'ReportClient.tsx'),
      read('app', 'archive', 'assessment', 'report', 'ReportView.tsx'),
    ]) {
      const rendered = Array.from(f.matchAll(/>([^<>{}\n]{12,})</g)).map(m => m[1])
      for (const s of rendered) expect(s, s).not.toMatch(/\b(release|send it|deleted|days)\b/i)
      expect(f).not.toMatch(/method:\s*'POST'/)
    }
  })
})

describe('assessment copy', () => {
  it('obeys the copy rules and promises nothing that is not built', () => {
    const files = [
      read('app', 'assessment', 'begin', 'AssessmentBeginClient.tsx'),
      read('app', 'archive', 'assessment', 'AssessmentClient.tsx'),
      read('app', 'api', 'assessment', 'start', 'route.ts'),
      read('app', 'api', 'archive', 'assessment', 'route.ts'),
      read('app', 'archive', 'assessment', 'report', 'ReportClient.tsx'),
      read('app', 'archive', 'assessment', 'report', 'ReportView.tsx'),
    ]
    const banned = /\b(curated|seamless|innovative|stewardship|unlock|supercharge|game-changer)\b/i
    for (const f of files) {
      expect(f).not.toMatch(/[—―]/)
      expect(f).not.toMatch(banned)
      // Rendered strings only: JSX text and quoted copy never say archive or AI.
      const rendered = Array.from(f.matchAll(/>([^<>{}\n]{12,})</g)).map(m => m[1])
      for (const s of rendered) {
        expect(s, s).not.toMatch(/\barchive\b/i)
        expect(s, s).not.toMatch(/\bAI\b/)
        expect(s, s).not.toMatch(/!/)
        // Release, the buyer's copy, and deletion are not built yet.
        expect(s, s).not.toMatch(/\b(release it|only if you|deleted|delete)\b/i)
      }
    }
  })
})
