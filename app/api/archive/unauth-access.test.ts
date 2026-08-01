/**
 * Security regression gate — fix/close-unauth-archive-access.
 *
 * Exercises the REAL route handlers for the six routes hardened in this hotfix.
 * Only the identity boundary (getSessionUser), the DB (supabase-admin), and the
 * heavy downstream (Anthropic, training pipeline, email, etc.) are mocked, so
 * what is under test is the guard itself. For each route we assert:
 *
 *   1. no session                          -> 401
 *   2. session but NOT the archive owner   -> 403   (simulates a successor: a
 *                                                     session whose archiveId is
 *                                                     filled by getSessionUser's
 *                                                     successor fallback)
 *   3. x-archive-id header with no session -> 401   (the deleted shim / the hole)
 *   4. the archive owner                   -> 200
 *
 * The ownership row returned by the mocked archives table always has
 * owner_user_id = OWNER_UID, so the owner session (userId === OWNER_UID) passes
 * and every other session is rejected.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import twilio from 'twilio'

vi.mock('@/lib/auth/getSessionUser', () => ({ getSessionUser: vi.fn() }))

// part 9. `after()` is the whole point of the fire-and-forget fix, and a live
// local run cannot tell it apart from a bare `void`: a long-lived process
// finishes both. The distinction only exists on a frozen lambda. So it is
// asserted structurally here instead. Every deferred callback is captured and
// run on demand, which also proves the deferred work is reached at all.
// Everything else in next/server is passed through untouched.
const AFTER = vi.hoisted(() => ({ callbacks: [] as Array<() => unknown> }))
vi.mock('next/server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('next/server')>()
  return { ...actual, after: (fn: () => unknown) => { AFTER.callbacks.push(fn) } }
})

// DB boundary: a flexible chainable stub. The archives ownership lookup resolves
// to ARCHIVE_ROW (owner_user_id = OWNER_UID); inserts return a generated id;
// every list-style query resolves empty so the owner happy-path can complete.
const H = vi.hoisted(() => {
  const OWNER_UID   = 'owner-uid'
  const ARCHIVE_ID  = 'arch-1111'
  // A contributor of ARCHIVE_ID, and one belonging to some other archive. The
  // second is what the contributors DELETE cross-archive case passes.
  const CONTRIB_ID         = 'contrib-1111'
  const FOREIGN_CONTRIB_ID = 'contrib-9999'
  // part 6 — one owned row and one foreign row per by-id route, so the
  // cross-archive case (owner session + another archive's row id) can miss.
  const RECORDING_ID          = 'rec-1111'
  const FOREIGN_RECORDING_ID  = 'rec-9999'
  const WISDOM_ID             = 'wis-1111'
  const FOREIGN_WISDOM_ID     = 'wis-9999'
  const CONVO_ID              = 'convo-1111'
  const FOREIGN_CONVO_ID      = 'convo-9999'
  const DATE_ID               = 'date-1111'
  const FOREIGN_DATE_ID       = 'date-9999'
  const DAILY_ID              = 'daily-1111'
  const FOREIGN_DAILY_ID      = 'daily-9999'
  const SUCCESSOR_ROW_ID      = 'succ-1111'
  const FOREIGN_SUCCESSOR_ID  = 'succ-9999'
  const EXCHANGE_ID           = 'exch-1111'
  const FOREIGN_EXCHANGE_ID   = 'exch-9999'
  const ARCHIVE_ROW = {
    id: ARCHIVE_ID, owner_user_id: OWNER_UID, status: 'active',
    name: 'Test Archive', family_name: 'Test', owner_name: 'Test Owner', preferred_language: 'en',
    total_photos: 3, contributor_entity_access: 'none', entity_preview_contributor_ids: [],
    // part 6 — fields the newly guarded owner happy-paths read.
    owner_email: 'owner@x.co', labelled_photos: 2,
    current_streak: 1, longest_streak: 4, last_label_date: null, last_session_date: null,
    wechat_link_code: 'ABC123', wechat_open_id: null,
    termination_requested_at: null, owner_birth_year: 1950, owner_birth_decade: 1950,
  }

  // part 9. Which RecordingSid values the voice_recordings table already
  // holds. The Twilio duplicate-delivery guard queries by that column, so the
  // test decides whether a given delivery is a repeat.
  const EXISTING_SIDS = new Set<string>()

  // Every terminal query is appended here as { table, op, filters, payload }.
  // part 8 uses it to assert WHICH row a Guide route touched, which is the whole
  // question on a route that used to take its identity from the request. part 9
  // uses payload to assert WHAT a write carried, which is the whole question on
  // a route whose insert was being rejected by a CHECK constraint.
  const dbCalls: { table: string; op: string; filters: Record<string, unknown>; payload?: unknown }[] = []

  function makeBuilder(table: string) {
    let op: 'select' | 'insert' | 'update' | 'delete' = 'select'
    // Recorded so the contributors table can honour `.eq('id', ...)`: the
    // DELETE guard is only meaningful if a foreign id actually misses.
    const filters: Record<string, unknown> = {}
    let payload: unknown = undefined
    const b: Record<string, unknown> = {}
    const pass = () => b
    b.select = pass
    b.insert = (v: unknown) => { op = 'insert'; payload = v; return b }
    b.upsert = (v: unknown) => { op = 'insert'; payload = v; return b }
    b.update = (v: unknown) => { op = 'update'; payload = v; return b }
    b.delete = () => { op = 'delete'; return b }
    b.eq = (col: string, val: unknown) => { filters[col] = val; return b }
    for (const m of ['neq', 'in', 'is', 'not', 'order', 'limit', 'range', 'gt', 'gte', 'lt', 'lte', 'contains', 'ilike', 'or', 'match']) b[m] = pass
    const terminal = () => {
      dbCalls.push({ table, op, filters: { ...filters }, payload })
      if (op === 'insert') return { data: { id: 'generated-id' }, error: null }
      if (table === 'archives') return { data: ARCHIVE_ROW, error: null }
      // part 9. The Twilio idempotency guard reads voice_recordings by
      // twilio_recording_sid. A sid the test has not seeded must miss, or the
      // guard would swallow every first delivery.
      if (table === 'voice_recordings' && filters.twilio_recording_sid !== undefined) {
        return EXISTING_SIDS.has(String(filters.twilio_recording_sid))
          ? { data: { id: 'existing-recording-1', archive_id: ARCHIVE_ID }, error: null }
          : { data: null, error: null }
      }
      // part 8. The Guide routes resolve their own row from the session id.
      // Whatever id is asked for resolves, so what the test asserts is WHICH id
      // was asked for, not whether the row happens to exist.
      if (table === 'archivists') {
        return {
          data: {
            id: filters.id, name: 'A Legacy Guide', email: 'guide@x.co', status: 'active',
          },
          error: null,
        }
      }
      // Scoped like the real table: a row resolves only when the id asked for
      // is the one that lives in ARCHIVE_ID.
      if (table === 'contributors') {
        if (filters.id && filters.id !== CONTRIB_ID) return { data: null, error: null }
        return {
          data: {
            id: CONTRIB_ID, archive_id: ARCHIVE_ID, name: 'A Contributor',
            email: 'contrib@x.co', access_token: 'tok-1', preferred_language: 'en',
          },
          error: null,
        }
      }
      // Rows for the by-id routes hardened in fix/mirror-ownership. Each route
      // filters on archive_id as well as id, so the owner happy-path resolves
      // and the guard is what decides the other three scenarios.
      if (table === 'photographs') {
        return { data: { id: 'photo-1', archive_id: ARCHIVE_ID, storage_path: `${ARCHIVE_ID}/photo-1.jpg` }, error: null }
      }
      if (table === 'archive_documents') {
        return { data: { id: 'doc-1', archive_id: ARCHIVE_ID, transcript: 'A transcript.', title: 'A Letter', summary: null, linguistic_patterns: null }, error: null }
      }
      if (table === 'archive_videos') {
        return { data: { id: 'vid-1', archive_id: ARCHIVE_ID, storage_path: `${ARCHIVE_ID}/vid-1.mp4` }, error: null }
      }
      // part 6 — the by-id tables. Each resolves only when BOTH the row id and
      // the archive_id filter match, which is exactly what the routes now send.
      // Owning an archive plus an arbitrary row id has to miss.
      const scoped = (t: string, ownId: string, row: Record<string, unknown>) => {
        if (table !== t) return null
        if (filters.id         && filters.id         !== ownId)     return { data: null, error: null }
        if (filters.archive_id && filters.archive_id !== ARCHIVE_ID) return { data: null, error: null }
        return { data: { id: ownId, archive_id: ARCHIVE_ID, ...row }, error: null }
      }
      return (
        scoped('voice_recordings',      RECORDING_ID,     { storage_path: `${ARCHIVE_ID}/rec-1.webm`, transcript: 'A transcript.' }) ??
        scoped('wisdom_sessions',       WISDOM_ID,        { dimension: 'professional_philosophy', answers: [], status: 'in_progress', current_question: 0 }) ??
        scoped('entity_conversations',  CONVO_ID,         { role: 'entity', content: 'A reply.', accuracy_rating: null }) ??
        // part 7 — date_type, month, day and notes are added for life-event,
        // which renders date_type into the email body and would throw on
        // undefined. The dates route (part 6a) does not read them.
        scoped('significant_dates',     DATE_ID,          { person_name: 'A Person', active: true, date_type: 'birthday', month: 7, day: 28, year: null, notes: null }) ??
        scoped('daily_sessions',        DAILY_ID,         { steps_completed: 0, deposits_added: 0, completed: false, session_date: '2026-07-28' }) ??
        scoped('successors',            SUCCESSOR_ROW_ID, { name: 'A Successor', email: 'succ@x.co' }) ??
        scoped('wisdom_exchanges',      EXCHANGE_ID,      { question: 'A question?', entity_response: 'A reply.', contributor_id: null }) ??
        { data: null, error: null }
      )
    }
    b.single = async () => terminal()
    b.maybeSingle = async () => terminal()
    // Awaitable list-style queries: `await supabaseAdmin.from(x).select(...).eq(...)`
    // A bare `.update(...).eq(...)` with no .single() lands here too, which is
    // the shape the Guide payout writes use.
    b.then = (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) => {
      dbCalls.push({ table, op, filters: { ...filters } })
      return Promise.resolve({ data: [], error: null, count: 0 }).then(res, rej)
    }
    return b
  }

  const supabaseAdmin = {
    from: (table: string) => makeBuilder(table),
    storage: {
      from: () => ({
        createSignedUrl:       async () => ({ data: { signedUrl: 'https://signed.test/x' },  error: null }),
        createSignedUploadUrl: async () => ({ data: { signedUrl: 'https://signed.test/up', token: 'tok' }, error: null }),
        upload:                async () => ({ error: null }),
      }),
    },
    rpc: async () => ({ data: null, error: null }),
  }

  return {
    dbCalls, EXISTING_SIDS,
    OWNER_UID, ARCHIVE_ID, ARCHIVE_ROW, CONTRIB_ID, FOREIGN_CONTRIB_ID, supabaseAdmin,
    RECORDING_ID, FOREIGN_RECORDING_ID, WISDOM_ID, FOREIGN_WISDOM_ID,
    CONVO_ID, FOREIGN_CONVO_ID, DATE_ID, FOREIGN_DATE_ID,
    DAILY_ID, FOREIGN_DAILY_ID, SUCCESSOR_ROW_ID, FOREIGN_SUCCESSOR_ID,
    EXCHANGE_ID, FOREIGN_EXCHANGE_ID,
  }
})

vi.mock('@/lib/supabase-admin', () => ({ supabaseAdmin: H.supabaseAdmin }))

// Heavy downstream deps — mocked so the owner happy-path returns without real I/O.
vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    messages = { create: async () => ({ content: [{ type: 'text', text: 'entity reply' }] }) }
  },
}))
vi.mock('@/lib/trainingPipeline', () => ({
  createTrainingPairFromDeposit: vi.fn(async () => {}),
  createTrainingPairsFromVoice:  vi.fn(async () => {}),
  // part 6b — training-data calls this. Without it the mocked module returns
  // undefined for the import and the route throws instead of answering.
  getTrainingStats:              vi.fn(async () => ({ totalPairs: 0, includedPairs: 0, averageScore: 0 })),
}))
vi.mock('@/lib/classifyDeposit', () => ({ classifyDeposit: vi.fn(async () => {}) }))
vi.mock('@/lib/inngest', () => ({ inngest: { send: () => Promise.resolve() } }))
vi.mock('@/lib/resend', () => ({ resend: { emails: { send: async () => ({}) } } }))
// poll-replies constructs its own client at module scope rather than importing
// the shared @/lib/resend singleton, and the real constructor throws without an
// API key. Mock the package itself so importing that route is possible offline.
vi.mock('resend', () => ({
  Resend: class { emails = { send: async () => ({}) } },
}))
// Which Guide the mocked Stripe account claims to belong to. Mutable so the GET
// mismatch case can point the account at a different Guide than the session.
const STRIPE_ACCOUNT_OWNER = vi.hoisted(() => ({ value: 'guide-session-111' }))
// part 8. connect-stripe imports the Stripe constructor at module top and
// builds the client lazily inside getStripe(). Mocked so the Guide happy-path
// reaches the database write instead of a network call. accounts.create stamps
// metadata.archivistId exactly as the real call does, which is what the GET leg
// verifies against the session.
vi.mock('stripe', () => {
  class MockStripe {
    accounts = {
      create: async (params: { metadata?: Record<string, string> }) => ({
        id: 'acct_mock_1', metadata: params?.metadata ?? {}, charges_enabled: true,
      }),
      retrieve: async (id: string) => ({
        id, metadata: { archivistId: STRIPE_ACCOUNT_OWNER.value }, charges_enabled: true,
      }),
    }
    accountLinks = {
      create: async () => ({ url: 'https://connect.stripe.test/onboard' }),
    }
  }
  return { default: MockStripe, Stripe: MockStripe }
})
vi.mock('@/lib/entityContext', () => ({ buildEntitySystemPrompt: async () => ({ systemPrompt: 'sys', usedDepositIds: [] }) }))
vi.mock('@/lib/entityReadiness', () => ({ calculateEntityReadiness: async () => ({ score: 42 }) }))
// succession/add provisions a Supabase Auth user. Mocked so the owner
// happy-path never reaches the real auth admin API.
vi.mock('@/lib/auth/getOrCreateAuthUser', () => ({ getOrCreateAuthUser: vi.fn(async () => 'auth-user-1') }))
// terminate is the one route in part 6 that sends email. @/lib/resend is
// already mocked above, so no message leaves the process in any scenario.

// transcribe-voice calls the OpenAI Whisper endpoint via global fetch. Stub it so
// the owner happy-path completes offline with an empty transcript.
vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ text: '', language: '' }), { status: 200 })))

import { getSessionUser } from '@/lib/auth/getSessionUser'
import { GET  as exportGET }        from '@/app/api/archive/export/route'
import { POST as ownerDepositPOST } from '@/app/api/archive/owner-deposit/route'
import { POST as randomThoughtPOST } from '@/app/api/archive/random-thought/route'
import { POST as uploadPOST }       from '@/app/api/archive/upload/route'
import { POST as entityChatPOST }   from '@/app/api/archive/entity-chat/route'
import { GET  as readinessGET, POST as readinessPOST } from '@/app/api/archive/entity-readiness/route'
// part 2 — the 14 remaining mobile-surface routes
import { GET  as galleryGET }         from '@/app/api/archive/gallery/route'
import { POST as transcribePOST }     from '@/app/api/archive/transcribe-voice/route'
import { GET  as accuracyGET }        from '@/app/api/archive/accuracy-mobile/route'
import { GET  as contribActivityGET } from '@/app/api/archive/contributor-activity-mobile/route'
import { GET  as dashboardGET }       from '@/app/api/archive/dashboard-mobile/route'
import { GET  as memGameGET, POST as memGamePOST }   from '@/app/api/archive/memory-game-mobile/route'
import { GET  as recordingsGET }      from '@/app/api/archive/recordings-mobile/route'
import { GET  as sigDatesGET, POST as sigDatesPOST } from '@/app/api/archive/significant-dates-mobile/route'
import { GET  as wisdomGET, POST as wisdomPOST }     from '@/app/api/archive/wisdom-exchange-mobile/route'
import { POST as companionPOST }      from '@/app/api/mobile/companion/route'
import { GET  as mirrorGET }          from '@/app/api/mobile/mirror/route'
import { POST as mirrorReactPOST }    from '@/app/api/mobile/mirror/react/route'
import { POST as myArchivesPOST }     from '@/app/api/mobile/my-archives/route'
import { POST as sparkRandomPOST }    from '@/app/api/mobile/spark/random/route'
// part 3 — fix/mirror-ownership: the web mirror pair plus the sharpest
// unauthenticated reads from the July 2026 /api/archive auth sweep.
import { GET  as archiveMirrorGET }      from '@/app/api/archive/mirror/route'
import { POST as archiveMirrorReactPOST } from '@/app/api/archive/mirror/react/route'
import { GET  as photoUrlGET }           from '@/app/api/archive/photo-url/route'
import {
  GET    as contributorsGET,
  POST   as contributorsPOST,
  PATCH  as contributorsPATCH,
  DELETE as contributorsDELETE,
} from '@/app/api/archive/contributors/route'
import { GET  as documentByIdGET }       from '@/app/api/archive/documents/[id]/route'
import { GET  as videoPlayGET }          from '@/app/api/archive/archive-videos/[id]/play/route'
import { GET  as videoByIdGET }          from '@/app/api/archive/archive-videos/[id]/route'
// part 5 — fix/delete-dead-routes-poll-replies-auth
import { POST as pollRepliesPOST }       from '@/app/api/archive/poll-replies/route'
// part 6a — fix/owner-guard-batch-2, commit A (high severity)
import { GET  as archiveDashboardGET }   from '@/app/api/archive/dashboard/route'
import { GET  as documentsGET }          from '@/app/api/archive/documents/route'
import { GET  as archiveVideosGET }      from '@/app/api/archive/archive-videos/route'
import { GET  as voiceRecordingsGET }    from '@/app/api/archive/voice-recordings/route'
import { GET  as voicePlayGET }          from '@/app/api/archive/voice-recordings/[id]/play/route'
import { GET  as photoLabelsGET }        from '@/app/api/archive/photo-labels/route'
import { GET  as witnessSessionsGET }    from '@/app/api/archive/witness-sessions/route'
import {
  GET   as wisdomSessionGET,
  POST  as wisdomSessionPOST,
  PATCH as wisdomSessionPATCH,
} from '@/app/api/archive/wisdom-session/route'
import {
  GET    as datesGET,
  POST   as datesPOST,
  DELETE as datesDELETE,
} from '@/app/api/archive/dates/route'
import { POST as savePOST }              from '@/app/api/archive/save/route'
import { POST as entityFeedbackPOST }    from '@/app/api/archive/entity-feedback/route'
import { POST as processDocumentPOST }   from '@/app/api/archive/process-document/route'
import { POST as processVideoPOST }      from '@/app/api/archive/process-video/route'
import { POST as pushTokenPOST }         from '@/app/api/archive/push-token/route'
import { GET  as wechatLinkGET }         from '@/app/api/archive/wechat-link/route'
import { POST as successionAddPOST }     from '@/app/api/archive/succession/add/route'
import { POST as successionRemovePOST }  from '@/app/api/archive/succession/remove/route'
import { POST as terminatePOST }         from '@/app/api/archive/terminate/route'
import { GET  as journalGET, POST as journalPOST }           from '@/app/api/archive/journal/route'
import { GET  as dailySessionGET, POST as dailySessionPOST } from '@/app/api/archive/daily-session/route'
// part 6b — fix/owner-guard-batch-2, commit B (medium and low)
import { GET  as entityAccuracyGET }     from '@/app/api/archive/entity-accuracy/route'
import { GET  as preferencesGET, POST as preferencesPOST } from '@/app/api/archive/preferences/route'
import { POST as inviteWitnessPOST }     from '@/app/api/archive/invite-witness/route'
import { POST as registerPhotoPOST }     from '@/app/api/archive/register-photo/route'
import { POST as uploadUrlPOST }         from '@/app/api/archive/upload-url/route'
import { GET  as timelineGET }           from '@/app/api/archive/timeline/route'
import { GET  as wisdomExchangeGET, POST as wisdomExchangePOST } from '@/app/api/archive/wisdom-exchange/route'
import { POST as scenariosRespondPOST }  from '@/app/api/archive/scenarios/respond/route'
import { GET  as processingStatusGET }   from '@/app/api/archive/processing-status/route'
import { GET  as mobileSparkGET }        from '@/app/api/archive/mobile-spark/route'
import { GET  as memoryMapGET }          from '@/app/api/archive/memory-map/route'
import { GET  as trainingDataGET }       from '@/app/api/archive/training-data/route'
import { POST as updateProfilePOST }     from '@/app/api/archive/update-profile/route'
// part 7 — fix/cron-secret-batch-3, the two routes with a browser caller as
// well as a cron caller. The two cron-only routes in that batch
// (morning-digest, contribution-alert) have no owner path and are covered in
// app/api/cron/cron-auth.test.ts instead.
import { POST as sendPhotoPOST }         from '@/app/api/archive/send-photo/route'
import { POST as lifeEventPOST }         from '@/app/api/archive/life-event/route'
// part 8, fix/guide-route-auth. The Legacy Guide side, not the archive side.
import {
  POST as connectStripePOST,
  GET  as connectStripeGET,
} from '@/app/api/archivist/connect-stripe/route'
import { POST as onboardClientPOST }     from '@/app/api/archivist/onboard-client/route'
// part 9, fix/twilio-signature-verify. The phone line: three unauthenticated
// webhook endpoints, one of which hands out the <Record action> URL.
import { POST as twilioVoicePOST }     from '@/app/api/twilio/voice/route'
import { POST as twilioRecordingPOST } from '@/app/api/twilio/recording/route'
import { POST as twilioContinuePOST }  from '@/app/api/twilio/continue/route'

const {
  dbCalls, EXISTING_SIDS,
  OWNER_UID, ARCHIVE_ID, CONTRIB_ID, FOREIGN_CONTRIB_ID,
  RECORDING_ID, FOREIGN_RECORDING_ID, WISDOM_ID, FOREIGN_WISDOM_ID,
  CONVO_ID, FOREIGN_CONVO_ID, DATE_ID, FOREIGN_DATE_ID,
  DAILY_ID, FOREIGN_DAILY_ID, SUCCESSOR_ROW_ID, FOREIGN_SUCCESSOR_ID,
  EXCHANGE_ID, FOREIGN_EXCHANGE_ID,
} = H
const mockedSession = vi.mocked(getSessionUser)

const OWNER_SESSION     = { userId: OWNER_UID,        email: 'owner@x.co', role: 'owner',     archiveId: ARCHIVE_ID }
const SUCCESSOR_SESSION = { userId: 'successor-uid',  email: 'succ@x.co',  role: 'successor', archiveId: ARCHIVE_ID, successorId: 's1' }

function get(url: string, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest(url, { method: 'GET', headers })
}
function jsonPost(url: string, body: unknown, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest(url, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body:    JSON.stringify(body),
  })
}
function jsonPatch(url: string, body: unknown, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest(url, {
    method:  'PATCH',
    headers: { 'Content-Type': 'application/json', ...headers },
    body:    JSON.stringify(body),
  })
}
function del(url: string, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest(url, { method: 'DELETE', headers })
}
function uploadReq(headers: Record<string, string> = {}): NextRequest {
  const fd = new FormData()
  fd.append('file', new File([new Uint8Array([0xff, 0xd8, 0xff, 0xe0])], 'test.jpg', { type: 'image/jpeg' }))
  return new NextRequest('http://localhost/api/archive/upload', { method: 'POST', body: fd, headers })
}
function transcribeReq(headers: Record<string, string> = {}): NextRequest {
  const fd = new FormData()
  fd.append('audio', new File([new Uint8Array([0x1a, 0x45, 0xdf, 0xa3])], 'rec.webm', { type: 'audio/webm' }))
  fd.append('prompt', 'A memory')
  fd.append('duration', '12')
  return new NextRequest('http://localhost/api/archive/transcribe-voice', { method: 'POST', body: fd, headers })
}
// part 6 — process-document and process-video read multipart bodies. Both keep
// the payload small enough that the owner path skips the model call and the
// deposit insert, so what the test exercises is the guard, not the pipeline.
// archiveId is still sent in the form so the dead parameter path is covered.
function documentReq(headers: Record<string, string> = {}): NextRequest {
  const fd = new FormData()
  fd.append('file', new File(['A short letter.'], 'letter.txt', { type: 'text/plain' }))
  fd.append('archiveId', ARCHIVE_ID)
  fd.append('documentType', 'personal_letter')
  return new NextRequest('http://localhost/api/archive/process-document', { method: 'POST', body: fd, headers })
}
function videoReq(headers: Record<string, string> = {}): NextRequest {
  const fd = new FormData()
  fd.append('file', new File([new Uint8Array([0x00, 0x00, 0x00, 0x18])], 'clip.mp4', { type: 'video/mp4' }))
  fd.append('archiveId', ARCHIVE_ID)
  fd.append('videoType', 'home_video')
  return new NextRequest('http://localhost/api/archive/process-video', { method: 'POST', body: fd, headers })
}

/**
 * Drive one route through all four auth scenarios. `invoke(headers)` builds and
 * calls the handler; POST bodies always carry archiveId so the dead body path is
 * exercised too. ownerExpect defaults to 200.
 */
