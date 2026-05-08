'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { CertModule, Section } from '@/lib/certificationContent'

const MONO  = '"Space Mono", "Courier New", monospace'
const SERIF = '"Cormorant Garamond", Georgia, serif'

const C = {
  bg:         '#0A0908',
  surface:    '#111110',
  border:     'rgba(255,255,255,0.06)',
  borderGold: 'rgba(196,162,74,0.22)',
  gold:       '#C4A24A',
  text:       '#F0EDE6',
  muted:      '#9DA3A8',
  dim:        '#5C6166',
  ghost:      '#3A3F44',
  green:      '#4CAF50',
}

function wordCount(s: string) {
  return s.trim().split(/\s+/).filter(Boolean).length
}

// ── Progress bar ──────────────────────────────────────────────────────────────

function ProgressBar({ current, total }: { current: number; total: number }) {
  const pct = total > 0 ? Math.min(Math.round((current / total) * 100), 100) : 0
  return (
    <div style={{ position: 'sticky', top: 0, zIndex: 20, background: C.bg, borderBottom: `1px solid ${C.border}`, padding: '12px 0' }}>
      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '0 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '7px' }}>
          <p style={{ fontFamily: MONO, fontSize: '0.5rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: C.dim }}>Reading progress</p>
          <p style={{ fontFamily: MONO, fontSize: '0.5rem', letterSpacing: '0.12em', color: C.dim }}>{current} / {total} sections</p>
        </div>
        <div style={{ height: '3px', background: C.border, borderRadius: '2px' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: C.gold, borderRadius: '2px', transition: 'width 0.5s ease' }} />
        </div>
      </div>
    </div>
  )
}

// ── Inline question ───────────────────────────────────────────────────────────

function InlineQuestion({
  question, onComplete,
}: {
  question:   NonNullable<Section['inlineQuestion']>
  onComplete: (answer: string) => void
}) {
  const [answer,   setAnswer]   = useState('')
  const [done,     setDone]     = useState(false)

  const min   = question.minWords ?? 50
  const wc    = wordCount(answer)
  const ready = question.type === 'textarea' ? wc >= min : !!answer

  function handleContinue() {
    if (!ready || done) return
    setDone(true)
    onComplete(answer)
  }

  return (
    <div style={{ margin: '40px 0 8px', padding: '28px 32px', background: 'rgba(196,162,74,0.03)', border: `1px solid ${C.borderGold}`, borderLeft: `3px solid ${C.gold}` }}>
      <p style={{ fontFamily: MONO, fontSize: '0.5rem', letterSpacing: '0.28em', textTransform: 'uppercase', color: C.gold, marginBottom: '12px' }}>
        Before continuing
      </p>
      <p style={{ fontFamily: SERIF, fontSize: '1.05rem', fontStyle: 'italic', color: C.text, lineHeight: 1.85, marginBottom: '20px' }}>
        {question.prompt}
      </p>

      {question.type === 'textarea' && (
        <>
          <textarea
            value={answer}
            onChange={e => setAnswer(e.target.value)}
            disabled={done}
            placeholder={question.placeholder ?? 'Write your response here…'}
            style={{
              width:        '100%',
              minHeight:    '120px',
              background:   '#0A0908',
              border:       `1px solid ${done ? C.ghost : 'rgba(255,255,255,0.1)'}`,
              color:        done ? C.dim : C.text,
              fontFamily:   SERIF,
              fontSize:     '1.05rem',
              lineHeight:   1.75,
              padding:      '14px 16px',
              resize:       'vertical',
              boxSizing:    'border-box' as const,
              marginBottom: '10px',
            }}
          />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
            <p style={{ fontFamily: MONO, fontSize: '0.5rem', letterSpacing: '0.1em', color: wc >= min ? C.green : C.dim }}>
              {wc} / {min} words minimum
            </p>
            {done ? (
              <p style={{ fontFamily: MONO, fontSize: '0.5rem', letterSpacing: '0.14em', color: C.green }}>✓ Saved</p>
            ) : (
              <button
                onClick={handleContinue}
                disabled={!ready}
                style={{ fontFamily: MONO, fontSize: '0.58rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: ready ? '#0A0908' : C.ghost, background: ready ? C.gold : C.border, border: 'none', padding: '10px 22px', cursor: ready ? 'pointer' : 'not-allowed', transition: 'all 0.15s' }}
              >
                Save and Continue →
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}

// ── Content section ───────────────────────────────────────────────────────────

function ContentSection({
  section, visible, isNew, onQuestionComplete,
}: {
  section:             Section
  visible:             boolean
  isNew:               boolean
  onQuestionComplete:  (id: string, answer: string) => void
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isNew && ref.current) {
      setTimeout(() => ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120)
    }
  }, [isNew])

  if (!visible) return null

  const paragraphs = section.content.split('\n\n').filter(Boolean)

  return (
    <div ref={ref} style={{ marginBottom: '60px', animation: isNew ? 'sectionReveal 0.7s ease forwards' : 'none' }}>
      <p style={{ fontFamily: MONO, fontSize: '0.44rem', letterSpacing: '0.32em', textTransform: 'uppercase', color: C.gold, marginBottom: '16px' }}>
        {section.title}
      </p>
      {paragraphs.map((para, i) => (
        <p key={i} style={{ fontFamily: SERIF, fontSize: '1.1rem', lineHeight: 1.9, color: C.muted, marginBottom: '20px' }}>
          {para}
        </p>
      ))}
      {section.inlineQuestion && (
        <InlineQuestion
          question={section.inlineQuestion}
          onComplete={answer => onQuestionComplete(section.inlineQuestion!.id, answer)}
        />
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ModuleClient({
  archivistId, mod, status, moduleNumber,
}: {
  archivistId:  string
  mod:          CertModule
  status:       string
  moduleNumber: number
}) {
  const router = useRouter()

  // how many sections are currently visible (grows as questions are answered)
  const [visibleCount, setVisibleCount]   = useState(1)
  const [newIdx,       setNewIdx]         = useState(-1)  // which section just appeared
  const [answers,      setAnswers]        = useState<Record<string, string>>({})
  const [showExamCta,  setShowExamCta]    = useState(false)

  const totalSections = mod.sections.length

  // Determine if a section is "gated" by an inline question
  // A section reveals the next section only once its inline question is answered
  function handleQuestionComplete(qId: string, answer: string) {
    setAnswers(prev => ({ ...prev, [qId]: answer }))

    const next = visibleCount
    if (next < totalSections) {
      setNewIdx(next)
      setVisibleCount(next + 1)
    } else {
      setShowExamCta(true)
    }
  }

  // A section with NO inline question auto-unlocks the next section when it becomes visible
  useEffect(() => {
    if (visibleCount > totalSections) return
    const currentSection = mod.sections[visibleCount - 1]
    if (currentSection && !currentSection.inlineQuestion) {
      // If the currently last-revealed section has no question, unlock the next one automatically
      const timer = setTimeout(() => {
        if (visibleCount < totalSections) {
          setNewIdx(visibleCount)
          setVisibleCount(v => v + 1)
        } else {
          setShowExamCta(true)
        }
      }, 600) // small delay so reader sees the section before it auto-advances
      return () => clearTimeout(timer)
    }
  }, [visibleCount, mod.sections, totalSections])

  const isPassed = status === 'passed'

  return (
    <div style={{ background: C.bg, minHeight: '100vh' }}>
      <style>{`
        @keyframes sectionReveal {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <ProgressBar current={visibleCount} total={totalSections} />

      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '52px 24px 80px' }}>

        {/* Back link */}
        <a href="/archivist/certification" style={{ fontFamily: MONO, fontSize: '0.5rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: C.dim, textDecoration: 'none', display: 'inline-block', marginBottom: '32px' }}>
          ← Certification
        </a>

        {/* Module header */}
        <div style={{ marginBottom: '60px' }}>
          <p style={{ fontFamily: MONO, fontSize: '0.5rem', letterSpacing: '0.3em', textTransform: 'uppercase', color: C.dim, marginBottom: '10px' }}>
            Module {moduleNumber} · {mod.estimatedMinutes} minutes
          </p>
          <h1 style={{ fontFamily: SERIF, fontSize: 'clamp(1.8rem,4vw,2.7rem)', fontWeight: 300, fontStyle: 'italic', color: C.text, lineHeight: 1.15, marginBottom: '14px' }}>
            {mod.title}
          </h1>
          <p style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: '1.1rem', color: C.dim, lineHeight: 1.75 }}>
            {mod.subtitle}
          </p>
          {isPassed && (
            <p style={{ fontFamily: MONO, fontSize: '0.5rem', letterSpacing: '0.2em', color: C.green, marginTop: '14px' }}>✓ You have passed this module</p>
          )}
        </div>

        {/* Sections */}
        {mod.sections.map((section, i) => (
          <ContentSection
            key={section.id}
            section={section}
            visible={i < visibleCount}
            isNew={i === newIdx}
            onQuestionComplete={handleQuestionComplete}
          />
        ))}

        {/* Proceed to exam */}
        {showExamCta && !isPassed && (
          <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: '48px', animation: 'sectionReveal 0.7s ease forwards' }}>
            <p style={{ fontFamily: MONO, fontSize: '0.5rem', letterSpacing: '0.3em', textTransform: 'uppercase', color: C.gold, marginBottom: '10px' }}>
              Reading complete
            </p>
            <p style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: '1.05rem', color: C.muted, lineHeight: 1.8, marginBottom: '28px' }}>
              You have read all sections of Module {moduleNumber}. Proceed to the exam when you are ready. The exam has {mod.examQuestions.length} questions and requires a score of {mod.passingScore} or above to pass.
            </p>
            <button
              onClick={() => router.push(`/archivist/certification/${moduleNumber}/exam`)}
              style={{ fontFamily: MONO, fontSize: '0.68rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#0A0908', background: C.gold, border: 'none', padding: '18px 40px', cursor: 'pointer' }}
            >
              PROCEED TO EXAM →
            </button>
          </div>
        )}

        {/* Passed — exam CTA for review */}
        {isPassed && showExamCta && (
          <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: '40px' }}>
            <p style={{ fontFamily: MONO, fontSize: '0.5rem', letterSpacing: '0.2em', color: C.green, marginBottom: '12px' }}>✓ Module Passed</p>
            <a href="/archivist/certification" style={{ fontFamily: MONO, fontSize: '0.6rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: C.dim, textDecoration: 'none', border: `1px solid ${C.border}`, padding: '12px 24px', display: 'inline-block' }}>
              ← Back to Certification
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
