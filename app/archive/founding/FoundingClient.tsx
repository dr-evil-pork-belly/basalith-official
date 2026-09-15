'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import type { FoundingScope, FoundingStatus } from '@/lib/foundingSequence'

// The Founding Sequence, owner surface.
//
// Three incident interviews run through the existing engine. Each turn: one
// probe, one answer (typed, or spoken and transcribed), saved on the spot. The
// page never advances an interview on its own; only a submitted answer does.
// Reloading re-serves the same probe. Colors are the portal's dark register,
// every text color measured against #0A0908 (see the table in globals.css).

const SERIF = '"Cormorant Garamond",Georgia,serif'
const MONO  = '"Space Mono","Courier New",monospace'
const GOLD  = '#C4A24A'
const BONE  = 'rgba(250,248,244,0.9)'   // 15:1
const BODY  = 'rgba(250,248,244,0.62)'  // 7.4:1
const LABEL = 'rgba(250,248,244,0.55)'  // 5.9:1

type Status = FoundingStatus & { ownerName?: string | null }

type AnswerResult = {
  ok?: boolean
  error?: string
  reprobed?: boolean
  incidentComplete?: boolean
  nextQuestion?: string | null
  nextProbeType?: string | null
  founding?: { call: 1 | 2 | 3 } | null
}

type RecorderState = 'idle' | 'requesting' | 'recording' | 'processing' | 'error'

type Proof =
  | { ready: false; reason: string }
  | {
      ready: true
      grounded: { question: string; answer: string; deposit: string } | null
      refusal: { question: string; reply: string } | null
      note: string | null
    }

