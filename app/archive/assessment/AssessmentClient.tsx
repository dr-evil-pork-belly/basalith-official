'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import type { AssessmentProgress } from '@/lib/assessment'
import {
  DEPENDENCY_OPTION_LABEL,
  DEPENDENCY_QUESTIONS,
  DEPENDENCY_ROLE_PROMPT,
  DEPENDENCY_ANSWERS,
  ROLE_MAX_LENGTH,
  type DependencyAnswer,
} from '@/lib/dependencyIntake'

// The founder's assessment, owner surface. Slice 3b, October 8, 2026.
//
// Two things to do, in either order: one call on each of the eight parts of
// running the business (each opens on /archive/founding?area=), and eight
// questions on who makes each kind of decision today. When both are in, the
// record is read twice and the report is built; this page says so and links to
// /archive/assessment/report, where the founder reads it. Releasing it is not
// built yet and is not offered.
//
// Colors are the portal's stone register, read from the .portal-stone block
// in globals.css. No hex literal belongs here.

const SERIF  = 'var(--portal-serif)'
const MONO   = 'var(--portal-mono)'
const GOLD   = 'var(--portal-gold-ink)'
const INK    = 'var(--portal-ink)'
const BODY   = 'var(--portal-body)'
const SECOND = 'var(--portal-secondary)'
const LABEL  = 'var(--portal-label)'
const ERR    = 'var(--portal-error)'
const LINE   = 'var(--portal-card-line)'

type View = AssessmentProgress & { buyerName: string; buyerOrg: string | null }
type Draft = Record<string, { answer: DependencyAnswer | null; role: string }>

function emptyDraft(): Draft {
  return Object.fromEntries(DEPENDENCY_QUESTIONS.map(q => [q.domain, { answer: null, role: '' }]))
}

