'use client'

import Link from 'next/link'
import { useLanguage } from '@/app/context/LanguageContext'

const MONO: React.CSSProperties = {
  fontFamily:    'var(--font-space-mono, "Space Mono", "Courier New", monospace)',
  fontSize:      '0.52rem',
  letterSpacing: '0.3em',
  textTransform: 'uppercase' as const,
}
const SERIF: React.CSSProperties = {
  fontFamily: 'var(--font-cormorant, "Cormorant Garamond", Georgia, serif)',
}

export default function TwoPathsSection() {
  const { t } = useLanguage()

  return (
    <section
      aria-label="Who Basalith is for"
      style={{
        background: 'var(--color-bg)',
        padding:    'clamp(80px,12vw,140px) clamp(24px,6vw,80px)',
      }}
    >
      <div style={{ maxWidth: '1040px', margin: '0 auto' }}>

        {/* Eyebrow */}
        <p style={{ ...MONO, color: 'var(--color-gold)', marginBottom: '48px' }}>
          {t('two_paths.eyebrow')}
        </p>

        {/* Two cards */}
        <div className="two-paths-grid" style={{
          display:             'grid',
          gridTemplateColumns: '1fr 1fr',
          gap:                 '24px',
        }}>

          {/* Legacy card */}
          <div style={{
            border:        '1px solid var(--color-border-medium)',
            padding:       'clamp(32px,4vw,52px)',
            background:    'var(--color-surface)',
            display:       'flex',
            flexDirection: 'column',
          }}>
            <p style={{ ...MONO, color: 'var(--color-gold)', marginBottom: '20px' }}>
              {t('two_paths.legacy_eyebrow')}
            </p>
            <h2 style={{
              ...SERIF,
              fontSize:     'clamp(1.5rem,2.5vw,2.1rem)',
              fontWeight:   300,
              lineHeight:   1.15,
              color:        'var(--color-text-primary)',
              marginBottom: '20px',
            }}>
              {t('two_paths.legacy_headline')}
            </h2>
            <p style={{
              ...SERIF,
              fontSize:     '1.05rem',
              fontStyle:    'italic',
              fontWeight:   300,
              lineHeight:   1.85,
              color:        'var(--color-text-secondary)',
              marginBottom: '32px',
              flex:         1,
            }}>
              {t('two_paths.legacy_body')}
            </p>
            <Link
              href="/apply"
              style={{
                ...MONO,
                display:        'inline-block',
                color:          '#0A0908',
                textDecoration: 'none',
                background:     'var(--color-gold)',
                padding:        '14px 28px',
                alignSelf:      'flex-start',
                transition:     'background 250ms ease',
              }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--color-gold-light)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'var(--color-gold)'}
            >
              {t('two_paths.legacy_cta')} &rarr;
            </Link>
          </div>

          {/* Succession card */}
          <div style={{
            border:        '1px solid rgba(184,150,62,0.3)',
            padding:       'clamp(32px,4vw,52px)',
            background:    'rgba(184,150,62,0.04)',
            display:       'flex',
            flexDirection: 'column',
          }}>
            <p style={{ ...MONO, color: 'var(--color-gold)', marginBottom: '20px' }}>
              {t('two_paths.succession_eyebrow')}
            </p>
            <h2 style={{
              ...SERIF,
              fontSize:     'clamp(1.5rem,2.5vw,2.1rem)',
              fontWeight:   300,
              lineHeight:   1.15,
              color:        'var(--color-text-primary)',
              marginBottom: '20px',
            }}>
              {t('two_paths.succession_headline')}
            </h2>
            <p style={{
              ...SERIF,
              fontSize:     '1.05rem',
              fontStyle:    'italic',
              fontWeight:   300,
              lineHeight:   1.85,
              color:        'var(--color-text-secondary)',
              marginBottom: '32px',
              flex:         1,
            }}>
              {t('two_paths.succession_body')}
            </p>
            <Link
              href="/succession"
              style={{
                ...MONO,
                display:        'inline-block',
                color:          'var(--color-gold)',
                textDecoration: 'none',
                background:     'transparent',
                padding:        '13px 27px',
                border:         '1px solid var(--color-gold)',
                alignSelf:      'flex-start',
                transition:     'background 250ms ease, color 250ms ease',
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLElement
                el.style.background = 'var(--color-gold)'
                el.style.color = '#0A0908'
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLElement
                el.style.background = 'transparent'
                el.style.color = 'var(--color-gold)'
              }}
            >
              {t('two_paths.succession_cta')} &rarr;
            </Link>
          </div>

        </div>
      </div>

      <style>{`
        @media (max-width: 767px) {
          .two-paths-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </section>
  )
}
