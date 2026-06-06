'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import {
  pickDemoPrompts,
  scoreAnswer,
  dimensionLabel,
  type DemoPrompt,
} from '@/lib/conversationalPrompts'

// ── Palette ──────────────────────────────────────────────────────────────────
const C = {
  void:       '#070707',
  gold:       '#C4A24A',
  goldBright: '#D9C4A3',
  text:       '#F0EDE6',
  muted:      '#9DA3A8',
  dim:        '#5C6166',
  ghost:      '#3A3F44',
}
const SERIF = 'var(--font-cormorant, "Cormorant Garamond", Georgia, serif)'
const MONO  = 'var(--font-space-mono, "Space Mono", "Courier New", monospace)'

const DEMO_QUESTION  = 'What matters most to you, and why?'
const APPLY_URL      = 'https://basalith.ai/apply'
const TOTAL_Q        = 5

type EntityState = 'idle' | 'loading' | 'streaming' | 'done' | 'error'
type PaperState  = 'idle' | 'sending' | 'sent' | 'error'

export default function DemoClient() {
  // ── Step machine ───────────────────────────────────────────────────────────
  // 1: intro · 2-6: five questions · 7: echo layer · 8: entity response · 9: close
  const [step, setStep] = useState(1)

  // ── Prospect + answers ──────────────────────────────────────────────────────
  const [name,    setName]    = useState('')
  const [focus,   setFocus]   = useState('')
  const [prompts, setPrompts] = useState<DemoPrompt[]>([])
  const [qIndex,  setQIndex]  = useState(0)
  const [answers, setAnswers] = useState<string[]>(['', '', '', '', ''])

  // ── Entity response (step 8) ────────────────────────────────────────────────
  const [entityReply, setEntityReply] = useState('')
  const [typed,       setTyped]       = useState('')
  const [entityState, setEntityState] = useState<EntityState>('idle')

  // ── White paper (step 9) ────────────────────────────────────────────────────
  const [email,      setEmail]      = useState('')
  const [paperState, setPaperState] = useState<PaperState>('idle')
  const [showPaper,  setShowPaper]  = useState(false)
  const [paperError, setPaperError] = useState('')

  // ── Echo layer pacing (step 7) ──────────────────────────────────────────────
  const [echoReady, setEchoReady] = useState(false)

  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const firstName = name.trim().split(/\s+/)[0] || 'They'

  // ── Handlers ────────────────────────────────────────────────────────────────
  function beginDemo() {
    if (!name.trim() || !focus.trim()) return
    setPrompts(pickDemoPrompts(TOTAL_Q))
    setAnswers(['', '', '', '', ''])
    setQIndex(0)
    setStep(2)
  }

  function setAnswer(value: string) {
    setAnswers(prev => {
      const next = [...prev]
      next[qIndex] = value
      return next
    })
  }

  function nextQuestion() {
    if (!(answers[qIndex] ?? '').trim()) return
    if (qIndex < TOTAL_Q - 1) {
      setQIndex(qIndex + 1)
    } else {
      setStep(7)
    }
  }

  async function callEntity() {
    setEntityState('loading')
    try {
      const res = await fetch('/api/demo/entity', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ name, deposits: answers, question: DEMO_QUESTION }),
      })
      const data = await res.json().catch(() => null)
      const reply = data && typeof data.reply === 'string' ? data.reply.trim() : ''
      if (!res.ok || !reply) {
        setEntityState('error')
        return
      }
      setEntityReply(reply)
      setEntityState('streaming')
    } catch {
      setEntityState('error')
    }
  }

  async function sendPaper() {
    const trimmed = email.trim()
    if (!trimmed || paperState === 'sending') return
    setPaperState('sending')
    setPaperError('')
    try {
      const res = await fetch('/api/demo/whitepaper', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email: trimmed }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        setPaperError((data && data.error) || 'Something went wrong. Please try again.')
        setPaperState('error')
        return
      }
      setPaperState('sent')
    } catch {
      setPaperError('Something went wrong. Please try again.')
      setPaperState('error')
    }
  }

  function restart() {
    setStep(1)
    setName('')
    setFocus('')
    setPrompts([])
    setQIndex(0)
    setAnswers(['', '', '', '', ''])
    setEntityReply('')
    setTyped('')
    setEntityState('idle')
    setEmail('')
    setPaperState('idle')
    setShowPaper(false)
    setPaperError('')
    setEchoReady(false)
  }

  // ── Effects ─────────────────────────────────────────────────────────────────

  // Autofocus the answer field as each question appears.
  useEffect(() => {
    if (step >= 2 && step <= 6) {
      const t = setTimeout(() => textareaRef.current?.focus(), 120)
      return () => clearTimeout(t)
    }
  }, [step, qIndex])

  // Echo layer: hold the moment, then quietly reveal the continue control.
  useEffect(() => {
    if (step !== 7) return
    setEchoReady(false)
    const t = setTimeout(() => setEchoReady(true), 2800)
    return () => clearTimeout(t)
  }, [step])

  // Step 8: form the entity response on entry.
  useEffect(() => {
    if (step === 8 && entityState === 'idle') callEntity()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step])

  // Typewriter: reveal the entity response character by character.
  useEffect(() => {
    if (entityState !== 'streaming' || !entityReply) return
    setTyped('')
    let i = 0
    const id = setInterval(() => {
      i++
      setTyped(entityReply.slice(0, i))
      if (i >= entityReply.length) {
        clearInterval(id)
        setEntityState('done')
      }
    }, 18)
    return () => clearInterval(id)
  }, [entityState, entityReply])

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        position:   'fixed',
        inset:      0,
        zIndex:     60,
        overflowY:  'auto',
        background: `radial-gradient(120% 90% at 50% 0%, #121110 0%, ${C.void} 60%)`,
        color:      C.text,
      }}
    >
      <style>{`
        @keyframes demoFadeUp { from { opacity:0; transform:translateY(14px) } to { opacity:1; transform:translateY(0) } }
        @keyframes demoFade   { from { opacity:0 } to { opacity:1 } }
        @keyframes demoBlink  { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes demoScan   { 0%{transform:translateY(-100%);opacity:0} 12%{opacity:0.8} 88%{opacity:0.8} 100%{transform:translateY(2400%);opacity:0} }
        @keyframes demoGlow   { 0%,100%{opacity:0.45} 50%{opacity:1} }
        .demo-fade-up { animation: demoFadeUp 0.9s cubic-bezier(0.16,1,0.3,1) both; }
        .demo-fade    { animation: demoFade 1.2s ease both; }
      `}</style>

      {/* Exit affordance */}
      <Link
        href="/archivist/dashboard"
        style={{
          position:      'fixed',
          top:           '20px',
          right:         '24px',
          zIndex:        70,
          fontFamily:    MONO,
          fontSize:      '0.6rem',
          letterSpacing: '0.24em',
          textTransform: 'uppercase',
          color:         C.ghost,
          textDecoration:'none',
        }}
      >
        Exit
      </Link>

      {/* ── STEP 1 — Prospect intro ── */}
      {step === 1 && (
        <Stage>
          <Eyebrow>Live Demonstration</Eyebrow>
          <h1 className="demo-fade-up" style={{ fontFamily: SERIF, fontWeight: 300, fontSize: 'clamp(2.2rem,5vw,3.6rem)', color: C.text, lineHeight: 1.1, marginBottom: '0.6rem' }}>
            Begin the experience
          </h1>
          <p className="demo-fade-up" style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 'clamp(1rem,2vw,1.25rem)', color: C.muted, lineHeight: 1.7, maxWidth: '540px', marginBottom: '3rem' }}>
            In the next fifteen minutes, five ordinary questions become the
            beginning of a cognitive reference model.
          </p>

          <div style={{ width: '100%', maxWidth: '440px', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <Field
              label="Prospect first name"
              value={name}
              onChange={setName}
              placeholder="Their first name"
              onEnter={() => focus.trim() && name.trim() && beginDemo()}
            />
            <Field
              label="Their life focus, in one word"
              value={focus}
              onChange={setFocus}
              placeholder="family · business · faith"
              onEnter={() => name.trim() && focus.trim() && beginDemo()}
            />
          </div>

          <div style={{ marginTop: '3.5rem' }}>
            <PrimaryButton onClick={beginDemo} disabled={!name.trim() || !focus.trim()}>
              Begin Demo
            </PrimaryButton>
          </div>
        </Stage>
      )}

      {/* ── STEPS 2-6 — Five questions, one at a time ── */}
      {step >= 2 && step <= 6 && prompts[qIndex] && (
        <Stage>
          {/* Progress + focus tag */}
          <div style={{ width: '100%', maxWidth: '620px', marginBottom: '2.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.9rem' }}>
              <span style={{ fontFamily: MONO, fontSize: '0.6rem', letterSpacing: '0.24em', textTransform: 'uppercase', color: C.dim }}>
                Question {qIndex + 1} of {TOTAL_Q}
              </span>
              <span style={{ fontFamily: MONO, fontSize: '0.6rem', letterSpacing: '0.24em', textTransform: 'uppercase', color: 'rgba(196,162,74,0.7)' }}>
                Focus · {focus.trim()}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              {Array.from({ length: TOTAL_Q }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    flex:         1,
                    height:       '3px',
                    borderRadius: '2px',
                    background:   i < qIndex ? C.gold : 'rgba(240,237,230,0.08)',
                    boxShadow:    i === qIndex ? '0 0 8px rgba(196,162,74,0.6)' : 'none',
                    animation:    i === qIndex ? 'demoGlow 1.8s ease-in-out infinite' : 'none',
                    transition:   'background 0.5s ease',
                  }}
                />
              ))}
            </div>
          </div>

          {/* The question */}
          <p key={prompts[qIndex].id} className="demo-fade-up" style={{ fontFamily: SERIF, fontWeight: 300, fontSize: 'clamp(1.7rem,3.6vw,2.6rem)', color: C.text, lineHeight: 1.3, maxWidth: '760px', marginBottom: '2.25rem' }}>
            {prompts[qIndex].text}
          </p>

          {/* Answer field */}
          <textarea
            ref={textareaRef}
            value={answers[qIndex] ?? ''}
            onChange={e => setAnswer(e.target.value)}
            placeholder="Type their answer as they speak..."
            rows={4}
            style={{
              width:        '100%',
              maxWidth:     '760px',
              background:   'rgba(240,237,230,0.02)',
              border:       '1px solid rgba(196,162,74,0.18)',
              borderRadius: '3px',
              padding:      '1.1rem 1.25rem',
              fontFamily:   SERIF,
              fontSize:     '1.15rem',
              fontWeight:   300,
              color:        C.text,
              lineHeight:   1.7,
              outline:      'none',
              resize:       'none',
            }}
          />

          {/* Live score + dimension tag */}
          <ScoreReadout
            score={scoreAnswer(answers[qIndex] ?? '')}
            dimension={dimensionLabel(prompts[qIndex].dimension)}
          />

          <div style={{ marginTop: '2.75rem' }}>
            <PrimaryButton onClick={nextQuestion} disabled={!(answers[qIndex] ?? '').trim()}>
              {qIndex < TOTAL_Q - 1 ? 'Next Question' : 'Complete'}
            </PrimaryButton>
          </div>
        </Stage>
      )}

      {/* ── STEP 7 — Echo Layer achieved ── */}
      {step === 7 && (
        <Stage>
          {/* Single gold authentication sweep */}
          <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
            <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: '2px', background: 'linear-gradient(90deg,transparent,rgba(196,162,74,0.7),transparent)', animation: 'demoScan 3.4s cubic-bezier(0.16,1,0.3,1) both' }} />
          </div>

          <p className="demo-fade" style={{ fontFamily: MONO, fontSize: '0.62rem', letterSpacing: '0.4em', textTransform: 'uppercase', color: 'rgba(196,162,74,0.7)', marginBottom: '1.75rem' }}>
            Layer One Established
          </p>
          <h1 className="demo-fade-up" style={{ fontFamily: SERIF, fontWeight: 300, fontSize: 'clamp(2.8rem,8vw,6rem)', color: C.gold, lineHeight: 1, letterSpacing: '-0.01em', marginBottom: '1.75rem', textShadow: '0 0 40px rgba(196,162,74,0.25)' }}>
            The Echo Layer
          </h1>
          <p className="demo-fade-up" style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 'clamp(1.2rem,3vw,1.8rem)', color: C.text, marginBottom: '2rem' }}>
            Your entity now knows who you are.
          </p>
          <p className="demo-fade" style={{ fontFamily: SERIF, fontWeight: 300, fontSize: 'clamp(0.95rem,2vw,1.15rem)', color: C.muted, lineHeight: 1.8, maxWidth: '520px' }}>
            {firstName} has answered {TOTAL_Q} questions. This is the beginning of a
            cognitive reference model.
          </p>

          <div style={{ marginTop: '3.5rem', minHeight: '52px' }}>
            {echoReady && (
              <button
                className="demo-fade"
                onClick={() => setStep(8)}
                style={{
                  background:    'transparent',
                  border:        'none',
                  cursor:        'pointer',
                  fontFamily:    MONO,
                  fontSize:      '0.62rem',
                  letterSpacing: '0.3em',
                  textTransform: 'uppercase',
                  color:         'rgba(196,162,74,0.85)',
                  padding:       '0.5rem',
                }}
              >
                Continue →
              </button>
            )}
          </div>
        </Stage>
      )}

      {/* ── STEP 8 — Live entity response ── */}
      {step === 8 && (
        <Stage>
          <Eyebrow>The Entity Responds</Eyebrow>

          <p className="demo-fade-up" style={{ fontFamily: SERIF, fontWeight: 300, fontSize: 'clamp(1.4rem,3vw,2rem)', color: C.muted, lineHeight: 1.4, maxWidth: '680px', marginBottom: '2.5rem' }}>
            {DEMO_QUESTION}
          </p>

          <div
            style={{
              width:       '100%',
              maxWidth:    '680px',
              borderLeft:  '2px solid rgba(196,162,74,0.5)',
              background:  'rgba(240,237,230,0.03)',
              borderRadius:'0 4px 4px 0',
              padding:     '1.5rem 1.75rem',
              minHeight:   '160px',
            }}
          >
            {entityState === 'loading' && (
              <p style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: '1.2rem', color: C.muted }}>
                The entity is forming a response
                <span style={{ animation: 'demoBlink 1s step-end infinite' }}>...</span>
              </p>
            )}

            {entityState === 'error' && (
              <p style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: '1.2rem', color: C.muted, lineHeight: 1.8 }}>
                The entity is resting for a moment. The full reference model lives
                inside the archive, where it answers from everything {firstName} deposits.
              </p>
            )}

            {(entityState === 'streaming' || entityState === 'done') && (
              <p style={{ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(1.2rem,2.4vw,1.5rem)', color: C.goldBright, lineHeight: 1.85 }}>
                {typed}
                {entityState === 'streaming' && (
                  <span style={{ animation: 'demoBlink 1s step-end infinite', color: C.gold }}>▍</span>
                )}
              </p>
            )}
          </div>

          <div style={{ marginTop: '3rem', minHeight: '52px' }}>
            {(entityState === 'done' || entityState === 'error') && (
              <button
                className="demo-fade"
                onClick={() => setStep(9)}
                style={{
                  background:    'transparent',
                  border:        'none',
                  cursor:        'pointer',
                  fontFamily:    MONO,
                  fontSize:      '0.62rem',
                  letterSpacing: '0.3em',
                  textTransform: 'uppercase',
                  color:         'rgba(196,162,74,0.85)',
                  padding:       '0.5rem',
                }}
              >
                Continue →
              </button>
            )}
          </div>
        </Stage>
      )}

      {/* ── STEP 9 — The close ── */}
      {step === 9 && (
        <Stage>
          <Eyebrow>What You Just Watched</Eyebrow>

          <div className="demo-fade-up" style={{ maxWidth: '680px', marginBottom: '3.25rem' }}>
            <p style={{ fontFamily: SERIF, fontWeight: 300, fontSize: 'clamp(1.5rem,3.2vw,2.2rem)', color: C.text, lineHeight: 1.5, marginBottom: '1.5rem' }}>
              This is your archive after fifteen minutes.
            </p>
            <p style={{ fontFamily: SERIF, fontWeight: 300, fontSize: 'clamp(1.2rem,2.6vw,1.6rem)', color: C.muted, lineHeight: 1.7, marginBottom: '1.5rem' }}>
              After eighteen months of daily deposits, it knows how you think, what
              you weigh, and how you decide.
            </p>
            <p style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 'clamp(1.3rem,2.8vw,1.8rem)', color: C.goldBright, lineHeight: 1.6 }}>
              After your death, it knows you.
            </p>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'center', alignItems: 'center' }}>
            <a
              href={APPLY_URL}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontFamily:    MONO,
                fontSize:      '0.66rem',
                letterSpacing: '0.26em',
                textTransform: 'uppercase',
                color:         C.void,
                background:    C.gold,
                padding:       '1rem 2rem',
                textDecoration:'none',
                fontWeight:    700,
                borderRadius:  '2px',
              }}
            >
              Begin Your Archive →
            </a>

            {!showPaper && paperState !== 'sent' && (
              <button
                onClick={() => setShowPaper(true)}
                style={{
                  fontFamily:    MONO,
                  fontSize:      '0.66rem',
                  letterSpacing: '0.26em',
                  textTransform: 'uppercase',
                  color:         C.muted,
                  background:    'transparent',
                  border:        '1px solid rgba(196,162,74,0.3)',
                  padding:       '1rem 2rem',
                  cursor:        'pointer',
                  borderRadius:  '2px',
                }}
              >
                Send Me The White Paper
              </button>
            )}
          </div>

          {/* White paper email capture */}
          {showPaper && paperState !== 'sent' && (
            <div className="demo-fade" style={{ marginTop: '2.25rem', width: '100%', maxWidth: '460px' }}>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', flexWrap: 'wrap', justifyContent: 'center' }}>
                <div style={{ flex: 1, minWidth: '240px', textAlign: 'left' }}>
                  <Field
                    label="Their email"
                    value={email}
                    onChange={v => { setEmail(v); if (paperState === 'error') setPaperState('idle') }}
                    placeholder="name@example.com"
                    type="email"
                    onEnter={sendPaper}
                  />
                </div>
                <button
                  onClick={sendPaper}
                  disabled={!email.trim() || paperState === 'sending'}
                  style={{
                    fontFamily:    MONO,
                    fontSize:      '0.6rem',
                    letterSpacing: '0.24em',
                    textTransform: 'uppercase',
                    color:         C.void,
                    background:    C.gold,
                    border:        'none',
                    padding:       '0.85rem 1.5rem',
                    cursor:        'pointer',
                    borderRadius:  '2px',
                    opacity:       !email.trim() || paperState === 'sending' ? 0.4 : 1,
                    whiteSpace:    'nowrap',
                  }}
                >
                  {paperState === 'sending' ? 'Sending' : 'Send'}
                </button>
              </div>
              {paperState === 'error' && (
                <p style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: '0.9rem', color: '#C98B8B', marginTop: '0.75rem' }}>
                  {paperError}
                </p>
              )}
            </div>
          )}

          {paperState === 'sent' && (
            <p className="demo-fade" style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: '1.1rem', color: 'rgba(196,162,74,0.9)', marginTop: '2.25rem' }}>
              Sent. The white paper is on its way to {email.trim()}.
            </p>
          )}

          <button
            onClick={restart}
            style={{
              marginTop:     '4rem',
              background:    'transparent',
              border:        'none',
              cursor:        'pointer',
              fontFamily:    MONO,
              fontSize:      '0.56rem',
              letterSpacing: '0.26em',
              textTransform: 'uppercase',
              color:         C.ghost,
            }}
          >
            Run Another Demo
          </button>
        </Stage>
      )}
    </div>
  )
}

