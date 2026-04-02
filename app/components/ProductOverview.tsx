export default function ProductOverview() {
  const cards = [
    {
      eyebrow: 'The Asset',
      headline: 'A life fully documented.',
      body: 'Every photograph labeled. Every story preserved. Every decade of your life captured by the people who lived it alongside you.',
      linkLabel: 'How it works →',
      linkHref: '/custodianship',
    },
    {
      eyebrow: 'The Intelligence',
      headline: 'An AI that learns how you think.',
      body: 'Our seven-layer pipeline filters, organizes, and prioritizes your archive automatically. Your entity grows more accurate with every deposit.',
      linkLabel: 'The intelligence layer →',
      linkHref: '/custodianship',
    },
    {
      eyebrow: 'The Continuity',
      headline: 'Centuries, not decades.',
      body: 'The entity improves with every generation of AI. What begins as a reasonable representation becomes, over decades, something extraordinarily accurate.',
      linkLabel: 'What permanence means →',
      linkHref: '/custodianship',
    },
  ]

  return (
    <section
      id="product"
      style={{
        padding:   'clamp(4rem, 8vw, 7rem) clamp(1.5rem, 6vw, 5rem)',
        maxWidth:  '1200px',
        margin:    '0 auto',
      }}
    >
      <div
        style={{
          display:             'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
          gap:                 '1.5rem',
        }}
      >
        {cards.map(card => (
          <div
            key={card.eyebrow}
            style={{
              background:   'rgba(240,237,230,0.03)',
              border:       '1px solid rgba(196,162,74,0.12)',
              borderTop:    '2px solid rgba(196,162,74,0.4)',
              borderRadius: '2px',
              padding:      '2rem',
              display:      'flex',
              flexDirection:'column',
              gap:          '0.75rem',
            }}
          >
            <p
              style={{
                fontFamily:    "'Space Mono', monospace",
                fontSize:      '0.42rem',
                letterSpacing: '0.28em',
                textTransform: 'uppercase',
                color:         'rgba(196,162,74,1)',
                margin:        0,
              }}
            >
              {card.eyebrow}
            </p>

            <h3
              style={{
                fontFamily:  'var(--font-serif, Georgia, serif)',
                fontSize:    '1.3rem',
                fontWeight:  700,
                color:       '#F0EDE6',
                lineHeight:  1.25,
                margin:      0,
              }}
            >
              {card.headline}
            </h3>

            <p
              style={{
                fontFamily:  'var(--font-serif, Georgia, serif)',
                fontSize:    '0.95rem',
                fontWeight:  300,
                color:       '#9DA3A8',
                lineHeight:  1.8,
                margin:      '0.25rem 0 0',
                flex:        1,
              }}
            >
              {card.body}
            </p>

            <a
              href={card.linkHref}
              style={{
                fontFamily:  'var(--font-serif, Georgia, serif)',
                fontSize:    '0.9rem',
                fontStyle:   'italic',
                color:       'rgba(196,162,74,1)',
                textDecoration: 'none',
                marginTop:   '0.5rem',
                display:     'inline-block',
              }}
            >
              {card.linkLabel}
            </a>
          </div>
        ))}
      </div>
    </section>
  )
}
