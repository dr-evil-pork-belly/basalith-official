'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { CertModule, ExamQuestion } from '@/lib/certificationContent'

const MONO  = '"Space Mono", "Courier New", monospace'
const SERIF = '"Cormorant Garamond", Georgia, serif'

const C = {
  bg:      '#0A0908',
  surface: '#111110',
  border:  'rgba(255,255,255,0.07)',
  gold:    '#C4A24A',
  text:    '#F0EDE6',
  muted:   '#9DA3A8',
  dim:     '#5C6166',
  ghost:   '#3A3F44',
  green:   '#4CAF50',
  red:     '#E57373',
}

function wordCount(s: string) {
  return s.trim().split(/\s+/).filter(Boolean).length
}

type AnswerResult = { questionId: string; score: number; feedback: string; strength?: string; improvement?: string }

type ExamResult = {
  passed:        boolean
  score:         number
  scoredAnswers: AnswerResult[]
}

// ── Single question card ──────────────────────────────────────────────────────

function QuestionCard({
  q, index, total, answer, onChange, error, result,
}: {
  q:       ExamQuestion
  index:   number
  total:   number
  answer:  string | string[]
  onChange: (val: string | string[]) => void
  error?:  string
  result?: AnswerResult
}) {
  const minW  = q.minWords ?? 60
  const wc    = typeof answer === 'string' ? wordCount(answer) : 0
  const isPassed = result ? result.score >= 7 : null

  return (
    <div style={{ background: C.surface, border: `1px solid ${result ? (isPassed ? 'rgba(76,175,80,0.2)' : 'rgba(229,115,115,0.15)') : C.border}`, padding: '28px 32px' }}>
      {/* Question header */}
      <p style={{ fontFamily: MONO, fontSize: '0.5rem', letterSpacing: '0.24em', textTransform: 'uppercase', color: C.gold, marginBottom: '10px' }}>
        {index + 1} of {total}
      </p>
      <p style={{ fontFamily: SERIF, fontSize: '1.05rem', color: C.text, lineHeight: 1.8, marginBottom: '20px' }}>
        {q.prompt}
      </p>

      {/* Open text */}
      {q.type === 'open' && (
        <>
          <textarea
            value={typeof answer === 'string' ? answer : ''}
            onChange={e => onChange(e.target.value)}
            disabled={!!result}
            placeholder={`Minimum ${minW} words…`}
            style={{
              width:     '100%',
              minHeight: '140px',
              background: '#0A0908',
              border:    `1px solid ${error ? C.red : result ? C.ghost : 'rgba(255,255,255,0.1)'}`,
              color:     result ? C.dim : C.text,
              fontFamily: SERIF,
              fontSize:  '1.05rem',
              lineHeight: 1.75,
              padding:   '14px 16px',
              resize:    'vertical',
              boxSizing: 'border-box' as const,
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
            {error && <p style={{ fontFamily: MONO, fontSize: '0.52rem', color: C.red }}>{error}</p>}
            <p style={{ fontFamily: MONO, fontSize: '0.5rem', letterSpacing: '0.08em', color: wc >= minW ? C.green : C.dim, marginLeft: 'auto' }}>
              {wc} / {minW} words
            </p>
          </div>
        </>
      )}

      {/* Multiple choice */}
      {q.type === 'multiple_choice' && q.options && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {q.options.map((opt, oi) => (
            <label key={oi} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: result ? 'default' : 'pointer' }}>
              <input
                type="radio"
                name={`q_${q.id}`}
                checked={answer === String(oi)}
                onChange={() => !result && onChange(String(oi))}
                disabled={!!result}
                style={{ accentColor: C.gold, marginTop: '3px', flexShrink: 0 }}
              />
              <span style={{ fontFamily: SERIF, fontSize: '1rem', color: C.muted, lineHeight: 1.6 }}>{opt}</span>
            </label>
          ))}
          {error && <p style={{ fontFamily: MONO, fontSize: '0.52rem', color: C.red }}>{error}</p>}
        </div>
      )}

      {/* Multiple choice multi */}
      {q.type === 'multiple_choice_multi' && q.options && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <p style={{ fontFamily: MONO, fontSize: '0.48rem', letterSpacing: '0.12em', color: C.dim, marginBottom: '4px' }}>Select all that apply.</p>
          {q.options.map((opt, oi) => {
            const selected = Array.isArray(answer) ? answer.includes(String(oi)) : false
            return (
              <label key={oi} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: result ? 'default' : 'pointer' }}>
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={e => {
                    if (result) return
                    const prev = Array.isArray(answer) ? answer : []
                    onChange(e.target.checked ? [...prev, String(oi)] : prev.filter(v => v !== String(oi)))
                  }}
                  disabled={!!result}
                  style={{ accentColor: C.gold, marginTop: '3px', flexShrink: 0 }}
                />
                <span style={{ fontFamily: SERIF, fontSize: '1rem', color: C.muted, lineHeight: 1.6 }}>{opt}</span>
              </label>
            )
          })}
          {error && <p style={{ fontFamily: MONO, fontSize: '0.52rem', color: C.red }}>{error}</p>}
        </div>
      )}

      {/* Result feedback */}
      {result && (
        <div style={{ marginTop: '20px', padding: '14px 18px', background: 'rgba(196,162,74,0.04)', borderLeft: `3px solid ${isPassed ? C.green : C.red}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <span style={{ fontFamily: MONO, fontSize: '0.58rem', letterSpacing: '0.1em', color: isPassed ? C.green : C.red }}>
              {result.score}/10
            </span>
            {result.feedback && (
              <p style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: '0.92rem', color: C.muted, lineHeight: 1.6 }}>
                {result.feedback}
              </p>
            )}
          </div>
          {result.strength && (
            <p style={{ fontFamily: MONO, fontSize: '0.48rem', letterSpacing: '0.08em', color: C.green, marginBottom: '3px' }}>
              ✓ {result.strength}
            </p>
          )}
          {result.improvement && (
            <p style={{ fontFamily: MONO, fontSize: '0.48rem', letterSpacing: '0.08em', color: C.dim }}>
              → {result.improvement}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ── Results summary ───────────────────────────────────────────────────────────

function ResultsSummary({
  result, moduleNumber, onContinue,
}: {
  result:       ExamResult
  moduleNumber: number
  onContinue:   () => void
}) {
  return (
    <div style={{ borderTop: `2px solid ${result.passed ? C.green : C.red}`, paddingTop: '52px', marginTop: '16px' }}>
      <p style={{ fontFamily: MONO, fontSize: '0.52rem', letterSpacing: '0.3em', textTransform: 'uppercase', color: result.passed ? C.green : C.red, marginBottom: '8px' }}>
        {result.passed ? 'Module Passed' : 'Not yet passed'}
      </p>
      <p style={{ fontFamily: SERIF, fontSize: 'clamp(2.2rem,5vw,3.4rem)', fontWeight: 300, color: result.passed ? C.green : C.red, lineHeight: 1, marginBottom: '20px' }}>
        {result.score} / 100
      </p>
      <p style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: '1.05rem', color: C.muted, lineHeight: 1.85, marginBottom: '36px' }}>
        {result.passed
          ? `You have passed Module ${moduleNumber}. ${moduleNumber < 3 ? `Module ${moduleNumber + 1} is now unlocked.` : 'You are now a Certified Legacy Guide.'}`
          : `You need 80 or above to pass. Review the feedback on each answer above. You may retry after 24 hours.`}
      </p>
      <button
        onClick={onContinue}
        style={{ fontFamily: MONO, fontSize: '0.62rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: result.passed ? '#0A0908' : C.dim, background: result.passed ? C.gold : 'transparent', border: result.passed ? 'none' : `1px solid ${C.border}`, padding: '16px 32px', cursor: 'pointer' }}
      >
        {result.passed ? '← BACK TO CERTIFICATION' : '← RETURN TO CERTIFICATION'}
      </button>
    </div>
  )
}

// ── Main exam component ───────────────────────────────────────────────────────

export default function ExamClient({
  archivistId, mod, moduleNumber, status,
}: {
  archivistId:  string
  mod:          CertModule
  moduleNumber: number
  status:       string
}) {
  const router = useRouter()
  const [answers,    setAnswers]    = useState<Record<string, string | string[]>>({})
  const [errors,     setErrors]     = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [grading,    setGrading]    = useState(false)
  const [result,     setResult]     = useState<ExamResult | null>(null)

  function setAnswer(id: string, val: string | string[]) {
    setAnswers(prev => ({ ...prev, [id]: val }))
    setErrors(prev => { const n = { ...prev }; delete n[id]; return n })
  }

  function validate(): boolean {
    const errs: Record<string, string> = {}
    for (const q of mod.examQuestions) {
      const ans = answers[q.id]
      if (q.type === 'open') {
        const wc  = wordCount(typeof ans === 'string' ? ans : '')
        const min = q.minWords ?? 60
        if (wc < min) errs[q.id] = `Minimum ${min} words (you wrote ${wc})`
      }
      if ((q.type === 'multiple_choice') && !ans) {
        errs[q.id] = 'Please select an answer.'
      }
      if (q.type === 'multiple_choice_multi' && (!Array.isArray(ans) || ans.length === 0)) {
        errs[q.id] = 'Please select at least one answer.'
      }
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSubmit() {
    if (!validate()) {
      // Scroll to first error
      const firstErrId = Object.keys(errors)[0]
      document.getElementById(`q_${firstErrId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }

    setSubmitting(true)
    setGrading(true)

    try {
      const payload = mod.examQuestions.map(q => {
        const raw = answers[q.id]
        let answer: string
        if (q.type === 'multiple_choice_multi') {
          answer = JSON.stringify(Array.isArray(raw) ? raw.map(Number) : [])
        } else {
          answer = typeof raw === 'string' ? raw : ''
        }
        return { questionId: q.id, answer, type: q.type }
      })

      const res  = await fetch('/api/archivist/submit-exam', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ archivistId, moduleNumber, answers: payload }),
      })
      const data = await res.json()
      if (res.ok) setResult(data)
    } catch (e) {
      console.error(e)
    } finally {
      setSubmitting(false)
      setGrading(false)
    }
  }

  const allAnswered = mod.examQuestions.every(q => {
    const ans = answers[q.id]
    if (q.type === 'open') return wordCount(typeof ans === 'string' ? ans : '') >= (q.minWords ?? 60)
    if (q.type === 'multiple_choice') return !!ans
    if (q.type === 'multiple_choice_multi') return Array.isArray(ans) && ans.length > 0
    return false
  })

  // Map results by questionId
  const resultMap = result
    ? Object.fromEntries((result.scoredAnswers ?? []).map(a => [a.questionId, a]))
    : {}

  return (
    <div style={{ background: C.bg, minHeight: '100vh' }}>

      {/* Header */}
      <div style={{ borderBottom: `1px solid ${C.border}`, padding: '18px 0' }}>
        <div style={{ maxWidth: '720px', margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <a href={`/archivist/certification/${moduleNumber}`} style={{ fontFamily: MONO, fontSize: '0.5rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: C.dim, textDecoration: 'none' }}>
            ← Back to Module
          </a>
          <p style={{ fontFamily: MONO, fontSize: '0.5rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: C.gold }}>
            Module {moduleNumber} · Exam
          </p>
        </div>
      </div>

      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '52px 24px 80px' }}>

        {/* Exam header */}
        {!result && (
          <div style={{ marginBottom: '52px' }}>
            <h1 style={{ fontFamily: SERIF, fontSize: 'clamp(1.6rem,3vw,2.2rem)', fontWeight: 300, fontStyle: 'italic', color: C.text, marginBottom: '12px' }}>
              {mod.title}
            </h1>
            <p style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: '1.0rem', color: C.dim, lineHeight: 1.8 }}>
              {mod.examQuestions.length} questions. Passing score: {mod.passingScore}. Open-text answers are graded by Claude on understanding, clarity, and the ability to explain concepts to a real family. Specific answers score higher than generic ones.
            </p>
          </div>
        )}

        {/* Grading loading */}
        {grading && (
          <div style={{ padding: '52px 0', textAlign: 'center' }}>
            <p style={{ fontFamily: MONO, fontSize: '0.6rem', letterSpacing: '0.28em', textTransform: 'uppercase', color: C.gold, marginBottom: '12px', animation: 'pulse 1.5s ease-in-out infinite' }}>
              Grading your answers…
            </p>
            <p style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: '0.95rem', color: C.dim }}>
              Claude is reading your responses. This takes about 30 seconds.
            </p>
          </div>
        )}

        {/* Questions */}
        {!grading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {mod.examQuestions.map((q, i) => (
              <div key={q.id} id={`q_${q.id}`}>
                <QuestionCard
                  q={q}
                  index={i}
                  total={mod.examQuestions.length}
                  answer={answers[q.id] ?? (q.type === 'multiple_choice_multi' ? [] : '')}
                  onChange={val => setAnswer(q.id, val)}
                  error={errors[q.id]}
                  result={result ? resultMap[q.id] : undefined}
                />
              </div>
            ))}
          </div>
        )}

        {/* Submit */}
        {!result && !grading && (
          <div style={{ marginTop: '40px' }}>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              style={{ fontFamily: MONO, fontSize: '0.7rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#0A0908', background: submitting ? 'rgba(196,162,74,0.5)' : C.gold, border: 'none', padding: '18px 44px', cursor: submitting ? 'not-allowed' : 'pointer', display: 'block' }}
            >
              {submitting ? 'Grading your answers…' : 'SUBMIT EXAM →'}
            </button>
            {!allAnswered && (
              <p style={{ fontFamily: MONO, fontSize: '0.5rem', letterSpacing: '0.1em', color: C.dim, marginTop: '12px' }}>
                Answer all questions before submitting.
              </p>
            )}
          </div>
        )}

        {/* Results */}
        {result && !grading && (
          <ResultsSummary
            result={result}
            moduleNumber={moduleNumber}
            onContinue={() => router.push('/archivist/certification')}
          />
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  )
}
