'use client'

import Link from 'next/link'
import { useLanguage } from '@/app/context/LanguageContext'

const MONO: React.CSSProperties = {
  fontFamily:    'var(--font-space-mono, "Space Mono", "Courier New", monospace)',
  fontSize:      '0.52rem',
  letterSpacing: '0.35em',
  textTransform: 'uppercase' as const,
}

export default function ClosingSection() {
  const { t } = useLanguage()

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

        <p style={{ ...MONO, color: 'var(--color-gold)', marginBottom: '48px' }}>
          {t('closing.eyebrow')}
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
          {t('closing.headline_1')}
          <br />
          {t('closing.headline_2')}
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
          {t('closing.sub')}
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
          <p style={{ margin: '0' }}>{t('closing.tagline_1')}</p>
          <p style={{ margin: '0' }}>{t('closing.tagline_2')}</p>
          <p style={{ margin: '0' }}>{t('closing.tagline_3')}</p>
        </div>

        <Link
          href="/apply"
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
          {t('closing.cta')}
        </Link>

        <p
          style={{
            ...MONO,
            fontSize:  '0.44rem',
            color:     'rgba(250,250,248,0.2)',
            marginTop: '20px',
          }}
        >
          {t('closing.price')}
        </p>

      </div>
    </section>
  )
}
