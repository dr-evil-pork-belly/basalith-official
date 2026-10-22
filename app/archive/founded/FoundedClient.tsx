'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

// The page a trial owner lands on after paying. Slice C, October 9, 2026.
//
// Three states. `confirming` is shown only when the server page has already
// checked with Stripe that this owner's session is paid, so "your payment went
// through" is a fact by the time it renders. The client then asks
// GET /api/archive/checkout every five seconds whether the record is founded.
// After a minute it posts the session id once to
// /api/archive/checkout/confirm, which asks Stripe itself and founds the
// record if the webhook did not, and tells the founder. If that does not
// settle it either, the page says so plainly. It claims nothing it did not see.
//
// Stone register: every color is a var(--portal-*) from .portal-stone in
// globals.css. No hex literal belongs here.

const SERIF  = 'var(--portal-serif)'
const MONO   = 'var(--portal-mono)'
const GOLD   = 'var(--portal-gold-ink)'
const INK    = 'var(--portal-ink)'
const BODY   = 'var(--portal-body)'
const SECOND = 'var(--portal-secondary)'

const POLL_MS   = 5000
const MAX_POLLS = 12

type Phase = 'confirming' | 'founded' | 'slow'

export default function FoundedClient({
  initiallyFounded,
  sessionId,
  firstName,
  nextCall,
  sequenceDone,
}: {
  initiallyFounded: boolean
  /** The Checkout session the server page verified with Stripe, when it did. */
  sessionId: string | null
  firstName: string | null
  nextCall: 1 | 2 | 3 | null
  sequenceDone: boolean
}) {
  const [phase, setPhase] = useState<Phase>(initiallyFounded ? 'founded' : 'confirming')

  useEffect(() => {
    if (phase !== 'confirming') return
    let polls = 0
    let stopped = false
    const timer = setInterval(async () => {
      polls += 1
      try {
        const res = await fetch('/api/archive/checkout', { cache: 'no-store' })
        const data = await res.json().catch(() => ({}))
        if (stopped) return
        if (res.ok && data?.founded === true) {
          setPhase('founded')
          return
        }
      } catch {
        // A failed ask is not an answer. Ask again on the next tick.
      }
      if (stopped || polls < MAX_POLLS) return
      clearInterval(timer)
      // One ask of the fallback, then stop either way.
      let founded = false
      if (sessionId) {
        try {
          const res = await fetch('/api/archive/checkout/confirm', {
            method:  'POST',
            headers: { 'content-type': 'application/json' },
            body:    JSON.stringify({ sessionId }),
          })
          const data = await res.json().catch(() => ({}))
          founded = res.ok && data?.founded === true
        } catch {
          founded = false
        }
      }
      if (!stopped) setPhase(founded ? 'founded' : 'slow')
    }, POLL_MS)
    return () => { stopped = true; clearInterval(timer) }
  }, [phase, sessionId])

  const nextHref  = sequenceDone ? '/archive/dashboard' : '/archive/founding'
  const nextLabel = sequenceDone ? 'Open your Basalith' : `Begin call ${nextCall ?? 1}`

  return (
    <div style={{ maxWidth: '760px', margin: '0 auto', padding: 'clamp(1.5rem,5vw,3rem) clamp(1rem,4vw,2rem)' }}>
      <section
        aria-live="polite"
        style={{
          background:   'var(--portal-card)',
          border:       '1px solid var(--portal-card-line)',
          borderTop:    '3px solid var(--portal-btn)',
          boxShadow:    'var(--portal-lift)',
          padding:      'clamp(1.6rem,4vw,2.25rem) clamp(1.35rem,4vw,2.25rem)',
          borderRadius: '2px',
        }}
      >
        <p style={{ fontFamily: MONO, fontSize: '11.5px', letterSpacing: '0.18em', textTransform: 'uppercase', color: GOLD, marginBottom: '18px' }}>
          {phase === 'founded' ? 'Founded' : 'Payment received'}
        </p>

        {phase === 'founded' && (
          <>
            <h1 style={heading()}>
              {firstName ? `${firstName}, your Basalith is founded.` : 'Your Basalith is founded.'}
            </h1>
            <p style={body()}>
              Everything you have said so far is in it, and it is held in your name.
            </p>
            <p style={{ ...body(), marginBottom: '26px' }}>
              You can now invite the people who know you and add your photographs.
            </p>
            <Link href={nextHref} style={button()}>{nextLabel}</Link>
          </>
        )}

        {phase === 'confirming' && (
          <>
            <h1 style={heading()}>Your payment went through.</h1>
            <p style={{ ...body(), marginBottom: 0 }}>
              One moment while your Basalith is marked as founded. This page will change by itself.
            </p>
          </>
        )}

        {phase === 'slow' && (
          <>
            <h1 style={heading()}>Your payment went through.</h1>
            <p style={body()}>
              Marking your Basalith as founded is taking longer than it should. You can keep going now.
            </p>
            <p style={{ ...body(), marginBottom: '26px' }}>
              If this page still says the same thing in an hour, write to us and we will put it right.
            </p>
            <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
              <Link href="/archive/founding" style={button()}>Keep going</Link>
              <Link href="/contact" style={{ fontFamily: SERIF, fontSize: '16.5px', color: SECOND, textDecoration: 'underline', textUnderlineOffset: '4px', minHeight: '44px', display: 'inline-flex', alignItems: 'center' }}>
                Write to us
              </Link>
            </div>
          </>
        )}
      </section>
    </div>
  )
}

function heading(): React.CSSProperties {
  return { fontFamily: SERIF, fontSize: '30px', fontWeight: 400, color: INK, lineHeight: 1.2, marginBottom: '14px' }
}

function body(): React.CSSProperties {
  return { fontFamily: SERIF, fontSize: '17.5px', fontWeight: 400, lineHeight: 1.65, color: BODY, marginBottom: '14px', maxWidth: '58ch' }
}

function button(): React.CSSProperties {
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
    textDecoration: 'none',
    display:        'inline-flex',
    alignItems:     'center',
  }
}
