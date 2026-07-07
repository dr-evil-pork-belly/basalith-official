/**
 * Acceptance gate — item 4: the demo capture buffer endpoints are Guide-gated.
 *
 * Exercises the REAL route handlers. Only the identity boundary
 * (getSessionUser) and the write-free transform (demoIncidentBuffer) are mocked,
 * so what is under test is the guard itself: rejected without a Guide session,
 * accepted with one. Also asserts the synthetic-archive guard on /turn.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/auth/getSessionUser', () => ({ getSessionUser: vi.fn() }))

// Keep the auth test hermetic: no DB read, no model call. The transform itself is
// proven by scripts/demo-buffer-drive.ts.
vi.mock('@/lib/demoIncidentBuffer', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/demoIncidentBuffer')>()
  return {
    ...actual, // keep DEMO_ARCHIVE_PREFIX real
    pickDemoSeed: vi.fn(async () => ({ id: null, category: 'judgment', question: 'Tell me about a hard call.' })),
    startDemoSession: vi.fn(() => ({
      session: { id: 'demo:test', archiveId: 'demo:test', seedQuestionId: null, category: 'judgment', phase: 'SEED', status: 'open', state: { branches: [], currentBranchIndex: 0, spineCursor: 0, reprobeUsedOnCurrent: false, probeHistory: [], tensions: [], pendingDetour: null, dimensions: { stake: 'unelicited', read: 'unelicited', calibration: 'unelicited' }, probeBudgetUsed: 0, pendingProbeType: 'SEED', pendingQuestion: 'Tell me about a hard call.', pendingBranchIndex: -1 } },
      probe: { probeType: 'SEED', question: 'Tell me about a hard call.' },
    })),
    runDemoTurn: vi.fn(async () => ({
      session: { id: 'demo:test', archiveId: 'demo:test', seedQuestionId: null, category: 'judgment', phase: 'TIMELINE', status: 'open', state: { dimensions: { stake: 'unelicited', read: 'unelicited', calibration: 'unelicited' } } },
      answeredProbeType: 'SEED', reprobed: false,
      dimensions: { stake: 'unelicited', read: 'unelicited', calibration: 'unelicited' },
      nextProbe: { probeType: 'TIMELINE', question: 'Walk me through it.' }, incidentComplete: false,
    })),
  }
})

import { getSessionUser } from '@/lib/auth/getSessionUser'
import { POST as startPOST } from '@/app/api/archivist/demo/incident/start/route'
import { POST as turnPOST } from '@/app/api/archivist/demo/incident/turn/route'

const mockedGetSessionUser = vi.mocked(getSessionUser)

function post(url: string, body: unknown): NextRequest {
  return new NextRequest(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const VALID_DEMO_SESSION = {
  id: 'demo:abc', archiveId: 'demo:abc', seedQuestionId: null, category: 'judgment',
  phase: 'SEED', status: 'open',
  state: {
    branches: [], currentBranchIndex: 0, spineCursor: 0, reprobeUsedOnCurrent: false,
    probeHistory: [], tensions: [], pendingDetour: null,
    dimensions: { stake: 'unelicited', read: 'unelicited', calibration: 'unelicited' },
    probeBudgetUsed: 0, pendingProbeType: 'SEED', pendingQuestion: 'Tell me about a hard call.', pendingBranchIndex: -1,
  },
}

beforeEach(() => { mockedGetSessionUser.mockReset() })

describe('demo incident buffer — Guide auth guard', () => {
  it('start: rejects with 401 when there is no Guide session', async () => {
    mockedGetSessionUser.mockResolvedValue(null)
    const res = await startPOST(post('http://localhost/api/archivist/demo/incident/start', {}))
    const body = await res.json()
    console.log('START unauthenticated →', res.status, JSON.stringify(body))
    expect(res.status).toBe(401)
    expect(body.error).toBe('Unauthorized')
  })

  it('start: accepts with 200 when a Guide session is present', async () => {
    mockedGetSessionUser.mockResolvedValue({ userId: 'u1', email: 'g@x.co', role: 'guide', archivistId: 'g1' })
    const res = await startPOST(post('http://localhost/api/archivist/demo/incident/start', {}))
    const body = await res.json()
    console.log('START authenticated   →', res.status, '{ session:', !!body.session, ', probe:', JSON.stringify(body.probe), '}')
    expect(res.status).toBe(200)
    expect(body.session).toBeTruthy()
    expect(body.probe.probeType).toBe('SEED')
  })

  it('turn: rejects with 401 when there is no Guide session', async () => {
    mockedGetSessionUser.mockResolvedValue(null)
    const res = await turnPOST(post('http://localhost/api/archivist/demo/incident/turn', { session: VALID_DEMO_SESSION, answer: 'A real answer here.' }))
    const body = await res.json()
    console.log('TURN  unauthenticated →', res.status, JSON.stringify(body))
    expect(res.status).toBe(401)
    expect(body.error).toBe('Unauthorized')
  })

  it('turn: accepts with 200 when a Guide session is present', async () => {
    mockedGetSessionUser.mockResolvedValue({ userId: 'u1', email: 'g@x.co', role: 'guide', archivistId: 'g1' })
    const res = await turnPOST(post('http://localhost/api/archivist/demo/incident/turn', { session: VALID_DEMO_SESSION, answer: 'A real answer here.' }))
    const body = await res.json()
    console.log('TURN  authenticated   →', res.status, '{ nextProbe:', JSON.stringify(body.nextProbe), ', incidentComplete:', body.incidentComplete, '}')
    expect(res.status).toBe(200)
    expect(body.nextProbe.probeType).toBe('TIMELINE')
  })

  it('turn: rejects a session that points at a real (non-demo) archive id', async () => {
    mockedGetSessionUser.mockResolvedValue({ userId: 'u1', email: 'g@x.co', role: 'guide', archivistId: 'g1' })
    const realArchive = { ...VALID_DEMO_SESSION, archiveId: '11111111-2222-3333-4444-555555555555' }
    const res = await turnPOST(post('http://localhost/api/archivist/demo/incident/turn', { session: realArchive, answer: 'A real answer here.' }))
    const body = await res.json()
    console.log('TURN  real-archive id →', res.status, JSON.stringify(body))
    expect(res.status).toBe(400)
    expect(body.error).toBe('Invalid session')
  })
})
