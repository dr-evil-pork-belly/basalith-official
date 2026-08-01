'use client'

import Link from 'next/link'
import { Suspense } from 'react'
import { scrollToAudience } from '@/lib/scrollToAudience'
import { useAudience, type Audience } from '@/lib/useAudience'
import { mono, serif, StoneBlock } from './StonePrimitives'

// Live copy, unchanged, from ClosingSection. Direction 1d's close shape: a
// rule above, the heading stack, an outlined CTA.
//
// 1d closes on a "BASALITH.AI" wordmark. Live copy has no equivalent string and
// the shared Footer already carries the brand, so that slot is left empty
// rather than filled with an invented one.
//
// The switch-path control is rebuilt here instead of reusing SwitchPath, whose
// colors are hardcoded rgba(250,248,244,...) for a dark surface and would drop
// to roughly 1.3:1 on stone.

const VARIANT: Record<'default' | Audience, { eyebrow: string; href: string }> = {
  default: { eyebrow: 'For the forward-thinking',     href: '/apply' },
  family:  { eyebrow: 'For individuals and families', href: '/apply' },
  founder: { eyebrow: 'For founders and successors',  href: '/succession' },
}

const NAME: Record<Audience, string> = {
  founder: 'Founders & Successors',
  family:  'Individuals & Families',
}

function HomeClosingView({ audience }: { audience: Audience | null }) {
  const variant = VARIANT[audience ?? 'default']

  return (
    <section aria-label="Begin your archive">
      <StoneBlock
        gap="20px"
        style={{ borderTop: '1px solid var(--stone-rule)', paddingBottom: '40px' }}
      >
        {audience && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <span style={{ ...mono, color: 'var(--color-gold)' }}>{NAME[audience]}</span>
            <span aria-hidden="true" style={{ color: 'var(--stone-label)' }}>&middot;</span>
            <button
              type="button"
              onClick={scrollToAudience}
              style={{
                ...mono,
                background: 'transparent',
                border:     'none',
                cursor:     'pointer',
                color:      'var(--stone-secondary)',
                padding:    '4px 0',
              }}
            >
              Switch path
            </button>
          </div>
        )}

        <p style={{ ...mono, color: 'var(--color-gold)', margin: 0 }}>
          {variant.eyebrow}
        </p>

        <p
          style={{
            ...serif,
            fontSize:      'clamp(24px, 6.2vw, 34px)',
            fontWeight:    300,
            lineHeight:    1.14,
            letterSpacing: '-0.02em',
            color:         'var(--stone-ink)',
            margin:        0,
          }}
        >
          What you have learned
          <br />
          can outlast you.
        </p>

        <p
          style={{
            ...serif,
            fontSize:   '16px',
            fontStyle:  'italic',
            fontWeight: 300,
            lineHeight: 1.55,
            color:      'var(--stone-body)',
            margin:     0,
          }}
        >
          The only question is whether you capture it while you still can.
        </p>

        <div
          aria-hidden="true"
          style={{ width: '40px', height: '1px', background: 'var(--color-gold)' }}
        />

        {/* The locked tagline. Two lines, unchanged, in the place it already
            renders. Do not move, reword, or reduce to one line. */}
        <div
          style={{
            ...serif,
            fontSize:   'clamp(21px, 5.4vw, 28px)',
            fontWeight: 300,
            fontStyle:  'italic',
            lineHeight: 1.45,
            color:      'var(--stone-body)',
          }}
        >
          <p style={{ margin: 0 }}>You never truly leave</p>
          <p style={{ margin: 0 }}>if you leave enough of yourself behind.</p>
        </div>

        <Link
          href={variant.href}
          style={{
            ...mono,
            display:        'block',
            textAlign:      'center',
            textDecoration: 'none',
            color:          'var(--stone-ink)',
            border:         '1px solid var(--stone-ink)',
            padding:        '15px',
            minHeight:      '48px',
            boxSizing:      'border-box',
          }}
        >
          Begin
        </Link>
      </StoneBlock>
    </section>
  )
}

function HomeClosingInner() {
  return <HomeClosingView audience={useAudience()} />
}

export default function HomeClosing() {
  // useAudience reads the URL param, so it must sit under a Suspense boundary.
  // The fallback renders the neutral copy, which is also the no-choice default.
  return (
    <Suspense fallback={<HomeClosingView audience={null} />}>
      <HomeClosingInner />
    </Suspense>
  )
}
