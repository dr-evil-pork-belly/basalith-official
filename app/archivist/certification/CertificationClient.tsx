'use client'

import { useState, useEffect } from 'react'

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

// ── Question definitions ─────────────────────────────────────────────────────

const MODULE_1_QUESTIONS = [
  { id: 'm1_q1',  type: 'text', min: 100, label: '1. In your own words, explain the difference between a generative AI chatbot and a Basalith entity.' },
  { id: 'm1_q2',  type: 'text', min: 80,  label: "2. A prospective client asks: 'Is this just like ChatGPT but with my family's photos?' How do you respond?" },
  { id: 'm1_q3',  type: 'mc',   label: '3. What is the primary purpose of the archive?', options: [
    { value: 'a', text: 'To preserve family photographs' },
    { value: 'b', text: 'To create a training dataset for a person-specific AI model' },
    { value: 'c', text: 'To store voice recordings' },
    { value: 'd', text: 'To generate AI responses' },
  ]},
  { id: 'm1_q4',  type: 'mc',   label: '4. When does a Basalith entity become meaningfully accurate?', options: [
    { value: 'a', text: 'Immediately after the founding session' },
    { value: 'b', text: 'After 30 days' },
    { value: 'c', text: 'After 500+ quality training pairs accumulated over time' },
    { value: 'd', text: 'After the owner dies' },
  ]},
  { id: 'm1_q5',  type: 'text', min: 80,  label: '5. What makes Basalith different from a memory preservation service?' },
  { id: 'm1_q6',  type: 'text', min: 60,  label: "6. Explain the Basalith positioning around wealth and legacy AI in your own words, without using the word 'billionaire'." },
  { id: 'm1_q7',  type: 'mc',   label: '7. What is a training pair?', options: [
    { value: 'a', text: 'Two family members who both contribute to the archive' },
    { value: 'b', text: 'A prompt and completion pair used to fine-tune a language model' },
    { value: 'c', text: 'Two photographs from the same era' },
    { value: 'd', text: 'A guide and their client' },
  ]},
  { id: 'm1_q8',  type: 'text', min: 80,  label: "8. A client asks: 'Will the entity sound exactly like me immediately?' What do you tell them?" },
  { id: 'm1_q9',  type: 'text', min: 100, label: '9. What are the three doors of the Basalith homepage and why does each door exist?' },
  { id: 'm1_q10', type: 'text', min: 60,  label: '10. Why is the founding fee non-negotiable?' },
]

const MODULE_2_QUESTIONS = [
  { id: 'm2_q1', type: 'text', min: 100, label: '1. A client begins crying when describing their spouse. You are 20 minutes into the session. What do you do?' },
  { id: 'm2_q2', type: 'text', min: 100, label: '2. The client keeps giving short one-sentence answers. How do you draw out longer, richer responses without making them feel interrogated?' },
  { id: 'm2_q3', type: 'text', min: 80,  label: "3. The client says: 'I don't think I have anything interesting to say. My life has been pretty ordinary.' How do you respond?" },
  { id: 'm2_q4', type: 'text', min: 80,  label: '4. You are 75 minutes in and realize you have 15 minutes left but have not covered professional philosophy or core values. What do you do?' },
  { id: 'm2_q5', type: 'text', min: 60,  label: "5. A client's adult child calls halfway through the session and the client wants to take the call. How do you handle this?" },
  { id: 'm2_q6', type: 'text', min: 200, label: '6. Write the opening 5 minutes of a founding session in script form. Include what you say, how you position the product, and how you open the first question.' },
  { id: 'm2_q7', type: 'text', min: 80,  label: "7. A client asks: 'What happens to all this data if Basalith shuts down?' What do you tell them?" },
  { id: 'm2_q8', type: 'text', min: 100, label: '8. How do you close the founding session in a way that motivates the client to continue contributing after you leave?' },
]

