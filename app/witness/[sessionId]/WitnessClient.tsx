'use client'

import { useState, useEffect, useRef } from 'react'

// ── Types ───────────────────────────────────────────────────────────────────
type WitnessQuestion = {
  id:       string
  question: string
  prompt:   string
}

type SessionData = {
  sessionId:        string
  archiveId:        string
  archiveName:      string
  ownerName:        string
  contributorName:  string | null
  contributorEmail: string
  relationship:     string
  subjectName:      string
  status:           string
  currentQuestion:  number
  totalQuestions:   number
  title:            string
  intro:            string
  estimatedMinutes: number
  questions:        WitnessQuestion[]
}

type View = 'loading' | 'error' | 'welcome' | 'active' | 'complete'

// ── Sigil ───────────────────────────────────────────────────────────────────
function Sigil({ size = 40, pulse = false }: { size?: number; pulse?: boolean }) {
  const half = size / 2
  const d    = size * 0.28
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none"
      className={pulse ? 'animate-pulse' : ''}
    >
      <rect x={half - d} y={half - d} width={d * 2} height={d * 2}
        stroke="rgba(196,162,74,0.9)" strokeWidth="1.2" transform={`rotate(45 ${half} ${half})`} />
      <rect x={half - d * 0.55} y={half - d * 0.55} width={d * 1.1} height={d * 1.1}
        stroke="rgba(196,162,74,0.45)" strokeWidth="0.8" transform={`rotate(45 ${half} ${half})`} />
    </svg>
  )
}