export default function FoundingClient({
  archiveId,
  scope,
  ownerName,
}: {
  archiveId: string
  scope: FoundingScope
  ownerName: string | null
}) {
  const [status,     setStatus]     = useState<Status | null>(null)
  const [loadError,  setLoadError]  = useState('')
  const [starting,   setStarting]   = useState(false)
  const [answer,     setAnswer]     = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitErr,  setSubmitErr]  = useState('')
  const [note,       setNote]       = useState<'' | 'reprobe' | 'saved'>('')
  const [justClosed, setJustClosed] = useState<{ call: 1 | 2 | 3; deposits: number } | null>(null)
  const [recordingId, setRecordingId] = useState<string | null>(null)

  const loadStatus = useCallback(async (): Promise<Status | null> => {
    try {
      const res = await fetch('/api/archive/founding/status', { cache: 'no-store' })
      if (!res.ok) throw new Error(`status ${res.status}`)
      const data = (await res.json()) as Status
      setStatus(data)
      setLoadError('')
      return data
    } catch {
      setLoadError('Could not load the Founding Sequence. Reload the page to try again.')
      return null
    }
  }, [])

  useEffect(() => { void loadStatus() }, [loadStatus])

  async function startNext() {
    if (starting) return
    setStarting(true)
    setSubmitErr('')
    setJustClosed(null)
    try {
      const res = await fetch('/api/archive/founding/start', { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || 'Could not start the next call')
      await loadStatus()
    } catch (err) {
      setSubmitErr(err instanceof Error ? err.message : 'Could not start the next call')
    } finally {
      setStarting(false)
    }
  }

  async function submitAnswer() {
    const text = answer.trim()
    if (text.length < 2 || submitting) return
    setSubmitting(true)
    setSubmitErr('')
    setNote('')
    try {
      const res = await fetch('/api/archive/b2b-question/answer', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ answer: text, recordingId }),
      })
      const data = (await res.json().catch(() => ({}))) as AnswerResult
      if (!res.ok) throw new Error(data?.error || 'Could not save your answer')

      setAnswer('')
      setRecordingId(null)

      if (data.incidentComplete) {
        const call = data.founding?.call ?? status?.current?.call ?? null
        const prevDeposits = status?.current?.deposits ?? 0
        const fresh = await loadStatus()
        if (call) {
          // Deposit count for the call that just closed, from the refreshed status.
          const done = fresh?.calls.find(c => c.call === call)
          setJustClosed({ call, deposits: done?.deposits ?? prevDeposits })
        }
      } else {
        setNote(data.reprobed ? 'reprobe' : 'saved')
        await loadStatus()
      }
    } catch (err) {
      setSubmitErr(err instanceof Error ? err.message : 'Could not save your answer')
    } finally {
      setSubmitting(false)
    }
  }

  const current = status?.current ?? null
  const isBusiness = scope === 'business'
  const firstName = ownerName?.split(' ')[0] ?? null

  return (
    <div className="max-w-3xl mx-auto" style={{ paddingBottom: '64px' }}>

      {/* Header */}
      <p style={{ fontFamily: MONO, fontSize: '0.62rem', letterSpacing: '0.28em', textTransform: 'uppercase', color: GOLD, marginBottom: '14px' }}>
        The Founding Sequence
      </p>
      <h1 style={{ fontFamily: SERIF, fontSize: 'clamp(1.8rem,3.5vw,2.6rem)', fontWeight: 300, lineHeight: 1.12, letterSpacing: '-0.02em', color: BONE, marginBottom: '14px' }}>
        {isBusiness
          ? 'Three of the hardest calls you made running this business.'
          : 'Three of the hardest calls you ever made.'}
      </h1>
      <p style={{ fontFamily: SERIF, fontSize: '1.08rem', fontWeight: 300, lineHeight: 1.75, color: BODY, marginBottom: '36px', maxWidth: '560px' }}>
        About ten minutes each. Speak or type. Stop whenever you like and come back; every answer is saved as you go.
      </p>

      {loadError && (
        <p role="alert" style={{ fontFamily: SERIF, fontSize: '1rem', color: '#D98C8C', marginBottom: '24px' }}>{loadError}</p>
      )}

      {/* Call cards */}
      {status && (
        <div className="founding-cards" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2px', marginBottom: '36px' }}>
          {status.calls.map(c => {
            const lit = c.state !== 'upcoming'
            return (
              <div
                key={c.call}
                style={{
                  padding:    '18px 18px',
                  background: c.state === 'done' ? 'rgba(196,162,74,0.07)' : c.state === 'current' ? 'rgba(196,162,74,0.04)' : 'rgba(250,248,244,0.03)',
                  border:     `1px solid ${c.state === 'done' ? 'rgba(196,162,74,0.4)' : c.state === 'current' ? 'rgba(196,162,74,0.2)' : 'rgba(250,248,244,0.12)'}`,
                }}
              >
                <p style={{ fontFamily: MONO, fontSize: '0.56rem', letterSpacing: '0.25em', textTransform: 'uppercase', color: GOLD, marginBottom: '8px' }}>
                  Call {c.call}
                </p>
                <p style={{ fontFamily: SERIF, fontSize: '1.15rem', fontWeight: 400, color: lit ? BONE : 'rgba(250,248,244,0.7)', marginBottom: '6px', lineHeight: 1.3 }}>
                  {c.title}
                </p>
                <p style={{ fontFamily: MONO, fontSize: '0.56rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: LABEL, lineHeight: 1.6 }}>
                  {c.state === 'done'
                    ? `In your archive · ${c.deposits} ${c.deposits === 1 ? 'deposit' : 'deposits'}`
                    : c.state === 'current'
                      ? `In progress · ${c.turns} answered`
                      : 'Not yet started'}
                </p>
              </div>
            )
          })}
        </div>
      )}

      {/* Sequence complete */}
      {status?.done && !current && (
        <section aria-live="polite" style={panel()}>
          <p style={eyebrow()}>Complete</p>
          <h2 style={{ fontFamily: SERIF, fontSize: '1.6rem', fontWeight: 300, color: BONE, lineHeight: 1.25, marginBottom: '14px' }}>
            {firstName ? `${firstName}, the Founding Sequence is complete.` : 'The Founding Sequence is complete.'}
          </h2>
          <p style={{ fontFamily: SERIF, fontSize: '1.08rem', fontWeight: 300, lineHeight: 1.75, color: BODY, marginBottom: '14px' }}>
            We read every word ourselves. Within 48 hours we will be in touch to set up your first read: a short video call about what your archive holds, where it is still thin, and what comes next.
          </p>
          <p style={{ fontFamily: SERIF, fontSize: '1.08rem', fontWeight: 300, lineHeight: 1.75, color: BODY, marginBottom: '24px' }}>
            Your archive keeps growing from here. The dashboard has your next question whenever you are ready.
          </p>
          <Link href="/archive/dashboard" style={goldButton()}>Open your archive</Link>
          <ProofCard />
        </section>
      )}

      {/* A call just closed and the next one is available */}
      {justClosed && !current && !status?.done && (
        <section aria-live="polite" style={panel()}>
          <p style={eyebrow()}>Saved</p>
          <h2 style={{ fontFamily: SERIF, fontSize: '1.6rem', fontWeight: 300, color: BONE, lineHeight: 1.25, marginBottom: '14px' }}>
            Call {justClosed.call} is in your archive.
          </h2>
          <p style={{ fontFamily: SERIF, fontSize: '1.08rem', fontWeight: 300, lineHeight: 1.75, color: BODY, marginBottom: '24px' }}>
            {justClosed.deposits} {justClosed.deposits === 1 ? 'deposit' : 'deposits'}, in your own words. The next call is ready when you are. Now, or another day; it will be here.
          </p>
          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
            <button onClick={startNext} disabled={starting} style={goldButton(starting)}>
              {starting ? 'Opening' : `Begin call ${status?.nextCall ?? ''}`}
            </button>
            <Link href="/archive/dashboard" style={quietLink()}>Come back later</Link>
          </div>
        </section>
      )}

      {/* Nothing open yet: begin the next call */}
      {status && !current && !status.done && !justClosed && (
        <section style={panel()}>
          <p style={eyebrow()}>{status.completed === 0 ? 'Begin' : 'Continue'}</p>
          <h2 style={{ fontFamily: SERIF, fontSize: '1.6rem', fontWeight: 300, color: BONE, lineHeight: 1.25, marginBottom: '14px' }}>
            Call {status.nextCall}. {status.calls.find(c => c.call === status.nextCall)?.title}.
          </h2>
          <p style={{ fontFamily: SERIF, fontSize: '1.08rem', fontWeight: 300, lineHeight: 1.75, color: BODY, marginBottom: '24px' }}>
            One question to start, then a few more that follow what you say. Nothing you say has to be important. The ordinary details are usually the ones that show how you decide.
          </p>
          {submitErr && <p role="alert" style={{ fontFamily: SERIF, fontSize: '1rem', color: '#D98C8C', marginBottom: '14px' }}>{submitErr}</p>}
          <button onClick={startNext} disabled={starting} style={goldButton(starting)}>
            {starting ? 'Opening' : `Begin call ${status.nextCall}`}
          </button>
        </section>
      )}

      {/* The interview */}
      {current && (
        <section style={panel()}>
          {!current.isFounding && (
            <p style={{ fontFamily: SERIF, fontSize: '1rem', fontStyle: 'italic', color: BODY, marginBottom: '18px', lineHeight: 1.7 }}>
              You have an interview open from your dashboard. Finish it here; the Founding Sequence picks up right after.
            </p>
          )}
          <p style={eyebrow()}>
            {current.isFounding && current.call ? `Call ${current.call} · ` : ''}{current.label}
          </p>

          <div aria-live="polite" style={{ borderLeft: '3px solid rgba(196,162,74,0.5)', padding: '14px 22px', margin: '0 0 22px', background: 'rgba(196,162,74,0.04)' }}>
            <p style={{ fontFamily: SERIF, fontSize: 'clamp(1.25rem,2.4vw,1.5rem)', fontStyle: 'italic', fontWeight: 300, color: BONE, lineHeight: 1.55, margin: 0 }}>
              {current.question ?? 'Loading the next question.'}
            </p>
          </div>

          {note === 'reprobe' && (
            <p style={{ fontFamily: SERIF, fontSize: '1rem', fontStyle: 'italic', color: GOLD, marginBottom: '14px', lineHeight: 1.7 }}>
              A little more, if you can. What did you actually do, and why?
            </p>
          )}
          {note === 'saved' && (
            <p style={{ fontFamily: SERIF, fontSize: '1rem', fontStyle: 'italic', color: 'rgba(196,162,74,0.85)', marginBottom: '14px', lineHeight: 1.7 }}>
              Saved to your archive.
            </p>
          )}

          <label htmlFor="founding-answer" style={{ display: 'block', fontFamily: MONO, fontSize: '0.56rem', letterSpacing: '0.25em', textTransform: 'uppercase', color: LABEL, marginBottom: '8px' }}>
            Your answer
          </label>
          <textarea
            id="founding-answer"
            value={answer}
            onChange={e => setAnswer(e.target.value)}
            placeholder="In your own words. No length required."
            rows={7}
            disabled={submitting}
            style={{
              width:        '100%',
              background:   'rgba(10,9,8,0.5)',
              border:       '1px solid rgba(196,162,74,0.18)',
              borderRadius: '2px',
              padding:      '14px 18px',
              fontFamily:   SERIF,
              fontSize:     '1.12rem',
              color:        '#F0EDE6',
              lineHeight:   1.7,
              resize:       'vertical',
              outline:      'none',
              boxSizing:    'border-box',
            }}
          />

          <VoiceCapture
            archiveId={archiveId}
            prompt={current.question ?? ''}
            disabled={submitting}
            onTranscript={(text, id) => {
              setAnswer(prev => (prev.trim() ? `${prev.trim()}\n\n${text}` : text))
              setRecordingId(id)
            }}
          />

          {submitErr && <p role="alert" style={{ fontFamily: SERIF, fontSize: '1rem', color: '#D98C8C', margin: '12px 0 0' }}>{submitErr}</p>}

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '18px', flexWrap: 'wrap' }}>
            <button
              onClick={submitAnswer}
              disabled={submitting || answer.trim().length < 2}
              style={goldButton(submitting || answer.trim().length < 2)}
            >
              {submitting ? 'Saving' : 'Save and continue'}
            </button>
            <span style={{ fontFamily: MONO, fontSize: '0.56rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: LABEL }}>
              {current.turns} answered so far
            </span>
          </div>
        </section>
      )}

      <style>{`
        @media (max-width: 720px) {
          .founding-cards { grid-template-columns: 1fr !important; }
        }
        .founding-btn:focus-visible { outline: 2px solid ${GOLD}; outline-offset: 3px; }
        textarea#founding-answer:focus { border-color: rgba(196,162,74,0.5); }
      `}</style>
    </div>
  )
}

// ── The proof ─────────────────────────────────────────────────────────────────
// After the three calls: one question the archive answers from a deposit,
// with the deposit shown under it, and one it declines. Computed on demand by
// POST /api/archive/founding/proof and never stored. The badge wording is the
// approved phrase, "checked against your archive," and only appears on the
// grounded half. The refusal half is tagged "where the archive is silent, it
// says so," because a declined reply can still carry a grounded rule alongside
// the part it declines, and "no deposit covers this" overstated the silence.

function ProofCard() {
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [proof, setProof] = useState<Proof | null>(null)
  const [error, setError] = useState('')

  async function run() {
    setState('loading')
    setError('')
    try {
      const res = await fetch('/api/archive/founding/proof', { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || 'Could not ask your archive right now.')
      setProof(data as Proof)
      setState('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not ask your archive right now.')
      setState('error')
    }
  }

  const q = (text: string) => (
    <p style={{ fontFamily: SERIF, fontSize: '1.15rem', fontStyle: 'italic', fontWeight: 300, color: BONE, lineHeight: 1.55, margin: '0 0 12px' }}>
      {text}
    </p>
  )

  return (
    <div style={{ marginTop: '32px', paddingTop: '28px', borderTop: '1px solid rgba(196,162,74,0.15)' }}>
      <p style={eyebrow()}>What it holds</p>
      <p style={{ fontFamily: SERIF, fontSize: '1.08rem', fontWeight: 300, lineHeight: 1.75, color: BODY, marginBottom: '18px' }}>
        Your archive can already show you one thing it can answer, in your words, and one thing it will not, because you never said.
      </p>

      {state === 'idle' && (
        <button type="button" onClick={run} className="founding-btn" style={quietButton()}>Show me</button>
      )}
      {state === 'loading' && (
        <p aria-live="polite" style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: '1rem', color: BODY }}>
          Asking your archive. This takes a moment.
        </p>
      )}
      {state === 'error' && (
        <div>
          <p role="alert" style={{ fontFamily: SERIF, fontSize: '1rem', color: '#D98C8C', margin: '0 0 10px', lineHeight: 1.6 }}>{error}</p>
          <button type="button" onClick={run} className="founding-btn" style={quietButton()}>Try again</button>
        </div>
      )}

      {state === 'done' && proof && !proof.ready && (
        <p style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: '1rem', color: BODY, lineHeight: 1.7 }}>
          Your deposits are still being scored. Give it a few minutes and come back.
        </p>
      )}

      {state === 'done' && proof && proof.ready && (
        <div style={{ display: 'grid', gap: '2px' }} aria-live="polite">
          {proof.grounded && (
            <div style={{ padding: '20px 22px', background: 'rgba(196,162,74,0.05)', border: '1px solid rgba(196,162,74,0.3)' }}>
              <p style={{ ...eyebrow(), marginBottom: '10px' }}>Checked against your archive</p>
              {q(proof.grounded.question)}
              <p style={{ fontFamily: SERIF, fontSize: '1.02rem', fontWeight: 300, color: BONE, lineHeight: 1.7, margin: '0 0 16px', whiteSpace: 'pre-wrap' }}>
                {proof.grounded.answer}
              </p>
              <p style={{ fontFamily: MONO, fontSize: '0.54rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: LABEL, marginBottom: '6px' }}>
                From your archive, in your words
              </p>
              <p style={{ fontFamily: SERIF, fontSize: '0.98rem', fontStyle: 'italic', fontWeight: 300, color: BODY, lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap' }}>
                {proof.grounded.deposit}
              </p>
            </div>
          )}
          {proof.refusal && (
            <div style={{ padding: '20px 22px', background: 'rgba(250,248,244,0.03)', border: '1px solid rgba(250,248,244,0.12)' }}>
              <p style={{ ...eyebrow(), color: LABEL, marginBottom: '10px' }}>Where the archive is silent, it says so</p>
              {q(proof.refusal.question)}
              <p style={{ fontFamily: SERIF, fontSize: '1.02rem', fontWeight: 300, color: BODY, lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap' }}>
                {proof.refusal.reply}
              </p>
            </div>
          )}
          {proof.note && (
            <p style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: '1rem', color: BODY, lineHeight: 1.7, margin: '14px 0 0' }}>
              {proof.note}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ── Voice capture (transcript only) ─────────────────────────────────────────
// A small recorder that posts to /api/archive/transcribe-voice in
// transcript_only mode and hands the transcript back to the answer box. The
// answer route is the single writer for the deposit, and links the recording
// by id. Kept separate from app/components/VoiceRecorder.tsx, whose completion
// state says "saved to your archive," which would be false here.

function VoiceCapture({
  archiveId,
  prompt,
  disabled,
  onTranscript,
}: {
  archiveId: string
  prompt: string
  disabled: boolean
  onTranscript: (text: string, recordingId: string | null) => void
}) {
  const [state,    setState]    = useState<RecorderState>('idle')
  const [seconds,  setSeconds]  = useState(0)
  const [error,    setError]    = useState('')
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef   = useRef<Blob[]>([])
  const streamRef   = useRef<MediaStream | null>(null)
  const timerRef    = useRef<ReturnType<typeof setInterval> | null>(null)
  const secondsRef  = useRef(0)

  const stop = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    const r = recorderRef.current
    if (r && r.state !== 'inactive') r.stop()
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
  }, [])

  useEffect(() => () => stop(), [stop])

  const finish = useCallback(async (duration: number) => {
    setState('processing')
    try {
      const mimeType = chunksRef.current[0]?.type || 'audio/webm'
      const blob = new Blob(chunksRef.current, { type: mimeType })
      const form = new FormData()
      form.append('audio', blob, `recording.${mimeType.includes('mp4') ? 'mp4' : 'webm'}`)
      form.append('archiveId', archiveId)
      form.append('prompt', prompt)
      form.append('duration', String(duration))
      form.append('mode', 'transcript_only')
      const res = await fetch('/api/archive/transcribe-voice', { method: 'POST', body: form })
      const data = await res.json().catch(() => ({}))
      if (data?.success && data.transcript) {
        onTranscript(String(data.transcript).trim(), typeof data.recordingId === 'string' ? data.recordingId : null)
        setState('idle')
        setSeconds(0)
      } else if (data?.success) {
        setState('error')
        setError('Could not make out the recording. Try again a little closer to the microphone, or type your answer.')
      } else {
        throw new Error(data?.error || 'Processing failed')
      }
    } catch (err) {
      setState('error')
      setError(err instanceof Error ? err.message : 'Something went wrong. Try again, or type your answer.')
    }
  }, [archiveId, prompt, onTranscript])

  const start = useCallback(async () => {
    try {
      setError('')
      setState('requesting')
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 44100 },
      })
      streamRef.current = stream
      chunksRef.current = []
      secondsRef.current = 0
      const mimeType =
        MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' :
        MediaRecorder.isTypeSupported('audio/mp4')              ? 'audio/mp4' :
        'audio/webm'
      const rec = new MediaRecorder(stream, { mimeType })
      recorderRef.current = rec
      rec.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      rec.onstop = () => { void finish(secondsRef.current) }
      rec.start(1000)
      setState('recording')
      setSeconds(0)
      timerRef.current = setInterval(() => {
        secondsRef.current += 1
        setSeconds(secondsRef.current)
        if (secondsRef.current >= 300) stop()
      }, 1000)
    } catch (err) {
      setState('error')
      const name = err instanceof Error ? (err as { name?: string }).name : ''
      setError(
        name === 'NotAllowedError' ? 'Microphone access was not allowed. You can allow it in your browser settings, or type your answer.' :
        name === 'NotFoundError'   ? 'No microphone was found. You can type your answer instead.' :
        'Could not start recording. You can type your answer instead.'
      )
    }
  }, [finish, stop])

  const mm = Math.floor(seconds / 60)
  const ss = String(seconds % 60).padStart(2, '0')

  return (
    <div style={{ marginTop: '12px' }}>
      {state === 'idle' && (
        <button type="button" onClick={start} disabled={disabled} className="founding-btn" style={quietButton()}>
          <MicIcon /> Speak instead
        </button>
      )}
      {state === 'requesting' && (
        <p style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: '1rem', color: BODY, margin: '8px 0 0' }}>Asking for the microphone.</p>
      )}
      {state === 'recording' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap', marginTop: '4px' }}>
          <span aria-hidden="true" style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#C43E3E', display: 'inline-block' }} />
          <span style={{ fontFamily: MONO, fontSize: '0.9rem', color: BONE, letterSpacing: '0.05em' }}>{mm}:{ss}</span>
          <span style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: '1rem', color: BODY }}>Recording. Speak naturally. Up to five minutes.</span>
          <button type="button" onClick={stop} className="founding-btn" style={goldButton()}>Stop</button>
        </div>
      )}
      {state === 'processing' && (
        <p style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: '1rem', color: BODY, margin: '8px 0 0' }}>Transcribing. Your words will appear in the box above; read them over before you save.</p>
      )}
      {state === 'error' && (
        <div style={{ marginTop: '8px' }}>
          <p role="alert" style={{ fontFamily: SERIF, fontSize: '1rem', color: '#D98C8C', margin: '0 0 10px', lineHeight: 1.6 }}>{error}</p>
          <button type="button" onClick={() => { setState('idle'); setError('') }} className="founding-btn" style={quietButton()}>Try again</button>
        </div>
      )}
    </div>
  )
}

function MicIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ marginRight: '8px', verticalAlign: '-3px' }}>
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  )
}

// ── Style helpers ─────────────────────────────────────────────────────────────

function panel(): React.CSSProperties {
  return {
    background: 'rgba(196,162,74,0.04)',
    border:     '1px solid rgba(196,162,74,0.14)',
    borderTop:  '3px solid rgba(196,162,74,0.5)',
    padding:    'clamp(1.5rem,4vw,2.25rem) clamp(1.25rem,4vw,2.5rem)',
    borderRadius: '2px',
    marginBottom: '24px',
  }
}

function eyebrow(): React.CSSProperties {
  return {
    fontFamily:    MONO,
    fontSize:      '0.6rem',
    letterSpacing: '0.28em',
    textTransform: 'uppercase',
    color:         GOLD,
    marginBottom:  '14px',
  }
}

function goldButton(disabled = false): React.CSSProperties {
  return {
    fontFamily:    MONO,
    fontSize:      '0.62rem',
    letterSpacing: '0.22em',
    textTransform: 'uppercase',
    color:         '#0A0908',
    background:    GOLD,
    border:        'none',
    borderRadius:  '2px',
    padding:       '0.85rem 1.5rem',
    minHeight:     '44px',
    cursor:        disabled ? 'not-allowed' : 'pointer',
    opacity:       disabled ? 0.55 : 1,
    textDecoration:'none',
    display:       'inline-flex',
    alignItems:    'center',
  }
}

function quietButton(): React.CSSProperties {
  return {
    fontFamily:    MONO,
    fontSize:      '0.6rem',
    letterSpacing: '0.2em',
    textTransform: 'uppercase',
    color:         GOLD,
    background:    'transparent',
    border:        '1px solid rgba(196,162,74,0.35)',
    borderRadius:  '2px',
    padding:       '0.7rem 1.1rem',
    minHeight:     '44px',
    cursor:        'pointer',
    display:       'inline-flex',
    alignItems:    'center',
  }
}

function quietLink(): React.CSSProperties {
  return {
    fontFamily:    MONO,
    fontSize:      '0.6rem',
    letterSpacing: '0.2em',
    textTransform: 'uppercase',
    color:         LABEL,
    textDecoration:'none',
    minHeight:     '44px',
    display:       'inline-flex',
    alignItems:    'center',
  }
}
