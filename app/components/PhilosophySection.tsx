'use client'

import { useTranslation } from '@/app/hooks/useTranslation'

const PILLAR_KEYS = [
  { n: '01', titleKey: 'philosophy.pillar_1_title', bodyKey: 'philosophy.pillar_1_body' },
  { n: '02', titleKey: 'philosophy.pillar_2_title', bodyKey: 'philosophy.pillar_2_body' },
  { n: '03', titleKey: 'philosophy.pillar_3_title', bodyKey: 'philosophy.pillar_3_body' },
]

export default function PhilosophySection() {
  const { t } = useTranslation()

  return (
    <section
      data-reveal
      aria-label="Our philosophy"
      style={{
        background: 'var(--color-void)',
        padding:    'clamp(80px,12vw,160px) clamp(24px,6vw,80px)',
      }}
    >
      <div style={{ maxWidth: '860px', margin: '0 auto' }}>

        <h2
          style={{
            fontFamily:    'var(--font-cormorant, "Cormorant Garamond", Georgia, serif)',
            fontSize:      'clamp(2rem, 4vw, 3.25rem)',
            fontWeight:    300,
            lineHeight:    1.15,
            letterSpacing: '-0.02em',
            color:         'rgba(250,250,248,0.9)',
            marginBottom:  '56px',
          }}
        >
          {t('philosophy.headline')}
        </h2>

        <div
          style={{
            fontFamily:   'var(--font-cormorant, "Cormorant Garamond", Georgia, serif)',
            fontWeight:   300,
            lineHeight:   1.9,
            maxWidth:     '600px',
            marginBottom: '80px',
          }}
        >
          {(['body_1','body_2','body_3'] as const).map(k => (
            <p
              key={k}
              style={{
                fontSize:      '1.15rem',
                fontStyle:     'italic',
                color:         'rgba(250,248,244,0.55)',
                marginBottom:  '28px',
                whiteSpace:    'pre-line',
              }}
            >
              {t(`philosophy.${k}`)}
            </p>
          ))}
          <p
            style={{
              fontSize:      'clamp(1.2rem, 2.5vw, 1.5rem)',
              fontStyle:     'italic',
              color:         'rgba(250,248,244,0.8)',
              marginBottom:  '28px',
              whiteSpace:    'pre-line',
            }}
          >
            {t('philosophy.body_4')}
          </p>
          <p
            style={{
              fontSize:   'clamp(1.2rem, 2.5vw, 1.5rem)',
              fontStyle:  'italic',
              color:      'rgba(196,162,74,0.9)',
              margin:     0,
              whiteSpace: 'pre-line',
            }}
          >
            {t('philosophy.body_5')}
          </p>
        </div>

        {/* Gold divider */}
        <div aria-hidden="true" style={{ width: '40px', height: '1px', background: 'var(--color-gold)', margin: '0 0 80px' }} />

        {/* Three pillars */}
        <div
          style={{
            display:             'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap:                 '48px',
          }}
        >
          {PILLAR_KEYS.map(({ n, titleKey, bodyKey }) => (
            <div key={n} data-reveal>
              <p
                style={{
                  fontFamily:    'var(--font-space-mono, "Space Mono", "Courier New", monospace)',
                  fontSize:      '0.52rem',
                  letterSpacing: '0.3em',
                  textTransform: 'uppercase' as const,
                  color:         'var(--color-gold)',
                  marginBottom:  '16px',
                }}
              >
                {n}
              </p>
              <h3
                style={{
                  fontFamily:   'var(--font-cormorant, "Cormorant Garamond", Georgia, serif)',
                  fontSize:     '1.4rem',
                  fontWeight:   500,
                  color:        'rgba(250,248,244,0.9)',
                  marginBottom: '20px',
                  lineHeight:   1.2,
                }}
              >
                {t(titleKey)}
              </h3>
              <p
                style={{
                  fontFamily:  'var(--font-cormorant, "Cormorant Garamond", Georgia, serif)',
                  fontSize:    '1.05rem',
                  fontWeight:  300,
                  lineHeight:  1.85,
                  color:       'rgba(250,248,244,0.45)',
                  whiteSpace:  'pre-line',
                }}
              >
                {t(bodyKey)}
              </p>
            </div>
          ))}
        </div>

      </div>

      <style>{`
        @media (max-width: 768px) {
          section[aria-label="Our philosophy"] {
            padding: 64px 24px !important;
          }
          section[aria-label="Our philosophy"] > div > div[style*="grid-template-columns"] {
            grid-template-columns: 1fr !important;
            gap: 40px !important;
          }
          section[aria-label="Our philosophy"] h2 {
            font-size: clamp(1.75rem, 7vw, 2.5rem) !important;
          }
        }
      `}</style>
    </section>
  )
}
