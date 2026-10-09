'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'

// The round of six for one area, owner surface. Slice 4b, October 8, 2026.
//
// One question at a time, typed. Each answer is saved on the spot and the next
// question follows; the page never skips ahead and never shows a question
// already answered. Reloading serves the same question. Speaking an answer is
// not built here yet: the calls take voice, the round takes typing.
//
// Colors are the portal's stone register, read from the .portal-stone block
// in globals.css. No hex literal belongs here.

const SERIF  = 'var(--portal-serif)'
const MONO   = 'var(--portal-mono)'
const GOLD   = 'var(--portal-gold-ink)'
const INK    = 'var(--portal-ink)'
const BODY   = 'var(--portal-body)'
const LABEL  = 'var(--portal-label)'
const ERR    = 'var(--portal-error)'
const LINE   = 'var(--portal-card-line)'

type View = {
  area:     string
  callDone: boolean
  answered: number
  total:    number
  done:     boolean
  next:     { key: string; question: string } | null
}

const MIN_ANSWER = 20

export default function RoundClient({ area }: { area: string }) {
  const [view, setView]       = useState<View | null>(null)
  const [answer, setAnswer]   = useState('')
  const [error, setError]     = useState('')
  const [saving, setSaving]   = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/archive/assessment/round?area=${encodeURIComponent(area)}`, { cache: 'no-store' })
      const data = await res.json().catch(() => null)
      if (!res.ok || !data) { setError(data?.error || 'Could not load the questions.'); return }
      setError('')
      setView(data as View)
    } catch {
      setError('Could not load the questions.')
    }
  }, [area])

  useEffect(() => { void load() }, [load])

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!view?.next || saving) return
    const text = answer.trim()
    if (text.length < MIN_ANSWER) { setError('A sentence or two, please.'); return }
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/archive/assessment/round', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ key: view.next.key, answer: text }),
      })
      const data = await res.json().catch(() => null)
      // 409 with a view: already answered in another tab. Move on from there.
      if (data && typeof data.total === 'number') {
        setView(data as View)
        setAnswer('')
        if (!res.ok) setError('')
      } else if (!res.ok) {
        setError(data?.error || 'Could not save your answer.')
      }
    } catch {
      setError('Could not save your answer.')
    }
    setSaving(false)
  }

  return (
    <div className="max-w-3xl mx-auto" style={{ paddingBottom: '64px' }}>
      <p style={{ marginBottom: '28px' }}>
        <Link href="/archive/assessment" className="no-underline" style={{ fontFamily: MONO, fontSize: '11px', letterSpacing: '0.16em', textTransform: 'uppercase', color: GOLD }}>
          ← Your assessment
        </Link>
      </p>

      <p style={eyebrow()}>{area}</p>

      {!view && !error && (
        <p style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: '17px', color: BODY }}>One moment.</p>
      )}

      {view && !view.callDone && (
        <>
          <h1 style={h1()}>The call comes first.</h1>
          <p style={lede()}>These six questions follow from the story you tell on the call. Do that one first.</p>
          <Link href={`/archive/founding?area=${encodeURIComponent(area)}`} style={button()}>Begin the call</Link>
        </>
      )}

      {view && view.callDone && view.done && (
        <section aria-live="polite">
          <h1 style={h1()}>Those six are on the record.</h1>
          <p style={lede()}>That is this part of the business done.</p>
          <Link href="/archive/assessment" style={button()}>Back to your assessment</Link>
        </section>
      )}

      {view && view.callDone && view.next && (
        <form onSubmit={save} style={panel()}>
          <p style={{ fontFamily: MONO, fontSize: '11.5px', letterSpacing: '0.14em', textTransform: 'uppercase', color: LABEL, marginBottom: '16px' }}>
            Question {view.answered + 1} of {view.total}
          </p>
          <label htmlFor="round-answer" style={{ display: 'block', fontFamily: SERIF, fontSize: 'clamp(22px,2.4vw,27px)', fontWeight: 400, lineHeight: 1.35, color: INK, marginBottom: '20px' }}>
            {view.next.question}
          </label>
          <textarea
            id="round-answer"
            key={view.next.key}
            value={answer}
            onChange={e => setAnswer(e.target.value)}
            rows={6}
            autoFocus
            style={{ width: '100%', background: 'var(--portal-inset)', border: `1px solid ${LINE}`, borderRadius: '2px', padding: '14px 16px', fontFamily: SERIF, fontSize: '18px', lineHeight: 1.6, color: INK, resize: 'vertical', outline: 'none' }}
          />
          <p style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: '15.5px', color: BODY, margin: '10px 0 18px' }}>
            In your own words, the way you would say it. It is saved when you continue.
          </p>
          {error && <p role="alert" style={{ fontFamily: SERIF, fontSize: '1rem', color: ERR, marginBottom: '14px' }}>{error}</p>}
          <button type="submit" disabled={saving} style={button(saving)}>
            {saving ? 'Saving' : view.answered + 1 === view.total ? 'Save and finish' : 'Save and continue'}
          </button>
        </form>
      )}

      {error && (!view || !view.next) && (
        <p role="alert" style={{ fontFamily: SERIF, fontSize: '1rem', color: ERR, marginTop: '18px' }}>{error}</p>
      )}
    </div>
  )
}

function panel(): React.CSSProperties {
  return {
    background:   'var(--portal-card)',
    border:       '1px solid var(--portal-card-line)',
    borderTop:    '3px solid var(--portal-btn)',
    boxShadow:    'var(--portal-lift)',
    padding:      'clamp(1.6rem,4vw,2.25rem) clamp(1.35rem,4vw,2.25rem)',
    borderRadius: '2px',
  }
}

function eyebrow(): React.CSSProperties {
  return { fontFamily: MONO, fontSize: '11.5px', letterSpacing: '0.18em', textTransform: 'uppercase', color: GOLD, marginBottom: '18px' }
}

function h1(): React.CSSProperties {
  return { fontFamily: SERIF, fontSize: 'clamp(30px,3.6vw,42px)', fontWeight: 400, lineHeight: 1.12, letterSpacing: '-0.01em', color: INK, marginBottom: '14px' }
}

function lede(): React.CSSProperties {
  return { fontFamily: SERIF, fontSize: '19px', fontWeight: 400, lineHeight: 1.6, color: BODY, marginBottom: '26px', maxWidth: '560px' }
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