export default function AssessmentClient() {
  const [view, setView]           = useState<View | null>(null)
  const [loadError, setLoadError] = useState('')
  const [draft, setDraft]         = useState<Draft>(emptyDraft)
  const [saving, setSaving]       = useState(false)
  const [saveError, setSaveError] = useState('')

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/archive/assessment', { cache: 'no-store' })
      const data = await res.json().catch(() => null)
      if (!res.ok || !data) {
        setLoadError(data?.error || 'Could not load your assessment.')
        return
      }
      setLoadError('')
      setView(data as View)
    } catch {
      setLoadError('Could not load your assessment.')
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const answered = DEPENDENCY_QUESTIONS.filter(q => draft[q.domain]?.answer).length
  const allAnswered = answered === DEPENDENCY_QUESTIONS.length

  async function saveIntake(e: React.FormEvent) {
    e.preventDefault()
    if (!allAnswered || saving) return
    setSaving(true)
    setSaveError('')
    try {
      const responses = DEPENDENCY_QUESTIONS.map(q => ({
        domain: q.domain,
        answer: draft[q.domain].answer,
        role:   draft[q.domain].role,
      }))
      const res = await fetch('/api/archive/assessment', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ responses }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        // 409: the answers were already in, from another tab. Show the truth.
        if (res.status === 409) await load()
        else setSaveError(data?.error || 'Could not save your answers.')
        setSaving(false)
        return
      }
      await load()
      setSaving(false)
    } catch {
      setSaveError('Could not save your answers.')
      setSaving(false)
    }
  }

  const requestedBy = view ? [view.buyerName, view.buyerOrg].filter(Boolean).join(', ') : ''

  return (
    <div className="max-w-3xl mx-auto" style={{ paddingBottom: '64px' }}>
      <p style={eyebrow()}>Your assessment</p>
      <h1 style={{ fontFamily: SERIF, fontSize: 'clamp(34px,4.2vw,50px)', fontWeight: 400, lineHeight: 1.08, letterSpacing: '-0.015em', color: INK, marginBottom: '16px' }}>
        Eight calls, one on each part of running the business.
      </h1>
      <p style={{ fontFamily: SERIF, fontSize: '19px', fontWeight: 400, lineHeight: 1.6, color: BODY, marginBottom: '34px', maxWidth: '560px' }}>
        {requestedBy ? `Requested by ${requestedBy}. ` : ''}Take the calls in any order. Speak or type. Stop whenever you like and come back; every answer is saved as you go.
      </p>

      {loadError && (
        <p role="alert" style={{ fontFamily: SERIF, fontSize: '1rem', color: ERR, marginBottom: '24px' }}>{loadError}</p>
      )}

      {view && view.stage !== 'capture' && (
        <section aria-live="polite" style={panel()}>
          <p style={eyebrow()}>{STAGE_EYEBROW[view.stage]}</p>
          <h2 style={h2()}>{stageHeading(view)}</h2>
          {view.stage === 'reading' && (
            <p style={para()}>
              Your record is now read twice, and the report is built from the two readings. You can close this page.
            </p>
          )}
          {(view.stage === 'ready' || view.stage === 'released' || view.stage === 'not_released') && (
            <Link href="/archive/assessment/report" style={button()}>Read your report</Link>
          )}
        </section>
      )}

      {view && (
        <section style={panel()}>
          <p style={eyebrow()}>The calls</p>
          <h2 style={h2()}>
            {view.captured === view.total ? `All ${view.total} are on the record.` : `${view.captured} of ${view.total} on the record.`}
          </h2>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {view.areas.map(a => (
              <li
                key={a.area}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '18px', padding: '16px 0', borderTop: `1px solid ${LINE}` }}
              >
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontFamily: SERIF, fontSize: '19px', fontWeight: 400, color: INK, lineHeight: 1.3 }}>{a.area}</p>
                  <p style={{ fontFamily: SERIF, fontSize: '16px', fontWeight: 400, color: SECOND, lineHeight: 1.5 }}>{a.description}</p>
                </div>
                {a.captured ? (
                  <span style={{ fontFamily: MONO, fontSize: '11.5px', letterSpacing: '0.14em', textTransform: 'uppercase', color: LABEL, whiteSpace: 'nowrap' }}>
                    On the record
                  </span>
                ) : view.stage === 'capture' ? (
                  <Link href={`/archive/founding?area=${encodeURIComponent(a.area)}`} style={button()}>
                    Begin
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      )}

      {view && (
        <section style={panel()}>
          <p style={eyebrow()}>Who makes the call today</p>
          {view.intakeIn ? (
            <h2 style={{ ...h2(), marginBottom: 0 }}>Your answers are in.</h2>
          ) : view.stage !== 'capture' ? (
            <h2 style={{ ...h2(), marginBottom: 0 }}>These were not answered.</h2>
          ) : (
            <form onSubmit={saveIntake}>
              <h2 style={h2()}>Eight questions, one for each part.</h2>
              <p style={para()}>
                The report prints these as your own statement. They are saved once and cannot be changed afterward.
              </p>

              {DEPENDENCY_QUESTIONS.map((q, i) => {
                const d = draft[q.domain]
                const name = `intake-${i}`
                return (
                  <fieldset key={q.domain} style={{ border: 'none', padding: '20px 0', margin: 0, borderTop: `1px solid ${LINE}` }}>
                    <legend style={{ fontFamily: MONO, fontSize: '11.5px', letterSpacing: '0.16em', textTransform: 'uppercase', color: GOLD, padding: 0, marginBottom: '10px', float: 'left', width: '100%' }}>
                      {q.domain}
                    </legend>
                    <p style={{ fontFamily: SERIF, fontSize: '18.5px', fontWeight: 400, color: INK, lineHeight: 1.45, marginBottom: '14px', clear: 'both' }}>
                      {q.question}
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {DEPENDENCY_ANSWERS.map(value => (
                        <label key={value} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontFamily: SERIF, fontSize: '17px', color: d.answer === value ? INK : BODY, cursor: 'pointer', minHeight: '32px' }}>
                          <input
                            type="radio"
                            name={name}
                            value={value}
                            checked={d.answer === value}
                            onChange={() => setDraft(prev => ({ ...prev, [q.domain]: { ...prev[q.domain], answer: value } }))}
                            style={{ accentColor: 'var(--portal-btn)', width: '18px', height: '18px' }}
                          />
                          {DEPENDENCY_OPTION_LABEL[value]}
                        </label>
                      ))}
                    </div>
                    {(d.answer === 'shared' || d.answer === 'delegated') && (
                      <div style={{ marginTop: '14px' }}>
                        <label htmlFor={`${name}-role`} style={{ display: 'block', fontFamily: SERIF, fontSize: '16px', color: SECOND, marginBottom: '6px' }}>
                          {DEPENDENCY_ROLE_PROMPT}
                        </label>
                        <input
                          id={`${name}-role`}
                          type="text"
                          maxLength={ROLE_MAX_LENGTH}
                          value={d.role}
                          onChange={e => setDraft(prev => ({ ...prev, [q.domain]: { ...prev[q.domain], role: e.target.value } }))}
                          style={{ width: '100%', maxWidth: '420px', background: 'transparent', border: 'none', borderBottom: `1px solid ${LINE}`, fontFamily: SERIF, fontSize: '17px', color: INK, padding: '6px 0', outline: 'none' }}
                        />
                      </div>
                    )}
                  </fieldset>
                )
              })}

              {saveError && (
                <p role="alert" style={{ fontFamily: SERIF, fontSize: '1rem', color: ERR, margin: '6px 0 14px' }}>{saveError}</p>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: '18px', flexWrap: 'wrap', marginTop: '10px' }}>
                <button type="submit" disabled={!allAnswered || saving} style={button(!allAnswered || saving)}>
                  {saving ? 'Saving' : 'Save my answers'}
                </button>
                {!allAnswered && (
                  <span style={{ fontFamily: MONO, fontSize: '11.5px', letterSpacing: '0.12em', textTransform: 'uppercase', color: LABEL }}>
                    {answered} of {DEPENDENCY_QUESTIONS.length} answered
                  </span>
                )}
              </div>
            </form>
          )}
        </section>
      )}
    </div>
  )
}

