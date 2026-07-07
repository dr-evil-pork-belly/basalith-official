'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

// ── Palette (matches the marketing demo surface) ───────────────────────────────
const C = {
  void:       '#070707',
  gold:       '#C4A24A',
  goldBright: '#D9C4A3',
  text:       '#F0EDE6',
  muted:      '#9DA3A8',
  dim:        '#5C6166',
  ghost:      '#3A3F44',
  captured:   '#7FA65C',
}
const SERIF = 'var(--font-cormorant, "Cormorant Garamond", Georgia, serif)'
const MONO  = 'var(--font-space-mono, "Space Mono", "Courier New", monospace)'

// ── Types the client reads. The rest of the session is an opaque JSON blob that
// is round-tripped to /turn verbatim. This IS the buffer: it lives only here, in
// browser memory, for the length of the meeting. ──────────────────────────────
type DimStatus = 'unelicited' | 'substantive' | 'not_a_factor'
type DimName = 'stake' | 'read' | 'calibration'
type Dimensions = Record<DimName, DimStatus>

interface DemoSession {
  status: 'open' | 'complete' | 'abandoned'
  state: { dimensions: Dimensions }
  [k: string]: unknown
}
interface Probe { probeType: string; question: string }

// ── Human labels ───────────────────────────────────────────────────────────────
const PROBE_LABEL: Record<string, string> = {
  SEED: 'Opening', TIMELINE: 'Timeline', CUE: 'Cue', OPTION: 'Options',
  BASIS: 'Basis', BOUNDARY: 'Boundary', ERROR: 'Failure mode', TRADEOFF: 'Tradeoff',
  ANALOGUE: 'Precedent', GOAL: 'Intent', STAKE: 'Stake', READ: 'Read', CALIBRATION: 'Calibration',
}
const DIM_ORDER: DimName[] = ['stake', 'read', 'calibration']
const DIM_LABEL: Record<DimName, string> = { stake: 'Stake', read: 'Read', calibration: 'Calibration' }
const DIM_STATUS_LABEL: Record<DimStatus, string> = {
  unelicited: 'Open', substantive: 'Captured', not_a_factor: 'Not a factor',
}

type Step = 'intro' | 'interview' | 'complete'
type Turn = 'idle' | 'thinking' | 'error'

const EMPTY_DIMS: Dimensions = { stake: 'unelicited', read: 'unelicited', calibration: 'unelicited' }

