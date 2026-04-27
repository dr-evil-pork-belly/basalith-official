'use client'

import { useTranslation } from '@/app/hooks/useTranslation'

const STATS = [
  { n: '847',   labelKey: 'story.stat_1_label' },
  { n: '23',    labelKey: 'story.stat_2_label' },
  { n: '2 yrs', labelKey: 'story.stat_3_label' },
]

export default function StorySection() {
  const { t } = useTranslation()
  return (
    <section
      data-reveal
      aria-label="One family"
      style={{ background: 'var(--color-bg)', overflow: 'hidden' }}
    >
      {/* Full-width family tree visualization */}
      <div
        aria-hidden="true"
        style={{
          height:         'clamp(280px, 42vw, 560px)',
          background:     'var(--color-bg)',
          position:       'relative',
          overflow:       'hidden',
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
        }}
      >
        <svg
          viewBox="0 0 400 300"
          style={{ width: '100%', maxWidth: '560px', height: '100%', padding: '20px 24px' }}
          aria-hidden="true"
        >
          {/* Pulse ring — Eleanor */}
          <circle cx="200" cy="60" r="24" fill="none" stroke="rgba(184,150,62,0.45)" strokeWidth="1.5">
            <animate attributeName="r"       from="24"  to="42" dur="2.4s" repeatCount="indefinite" />
            <animate attributeName="opacity" from="0.5" to="0"  dur="2.4s" repeatCount="indefinite" />
          </circle>

          {/* Gen I — Eleanor */}
          <circle cx="200" cy="60" r="24" fill="rgba(184,150,62,0.12)" stroke="#B8963E" strokeWidth="1.5" />
          <text x="200" y="57" textAnchor="middle" fill="#B8963E"            fontSize="9"  fontFamily="var(--font-space-mono,'Space Mono',monospace)">Eleanor</text>
          <text x="200" y="69" textAnchor="middle" fill="rgba(184,150,62,0.5)" fontSize="7" fontFamily="var(--font-space-mono,'Space Mono',monospace)">74</text>

          {/* Lines to Gen II */}
          <line x1="200" y1="84" x2="130" y2="150" stroke="rgba(184,150,62,0.3)" strokeWidth="1" />
          <line x1="200" y1="84" x2="270" y2="150" stroke="rgba(184,150,62,0.3)" strokeWidth="1" />

          {/* Gen II */}
          <circle cx="130" cy="165" r="20" fill="rgba(184,150,62,0.08)" stroke="rgba(184,150,62,0.5)" strokeWidth="1" />
          <text x="130" y="169" textAnchor="middle" fill="rgba(184,150,62,0.7)" fontSize="8" fontFamily="var(--font-space-mono,'Space Mono',monospace)">Patricia</text>

          <circle cx="270" cy="165" r="20" fill="rgba(184,150,62,0.08)" stroke="rgba(184,150,62,0.5)" strokeWidth="1" />
          <text x="270" y="169" textAnchor="middle" fill="rgba(184,150,62,0.7)" fontSize="8" fontFamily="var(--font-space-mono,'Space Mono',monospace)">James</text>

          {/* Lines to Gen III */}
          <line x1="130" y1="185" x2="80"  y2="248" stroke="rgba(184,150,62,0.2)" strokeWidth="0.75" />
          <line x1="130" y1="185" x2="160" y2="248" stroke="rgba(184,150,62,0.2)" strokeWidth="0.75" />
          <line x1="270" y1="185" x2="300" y2="248" stroke="rgba(184,150,62,0.2)" strokeWidth="0.75" />

          {/* Gen III */}
          <circle cx="80"  cy="260" r="16" fill="rgba(184,150,62,0.05)" stroke="rgba(184,150,62,0.3)" strokeWidth="1" />
          <text x="80"  y="264" textAnchor="middle" fill="rgba(184,150,62,0.5)" fontSize="7" fontFamily="var(--font-space-mono,'Space Mono',monospace)">Emma</text>

          <circle cx="160" cy="260" r="16" fill="rgba(184,150,62,0.05)" stroke="rgba(184,150,62,0.3)" strokeWidth="1" />
          <text x="160" y="264" textAnchor="middle" fill="rgba(184,150,62,0.5)" fontSize="7" fontFamily="var(--font-space-mono,'Space Mono',monospace)">Oliver</text>

          <circle cx="300" cy="260" r="16" fill="rgba(184,150,62,0.05)" stroke="rgba(184,150,62,0.3)" strokeWidth="1" />
          <text x="300" y="264" textAnchor="middle" fill="rgba(184,150,62,0.5)" fontSize="7" fontFamily="var(--font-space-mono,'Space Mono',monospace)">Rose</text>

          {/* Generation labels */}
          <text x="368" y="64"  textAnchor="end" fill="rgba(184,150,62,0.22)" fontSize="6" fontFamily="var(--font-space-mono,'Space Mono',monospace)" letterSpacing="2">GEN I</text>
          <text x="368" y="169" textAnchor="end" fill="rgba(184,150,62,0.18)" fontSize="6" fontFamily="var(--font-space-mono,'Space Mono',monospace)" letterSpacing="2">GEN II</text>
          <text x="368" y="264" textAnchor="end" fill="rgba(184,150,62,0.14)" fontSize="6" fontFamily="var(--font-space-mono,'Space Mono',monospace)" letterSpacing="2">GEN III</text>
        </svg>

        <p
          style={{
            position:      'absolute',
            bottom:        '24px',
            left:          '32px',
            fontFamily:    'var(--font-space-mono, "Space Mono", "Courier New", monospace)',
            fontSize:      '0.45rem',
            letterSpacing: '0.3em',
            textTransform: 'uppercase' as const,
            color:         'rgba(184,150,62,0.35)',
            margin:        0,
          }}
        >
          Eleanor&rsquo;s Archive · Active since 2024
        </p>
      </div>

      {/* Story + stats */}
      <div
        style={{
          display:             'grid',
          gridTemplateColumns: '1fr 1fr',
          gap:                 '64px',
          padding:             'clamp(48px,8vw,96px) clamp(24px,6vw,80px)',
          alignItems:          'start',
        }}
      >
        {/* Story text */}
        <div>
          <p
            style={{
              fontFamily:    'var(--font-space-mono, "Space Mono", "Courier New", monospace)',
              fontSize:      'var(--text-caption)',
              letterSpacing: '0.35em',
              textTransform: 'uppercase' as const,
              color:         'var(--color-gold)',
              display:       'flex',
              alignItems:    'center',
              gap:           '12px',
              marginBottom:  '24px',
            }}
          >
            <span style={{ display: 'block', width: '24px', height: '1px', background: 'var(--color-gold)', flexShrink: 0 }} aria-hidden="true" />
            One Family
          </p>
          <div
            style={{
              fontFamily:  'var(--font-cormorant, "Cormorant Garamond", Georgia, serif)',
              fontSize:    '1.2rem',
              fontStyle:   'italic',
              fontWeight:  300,
              lineHeight:  1.9,
              color:       'var(--color-text-secondary)',
            }}
          >
            <p style={{ marginBottom: '20px' }}>{t('story.body_1')}</p>
            <p style={{ marginBottom: '20px' }}>{t('story.body_2')}</p>
            <p style={{ marginBottom: '20px' }}>{t('story.body_3')}</p>
            <p style={{ margin: 0, color: 'var(--color-text-primary)' }}>
              {t('story.conclusion')}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div
          style={{
            display:       'flex',
            flexDirection: 'column',
            gap:           '40px',
            paddingTop:    '8px',
          }}
        >
          {STATS.map(({ n, labelKey }) => (
            <div key={labelKey}>
              <p
                style={{
                  fontFamily:    'var(--font-cormorant, "Cormorant Garamond", Georgia, serif)',
                  fontSize:      'clamp(2rem, 4vw, 3.25rem)',
                  fontWeight:    300,
                  lineHeight:    1,
                  color:         'var(--color-gold)',
                  marginBottom:  '6px',
                  letterSpacing: '-0.02em',
                }}
              >
                {n}
              </p>
              <p
                style={{
                  fontFamily:    'var(--font-space-mono, "Space Mono", "Courier New", monospace)',
                  fontSize:      '0.52rem',
                  letterSpacing: '0.22em',
                  textTransform: 'uppercase' as const,
                  color:         'var(--color-text-muted)',
                }}
              >
                {t(labelKey)}
              </p>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          section[aria-label="One family"] > div[style*="grid-template-columns"] {
            grid-template-columns: 1fr !important;
            gap: 40px !important;
            padding: 40px 24px !important;
          }
        }
      `}</style>
    </section>
  )
}
