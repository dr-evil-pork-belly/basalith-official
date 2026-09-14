'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

// Points a new owner at the Founding Sequence until it is complete, then
// disappears. Read-only: one GET, renders nothing while loading, nothing on
// error, nothing once done. Dropped into both dashboards above the fold.

type Status = {
  done: boolean
  completed: number
  nextCall: 1 | 2 | 3 | null
  current: { isFounding: boolean; call: 1 | 2 | 3 | null; turns: number } | null
}

const SERIF = '"Cormorant Garamond",Georgia,serif'
const MONO  = '"Space Mono","Courier New",monospace'

export default function FoundingBanner() {
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
    ? 'Start with the Founding Sequence.'
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
        background: 'rgba(196,162,74,0.06)',
        border:     '1px solid rgba(196,162,74,0.25)',
        borderLeft: '3px solid rgba(196,162,74,0.7)',
        padding:    'clamp(1.1rem,3vw,1.5rem) clamp(1.1rem,3vw,1.75rem)',
        textDecoration: 'none',
      }}
    >
      <p style={{ fontFamily: MONO, fontSize: '0.58rem', letterSpacing: '0.28em', textTransform: 'uppercase', color: '#C4A24A', marginBottom: '8px' }}>
        The Founding Sequence
      </p>
      <p style={{ fontFamily: SERIF, fontSize: '1.35rem', fontWeight: 300, color: 'rgba(250,248,244,0.9)', lineHeight: 1.3, marginBottom: '6px' }}>
        {headline}
      </p>
      <p style={{ fontFamily: SERIF, fontSize: '1.02rem', fontWeight: 300, color: 'rgba(250,248,244,0.62)', lineHeight: 1.65, marginBottom: '10px' }}>
        {body}
      </p>
      <span style={{ fontFamily: MONO, fontSize: '0.58rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#C4A24A' }}>
        {inProgress ? 'Continue' : 'Begin'} <span aria-hidden="true">→</span>
      </span>
    </Link>
  )
}
