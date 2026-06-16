'use client'

import { Suspense } from 'react'
import { useAudience, type Audience } from '@/lib/useAudience'
import Section, { mono, serif } from './Section'

const PILLARS = [
  {
    n:     '01',
    title: 'How you think.',
    body:  'Not what you have done.\nNot what you have said.\n\nHow you reason.\nWhat you reach for when things get hard.\nWhat you believe when no one is watching.\n\nThe specific weight of a mind\nthat belongs only to you.',
  },
  {
    n:     '02',
    title: 'The raw material.',
    body:  'Every photograph labeled.\nEvery voice recorded.\nEvery question answered.\n\nEach one teaches your entity\nsomething specific about\nhow you move through the world.\n\nThe archive is not the product.\nIt is the training ground.',
  },
  {
    n:     '03',
    title: 'It continues.',
    body:  'There are people spending billions\nto ensure what they built\noutlasts them.\n\nWe think every family\ndeserves the same thing.\n\nNot because death is the enemy.\nBut because the people we love\nshould not have to wonder.',
  },
]

// Audience-specific framing. `default` is the existing neutral copy, shown when
// no path is chosen. `family` matches the default; `founder` reframes the same
// idea for a business and its successors.
const VARIANT: Record<'default' | Audience, { closingLine: string; pillar3Body: string }> = {
  default: {
    closingLine: 'We built Basalith\nso your family never has to wonder.',
    pillar3Body: PILLARS[2].body,
  },
  family: {
    closingLine: 'We built Basalith\nso your family never has to wonder.',
    pillar3Body: PILLARS[2].body,
  },
  founder: {
    closingLine: 'We built Basalith\nso your successors never have to guess.',
    pillar3Body: 'There are people spending billions\nto ensure what they built\noutlasts them.\n\nWe think every founder\ndeserves the same thing.\n\nNot because stepping back is the enemy.\nBut because the people who carry it forward\nshould not have to guess.',
  },
}

function PhilosophyView({ audience }: { audience: Audience | null }) {
  const variant = VARIANT[audience ?? 'default']

  return (
    <Section tone="dark" align="left" reveal ariaLabel="Our philosophy">

      {/* Editorial spine: sticky lede on the left, prose on the right */}
      <div className="editorial" style={{ marginBottom: 'var(--space-6)' }}>
        <div className="editorial-lede">
          <p style={{ ...mono, fontSize: 'var(--eyebrow-size)', letterSpacing: 'var(--eyebrow-tracking)', color: 'var(--color-gold)', marginBottom: 'var(--space-4)' }}>
            WHAT BASALITH PRESERVES
          </p>
          <h2 style={{ ...serif, fontSize: 'var(--text-section)', fontWeight: 300, lineHeight: 1.15, letterSpacing: '-0.02em', color: 'var(--text-on-dark)', margin: 0 }}>
            What you know is not in any document.
          </h2>
        </div>

        {/* Prose sizes/line-height come from .editorial-prose p in globals.css */}
        <div className="editorial-prose">
          <p style={{ ...serif, fontWeight: 300, color: 'var(--text-on-dark-2)', margin: '0 0 var(--space-4)' }}>
            It is in how you evaluate risk. How you read people. When you walk away. What you look for before anyone else sees it.
          </p>
          <p style={{ ...serif, fontWeight: 300, color: 'var(--text-on-dark-2)', margin: '0 0 var(--space-4)' }}>
            Thirty years of pattern recognition. A lifetime of calibrated judgment.
          </p>
          <p style={{ ...serif, fontWeight: 300, color: 'var(--text-on-dark)', margin: '0 0 var(--space-4)' }}>
            Basalith learns this while you are here to teach it. So it can speak when you cannot.
          </p>
          {/* Emphasis: the only italic in the section; size overrides .editorial-prose p */}
          <p style={{ ...serif, fontSize: '1.32rem', fontStyle: 'italic', fontWeight: 300, color: 'var(--color-gold)', whiteSpace: 'pre-line', margin: 0 }}>
            {variant.closingLine}
          </p>
        </div>
      </div>

      {/* Rule divider above the pillars */}
      <div aria-hidden="true" style={{ width: '40px', height: '1px', background: 'var(--color-gold)', margin: '0 0 var(--space-5)' }} />

      {/* Three pillars — full-width siblings below the editorial grid */}
      <div className="philosophy-pillars" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-5)' }}>
        {PILLARS.map(({ n, title, body }) => (
          <div key={n} className="pillar" data-reveal>
            <p style={{ ...mono, fontSize: 'var(--eyebrow-size)', color: 'var(--color-gold)', marginBottom: 'var(--space-3)' }}>
              {n}
            </p>
            <h3 style={{ ...serif, fontSize: '1.4rem', fontWeight: 500, color: 'var(--text-on-dark)', marginBottom: '20px', lineHeight: 1.2 }}>
              {title}
            </h3>
            {/* Pillar body size/line-height come from .pillar p in globals.css */}
            <p style={{ ...serif, fontWeight: 300, color: 'var(--text-on-dark-3)', whiteSpace: 'pre-line', margin: 0 }}>
              {n === '03' ? variant.pillar3Body : body}
            </p>
          </div>
        ))}
      </div>

      <style>{`
        @media (max-width: 768px) {
          .philosophy-pillars { grid-template-columns: 1fr !important; gap: var(--space-5) !important; }
        }
      `}</style>
    </Section>
  )
}

function PhilosophyInner() {
  return <PhilosophyView audience={useAudience()} />
}

export default function PhilosophySection() {
  // useAudience reads the URL param, so it must sit under a Suspense boundary.
  // The fallback renders the neutral copy, which is also the no-choice default.
  return (
    <Suspense fallback={<PhilosophyView audience={null} />}>
      <PhilosophyInner />
    </Suspense>
  )
}
