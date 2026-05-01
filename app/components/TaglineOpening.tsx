'use client'

import { useLanguage } from '@/app/context/LanguageContext'

export default function TaglineOpening() {
  const { t } = useLanguage()

  return (
    <section
      aria-label="Tagline"
      style={{
        minHeight:      '100vh',
        background:     'var(--color-void)',
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
        justifyContent: 'center',
        padding:        '120px 24px',
        position:       'relative',
      }}
    >
      <div
        aria-hidden="true"
        style={{
          width:        '1px',
          height:       '60px',
          background:   'linear-gradient(to bottom, transparent, rgba(184,150,62,0.6))',
          marginBottom: '48px',
        }}
      />

      <p
        style={{
          fontFamily:    'var(--font-cormorant, "Cormorant Garamond", Georgia, serif)',
          fontSize:      'clamp(1.75rem, 5vw, 4rem)',
          fontWeight:    300,
          fontStyle:     'italic',
          color:         'rgba(250,250,248,0.95)',
          lineHeight:    1.4,
          textAlign:     'center',
          maxWidth:      '800px',
          margin:        '0 0 48px',
          letterSpacing: '-0.01em',
        }}
      >
        &ldquo;{t('tagline.quote_1')}
        <br />
        {t('tagline.quote_2')}
        <br />
        {t('tagline.quote_3')}&rdquo;
      </p>

      <div
        aria-hidden="true"
        style={{
          width:        '1px',
          height:       '60px',
          background:   'linear-gradient(to top, transparent, rgba(184,150,62,0.6))',
          marginBottom: '64px',
        }}
      />

      {/* Scroll indicator */}
      <div
        aria-hidden="true"
        style={{
          position:      'absolute',
          bottom:        '40px',
          left:          '50%',
          transform:     'translateX(-50%)',
          display:       'flex',
          flexDirection: 'column',
          alignItems:    'center',
          gap:           '8px',
        }}
      >
        <p
          style={{
            fontFamily:    'var(--font-space-mono, "Space Mono", "Courier New", monospace)',
            fontSize:      '0.45rem',
            letterSpacing: '0.4em',
            color:         'rgba(184,150,62,0.4)',
            margin:        0,
            textTransform: 'uppercase' as const,
          }}
        >
          {t('tagline.scroll')}
        </p>
        <svg
          width="16"
          height="24"
          viewBox="0 0 16 24"
          fill="none"
          style={{ animation: 'scrollBounce 2s ease-in-out infinite' }}
        >
          <line x1="8" y1="0"  x2="8"  y2="20" stroke="rgba(184,150,62,0.4)" strokeWidth="1" />
          <polyline points="2,14 8,20 14,14" stroke="rgba(184,150,62,0.4)" strokeWidth="1" fill="none" />
        </svg>
      </div>

      <style>{`
        @media (max-width: 430px) {
          section[aria-label="Tagline"] {
            padding: 80px 32px !important;
          }
        }
      `}</style>
    </section>
  )
}
