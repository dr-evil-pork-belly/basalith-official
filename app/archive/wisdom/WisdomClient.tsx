'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

// ── Types ───────────────────────────────────────────────────────────────────
type WisdomQuestion = {
  id:       string
  question: string
  prompt:   string
}

type RecommendedSession = {
  dimension:        string
  score:            number
  title:            string
  intro:            string
  estimatedMinutes: number
}

type CompletedSession = {
  id:          string
  dimension:   string
  title:       string
  completedAt: string
  answerCount: number
}

type InProgressSession = {
  id:              string
  dimension:       string
  current_question: number
  answers:         any[]
}

type PageData = {
  recommended: RecommendedSession | null
  inProgress:  InProgressSession | null
  completed:   CompletedSession[]
}

type ActiveSession = {
  sessionId:        string
  dimension:        string
  title:            string
  intro:            string
  estimatedMinutes: number
  currentQuestion:  number
  question:         WisdomQuestion
  totalQuestions:   number
}

type View = 'loading' | 'selection' | 'active' | 'complete'

// ── Sigil ───────────────────────────────────────────────────────────────────
function Sigil({ size = 40, pulse = false }: { size?: number; pulse?: boolean }) {
  const half = size / 2
  const d    = size * 0.28
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none"
      className={pulse ? 'animate-pulse' : ''}
      style={{ opacity: 0.9 }}
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
    <div className="flex items-center gap-2">
      {Array.from({ length: total }).map((_, i) => {
        const done    = i < current
        const active  = i === current
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
              border:       active ? '1px solid rgba(196,162,74,0.6)' : 'none',
              transition:   'all 0.3s',
            }}
          />
        )
      })}
    </div>
  )
}

