'use client'

import { useLanguage } from '@/app/context/LanguageContext'

export default function StorySection() {
  const { t } = useLanguage()

  return (
    <section
      data-reveal
      aria-label="One family"
      style={{
        background: 'var(--color-bg)',
        padding:    'clamp(80px,12vw,140px) clamp(24px,6vw,80px)',
      }}
    >
      <div style={{ maxWidth: '640px', margin: '0 auto' }}>

        <div
          style={{
            fontFamily:  'var(--font-cormorant, "Cormorant Garamond", Georgia, serif)',
            fontSize:    'clamp(1.1rem, 2vw, 1.3rem)',
            fontStyle:   'italic',
            fontWeight:  300,
            lineHeight:  2.0,
            color:       'var(--color-text-secondary)',
          }}
        >
          <p style={{ marginBottom: '28px', whiteSpace: 'pre-line' }}>{t('story.body_1')}</p>
          <p style={{ marginBottom: '28px', whiteSpace: 'pre-line' }}>{t('story.body_2')}</p>
          <p style={{ marginBottom: '28px', whiteSpace: 'pre-line' }}>{t('story.body_3')}</p>
          <p style={{ marginBottom: '48px', whiteSpace: 'pre-line' }}>{t('story.body_4')}</p>
        </div>

        {/* Rule */}
        <div
          aria-hidden="true"
          style={{
            width:       '40px',
            height:      '1px',
            background:  'var(--color-gold)',
            marginBottom: '32px',
          }}
        />

        <p
          style={{
            fontFamily:    'var(--font-space-mono, "Space Mono", "Courier New", monospace)',
            fontSize:      '0.52rem',
            letterSpacing: '0.28em',
            textTransform: 'uppercase' as const,
            color:         'var(--color-gold)',
          }}
        >
          {t('story.conclusion')}
        </p>

      </div>

      <style>{`
        @media (max-width: 768px) {
          section[aria-label="One family"] {
            padding: 64px 24px !important;
          }
        }
      `}</style>
    </section>
  )
}