async function runGuard(
  label: string,
  invoke: (headers?: Record<string, string>) => Promise<Response>,
  ownerExpect = 200,
) {
  mockedSession.mockResolvedValue(null)
  let res = await invoke()
  console.log(`${label.padEnd(22)} | no session             -> ${res.status}`)
  expect(res.status).toBe(401)

  mockedSession.mockResolvedValue(SUCCESSOR_SESSION as never)
  res = await invoke()
  console.log(`${label.padEnd(22)} | successor (not owner)  -> ${res.status}`)
  expect(res.status).toBe(403)

  mockedSession.mockResolvedValue(null)
  res = await invoke({ 'x-archive-id': ARCHIVE_ID })
  console.log(`${label.padEnd(22)} | x-archive-id, no sess  -> ${res.status}`)
  expect(res.status).toBe(401)

  mockedSession.mockResolvedValue(OWNER_SESSION as never)
  res = await invoke()
  console.log(`${label.padEnd(22)} | owner session          -> ${res.status}`)
  expect(res.status).toBe(ownerExpect)
}

beforeEach(() => { mockedSession.mockReset() })

describe('archive routes — unauthenticated-access hole closed + ownership enforced', () => {
  it('GET /api/archive/export', async () => {
    await runGuard('export', h => exportGET(get('http://localhost/api/archive/export', h)))
  })

  it('POST /api/archive/owner-deposit', async () => {
    await runGuard('owner-deposit', h =>
      ownerDepositPOST(jsonPost('http://localhost/api/archive/owner-deposit',
        { response: 'A real deposit answer, long enough to store.', archiveId: ARCHIVE_ID }, h)))
  })

  it('POST /api/archive/random-thought', async () => {
    await runGuard('random-thought', h =>
      randomThoughtPOST(jsonPost('http://localhost/api/archive/random-thought',
        { thought: 'A passing thought worth keeping here.', archiveId: ARCHIVE_ID }, h)))
  })

  it('POST /api/archive/upload', async () => {
    await runGuard('upload', h => uploadPOST(uploadReq(h)))
  })

  it('POST /api/archive/entity-chat', async () => {
    await runGuard('entity-chat', h =>
      entityChatPOST(jsonPost('http://localhost/api/archive/entity-chat',
        { message: 'This is a statement about my life long enough to be a deposit.', archiveId: ARCHIVE_ID }, h)))
  })

  it('POST /api/archive/entity-readiness', async () => {
    await runGuard('entity-readiness POST', h =>
      readinessPOST(jsonPost('http://localhost/api/archive/entity-readiness',
        { action: 'disable', archiveId: ARCHIVE_ID }, h)))
  })

  it('GET /api/archive/entity-readiness (query param no longer trusted)', async () => {
    // GET now takes no request object and reads archiveId from the session only,
    // so the old `?archiveId=` PII-leak path is unreachable. The x-archive-id
    // header case is represented by "no session" here since GET ignores inputs.
    mockedSession.mockResolvedValue(null)
    let res = await readinessGET()
    console.log(`entity-readiness GET   | no session             -> ${res.status}`)
    expect(res.status).toBe(401)

    mockedSession.mockResolvedValue(SUCCESSOR_SESSION as never)
    res = await readinessGET()
    console.log(`entity-readiness GET   | successor (not owner)  -> ${res.status}`)
    expect(res.status).toBe(403)

    mockedSession.mockResolvedValue(OWNER_SESSION as never)
    res = await readinessGET()
    console.log(`entity-readiness GET   | owner session          -> ${res.status}`)
    expect(res.status).toBe(200)
  })
})

