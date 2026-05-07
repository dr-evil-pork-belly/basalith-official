'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { ModuleContent, Section, ExamQuestion } from '@/lib/certificationContent'

const C = {
  bg:      '#0A0908',
  surface: '#111110',
  border:  'rgba(255,255,255,0.06)',
  borderGold: 'rgba(196,162,74,0.2)',
  gold:    '#C4A24A',
  text:    '#F0EDE6',
  muted:   '#9DA3A8',
  dim:     '#5C6166',
  ghost:   '#3A3F44',
  green:   '#4CAF50',
  red:     '#E57373',
}

const bodyFont  = '"Cormorant Garamond", "Georgia", serif'
const monoFont  = '"Space Mono", "Courier New", monospace'

function wordCount(s: string) {
  return s.trim().split(/\s+/).filter(Boolean).length
}

// ── Progress bar ──────────────────────────────────────────────────────────────

function ProgressBar({ current, total }: { current: number; total: number }) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0
  return (
    <div style={{ position: 'sticky', top: 0, zIndex: 10, background: C.bg, borderBottom: `1px solid ${C.border}`, padding: '14px 0' }}>
      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '0 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <p style={{ fontFamily: monoFont, fontSize: '0.55rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: C.dim }}>
            Progress
          </p>
          <p style={{ fontFamily: monoFont, fontSize: '0.55rem', letterSpacing: '0.14em', color: C.dim }}>
            {current} of {total}
          </p>
        </div>
        <div style={{ height: '2px', background: C.border, borderRadius: '1px' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: C.gold, borderRadius: '1px', transition: 'width 0.5s ease' }} />
        </div>
      </div>
    </div>
  )
}

// ── Inline question ───────────────────────────────────────────────────────────

