'use client'

import { Suspense } from 'react'
import { useAudience, type Audience } from '@/lib/useAudience'
import Section, { mono, serif } from './Section'

type Item = { title: string; body: string }

// Plain facts, no defensive tone. Directly answers the "AI chatbot wrapper" doubt.
// `default` is the existing neutral copy, shown when no path is chosen. The
// founder and family variants change only the personal-versus-institutional
// framing so a visitor never sees the other audience's wording.
const ITEMS: Record<'default' | Audience, Item[]> = {
  default: [
    {
      title: 'Not a grief chatbot.',
      body:  'Basalith is built while the person is alive and fully participating. Not reconstructed from old messages after they are gone.',
    },
    {
      title: 'Not a wrapper on a general AI.',
      body:  "Every entity is trained exclusively on one person's deposits. Their voice, their words, their specific way of thinking. No general model speaks for your archive.",
    },
    {
      title: 'Not a data broker.',
      body:  'Your archive data is never shared, never sold, and never used to train models for other users. Ever.',
    },
    {
      title: 'Not a startup with your memories.',
      body:  'You own your archive completely. You can export all of it at any time. Because the archive is yours to hold, nothing is stranded if we ever close.',
    },
  ],
  family: [
    {
      title: 'Not a grief chatbot.',
      body:  'Basalith is built while the person is alive and fully participating. Not reconstructed from old messages after they are gone.',
    },
    {
      title: 'Not a wrapper on a general AI.',
      body:  "Every entity is trained exclusively on one person's deposits. Their voice, their words, their specific way of thinking. No general model speaks for your family's archive.",
    },
    {
      title: 'Not a data broker.',
      body:  "Your family's archive is never shared, never sold, and never used to train models for other users. Ever.",
    },
    {
      title: 'Not a startup with your memories.',
      body:  'You own your archive completely. You can export all of it at any time. Because the archive is yours to hold, nothing is stranded if we ever close.',
    },
  ],
  founder: [
    {
      title: 'Not a grief chatbot.',
      body:  'Basalith is built while the founder is present and fully participating. Not reconstructed from old records after they have stepped away.',
    },
    {
      title: 'Not a wrapper on a general AI.',
      body:  "Every entity is trained exclusively on one founder's deposits. Their voice, their words, their specific way of thinking. No general model speaks for your company.",
    },
    {
      title: 'Not a data broker.',
      body:  "Your company's archive is never shared, never sold, and never used to train models for other users. Ever.",
    },
    {
      title: 'Not a startup with your institutional memory.',
      body:  'You own the archive completely. You can export all of it at any time. Because the archive is yours to hold, nothing is stranded if we ever close.',
    },
  ],
}

function WhatBasalithIsNotView({ audience }: { audience: Audience | null }) {
  const items = ITEMS[audience ?? 'default']

  return (
    <Section tone="dark" align="left" ariaLabel="What Basalith is not">

      {/* Editorial spine: sticky lede on the left, stacked refusals on the right */}
      <div className="editorial">
        <div className="editorial-lede">
          <p style={{ ...mono, fontSize: 'var(--eyebrow-size)', letterSpacing: 'var(--eyebrow-tracking)', color: 'var(--color-gold)', marginBottom: 'var(--space-4)' }}>
            WHAT BASALITH IS NOT
          </p>
          {/* Same treatment as the Philosophy heading */}
          <h2 style={{ ...serif, fontSize: 'var(--text-section)', fontWeight: 300, lineHeight: 1.15, letterSpacing: '-0.02em', color: 'var(--text-on-dark)', margin: 0 }}>
            Trust is the whole product.
          </h2>
        </div>

        {/* Single stacked column; .neg h3 / .neg p sizing comes from globals.css */}
        <div className="negations">
          {items.map(item => (
            <div key={item.title} className="neg" style={{ borderLeft: '3px solid rgba(196,162,74,0.5)', paddingLeft: 'clamp(20px,3vw,32px)' }}>
              <h3 style={{ ...serif, fontWeight: 300, color: 'var(--text-on-dark)', letterSpacing: '-0.01em', lineHeight: 1.2, margin: '0 0 10px' }}>
                {item.title}
              </h3>
              <p style={{ ...serif, fontWeight: 300, color: 'var(--text-on-dark-2)', margin: 0 }}>
                {item.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </Section>
  )
}

function WhatBasalithIsNotInner() {
  return <WhatBasalithIsNotView audience={useAudience()} />
}

export default function WhatBasalithIsNot() {
  // useAudience reads the URL param, so it must sit under a Suspense boundary.
  // The fallback renders the neutral copy, which is also the no-choice default.
  return (
    <Suspense fallback={<WhatBasalithIsNotView audience={null} />}>
      <WhatBasalithIsNotInner />
    </Suspense>
  )
}