describe('mobile API surface — unauthenticated access closed + ownership enforced (part 2)', () => {
  const U = 'http://localhost'

  it('GET /api/archive/gallery', async () => {
    await runGuard('gallery', h => galleryGET(get(`${U}/api/archive/gallery?archiveId=${ARCHIVE_ID}&page=1`, h)))
  })

  it('POST /api/archive/transcribe-voice', async () => {
    await runGuard('transcribe-voice', h => transcribePOST(transcribeReq(h)))
  })

  it('GET /api/archive/accuracy-mobile', async () => {
    await runGuard('accuracy-mobile', h => accuracyGET(get(`${U}/api/archive/accuracy-mobile?archiveId=${ARCHIVE_ID}`, h)))
  })

  it('GET /api/archive/contributor-activity-mobile', async () => {
    await runGuard('contrib-activity', h => contribActivityGET(get(`${U}/api/archive/contributor-activity-mobile?archiveId=${ARCHIVE_ID}`, h)))
  })

  it('GET /api/archive/dashboard-mobile', async () => {
    await runGuard('dashboard-mobile', h => dashboardGET(get(`${U}/api/archive/dashboard-mobile?archiveId=${ARCHIVE_ID}`, h)))
  })

  it('GET /api/archive/memory-game-mobile', async () => {
    await runGuard('memory-game GET', h => memGameGET(get(`${U}/api/archive/memory-game-mobile?archiveId=${ARCHIVE_ID}`, h)))
  })

  it('POST /api/archive/memory-game-mobile', async () => {
    await runGuard('memory-game POST', h => memGamePOST(jsonPost(`${U}/api/archive/memory-game-mobile`,
      { response: 'My weekly memory answer.', archiveId: ARCHIVE_ID }, h)))
  })

  it('GET /api/archive/recordings-mobile', async () => {
    await runGuard('recordings-mobile', h => recordingsGET(get(`${U}/api/archive/recordings-mobile?archiveId=${ARCHIVE_ID}`, h)))
  })

  it('GET /api/archive/significant-dates-mobile', async () => {
    await runGuard('sig-dates GET', h => sigDatesGET(get(`${U}/api/archive/significant-dates-mobile?archiveId=${ARCHIVE_ID}`, h)))
  })

  it('POST /api/archive/significant-dates-mobile', async () => {
    await runGuard('sig-dates POST', h => sigDatesPOST(jsonPost(`${U}/api/archive/significant-dates-mobile`,
      { label: 'Anniversary', year: 1990, archiveId: ARCHIVE_ID }, h)))
  })

  it('GET /api/archive/wisdom-exchange-mobile', async () => {
    await runGuard('wisdom GET', h => wisdomGET(get(`${U}/api/archive/wisdom-exchange-mobile?archiveId=${ARCHIVE_ID}`, h)))
  })

  it('POST /api/archive/wisdom-exchange-mobile', async () => {
    await runGuard('wisdom POST', h => wisdomPOST(jsonPost(`${U}/api/archive/wisdom-exchange-mobile`,
      { exchangeId: 'ex1', action: 'ignore', archiveId: ARCHIVE_ID }, h)))
  })

  it('POST /api/mobile/companion', async () => {
    await runGuard('companion', h => companionPOST(jsonPost(`${U}/api/mobile/companion`,
      { messages: [{ role: 'user', content: 'Hi there' }], archiveId: ARCHIVE_ID }, h)))
  })

  it('GET /api/mobile/mirror', async () => {
    await runGuard('mirror GET', h => mirrorGET(get(`${U}/api/mobile/mirror?archiveId=${ARCHIVE_ID}`, h)))
  })

  it('POST /api/mobile/mirror/react', async () => {
    await runGuard('mirror react', h => mirrorReactPOST(jsonPost(`${U}/api/mobile/mirror/react`,
      { reflectionId: 'r1', reaction: 'heart', archiveId: ARCHIVE_ID }, h)))
  })

  it('POST /api/mobile/spark/random', async () => {
    // Handler takes no request object; archiveId is derived from the session only.
    await runGuard('spark/random', () => sparkRandomPOST())
  })

  // Special: my-archives takes no archiveId and no email. It returns only the
  // authenticated caller's own archives. No session -> 401. There is no
  // "not the owner -> 403" case because it is a caller-scoped listing, not an
  // access to a specific archive.
  it('POST /api/mobile/my-archives (email param deleted, caller-scoped)', async () => {
    mockedSession.mockResolvedValue(null)
    let res: Response = await myArchivesPOST()
    console.log(`my-archives            | no session             -> ${res.status}`)
    expect(res.status).toBe(401)

    // Even with a caller-supplied email in the body and no session -> 401.
    // The handler ignores any request body entirely.
    mockedSession.mockResolvedValue(null)
    res = await (myArchivesPOST as unknown as (r: NextRequest) => Promise<Response>)(
      jsonPost(`${U}/api/mobile/my-archives`, { email: 'victim@example.com' }),
    )
    console.log(`my-archives            | supplied email, no sess -> ${res.status}`)
    expect(res.status).toBe(401)

    mockedSession.mockResolvedValue(OWNER_SESSION as never)
    res = await myArchivesPOST()
    console.log(`my-archives            | authenticated caller   -> ${res.status}`)
    expect(res.status).toBe(200)
  })
})

