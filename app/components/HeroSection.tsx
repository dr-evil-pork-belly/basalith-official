'use client'

import Link from 'next/link'
import { useLanguage } from '@/app/context/LanguageContext'

const MONO: React.CSSProperties = {
  fontFamily:    'var(--font-space-mono, "Space Mono", "Courier New", monospace)',
  fontSize:      'var(--text-caption)',
  letterSpacing: '0.35em',
  textTransform: 'uppercase' as const,
}

export default function HeroSection() {
  const { t } = useLanguage()

  return (
    <section
      aria-label="Basalith — Heritage archive"
      style={{
        minHeight:           '100svh',
        display:             'grid',
        gridTemplateColumns: '55fr 45fr',
        background:          'var(--color-bg)',
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
            color:        'var(--color-gold)',
            display:      'flex',
            alignItems:   'center',
            gap:          '12px',
            marginBottom: '32px',
            opacity:      0,
            animation:    'lineReveal 600ms cubic-bezier(0.16,1,0.3,1) 0ms both',
          }}
        >
          <span style={{ display: 'block', width: '24px', height: '1px', background: 'var(--color-gold)', flexShrink: 0 }} aria-hidden="true" />
          Heritage Nexus · Basalith
        </p>

        {/* Display headline — two lines */}
        <h1
          style={{
            fontFamily:    'var(--font-cormorant, "Cormorant Garamond", Georgia, serif)',
            fontSize:      'var(--text-display)',
            fontWeight:    300,
            lineHeight:    1.04,
            letterSpacing: '-0.025em',
            color:         'var(--color-text-primary)',
            margin:        '0 0 20px',
          }}
        >
          <span className="headline-line headline-line-1">{t('hero.headline_1')}</span>
          <span className="headline-line headline-line-2">{t('hero.headline_2')}</span>
        </h1>

        {/* Smaller echo line */}
        <div
          style={{
            fontFamily:    'var(--font-cormorant, "Cormorant Garamond", Georgia, serif)',
            fontSize:      'clamp(1rem, 2vw, 1.25rem)',
            fontStyle:     'italic',
            fontWeight:    300,
            lineHeight:    1.6,
            color:         'var(--color-text-muted)',
            marginBottom:  '36px',
            opacity:       0,
            animation:     'lineReveal 700ms cubic-bezier(0.16,1,0.3,1) 300ms both',
          }}
        >
          <span style={{ display: 'block' }}>{t('hero.subheadline_a')}</span>
          <span style={{ display: 'block' }}>{t('hero.subheadline_b')}</span>
        </div>

        {/* Sub copy */}
        <p
          style={{
            fontFamily:  'var(--font-cormorant, "Cormorant Garamond", Georgia, serif)',
            fontSize:    '1.15rem',
            fontStyle:   'italic',
            fontWeight:  300,
            lineHeight:  1.9,
            color:       'var(--color-text-secondary)',
            maxWidth:    '440px',
            margin:      '0 0 44px',
            opacity:     0,
            animation:   'lineReveal 700ms cubic-bezier(0.16,1,0.3,1) 500ms both',
          }}
        >
          {t('hero.subheadline')}
        </p>

        {/* CTAs */}
        <div
          className="hero-ctas"
          style={{
            display:   'flex',
            gap:       '16px',
            flexWrap:  'wrap',
            opacity:   0,
            animation: 'lineReveal 600ms cubic-bezier(0.16,1,0.3,1) 700ms both',
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
            {t('hero.cta_primary')}
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
            {t('hero.cta_secondary')}
          </Link>
        </div>
      </div>

      {/* ── Right: Dark archive art ── */}
      <div
        aria-hidden="true"
        className="hero-image-col"
        style={{
          position:  'relative',
          overflow:  'hidden',
          minHeight: 'clamp(400px, 60vh, 900px)',
          background: '#1A1510',
        }}
      >
        {/* Dark warm gradient base */}
        <div style={{
          position: 'absolute',
          inset:    0,
          background: [
            'radial-gradient(ellipse at 40% 50%, rgba(184,150,62,0.2) 0%, transparent 60%)',
            'radial-gradient(ellipse at 80% 20%, rgba(184,150,62,0.1) 0%, transparent 50%)',
            'linear-gradient(160deg, #2A2018 0%, #1A1510 40%, #0F0D0A 100%)',
          ].join(', '),
        }} />

        {/* Gold frame + constellation */}
        <svg
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
          viewBox="0 0 500 700"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
        >
          <rect x="32" y="32" width="436" height="636" fill="none" stroke="rgba(184,150,62,0.4)" strokeWidth="1" />
          <rect x="48" y="48" width="404" height="604" fill="none" stroke="rgba(184,150,62,0.2)" strokeWidth="0.5" />
          <line x1="32"  y1="72"  x2="72"  y2="72"  stroke="rgba(184,150,62,0.6)" strokeWidth="1.5" />
          <line x1="72"  y1="32"  x2="72"  y2="72"  stroke="rgba(184,150,62,0.6)" strokeWidth="1.5" />
          <line x1="428" y1="72"  x2="468" y2="72"  stroke="rgba(184,150,62,0.6)" strokeWidth="1.5" />
          <line x1="428" y1="32"  x2="428" y2="72"  stroke="rgba(184,150,62,0.6)" strokeWidth="1.5" />
          <line x1="32"  y1="628" x2="72"  y2="628" stroke="rgba(184,150,62,0.6)" strokeWidth="1.5" />
          <line x1="72"  y1="628" x2="72"  y2="668" stroke="rgba(184,150,62,0.6)" strokeWidth="1.5" />
          <line x1="428" y1="628" x2="468" y2="628" stroke="rgba(184,150,62,0.6)" strokeWidth="1.5" />
          <line x1="428" y1="628" x2="428" y2="668" stroke="rgba(184,150,62,0.6)" strokeWidth="1.5" />
          <circle cx="180" cy="220" r="3"   fill="rgba(184,150,62,0.6)" />
          <circle cx="280" cy="180" r="2"   fill="rgba(184,150,62,0.4)" />
          <circle cx="320" cy="280" r="3.5" fill="rgba(184,150,62,0.5)" />
          <circle cx="200" cy="340" r="2.5" fill="rgba(184,150,62,0.4)" />
          <circle cx="300" cy="380" r="2"   fill="rgba(184,150,62,0.3)" />
          <circle cx="240" cy="440" r="3"   fill="rgba(184,150,62,0.5)" />
          <circle cx="160" cy="400" r="2"   fill="rgba(184,150,62,0.3)" />
          <line x1="180" y1="220" x2="280" y2="180" stroke="rgba(184,150,62,0.15)" strokeWidth="0.75" />
          <line x1="280" y1="180" x2="320" y2="280" stroke="rgba(184,150,62,0.15)" strokeWidth="0.75" />
          <line x1="180" y1="220" x2="200" y2="340" stroke="rgba(184,150,62,0.15)" strokeWidth="0.75" />
          <line x1="320" y1="280" x2="300" y2="380" stroke="rgba(184,150,62,0.15)" strokeWidth="0.75" />
          <line x1="200" y1="340" x2="240" y2="440" stroke="rgba(184,150,62,0.15)" strokeWidth="0.75" />
          <line x1="200" y1="340" x2="160" y2="400" stroke="rgba(184,150,62,0.15)" strokeWidth="0.75" />
          <line x1="140" y1="548" x2="360" y2="548" stroke="rgba(184,150,62,0.2)" strokeWidth="0.5" />
          <text x="250" y="560" textAnchor="middle" fill="rgba(184,150,62,0.3)" fontSize="8" fontFamily="monospace" letterSpacing="4">
            YOUR ARCHIVE BEGINS HERE
          </text>
        </svg>

        {/* Vignette */}
        <div style={{
          position:   'absolute',
          inset:      0,
          background: 'radial-gradient(ellipse at center, transparent 40%, rgba(10,9,8,0.4) 100%)',
        }} />
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
            padding-top: max(100px, calc(env(safe-area-inset-top, 0px) + 80px)) !important;
            padding-left: 24px !important;
            padding-right: 24px !important;
            padding-bottom: 32px !important;
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