const STAGE_EYEBROW: Record<Exclude<View['stage'], 'capture'>, string> = {
  reading:       'Both parts are in',
  ready:         'Built',
  released:      'Released',
  not_released:  'Closed',
  not_completed: 'Closed',
}

function stageHeading(view: View): string {
  switch (view.stage) {
    case 'reading':       return 'Your part is done.'
    case 'ready':         return 'Your report is built.'
    case 'released':      return `Your report was released to ${view.buyerName}.`
    case 'not_released':  return 'This report was not released.'
    case 'not_completed': return 'This assessment was closed before it was finished.'
    default:              return ''
  }
}

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
    letterSpacing: '0.18em',
    textTransform: 'uppercase',
    color:         GOLD,
    marginBottom:  '18px',
  }
}

function h2(): React.CSSProperties {
  return { fontFamily: SERIF, fontSize: '30px', fontWeight: 400, color: INK, lineHeight: 1.2, marginBottom: '14px' }
}

function para(): React.CSSProperties {
  return { fontFamily: SERIF, fontSize: '17.5px', fontWeight: 400, lineHeight: 1.65, color: BODY, marginBottom: '22px', maxWidth: '58ch' }
}

function button(disabled = false): React.CSSProperties {
  return {
    fontFamily:     MONO,
    fontSize:       '12px',
    letterSpacing:  '0.16em',
    textTransform:  'uppercase',
    color:          'var(--portal-btn-label)',
    background:     'var(--portal-btn)',
    border:         'none',
    borderRadius:   '2px',
    padding:        '0 26px',
    minHeight:      '48px',
    cursor:         disabled ? 'not-allowed' : 'pointer',
    opacity:        disabled ? 0.55 : 1,
    textDecoration: 'none',
    display:        'inline-flex',
    alignItems:     'center',
    whiteSpace:     'nowrap',
  }
}