/**
 * part 3 — fix/mirror-ownership.
 *
 * The web mirror pair authorized on session.archiveId alone, so a signed-in
 * successor could read the owner's latest reflection and write a reaction onto
 * it. The other four routes had no auth at all: they took an archive id or a
 * row id straight from the caller and answered on the service-role client.
 *
 * /api/mobile/mirror and /api/mobile/mirror/react already had the ownership
 * check (covered in part 2). Only the /api/archive/* pair was missed.
 */
describe('web mirror pair + sharpest unauthenticated reads — ownership enforced (part 3)', () => {
  const U = 'http://localhost'

  it('GET /api/archive/mirror', async () => {
    // Handler takes no request object; archiveId is derived from the session only.
    await runGuard('archive mirror GET', () => archiveMirrorGET())
  })

  it('POST /api/archive/mirror/react', async () => {
    await runGuard('archive mirror react', h => archiveMirrorReactPOST(jsonPost(`${U}/api/archive/mirror/react`,
      { reflectionId: 'r1', reaction: 'heart', archiveId: ARCHIVE_ID }, h)))
  })

  it('POST /api/archive/mirror/react — successor cannot fire the P0 repair path', async () => {
    // 'not_quite_right' is the signal that fires P0 in lib/selectNextQuestion.ts.
    // A non-owner reaching it would steer the owner's next 7 days of questions.
    mockedSession.mockResolvedValue(SUCCESSOR_SESSION as never)
    const res = await archiveMirrorReactPOST(jsonPost(`${U}/api/archive/mirror/react`,
      { reflectionId: 'r1', reaction: 'not_quite_right' }))
    console.log(`mirror react P0        | successor (not owner)  -> ${res.status}`)
    expect(res.status).toBe(403)
  })

  it('GET /api/archive/photo-url', async () => {
    await runGuard('photo-url', h => photoUrlGET(get(`${U}/api/archive/photo-url?photographId=photo-1`, h)))
  })

  it('GET /api/archive/photo-url — caller-supplied path is no longer honoured', async () => {
    // The old interface signed any storage path with no auth and no archive
    // scoping. The parameter is gone: an owner passing only `path` now gets 400,
    // and the path never reaches storage.
    mockedSession.mockResolvedValue(OWNER_SESSION as never)
    const res = await photoUrlGET(get(`${U}/api/archive/photo-url?path=${ARCHIVE_ID}/photo-1.jpg`))
    console.log(`photo-url legacy path  | owner, path= only      -> ${res.status}`)
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'photographId required' })
  })

  it('GET /api/archive/contributors (access_token no longer readable without ownership)', async () => {
    // Handler takes no request object; the ?archiveId= param is no longer trusted.
    await runGuard('contributors GET', () => contributorsGET())
  })

  it('GET /api/archive/documents/[id]', async () => {
    await runGuard('document by id', h =>
      documentByIdGET(get(`${U}/api/archive/documents/doc-1`, h), { params: Promise.resolve({ id: 'doc-1' }) }))
  })

  it('GET /api/archive/archive-videos/[id]/play', async () => {
    await runGuard('video play by id', h =>
      videoPlayGET(get(`${U}/api/archive/archive-videos/vid-1/play`, h), { params: Promise.resolve({ id: 'vid-1' }) }))
  })

  // The transcript sibling of the route above. Guarding /play while leaving this
  // one open would look handled and would not get a second look, and the
  // transcript is the more sensitive of the two.
  it('GET /api/archive/archive-videos/[id]', async () => {
    await runGuard('video transcript by id', h =>
      videoByIdGET(get(`${U}/api/archive/archive-videos/vid-1`, h), { params: Promise.resolve({ id: 'vid-1' }) }))
  })
})

/**
 * part 4 — fix/contributors-write-auth.
 *
 * The GET on this route was closed in fix/mirror-ownership; POST, PATCH and
 * DELETE were out of scope and stayed unauthenticated. All three took the
 * archive id from the caller. DELETE was the sharpest: `?id=&archiveId=` with
 * archiveId optional, so a contributor id alone flipped the row to
 * `status = 'inactive'` on the service-role client, which cuts that person out
 * of every active-filtered path (their /contribute/{token} portal, the nightly
 * photograph, the weekly prompt, the phone deposit line).
 *
 * All three now derive archiveId from the session. The caller-supplied
 * parameter is gone rather than validated.
 */
describe('contributors write methods — ownership enforced (part 4)', () => {
  const U = 'http://localhost'

  it('POST /api/archive/contributors', async () => {
    await runGuard('contributors POST', h =>
      contributorsPOST(jsonPost(`${U}/api/archive/contributors`,
        { archiveId: ARCHIVE_ID, name: 'New Person', email: 'new@x.co', relationship: 'daughter' }, h)))
  })

  it('PATCH /api/archive/contributors (resend-invite remails a portal token)', async () => {
    await runGuard('contributors PATCH', h =>
      contributorsPATCH(jsonPatch(`${U}/api/archive/contributors`,
        { action: 'resend-invite', archiveId: ARCHIVE_ID, contributorId: CONTRIB_ID }, h)))
  })

  it('DELETE /api/archive/contributors', async () => {
    await runGuard('contributors DELETE', h =>
      contributorsDELETE(del(`${U}/api/archive/contributors?id=${CONTRIB_ID}&archiveId=${ARCHIVE_ID}`, h)))
  })

  it('DELETE /api/archive/contributors — owner cannot deactivate another archive\'s contributor', async () => {
    // Owning an archive is not authority over an arbitrary contributor id. The
    // target row is scoped to the session archive, so a foreign id misses.
    mockedSession.mockResolvedValue(OWNER_SESSION as never)
    const res = await contributorsDELETE(del(`${U}/api/archive/contributors?id=${FOREIGN_CONTRIB_ID}`))
    console.log(`contributors DELETE    | owner, foreign contrib -> ${res.status}`)
    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ error: 'Contributor not found' })
  })

  it('DELETE /api/archive/contributors — caller-supplied archiveId is no longer honoured', async () => {
    // The old handler dropped the archive filter entirely when ?archiveId= was
    // omitted. archiveId now comes from the session, so a caller pointing at
    // another archive changes nothing about which rows are in scope.
    mockedSession.mockResolvedValue(null)
    const res = await contributorsDELETE(
      del(`${U}/api/archive/contributors?id=${CONTRIB_ID}&archiveId=arch-someone-else`))
    console.log(`contributors DELETE    | supplied archiveId     -> ${res.status}`)
    expect(res.status).toBe(401)
  })
})

/**
 * part 5: fix/delete-dead-routes-poll-replies-auth.
 *
 * DELETED ROUTES, no test by design.
 *
 * Eight route files were removed in this commit rather than guarded. Each was
 * confirmed to have no caller in basalith-official, none in basalith-app, none
 * in basalith-xyz, no vercel.json cron entry, and no external-webhook shape.
 * There is deliberately no test for any of them. The absence of the file is the
 * fix, and a guard on a route nobody calls is dead code that still has to be
 * reasoned about at the next sweep. This block exists so a future reader knows
 * the missing coverage is a decision, not an oversight.
 *
 *   app/api/archive/init             anonymous archive creation. The live path
 *                                    is lib/billing/createArchive.ts, called by
 *                                    provisionOnFoundingFee.
 *   app/api/archive/invite           upserted an active `contributors` row for a
 *                                    caller-supplied email, which subscribed
 *                                    that address to the nightly photograph send
 *                                    indefinitely.
 *   app/api/archive/bulk-upload      superseded by upload-url plus
 *                                    register-photo, which is what
 *                                    LabelClient.uploadFileDirect calls.
 *   app/api/archive/deposit-prompt   owner email trigger that was never wired to
 *                                    a cron.
 *   app/api/archive/send-summary     replayed contributor reply text to the
 *                                    recipient list of any email_sessions row.
 *   app/api/archive/check-credentials  diagnostic. Confirmed whether an archive
 *                                    had a live mobile password.
 *   app/api/archive/test-inbound     diagnostic. Reported which env vars were
 *                                    set.
 *   app/api/archive/debug-gallery    diagnostic. Photograph counts.
 *
 * HELD BACK, not deleted: `terminate`. It also has no caller, but it implements
 * a real lifecycle promise (archive_lifecycle, scheduled_deletion_at) and reads
 * as an unbuilt UI rather than a retired feature. It takes the owner-guard in a
 * later batch.
 *
 * SESSION BRANCH REMOVED, routes kept live: setup-voice-clone and test-voice.
 * Both fell through from the god-mode cookie to session.archiveId with no
 * ownership check, so any signed-in successor could rebuild the owner's voice
 * clone or synthesize it saying arbitrary text. Neither fallback had a caller.
 * Both routes stay live on the god path and are not covered by runGuard, which
 * asserts an owner session succeeds. An owner session on these must now fail.
 *
 * POLL-REPLIES is the one route in this batch that is guarded rather than
 * deleted, and it is covered below.
 */
describe('poll-replies — manual bypass removed, cron and owner paths separated (part 5)', () => {
  const U = 'http://localhost'
  const CRON_SECRET = 'test-cron-secret'

  it('POST /api/archive/poll-replies', async () => {
    await runGuard('poll-replies', h => pollRepliesPOST(jsonPost(`${U}/api/archive/poll-replies`, {}, h)))
  })

  it('POST /api/archive/poll-replies — {"manual": true} with no session is rejected', async () => {
    // This is the bug. The old handler accepted this body as an alternative to
    // CRON_SECRET, so an anonymous two-word POST triggered a Resend inbox poll,
    // a model call per email, writes into email_replies and labels across every
    // archive with an open session, and outbound confirmation email.
    mockedSession.mockResolvedValue(null)
    const res = await pollRepliesPOST(jsonPost(`${U}/api/archive/poll-replies`, { manual: true }))
    console.log(`poll-replies           | {manual:true}, no sess -> ${res.status}`)
    expect(res.status).toBe(401)
  })

  it('POST /api/archive/poll-replies — {"manual": true} cannot upgrade a successor', async () => {
    // The body is not a credential and never was. A successor session plus the
    // old magic word still fails ownership.
    mockedSession.mockResolvedValue(SUCCESSOR_SESSION as never)
    const res = await pollRepliesPOST(jsonPost(`${U}/api/archive/poll-replies`, { manual: true }))
    console.log(`poll-replies           | {manual:true}, succ     -> ${res.status}`)
    expect(res.status).toBe(403)
  })

  it('POST /api/archive/poll-replies — cron path, secret by header and by query', async () => {
    vi.stubEnv('CRON_SECRET', CRON_SECRET)
    try {
      mockedSession.mockResolvedValue(null)

      let res = await pollRepliesPOST(jsonPost(`${U}/api/archive/poll-replies`, {},
        { authorization: `Bearer ${CRON_SECRET}` }))
      console.log(`poll-replies           | cron header secret     -> ${res.status}`)
      expect(res.status).toBe(200)

      res = await pollRepliesPOST(jsonPost(`${U}/api/archive/poll-replies?secret=${CRON_SECRET}`, {}))
      console.log(`poll-replies           | cron query secret      -> ${res.status}`)
      expect(res.status).toBe(200)

      res = await pollRepliesPOST(jsonPost(`${U}/api/archive/poll-replies`, {},
        { authorization: 'Bearer wrong-secret' }))
      console.log(`poll-replies           | wrong secret, no sess  -> ${res.status}`)
      expect(res.status).toBe(401)
    } finally {
      vi.unstubAllEnvs()
    }
  })

  it('POST /api/archive/poll-replies — an unset CRON_SECRET does not authorize an empty header', async () => {
    // `!!expectedSecret &&` matters. Without it an unset env var would make
    // `'' === ''` true and every anonymous caller would take the cron path.
    vi.stubEnv('CRON_SECRET', '')
    try {
      mockedSession.mockResolvedValue(null)
      const res = await pollRepliesPOST(jsonPost(`${U}/api/archive/poll-replies`, {},
        { authorization: 'Bearer ' }))
      console.log(`poll-replies           | empty secret + header  -> ${res.status}`)
      expect(res.status).toBe(401)
    } finally {
      vi.unstubAllEnvs()
    }
  })
})

