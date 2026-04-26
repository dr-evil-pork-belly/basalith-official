'use client'

import Link from 'next/link'

const MONO: React.CSSProperties = {
  fontFamily:    'var(--font-space-mono, "Space Mono", "Courier New", monospace)',
  fontSize:      'var(--text-caption)',
  letterSpacing: '0.35em',
  textTransform: 'uppercase' as const,
}

export default function HeroSection() {
  return (
    <section
      aria-label="Basalith — Heritage archive"
      style={{
        minHeight:      '100svh',
        display:        'grid',
        gridTemplateColumns: '55fr 45fr',
        background:     'var(--color-bg)',
      }}
    >
      {/* ── Left: Text ── */}
      <div
        style={{
          display:        'flex',
          flexDirection:  'column',
          justifyContent: 'center',
          padding:        'clamp(120px,14vw,180px) clamp(24px,6vw,80px) clamp(80px,10vw,120px)',
        }}
      >
        {/* Eyebrow */}
        <p
          style={{
            ...MONO,
            color:         'var(--color-gold)',
            display:       'flex',
            alignItems:    'center',
            gap:           '12px',
            marginBottom:  '32px',
            opacity:       0,
            animation:     'lineReveal 600ms cubic-bezier(0.16,1,0.3,1) 0ms both',
          }}
        >
          <span style={{ display: 'block', width: '24px', height: '1px', background: 'var(--color-gold)', flexShrink: 0 }} aria-hidden="true" />
          Heritage Nexus · Basalith
        </p>

        {/* Display headline */}
        <h1
          style={{
            fontFamily:    'var(--font-cormorant, "Cormorant Garamond", Georgia, serif)',
            fontSize:      'var(--text-display)',
            fontWeight:    300,
            lineHeight:    1.04,
            letterSpacing: '-0.025em',
            color:         'var(--color-text-primary)',
            margin:        '0 0 28px',
          }}
        >
          <span className="headline-line headline-line-1">The archive</span>
          <span className="headline-line headline-line-2" style={{ fontStyle: 'italic', color: 'var(--color-gold)' }}>of a life</span>
          <span className="headline-line headline-line-3">well lived.</span>
        </h1>

        {/* Sub-headline */}
        <p
          style={{
            fontFamily:    'var(--font-cormorant, "Cormorant Garamond", Georgia, serif)',
            fontSize:      '1.2rem',
            fontStyle:     'italic',
            fontWeight:    300,
            lineHeight:    1.85,
            color:         'var(--color-text-secondary)',
            maxWidth:      '440px',
            margin:        '0 0 44px',
            opacity:       0,
            animation:     'lineReveal 700ms cubic-bezier(0.16,1,0.3,1) 450ms both',
          }}
        >
          We build the only record of a person that captures how they actually thought,
          not just what they did.
        </p>

        {/* CTAs */}
        <div
          style={{
            display:   'flex',
            gap:       '16px',
            flexWrap:  'wrap',
            opacity:   0,
            animation: 'lineReveal 600ms cubic-bezier(0.16,1,0.3,1) 650ms both',
          }}
        >
          <Link
            href="/apply"
            style={{
              ...MONO,
              display:        'inline-block',
              color:          'var(--color-surface)',
              textDecoration: 'none',
              background:     'var(--color-gold)',
              padding:        '14px 32px',
              borderRadius:   'var(--radius-sm)',
              transition:     'background 250ms ease',
            }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--color-gold-light)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'var(--color-gold)'}
          >
            Request Your Founding
          </Link>
          <Link
            href="/method"
            style={{
              ...MONO,
              display:        'inline-block',
              color:          'var(--color-text-secondary)',
              textDecoration: 'none',
              background:     'transparent',
              padding:        '13px 31px',
              border:         '1px solid var(--color-border-medium)',
              borderRadius:   'var(--radius-sm)',
              transition:     'border-color 250ms ease, color 250ms ease',
            }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLElement
              el.style.borderColor = 'var(--color-gold)'
              el.style.color       = 'var(--color-gold)'
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLElement
              el.style.borderColor = 'var(--color-border-medium)'
              el.style.color       = 'var(--color-text-secondary)'
            }}
          >
            See How It Works
          </Link>
        </div>

        {/* Social proof */}
        <p
          style={{
            ...MONO,
            fontSize:   '0.52rem',
            color:      'var(--color-text-faint)',
            marginTop:  '40px',
            opacity:    0,
            animation:  'lineReveal 500ms cubic-bezier(0.16,1,0.3,1) 850ms both',
          }}
        >
          · Estate families in 4 countries · Founded 2024
        </p>
      </div>

      {/* ── Right: Photograph ── */}
      <div
        aria-hidden="true"
        style={{
          position:   'relative',
          overflow:   'hidden',
          minHeight:  'clamp(400px, 60vh, 900px)',
        }}
      >
        {/* Archival photograph — warm parchment gradient with aged paper texture */}
        {/* PLACEHOLDER: Replace with actual family archive photograph */}
        <div
          style={{
            position:   'absolute',
            inset:      0,
            background: 'linear-gradient(170deg, #EFE0C0 0%, #D4AA72 20%, #B8894A 42%, #9A6E30 65%, #7A5225 85%, #5C3A18 100%)',
          }}
        />
        {/* Warm vignette — draws eye to center */}
        <div
          style={{
            position:   'absolute',
            inset:      0,
            background: 'radial-gradient(ellipse 70% 80% at 50% 40%, transparent 35%, rgba(60,30,10,0.45) 100%)',
          }}
        />
        {/* Film grain texture overlay */}
        <div
          style={{
            position:   'absolute',
            inset:      0,
            backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='500' height='500'%3E%3Cfilter id='grain'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.72' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='500' height='500' filter='url(%23grain)' opacity='0.09'/%3E%3C/svg%3E\")",
            opacity:    1,
          }}
        />
        {/* Aged border — inset frame */}
        <div
          style={{
            position:     'absolute',
            inset:        '20px',
            border:       '1px solid rgba(250,235,200,0.18)',
            pointerEvents: 'none',
          }}
        />
        {/* Horizontal scan lines — aged photograph effect */}
        <div
          style={{
            position:             'absolute',
            inset:                0,
            backgroundImage:      'repeating-linear-gradient(transparent, transparent 3px, rgba(0,0,0,0.015) 3px, rgba(0,0,0,0.015) 4px)',
            pointerEvents:        'none',
          }}
          aria-hidden="true"
        />
        {/* Caption watermark */}
        <p
          style={{
            position:      'absolute',
            bottom:        '32px',
            left:          '32px',
            fontFamily:    'var(--font-space-mono, "Space Mono", "Courier New", monospace)',
            fontSize:      '0.42rem',
            letterSpacing: '0.28em',
            textTransform: 'uppercase' as const,
            color:         'rgba(250,235,200,0.35)',
          }}
        >
          The Archive Begins Here · Photograph Pending
        </p>
      </div>

      {/* Mobile: stack vertically */}
      <style>{`
        @media (max-width: 768px) {
          section[aria-label="Basalith — Heritage archive"] {
            grid-template-columns: 1fr;
            grid-template-rows: 40svh auto;
          }
          section[aria-label="Basalith — Heritage archive"] > div:first-child {
            order: 2;
            padding: 48px 24px 64px !important;
          }
          section[aria-label="Basalith — Heritage archive"] > div:last-child {
            order: 1;
            min-height: 40svh !important;
          }
        }
      `}</style>
    </section>
  )
}
