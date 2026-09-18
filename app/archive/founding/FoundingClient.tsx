'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import type { FoundingScope, FoundingStatus } from '@/lib/foundingSequence'
import { canShowProof } from '@/lib/trial'

// The Founding Sequence, owner surface.
//
// Three incident interviews run through the existing engine. Each turn: one
// probe, one answer (typed, or spoken and transcribed), saved on the spot. The
// page never advances an interview on its own; only a submitted answer does.
// Reloading re-serves the same probe. Colors are the portal's stone register:
// every value is a var(--portal-*) read from the .portal-stone block in
// globals.css, where each pair is measured. No hex literal belongs here. The
// proof card's result blocks are the one dark surface (the --invert-* tokens),
// and nothing inside them inherits the stone text colors.

const SERIF  = 'var(--portal-serif)'
const MONO   = 'var(--portal-mono)'
const GOLD   = 'var(--portal-gold-ink)'
const INK    = 'var(--portal-ink)'
const BODY   = 'var(--portal-body)'
const SECOND = 'var(--portal-secondary)'
const LABEL  = 'var(--portal-label)'
const ERR    = 'var(--portal-error)'

type Status = FoundingStatus & { ownerName?: string | null }

type AnswerResult = {
  ok?: boolean
  error?: string
  reprobed?: boolean
  incidentComplete?: boolean
  nextQuestion?: string | null
  nextProbeType?: string | null
  founding?: { call: 1 | 2 | 3 } | null
  areaCall?: { area: string } | null
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
  area,
  ownerName,
  trial = false,
}: {
  archiveId: string
  scope: FoundingScope
  /** An area from the coverage map to deposit into (lib/areaCalls.ts). Opens an area call on load. */
  area?: string | null
  ownerName: string | null
  /** archives.status === 'trial' (lib/trial.ts isTrial). Adds one line under the proof card. */
  trial?: boolean
}) {
  const [status,     setStatus]     = useState<Status | null>(null)
  const [loadError,  setLoadError]  = useState('')
  const [starting,   setStarting]   = useState(false)
  const [answer,     setAnswer]     = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitErr,  setSubmitErr]  = useState('')
  const [note,       setNote]       = useState<'' | 'reprobe' | 'saved'>('')
  const [justClosed, setJustClosed] = useState<{ call: 1 | 2 | 3; deposits: number } | null>(null)
  const [areaClosed, setAreaClosed] = useState<{ area: string; deposits: number } | null>(null)
  const areaOpenedRef = useRef(false)
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

  // Arrived from the coverage map with an area: open a call aimed at it, once.
  // If an interview is already open the route returns it and the page simply
  // continues that one, which the copy below explains.
  useEffect(() => {
    if (!area || areaOpenedRef.current) return
    areaOpenedRef.current = true
    ;(async () => {
      setStarting(true)
      setSubmitErr('')
      try {
        const res = await fetch('/api/archive/area-call/start', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ area }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data?.error || 'Could not open the call')
        await loadStatus()
      } catch (err) {
        setSubmitErr(err instanceof Error ? err.message : 'Could not open the call')
      } finally {
        setStarting(false)
      }
    })()
  }, [area, loadStatus])

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
        const closedArea = data.areaCall?.area ?? status?.current?.area ?? null
        const prevDeposits = status?.current?.deposits ?? 0
        const fresh = await loadStatus()
        if (call) {
          // Deposit count for the call that just closed, from the refreshed status.
          const done = fresh?.calls.find(c => c.call === call)
          setJustClosed({ call, deposits: done?.deposits ?? prevDeposits })
        } else if (closedArea) {
          // An area call. The count is the last one the open incident reported
          // before it closed, plus the answer that closed it.
          setAreaClosed({ area: closedArea, deposits: prevDeposits + 1 })
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
  // The area this page is about: the open area call if there is one, else the
  // area just closed, else the one the link asked for while it opens.
  const activeArea = current?.area ?? areaClosed?.area ?? (area && !status?.current && !areaClosed ? area : null)
  const isBusiness = scope === 'business'
  const firstName = ownerName?.split(' ')[0] ?? null

  return (
    <div className="max-w-3xl mx-auto" style={{ paddingBottom: '64px' }}>

      {/* Header */}
      {activeArea ? (
        <>
          <p className="founding-eyebrow" style={{ fontFamily: MONO, fontSize: '11.5px', letterSpacing: '0.24em', textTransform: 'uppercase', color: GOLD, marginBottom: '18px' }}>
            A call on {activeArea}
          </p>
          <h1 style={{ fontFamily: SERIF, fontSize: 'clamp(34px,4.2vw,50px)', fontWeight: 400, lineHeight: 1.08, letterSpacing: '-0.015em', color: INK, marginBottom: '16px' }}>
            Where your archive is thin, in your own words.
          </h1>
          <p style={{ fontFamily: SERIF, fontSize: '19px', fontWeight: 400, lineHeight: 1.6, color: BODY, marginBottom: '34px', maxWidth: '560px' }}>
            One question to start, then a few that follow what you say. About ten minutes. Speak or type. When it closes, your map is read again.
          </p>
        </>
      ) : (
        <>
          <p className="founding-eyebrow" style={{ fontFamily: MONO, fontSize: '11.5px', letterSpacing: '0.24em', textTransform: 'uppercase', color: GOLD, marginBottom: '18px' }}>
            The Founding Sequence
          </p>
          <h1 style={{ fontFamily: SERIF, fontSize: 'clamp(34px,4.2vw,50px)', fontWeight: 400, lineHeight: 1.08, letterSpacing: '-0.015em', color: INK, marginBottom: '16px' }}>
            {isBusiness
              ? 'Three of the hardest calls you made running this business.'
              : 'Three of the hardest calls you ever made.'}
          </h1>
          <p style={{ fontFamily: SERIF, fontSize: '19px', fontWeight: 400, lineHeight: 1.6, color: BODY, marginBottom: '34px', maxWidth: '560px' }}>
            About ten minutes each. Speak or type. Stop whenever you like and come back; every answer is saved as you go.
          </p>
        </>
      )}

      {loadError && (
        <p role="alert" style={{ fontFamily: SERIF, fontSize: '1rem', color: ERR, marginBottom: '24px' }}>{loadError}</p>
      )}
      {area && !current && !areaClosed && submitErr && (
        <p role="alert" style={{ fontFamily: SERIF, fontSize: '1rem', color: ERR, marginBottom: '24px' }}>{submitErr}</p>
      )}
      {area && !current && !areaClosed && !submitErr && starting && (
        <p style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: '1.05rem', color: BODY, marginBottom: '24px' }}>Opening your call on {area}.</p>
      )}

      {/* Call cards: one hairline row, three cells */}
      {status && !activeArea && (
        <div className="founding-cards" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', borderTop: '1px solid var(--portal-rule)', borderBottom: '1px solid var(--portal-rule)', marginBottom: '36px' }}>
          {status.calls.map((c, i) => {
            const dot: React.CSSProperties = {
              width: '8px', height: '8px', borderRadius: '50%', display: 'inline-block', flexShrink: 0,
              background: c.state === 'done' ? 'var(--portal-btn)' : c.state === 'current' ? 'var(--portal-card)' : 'transparent',
              border:     `1px solid ${c.state === 'done' ? 'var(--portal-btn)' : c.state === 'current' ? GOLD : 'var(--portal-card-line)'}`,
            }
            return (
              <div
                key={c.call}
                className="founding-card"
                style={{
                  padding:     '20px 20px 20px 0',
                  marginRight: i < status.calls.length - 1 ? '20px' : 0,
                  borderRight: i < status.calls.length - 1 ? '1px solid var(--portal-rule)' : 'none',
                }}
              >
                <p style={{ fontFamily: MONO, fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: GOLD, marginBottom: '10px' }}>
                  Call {c.call}
                </p>
                <p style={{ fontFamily: SERIF, fontSize: '19px', fontWeight: 400, color: INK, marginBottom: '8px', lineHeight: 1.25 }}>
                  {c.title}
                </p>
                <p style={{ fontFamily: SERIF, fontSize: '14.5px', color: SECOND, lineHeight: 1.5, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span aria-hidden="true" style={dot} />
                  {c.state === 'done'
                    ? `In your archive · ${c.deposits} ${c.deposits === 1 ? 'deposit' : 'deposits'}`
                    : c.state === 'current'
                      ? `In progress · ${c.turns} answered`
                      : status.nextCall === c.call
                        ? 'Ready to begin'
                        : 'Not yet started'}
                </p>
              </div>
            )
          })}
        </div>
      )}

      {/* Sequence complete */}
      {status?.done && !current && !areaClosed && !area && (
        <section aria-live="polite" style={panel()}>
          <p className="founding-eyebrow" style={eyebrow()}>Complete</p>
          <h2 style={{ fontFamily: SERIF, fontSize: '30px', fontWeight: 300, color: INK, lineHeight: 1.2, marginBottom: '14px' }}>
            {firstName ? `${firstName}, the Founding Sequence is complete.` : 'The Founding Sequence is complete.'}
          </h2>
          <p style={{ fontFamily: SERIF, fontSize: '17.5px', fontWeight: 400, lineHeight: 1.65, color: BODY, marginBottom: '14px', maxWidth: '58ch' }}>
            We read every word ourselves. Within 48 hours we will be in touch to set up your first read: a short video call about what your archive holds, where it is still thin, and what comes next.
          </p>
          <p style={{ fontFamily: SERIF, fontSize: '17.5px', fontWeight: 400, lineHeight: 1.65, color: BODY, marginBottom: '26px', maxWidth: '58ch' }}>
            Your archive keeps growing from here. The dashboard has your next question whenever you are ready.
          </p>
          <Link href="/archive/dashboard" style={goldButton()}>Open your archive</Link>
          <ProofCard trial={trial} />
        </section>
      )}

      {/* A call just closed and the next one is available */}
      {justClosed && !current && !status?.done && (
        <section aria-live="polite" style={panel()}>
          <p className="founding-eyebrow" style={eyebrow()}>Saved</p>
          <h2 style={{ fontFamily: SERIF, fontSize: '30px', fontWeight: 300, color: INK, lineHeight: 1.2, marginBottom: '14px' }}>
            Call {justClosed.call} is in your archive.
          </h2>
          <p style={{ fontFamily: SERIF, fontSize: '17.5px', fontWeight: 400, lineHeight: 1.65, color: BODY, marginBottom: '26px', maxWidth: '58ch' }}>
            {justClosed.deposits} {justClosed.deposits === 1 ? 'deposit' : 'deposits'}, in your own words. The next call is ready when you are. Now, or another day; it will be here.
          </p>
          {status && canShowProof(status) && <ProofCard trial={trial} below />}
          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
            <button onClick={startNext} disabled={starting} style={goldButton(starting)}>
              {starting ? 'Opening' : `Begin call ${status?.nextCall ?? ''}`}
            </button>
            <Link href="/archive/dashboard" style={quietLink()}>Come back later</Link>
          </div>
        </section>
      )}

      {/* Nothing open yet: begin the next call */}
      {status && !current && !status.done && !justClosed && !areaClosed && !area && (
        <section style={panel()}>
          <p className="founding-eyebrow" style={eyebrow()}>{status.completed === 0 ? 'Begin' : 'Continue'}</p>
          <h2 style={{ fontFamily: SERIF, fontSize: '30px', fontWeight: 300, color: INK, lineHeight: 1.2, marginBottom: '14px' }}>
            Call {status.nextCall}. {status.calls.find(c => c.call === status.nextCall)?.title}.
          </h2>
          <p style={{ fontFamily: SERIF, fontSize: '17.5px', fontWeight: 400, lineHeight: 1.65, color: BODY, marginBottom: '26px', maxWidth: '58ch' }}>
            One question to start, then a few more that follow what you say. Nothing you say has to be important. The ordinary details are usually the ones that show how you decide.
          </p>
          {canShowProof(status) && <ProofCard trial={trial} below />}
          {submitErr && <p role="alert" style={{ fontFamily: SERIF, fontSize: '1rem', color: ERR, marginBottom: '14px' }}>{submitErr}</p>}
          <button onClick={startNext} disabled={starting} style={goldButton(starting)}>
            {starting ? 'Opening' : `Begin call ${status.nextCall}`}
          </button>
        </section>
      )}

      {/* An area call just closed */}
      {areaClosed && !current && (
        <section aria-live="polite" style={panel()}>
          <p className="founding-eyebrow" style={eyebrow()}>Saved</p>
          <h2 style={{ fontFamily: SERIF, fontSize: '30px', fontWeight: 300, color: INK, lineHeight: 1.2, marginBottom: '14px' }}>
            Your call on {areaClosed.area} is in your archive.
          </h2>
          <p style={{ fontFamily: SERIF, fontSize: '17.5px', fontWeight: 400, lineHeight: 1.65, color: BODY, marginBottom: '26px', maxWidth: '58ch' }}>
            {areaClosed.deposits} {areaClosed.deposits === 1 ? 'deposit' : 'deposits'}, in your own words. Your map is being read again now; it takes about twenty minutes, and the dashboard shows the new reading when it is done.
          </p>
          <Link href="/archive/dashboard" style={goldButton()}>Back to your archive</Link>
        </section>
      )}

      {/* The interview */}
      {current && (
        <section style={panel()}>
          {!current.isFounding && !current.area && (
            <p style={{ fontFamily: SERIF, fontSize: '1rem', fontStyle: 'italic', color: BODY, marginBottom: '18px', lineHeight: 1.7 }}>
              You have an interview open from your dashboard. Finish it here; the Founding Sequence picks up right after.
            </p>
          )}
          {current.area && area && current.area !== area && (
            <p style={{ fontFamily: SERIF, fontSize: '1rem', fontStyle: 'italic', color: BODY, marginBottom: '18px', lineHeight: 1.7 }}>
              You already have a call open on {current.area}. Finish it first; one call at a time.
            </p>
          )}
          {current.isFounding && area && (
            <p style={{ fontFamily: SERIF, fontSize: '1rem', fontStyle: 'italic', color: BODY, marginBottom: '18px', lineHeight: 1.7 }}>
              A founding call is still open. Finish it first; the call on {area} is a click away on your map afterward.
            </p>
          )}
          <p className="founding-eyebrow" style={eyebrow()}>
            {current.isFounding && current.call ? `Call ${current.call} · ` : ''}{current.area ? `${current.area} · ` : ''}{current.label}
          </p>

          <div aria-live="polite" style={{ borderLeft: `3px solid ${GOLD}`, padding: '16px 22px', margin: '0 0 22px', background: 'var(--portal-tint)' }}>
            <p style={{ fontFamily: SERIF, fontSize: 'clamp(20px,2.4vw,24px)', fontStyle: 'italic', fontWeight: 400, color: INK, lineHeight: 1.5, margin: 0 }}>
              {current.question ?? 'Loading the next question.'}
            </p>
          </div>

          {note === 'reprobe' && (
            <p style={{ fontFamily: SERIF, fontSize: '1rem', fontStyle: 'italic', color: GOLD, marginBottom: '14px', lineHeight: 1.7 }}>
              A little more, if you can. What did you actually do, and why?
            </p>
          )}
          {note === 'saved' && (
            <p style={{ fontFamily: SERIF, fontSize: '1rem', fontStyle: 'italic', color: GOLD, marginBottom: '14px', lineHeight: 1.7 }}>
              Saved to your archive.
            </p>
          )}

          <label htmlFor="founding-answer" style={{ display: 'block', fontFamily: MONO, fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: LABEL, marginBottom: '8px' }}>
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
              background:   'var(--portal-card)',
              border:       '1px solid var(--portal-card-line)',
              borderRadius: '2px',
              padding:      '14px 18px',
              fontFamily:   SERIF,
              fontSize:     '18px',
              color:        INK,
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

          {submitErr && <p role="alert" style={{ fontFamily: SERIF, fontSize: '1rem', color: ERR, margin: '12px 0 0' }}>{submitErr}</p>}

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '18px', flexWrap: 'wrap' }}>
            <button
              onClick={submitAnswer}
              disabled={submitting || answer.trim().length < 2}
              style={goldButton(submitting || answer.trim().length < 2)}
            >
              {submitting ? 'Saving' : 'Save and continue'}
            </button>
            <span style={{ fontFamily: SERIF, fontSize: '14.5px', color: SECOND }}>
              {current.turns} answered so far
            </span>
          </div>
        </section>
      )}

      <style>{`
        @media (max-width: 720px) {
          .founding-cards { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 720px) {
          .founding-card { margin-right: 0 !important; border-right: none !important; border-bottom: 1px solid var(--portal-rule); padding-left: 0; }
          .founding-card:last-child { border-bottom: none; }
        }
        .founding-eyebrow { display: flex; align-items: center; gap: 12px; }
        .founding-eyebrow::before { content: ''; display: block; width: 22px; height: 1px; background: var(--portal-gold-line); flex-shrink: 0; }
        .founding-eyebrow-dim::before { background: var(--invert-rule); }
        .founding-btn:focus-visible { outline: 2px solid ${GOLD}; outline-offset: 3px; }
        textarea#founding-answer:focus { border-color: ${GOLD}; outline: none; }
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

// After call 1 the last turn's training pair can still be landing under
// after() when the owner clicks (recon C3), so a first no_pairs answer waits
// five seconds and asks once more before saying so.
const PROOF_RETRY_MS = 5000

function ProofCard({ trial = false, below = false }: { trial?: boolean; below?: boolean }) {
  const [state, setState] = useState<'idle' | 'loading' | 'waiting' | 'done' | 'error'>('idle')
  const [proof, setProof] = useState<Proof | null>(null)
  const [error, setError] = useState('')

  async function ask(): Promise<Proof> {
    const res = await fetch('/api/archive/founding/proof', { method: 'POST' })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data?.error || 'Could not ask your archive right now.')
    return data as Proof
  }

  async function run() {
    setState('loading')
    setError('')
    try {
      let result = await ask()
      if (!result.ready && result.reason === 'no_pairs') {
        setState('waiting')
        await new Promise(resolve => setTimeout(resolve, PROOF_RETRY_MS))
        result = await ask()
      }
      setProof(result)
      setState('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not ask your archive right now.')
      setState('error')
    }
  }

  const q = (text: string) => (
    <p style={{ fontFamily: SERIF, fontSize: '19px', fontStyle: 'italic', fontWeight: 300, color: 'var(--invert-fg)', lineHeight: 1.5, margin: '0 0 12px' }}>
      {text}
    </p>
  )

  return (
    <div style={{ marginTop: below ? '8px' : '32px', marginBottom: below ? '28px' : 0, paddingTop: '26px', borderTop: '1px solid var(--portal-rule)' }}>
      <p className="founding-eyebrow" style={eyebrow()}>What it holds</p>
      <p style={{ fontFamily: SERIF, fontSize: '17.5px', fontWeight: 400, lineHeight: 1.65, color: BODY, marginBottom: '20px', maxWidth: '58ch' }}>
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
      {state === 'waiting' && (
        <p aria-live="polite" style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: '1rem', color: BODY }}>
          One moment.
        </p>
      )}
      {state === 'error' && (
        <div>
          <p role="alert" style={{ fontFamily: SERIF, fontSize: '1rem', color: ERR, margin: '0 0 10px', lineHeight: 1.6 }}>{error}</p>
          <button type="button" onClick={run} className="founding-btn" style={quietButton()}>Try again</button>
        </div>
      )}

      {state === 'done' && proof && !proof.ready && (
        <p style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: '1rem', color: BODY, lineHeight: 1.7 }}>
          Your deposits are still being scored. Give it a few minutes and come back.
        </p>
      )}

      {/* The inverted block: the archive speaks. Every color inside is an --invert-* value. */}
      {state === 'done' && proof && proof.ready && (
        <div style={{ display: 'grid', background: 'var(--invert-bg)', color: 'var(--invert-fg)' }} aria-live="polite">
          {proof.grounded && (
            <div style={{ padding: '26px 28px 28px' }}>
              <p className="founding-eyebrow" style={{ ...eyebrow(), color: 'var(--invert-gold)', marginBottom: '14px' }}>Checked against your archive</p>
              {q(proof.grounded.question)}
              <p style={{ fontFamily: SERIF, fontSize: '17px', fontWeight: 400, color: 'var(--invert-fg)', lineHeight: 1.65, margin: '0 0 18px', whiteSpace: 'pre-wrap', maxWidth: '60ch' }}>
                {proof.grounded.answer}
              </p>
              <p style={{ fontFamily: MONO, fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--invert-dim)', marginBottom: '8px' }}>
                From your archive, in your words
              </p>
              <p style={{ fontFamily: SERIF, fontSize: '16.5px', fontStyle: 'italic', fontWeight: 400, color: 'var(--invert-body)', lineHeight: 1.65, margin: 0, whiteSpace: 'pre-wrap', maxWidth: '60ch' }}>
                {proof.grounded.deposit}
              </p>
            </div>
          )}
          {proof.refusal && (
            <div style={{ padding: '24px 28px 28px', borderTop: proof.grounded ? '1px solid var(--invert-rule)' : 'none' }}>
              <p className="founding-eyebrow founding-eyebrow-dim" style={{ ...eyebrow(), color: 'var(--invert-dim)', marginBottom: '14px' }}>Where the archive is silent, it says so</p>
              {q(proof.refusal.question)}
              <p style={{ fontFamily: SERIF, fontSize: '17px', fontWeight: 400, color: 'var(--invert-body)', lineHeight: 1.65, margin: 0, whiteSpace: 'pre-wrap', maxWidth: '60ch' }}>
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

      {/* Trial only (skeleton section 6). The button to Checkout arrives in
          slice C; until then this is the sentence alone. */}
      {trial && (
        <p style={{ fontFamily: SERIF, fontSize: '17.5px', fontWeight: 400, lineHeight: 1.65, color: BODY, margin: '22px 0 0' }}>
          Found your archive to keep going.
        </p>
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
          <span aria-hidden="true" style={{ width: '12px', height: '12px', borderRadius: '50%', background: ERR, display: 'inline-block' }} />
          <span style={{ fontFamily: MONO, fontSize: '14px', color: INK, letterSpacing: '0.05em', fontVariantNumeric: 'tabular-nums' }}>{mm}:{ss}</span>
          <span style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: '1rem', color: BODY }}>Recording. Speak naturally. Up to five minutes.</span>
          <button type="button" onClick={stop} className="founding-btn" style={goldButton()}>Stop</button>
        </div>
      )}
      {state === 'processing' && (
        <p style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: '1rem', color: BODY, margin: '8px 0 0' }}>Transcribing. Your words will appear in the box above; read them over before you save.</p>
      )}
      {state === 'error' && (
        <div style={{ marginTop: '8px' }}>
          <p role="alert" style={{ fontFamily: SERIF, fontSize: '1rem', color: ERR, margin: '0 0 10px', lineHeight: 1.6 }}>{error}</p>
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
    background:   'var(--portal-card)',
    border:       '1px solid var(--portal-card-line)',
    borderTop:    '3px solid var(--portal-btn)',
    boxShadow:    'var(--portal-lift)',
    padding:      'clamp(1.6rem,4vw,2.25rem) clamp(1.35rem,4vw,2.25rem)',
    borderRadius: '2px',
    marginBottom: '24px',
  }
}

function eyebrow(): React.CSSProperties {
  return {
    fontFamily:    MONO,
    fontSize:      '11.5px',
    letterSpacing: '0.24em',
    textTransform: 'uppercase',
    color:         GOLD,
    marginBottom:  '18px',
  }
}

function goldButton(disabled = false): React.CSSProperties {
  return {
    fontFamily:    MONO,
    fontSize:      '12px',
    letterSpacing: '0.16em',
    textTransform: 'uppercase',
    color:         'var(--portal-btn-label)',
    background:    'var(--portal-btn)',
    border:        'none',
    borderRadius:  '2px',
    padding:       '0 26px',
    minHeight:     '48px',
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
    fontSize:      '11.5px',
    letterSpacing: '0.16em',
    textTransform: 'uppercase',
    color:         GOLD,
    background:    'var(--portal-card)',
    border:        '1px solid var(--portal-gold-line)',
    borderRadius:  '2px',
    padding:       '0 18px',
    minHeight:     '44px',
    cursor:        'pointer',
    display:       'inline-flex',
    alignItems:    'center',
  }
}

function quietLink(): React.CSSProperties {
  return {
    fontFamily:          SERIF,
    fontSize:            '16.5px',
    color:               SECOND,
    textDecoration:      'underline',
    textDecorationColor: 'var(--portal-card-line)',
    textUnderlineOffset: '4px',
    minHeight:           '44px',
    display:             'inline-flex',
    alignItems:          'center',
  }
}