const MODULE_3_QUESTIONS = [
  { id: 'm3_q1', type: 'text', min: 80,  label: '1. Walk through the steps to submit a new client for review after a successful founding session.' },
  { id: 'm3_q2', type: 'text', min: 80,  label: "2. A client's contributor portal link is not working. What are the three most likely causes and how do you resolve each?" },
  { id: 'm3_q3', type: 'mc_multi', label: "3. What information can you see in the guide dashboard about a client's archive content? Select all that apply.", options: [
    { value: 'm3_q3_a', text: 'Number of photographs uploaded' },
    { value: 'm3_q3_b', text: 'The actual photographs' },
    { value: 'm3_q3_c', text: 'Entity accuracy score' },
    { value: 'm3_q3_d', text: 'Private voice recordings' },
    { value: 'm3_q3_e', text: 'Training pair count' },
    { value: 'm3_q3_f', text: 'Contributor names and count' },
  ]},
  { id: 'm3_q4', type: 'text', min: 60,  label: '4. A client asks you to log into their archive and listen to their voice recordings to check if they sound right. What do you do?' },
  { id: 'm3_q5', type: 'text', min: 60,  label: '5. What is your responsibility if a client tells you they want to cancel their archive?' },
  { id: 'm3_q6', type: 'text', min: 80,  label: '6. A client archive has been active for 6 months but shows only 8 training pairs included. What does this tell you and what do you do?' },
]

const MODULES = [
  {
    number:      1,
    title:       'THE BASALITH PHILOSOPHY',
    description: 'Understanding cognitive pattern learning vs generative AI. Why the archive is training data. What the entity becomes over time.',
    duration:    '15–20 minutes',
    questions:   MODULE_1_QUESTIONS,
  },
  {
    number:      2,
    title:       'THE ART OF THE SESSION',
    description: 'Soft skills for the 90-minute founding session. How to interview families, handle emotional moments, and extract cognitive patterns.',
    duration:    '20–30 minutes',
    questions:   MODULE_2_QUESTIONS,
  },
  {
    number:      3,
    title:       'TECHNICAL CUSTODIANSHIP',
    description: 'How to navigate the guide dashboard, initialise a client archive, and manage data privacy and compliance.',
    duration:    '15–20 minutes',
    questions:   MODULE_3_QUESTIONS,
  },
]

type CertData = {
  module_1_status: string; module_1_score: number | null; module_1_passed_at: string | null
  module_2_status: string; module_2_score: number | null; module_2_passed_at: string | null
  module_3_status: string; module_3_score: number | null; module_3_passed_at: string | null
  certified_at: string | null; certification_level: string
}

type ScoreResult = { passed: boolean; score: number; scoredAnswers: Array<{questionId: string; score: number; feedback: string}> }

// ── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const configs: Record<string, { label: string; color: string; bg: string }> = {
    locked:      { label: 'Locked',      color: C.ghost, bg: 'rgba(255,255,255,0.03)' },
    available:   { label: 'Available',   color: C.gold,  bg: 'rgba(196,162,74,0.08)'  },
    in_progress: { label: 'In Progress', color: C.gold,  bg: 'rgba(196,162,74,0.12)'  },
    passed:      { label: '✓ Passed',    color: C.green, bg: 'rgba(76,175,80,0.08)'   },
    failed:      { label: '✗ Retry',     color: C.red,   bg: 'rgba(229,115,115,0.08)' },
  }
  const cfg = configs[status] ?? configs['locked']
  return (
    <span style={{
      fontFamily:    'Courier New, monospace',
      fontSize:      '0.6rem',
      letterSpacing: '0.2em',
      textTransform: 'uppercase',
      color:         cfg.color,
      background:    cfg.bg,
      padding:       '4px 10px',
      border:        `1px solid ${cfg.color}30`,
    }}>
      {cfg.label}
    </span>
  )
}

// ── Module exam ──────────────────────────────────────────────────────────────