/**
 * part 6a — fix/owner-guard-batch-2, COMMIT A (high severity).
 *
 * Every route here had the same defect in one of two shapes:
 *
 *   - no auth at all, with the archive taken from a query string, a JSON body
 *     or a multipart field: dashboard, documents, archive-videos,
 *     voice-recordings, voice-recordings/[id]/play, photo-labels,
 *     witness-sessions, wisdom-session, dates, save, entity-feedback,
 *     process-document, process-video, push-token, wechat-link, journal,
 *     daily-session
 *   - a session check that authorized on session.archiveId alone, which
 *     getSessionUser also fills for successors: succession/add,
 *     succession/remove, terminate
 *
 * All of them now take the owner-deposit pattern: 401 without a session
 * archiveId, then 403 unless archives.owner_user_id === session.userId. The
 * caller-supplied archive parameter is deleted rather than validated.
 *
 * The by-id routes get a second assertion. Owning an archive is not authority
 * over an arbitrary row id, so each row query is filtered on archive_id too and
 * an owner passing another archive's id must miss.
 *
 * terminate sends email on the owner path. @/lib/resend is mocked at the top of
 * this file, so nothing leaves the process in any scenario.
 */
describe('owner-guard batch 2, commit A — high severity (part 6a)', () => {
  const U = 'http://localhost'

  it('GET /api/archive/dashboard', async () => {
    // Handler takes no request object; the ?archiveId= param is gone.
    await runGuard('dashboard', () => archiveDashboardGET())
  })

  it('GET /api/archive/documents', async () => {
    await runGuard('documents', () => documentsGET())
  })

  it('GET /api/archive/archive-videos', async () => {
    await runGuard('archive-videos', () => archiveVideosGET())
  })

  it('GET /api/archive/voice-recordings', async () => {
    await runGuard('voice-recordings', () => voiceRecordingsGET())
  })

  it('GET /api/archive/voice-recordings/[id]/play', async () => {
    await runGuard('voice play by id', h =>
      voicePlayGET(get(`${U}/api/archive/voice-recordings/${RECORDING_ID}/play`, h),
        { params: Promise.resolve({ id: RECORDING_ID }) }))
  })

  it('GET voice-recordings/[id]/play — owner cannot play another archive recording', async () => {
    // The row query is filtered on archive_id, so a foreign recording id misses
    // and no signed audio URL is minted.
    mockedSession.mockResolvedValue(OWNER_SESSION as never)
    const res = await voicePlayGET(get(`${U}/api/archive/voice-recordings/${FOREIGN_RECORDING_ID}/play`),
      { params: Promise.resolve({ id: FOREIGN_RECORDING_ID }) })
    console.log(`voice play by id       | owner, foreign rec id  -> ${res.status}`)
    expect(res.status).toBe(404)
  })

  it('GET /api/archive/photo-labels', async () => {
    await runGuard('photo-labels', h =>
      photoLabelsGET(get(`${U}/api/archive/photo-labels?archiveId=${ARCHIVE_ID}&photographId=photo-1`, h)))
  })

  it('GET /api/archive/witness-sessions', async () => {
    await runGuard('witness-sessions', () => witnessSessionsGET())
  })

  it('GET /api/archive/wisdom-session', async () => {
    await runGuard('wisdom-session GET', () => wisdomSessionGET())
  })

  it('POST /api/archive/wisdom-session', async () => {
    await runGuard('wisdom-session POST', h =>
      wisdomSessionPOST(jsonPost(`${U}/api/archive/wisdom-session`,
        { archiveId: ARCHIVE_ID, dimension: 'core_values' }, h)))
  })

  it('PATCH /api/archive/wisdom-session', async () => {
    await runGuard('wisdom-session PATCH', h =>
      wisdomSessionPATCH(jsonPatch(`${U}/api/archive/wisdom-session`,
        { sessionId: WISDOM_ID, questionIndex: 0, answer: 'A real answer, long enough to store.' }, h)))
  })

  it('PATCH wisdom-session — owner cannot answer into another archive session', async () => {
    // This is the write that lands in owner_deposits and the training corpus.
    // A session id alone must not be authority for it.
    mockedSession.mockResolvedValue(OWNER_SESSION as never)
    const res = await wisdomSessionPATCH(jsonPatch(`${U}/api/archive/wisdom-session`,
      { sessionId: FOREIGN_WISDOM_ID, questionIndex: 0, answer: 'Text aimed at another archive.' }))
    console.log(`wisdom-session PATCH   | owner, foreign sess id -> ${res.status}`)
    expect(res.status).toBe(404)
  })

  it('GET /api/archive/dates', async () => {
    await runGuard('dates GET', () => datesGET())
  })

  it('POST /api/archive/dates', async () => {
    await runGuard('dates POST', h =>
      datesPOST(jsonPost(`${U}/api/archive/dates`,
        { archiveId: ARCHIVE_ID, personName: 'A Person', dateType: 'birthday', month: 4, day: 2 }, h)))
  })

  it('DELETE /api/archive/dates', async () => {
    await runGuard('dates DELETE', h =>
      datesDELETE(new NextRequest(`${U}/api/archive/dates`, {
        method: 'DELETE', headers: { 'Content-Type': 'application/json', ...h },
        body: JSON.stringify({ id: DATE_ID }),
      })))
  })

  it('DELETE /api/archive/dates — owner cannot retire another archive date', async () => {
    mockedSession.mockResolvedValue(OWNER_SESSION as never)
    const res = await datesDELETE(new NextRequest(`${U}/api/archive/dates`, {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: FOREIGN_DATE_ID }),
    }))
    console.log(`dates DELETE           | owner, foreign date id -> ${res.status}`)
    expect(res.status).toBe(404)
  })

  it('POST /api/archive/save', async () => {
    await runGuard('save', h =>
      savePOST(jsonPost(`${U}/api/archive/save`,
        { archiveId: ARCHIVE_ID, whatWasHappening: 'A day at the lake.', labelledBy: 'owner' }, h)))
  })

  it('POST /api/archive/entity-feedback', async () => {
    await runGuard('entity-feedback', h =>
      entityFeedbackPOST(jsonPost(`${U}/api/archive/entity-feedback`,
        { archiveId: ARCHIVE_ID, conversationId: CONVO_ID, rating: 'accurate' }, h)))
  })

  it('POST entity-feedback — owner cannot rate another archive conversation', async () => {
    // Entity poisoning: the correction lands in owner_deposits. A conversation
    // id from another archive must not reach the update or the deposit.
    mockedSession.mockResolvedValue(OWNER_SESSION as never)
    const res = await entityFeedbackPOST(jsonPost(`${U}/api/archive/entity-feedback`,
      { conversationId: FOREIGN_CONVO_ID, rating: 'inaccurate', correction: 'Poisoned text.' }))
    console.log(`entity-feedback        | owner, foreign convo   -> ${res.status}`)
    expect(res.status).toBe(404)
  })

  it('POST /api/archive/process-document', async () => {
    await runGuard('process-document', h => processDocumentPOST(documentReq(h)))
  })

  it('POST /api/archive/process-video', async () => {
    await runGuard('process-video', h => processVideoPOST(videoReq(h)))
  })

  it('POST /api/archive/push-token', async () => {
    await runGuard('push-token', h =>
      pushTokenPOST(jsonPost(`${U}/api/archive/push-token`,
        { archiveId: ARCHIVE_ID, token: 'ExponentPushToken[xxx]' }, h)))
  })

  it('GET /api/archive/wechat-link', async () => {
    // Mints and persists wechat_link_code, which the WeChat webhook accepts as
    // a bearer credential. Handler takes no request object.
    await runGuard('wechat-link', () => wechatLinkGET())
  })

  it('POST /api/archive/succession/add', async () => {
    await runGuard('succession/add', h =>
      successionAddPOST(jsonPost(`${U}/api/archive/succession/add`,
        { name: 'A Successor', email: 'new-succ@x.co', password: 'a-long-enough-password' }, h)))
  })

  it('POST /api/archive/succession/remove', async () => {
    await runGuard('succession/remove', h =>
      successionRemovePOST(jsonPost(`${U}/api/archive/succession/remove`,
        { successorId: SUCCESSOR_ROW_ID }, h)))
  })

  it('POST succession/remove — owner cannot remove another archive successor', async () => {
    mockedSession.mockResolvedValue(OWNER_SESSION as never)
    const res = await successionRemovePOST(jsonPost(`${U}/api/archive/succession/remove`,
      { successorId: FOREIGN_SUCCESSOR_ID }))
    console.log(`succession/remove      | owner, foreign succ id -> ${res.status}`)
    expect(res.status).toBe(404)
  })

  it('POST /api/archive/terminate (a successor could schedule the deletion)', async () => {
    await runGuard('terminate', h =>
      terminatePOST(jsonPost(`${U}/api/archive/terminate`, { confirm: true }, h)))
  })

  it('GET /api/archive/journal', async () => {
    await runGuard('journal GET', () => journalGET())
  })

  it('POST /api/archive/journal', async () => {
    await runGuard('journal POST', h =>
      journalPOST(jsonPost(`${U}/api/archive/journal`,
        { archiveId: ARCHIVE_ID, content: 'What I was thinking about today.' }, h)))
  })

  it('GET /api/archive/daily-session', async () => {
    // Inserts a daily_sessions row and returns a signed photograph URL, so the
    // GET is a write and a media read. Handler takes no request object.
    await runGuard('daily-session GET', () => dailySessionGET())
  })

  it('POST /api/archive/daily-session', async () => {
    await runGuard('daily-session POST', h =>
      dailySessionPOST(jsonPost(`${U}/api/archive/daily-session`,
        { action: 'step', sessionId: DAILY_ID, stepType: 'free_capture', response: 'A passing thought.' }, h)))
  })

  it('POST daily-session — the archive is no longer derived from the caller row', async () => {
    // The original handler read `const archiveId = session.archive_id` off the
    // row it had just fetched by caller-supplied id, so the row id was the
    // authority and an owner could write into any archive by passing its
    // session id. archiveId now comes from the session and the lookup is
    // scoped to it, so a foreign session id simply misses.
    mockedSession.mockResolvedValue(OWNER_SESSION as never)
    const res = await dailySessionPOST(jsonPost(`${U}/api/archive/daily-session`,
      { action: 'step', sessionId: FOREIGN_DAILY_ID, stepType: 'free_capture', response: 'Aimed elsewhere.' }))
    console.log(`daily-session POST     | owner, foreign sess id -> ${res.status}`)
    expect(res.status).toBe(404)
  })

  it('POST daily-session — complete cannot be aimed at another archive', async () => {
    // The complete branch writes current_streak, longest_streak and
    // last_session_date onto archives, so it needs the same scoping as step.
    mockedSession.mockResolvedValue(OWNER_SESSION as never)
    const res = await dailySessionPOST(jsonPost(`${U}/api/archive/daily-session`,
      { action: 'complete', sessionId: FOREIGN_DAILY_ID }))
    console.log(`daily-session complete | owner, foreign sess id -> ${res.status}`)
    expect(res.status).toBe(404)
  })
})

