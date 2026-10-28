'use client'

import { useState } from 'react'

// The business profile, owner surface. October 28, 2026
// (lib/businessProfile.ts). Two questions, typed, saved together. On save the
// owner goes on to the page the server names.
//
// Colors are the portal's stone register, read from the .portal-stone block
// in globals.css. No hex literal belongs here. Copy: no em dashes, no
// hyphenated words, no exclamation points.

const SERIF = 'var(--portal-serif)'
const MONO  = 'var(--portal-mono)'
const GOLD  = 'var(--portal-gold-ink)'
const INK   = 'var(--portal-ink)'
const BODY  = 'var(--portal-body)'
const ERR   = 'var(--portal-error)'
const LINE  = 'var(--portal-card-line)'

type Question = { key: 'business' | 'decisions'; question: string; hint: string }

const MIN_ANSWER = 20
// Matches PROFILE_MAX_ANSWER in lib/businessProfile.ts, so nothing is cut silently.
const MAX_ANSWER = 3000

export default function BusinessClient({
  questions,
  initial,
  assessment,
}: {
  questions: Question[]
  initial: { business: string; decisions: string } | null
  /** An assessment record: the answers also feed the report. */
  assessment: boolean
}) {
  const [values, setValues] = useState<Record<string, string>>({
    business:  initial?.business ?? '',
    decisions: initial?.decisions ?? '',
  })
  const [error, setError]   = useState('')
  const [saving, setSaving] = useState(false)

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (saving) return
    const body = Object.fromEntries(questions.map(q => [q.key, (values[q.key] ?? '').trim()]))
    if (questions.some(q => body[q.key].length < MIN_ANSWER)) {
      setError('A sentence or two on each, please.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/archive/business-profile', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok || !data?.next) {
        setError(data?.error || 'Could not save your answers.')
        setSaving(false)
        return
      }
      window.location.assign(data.next as string)
    } catch {
      setError('Could not save your answers.')
      setSaving(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto" style={{ paddingBottom: '64px' }}>
      <p style={{ fontFamily: MONO, fontSize: '11.5px', letterSpacing: '0.18em', textTransform: 'uppercase', color: GOLD, marginBottom: '18px' }}>
        Your business
      </p>
      <h1 style={{ fontFamily: SERIF, fontSize: 'clamp(30px,3.6vw,42px)', fontWeight: 400, lineHeight: 1.12, letterSpacing: '-0.01em', color: INK, marginBottom: '14px' }}>
        Two questions about the business.
      </h1>
      <p style={{ fontFamily: SERIF, fontSize: '19px', fontWeight: 400, lineHeight: 1.6, color: BODY, marginBottom: '26px', maxWidth: '560px' }}>
        In your own words, the way you would say it. Your answers go on your record with everything else you tell us. We draw on them when we write the first question of each call about one part of the business.{assessment ? ' Your report reads them with the rest of your record.' : ''} A few sentences each is plenty.
      </p>

      <form onSubmit={save} style={{
        background:   'var(--portal-card)',
        border:       `1px solid ${LINE}`,
        borderTop:    '3px solid var(--portal-btn)',
        boxShadow:    'var(--portal-lift)',
        padding:      'clamp(1.6rem,4vw,2.25rem) clamp(1.35rem,4vw,2.25rem)',
        borderRadius: '2px',
      }}>
        {questions.map((q, i) => (
          <div key={q.key} style={{ marginBottom: i === questions.length - 1 ? '18px' : '32px' }}>
            <label htmlFor={`profile-${q.key}`} style={{ display: 'block', fontFamily: SERIF, fontSize: 'clamp(21px,2.3vw,25px)', fontWeight: 400, lineHeight: 1.35, color: INK, marginBottom: '8px' }}>
              {q.question}
            </label>
            <p style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: '15.5px', color: BODY, marginBottom: '12px' }}>{q.hint}</p>
            <textarea
              id={`profile-${q.key}`}
              value={values[q.key] ?? ''}
              onChange={e => setValues(v => ({ ...v, [q.key]: e.target.value }))}
              rows={5}
              maxLength={MAX_ANSWER}
              autoFocus={i === 0}
              style={{ width: '100%', background: 'var(--portal-inset)', border: `1px solid ${LINE}`, borderRadius: '2px', padding: '14px 16px', fontFamily: SERIF, fontSize: '18px', lineHeight: 1.6, color: INK, resize: 'vertical', outline: 'none' }}
            />
          </div>
        ))}
        {error && <p role="alert" style={{ fontFamily: SERIF, fontSize: '1rem', color: ERR, marginBottom: '14px' }}>{error}</p>}
        <button type="submit" disabled={saving} style={{
          fontFamily:    MONO,
          fontSize:      '12px',
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          color:         'var(--portal-btn-label)',
          background:    'var(--portal-btn)',
          border:        'none',
          borderRadius:  '2px',
          padding:       '0 26px',
          minHeight:     '48px',
          cursor:        saving ? 'not-allowed' : 'pointer',
          opacity:       saving ? 0.55 : 1,
          display:       'inline-flex',
          alignItems:    'center',
          whiteSpace:    'nowrap',
        }}>
          {saving ? 'Saving' : 'Save and continue'}
        </button>
      </form>
    </div>
  )
}