export default function IncidentDemoClient() {
  const [step, setStep] = useState<Step>('intro')
  const [name, setName] = useState('')

  // The buffer: the transient session, held only in this component's state.
  const [session, setSession] = useState<DemoSession | null>(null)
  const [probe, setProbe] = useState<Probe | null>(null)
  const [dimensions, setDimensions] = useState<Dimensions>(EMPTY_DIMS)
  const [answer, setAnswer] = useState('')
  const [turnState, setTurnState] = useState<Turn>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [probeCount, setProbeCount] = useState(0)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const firstName = name.trim().split(/\s+/)[0] || 'them'

  async function beginDemo() {
    if (!name.trim() || turnState === 'thinking') return
    setTurnState('thinking')
    setErrorMsg('')
    try {
      const res = await fetch('/api/archivist/demo/incident/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok || !data?.session || !data?.probe) {
        setErrorMsg((data && data.error) || 'Could not start the capture. Please try again.')
        setTurnState('error')
        return
      }
      setSession(data.session)
      setProbe(data.probe)
      setDimensions(data.session.state?.dimensions ?? EMPTY_DIMS)
      setProbeCount(1)
      setStep('interview')
      setTurnState('idle')
    } catch {
      setErrorMsg('Could not start the capture. Please try again.')
      setTurnState('error')
    }
  }

  async function submitAnswer() {
    if (!session || !answer.trim() || turnState === 'thinking') return
    setTurnState('thinking')
    setErrorMsg('')
    try {
      const res = await fetch('/api/archivist/demo/incident/turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session, answer: answer.trim() }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok || !data?.session) {
        setErrorMsg((data && data.error) || 'That answer did not go through. Please try again.')
        setTurnState('error')
        return
      }
      setSession(data.session)
      setDimensions(data.dimensions ?? data.session.state?.dimensions ?? EMPTY_DIMS)
      setAnswer('')
      if (data.incidentComplete || !data.nextProbe) {
        setProbe(null)
        setStep('complete')
      } else {
        setProbe(data.nextProbe)
        setProbeCount(c => c + 1)
      }
      setTurnState('idle')
    } catch {
      setErrorMsg('That answer did not go through. Please try again.')
      setTurnState('error')
    }
  }

  function restart() {
    setStep('intro')
    setName('')
    setSession(null)
    setProbe(null)
    setDimensions(EMPTY_DIMS)
    setAnswer('')
    setTurnState('idle')
    setErrorMsg('')
    setProbeCount(0)
  }

  useEffect(() => {
    if (step === 'interview' && turnState === 'idle') {
      const t = setTimeout(() => textareaRef.current?.focus(), 120)
      return () => clearTimeout(t)
    }
  }, [step, turnState, probe])

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 60, overflowY: 'auto',
        background: `radial-gradient(120% 90% at 50% 0%, #121110 0%, ${C.void} 60%)`,
        color: C.text,
      }}
    >
      <style>{`
        @keyframes idFadeUp { from { opacity:0; transform:translateY(14px) } to { opacity:1; transform:translateY(0) } }
        @keyframes idBlink  { 0%,100%{opacity:1} 50%{opacity:0} }
        .id-fade-up { animation: idFadeUp 0.7s cubic-bezier(0.16,1,0.3,1) both; }
      `}</style>

      <Link
        href="/archivist/dashboard"
        style={{
          position: 'fixed', top: '20px', right: '24px', zIndex: 70,
          fontFamily: MONO, fontSize: '0.6rem', letterSpacing: '0.24em',
          textTransform: 'uppercase', color: C.ghost, textDecoration: 'none',
        }}
      >
        Exit
      </Link>

      {/* Persistent ephemerality note */}
      <div
        style={{
          position: 'fixed', top: '20px', left: '24px', zIndex: 70,
          fontFamily: MONO, fontSize: '0.55rem', letterSpacing: '0.2em',
          textTransform: 'uppercase', color: C.dim,
        }}
      >
        Live capture · held in this session only
      </div>

      {/* ── INTRO ── */}
      {step === 'intro' && (
        <Stage>
          <Eyebrow>Incident Capture</Eyebrow>
          <h1 className="id-fade-up" style={{ fontFamily: SERIF, fontWeight: 300, fontSize: 'clamp(2.2rem,5vw,3.6rem)', color: C.text, lineHeight: 1.1, marginBottom: '0.6rem' }}>
            One real decision, in depth
          </h1>
          <p className="id-fade-up" style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 'clamp(1rem,2vw,1.25rem)', color: C.muted, lineHeight: 1.7, maxWidth: '560px', marginBottom: '2.75rem' }}>
            Walk the founder through a single decision they once made. The interview
            follows the reasoning, then checks three dimensions: stake, read, and
            calibration. Nothing here is saved to an archive.
          </p>

          <div style={{ width: '100%', maxWidth: '440px' }}>
            <Field
              label="Founder first name"
              value={name}
              onChange={setName}
              placeholder="Their first name"
              onEnter={beginDemo}
            />
          </div>

          {errorMsg && <SoftError>{errorMsg}</SoftError>}

          <div style={{ marginTop: '3rem' }}>
            <PrimaryButton onClick={beginDemo} disabled={!name.trim() || turnState === 'thinking'}>
              {turnState === 'thinking' ? 'Starting' : 'Begin Capture'}
            </PrimaryButton>
          </div>
        </Stage>
      )}

      {/* ── INTERVIEW ── */}
      {step === 'interview' && probe && (
        <Stage>
          <div style={{ width: '100%', maxWidth: '720px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
            <span style={{ fontFamily: MONO, fontSize: '0.6rem', letterSpacing: '0.24em', textTransform: 'uppercase', color: 'rgba(196,162,74,0.75)' }}>
              {PROBE_LABEL[probe.probeType] ?? probe.probeType}
            </span>
            <span style={{ fontFamily: MONO, fontSize: '0.6rem', letterSpacing: '0.24em', textTransform: 'uppercase', color: C.dim }}>
              Probe {probeCount}
            </span>
          </div>

          <p key={probeCount} className="id-fade-up" style={{ fontFamily: SERIF, fontWeight: 300, fontSize: 'clamp(1.7rem,3.4vw,2.5rem)', color: C.text, lineHeight: 1.3, maxWidth: '760px', marginBottom: '2rem' }}>
            {probe.question}
          </p>

          <textarea
            ref={textareaRef}
            value={answer}
            onChange={e => setAnswer(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); submitAnswer() } }}
            placeholder={`Type ${firstName}'s answer as they speak...`}
            rows={5}
            disabled={turnState === 'thinking'}
            style={{
              width: '100%', maxWidth: '760px',
              background: 'rgba(240,237,230,0.02)',
              border: '1px solid rgba(196,162,74,0.18)', borderRadius: '3px',
              padding: '1.1rem 1.25rem', fontFamily: SERIF, fontSize: '1.15rem',
              fontWeight: 300, color: C.text, lineHeight: 1.7, outline: 'none',
              resize: 'none', opacity: turnState === 'thinking' ? 0.5 : 1,
            }}
          />

          <DimensionTray dimensions={dimensions} />

          {errorMsg && <SoftError>{errorMsg}</SoftError>}

          <div style={{ marginTop: '2.25rem', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <PrimaryButton onClick={submitAnswer} disabled={!answer.trim() || turnState === 'thinking'}>
              {turnState === 'thinking' ? 'Holding the thread' : 'Continue'}
            </PrimaryButton>
            {turnState === 'thinking' && (
              <span style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: '1rem', color: C.muted }}>
                Reading the answer
                <span style={{ animation: 'idBlink 1s step-end infinite' }}>...</span>
              </span>
            )}
          </div>
        </Stage>
      )}

      {/* ── COMPLETE ── */}
      {step === 'complete' && (
        <Stage>
          <Eyebrow>Capture Complete</Eyebrow>
          <h1 className="id-fade-up" style={{ fontFamily: SERIF, fontWeight: 300, fontSize: 'clamp(2rem,4.5vw,3.2rem)', color: C.text, lineHeight: 1.15, marginBottom: '1.5rem' }}>
            One decision, fully walked
          </h1>

          <DimensionTray dimensions={dimensions} large />

          <p className="id-fade-up" style={{ fontFamily: SERIF, fontWeight: 300, fontSize: 'clamp(1.1rem,2.4vw,1.5rem)', color: C.muted, lineHeight: 1.7, maxWidth: '620px', margin: '2.5rem 0 1rem' }}>
            That is one decision, followed all the way down. A full archive builds
            from many of these, in the founder{"'"}s own words.
          </p>
          <p className="id-fade-up" style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 'clamp(1rem,2.2vw,1.3rem)', color: C.goldBright, lineHeight: 1.6, maxWidth: '620px', marginBottom: '3rem' }}>
            This capture lived only in this session. Nothing was saved to an archive.
          </p>

          <button
            onClick={restart}
            style={{
              background: 'transparent', border: `1px solid rgba(196,162,74,0.3)`,
              cursor: 'pointer', fontFamily: MONO, fontSize: '0.62rem',
              letterSpacing: '0.26em', textTransform: 'uppercase', color: C.muted,
              padding: '1rem 2rem', borderRadius: '2px',
            }}
          >
            Run Another Capture
          </button>
        </Stage>
      )}
    </div>
  )
}

