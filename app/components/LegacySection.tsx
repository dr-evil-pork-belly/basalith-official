'use client'

import Link from 'next/link'
import { useLanguage } from '@/app/context/LanguageContext'

const MONO: React.CSSProperties = {
  fontFamily:    'var(--font-space-mono, "Space Mono", "Courier New", monospace)',
  fontSize:      'var(--text-caption)',
  letterSpacing: '0.35em',
  textTransform: 'uppercase' as const,
}

export default function LegacySection() {
  const { t } = useLanguage()

  return (
    <section
      id="legacy"
      data-reveal
      aria-label="For intentional builders"
      style={{ background: 'var(--color-surface-alt)', overflow: 'hidden' }}
    >
      <div
        style={{
          display:             'grid',
          gridTemplateColumns: '55fr 45fr',
          minHeight:           'clamp(480px, 65vh, 720px)',
        }}
      >
        {/* ── Left: Text ── */}
        <div
          style={{
            display:        'flex',
            flexDirection:  'column',
            justifyContent: 'center',
            padding:        'clamp(64px,10vw,120px) clamp(24px,6vw,80px)',
          }}
        >
          <p
            style={{
              ...MONO,
              color:        'var(--color-gold)',
              display:      'flex',
              alignItems:   'center',
              gap:          '12px',
              marginBottom: '28px',
            }}
          >
            <span style={{ display: 'block', width: '24px', height: '1px', background: 'var(--color-gold)', flexShrink: 0 }} aria-hidden="true" />
            {t('legacy.eyebrow')}
          </p>

          <h2
            style={{
              fontFamily:    'var(--font-cormorant, "Cormorant Garamond", Georgia, serif)',
              fontSize:      'clamp(1.75rem, 4vw, 3rem)',
              fontWeight:    300,
              lineHeight:    1.2,
              letterSpacing: '-0.02em',
              color:         'var(--color-text-primary)',
              marginBottom:  '36px',
            }}
          >
            {t('legacy.headline_1')}
            <br />
            {t('legacy.headline_2')}
          </h2>

          <div
            style={{
              fontFamily:   'var(--font-cormorant, "Cormorant Garamond", Georgia, serif)',
              fontSize:     '1.1rem',
              fontWeight:   300,
              lineHeight:   1.9,
              color:        'var(--color-text-secondary)',
              maxWidth:     '440px',
              marginBottom: '44px',
            }}
          >
            <p style={{ marginBottom: '14px' }}>{t('legacy.body_1')}</p>
            <p style={{ marginBottom: '28px', fontStyle: 'italic' }}>{t('legacy.body_2')}</p>
            <p style={{ marginBottom: '14px' }}>{t('legacy.body_3')}</p>
            <p style={{ marginBottom: '28px' }}>{t('legacy.body_4')}</p>
            <p style={{ marginBottom: '14px' }}>{t('legacy.body_5')}</p>
            <p style={{ margin: 0, color: 'var(--color-text-primary)' }}>{t('legacy.body_6')}</p>
          </div>

          <div>
            <Link
              href="/apply"
              style={{
                ...MONO,
                display:        'inline-block',
                color:          'var(--color-text-secondary)',
                textDecoration: 'none',
                background:     'transparent',
                padding:        '13px 28px',
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
              {t('legacy.cta')}
            </Link>
          </div>
        </div>

        {/* ── Right: Dark archive art ── */}
        <div
          aria-hidden="true"
          style={{ position: 'relative', overflow: 'hidden', background: '#1A1510' }}
        >
          <div style={{
            position: 'absolute', inset: 0,
            background: [
              'radial-gradient(ellipse at 40% 50%, rgba(184,150,62,0.18) 0%, transparent 60%)',
              'radial-gradient(ellipse at 80% 20%, rgba(184,150,62,0.08) 0%, transparent 50%)',
              'linear-gradient(160deg, #2A2018 0%, #1A1510 40%, #0F0D0A 100%)',
            ].join(', '),
          }} />
          <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} viewBox="0 0 400 600" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
            <rect x="28" y="28" width="344" height="544" fill="none" stroke="rgba(184,150,62,0.35)" strokeWidth="1" />
            <rect x="44" y="44" width="312" height="512" fill="none" stroke="rgba(184,150,62,0.15)" strokeWidth="0.5" />
            <line x1="28"  y1="68"  x2="68"  y2="68"  stroke="rgba(184,150,62,0.55)" strokeWidth="1.5" />
            <line x1="68"  y1="28"  x2="68"  y2="68"  stroke="rgba(184,150,62,0.55)" strokeWidth="1.5" />
            <line x1="332" y1="68"  x2="372" y2="68"  stroke="rgba(184,150,62,0.55)" strokeWidth="1.5" />
            <line x1="332" y1="28"  x2="332" y2="68"  stroke="rgba(184,150,62,0.55)" strokeWidth="1.5" />
            <line x1="28"  y1="532" x2="68"  y2="532" stroke="rgba(184,150,62,0.55)" strokeWidth="1.5" />
            <line x1="68"  y1="532" x2="68"  y2="572" stroke="rgba(184,150,62,0.55)" strokeWidth="1.5" />
            <line x1="332" y1="532" x2="372" y2="532" stroke="rgba(184,150,62,0.55)" strokeWidth="1.5" />
            <line x1="332" y1="532" x2="332" y2="572" stroke="rgba(184,150,62,0.55)" strokeWidth="1.5" />
            <circle cx="140" cy="180" r="2.5" fill="rgba(184,150,62,0.55)" />
            <circle cx="240" cy="150" r="2"   fill="rgba(184,150,62,0.4)"  />
            <circle cx="280" cy="240" r="3"   fill="rgba(184,150,62,0.45)" />
            <circle cx="160" cy="300" r="2"   fill="rgba(184,150,62,0.35)" />
            <circle cx="260" cy="340" r="2.5" fill="rgba(184,150,62,0.45)" />
            <circle cx="200" cy="400" r="2"   fill="rgba(184,150,62,0.3)"  />
            <line x1="140" y1="180" x2="240" y2="150" stroke="rgba(184,150,62,0.12)" strokeWidth="0.75" />
            <line x1="240" y1="150" x2="280" y2="240" stroke="rgba(184,150,62,0.12)" strokeWidth="0.75" />
            <line x1="140" y1="180" x2="160" y2="300" stroke="rgba(184,150,62,0.12)" strokeWidth="0.75" />
            <line x1="280" y1="240" x2="260" y2="340" stroke="rgba(184,150,62,0.12)" strokeWidth="0.75" />
            <line x1="160" y1="300" x2="200" y2="400" stroke="rgba(184,150,62,0.12)" strokeWidth="0.75" />
          </svg>
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, transparent 40%, rgba(10,9,8,0.4) 100%)' }} />
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          section[aria-label="For intentional builders"] > div {
            grid-template-columns: 1fr !important;
            min-height: unset !important;
          }
          section[aria-label="For intentional builders"] > div > div:last-child {
            height: 260px;
          }
        }
      `}</style>
    </section>
  )
}