// ── Shared pieces ─────────────────────────────────────────────────────────────

function Stage({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        position:       'relative',
        minHeight:      '100vh',
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
        justifyContent: 'center',
        textAlign:      'center',
        padding:        'clamp(2rem,6vw,5rem) 1.5rem',
        maxWidth:       '900px',
        margin:         '0 auto',
      }}
    >
      {children}
    </div>
  )
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="demo-fade" style={{ fontFamily: MONO, fontSize: '0.62rem', letterSpacing: '0.4em', textTransform: 'uppercase', color: 'rgba(196,162,74,0.7)', marginBottom: '1.5rem' }}>
      {children}
    </p>
  )
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  onEnter,
}: {
  label:        string
  value:        string
  onChange:     (v: string) => void
  placeholder?: string
  type?:        string
  onEnter?:     () => void
}) {
  return (
    <label style={{ display: 'block' }}>
      <span style={{ display: 'block', fontFamily: MONO, fontSize: '0.56rem', letterSpacing: '0.24em', textTransform: 'uppercase', color: C.dim, marginBottom: '0.6rem' }}>
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && onEnter) { e.preventDefault(); onEnter() } }}
        placeholder={placeholder}
        style={{
          width:        '100%',
          background:   'transparent',
          border:       'none',
          borderBottom: '1px solid rgba(196,162,74,0.3)',
          color:        C.text,
          fontFamily:   SERIF,
          fontSize:     '1.35rem',
          fontWeight:   300,
          padding:      '0.4rem 0',
          outline:      'none',
        }}
      />
    </label>
  )
}

function PrimaryButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode
  onClick:  () => void
  disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        fontFamily:    MONO,
        fontSize:      '0.68rem',
        letterSpacing: '0.3em',
        textTransform: 'uppercase',
        color:         C.void,
        background:    C.gold,
        border:        'none',
        padding:       '1.05rem 2.5rem',
        cursor:        disabled ? 'default' : 'pointer',
        opacity:       disabled ? 0.35 : 1,
        fontWeight:    700,
        borderRadius:  '2px',
        transition:    'opacity 0.2s',
      }}
    >
      {children}
    </button>
  )
}

function ScoreReadout({ score, dimension }: { score: number; dimension: string }) {
  const color = score >= 70 ? C.gold : score >= 45 ? 'rgba(196,162,74,0.7)' : C.dim
  return (
    <div style={{ width: '100%', maxWidth: '760px', marginTop: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem', flexShrink: 0 }}>
        <span style={{ fontFamily: SERIF, fontWeight: 300, fontSize: '2.2rem', color, lineHeight: 1, transition: 'color 0.3s' }}>
          {score}
        </span>
        <span style={{ fontFamily: SERIF, fontWeight: 300, fontSize: '0.95rem', color: C.dim }}>/100</span>
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.45rem' }}>
          <span style={{ fontFamily: MONO, fontSize: '0.54rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: C.dim }}>
            Answer Quality
          </span>
          <span style={{ fontFamily: MONO, fontSize: '0.54rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(196,162,74,0.7)' }}>
            {dimension}
          </span>
        </div>
        <div style={{ height: '4px', borderRadius: '2px', background: 'rgba(240,237,230,0.07)', overflow: 'hidden' }}>
          <div style={{ height: '100%', borderRadius: '2px', width: `${score}%`, background: 'linear-gradient(90deg,rgba(196,162,74,0.5),rgba(196,162,74,0.9))', transition: 'width 0.35s ease' }} />
        </div>
      </div>
    </div>
  )
}