/**
 * part 6b — fix/owner-guard-batch-2, COMMIT B (medium and low severity).
 *
 * Same guard, lower blast radius. Five had no auth at all and took the archive
 * from a query string or a body (entity-accuracy, preferences, invite-witness,
 * register-photo, processing-status, mobile-spark). The rest already required a
 * session and authorized on session.archiveId alone, so a signed-in successor
 * passed (upload-url, timeline, wisdom-exchange, scenarios/respond, memory-map,
 * training-data, update-profile).
 *
 * invite-witness sends email on the owner path. @/lib/resend is mocked at the
 * top of this file, so nothing leaves the process in any scenario.
 *
 * mobile-spark is the fourth and last iOS-only route. It is guarded rather than
 * skipped for the same reason as the three in part 6a.
 */
describe('owner-guard batch 2, commit B — medium and low (part 6b)', () => {
  const U = 'http://localhost'

  it('GET /api/archive/entity-accuracy (writes entity_accuracy on a GET)', async () => {
    await runGuard('entity-accuracy', () => entityAccuracyGET())
  })

  it('GET /api/archive/preferences', async () => {
    await runGuard('preferences GET', () => preferencesGET())
  })

  it('POST /api/archive/preferences (cadence paused silences the archive)', async () => {
    await runGuard('preferences POST', h =>
      preferencesPOST(jsonPost(`${U}/api/archive/preferences`,
        { archiveId: ARCHIVE_ID, cadence: 'weekly', timezone: 'America/New_York' }, h)))
  })

  it('POST /api/archive/invite-witness (emails an arbitrary address)', async () => {
    await runGuard('invite-witness', h =>
      inviteWitnessPOST(jsonPost(`${U}/api/archive/invite-witness`,
        {
          archiveId: ARCHIVE_ID, contributorEmail: 'witness@x.co', contributorName: 'A Witness',
          relationship: 'child', subjectName: 'Test Owner', ownerName: 'Test Owner',
        }, h)))
  })

  it('POST /api/archive/register-photo', async () => {
    await runGuard('register-photo', h =>
      registerPhotoPOST(jsonPost(`${U}/api/archive/register-photo`,
        { archiveId: ARCHIVE_ID, storagePath: `${ARCHIVE_ID}/x.jpg`, fileName: 'x.jpg' }, h)))
  })

  it('POST /api/archive/upload-url', async () => {
    await runGuard('upload-url', h =>
      uploadUrlPOST(jsonPost(`${U}/api/archive/upload-url`, { fileName: 'photo.jpg' }, h)))
  })

  it('GET /api/archive/timeline', async () => {
    await runGuard('timeline', () => timelineGET())
  })

  it('GET /api/archive/wisdom-exchange', async () => {
    await runGuard('wisdom-exchange GET', () => wisdomExchangeGET())
  })

  it('POST /api/archive/wisdom-exchange', async () => {
    await runGuard('wisdom-exchange POST', h =>
      wisdomExchangePOST(jsonPost(`${U}/api/archive/wisdom-exchange`,
        { exchangeId: EXCHANGE_ID, action: 'ignore' }, h)))
  })

  it('POST wisdom-exchange — owner cannot act on another archive exchange', async () => {
    // The row query was already scoped to the session archive. This asserts it
    // stays that way now that the session archive is ownership-verified.
    mockedSession.mockResolvedValue(OWNER_SESSION as never)
    const res = await wisdomExchangePOST(jsonPost(`${U}/api/archive/wisdom-exchange`,
      { exchangeId: FOREIGN_EXCHANGE_ID, action: 'approve' }))
    console.log(`wisdom-exchange POST   | owner, foreign exch id -> ${res.status}`)
    expect(res.status).toBe(404)
  })

  it('POST /api/archive/scenarios/respond', async () => {
    await runGuard('scenarios/respond', h =>
      scenariosRespondPOST(jsonPost(`${U}/api/archive/scenarios/respond`,
        { scenarioId: 'key-hire', response: 'How I would actually decide this one.' }, h)))
  })

  it('GET /api/archive/processing-status', async () => {
    await runGuard('processing-status', () => processingStatusGET())
  })

  it('GET /api/archive/mobile-spark (iOS)', async () => {
    await runGuard('mobile-spark', () => mobileSparkGET())
  })

  it('GET /api/archive/memory-map', async () => {
    await runGuard('memory-map', () => memoryMapGET())
  })

  it('GET /api/archive/training-data', async () => {
    await runGuard('training-data', () => trainingDataGET())
  })

  it('POST /api/archive/update-profile', async () => {
    await runGuard('update-profile', h =>
      updateProfilePOST(jsonPost(`${U}/api/archive/update-profile`, { birthYear: 1950 }, h)))
  })
})

/**
 * part 7 — fix/cron-secret-batch-3, the two-path routes.
 *
 * `send-photo` and `life-event` each had two legitimate callers and no auth of
 * any kind. The cron fan-out at app/api/cron/send-photos/route.ts reached them
 * over plain fetch with no credential, and the owner's own browser reached them
 * from the Preferences page and the Dates page. An anonymous POST carrying an
 * archive UUID mailed a family's photographs to every active contributor
 * (send-photo) or mailed the owner and every contributor a significant-date
 * email plus a Sonnet call (life-event).
 *
 * Both now take the two-path shape poll-replies uses (part 5): CRON_SECRET by
 * header or query for the cron, or a verified owner session scoped to that
 * owner's archive. The cron half of the gate lives in
 * app/api/cron/cron-auth.test.ts. What is asserted here is the owner half.
 *
 * These tests send no credential, so `isFromCron` is false on every one of them
 * regardless of what CRON_SECRET holds in the environment: an empty header and
 * an empty query parameter can never equal a non-empty secret, and the
 * `!!expectedSecret` guard covers the case where it is unset.
 *
 * The cross-archive case on life-event is the one that is not just a guard.
 * The handler took `dateId` from the body and looked the row up by id alone, so
 * a verified owner could pass another archive's dateId and have that family's
 * person_name, year, and notes rendered into an email sent to their own
 * contributor list. The lookup is now scoped to the resolved archive, so a
 * foreign row id misses.
 */
describe('cron-secret batch 3 — two-path routes, owner half (part 7)', () => {
  const U = 'http://localhost'

  it('POST /api/archive/send-photo', async () => {
    // The archiveId in the body is ignored on the owner path, not validated.
    // It is sent here so the dead parameter path is exercised too.
    await runGuard('send-photo', h =>
      sendPhotoPOST(jsonPost(`${U}/api/archive/send-photo`, { archiveId: ARCHIVE_ID }, h)))
  })

  it('POST /api/archive/send-photo — a foreign archiveId in the body is ignored, not honoured', async () => {
    // PreferencesClient.tsx:149 still sends { archiveId }. The owner path
    // derives the archive from the session instead, so naming someone else's
    // archive cannot redirect the send. The owner's own run answers normally.
    mockedSession.mockResolvedValue(OWNER_SESSION as never)
    const res = await sendPhotoPOST(jsonPost(`${U}/api/archive/send-photo`, { archiveId: 'arch-someone-else' }))
    console.log(`send-photo             | owner + foreign body   -> ${res.status}`)
    expect(res.status).toBe(200)
  })

  it('POST /api/archive/life-event', async () => {
    await runGuard('life-event', h =>
      lifeEventPOST(jsonPost(`${U}/api/archive/life-event`,
        { archiveId: ARCHIVE_ID, dateId: DATE_ID, force: true }, h)))
  })

  it('POST /api/archive/life-event — an owner cannot mail another archive\'s significant date', async () => {
    // The row id is no longer authority on its own. Owning an archive plus an
    // arbitrary date id has to miss.
    mockedSession.mockResolvedValue(OWNER_SESSION as never)
    const res = await lifeEventPOST(jsonPost(`${U}/api/archive/life-event`,
      { archiveId: ARCHIVE_ID, dateId: FOREIGN_DATE_ID, force: true }))
    console.log(`life-event             | owner + foreign dateId -> ${res.status}`)
    expect(res.status).toBe(404)
  })

  it('POST /api/archive/life-event — a missing dateId is a 400, not a send', async () => {
    mockedSession.mockResolvedValue(OWNER_SESSION as never)
    const res = await lifeEventPOST(jsonPost(`${U}/api/archive/life-event`, { archiveId: ARCHIVE_ID }))
    console.log(`life-event             | owner, no dateId       -> ${res.status}`)
    expect(res.status).toBe(400)
  })
})

/**
 * part 8, fix/guide-route-auth.
 *
 * The Legacy Guide side of the same defect. Both routes took an archivist id
 * from the request and acted on it with no session check at all.
 *
 *   connect-stripe   POST created a Stripe Connect account and wrote
 *                    stripe_account_id + stripe_account_status onto whatever
 *                    archivist id the body named. GET did the same from the
 *                    query string. This one attaches a payout destination, so
 *                    it is the money-moving half.
 *   onboard-client   no auth at all. Created an archives row, an
 *                    archive_credentials row, a Supabase Auth user, a $1,000
 *                    commissions row and a prospects row, and mailed a magic
 *                    link. RETIRED to 410 rather than guarded, because gating
 *                    it would have hardened a second live way to create an
 *                    archive rather than removing it.
 *
 * These are Guide routes, not archive routes, so runGuard does not apply: there
 * is no archive ownership dimension and therefore no successor-403 case. The
 * gate is simply whether getSessionUser resolved an archivistId.
 *
 * The assertions that matter are the two cross-identity ones. They read the
 * captured dbCalls log and assert on WHICH archivists row every query touched,
 * because "the body id is ignored" is only true if no query ever carries it.
 */
