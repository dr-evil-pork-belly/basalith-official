/**
 * Run ledger gate.
 *
 * Three properties matter and each has a case below:
 *
 *   1. 'ok' means work done. A skip or a dry run is never recorded as 'ok'.
 *   2. The ledger never stops the job. A store that cannot open or close a row
 *      is logged and the work still runs and still returns.
 *   3. A throwing job closes its row 'failed' and the error reaches the caller
 *      unchanged.
 *
 * The store is a fake. Nothing here can reach Supabase.
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { withCronRun, type CronRunStore, type CronRunReport } from './cronRun'

type Closed = CronRunReport & { finishedAt: string }

function fakeStore(overrides: Partial<CronRunStore> = {}) {
  const opened: { job: string; scheduler: string; startedAt: string }[] = []
  const closed: { id: string; input: Closed }[] = []
  const store: CronRunStore = {
    open: async (input) => {
      opened.push(input)
      return 'row-1'
    },
    close: async (id, input) => {
      closed.push({ id, input })
    },
    ...overrides,
  }
  return { store, opened, closed }
}

const T0 = new Date('2026-09-30T03:00:00.000Z')
const T1 = new Date('2026-09-30T03:00:07.000Z')

function clock() {
  const times = [T0, T1]
  return () => times.shift() ?? T1
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('withCronRun', () => {
  it('opens a row before the work and closes it ok with the summary', async () => {
    const { store, opened, closed } = fakeStore()
    const order: string[] = []
    const result = await withCronRun(
      {
        job: 'export-reaper',
        scheduler: 'vercel',
        now: clock(),
        store: {
          open: async (i) => {
            order.push('open')
            return store.open(i)
          },
          close: async (id, i) => {
            order.push('close')
            return store.close(id, i)
          },
        },
      },
      async () => {
        order.push('work')
        return { deleted: 2 }
      },
      (r) => ({ outcome: 'ok', summary: { deleted: r.deleted } }),
    )

    expect(result).toEqual({ deleted: 2 })
    expect(order).toEqual(['open', 'work', 'close'])
    expect(opened).toEqual([{ job: 'export-reaper', scheduler: 'vercel', startedAt: T0.toISOString() }])
    expect(closed).toEqual([
      { id: 'row-1', input: { outcome: 'ok', summary: { deleted: 2 }, finishedAt: T1.toISOString() } },
    ])
  })

  it('records a skip as skipped, never as ok', async () => {
    const { store, closed } = fakeStore()
    await withCronRun(
      { job: 'daily-reflection', scheduler: 'vercel', store },
      async () => ({ skipped: true }),
      (r) => ({ outcome: r.skipped ? 'skipped' : 'ok', summary: { reason: 'not 8am UTC' } }),
    )
    expect(closed[0].input.outcome).toBe('skipped')
  })

  it('closes failed and rethrows the same error when the work throws', async () => {
    const { store, closed } = fakeStore()
    const boom = new Error('bucket list failed')
    await expect(
      withCronRun(
        { job: 'export-reaper', scheduler: 'vercel', store },
        async () => {
          throw boom
        },
        () => ({ outcome: 'ok' }),
      ),
    ).rejects.toBe(boom)
    expect(closed).toHaveLength(1)
    expect(closed[0].input.outcome).toBe('failed')
    expect(closed[0].input.error).toBe('bucket list failed')
  })

  it('runs the work and returns its result when the row cannot be opened', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    const close = vi.fn(async () => {})
    const work = vi.fn(async () => 'done')
    const result = await withCronRun(
      {
        job: 'export-reaper',
        scheduler: 'vercel',
        store: {
          open: async () => {
            throw new Error('relation "cron_runs" does not exist')
          },
          close,
        },
      },
      work,
      () => ({ outcome: 'ok' }),
    )
    expect(result).toBe('done')
    expect(work).toHaveBeenCalledTimes(1)
    expect(close).not.toHaveBeenCalled()
    expect(log).toHaveBeenCalledTimes(1)
  })

  it('does not close when open returned no id', async () => {
    const close = vi.fn(async () => {})
    const result = await withCronRun(
      { job: 'export-reaper', scheduler: 'vercel', store: { open: async () => null, close } },
      async () => 7,
      () => ({ outcome: 'ok' }),
    )
    expect(result).toBe(7)
    expect(close).not.toHaveBeenCalled()
  })

  it('returns the result when the row cannot be closed', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { store } = fakeStore({
      close: async () => {
        throw new Error('timeout')
      },
    })
    const result = await withCronRun(
      { job: 'export-reaper', scheduler: 'vercel', store },
      async () => 'done',
      () => ({ outcome: 'ok' }),
    )
    expect(result).toBe('done')
    expect(log).toHaveBeenCalledTimes(1)
  })

  it('still rethrows the work error when the failed row cannot be closed', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const { store } = fakeStore({
      close: async () => {
        throw new Error('timeout')
      },
    })
    const boom = new Error('work failed')
    await expect(
      withCronRun(
        { job: 'export-reaper', scheduler: 'vercel', store },
        async () => {
          throw boom
        },
        () => ({ outcome: 'ok' }),
      ),
    ).rejects.toBe(boom)
  })

  it('records failed, and still returns, when report() throws', async () => {
    const { store, closed } = fakeStore()
    const result = await withCronRun(
      { job: 'export-reaper', scheduler: 'vercel', store },
      async () => 'done',
      () => {
        throw new Error('bad reporter')
      },
    )
    expect(result).toBe('done')
    expect(closed[0].input.outcome).toBe('failed')
    expect(closed[0].input.error).toContain('bad reporter')
  })

  it('truncates a long error', async () => {
    const { store, closed } = fakeStore()
    await expect(
      withCronRun(
        { job: 'export-reaper', scheduler: 'vercel', store },
        async () => {
          throw new Error('x'.repeat(5000))
        },
        () => ({ outcome: 'ok' }),
      ),
    ).rejects.toThrow()
    expect(closed[0].input.error).toHaveLength(2000)
  })
})
