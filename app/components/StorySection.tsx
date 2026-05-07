'use client'

import { useLanguage } from '@/app/context/LanguageContext'

export default function StorySection() {
  const { t } = useLanguage()

  return (
    <section
      data-reveal
      aria-label="A note from the founder"
      style={{
        background: 'var(--color-surface-alt)',
        padding:    'clamp(80px,12vw,140px) 24px',
      }}
    >
      <div style={{ maxWidth: '640px', margin: '0 auto' }}>

        {/* Gold rule above */}
        <div
          aria-hidden="true"
          style={{
            width:        '40px',
            height:       '1px',
            background:   'var(--color-gold)',
            marginBottom: '48px',
          }}
        />

        {/* Founder moment */}
        <div
          style={{
            fontFamily:  'var(--font-cormorant, "Cormorant Garamond", Georgia, serif)',
            fontSize:    'clamp(1.1rem, 2.5vw, 1.35rem)',
            fontStyle:   'italic',
            fontWeight:  300,
            lineHeight:  1.9,
            color:       'var(--color-text-secondary)',
            marginBottom: '48px',
          }}
        >
          <p style={{ marginBottom: '28px', whiteSpace: 'pre-line' }}>{t('story.founder_p1')}</p>
          <p style={{ marginBottom: '28px', whiteSpace: 'pre-line' }}>{t('story.founder_p2')}</p>
          <p style={{ marginBottom: '28px', whiteSpace: 'pre-line' }}>{t('story.founder_p3')}</p>
          <p style={{ whiteSpace: 'pre-line' }}>{t('story.founder_p4')}</p>
        </div>

        {/* Attribution */}
        <p
          style={{
            fontFamily:  'var(--font-cormorant, "Cormorant Garamond", Georgia, serif)',
            fontSize:    '0.9rem',
            fontStyle:   'normal',
            fontWeight:  400,
            color:       'var(--color-text-muted)',
            marginTop:   '32px',
            whiteSpace:  'pre-line',
          }}
        >
          {t('story.founder_attribution')}
        </p>

        {/* Gold rule below */}
        <div
          aria-hidden="true"
          style={{
            width:     '40px',
            height:    '1px',
            background: 'var(--color-gold)',
            marginTop: '48px',
          }}
        />

      </div>

      <style>{`
        @media (max-width: 768px) {
          section[aria-label="A note from the founder"] {
            padding: 64px 24px !important;
          }
        }
      `}</style>
    </section>
  )
}