// ── Progress dots ────────────────────────────────────────────────────────────
function ProgressDots({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex items-center justify-center gap-2">
      {Array.from({ length: total }).map((_, i) => {
        const done   = i < current
        const active = i === current
        return (
          <div
            key={i}
            className={active ? 'animate-pulse' : ''}
            style={{
              width:        active ? '10px' : '8px',
              height:       active ? '10px' : '8px',
              borderRadius: '50%',
              background:   done
                ? 'rgba(196,162,74,1)'
                : active
                  ? 'rgba(196,162,74,0.9)'
                  : 'rgba(196,162,74,0.15)',
              border:     active ? '1px solid rgba(196,162,74,0.6)' : 'none',
              transition: 'all 0.3s',
            }}
          />
        )
      })}
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────────────
export default function WitnessClient({ sessionId }: { sessionId: string }) {
  const [view,            setView]            = useState<View>('loading')
  const [session,         setSession]         = useState<SessionData | null>(null)
  const [currentIndex,    setCurrentIndex]    = useState(0)
  const [currentQuestion, setCurrentQuestion] = useState<WitnessQuestion | null>(null)
  const [answer,          setAnswer]          = useState('')
  const [saving,          setSaving]          = useState(false)
  const [savedMsg,        setSavedMsg]        = useState(false)
  const [errorMsg,        setErrorMsg]        = useState('')

  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    fetch(`/api/witness?sessionId=${sessionId}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { setErrorMsg(data.error); setView('error'); return }
        setSession(data)
        // If already completed, go straight to complete
        if (data.status === 'completed') {
          setView('complete')
          return
        }
        // Resume from current_question
        const idx = data.currentQuestion ?? 0
        setCurrentIndex(idx)
        setCurrentQuestion(data.questions[idx] ?? null)
        setView('welcome')
      })
      .catch(() => { setErrorMsg('Unable to load this session.'); setView('error') })
  }, [sessionId])

  function beginSession() {
    setView('active')
    setTimeout(() => textareaRef.current?.focus(), 200)
  }

  async function saveAndContinue(noAnswer = false) {
    if (!session || !currentQuestion) return
    if (!noAnswer && answer.trim().length < 20) return

    setSaving(true)
    setSavedMsg(false)

    try {
      const res  = await fetch(`/api/witness/${sessionId}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          questionIndex: currentIndex,
          answer:        noAnswer ? '' : answer.trim(),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      if (data.isComplete) {
        setView('complete')
      } else {
        if (!noAnswer) {
          setSavedMsg(true)
          setTimeout(() => setSavedMsg(false), 1500)
        }
        setCurrentIndex(data.nextIndex)
        setCurrentQuestion(data.nextQuestion)
        setAnswer('')
        setTimeout(() => textareaRef.current?.focus(), 100)
      }
    } catch (err: any) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  // ── PAGE SHELL ─────────────────────────────────────────────────────────────
  const shell = (children: React.ReactNode) => (
    <div
      style={{
        minHeight:    '100vh',
        background:   '#0A0908',
        display:      'flex',
        alignItems:   'center',
        justifyContent: 'center',
        padding:      '3rem 1.5rem',
      }}
    >
      <div style={{ width: '100%', maxWidth: '580px' }}>
        {children}
      </div>
    </div>
  )

  // ── LOADING ────────────────────────────────────────────────────────────────
  if (view === 'loading') return shell(
    <div className="flex flex-col items-center gap-4">
      <Sigil size={32} pulse />
      <p style={{ fontFamily: 'monospace', fontSize: '0.42rem', letterSpacing: '0.3em', color: 'rgba(196,162,74,0.5)', textTransform: 'uppercase' }}>
        Loading session…
      </p>
    </div>
  )

  // ── ERROR ──────────────────────────────────────────────────────────────────
  if (view === 'error') return shell(
    <div className="text-center">
      <p className="font-serif italic" style={{ fontSize: '1rem', color: '#9DA3A8', lineHeight: 1.8 }}>
        {errorMsg || 'This session could not be found.'}
      </p>
    </div>
  )

  if (!session) return null

  const subjectName    = session.subjectName
  const contributorName = session.contributorName || 'there'
  const archiveName    = session.archiveName

  // ── COMPLETE ───────────────────────────────────────────────────────────────
  if (view === 'complete') return shell(
    <div className="flex flex-col items-center text-center gap-6">
      <Sigil size={40} pulse />

      <h1 className="font-serif" style={{ fontWeight: 700, fontSize: '2rem', color: '#F0EDE6', lineHeight: 1.2 }}>
        Thank you, {contributorName}.
      </h1>

      <p className="font-serif italic font-light" style={{ fontSize: '1rem', color: '#9DA3A8', lineHeight: 1.9, maxWidth: '480px' }}>
        Your memories are now part of {archiveName} permanently.
        <br /><br />
        {subjectName}&rsquo;s entity will carry what you shared. In twenty years,
        in fifty years, the people who come after them will know something about{' '}
        {subjectName} that only you could have told them.
        <br /><br />
        That is what you just gave them.
      </p>

      <div style={{ width: '60px', height: '1px', background: 'rgba(196,162,74,0.3)', marginTop: '1rem' }} />
    </div>
  )

  // ── WELCOME ────────────────────────────────────────────────────────────────
  if (view === 'welcome') return shell(
    <div className="flex flex-col items-center text-center gap-6">
      <Sigil size={40} />

      <p style={{ fontFamily: 'monospace', fontSize: '0.44rem', letterSpacing: '0.4em', textTransform: 'uppercase', color: 'rgba(196,162,74,0.8)' }}>
        {archiveName}
      </p>

      <h1 className="font-serif" style={{ fontWeight: 700, fontSize: 'clamp(1.8rem,4vw,2.5rem)', color: '#F0EDE6', lineHeight: 1.2, letterSpacing: '-0.02em' }}>
        Your memories of {subjectName} matter to this archive.
      </h1>

      <p className="font-serif italic font-light" style={{ fontSize: '1rem', color: '#9DA3A8', lineHeight: 1.9, maxWidth: '520px' }}>
        {subjectName} is building a permanent archive of their life — one that their
        grandchildren and great-grandchildren will be able to access for generations.
        <br /><br />
        You have been invited because your perspective is irreplaceable. The things
        you have observed about {subjectName} are things only you can contribute.
        <br /><br />
        This session has 5 questions. Your answers go directly into the archive and
        help train {subjectName}&rsquo;s AI entity.
        <br /><br />
        There are no right or wrong answers. Just what you remember and what you observed.
      </p>

      <p style={{ fontFamily: 'monospace', fontSize: '0.42rem', letterSpacing: '0.14em', color: '#5C6166' }}>
        5 questions · ~{session.estimatedMinutes} minutes
      </p>

      <button
        onClick={beginSession}
        style={{
          background:    'rgba(196,162,74,1)',
          border:        'none',
          borderRadius:  '2px',
          padding:       '0.9rem 3rem',
          fontFamily:    'monospace',
          fontSize:      '0.44rem',
          letterSpacing: '0.3em',
          textTransform: 'uppercase',
          color:         '#0A0A0B',
          cursor:        'pointer',
          marginTop:     '0.5rem',
        }}
      >
        Begin →
      </button>

      <p className="font-serif italic" style={{ fontSize: '0.8rem', color: '#5C6166', lineHeight: 1.7 }}>
        Your responses will be seen by {subjectName} and their designated archive custodian.
      </p>
    </div>
  )

  // ── ACTIVE SESSION ─────────────────────────────────────────────────────────
  const questionNumber = currentIndex + 1
  const canSave        = answer.trim().length >= 20

  return (
    <div style={{ minHeight: '100vh', background: '#0A0908', padding: '3rem 1.5rem' }}>
      <div style={{ maxWidth: '640px', margin: '0 auto' }}>

        {/* Top bar */}
        <div className="flex items-center justify-between mb-8">
          <p style={{ fontFamily: 'monospace', fontSize: '0.42rem', letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(196,162,74,0.6)' }}>
            {archiveName}
          </p>
          <p style={{ fontFamily: 'monospace', fontSize: '0.42rem', letterSpacing: '0.12em', color: '#5C6166' }}>
            {session.title}
          </p>
        </div>

        {/* Progress */}
        <div className="flex flex-col items-center gap-3 mb-10">
          <ProgressDots total={session.totalQuestions} current={currentIndex} />
          <p style={{ fontFamily: 'monospace', fontSize: '0.42rem', letterSpacing: '0.12em', color: '#5C6166' }}>
            Question {questionNumber} of {session.totalQuestions}
          </p>
        </div>

        {/* Question */}
        {currentQuestion && (
          <div style={{
            background:   'rgba(196,162,74,0.03)',
            border:       '1px solid rgba(196,162,74,0.1)',
            borderTop:    '3px solid rgba(196,162,74,0.5)',
            borderRadius: '2px',
            padding:      '2.5rem 2.5rem 2rem',
          }}>
            <p className="font-serif" style={{ fontWeight: 700, fontSize: 'clamp(1.1rem,2.5vw,1.3rem)', color: '#F0EDE6', lineHeight: 1.6, marginBottom: '1rem' }}>
              {currentQuestion.question}
            </p>
            <p className="font-serif italic font-light" style={{ fontSize: '0.9rem', color: '#9DA3A8', lineHeight: 1.7, marginBottom: '2rem' }}>
              {currentQuestion.prompt}
            </p>

            <textarea
              ref={textareaRef}
              value={answer}
              onChange={e => setAnswer(e.target.value)}
              placeholder="Take your time. Write as much or as little as comes naturally."
              className="font-serif font-light w-full focus:outline-none"
              style={{
                minHeight:    '200px',
                maxHeight:    '400px',
                resize:       'vertical',
                fontSize:     '1.05rem',
                color:        '#F0EDE6',
                lineHeight:   1.9,
                background:   'transparent',
                border:       'none',
                borderBottom: '1px solid rgba(196,162,74,0.3)',
                padding:      '0.5rem 0 1rem',
                display:      'block',
                width:        '100%',
                fontStyle:    answer ? 'normal' : 'italic',
              }}
            />

            <p style={{ fontFamily: 'monospace', fontSize: '0.38rem', color: '#5C6166', marginTop: '0.5rem', marginBottom: '1.5rem' }}>
              {answer.length > 0 ? `${answer.length} characters` : '\u00A0'}
            </p>

            {savedMsg && (
              <p style={{ fontFamily: 'monospace', fontSize: '0.42rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(196,162,74,0.9)', marginBottom: '1rem' }}>
                Saved to the archive ✓
              </p>
            )}

            <div className="flex items-center justify-between gap-4">
              <button
                onClick={() => saveAndContinue(true)}
                disabled={saving}
                style={{
                  background:    'none',
                  border:        'none',
                  cursor:        'pointer',
                  fontFamily:    'monospace',
                  fontSize:      '0.38rem',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color:         '#5C6166',
                  padding:       0,
                  opacity:       saving ? 0.4 : 1,
                }}
                onMouseEnter={e => (e.currentTarget.style.color = '#9DA3A8')}
                onMouseLeave={e => (e.currentTarget.style.color = '#5C6166')}
              >
                I don&rsquo;t have a memory for this one →
              </button>

              <button
                onClick={() => saveAndContinue(false)}
                disabled={!canSave || saving}
                style={{
                  background:    canSave && !saving ? 'rgba(196,162,74,1)' : 'rgba(196,162,74,0.25)',
                  border:        'none',
                  borderRadius:  '2px',
                  padding:       '0.7rem 2rem',
                  fontFamily:    'monospace',
                  fontSize:      '0.44rem',
                  letterSpacing: '0.3em',
                  textTransform: 'uppercase',
                  color:         canSave && !saving ? '#0A0A0B' : '#5C6166',
                  cursor:        canSave && !saving ? 'pointer' : 'not-allowed',
                  transition:    'all 0.2s',
                  flexShrink:    0,
                }}
              >
                {saving ? 'Saving…' : questionNumber < session.totalQuestions ? 'Save and Continue →' : 'Complete Session →'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
