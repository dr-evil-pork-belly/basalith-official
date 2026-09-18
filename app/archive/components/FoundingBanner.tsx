'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

// Points a new owner at the Founding Sequence until it is complete, then
// disappears. Read-only: one GET, renders nothing while loading, nothing on
// error, nothing once done. Dropped into both dashboards above the fold.
//
// On a trial archive with no call completed the headline leads with the
// first call, because for a trialist the banner is the dashboard (skeleton
// 1.3). Everything else is unchanged.

type Status = {
  done: boolean
  completed: number
  nextCall: 1 | 2 | 3 | null
  current: { isFounding: boolean; call: 1 | 2 | 3 | null; turns: number } | null
}

// Stone register: every color is a var(--portal-*) read (globals.css,
// .portal-stone). No hex literal belongs in this file.
const SERIF = 'var(--portal-serif)'
const MONO  = 'var(--portal-mono)'

export default function FoundingBanner({ trial = false }: { trial?: boolean } = {}) {
  const [status, setStatus] = useState<Status | null>(null)

  useEffect(() => {
    let active = true
    fetch('/api/archive/founding/status', { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (active && d) setStatus(d as Status) })
      .catch(() => {})
    return () => { active = false }
  }, [])

  if (!status || status.done) return null

  const inProgress = status.current?.isFounding && status.current.call
  const headline = status.completed === 0 && !inProgress
    ? (trial ? 'Your first call is ready.' : 'Start with the Founding Sequence.')
    : inProgress
      ? `Call ${status.current!.call} is in progress.`
      : `Call ${status.nextCall} is ready when you are.`
  const body = status.completed === 0 && !inProgress
    ? 'Three of the hardest calls you ever made, in your own words. About ten minutes each. Speak or type.'
    : inProgress
      ? `${status.current!.turns} answered so far. Pick it up where you left off.`
      : `${status.completed} of 3 in your archive.`

  return (
    <Link
      href="/archive/founding"
      className="rounded-sm mb-8"
      style={{
        display:    'block',
        background: 'var(--portal-tint)',
        border:     '1px solid var(--portal-gold-line)',
        borderLeft: '3px solid var(--portal-gold-ink)',
        padding:    'clamp(1.1rem,3vw,1.5rem) clamp(1.1rem,3vw,1.75rem)',
        textDecoration: 'none',
      }}
    >
      <p style={{ fontFamily: MONO, fontSize: '11px', letterSpacing: '0.24em', textTransform: 'uppercase', color: 'var(--portal-gold-ink)', marginBottom: '10px' }}>
        The Founding Sequence
      </p>
      <p style={{ fontFamily: SERIF, fontSize: '22px', fontWeight: 400, color: 'var(--portal-ink)', lineHeight: 1.25, marginBottom: '6px' }}>
        {headline}
      </p>
      <p style={{ fontFamily: SERIF, fontSize: '17px', fontWeight: 400, color: 'var(--portal-body)', lineHeight: 1.6, marginBottom: '12px', maxWidth: '58ch' }}>
        {body}
      </p>
      <span style={{ fontFamily: MONO, fontSize: '11.5px', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--portal-gold-ink)' }}>
        {inProgress ? 'Continue' : 'Begin'} <span aria-hidden="true">→</span>
      </span>
    </Link>
  )
}
