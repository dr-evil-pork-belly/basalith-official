const MONO: React.CSSProperties = {
  fontFamily:    'var(--font-space-mono, "Space Mono", "Courier New", monospace)',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.28em',
}

const SERIF: React.CSSProperties = {
  fontFamily: 'var(--font-cormorant, "Cormorant Garamond", Georgia, serif)',
}

// Plain facts, no defensive tone. Directly answers the "AI chatbot wrapper" doubt.
const ITEMS = [
  {
    title: 'Not a grief chatbot.',
    body:  'Basalith is built while the person is alive and fully participating. Not reconstructed from old messages after they are gone.',
  },
  {
    title: 'Not a wrapper on a general AI.',
    body:  "Every entity is trained exclusively on one person's deposits. Their voice, their words, their specific way of thinking. No general model speaks for your archive.",
  },
  {
    title: 'Not a data broker.',
    body:  'Your archive data is never shared, never sold, and never used to train models for other users. Ever.',
  },
  {
    title: 'Not a startup with your memories.',
    body:  'You own your archive completely. Export everything at any time. 90 days notice if we ever close.',
  },
]

export default function WhatBasalithIsNot() {
  return (
    <section style={{ background: 'var(--color-void)', padding: 'clamp(72px,10vw,128px) clamp(24px,6vw,80px)' }}>
      <div style={{ maxWidth: '780px', margin: '0 auto' }}>
        <p style={{ ...MONO, fontSize: '0.6rem', color: 'var(--color-gold)', display: 'flex', alignItems: 'center', gap: '12px', marginBottom: 'clamp(36px,5vw,56px)' }}>
          <span style={{ width: '24px', height: '1px', background: 'var(--color-gold)', display: 'block', flexShrink: 0 }} aria-hidden="true" />
          What Basalith Is Not
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(28px,4vw,44px)' }}>
          {ITEMS.map(item => (
            <div key={item.title} style={{ borderLeft: '3px solid rgba(196,162,74,0.5)', paddingLeft: 'clamp(20px,3vw,32px)' }}>
              <p style={{ ...SERIF, fontSize: 'clamp(1.3rem,2.6vw,1.7rem)', fontWeight: 300, color: 'var(--color-text-primary)', letterSpacing: '-0.01em', margin: '0 0 10px' }}>
                {item.title}
              </p>
              <p style={{ ...SERIF, fontSize: '1.05rem', fontStyle: 'italic', fontWeight: 300, lineHeight: 1.85, color: 'var(--color-text-secondary)', margin: 0 }}>
                {item.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