function InlineQuestion({
  question, onUnlock, sectionId,
}: {
  question: NonNullable<Section['inlineQuestion']>
  onUnlock: (qId: string, answer: string) => void
  sectionId: string
}) {
  const [answer,  setAnswer]  = useState('')
  const [unlocked, setUnlocked] = useState(false)
  const words = wordCount(answer)
  const min   = question.minWords ?? 50
  const ready = question.type === 'textarea' ? words >= min : !!answer

  function handleUnlock() {
    if (!ready || unlocked) return
    setUnlocked(true)
    onUnlock(question.id, answer)
  }

  return (
    <div style={{ margin: '40px 0', padding: '28px', background: 'rgba(196,162,74,0.04)', border: `1px solid ${C.borderGold}`, borderLeft: `3px solid ${C.gold}` }}>
      <p style={{ fontFamily: monoFont, fontSize: '0.56rem', letterSpacing: '0.26em', textTransform: 'uppercase', color: C.gold, marginBottom: '12px' }}>
        Before continuing
      </p>
      <p style={{ fontFamily: bodyFont, fontSize: '1.05rem', fontStyle: 'italic', color: C.text, lineHeight: 1.8, marginBottom: '20px' }}>
        {question.prompt}
      </p>

      {question.type === 'textarea' && (
        <>
          <textarea
            value={answer}
            onChange={e => setAnswer(e.target.value)}
            disabled={unlocked}
            placeholder="Write your response here…"
            style={{
              width:       '100%',
              minHeight:   '120px',
              background:  '#0A0908',
              border:      `1px solid ${unlocked ? C.ghost : 'rgba(255,255,255,0.1)'}`,
              color:       unlocked ? C.dim : C.text,
              fontFamily:  bodyFont,
              fontSize:    '1.0rem',
              lineHeight:  1.7,
              padding:     '14px',
              resize:      'vertical',
              boxSizing:   'border-box' as const,
              marginBottom: '10px',
            }}
          />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ fontFamily: monoFont, fontSize: '0.56rem', letterSpacing: '0.1em', color: words >= min ? C.green : C.dim }}>
              {words} / {min} words minimum
            </p>
            {!unlocked && (
              <button
                onClick={handleUnlock}
                disabled={!ready}
                style={{ fontFamily: monoFont, fontSize: '0.6rem', letterSpacing: '0.16em', textTransform: 'uppercase', color: ready ? '#0A0908' : C.ghost, background: ready ? C.gold : C.border, border: 'none', padding: '10px 20px', cursor: ready ? 'pointer' : 'not-allowed', transition: 'all 0.15s' }}
              >
                Continue →
              </button>
            )}
            {unlocked && <p style={{ fontFamily: monoFont, fontSize: '0.6rem', letterSpacing: '0.14em', color: C.green }}>✓ Saved</p>}
          </div>
        </>
      )}

      {question.type === 'mc' && question.options && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
          {question.options.map(opt => (
            <label key={opt.value} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: unlocked ? 'default' : 'pointer' }}>
              <input
                type="radio"
                name={`inline_${sectionId}`}
                value={opt.value}
                checked={answer === opt.value}
                onChange={() => !unlocked && setAnswer(opt.value)}
                disabled={unlocked}
                style={{ accentColor: C.gold, marginTop: '3px', flexShrink: 0 }}
              />
              <span style={{ fontFamily: bodyFont, fontSize: '1.0rem', color: C.muted, lineHeight: 1.6 }}>{opt.text}</span>
            </label>
          ))}
          {!unlocked && (
            <button
              onClick={handleUnlock}
              disabled={!ready}
              style={{ alignSelf: 'flex-start', fontFamily: monoFont, fontSize: '0.6rem', letterSpacing: '0.16em', textTransform: 'uppercase', color: ready ? '#0A0908' : C.ghost, background: ready ? C.gold : C.border, border: 'none', padding: '10px 20px', cursor: ready ? 'pointer' : 'not-allowed', marginTop: '8px' }}
            >
              Continue →
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ── Content section ───────────────────────────────────────────────────────────

function ContentSection({
  section, visible, onUnlock, isLast,
}: {
  section:  Section
  visible:  boolean
  onUnlock: (qId: string, answer: string) => void
  isLast:   boolean
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (visible && ref.current) {
      setTimeout(() => ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80)
    }
  }, [visible])

  if (!visible) return null

  const paragraphs = section.content.split('\n\n').filter(Boolean)

  return (
    <div ref={ref} style={{ marginBottom: '64px', animation: 'fadeIn 0.6s ease' }}>
      {/* Section title */}
      <h2 style={{ fontFamily: bodyFont, fontSize: 'clamp(1.3rem,2.5vw,1.7rem)', fontWeight: 300, fontStyle: 'italic', color: C.text, lineHeight: 1.3, marginBottom: '28px', paddingTop: '16px', borderTop: `1px solid ${C.border}` }}>
        {section.title}
      </h2>

      {/* Body text */}
      {paragraphs.map((para, i) => (
        <p
          key={i}
          style={{
            fontFamily:   bodyFont,
            fontSize:     '1.1rem',
            lineHeight:   1.9,
            color:        C.muted,
            marginBottom: '20px',
          }}
        >
          {para}
        </p>
      ))}

      {/* Inline question — gates the next section */}
      {section.inlineQuestion && (
        <InlineQuestion
          question={section.inlineQuestion}
          onUnlock={onUnlock}
          sectionId={section.id}
        />
      )}
    </div>
  )
}

// ── Exam ──────────────────────────────────────────────────────────────────────

function ExamForm({
  questions, archivistId, moduleNumber, onComplete,
}: {
  questions:    ExamQuestion[]
  archivistId:  string
  moduleNumber: number
  onComplete:   (result: { passed: boolean; score: number; scoredAnswers: Array<{ questionId: string; score: number; feedback: string }> }) => void
}) {
  const [answers,    setAnswers]    = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [errors,     setErrors]     = useState<Record<string, string>>({})

  function handleText(id: string, val: string) {
    setAnswers(p => ({ ...p, [id]: val }))
    setErrors(p => { const n = { ...p }; delete n[id]; return n })
  }

  function handleMC(id: string, val: string) {
    setAnswers(p => ({ ...p, [id]: val }))
  }

  async function handleSubmit() {
    const errs: Record<string, string> = {}
    for (const q of questions) {
      if (q.type === 'text') {
        const minW = q.minWords ?? 60
        const wc   = wordCount(answers[q.id] ?? '')
        if (wc < minW) errs[q.id] = `Minimum ${minW} words (you wrote ${wc})`
      }
      if (q.type === 'mc' && !answers[q.id]) errs[q.id] = 'Please select an answer.'
    }
    if (Object.keys(errs).length) { setErrors(errs); return }

    setSubmitting(true)
    try {
      const payload = questions.map(q => ({
        questionId: q.id,
        answer:     answers[q.id] ?? '',
        type:       q.type as 'text' | 'mc',
      }))

      const res  = await fetch('/api/archivist/submit-exam', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ archivistId, moduleNumber, answers: payload }),
      })
      const data = await res.json()
      if (res.ok) onComplete(data)
    } catch (e) {
      console.error(e)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ borderTop: `2px solid ${C.gold}`, paddingTop: '48px' }}>
      <p style={{ fontFamily: monoFont, fontSize: '0.58rem', letterSpacing: '0.3em', textTransform: 'uppercase', color: C.gold, marginBottom: '8px' }}>
        Module Exam
      </p>
      <h2 style={{ fontFamily: bodyFont, fontSize: 'clamp(1.4rem,2.5vw,1.9rem)', fontWeight: 300, color: C.text, marginBottom: '10px' }}>
        {questions.length} questions. Passing score: 80.
      </h2>
      <p style={{ fontFamily: bodyFont, fontStyle: 'italic', fontSize: '1rem', color: C.dim, lineHeight: 1.7, marginBottom: '48px' }}>
        Open-text answers are scored by Claude on accuracy, clarity, and the ability to explain to a real family. Be genuine. Specific answers score higher than generic ones.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
        {questions.map((q, qi) => (
          <div key={q.id} style={{ background: C.surface, border: `1px solid ${C.border}`, padding: '24px 28px' }}>
            <p style={{ fontFamily: monoFont, fontSize: '0.56rem', letterSpacing: '0.2em', color: C.dim, marginBottom: '10px' }}>
              {qi + 1} of {questions.length}
            </p>
            <p style={{ fontFamily: bodyFont, fontSize: '1.05rem', color: C.text, lineHeight: 1.75, marginBottom: '16px' }}>
              {q.prompt}
            </p>

            {q.type === 'text' && (
              <>
                <textarea
                  value={answers[q.id] ?? ''}
                  onChange={e => handleText(q.id, e.target.value)}
                  placeholder={`Minimum ${q.minWords} words…`}
                  style={{ width: '100%', minHeight: '130px', background: '#0A0908', border: `1px solid ${errors[q.id] ? C.red : 'rgba(255,255,255,0.08)'}`, color: C.text, fontFamily: bodyFont, fontSize: '1rem', lineHeight: 1.7, padding: '12px 14px', resize: 'vertical', boxSizing: 'border-box' as const }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
                  {errors[q.id] && <p style={{ fontFamily: monoFont, fontSize: '0.58rem', color: C.red }}>{errors[q.id]}</p>}
                  <p style={{ fontFamily: monoFont, fontSize: '0.56rem', color: C.dim, marginLeft: 'auto' }}>
                    {wordCount(answers[q.id] ?? '')} / {q.minWords}
                  </p>
                </div>
              </>
            )}

            {q.type === 'mc' && q.options && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {q.options.map(opt => (
                  <label key={opt.value} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
                    <input type="radio" name={q.id} value={opt.value} checked={answers[q.id] === opt.value} onChange={() => handleMC(q.id, opt.value)} style={{ accentColor: C.gold, marginTop: '3px', flexShrink: 0 }} />
                    <span style={{ fontFamily: bodyFont, fontSize: '1rem', color: C.muted, lineHeight: 1.6 }}>{opt.text}</span>
                  </label>
                ))}
                {errors[q.id] && <p style={{ fontFamily: monoFont, fontSize: '0.58rem', color: C.red, marginTop: '4px' }}>{errors[q.id]}</p>}
              </div>
            )}
          </div>
        ))}
      </div>

      <button
        onClick={handleSubmit}
        disabled={submitting}
        style={{ marginTop: '40px', fontFamily: monoFont, fontSize: '0.72rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#0A0908', background: submitting ? 'rgba(196,162,74,0.5)' : C.gold, border: 'none', padding: '18px 36px', cursor: submitting ? 'not-allowed' : 'pointer' }}
      >
        {submitting ? 'Scoring with Claude…' : 'Submit Exam →'}
      </button>
    </div>
  )
}

