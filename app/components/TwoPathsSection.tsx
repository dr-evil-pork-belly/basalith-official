import Link from 'next/link'

type Audience = 'founder' | 'family'

const MONO: React.CSSProperties = {
  fontFamily:    'var(--font-space-mono, "Space Mono", "Courier New", monospace)',
  fontSize:      '0.52rem',
  letterSpacing: '0.3em',
  textTransform: 'uppercase' as const,
}
const SERIF: React.CSSProperties = {
  fontFamily: 'var(--font-cormorant, "Cormorant Garamond", Georgia, serif)',
}

// Two paths mapped to the existing concepts: LEGACY -> /apply (family) and
// SUCCESSION -> /succession (founder). The cards are pure navigation now; the
// audience demo above owns the founder/family choice.
const CARDS: {
  audience: Audience
  eyebrow:  string
  headline: string
  support:  string
  href:     string
  cta:      string
}[] = [
  {
    audience: 'family',
    eyebrow:  'INDIVIDUALS & FAMILIES',
    headline: 'Give them how you think, not just what you leave.',
    support:  'The years your family would spend guessing, answered while you are here.',
    href:     '/apply',
    cta:      'Begin Your Archive',
  },
  {
    audience: 'founder',
    eyebrow:  'FOUNDERS & SUCCESSORS',
    headline: "Keep your judgment in the room after you've left it.",
    support:  'When you step back, the way you decided does not have to go with you.',
    href:     '/succession',
    cta:      'Learn About Succession',
  },
]

export default function TwoPathsSection() {
  return (
    <section
      id="audience"
      aria-label="Who Basalith is for"
      style={{
        background: 'var(--color-bg)',
        padding:    'clamp(80px,12vw,140px) clamp(24px,6vw,80px)',
      }}
    >
      <div style={{ maxWidth: '1040px', margin: '0 auto' }}>

        {/* Title */}
        <p style={{ ...MONO, color: 'var(--color-gold-on-light)', marginBottom: '20px' }}>
          WHO BASALITH IS FOR
        </p>
        <h2
          style={{
            ...SERIF,
            fontSize:   'clamp(1.9rem,3.2vw,2.8rem)',
            fontWeight: 300,
            lineHeight: 1.1,
            color:      'var(--color-text-primary)',
            margin:     '0 0 48px',
          }}
        >
          Which are you here for?
        </h2>

        {/* Two cards, each a single link to its path */}
        <div
          className="two-paths-grid"
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}
        >
          {CARDS.map(card => (
            <Link
              key={card.audience}
              href={card.href}
              className="path-card"
              style={{
                display:        'flex',
                flexDirection:  'column',
                textDecoration: 'none',
                border:         '1px solid var(--color-border-medium)',
                background:     'var(--color-surface)',
                transition:     'border-color 250ms ease, box-shadow 250ms ease',
              }}
            >
              <div
                style={{
                  flex:          1,
                  display:       'flex',
                  flexDirection: 'column',
                  alignItems:    'flex-start',
                  padding:       'clamp(32px,4vw,52px) clamp(32px,4vw,52px) 24px',
                }}
              >
                <span style={{ ...MONO, color: 'var(--color-gold-on-light)', marginBottom: '20px' }}>
                  {card.eyebrow}
                </span>
                <span
                  style={{
                    ...SERIF,
                    display:      'block',
                    fontSize:     'clamp(1.5rem,2.5vw,2.1rem)',
                    fontWeight:   300,
                    lineHeight:   1.15,
                    color:        'var(--color-text-primary)',
                    marginBottom: '16px',
                  }}
                >
                  {card.headline}
                </span>
                <span
                  style={{
                    ...SERIF,
                    display:    'block',
                    fontSize:   '1.05rem',
                    fontStyle:  'italic',
                    fontWeight: 300,
                    lineHeight: 1.7,
                    color:      'var(--color-text-secondary)',
                  }}
                >
                  {card.support}
                </span>
              </div>

              {/* Gold CTA, visual affordance for the card link */}
              <div style={{ padding: '0 clamp(32px,4vw,52px) clamp(32px,4vw,52px)' }}>
                <span
                  className="path-cta"
                  style={{
                    ...MONO,
                    display:    'inline-block',
                    color:      '#0A0908',
                    background: 'var(--color-gold)',
                    padding:    '14px 28px',
                    transition: 'background 250ms ease',
                  }}
                >
                  {card.cta} &rarr;
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <style>{`
        .path-card:hover { border-color: var(--color-gold-on-light); box-shadow: var(--shadow-gold); }
        .path-card:hover .path-cta { background: var(--color-gold-light); }
        .path-card:focus-visible { outline: 2px solid var(--color-gold-on-light); outline-offset: 2px; }
        @media (max-width: 767px) {
          .two-paths-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  )
}
