'use client'

import { useState, useEffect, useCallback } from 'react'
import { B2B_DOMAINS } from '@/lib/b2bDomains'

type ReadinessDomain = { domainId: number; answered: number; total: number }
type Readiness       = { domains: ReadinessDomain[]; overall: { answered: number; total: number } }
type NextQuestion    = { b2bQuestionId: string | null; questionText: string | null; domainId: number | null; allAnswered?: boolean }

const GOLD = '#C4A24A'

export default function SuccessionDashboard({
  archiveId,
  ownerName,
}: {
  archiveId: string
  ownerName: string | null
}) {
  const [loading,      setLoading]      = useState(true)
  const [depositCount, setDepositCount] = useState(0)
  const [readiness,    setReadiness]    = useState<Readiness | null>(null)
  const [question,     setQuestion]     = useState<NextQuestion | null>(null)
  const [answer,       setAnswer]       = useState('')
  const [submitting,   setSubmitting]   = useState(false)
  const [savedNote,    setSavedNote]    = useState(false)

  const loadDashboard = useCallback(async () => {
    try {
      const res  = await fetch(`/api/archive/dashboard?archiveId=${archiveId}`)
      const data = await res.json()
      setDepositCount((data.ownerDeposits ?? []).length)
      setReadiness(data.b2bReadiness ?? null)
    } catch {}
  }, [archiveId])

  const loadQuestion = useCallback(async () => {
    try {
      const res  = await fetch('/api/archive/b2b-question/next')
      const data = await res.json()
      setQuestion(data)
    } catch {
      setQuestion(null)
    }
  }, [])

  useEffect(() => {
    let active = true
    ;(async () => {
      await Promise.all([loadDashboard(), loadQuestion()])
      if (active) setLoading(false)
    })()
    return () => { active = false }
  }, [loadDashboard, loadQuestion])

  async function submitAnswer() {
    if (!question?.questionText || answer.trim().length < 2 || submitting) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/archive/b2b-question/answer', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          b2bQuestionId: question.b2bQuestionId,
          questionText:  question.questionText,
          answer:        answer.trim(),
        }),
      })
      if (res.ok) {
        setAnswer('')
        setSavedNote(true)
        setTimeout(() => setSavedNote(false), 4000)
        // Refetch the next open question and the readiness map.
        await Promise.all([loadQuestion(), loadDashboard()])
      }
    } finally {
      setSubmitting(false)
    }
  }

  const firstName = ownerName?.split(' ')[0] ?? null
  const greeting  = (() => {
    const h = new Date().getHours()
    return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
  })()

  const subline = depositCount === 0
    ? 'Your archive is empty. Start by showing how you decide.'
    : readiness
      ? `${readiness.overall.answered} of ${readiness.overall.total} answered across 8 domains`
      : ''

  const answeredByDomain = new Map<number, ReadinessDomain>()
  for (const d of readiness?.domains ?? []) answeredByDomain.set(d.domainId, d)

  return (
    <div className="max-w-4xl mx-auto">

      {/* ── HERO ── */}
      <div className="mb-10">
        <h1
          style={{
            fontFamily:    '"Cormorant Garamond",Georgia,serif',
            fontSize:      'clamp(1.8rem,3.5vw,2.75rem)',
            fontWeight:    300,
            lineHeight:    1.1,
            letterSpacing: '-0.025em',
            color:         '#F0EDE6',
            marginBottom:  '10px',
          }}
        >
          {firstName ? `${greeting}, ${firstName}.` : `${greeting}.`}
        </h1>
        {!loading && (
          <p style={{ fontFamily: '"Space Mono","Courier New",monospace', fontSize: '0.48rem', letterSpacing: '0.12em', color: 'rgba(112,108,101,0.6)' }}>
            {subline}
          </p>
        )}
      </div>

      {/* ── CAPTURE PANEL ── */}
      <div
        className="rounded-sm mb-10"
        style={{
          background: 'rgba(196,162,74,0.04)',
          border:     '1px solid rgba(196,162,74,0.14)',
          borderTop:  '3px solid rgba(196,162,74,0.5)',
          padding:    'clamp(1.5rem,4vw,2.25rem) clamp(1.25rem,4vw,2.5rem)',
        }}
      >
        <p style={{ fontFamily: '"Space Mono","Courier New",monospace', fontSize: '0.46rem', letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(196,162,74,0.7)', marginBottom: '0.85rem' }}>
          Answer your first judgment question
        </p>
        <p style={{ fontFamily: '"Cormorant Garamond",Georgia,serif', fontSize: '1.05rem', fontWeight: 300, color: '#B8B4AB', lineHeight: 1.7, marginBottom: '1.5rem' }}>
          Respond to one question about how you decide. Each answer trains the entity your successor will consult.
        </p>

        {loading ? (
          <div style={{ height: '120px', background: 'rgba(255,255,255,0.04)', borderRadius: '2px', animation: 'mysteryGlowPulse 1.8s ease-in-out infinite' }} />
        ) : question?.questionText ? (
          <>
            <div style={{ borderLeft: `3px solid rgba(196,162,74,0.5)`, padding: '16px 22px', margin: '0 0 1.5rem', background: 'rgba(196,162,74,0.04)' }}>
              <p style={{ fontFamily: '"Cormorant Garamond",Georgia,serif', fontSize: '1.4rem', fontStyle: 'italic', fontWeight: 300, color: '#F0EDE6', lineHeight: 1.6, margin: 0 }}>
                {question.questionText}
              </p>
            </div>

            <textarea
              value={answer}
              onChange={e => setAnswer(e.target.value)}
              placeholder="Answer in your own words. No length required."
              rows={6}
              style={{
                width:        '100%',
                background:   'rgba(10,9,8,0.5)',
                border:       '1px solid rgba(196,162,74,0.18)',
                borderRadius: '2px',
                padding:      '14px 18px',
                fontFamily:   '"Cormorant Garamond",Georgia,serif',
                fontSize:     '1.05rem',
                color:        '#F0EDE6',
                lineHeight:   1.7,
                resize:       'vertical',
                outline:      'none',
                boxSizing:    'border-box',
              }}
            />

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '1rem' }}>
              <button
                onClick={submitAnswer}
                disabled={submitting || answer.trim().length < 2}
                style={{
                  fontFamily:    '"Space Mono","Courier New",monospace',
                  fontSize:      '0.46rem',
                  letterSpacing: '0.25em',
                  textTransform: 'uppercase',
                  color:         '#0A0908',
                  background:    GOLD,
                  border:        'none',
                  borderRadius:  '2px',
                  padding:       '0.7rem 1.5rem',
                  cursor:        submitting || answer.trim().length < 2 ? 'not-allowed' : 'pointer',
                  opacity:       answer.trim().length < 2 ? 0.5 : 1,
                }}
              >
                {submitting ? 'Saving…' : 'Answer a question'}
              </button>
              {savedNote && (
                <span style={{ fontFamily: '"Cormorant Garamond",Georgia,serif', fontStyle: 'italic', fontSize: '0.95rem', color: 'rgba(196,162,74,0.85)' }}>
                  Saved to your archive.
                </span>
              )}
            </div>
          </>
        ) : (
          <p style={{ fontFamily: '"Cormorant Garamond",Georgia,serif', fontStyle: 'italic', fontSize: '1.05rem', color: '#B8B4AB', lineHeight: 1.7, margin: 0 }}>
            You have answered every question available right now. New questions will arrive as your archive grows.
          </p>
        )}
      </div>

      {/* ── READINESS MAP ── */}
      <div
        className="rounded-sm mb-10"
        style={{ background: '#111112', border: '1px solid rgba(255,255,255,0.06)', padding: 'clamp(1.5rem,4vw,2rem)' }}
      >
        <div className="flex items-baseline justify-between gap-4" style={{ marginBottom: '1.75rem' }}>
          <p style={{ fontFamily: '"Space Mono","Courier New",monospace', fontSize: '0.52rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#5C6166' }}>
            Judgment Coverage
          </p>
          {readiness && (
            <p style={{ fontFamily: '"Space Mono","Courier New",monospace', fontSize: '0.48rem', letterSpacing: '0.1em', color: 'rgba(196,162,74,0.8)' }}>
              {readiness.overall.answered} of {readiness.overall.total} answered across 8 domains
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2" style={{ rowGap: '1.5rem', columnGap: '2.5rem' }}>
          {B2B_DOMAINS.map(domain => {
            const r        = answeredByDomain.get(domain.domainId)
            const answered = r?.answered ?? 0
            const total    = r?.total ?? 0
            const pct      = total > 0 ? Math.min(100, Math.round((answered / total) * 100)) : 0
            return (
              <div key={domain.domainId}>
                <div className="flex items-baseline justify-between gap-3" style={{ marginBottom: '0.5rem' }}>
                  <p style={{ fontFamily: '"Cormorant Garamond",Georgia,serif', fontSize: '1.15rem', fontWeight: 400, color: '#F0EDE6' }}>
                    {domain.name}
                  </p>
                  <p style={{ fontFamily: '"Space Mono","Courier New",monospace', fontSize: '0.46rem', letterSpacing: '0.08em', color: answered > 0 ? 'rgba(196,162,74,0.8)' : '#3A3F44', whiteSpace: 'nowrap' }}>
                    {answered} / {total}
                  </p>
                </div>
                <p style={{ fontFamily: '"Cormorant Garamond",Georgia,serif', fontStyle: 'italic', fontSize: '0.92rem', color: '#706C65', lineHeight: 1.5, marginBottom: '0.6rem' }}>
                  {domain.description}
                </p>
                <div style={{ height: '6px', borderRadius: '3px', background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                  <div
                    className="transition-all duration-500"
                    style={{
                      height:     '100%',
                      width:      `${pct}%`,
                      background: answered > 0 ? 'rgba(196,162,74,0.55)' : 'transparent',
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

    </div>
  )
}