// ── Results ───────────────────────────────────────────────────────────────────

function ExamResults({
  result, moduleNumber, onContinue,
}: {
  result:       { passed: boolean; score: number; scoredAnswers: Array<{ questionId: string; score: number; feedback: string }> }
  moduleNumber: number
  onContinue:   () => void
}) {
  return (
    <div style={{ borderTop: `2px solid ${result.passed ? C.green : C.red}`, paddingTop: '48px' }}>
      <p style={{ fontFamily: monoFont, fontSize: '0.58rem', letterSpacing: '0.3em', textTransform: 'uppercase', color: result.passed ? C.green : C.red, marginBottom: '8px' }}>
        {result.passed ? 'Module Passed' : 'Not yet passed'}
      </p>
      <p style={{ fontFamily: bodyFont, fontSize: 'clamp(2rem,4vw,3rem)', fontWeight: 300, color: result.passed ? C.green : C.red, lineHeight: 1, marginBottom: '20px' }}>
        {result.score} / 100
      </p>
      <p style={{ fontFamily: bodyFont, fontStyle: 'italic', fontSize: '1.05rem', color: C.muted, lineHeight: 1.8, marginBottom: '32px' }}>
        {result.passed
          ? `You have passed Module ${moduleNumber}. ${moduleNumber < 3 ? 'Module ' + (moduleNumber + 1) + ' is now unlocked.' : 'You are now a Certified Legacy Guide.'}`
          : 'You need 80 or above to pass. Review the feedback below and retry in 24 hours.'}
      </p>

      {result.scoredAnswers?.filter(a => a.feedback && !['Correct.', 'Incorrect.'].includes(a.feedback)).length > 0 && (
        <div style={{ marginBottom: '32px' }}>
          <p style={{ fontFamily: monoFont, fontSize: '0.56rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: C.dim, marginBottom: '16px' }}>Feedback</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {result.scoredAnswers.filter(a => a.feedback && !['Correct.', 'Incorrect.'].includes(a.feedback)).map(a => (
              <div key={a.questionId} style={{ padding: '12px 16px', background: C.surface, border: `1px solid ${C.border}`, display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <span style={{ fontFamily: monoFont, fontSize: '0.6rem', color: a.score >= 7 ? C.green : a.score >= 5 ? C.gold : C.red, flexShrink: 0, paddingTop: '2px' }}>{a.score}/10</span>
                <p style={{ fontFamily: bodyFont, fontStyle: 'italic', fontSize: '0.95rem', color: C.muted, lineHeight: 1.6 }}>{a.feedback}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={onContinue}
        style={{ fontFamily: monoFont, fontSize: '0.65rem', letterSpacing: '0.16em', textTransform: 'uppercase', background: result.passed ? C.gold : C.surface, border: result.passed ? 'none' : `1px solid ${C.border}`, color: result.passed ? '#0A0908' : C.dim, padding: '14px 28px', cursor: 'pointer' }}
      >
        {result.passed ? '← Back to Certification' : '← Return to Certification'}
      </button>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ModuleClient({
  archivistId, mod, status,
}: {
  archivistId: string
  mod:         ModuleContent
  status:      string
}) {
  const router = useRouter()

  // `unlockedCount` = how many sections are currently visible (1-indexed)
  const [unlockedCount, setUnlockedCount] = useState(1)
  const [inlineAnswers, setInlineAnswers] = useState<Record<string, string>>({})
  const [showExam,      setShowExam]      = useState(false)
  const [examResult,    setExamResult]    = useState<{ passed: boolean; score: number; scoredAnswers: Array<{ questionId: string; score: number; feedback: string }> } | null>(null)

  const totalSections = mod.sections.length
  // Progress: sections unlocked + (exam shown ? 1 : 0) + (exam done ? 1 : 0)
  const examStep      = showExam ? 1 : 0
  const resultStep    = examResult ? 1 : 0
  const progressNow   = unlockedCount + examStep + resultStep
  const progressTotal = totalSections + 2  // sections + exam + result

  function handleSectionUnlock(qId: string, answer: string) {
    setInlineAnswers(prev => ({ ...prev, [qId]: answer }))
    setUnlockedCount(prev => Math.min(prev + 1, totalSections))
  }

  // Watch if all sections are unlocked — then show exam after a beat
  useEffect(() => {
    if (unlockedCount >= totalSections) {
      // Check that all sections with inline questions have been answered
      const needsAnswer = mod.sections
        .filter(s => s.inlineQuestion)
        .some(s => !inlineAnswers[s.inlineQuestion!.id])
      if (!needsAnswer) {
        setTimeout(() => setShowExam(true), 400)
      }
    }
  }, [unlockedCount, inlineAnswers, mod.sections, totalSections])

  return (
    <div style={{ background: C.bg, minHeight: '100vh' }}>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Progress bar */}
      <ProgressBar current={progressNow} total={progressTotal} />

      {/* Module header */}
      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '56px 24px 0' }}>
        <div style={{ marginBottom: '56px' }}>
          <a
            href="/archivist/certification"
            style={{ fontFamily: monoFont, fontSize: '0.56rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: C.dim, textDecoration: 'none', display: 'inline-block', marginBottom: '28px' }}
          >
            ← Certification
          </a>
          <p style={{ fontFamily: monoFont, fontSize: '0.56rem', letterSpacing: '0.28em', textTransform: 'uppercase', color: C.dim, marginBottom: '12px' }}>
            Module {mod.number} · {mod.estimatedMinutes} minutes
          </p>
          <h1 style={{ fontFamily: bodyFont, fontSize: 'clamp(1.8rem,4vw,2.6rem)', fontWeight: 300, fontStyle: 'italic', color: C.text, lineHeight: 1.2, marginBottom: '16px' }}>
            {mod.title}
          </h1>
          <p style={{ fontFamily: bodyFont, fontSize: '1.1rem', fontStyle: 'italic', color: C.dim, lineHeight: 1.7 }}>
            {mod.subtitle}
          </p>
          {status === 'passed' && (
            <p style={{ fontFamily: monoFont, fontSize: '0.56rem', letterSpacing: '0.2em', color: C.green, marginTop: '12px' }}>
              ✓ You have passed this module
            </p>
          )}
        </div>

        {/* Sections */}
        {!examResult && (
          <>
            {mod.sections.map((section, i) => {
              // Section i is visible if i < unlockedCount
              const visible     = i < unlockedCount
              // A section needs the previous section's inline question answered to be shown
              // Actually: section 0 always visible, section i visible if i < unlockedCount

              // Does this section have an inline question that hasn't been answered yet?
              const hasQ        = !!section.inlineQuestion
              const qAnswered   = hasQ ? !!inlineAnswers[section.inlineQuestion!.id] : true

              // Handler: when this section's inline question is answered, unlock the next section
              function handleUnlock(qId: string, answer: string) {
                handleSectionUnlock(qId, answer)
              }

              return (
                <ContentSection
                  key={section.id}
                  section={section}
                  visible={visible}
                  onUnlock={handleUnlock}
                  isLast={i === mod.sections.length - 1}
                />
              )
            })}
          </>
        )}

        {/* Exam */}
        {showExam && !examResult && (
          <ExamForm
            questions={mod.examQuestions}
            archivistId={archivistId}
            moduleNumber={mod.number}
            onComplete={result => {
              setExamResult(result)
              setShowExam(false)
            }}
          />
        )}

        {/* Results */}
        {examResult && (
          <ExamResults
            result={examResult}
            moduleNumber={mod.number}
            onContinue={() => router.push('/archivist/certification')}
          />
        )}

        <div style={{ height: '80px' }} />
      </div>
    </div>
  )
}
