'use client'

import { Suspense } from 'react'
import { useAudience, type Audience } from '@/lib/useAudience'

const MONO: React.CSSProperties = {
  fontFamily:    'var(--font-space-mono, "Space Mono", "Courier New", monospace)',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.28em',
}

const SERIF: React.CSSProperties = {
  fontFamily: 'var(--font-cormorant, "Cormorant Garamond", Georgia, serif)',
}

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
    <section style={{ background: 'var(--color-void)', padding: 'clamp(72px,10vw,128px) clamp(24px,6vw,80px)' }}>
      <div style={{ maxWidth: '780px', margin: '0 auto' }}>

        <p style={{ ...MONO, fontSize: '0.6rem', color: 'var(--color-gold)', display: 'flex', alignItems: 'center', gap: '12px', marginBottom: 'clamp(36px,5vw,56px)' }}>
          <span style={{ width: '24px', height: '1px', background: 'var(--color-gold)', display: 'block', flexShrink: 0 }} aria-hidden="true" />
          What Basalith Is Not
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(28px,4vw,44px)' }}>
          {items.map(item => (
            <div key={item.title} style={{ borderLeft: '3px solid rgba(196,162,74,0.5)', paddingLeft: 'clamp(20px,3vw,32px)' }}>
              <p style={{ ...SERIF, fontSize: 'clamp(1.3rem,2.6vw,1.7rem)', fontWeight: 300, color: '#F0EDE6', letterSpacing: '-0.01em', margin: '0 0 10px' }}>
                {item.title}
              </p>
              <p style={{ ...SERIF, fontSize: '1.05rem', fontStyle: 'italic', fontWeight: 300, lineHeight: 1.85, color: '#B8B4AB', margin: 0 }}>
                {item.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
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