function ModuleExam({
  moduleNum, questions, archivistId, onComplete,
}: {
  moduleNum: number
  questions: typeof MODULE_1_QUESTIONS
  archivistId: string
  onComplete: (result: ScoreResult) => void
}) {
  const [answers, setAnswers]   = useState<Record<string, string>>({})
  const [multiSel, setMultiSel] = useState<Record<string, Set<string>>>({})
  const [submitting, setSubmitting] = useState(false)
  const [errors,     setErrors]     = useState<Record<string, string>>({})

  function countWords(text: string) {
    return text.trim().split(/\s+/).filter(Boolean).length
  }

  function handleText(id: string, val: string) {
    setAnswers(prev => ({ ...prev, [id]: val }))
    setErrors(prev => { const n = { ...prev }; delete n[id]; return n })
  }

  function handleMC(id: string, val: string) {
    setAnswers(prev => ({ ...prev, [id]: val }))
  }

  function handleMulti(groupId: string, optVal: string, checked: boolean) {
    setMultiSel(prev => {
      const s = new Set(prev[groupId] ?? [])
      checked ? s.add(optVal) : s.delete(optVal)
      return { ...prev, [groupId]: s }
    })
  }

  async function handleSubmit() {
    // Validate
    const errs: Record<string, string> = {}
    for (const q of questions) {
      if (q.type === 'text') {
        const words = countWords(answers[q.id] ?? '')
        if (words < (q.min ?? 60)) {
          errs[q.id] = `Minimum ${q.min} words (you wrote ${words})`
        }
      }
    }
    if (Object.keys(errs).length) { setErrors(errs); return }

    setSubmitting(true)
    try {
      // Build answers array
      const payload = questions.map(q => {
        if (q.type === 'mc')       return { questionId: q.id, answer: answers[q.id] ?? '', type: 'mc' as const }
        if (q.type === 'mc_multi') {
          const sel = multiSel[q.id] ?? new Set()
          // Encode each option as a separate answer
          return (q as { options: {value: string}[] }).options.map((o: {value: string}) => ({
            questionId: o.value,
            answer:     sel.has(o.value) ? 'true' : 'false',
            type:       'mc' as const,
          }))
        }
        return { questionId: q.id, answer: answers[q.id] ?? '', type: 'text' as const }
      }).flat()

      const res    = await fetch('/api/archivist/certification', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ archivistId, moduleNumber: moduleNum, answers: payload }),
      })
      const data   = await res.json()
      if (res.ok) { onComplete(data) }
    } catch (e) {
      console.error(e)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {questions.map(q => (
        <div key={q.id} style={{ background: C.surface, border: `1px solid ${C.border}`, padding: '20px' }}>
          <p style={{ fontFamily: 'Georgia, serif', fontSize: '0.95rem', color: C.text, lineHeight: 1.6, marginBottom: '12px' }}>
            {q.label}
          </p>

          {q.type === 'text' && (
            <>
              <textarea
                value={answers[q.id] ?? ''}
                onChange={e => handleText(q.id, e.target.value)}
                placeholder={`Minimum ${q.min} words…`}
                style={{
                  width: '100%', minHeight: '120px', background: '#0A0908',
                  border: `1px solid ${errors[q.id] ? C.red : 'rgba(255,255,255,0.1)'}`,
                  color: C.text, fontFamily: 'Georgia, serif', fontSize: '0.95rem',
                  lineHeight: 1.6, padding: '12px', resize: 'vertical', boxSizing: 'border-box',
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
                {errors[q.id] && <p style={{ fontFamily: 'Courier New, monospace', fontSize: '0.62rem', color: C.red }}>{errors[q.id]}</p>}
                <p style={{ fontFamily: 'Courier New, monospace', fontSize: '0.6rem', color: C.dim, marginLeft: 'auto' }}>
                  {countWords(answers[q.id] ?? '')} / {q.min} words
                </p>
              </div>
            </>
          )}

          {q.type === 'mc' && 'options' in q && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {(q as { options: {value: string; text: string}[] }).options.map((o: {value: string; text: string}) => (
                <label key={o.value} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name={q.id}
                    value={o.value}
                    checked={answers[q.id] === o.value}
                    onChange={() => handleMC(q.id, o.value)}
                    style={{ accentColor: C.gold, marginTop: '2px', flexShrink: 0 }}
                  />
                  <span style={{ fontFamily: 'Georgia, serif', fontSize: '0.9rem', color: C.muted, lineHeight: 1.5 }}>{o.text}</span>
                </label>
              ))}
            </div>
          )}

          {q.type === 'mc_multi' && 'options' in q && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {(q as { options: {value: string; text: string}[] }).options.map((o: {value: string; text: string}) => (
                <label key={o.value} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={multiSel[q.id]?.has(o.value) ?? false}
                    onChange={e => handleMulti(q.id, o.value, e.target.checked)}
                    style={{ accentColor: C.gold, marginTop: '2px', flexShrink: 0 }}
                  />
                  <span style={{ fontFamily: 'Georgia, serif', fontSize: '0.9rem', color: C.muted, lineHeight: 1.5 }}>{o.text}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      ))}

      <button
        onClick={handleSubmit}
        disabled={submitting}
        style={{
          fontFamily:    'Courier New, monospace',
          fontSize:      '0.72rem',
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          color:         '#0A0908',
          background:    submitting ? 'rgba(196,162,74,0.5)' : C.gold,
          border:        'none',
          padding:       '16px 32px',
          cursor:        submitting ? 'not-allowed' : 'pointer',
          alignSelf:     'flex-start',
        }}
      >
        {submitting ? 'Scoring with Claude…' : 'Submit Exam →'}
      </button>
    </div>
  )
}

// ── Score results ────────────────────────────────────────────────────────────

function ScoreDisplay({ result, onContinue }: { result: ScoreResult; onContinue: () => void }) {
  return (
    <div style={{ background: result.passed ? 'rgba(76,175,80,0.06)' : 'rgba(229,115,115,0.06)', border: `1px solid ${result.passed ? 'rgba(76,175,80,0.2)' : 'rgba(229,115,115,0.2)'}`, padding: '28px', marginBottom: '24px' }}>
      <p style={{ fontFamily: 'Courier New, monospace', fontSize: '0.6rem', letterSpacing: '0.3em', textTransform: 'uppercase', color: result.passed ? C.green : C.red, marginBottom: '8px' }}>
        {result.passed ? 'Module Passed' : 'Not Yet Passed'}
      </p>
      <p style={{ fontFamily: 'Georgia, serif', fontSize: '2rem', color: result.passed ? C.green : C.red, fontWeight: 300, marginBottom: '16px' }}>
        {result.score} / 100
      </p>
      {result.passed ? (
        <p style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: '0.95rem', color: C.muted, lineHeight: 1.6 }}>
          Excellent. The next module has been unlocked.
        </p>
      ) : (
        <p style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: '0.95rem', color: C.muted, lineHeight: 1.6 }}>
          You need 80 or above to pass. Review the feedback below and retry in 24 hours.
        </p>
      )}
      {result.scoredAnswers && result.scoredAnswers.length > 0 && (
        <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {result.scoredAnswers.filter(a => a.feedback && !['Correct.', 'Incorrect.'].includes(a.feedback)).map(a => (
            <p key={a.questionId} style={{ fontFamily: 'Courier New, monospace', fontSize: '0.65rem', color: C.dim, lineHeight: 1.5 }}>
              <span style={{ color: a.score >= 7 ? C.green : a.score >= 5 ? C.gold : C.red }}>{a.score}/10</span>{' '}
              {a.feedback}
            </p>
          ))}
        </div>
      )}
      <button
        onClick={onContinue}
        style={{ marginTop: '20px', fontFamily: 'Courier New, monospace', fontSize: '0.65rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: C.dim, background: 'transparent', border: `1px solid ${C.border}`, padding: '8px 16px', cursor: 'pointer' }}
      >
        Return to Certification
      </button>
    </div>
  )
}

// ── Module card ──────────────────────────────────────────────────────────────

function ModuleCard({
  module, status, score, passedAt, archivistId, onRefresh,
}: {
  module: typeof MODULES[0]
  status: string
  score: number | null
  passedAt: string | null
  archivistId: string
  onRefresh: () => void
}) {
  const [expanded,     setExpanded]     = useState(false)
  const [examResult,   setExamResult]   = useState<ScoreResult | null>(null)
  const [showExam,     setShowExam]     = useState(false)

  const locked    = status === 'locked'
  const available = status === 'available' || status === 'in_progress'
  const passed    = status === 'passed'
  const failed    = status === 'failed'

  function handleExamComplete(result: ScoreResult) {
    setExamResult(result)
    setShowExam(false)
    onRefresh()
  }

  return (
    <div
      style={{
        background:  C.surface,
        border:      `1px solid ${passed ? 'rgba(76,175,80,0.2)' : available ? 'rgba(196,162,74,0.2)' : C.border}`,
        borderTop:   `3px solid ${passed ? C.green : available ? C.gold : C.ghost}`,
        opacity:     locked ? 0.5 : 1,
        transition:  'opacity 0.2s',
      }}
    >
      {/* Header */}
      <div
        style={{ padding: '24px 28px', cursor: locked ? 'default' : 'pointer', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}
        onClick={() => !locked && setExpanded(e => !e)}
      >
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px', flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'Courier New, monospace', fontSize: '0.58rem', letterSpacing: '0.22em', color: C.dim }}>
              MODULE {module.number}
            </span>
            <StatusBadge status={status} />
            {score !== null && (
              <span style={{ fontFamily: 'Courier New, monospace', fontSize: '0.6rem', color: passed ? C.green : C.red }}>
                {score}/100
              </span>
            )}
          </div>
          <h3 style={{ fontFamily: 'Courier New, monospace', fontSize: '0.85rem', letterSpacing: '0.14em', color: locked ? C.dim : C.text, marginBottom: '8px' }}>
            {module.title}
          </h3>
          <p style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: '0.9rem', color: C.muted, lineHeight: 1.6 }}>
            {module.description}
          </p>
          {passedAt && (
            <p style={{ fontFamily: 'Courier New, monospace', fontSize: '0.58rem', letterSpacing: '0.1em', color: C.green, marginTop: '8px' }}>
              Passed {new Date(passedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          )}
        </div>
        {!locked && (
          <span style={{ fontFamily: 'Courier New, monospace', fontSize: '0.7rem', color: C.dim, flexShrink: 0 }}>
            {expanded ? '↑' : '↓'}
          </span>
        )}
      </div>

      {/* Expanded content */}
      {expanded && !locked && (
        <div style={{ padding: '0 28px 28px', borderTop: `1px solid ${C.border}` }}>
          <div style={{ paddingTop: '24px' }}>

            {/* Video embed placeholder */}
            <div style={{ background: '#0A0908', border: `1px solid ${C.border}`, aspectRatio: '16/9', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '28px', position: 'relative' }}>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontFamily: 'Courier New, monospace', fontSize: '0.6rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: C.dim, marginBottom: '8px' }}>
                  Training Video
                </p>
                <p style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: '0.9rem', color: C.ghost }}>
                  {module.duration}
                </p>
                <p style={{ fontFamily: 'Courier New, monospace', fontSize: '0.6rem', color: C.ghost, marginTop: '8px' }}>
                  [Video coming — contact your mentor for access]
                </p>
              </div>
            </div>

            {/* Exam result if returned from attempt */}
            {examResult && <ScoreDisplay result={examResult} onContinue={() => setExamResult(null)} />}

            {/* Exam CTA or exam questions */}
            {!showExam && !passed ? (
              <div>
                <p style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: '0.9rem', color: C.muted, lineHeight: 1.6, marginBottom: '20px' }}>
                  {module.questions.length} questions · passing score 80/100 · open-text answers scored by Claude
                  {failed && ' · retry available 24 hours after last attempt'}
                </p>
                <button
                  onClick={() => setShowExam(true)}
                  style={{ fontFamily: 'Courier New, monospace', fontSize: '0.7rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#0A0908', background: C.gold, border: 'none', padding: '14px 28px', cursor: 'pointer' }}
                >
                  {failed ? 'Retry Exam →' : 'Begin Exam →'}
                </button>
              </div>
            ) : showExam ? (
              <ModuleExam
                moduleNum={module.number}
                questions={module.questions as typeof MODULE_1_QUESTIONS}
                archivistId={archivistId}
                onComplete={handleExamComplete}
              />
            ) : (
              <div style={{ background: 'rgba(76,175,80,0.06)', border: '1px solid rgba(76,175,80,0.15)', padding: '16px 20px' }}>
                <p style={{ fontFamily: 'Courier New, monospace', fontSize: '0.65rem', letterSpacing: '0.14em', color: C.green }}>
                  ✓ EXAM PASSED — {score}/100
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function CertificationClient({ archivistId }: { archivistId: string }) {
  const [cert,    setCert]    = useState<CertData | null>(null)
  const [loading, setLoading] = useState(true)

  async function loadCert() {
    try {
      const res  = await fetch(`/api/archivist/certification?archivistId=${archivistId}`)
      const data = await res.json()
      if (res.ok) setCert(data)
    } catch {}
    setLoading(false)
  }

  useEffect(() => { loadCert() }, [archivistId])

  const isCertified = cert?.certified_at != null

  return (
    <div style={{ padding: 'clamp(24px,5vw,48px)', maxWidth: '900px' }}>

      {/* Header */}
      <div style={{ marginBottom: '40px' }}>
        <p style={{ fontFamily: 'Courier New, monospace', fontSize: '0.58rem', letterSpacing: '0.3em', textTransform: 'uppercase', color: C.dim, marginBottom: '10px' }}>
          Certification Path
        </p>
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 'clamp(1.6rem,3vw,2.2rem)', fontWeight: 300, color: C.text, marginBottom: '12px' }}>
          Become a Certified Legacy Guide.
        </h1>
        <p style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: '1rem', color: C.muted, lineHeight: 1.7 }}>
          Three modules. Each one earns access to the next. Full certification unlocks commission tracking and the client submission portal.
        </p>
      </div>

      {/* Certified badge */}
      {isCertified && (
        <div style={{ background: 'rgba(196,162,74,0.06)', border: '1px solid rgba(196,162,74,0.25)', borderTop: '3px solid #C4A24A', padding: '24px 28px', marginBottom: '40px', display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div>
            <p style={{ fontFamily: 'Courier New, monospace', fontSize: '0.6rem', letterSpacing: '0.3em', textTransform: 'uppercase', color: C.gold, marginBottom: '6px' }}>
              Certified Legacy Guide
            </p>
            <p style={{ fontFamily: 'Georgia, serif', fontSize: '1.1rem', color: C.text }}>
              Certification complete.
            </p>
            <p style={{ fontFamily: 'Courier New, monospace', fontSize: '0.6rem', letterSpacing: '0.1em', color: C.dim, marginTop: '6px' }}>
              Certified {cert?.certified_at ? new Date(cert.certified_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : ''}
            </p>
          </div>
        </div>
      )}

      {/* Module cards */}
      {loading ? (
        <div style={{ height: '200px', background: C.surface, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ fontFamily: 'Courier New, monospace', fontSize: '0.65rem', letterSpacing: '0.2em', color: C.dim }}>Loading…</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {MODULES.map(mod => {
            const statusKey = `module_${mod.number}_status` as keyof CertData
            const scoreKey  = `module_${mod.number}_score`  as keyof CertData
            const passedKey = `module_${mod.number}_passed_at` as keyof CertData
            return (
              <ModuleCard
                key={mod.number}
                module={mod}
                status={cert?.[statusKey] as string ?? 'locked'}
                score={cert?.[scoreKey] as number | null ?? null}
                passedAt={cert?.[passedKey] as string | null ?? null}
                archivistId={archivistId}
                onRefresh={loadCert}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
