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
        className="hero-text-col"
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
          <span className="headline-line headline-line-1">You never truly leave</span>
          <span className="headline-line headline-line-2" style={{ fontStyle: 'italic', color: 'var(--color-gold)' }}>if you leave enough</span>
          <span className="headline-line headline-line-3">of yourself behind.</span>
        </h1>

        {/* Sub-headline */}
        <div
          style={{
            fontFamily:    'var(--font-cormorant, "Cormorant Garamond", Georgia, serif)',
            fontSize:      '1.15rem',
            fontStyle:     'italic',
            fontWeight:    300,
            lineHeight:    1.9,
            color:         'var(--color-text-secondary)',
            maxWidth:      '460px',
            margin:        '0 0 44px',
            opacity:       0,
            animation:     'lineReveal 700ms cubic-bezier(0.16,1,0.3,1) 450ms both',
          }}
        >
          <p style={{ margin: '0 0 16px' }}>
            Basalith builds a living AI entity trained on how you specifically think.
            Not what you did.
            How you reason. What you value. How you see the world.
          </p>
          <p style={{ margin: 0 }}>
            While you are alive it learns from you.
            Long after you are gone it continues.
          </p>
        </div>

        {/* CTAs */}
        <div
          className="hero-ctas"
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

      {/* ── Right: Atmospheric art ── */}
      <div
        aria-hidden="true"
        className="hero-image-col"
        style={{
          position:   'relative',
          overflow:   'hidden',
          minHeight:  'clamp(400px, 60vh, 900px)',
          background: '#EDE5D0',
          border:     '1px solid rgba(184,150,62,0.3)',
          boxShadow:  'inset 0 0 60px rgba(184,150,62,0.1), 0 8px 32px rgba(26,24,20,0.08)',
        }}
      >
        {/* Warm parchment base */}
        <div
          style={{
            position: 'absolute',
            inset:    0,
            background: [
              'radial-gradient(ellipse at 30% 40%, rgba(184,150,62,0.30) 0%, transparent 60%)',
              'radial-gradient(ellipse at 70% 70%, rgba(184,150,62,0.18) 0%, transparent 50%)',
              'linear-gradient(135deg, #EDE5D0 0%, #E3D8BE 50%, #D9CEAC 100%)',
            ].join(', '),
          }}
        />

        {/* Grain texture overlay */}
        <div
          style={{
            position:        'absolute',
            inset:           0,
            backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E\")",
            opacity:         0.4,
          }}
        />

        {/* Gold geometric lines — frames and constellation */}
        <svg
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
          viewBox="0 0 600 800"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
        >
          <rect x="40" y="60" width="320" height="420" fill="none" stroke="rgba(184,150,62,0.45)" strokeWidth="1.5" />
          <rect x="60" y="80" width="320" height="420" fill="none" stroke="rgba(184,150,62,0.30)" strokeWidth="1" />
          <rect x="20" y="40" width="320" height="420" fill="none" stroke="rgba(184,150,62,0.20)" strokeWidth="0.75" />
          <line x1="40"  y1="200" x2="360" y2="200" stroke="rgba(184,150,62,0.22)" strokeWidth="0.75" />
          <line x1="40"  y1="340" x2="360" y2="340" stroke="rgba(184,150,62,0.18)" strokeWidth="0.75" />
          <circle cx="120" cy="180" r="3"   fill="rgba(184,150,62,0.50)" />
          <circle cx="200" cy="150" r="3"   fill="rgba(184,150,62,0.40)" />
          <circle cx="280" cy="200" r="4"   fill="rgba(184,150,62,0.45)" />
          <circle cx="160" cy="280" r="3"   fill="rgba(184,150,62,0.40)" />
          <circle cx="240" cy="320" r="3"   fill="rgba(184,150,62,0.50)" />
          <line x1="120" y1="180" x2="200" y2="150" stroke="rgba(184,150,62,0.22)" strokeWidth="0.75" />
          <line x1="200" y1="150" x2="280" y2="200" stroke="rgba(184,150,62,0.22)" strokeWidth="0.75" />
          <line x1="120" y1="180" x2="160" y2="280" stroke="rgba(184,150,62,0.22)" strokeWidth="0.75" />
          <line x1="280" y1="200" x2="240" y2="320" stroke="rgba(184,150,62,0.22)" strokeWidth="0.75" />
        </svg>

        {/* Vignette edges */}
        <div
          style={{
            position:   'absolute',
            inset:      0,
            background: 'radial-gradient(ellipse at center, transparent 40%, rgba(217,206,172,0.5) 100%)',
          }}
        />

        {/* Inset gold frame */}
        <div
          style={{
            position:      'absolute',
            inset:         '16px',
            border:        '1px solid rgba(184,150,62,0.4)',
            pointerEvents: 'none',
          }}
        />

        {/* Caption */}
        <div style={{ position: 'absolute', bottom: 32, left: 32, right: 32 }}>
          <p
            style={{
              fontFamily:    'var(--font-space-mono, "Space Mono", "Courier New", monospace)',
              fontSize:      '0.55rem',
              letterSpacing: '0.3em',
              color:         'rgba(184,150,62,0.5)',
              margin:        0,
              textTransform: 'uppercase' as const,
            }}
          >
            Your archive begins here
          </p>
        </div>
      </div>

      {/* Mobile: text above, image below */}
      <style>{`
        @media (max-width: 767px) {
          section[aria-label="Basalith — Heritage archive"] {
            grid-template-columns: 1fr !important;
            grid-template-rows: auto clamp(240px, 40vh, 320px) !important;
            min-height: unset !important;
          }
          .hero-text-col {
            order: 1 !important;
            padding: 48px 24px 32px !important;
            width: 100% !important;
          }
          .hero-image-col {
            order: 2 !important;
            min-height: unset !important;
            height: clamp(240px, 40vh, 320px) !important;
            width: 100% !important;
          }
          .hero-ctas {
            flex-direction: column !important;
            gap: 12px !important;
          }
          .hero-ctas a {
            width: 100% !important;
            text-align: center !important;
            justify-content: center !important;
            box-sizing: border-box !important;
            min-height: 48px !important;
            display: flex !important;
            align-items: center !important;
          }
        }
      `}</style>
    </section>
  )
}
