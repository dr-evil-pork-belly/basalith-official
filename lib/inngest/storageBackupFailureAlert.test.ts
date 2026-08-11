/**
 * A crash must be loud.
 *
 * Until August 11, 2026 `alertAdmin` was only reachable from the alarm paths
 * inside the try block. An exception closed the run red, rethrew, and notified
 * nobody. That is exactly how the first real B2 write failed: an accurate red
 * run row saying "not entitled", and silence. The next signal would have been
 * A5_SILENCE from the heartbeat up to 8 days later, which is inside the designed
 * threshold and still wrong for a design whose whole posture is that failures
 * are loud. It matters more once the daily cron goes on at build order 9d.
 *
 * These tests drive the REAL handler bodies with a step shim that throws, the
 * way a failing step does, and assert an email goes out.
 *
 * Note which region this covers. The throw happens on the FIRST step, which is
 * before the run row is opened, so it is the region that previously produced no
 * run row AND no alert. Nothing here reaches Supabase, B2 or Resend.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'

interface SentEmail {
  subject: string
  html: string
}

// Typed via the generic rather than via an implementation, so `mock.calls[0][0]`
// is known to tsc without declaring a parameter eslint then calls unused.
const H = vi.hoisted(() => ({
  send: vi.fn<(payload: { subject: string; html: string }) => Promise<{ id: string }>>(),
}))

vi.mock('@/lib/resend', () => ({ resend: { emails: { send: H.send } } }))

import { storageBackupSync, storageBackupVerify } from '@/lib/inngest/storageBackupFunctions'

type Handler = (ctx: unknown) => Promise<unknown>

/** Inngest keeps the handler on `.fn`. Same access the 9a drill scripts used. */
const handlerOf = (f: unknown): Handler => (f as { fn: Handler }).fn

/** A step executor whose every step throws, which is what a failed step does. */
const throwingStep = (message: string) => ({
  run: async () => {
    throw new Error(message)
  },
  sendEvent: async () => undefined,
})

const lastEmail = (): SentEmail => {
  const call = H.send.mock.calls[0]
  expect(call, 'no email was sent').toBeDefined()
  return call[0] as SentEmail
}

describe('a crashed run emails the admin', () => {
  beforeEach(() => H.send.mockClear())

  it('storage-backup-sync alerts when a step throws', async () => {
    await expect(
      handlerOf(storageBackupSync)({
        event: { name: 'storage/backup.sync.requested', data: {} },
        step: throwingStep('not entitled'),
      }),
    ).rejects.toThrow('not entitled')

    expect(H.send).toHaveBeenCalledTimes(1)
    expect(lastEmail().subject).toContain('storage backup sync FAILED')
  })

  it('storage-backup-verify alerts when a step throws', async () => {
    await expect(
      handlerOf(storageBackupVerify)({
        event: { name: 'storage/backup.verify.requested', data: {} },
        step: throwingStep('connection reset'),
      }),
    ).rejects.toThrow('connection reset')

    expect(H.send).toHaveBeenCalledTimes(1)
    expect(lastEmail().subject).toContain('storage backup verify FAILED')
  })

  it('the email carries the real error, not a generic message', async () => {
    // The August 11 failure was diagnosable only because the run row carried the
    // vendor's own string. The email has to carry it too.
    await expect(
      handlerOf(storageBackupSync)({
        event: { name: 'storage/backup.sync.requested', data: {} },
        step: throwingStep('AccessDenied: not entitled'),
      }),
    ).rejects.toThrow()
    expect(lastEmail().html).toContain('not entitled')
  })

  it('the email says what the silence would otherwise have been', async () => {
    // So whoever reads it knows what it cost them to not have this, and does not
    // quietly delete the alert as noise.
    await expect(
      handlerOf(storageBackupSync)({
        event: { name: 'storage/backup.sync.requested', data: {} },
        step: throwingStep('boom'),
      }),
    ).rejects.toThrow()
    expect(lastEmail().html).toContain('A5_SILENCE')
  })

  it('the throw still propagates, so Inngest still marks the run failed', async () => {
    // An alert that swallowed the error would trade one silent failure for
    // another: green in Inngest, red only in an inbox.
    await expect(
      handlerOf(storageBackupSync)({
        event: { name: 'storage/backup.sync.requested', data: {} },
        step: throwingStep('must propagate'),
      }),
    ).rejects.toThrow('must propagate')
  })
})

describe('a failure that already alerted does not alert twice', () => {
  // The alarm paths send their own email and then throw when the alarm is hard.
  // Without the flag, alertOnCrash would send a second email for the same
  // failure. Asserted on the source because reaching those paths needs a fully
  // mocked Supabase and B2, and the property worth protecting is that every
  // alerting path marks the flag before it throws.
  const src = readFileSync(
    path.resolve(process.cwd(), 'lib/inngest/storageBackupFunctions.ts'),
    'utf8',
  )
  const code = src.replace(/^\s*\/\/.*$/gm, '')

  it('alertOnCrash returns early when an alert was already sent', () => {
    expect(code).toMatch(/if \(state\.alerted\) return/)
  })

  it('every alertAdmin call site inside a run marks the flag', () => {
    // Three sites: the budget abort, the sync alarm summary, the verify alarm
    // summary. alertOnCrash itself is the fourth and sets the flag directly.
    const sites = code.match(/await alertAdmin\(/g) ?? []
    const marks = code.match(/alertState\.alerted = true/g) ?? []
    expect(sites.length).toBe(4)
    expect(marks.length).toBe(3)
  })
})
