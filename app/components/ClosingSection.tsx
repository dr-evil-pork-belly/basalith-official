'use client'

import Link from 'next/link'
import { Suspense } from 'react'
import { useAudience, type Audience } from '@/lib/useAudience'
import SwitchPath from './SwitchPath'

const MONO: React.CSSProperties = {
  fontFamily:    'var(--font-space-mono, "Space Mono", "Courier New", monospace)',
  fontSize:      '0.52rem',
  letterSpacing: '0.35em',
  textTransform: 'uppercase' as const,
}

// `default` is the existing neutral copy, shown when no path is chosen. Founders
// are pointed at the succession path; families and the neutral default at /apply.
const VARIANT: Record<'default' | Audience, { eyebrow: string; href: string }> = {
  default: { eyebrow: 'For the forward-thinking',    href: '/apply' },
  family:  { eyebrow: 'For individuals and families', href: '/apply' },
  founder: { eyebrow: 'For founders and successors',  href: '/succession' },
}

function ClosingView({ audience }: { audience: Audience | null }) {
  const variant = VARIANT[audience ?? 'default']

  return (
    <section
      aria-label="Begin your archive"
      style={{
        background: 'var(--color-void)',
        padding:    'clamp(80px,12vw,160px) clamp(24px,6vw,80px)',
        textAlign:  'center',
      }}
    >
      <div style={{ maxWidth: '640px', margin: '0 auto' }}>

        {audience && <SwitchPath audience={audience} align="center" />}

        <p style={{ ...MONO, color: 'var(--color-gold)', marginBottom: '48px' }}>
          {variant.eyebrow}
        </p>

        <p
          style={{
            fontFamily:    'var(--font-cormorant, "Cormorant Garamond", Georgia, serif)',
            fontSize:      'clamp(1.75rem, 4vw, 3rem)',
            fontWeight:    300,
            lineHeight:    1.2,
            letterSpacing: '-0.02em',
            color:         'rgba(250,250,248,0.9)',
            marginBottom:  '28px',
          }}
        >
          What you have learned
          <br />
          can outlast you.
        </p>

        <p
          style={{
            fontFamily:   'var(--font-cormorant, "Cormorant Garamond", Georgia, serif)',
            fontSize:     '1.15rem',
            fontStyle:    'italic',
            fontWeight:   300,
            lineHeight:   1.85,
            color:        'rgba(250,250,248,0.45)',
            marginBottom: '56px',
          }}
        >
          The only question is whether you capture it while you still can.
        </p>

        <div
          aria-hidden="true"
          style={{
            width:      '40px',
            height:     '1px',
            background: 'var(--color-gold)',
            margin:     '0 auto 56px',
          }}
        />

        <div
          style={{
            fontFamily:   'var(--font-cormorant, "Cormorant Garamond", Georgia, serif)',
            fontSize:     'clamp(1.5rem, 3vw, 2.25rem)',
            fontWeight:   300,
            fontStyle:    'italic',
            lineHeight:   1.6,
            color:        'rgba(250,250,248,0.7)',
            marginBottom: '56px',
          }}
        >
          <p style={{ margin: '0' }}>You never truly leave</p>
          <p style={{ margin: '0' }}>if you leave enough of yourself behind.</p>
        </div>

        <Link
          href={variant.href}
          style={{
            ...MONO,
            display:        'inline-block',
            color:          'var(--color-void)',
            textDecoration: 'none',
            background:     'var(--color-gold)',
            padding:        '16px 48px',
            borderRadius:   'var(--radius-sm)',
            marginBottom:   '24px',
          }}
        >
          Begin
        </Link>

      </div>
    </section>
  )
}

function ClosingInner() {
  return <ClosingView audience={useAudience()} />
}

export default function ClosingSection() {
  // useAudience reads the URL param, so it must sit under a Suspense boundary.
  // The fallback renders the neutral copy, which is also the no-choice default.
  return (
    <Suspense fallback={<ClosingView audience={null} />}>
      <ClosingInner />
    </Suspense>
  )
}
