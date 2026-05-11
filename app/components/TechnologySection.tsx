'use client'

export default function TechnologySection() {
  return (
    <section
      data-reveal
      aria-label="For the forward-thinking"
      style={{
        background: 'var(--color-void)',
        padding:    'clamp(80px,12vw,140px) clamp(24px,6vw,80px)',
        textAlign:  'center',
      }}
    >
      <div style={{ maxWidth: '720px', margin: '0 auto' }}>

        {/* Headline */}
        <h2
          style={{
            fontFamily:    'var(--font-cormorant, "Cormorant Garamond", Georgia, serif)',
            fontSize:      'clamp(1.75rem, 4vw, 3rem)',
            fontWeight:    300,
            lineHeight:    1.25,
            letterSpacing: '-0.02em',
            color:         'rgba(250,250,248,0.9)',
            marginBottom:  '48px',
          }}
        >
          The most sophisticated AI
          <br />
          in the world can learn
          <br />
          to think like you.
        </h2>

        {/* Body */}
        <div
          style={{
            fontFamily: 'var(--font-cormorant, "Cormorant Garamond", Georgia, serif)',
            fontSize:   '1.15rem',
            fontStyle:  'italic',
            fontWeight: 300,
            lineHeight: 1.9,
          }}
        >
          <p style={{ color: 'rgba(250,248,244,0.5)', marginBottom: '14px' }}>
            The question is not whether this technology exists.
          </p>
          <p style={{ color: 'rgba(250,248,244,0.8)', marginBottom: '28px', fontSize: '1.25rem' }}>
            It does.
          </p>
          <p style={{ color: 'rgba(250,248,244,0.5)', marginBottom: '28px' }}>
            The question is whether you give it enough to learn from
            <br />
            while you still can.
          </p>
          <p style={{ color: 'rgba(250,248,244,0.4)', marginBottom: '14px' }}>
            Every year you wait is a year the entity has less to work with.
          </p>
          <p style={{ color: 'rgba(250,248,244,0.6)', margin: 0 }}>
            Every year you begin is a year it has more.
          </p>
        </div>

      </div>
    </section>
  )
}