describe('Legacy Guide routes, identity from session and never from request (part 8)', () => {
  const U = 'http://localhost'
  const SESSION_GUIDE = 'guide-session-111'
  const BODY_GUIDE    = 'guide-other-999'
  const GUIDE_SESSION = { userId: 'guide-uid', email: 'guide@x.co', role: 'guide', archivistId: SESSION_GUIDE }

  // Every archivists-table query recorded since the last reset.
  const guideCalls = () => dbCalls.filter(c => c.table === 'archivists')

  beforeEach(() => {
    dbCalls.length = 0
    STRIPE_ACCOUNT_OWNER.value = SESSION_GUIDE
    // getStripe() throws before it reaches the mocked client if the key is
    // absent, which would turn every happy path into a 500 and hide the guard.
    vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_mock')
  })
  afterEach(() => { vi.unstubAllEnvs() })

  it('POST /api/archivist/connect-stripe, no session is rejected', async () => {
    mockedSession.mockResolvedValue(null)
    const res = await connectStripePOST()
    console.log(`connect-stripe POST    | no session             -> ${res.status}`)
    expect(res.status).toBe(401)
    // The gate has to sit above the database, not beside it.
    expect(guideCalls()).toHaveLength(0)
  })

  it('POST /api/archivist/connect-stripe, a session with no archivistId is rejected', async () => {
    // An archive owner is signed in, but is not a Guide. getSessionUser fills
    // archiveId for them and leaves archivistId null.
    mockedSession.mockResolvedValue(OWNER_SESSION as never)
    const res = await connectStripePOST()
    console.log(`connect-stripe POST    | owner, not a guide     -> ${res.status}`)
    expect(res.status).toBe(401)
    expect(guideCalls()).toHaveLength(0)
  })

  it('POST /api/archivist/connect-stripe, a Guide session succeeds', async () => {
    mockedSession.mockResolvedValue(GUIDE_SESSION as never)
    const res = await connectStripePOST()
    console.log(`connect-stripe POST    | guide session          -> ${res.status}`)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ url: 'https://connect.stripe.test/onboard' })
  })

  it('POST connect-stripe, a body archivistId is ignored and the session row is the one written', async () => {
    // This is the fix. The handler no longer reads the body at all, so a caller
    // naming another Guide cannot redirect the payout write. Asserted on the
    // captured queries rather than on the status code, because a 200 alone would
    // not say which row moved.
    mockedSession.mockResolvedValue(GUIDE_SESSION as never)
    const res = await (connectStripePOST as unknown as (r: NextRequest) => Promise<Response>)(
      jsonPost(`${U}/api/archivist/connect-stripe`, { archivistId: BODY_GUIDE }),
    )
    expect(res.status).toBe(200)

    const calls = guideCalls()
    for (const c of calls) {
      console.log(`connect-stripe POST    | ${c.op.padEnd(6)} archivists.id = ${String(c.filters.id)}`)
    }

    // Every query, read and write, went to the session Guide.
    expect(calls.length).toBeGreaterThan(0)
    expect(calls.every(c => c.filters.id === SESSION_GUIDE)).toBe(true)
    // And the body id never reached the database in any form.
    expect(calls.some(c => c.filters.id === BODY_GUIDE)).toBe(false)
    // The payout write specifically was reached and was scoped to the session.
    const writes = calls.filter(c => c.op === 'update')
    expect(writes.length).toBeGreaterThan(0)
    expect(writes.every(c => c.filters.id === SESSION_GUIDE)).toBe(true)
  })

  it('GET /api/archivist/connect-stripe, no session redirects to sign in and writes nothing', async () => {
    // A browser navigation, so the unauthenticated answer is a redirect rather
    // than a 401 JSON body.
    mockedSession.mockResolvedValue(null)
    const res = await connectStripeGET(get(`${U}/api/archivist/connect-stripe?account=acct_mock_1`))
    console.log(`connect-stripe GET     | no session             -> ${res.status} ${res.headers.get('location')}`)
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/archivist-login')
    expect(guideCalls()).toHaveLength(0)
  })

  it('GET connect-stripe, a query archivistId is ignored and the session row is the one written', async () => {
    mockedSession.mockResolvedValue(GUIDE_SESSION as never)
    const res = await connectStripeGET(
      get(`${U}/api/archivist/connect-stripe?account=acct_mock_1&archivistId=${BODY_GUIDE}`),
    )
    console.log(`connect-stripe GET     | guide + foreign query  -> ${res.status}`)
    expect(res.headers.get('location')).toContain('stripe_connected=1')

    const calls = guideCalls()
    for (const c of calls) {
      console.log(`connect-stripe GET     | ${c.op.padEnd(6)} archivists.id = ${String(c.filters.id)}`)
    }
    expect(calls.length).toBeGreaterThan(0)
    expect(calls.every(c => c.filters.id === SESSION_GUIDE)).toBe(true)
    expect(calls.some(c => c.filters.id === BODY_GUIDE)).toBe(false)
  })

  it('GET connect-stripe, a Guide cannot claim an account belonging to another Guide', async () => {
    // The account id arrives as a parameter because Stripe puts it there, so it
    // is verified against metadata.archivistId rather than trusted. Without this
    // a signed-in Guide could point their own row at someone else's connected
    // account, which is the same hole one level down.
    STRIPE_ACCOUNT_OWNER.value = BODY_GUIDE
    mockedSession.mockResolvedValue(GUIDE_SESSION as never)
    const res = await connectStripeGET(get(`${U}/api/archivist/connect-stripe?account=acct_someone_else`))
    console.log(`connect-stripe GET     | foreign stripe account -> ${res.status} mismatch`)
    expect(res.headers.get('location')).toContain('error=stripe_account_mismatch')
    // Nothing was written.
    expect(guideCalls().filter(c => c.op === 'update')).toHaveLength(0)
  })

  it('POST /api/archivist/onboard-client, 410 with no session', async () => {
    mockedSession.mockResolvedValue(null)
    const res = await onboardClientPOST()
    console.log(`onboard-client         | no session             -> ${res.status}`)
    expect(res.status).toBe(410)
    expect(dbCalls).toHaveLength(0)
  })

  it('POST /api/archivist/onboard-client, 410 for an authenticated Guide too', async () => {
    // Retired, not gated. A valid Guide session does not reopen it.
    mockedSession.mockResolvedValue(GUIDE_SESSION as never)
    const res = await onboardClientPOST()
    console.log(`onboard-client         | guide session          -> ${res.status}`)
    expect(res.status).toBe(410)
    expect(dbCalls).toHaveLength(0)
  })

  it('POST /api/archivist/onboard-client, a full valid payload still creates nothing', async () => {
    // The exact body that used to provision an archive, a credentials row, a
    // $1,000 commission and a prospect. It now touches no table at all.
    mockedSession.mockResolvedValue(GUIDE_SESSION as never)
    const res = await (onboardClientPOST as unknown as (r: NextRequest) => Promise<Response>)(
      jsonPost(`${U}/api/archivist/onboard-client`, {
        archivistId: SESSION_GUIDE,
        familyName:  'Calder',
        clientEmail: 'calder@x.co',
        clientName:  'A Client',
        tier:        'estate',
      }),
    )
    console.log(`onboard-client         | full valid payload     -> ${res.status}, dbCalls=${dbCalls.length}`)
    expect(res.status).toBe(410)
    expect(dbCalls).toHaveLength(0)
  })
})

/**
 * part 9, fix/twilio-signature-verify.
 *
 * The phone line. Three webhook endpoints that Twilio calls and that nothing
 * else should be able to call.
 *
 *   voice      the entry point. Looks a caller up by From, and on a match hands
 *              back a <Record action> URL carrying that archive's id. It did
 *              validate, but through a validator that returned true whenever
 *              TWILIO_AUTH_TOKEN was absent, so unsetting one environment
 *              variable turned it into an open archive-id oracle.
 *   recording  no validation at all. Took archiveId straight from the query
 *              string and wrote a voice_recordings row, an owner_deposits row,
 *              a labels row and a notification against it.
 *   continue   no validation at all. Took archiveId from the query string and
 *              minted the next <Record action> URL from it.
 *
 * All three now go through lib/twilioSignature.ts, which fails closed and
 * answers 403. The signature covers the sorted POST parameters, so the body is
 * parsed before it can be checked. The property asserted here is the reachable
 * one: on a rejected request no database call happens at all, which also means
 * no query parameter was ever acted on.
 *
 * Three things ship in the same commit because they live in the same handler:
 *
 *   - owner_deposits.source_type was 'phone_call', a value the table rejects.
 *     Twenty-six calls produced zero deposits while every caller heard a
 *     confirmation, because the insert error was logged and swallowed. Asserted
 *     on the captured insert payload, not on the status code, since the route
 *     answers 200 either way. That is the load-bearing case: rejecting a
 *     forgery only proves a guard exists, accepting a genuine signed request
 *     proves the guard is correct.
 *   - Twilio delivers this webhook more than once and there was no idempotency
 *     check, so eight RecordingSid values are stored twice.
 *   - classifyDeposit and createTrainingPairsFromVoice were bare `void`
 *     dispatches, which die on lambda freeze.
 */
