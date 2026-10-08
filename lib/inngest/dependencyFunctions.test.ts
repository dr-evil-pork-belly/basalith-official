import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import path from 'path'

// Source-level guards on the readings job, the way lib/inngest/trialFunctions.test.ts
// pins the trial crons: importing the module pulls a live Inngest client. The
// behavior (two distinct runs, check before spending, no store on a refusal)
// is tested on the body in lib/dependencyReadings.test.ts.

const source = readFileSync(path.resolve(__dirname, 'dependencyFunctions.ts'), 'utf8')
const code = source.slice(source.indexOf('export const dependencyReadings'))

describe('dependencyReadings', () => {
  it('runs on its own event, one at a time, and never on a schedule', () => {
    expect(code).toMatch(/triggers:\s*\[\{ event: 'dependency\.readings\.requested' \}\]/)
    expect(code).toMatch(/concurrency:\s*\{ limit: 1 \}/)
    expect(code).toMatch(/retries:\s*2/)
    expect(code).not.toMatch(/cron:/)
  })

  it('stores a report only on a row that is still capturing', () => {
    const save = code.slice(code.indexOf('async saveReady('))
    expect(save).toMatch(/status: 'ready'/)
    expect(save).toMatch(/\.eq\('id', id\)\s*\.eq\('status', 'capturing'\)/)
    expect(save).toMatch(/\.select\('id'\)/)
  })

  it('runs the real coverage run through the body, and sends no coverage event of its own', () => {
    expect(code).toMatch(/run:\s+runCoverage,/)
    expect(code).toMatch(/runDependencyReadings\(reportId,/)
    expect(code).not.toMatch(/coverage\.run\.requested/)
    expect(code).not.toMatch(/inngest\.send\(/)
  })

  it('reads the founder record by id and never filters on status = active', () => {
    expect(code).not.toMatch(/\.eq\(\s*['"]status['"]\s*,\s*['"]active['"]\s*\)/)
  })

  it('waits for the last answer to settle before it checks, as a step', () => {
    const sleep = code.indexOf("await step.sleep('settle', '90s')")
    const body  = code.indexOf('return runDependencyReadings(reportId,')
    expect(sleep).toBeGreaterThan(-1)
    expect(body).toBeGreaterThan(sleep)
  })

  it('is registered with the Inngest route', () => {
    const route = readFileSync(path.resolve(__dirname, '..', '..', 'app', 'api', 'inngest', 'route.ts'), 'utf8')
    expect(route).toMatch(/import \{ dependencyReadings \} from '@\/lib\/inngest\/dependencyFunctions'/)
    expect(route).toMatch(/threadExtractionSweep,\s*dependencyReadings,/)
  })

  it('mails nobody but the founder of Basalith', () => {
    expect(code).toMatch(/notify:\s+notifyInternal/)
    expect(code).not.toMatch(/resend\.emails\.send/)
  })
})