// ── Dimension tray ─────────────────────────────────────────────────────────────
function DimensionTray({ dimensions, large }: { dimensions: Dimensions; large?: boolean }) {
  return (
    <div style={{ width: '100%', maxWidth: '760px', marginTop: large ? '1.5rem' : '1.75rem', display: 'flex', gap: large ? '1.25rem' : '0.75rem', flexWrap: 'wrap', justifyContent: large ? 'center' : 'flex-start' }}>
      {DIM_ORDER.map(d => {
        const status = dimensions[d]
        const on = status !== 'unelicited'
        const color = status === 'substantive' ? C.captured : status === 'not_a_factor' ? C.muted : C.dim
        return (
          <div
            key={d}
            style={{
              display: 'flex', flexDirection: 'column', gap: '0.3rem',
              padding: large ? '0.9rem 1.4rem' : '0.6rem 1rem',
              border: `1px solid ${on ? 'rgba(196,162,74,0.3)' : 'rgba(240,237,230,0.07)'}`,
              borderRadius: '3px', minWidth: large ? '150px' : '110px',
            }}
          >
            <span style={{ fontFamily: MONO, fontSize: '0.56rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: C.dim }}>
              {DIM_LABEL[d]}
            </span>
            <span style={{ fontFamily: SERIF, fontSize: large ? '1.15rem' : '0.95rem', color }}>
              {DIM_STATUS_LABEL[status]}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ── Shared pieces ──────────────────────────────────────────────────────────────
function Stage({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ position: 'relative', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 'clamp(2rem,6vw,5rem) 1.5rem', maxWidth: '900px', margin: '0 auto' }}>
      {children}
    </div>
  )
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontFamily: MONO, fontSize: '0.62rem', letterSpacing: '0.4em', textTransform: 'uppercase', color: 'rgba(196,162,74,0.7)', marginBottom: '1.5rem' }}>
      {children}
    </p>
  )
}

function SoftError({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: '1rem', color: '#C98B8B', marginTop: '1.25rem', maxWidth: '520px' }}>
      {children}
    </p>
  )
}

function Field({ label, value, onChange, placeholder, onEnter }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; onEnter?: () => void
}) {
  return (
    <label style={{ display: 'block' }}>
      <span style={{ display: 'block', fontFamily: MONO, fontSize: '0.56rem', letterSpacing: '0.24em', textTransform: 'uppercase', color: C.dim, marginBottom: '0.6rem' }}>
        {label}
      </span>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && onEnter) { e.preventDefault(); onEnter() } }}
        placeholder={placeholder}
        style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(196,162,74,0.3)', color: C.text, fontFamily: SERIF, fontSize: '1.35rem', fontWeight: 300, padding: '0.4rem 0', outline: 'none' }}
      />
    </label>
  )
}

function PrimaryButton({ children, onClick, disabled }: {
  children: React.ReactNode; onClick: () => void; disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{ fontFamily: MONO, fontSize: '0.68rem', letterSpacing: '0.3em', textTransform: 'uppercase', color: C.void, background: C.gold, border: 'none', padding: '1.05rem 2.5rem', cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.35 : 1, fontWeight: 700, borderRadius: '2px', transition: 'opacity 0.2s' }}
    >
      {children}
    </button>
  )
}