describe('Twilio webhooks, signature required and fail closed (part 9)', () => {
  const SITE  = 'https://phone.test.basalith.ai'
  // A throwaway value generated for this test. Not a credential, and not the
  // production token, which never appears in this repo.
  const TOKEN = 'batch1a-throwaway-test-token-000'
  const TRANSCRIPT =
    'My father ran the shop for thirty one years and never once let a customer leave unhappy, and that is the standard I have held to.'

  const ARCHIVE_QS = `archiveId=${ARCHIVE_ID}&isOwner=true`
  const SID        = 'REtest0000000000000000000000000a'

  /**
   * Build a Twilio-shaped POST. `sign` computes the real HMAC the same way
   * Twilio does, over the same URL lib/twilioSignature.ts reconstructs.
   */
  function twilioReq(
    path: string,
    params: Record<string, string>,
    opts: { sign?: boolean; token?: string } = {},
  ): NextRequest {
    const url  = `${SITE}${path}`
    const body = new URLSearchParams(params).toString()
    const headers: Record<string, string> = { 'Content-Type': 'application/x-www-form-urlencoded' }
    if (opts.sign) {
      headers['X-Twilio-Signature'] = twilio.getExpectedTwilioSignature(opts.token ?? TOKEN, url, params)
    }
    return new NextRequest(url, { method: 'POST', body, headers })
  }

  const recordingParams = (sid = SID) => ({
    CallSid:           'CAtest0000000000000000000000000a',
    RecordingSid:      sid,
    RecordingUrl:      `https://api.twilio.com/2010-04-01/Accounts/ACtest/Recordings/${sid}`,
    RecordingDuration: '42',
  })

  // The recording route downloads an MP3 from Twilio and posts it to Whisper.
  // Both are answered here so the owner path reaches the deposit insert with a
  // transcript long enough to be stored and long enough to train on.
  const phoneFetch = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input)
    if (url.includes('api.twilio.com')) return new Response(new Uint8Array([0x49, 0x44, 0x33, 0x04]), { status: 200 })
    if (url.includes('api.openai.com')) return new Response(JSON.stringify({ text: TRANSCRIPT }), { status: 200 })
    return new Response('{}', { status: 200 })
  })

  // Restored by hand rather than through unstubAllGlobals, which would drop the
  // file-level fetch stub the earlier parts rely on.
  const OUTER_FETCH = globalThis.fetch

  beforeEach(() => {
    dbCalls.length = 0
    AFTER.callbacks.length = 0
    EXISTING_SIDS.clear()
    phoneFetch.mockClear()
    globalThis.fetch = phoneFetch as unknown as typeof fetch
    vi.stubEnv('TWILIO_AUTH_TOKEN', TOKEN)
    vi.stubEnv('TWILIO_ACCOUNT_SID', 'ACtest00000000000000000000000000')
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', SITE)
  })
  afterEach(() => {
    globalThis.fetch = OUTER_FETCH
    vi.unstubAllEnvs()
  })

  // ── The guard ───────────────────────────────────────────────────────────────

  it('POST /api/twilio/recording, unsigned is 403 and touches no table', async () => {
    const res = await twilioRecordingPOST(
      twilioReq(`/api/twilio/recording?${ARCHIVE_QS}`, recordingParams()))
    console.log(`twilio/recording       | unsigned               -> ${res.status}, dbCalls=${dbCalls.length}`)
    expect(res.status).toBe(403)
    // No read, no download, no write, and the archiveId in the query string was
    // never acted on.
    expect(dbCalls).toHaveLength(0)
    expect(phoneFetch).not.toHaveBeenCalled()
  })

  it('POST /api/twilio/recording, a signature for the wrong token is 403', async () => {
    // A forger who knows the shape but not the secret.
    const res = await twilioRecordingPOST(
      twilioReq(`/api/twilio/recording?${ARCHIVE_QS}`, recordingParams(), { sign: true, token: 'not-the-token' }))
    console.log(`twilio/recording       | wrong-token signature  -> ${res.status}, dbCalls=${dbCalls.length}`)
    expect(res.status).toBe(403)
    expect(dbCalls).toHaveLength(0)
  })

  it('POST /api/twilio/recording, a signature over a different archiveId is 403', async () => {
    // The signature covers the URL, query string included. Replaying a genuine
    // signature against another archive breaks it, which is what makes the
    // archiveId parameter safe to use after the check.
    const genuine = twilio.getExpectedTwilioSignature(
      TOKEN, `${SITE}/api/twilio/recording?${ARCHIVE_QS}`, recordingParams())
    const res = await twilioRecordingPOST(new NextRequest(
      `${SITE}/api/twilio/recording?archiveId=arch-someone-else&isOwner=true`,
      {
        method:  'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Twilio-Signature': genuine },
        body:    new URLSearchParams(recordingParams()).toString(),
      }))
    console.log(`twilio/recording       | replayed onto other id -> ${res.status}, dbCalls=${dbCalls.length}`)
    expect(res.status).toBe(403)
    expect(dbCalls).toHaveLength(0)
  })

  it('POST /api/twilio/continue, unsigned is 403 and touches no table', async () => {
    const res = await twilioContinuePOST(
      twilioReq(`/api/twilio/continue?${ARCHIVE_QS}`, { Digits: '1' }))
    console.log(`twilio/continue        | unsigned               -> ${res.status}, dbCalls=${dbCalls.length}`)
    expect(res.status).toBe(403)
    expect(dbCalls).toHaveLength(0)
  })

  it('POST /api/twilio/voice, unsigned is 403 and hands out no Record action URL', async () => {
    const res = await twilioVoicePOST(
      twilioReq('/api/twilio/voice', { From: '+15551234567', CallSid: 'CAtest' }))
    const bodyText = await res.text()
    console.log(`twilio/voice           | unsigned               -> ${res.status}, dbCalls=${dbCalls.length}`)
    expect(res.status).toBe(403)
    expect(dbCalls).toHaveLength(0)
    // The old answer was <Hangup/>. Either way no archive id leaks, but 403 is
    // now the answer on all three routes. See the tradeoff note in the lib.
    expect(bodyText).not.toContain('<Record')
    expect(bodyText).not.toContain(ARCHIVE_ID)
  })

  it('POST /api/twilio/voice, an unset TWILIO_AUTH_TOKEN is 403, not a bypass', async () => {
    // The old validator returned true here. This is the fail-closed assertion:
    // even a correctly signed request is refused when the route has no token to
    // check it against, so a missing environment variable can never open the
    // route instead of closing it.
    vi.stubEnv('TWILIO_AUTH_TOKEN', '')
    const res = await twilioVoicePOST(
      twilioReq('/api/twilio/voice', { From: '+15551234567', CallSid: 'CAtest' }, { sign: true }))
    console.log(`twilio/voice           | no auth token          -> ${res.status}, dbCalls=${dbCalls.length}`)
    expect(res.status).toBe(403)
    expect(dbCalls).toHaveLength(0)
  })

  it('POST /api/twilio/recording, an unset TWILIO_AUTH_TOKEN is 403, not a bypass', async () => {
    vi.stubEnv('TWILIO_AUTH_TOKEN', '')
    const res = await twilioRecordingPOST(
      twilioReq(`/api/twilio/recording?${ARCHIVE_QS}`, recordingParams(), { sign: true }))
    console.log(`twilio/recording       | no auth token          -> ${res.status}, dbCalls=${dbCalls.length}`)
    expect(res.status).toBe(403)
    expect(dbCalls).toHaveLength(0)
  })

  it('POST /api/twilio/continue, an unset TWILIO_AUTH_TOKEN is 403, not a bypass', async () => {
    vi.stubEnv('TWILIO_AUTH_TOKEN', '')
    const res = await twilioContinuePOST(
      twilioReq(`/api/twilio/continue?${ARCHIVE_QS}`, { Digits: '1' }, { sign: true }))
    console.log(`twilio/continue        | no auth token          -> ${res.status}, dbCalls=${dbCalls.length}`)
    expect(res.status).toBe(403)
    expect(dbCalls).toHaveLength(0)
  })

  // ── The genuine request ─────────────────────────────────────────────────────

  it('POST /api/twilio/voice, a signed request is answered with a Record action URL', async () => {
    const res = await twilioVoicePOST(
      twilioReq('/api/twilio/voice', { From: '+15551234567', CallSid: 'CAtest' }, { sign: true }))
    const bodyText = await res.text()
    console.log(`twilio/voice           | signed                 -> ${res.status}`)
    expect(res.status).toBe(200)
    expect(bodyText).toContain('<Record')
    expect(bodyText).toContain('/api/twilio/recording')
  })

  it('POST /api/twilio/continue, a signed request is answered with TwiML', async () => {
    const res = await twilioContinuePOST(
      twilioReq(`/api/twilio/continue?${ARCHIVE_QS}`, { Digits: '1' }, { sign: true }))
    const bodyText = await res.text()
    console.log(`twilio/continue        | signed                 -> ${res.status}`)
    expect(res.status).toBe(200)
    expect(bodyText).toContain('<Record')
  })

  it('POST /api/twilio/recording, a signed request writes a deposit with source_type deposit', async () => {
    const res = await twilioRecordingPOST(
      twilioReq(`/api/twilio/recording?${ARCHIVE_QS}`, recordingParams(), { sign: true }))
    console.log(`twilio/recording       | signed                 -> ${res.status}`)
    expect(res.status).toBe(200)

    const deposits = dbCalls.filter(c => c.table === 'owner_deposits' && c.op === 'insert')
    for (const d of deposits) {
      const p = d.payload as Record<string, unknown>
      console.log(`twilio/recording       | owner_deposits insert source_type = ${String(p.source_type)}`)
    }
    // This is the fix. 'phone_call' is not an accepted source_type, so every one
    // of these inserts used to be rejected by the table and swallowed by the
    // handler while the caller heard "your memory has been saved."
    expect(deposits).toHaveLength(1)
    const payload = deposits[0].payload as Record<string, unknown>
    expect(payload.source_type).toBe('deposit')
    expect(payload.archive_id).toBe(ARCHIVE_ID)
    expect(payload.response).toBe(TRANSCRIPT)

    // And the recording itself was stored with the sid, which is what the
    // idempotency guard reads on the next delivery.
    const recordings = dbCalls.filter(c => c.table === 'voice_recordings' && c.op === 'insert')
    expect(recordings).toHaveLength(1)
    expect((recordings[0].payload as Record<string, unknown>).twilio_recording_sid).toBe(SID)
  }, 30_000)

  it('POST /api/twilio/recording, the deferred work is registered with after() and completes', async () => {
    await twilioRecordingPOST(
      twilioReq(`/api/twilio/recording?${ARCHIVE_QS}`, recordingParams(), { sign: true }))

    // Two deferred jobs: classifyDeposit and createTrainingPairsFromVoice. Both
    // were bare `void` dispatches, which resolve fine in a long-lived process
    // and die on a frozen lambda, which is why the assertion is on after()
    // having been handed the work rather than on the work having finished.
    console.log(`twilio/recording       | after() callbacks      -> ${AFTER.callbacks.length}`)
    expect(AFTER.callbacks).toHaveLength(2)

    const { classifyDeposit }              = await import('@/lib/classifyDeposit')
    const { createTrainingPairsFromVoice } = await import('@/lib/trainingPipeline')
    vi.mocked(classifyDeposit).mockClear()
    vi.mocked(createTrainingPairsFromVoice).mockClear()

    await Promise.all(AFTER.callbacks.map(fn => fn()))

    console.log(`twilio/recording       | classifyDeposit calls  -> ${vi.mocked(classifyDeposit).mock.calls.length}`)
    console.log(`twilio/recording       | training pair calls    -> ${vi.mocked(createTrainingPairsFromVoice).mock.calls.length}`)
    expect(classifyDeposit).toHaveBeenCalledTimes(1)
    expect(createTrainingPairsFromVoice).toHaveBeenCalledTimes(1)
    // The training pair names the recording this request just inserted, not
    // "the archive's newest row", which was a race between two deliveries.
    expect(vi.mocked(createTrainingPairsFromVoice).mock.calls[0][0]).toMatchObject({
      id:         'generated-id',
      archive_id: ARCHIVE_ID,
      transcript: TRANSCRIPT,
    })
  }, 30_000)

  // ── Idempotency ─────────────────────────────────────────────────────────────

  it('POST /api/twilio/recording, a repeat delivery of the same sid writes nothing', async () => {
    // Twilio delivers this webhook more than once. Eight RecordingSid values
    // are already stored twice in production because of it.
    EXISTING_SIDS.add(SID)

    const res = await twilioRecordingPOST(
      twilioReq(`/api/twilio/recording?${ARCHIVE_QS}`, recordingParams(), { sign: true }))
    const bodyText = await res.text()

    const writes = dbCalls.filter(c => c.op === 'insert' || c.op === 'update')
    console.log(`twilio/recording       | duplicate sid          -> ${res.status}, writes=${writes.length}`)
    expect(res.status).toBe(200)
    // The caller still hears the same thing. Nothing is written, and the guard
    // sits above the download, so the recording is not re-fetched either.
    expect(bodyText).toContain('<Gather')
    expect(writes).toHaveLength(0)
    expect(phoneFetch).not.toHaveBeenCalled()
    expect(AFTER.callbacks).toHaveLength(0)
  })

  it('POST /api/twilio/recording, a first delivery of an unseen sid is not treated as a repeat', async () => {
    // The other half of the guard. Nothing is seeded, so this sid must miss and
    // the write must happen. Without this the guard could swallow every call.
    const res = await twilioRecordingPOST(
      twilioReq(`/api/twilio/recording?${ARCHIVE_QS}`, recordingParams('REtest0000000000000000000000000b'), { sign: true }))
    const writes = dbCalls.filter(c => c.op === 'insert')
    console.log(`twilio/recording       | unseen sid             -> ${res.status}, inserts=${writes.length}`)
    expect(res.status).toBe(200)
    expect(writes.some(c => c.table === 'voice_recordings')).toBe(true)
    expect(writes.some(c => c.table === 'owner_deposits')).toBe(true)
  }, 30_000)
})
