import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import path from 'path'

// Source-level guards on the two trial crons, the way lib/storageBackup.test.ts
// pins the backup triggers: importing the module pulls a live Inngest client.
//
// The rule lib/cronGates.test.ts enforces (every cron that reads archives
// selects status = 'active') is right for the Vercel crons that email owners
// of live archives and wrong here: these two are the one job that is about
// trials. They must read status = 'trial' and nothing else. The behavioral
// guards (a converted or owner-terminated archive never selects; the runner
// stops at assert_no_b2) are in lib/trialExpiry.test.ts and
// lib/trialExpiryRunner.test.ts.

const source = readFileSync(path.resolve(__dirname, 'trialFunctions.ts'), 'utf8')

function block(name: string): string {
  const start = source.indexOf(`export const ${name} = inngest.createFunction(`)
  expect(start, `${name} block`).toBeGreaterThan(-1)
  const next = source.indexOf('export const ', start + 1)
  return source.slice(start, next === -1 ? undefined : next)
}

describe('trialWarn and trialExpire', () => {
  it('load trials on status = trial and never on status = active', () => {
    expect(source).toMatch(/\.eq\(\s*['"]status['"]\s*,\s*['"]trial['"]\s*\)/)
    expect(source).not.toMatch(/\.eq\(\s*['"]status['"]\s*,\s*['"]active['"]\s*\)/)
  })

  it('carry the schedules the skeleton set, and nothing runs them by event', () => {
    expect(block('trialWarn')).toMatch(/cron:\s*'0 15 \* \* \*'/)
    expect(block('trialExpire')).toMatch(/cron:\s*'0 16 \* \* \*'/)
    expect(source).not.toMatch(/event:\s*'/)
  })

  it('run one at a time with two retries, and the expiry steps are named step:archiveId', () => {
    expect(block('trialWarn')).toMatch(/concurrency:\s*\{ limit: 1 \}/)
    expect(block('trialWarn')).toMatch(/retries:\s*2/)
    expect(block('trialExpire')).toMatch(/concurrency:\s*\{ limit: 1 \}/)
    expect(block('trialExpire')).toMatch(/retries:\s*2/)
    expect(block('trialExpire')).toMatch(/step\.run\(`\$\{name\}:\$\{trial\.id\}`, fn\)/)
  })

  it('trialWarn sends before it marks, and marks only where trial_warned_at is still null', () => {
    const b = block('trialWarn')
    const send = b.indexOf('resend.emails.send(')
    const mark = b.indexOf(".update({ trial_warned_at:")
    expect(send).toBeGreaterThan(-1)
    expect(mark).toBeGreaterThan(send)
    expect(b).toMatch(/\.is\('trial_warned_at', null\)/)
    expect(b).toMatch(/replyTo: ADMIN_EMAIL/)
  })

  it('both functions are registered with the Inngest route', () => {
    const route = readFileSync(path.resolve(__dirname, '..', '..', 'app', 'api', 'inngest', 'route.ts'), 'utf8')
    expect(route).toMatch(/trialWarn,\s*trialExpire,/)
  })
})