// ── Score bar ────────────────────────────────────────────────────────────────
function ScoreBar({ score, animated }: { score: number; animated: boolean }) {
  return (
    <div style={{ height: '6px', borderRadius: '3px', background: 'rgba(240,237,230,0.08)', overflow: 'hidden' }}>
      <div style={{
        height:       '100%',
        borderRadius: '3px',
        background:   'linear-gradient(90deg,rgba(196,162,74,0.6),rgba(196,162,74,1))',
        width:        animated ? `${score}%` : '0%',
        transition:   'width 0.9s ease-out',
      }} />
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────────────
export default function WisdomClient({ archiveId }: { archiveId: string }) {
  const [view,            setView]            = useState<View>('loading')
  const [pageData,        setPageData]        = useState<PageData | null>(null)
  const [activeSession,   setActiveSession]   = useState<ActiveSession | null>(null)
  const [answer,          setAnswer]          = useState('')
  const [saving,          setSaving]          = useState(false)
  const [savedMsg,        setSavedMsg]        = useState(false)
  const [completedInfo,   setCompletedInfo]   = useState<{ title: string; dimension: string; oldScore: number; newScore: number } | null>(null)
  const [completeAnimated, setCompleteAnimated] = useState(false)

  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => { fetchPageData() }, [archiveId])

  async function fetchPageData() {
    setView('loading')
    try {
      const res  = await fetch(`/api/archive/wisdom-session?archiveId=${archiveId}`)
      const data = await res.json()
      setPageData(data)

      // Resume in-progress session if exists
      if (data.inProgress) {
        const sess = data.inProgress
        const dim  = sess.dimension
        // Fetch the wisdom definition client-side isn't possible, so we start fresh via POST with the same dimension
        // Actually, we can reconstruct from the in-progress data — let's just show selection and let user resume
      }

      setView('selection')
    } catch {
      setView('selection')
    }
  }

  async function startSession(dimension: string) {
    setSaving(true)
    try {
      const res  = await fetch('/api/archive/wisdom-session', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ archiveId, dimension }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setActiveSession(data)
      setAnswer('')
      setView('active')
      setTimeout(() => textareaRef.current?.focus(), 200)
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  async function resumeSession(sess: InProgressSession) {
    // Restart by calling POST (creates new session) — OR we can reconstruct.
    // For simplicity, we start a new session for the same dimension.
    await startSession(sess.dimension)
  }

  async function saveAndContinue(skip = false) {
    if (!activeSession) return
    if (!skip && answer.trim().length < 20) return

    setSaving(true)
    setSavedMsg(false)

    try {
      const res  = await fetch('/api/archive/wisdom-session', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          sessionId:     activeSession.sessionId,
          questionIndex: activeSession.currentQuestion,
          answer:        skip ? '' : answer.trim(),
          archiveId,
          skip,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      if (data.isComplete) {
        // Save completed info for the completion screen
        const oldScore = pageData?.recommended?.dimension === activeSession.dimension
          ? pageData.recommended.score
          : 0
        setCompletedInfo({
          title:     activeSession.title,
          dimension: activeSession.dimension,
          oldScore,
          newScore:  data.newScore ?? 0,
        })
        setView('complete')
        setTimeout(() => setCompleteAnimated(true), 400)
      } else {
        // Advance to next question
        if (!skip) {
          setSavedMsg(true)
          setTimeout(() => setSavedMsg(false), 1500)
        }
        setActiveSession(prev => prev ? {
          ...prev,
          currentQuestion: data.nextIndex,
          question:        data.nextQuestion,
        } : null)
        setAnswer('')
        setTimeout(() => textareaRef.current?.focus(), 100)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  // ── VIEW: LOADING ──────────────────────────────────────────────────────────
  if (view === 'loading') {
    return (
      <div className="max-w-2xl mx-auto pt-8">
        <div style={{ height: '32px', width: '200px', background: 'rgba(255,255,255,0.04)', borderRadius: '2px', marginBottom: '1rem', animation: 'mysteryGlowPulse 1.8s ease-in-out infinite' }} />
        <div style={{ height: '20px', width: '320px', background: 'rgba(255,255,255,0.04)', borderRadius: '2px', animation: 'mysteryGlowPulse 1.8s ease-in-out infinite' }} />
      </div>
    )
  }

  // ── VIEW: SESSION COMPLETE ─────────────────────────────────────────────────
  if (view === 'complete' && completedInfo) {
    const scoreDelta = completedInfo.newScore - completedInfo.oldScore
    const increased  = scoreDelta > 3

    return (
      <div className="flex flex-col items-center justify-center text-center" style={{ minHeight: '70vh', maxWidth: '560px', margin: '0 auto', paddingTop: '2rem' }}>

        <div className="mb-6">
          <Sigil size={40} pulse />
        </div>

        <h1 className="font-serif" style={{ fontWeight: 700, fontSize: '2.5rem', color: '#F0EDE6', marginBottom: '1.5rem', letterSpacing: '-0.02em' }}>
          Session complete.
        </h1>

        <p className="font-serif italic font-light" style={{ fontSize: '1rem', color: '#9DA3A8', lineHeight: 1.85, maxWidth: '480px', marginBottom: '3rem' }}>
          You answered 5 questions about {completedInfo.title.toLowerCase()}.
          Every answer is now in your archive and your entity is richer for it.
        </p>

        {/* Score change */}
        <div style={{
          width:        '100%',
          background:   'rgba(196,162,74,0.04)',
          border:       '1px solid rgba(196,162,74,0.12)',
          borderTop:    '3px solid rgba(196,162,74,0.5)',
          borderRadius: '2px',
          padding:      '1.5rem 2rem',
          marginBottom: '2rem',
          textAlign:    'left',
        }}>
          <p style={{ fontFamily: 'monospace', fontSize: '0.4rem', letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(196,162,74,0.7)', marginBottom: '0.75rem' }}>
            {completedInfo.title} Accuracy
          </p>
          <div className="flex items-baseline gap-3 mb-3">
            <span className="font-serif" style={{ fontWeight: 300, fontSize: '1.6rem', color: '#5C6166', textDecoration: 'line-through' }}>
              {completedInfo.oldScore}%
            </span>
            <span style={{ color: '#5C6166', fontFamily: 'monospace', fontSize: '0.8rem' }}>→</span>
            <span className="font-serif" style={{ fontWeight: 700, fontSize: '2rem', color: 'rgba(196,162,74,1)' }}>
              {completedInfo.newScore}%
            </span>
          </div>
          <ScoreBar score={completedInfo.newScore} animated={completeAnimated} />
          {increased && (
            <p className="font-serif italic" style={{ fontSize: '0.9rem', color: 'rgba(196,162,74,0.85)', marginTop: '1rem', lineHeight: 1.6 }}>
              Your entity just learned something important about how you think.
            </p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full">
          <Link
            href="/archive/entity"
            style={{
              flex:          1,
              display:       'block',
              textAlign:     'center',
              background:    'rgba(196,162,74,1)',
              color:         '#0A0A0B',
              fontFamily:    'monospace',
              fontSize:      '0.44rem',
              letterSpacing: '0.3em',
              textTransform: 'uppercase',
              padding:       '0.85rem 1.5rem',
              textDecoration: 'none',
              borderRadius:  '2px',
            }}
          >
            See Your Entity →
          </Link>
          <Link
            href="/archive/dashboard"
            style={{
              flex:          1,
              display:       'block',
              textAlign:     'center',
              background:    'transparent',
              border:        '1px solid rgba(196,162,74,0.3)',
              color:         '#B8B4AB',
              fontFamily:    'monospace',
              fontSize:      '0.44rem',
              letterSpacing: '0.3em',
              textTransform: 'uppercase',
              padding:       '0.85rem 1.5rem',
              textDecoration: 'none',
              borderRadius:  '2px',
            }}
          >
            Back to Dashboard →
          </Link>
        </div>
      </div>
    )
  }

  // ── VIEW: ACTIVE SESSION ───────────────────────────────────────────────────
  if (view === 'active' && activeSession) {
    const questionNumber = activeSession.currentQuestion + 1
    const canSave        = answer.trim().length >= 20

    return (
      <div style={{ maxWidth: '680px' }}>

        {/* Header */}
        <div className="mb-8">
          <p style={{ fontFamily: 'monospace', fontSize: '0.44rem', letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(196,162,74,0.7)', marginBottom: '0.5rem' }}>
            Wisdom Extraction
          </p>
          <h1 className="font-serif font-semibold" style={{ fontSize: 'clamp(1.6rem,3vw,2.4rem)', color: '#F0EDE6', letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>
            {activeSession.title}
          </h1>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-4 mb-8">
          <ProgressDots total={activeSession.totalQuestions} current={activeSession.currentQuestion} />
          <p style={{ fontFamily: 'monospace', fontSize: '0.42rem', letterSpacing: '0.12em', color: '#5C6166' }}>
            Question {questionNumber} of {activeSession.totalQuestions}
          </p>
        </div>

        {/* Question card */}
        <div style={{
          borderTop:    '3px solid rgba(196,162,74,0.5)',
          background:   'rgba(196,162,74,0.03)',
          border:       '1px solid rgba(196,162,74,0.1)',
          borderRadius: '2px',
          padding:      '2.5rem 2.5rem 2rem',
          marginBottom: '0',
        }}>
          <p className="font-serif" style={{ fontWeight: 700, fontSize: 'clamp(1.2rem,2.5vw,1.4rem)', color: '#F0EDE6', lineHeight: 1.55, marginBottom: '1rem', maxWidth: '560px' }}>
            {activeSession.question.question}
          </p>
          <p className="font-serif italic font-light" style={{ fontSize: '0.9rem', color: '#9DA3A8', lineHeight: 1.7, marginBottom: '2rem' }}>
            {activeSession.question.prompt}
          </p>

          {/* Textarea */}
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

          {/* Char count */}
          <p style={{ fontFamily: 'monospace', fontSize: '0.38rem', color: '#5C6166', marginTop: '0.5rem', marginBottom: '1.5rem' }}>
            {answer.length > 0 ? `${answer.length} characters` : '\u00A0'}
          </p>

          {/* Saved confirmation */}
          {savedMsg && (
            <p style={{ fontFamily: 'monospace', fontSize: '0.42rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(196,162,74,0.9)', marginBottom: '1rem' }}>
              Saved to your archive ✓
            </p>
          )}

          {/* Buttons */}
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
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color:         '#5C6166',
                padding:       0,
                opacity:       saving ? 0.4 : 1,
              }}
              onMouseEnter={e => (e.currentTarget.style.color = '#9DA3A8')}
              onMouseLeave={e => (e.currentTarget.style.color = '#5C6166')}
            >
              Skip this question →
            </button>

            <button
              onClick={() => saveAndContinue(false)}
              disabled={!canSave || saving}
              style={{
                background:    canSave && !saving ? 'rgba(196,162,74,1)' : 'rgba(196,162,74,0.25)',
                border:        'none',
                borderRadius:  '2px',
                padding:       '0.7rem 2rem',
                minHeight:     '44px',
                fontFamily:    'monospace',
                fontSize:      '0.44rem',
                letterSpacing: '0.3em',
                textTransform: 'uppercase',
                color:         canSave && !saving ? '#0A0A0B' : '#5C6166',
                cursor:        canSave && !saving ? 'pointer' : 'not-allowed',
                transition:    'all 0.2s',
              }}
            >
              {saving ? 'Saving…' : questionNumber < activeSession.totalQuestions ? 'Save and Continue →' : 'Complete Session →'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── VIEW: SELECTION ────────────────────────────────────────────────────────
  const { recommended, inProgress, completed } = pageData ?? { recommended: null, inProgress: null, completed: [] }

  return (
    <div style={{ maxWidth: '780px' }}>

      {/* Header */}
      <div className="mb-10">
        <p style={{ fontFamily: 'monospace', fontSize: '0.44rem', letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(196,162,74,0.7)', marginBottom: '0.5rem' }}>
          Wisdom Extraction
        </p>
        <h1 className="font-serif font-semibold" style={{ fontSize: 'clamp(1.8rem,3.5vw,2.8rem)', color: '#F0EDE6', letterSpacing: '-0.025em' }}>
          This month&rsquo;s session.
        </h1>
      </div>

      {/* In-progress banner */}
      {inProgress && (
        <div
          className="flex items-center justify-between gap-4 mb-6"
          style={{
            background:   'rgba(196,162,74,0.06)',
            border:       '1px solid rgba(196,162,74,0.2)',
            borderRadius: '2px',
            padding:      '1rem 1.5rem',
          }}
        >
          <div>
            <p style={{ fontFamily: 'monospace', fontSize: '0.4rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(196,162,74,0.8)', marginBottom: '0.25rem' }}>
              Session in progress
            </p>
            <p className="font-serif" style={{ fontSize: '0.95rem', color: '#E8E4DC' }}>
              Question {inProgress.current_question + 1} of 5 · {inProgress.dimension.replace(/_/g, ' ')}
            </p>
          </div>
          <button
            onClick={() => resumeSession(inProgress)}
            disabled={saving}
            style={{
              background:    'rgba(196,162,74,1)',
              border:        'none',
              borderRadius:  '2px',
              padding:       '0.5rem 1.5rem',
              fontFamily:    'monospace',
              fontSize:      '0.42rem',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color:         '#0A0A0B',
              cursor:        'pointer',
              flexShrink:    0,
            }}
          >
            Resume →
          </button>
        </div>
      )}

      {/* Recommended session card */}
      {recommended && (
        <div style={{
          background:   'rgba(196,162,74,0.04)',
          border:       '1px solid rgba(196,162,74,0.12)',
          borderTop:    '3px solid rgba(196,162,74,0.5)',
          borderRadius: '2px',
          padding:      '2rem 2.5rem',
          marginBottom: '2rem',
        }}>
          <div className="flex flex-col md:flex-row gap-6 items-start justify-between">

            {/* Left: session info */}
            <div style={{ flex: 1 }}>
              <p style={{ fontFamily: 'monospace', fontSize: '0.42rem', letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(196,162,74,0.7)', marginBottom: '0.5rem' }}>
                Recommended This Month
              </p>
              <h2 className="font-serif" style={{ fontWeight: 700, fontSize: '1.3rem', color: '#F0EDE6', marginBottom: '0.75rem' }}>
                {recommended.title}
              </h2>
              <p className="font-serif italic font-light" style={{ fontSize: '0.95rem', color: '#9DA3A8', lineHeight: 1.8, marginBottom: '1.25rem', maxWidth: '440px' }}>
                {recommended.intro}
              </p>
              <p style={{ fontFamily: 'monospace', fontSize: '0.42rem', letterSpacing: '0.1em', color: '#5C6166', marginBottom: '1.5rem' }}>
                5 questions · ~{recommended.estimatedMinutes} minutes · Targets your lowest-scoring dimension
              </p>
              <button
                onClick={() => startSession(recommended.dimension)}
                disabled={saving}
                style={{
                  background:    'rgba(196,162,74,1)',
                  border:        'none',
                  borderRadius:  '2px',
                  padding:       '0.7rem 2rem',
                  fontFamily:    'monospace',
                  fontSize:      '0.44rem',
                  letterSpacing: '0.3em',
                  textTransform: 'uppercase',
                  color:         '#0A0A0B',
                  cursor:        saving ? 'not-allowed' : 'pointer',
                  opacity:       saving ? 0.6 : 1,
                }}
              >
                {saving ? 'Starting…' : 'Begin Session →'}
              </button>
            </div>

            {/* Right: accuracy indicator */}
            <div style={{ minWidth: '160px', flexShrink: 0 }}>
              <p style={{ fontFamily: 'monospace', fontSize: '0.4rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#5C6166', marginBottom: '0.5rem' }}>
                Current depth
              </p>
              <div className="flex items-baseline gap-1.5 mb-1">
                <span className="font-serif" style={{ fontWeight: 700, fontSize: '2.5rem', color: '#F0EDE6', lineHeight: 1, letterSpacing: '-0.02em' }}>
                  {recommended.score}
                </span>
                <span className="font-serif font-light" style={{ fontSize: '1rem', color: '#5C6166' }}>%</span>
              </div>
              <ScoreBar score={recommended.score} animated />
            </div>
          </div>
        </div>
      )}

      {/* Completed sessions */}
      {completed.length > 0 && (
        <div>
          <p style={{ fontFamily: 'monospace', fontSize: '0.4rem', letterSpacing: '0.3em', textTransform: 'uppercase', color: '#5C6166', marginBottom: '1rem' }}>
            Completed Sessions
          </p>
          <div className="flex flex-col gap-2">
            {completed.map(sess => (
              <div
                key={sess.id}
                className="flex items-center justify-between gap-4"
                style={{
                  background:   '#111112',
                  border:       '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '2px',
                  padding:      '1rem 1.5rem',
                }}
              >
                <div className="flex items-center gap-3">
                  <span style={{ color: 'rgba(196,162,74,0.8)', fontFamily: 'monospace', fontSize: '0.8rem', flexShrink: 0 }}>✓</span>
                  <div>
                    <p className="font-serif" style={{ fontSize: '0.95rem', color: '#B8B4AB' }}>{sess.title}</p>
                    <p style={{ fontFamily: 'monospace', fontSize: '0.38rem', color: '#5C6166', marginTop: '0.1rem' }}>
                      {sess.answerCount} answer{sess.answerCount !== 1 ? 's' : ''} · {new Date(sess.completedAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => startSession(sess.dimension)}
                  disabled={saving}
                  style={{
                    background:    'none',
                    border:        'none',
                    cursor:        'pointer',
                    fontFamily:    'monospace',
                    fontSize:      '0.38rem',
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    color:         '#5C6166',
                    padding:       0,
                    flexShrink:    0,
                  }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'rgba(196,162,74,0.8)')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#5C6166')}
                >
                  Redo →
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
