type Props = {
  quote:    string
  variant?: 'surface-alt' | 'bg'
}

export default function QuoteBreak({ quote, variant = 'surface-alt' }: Props) {
  const bg = variant === 'bg' ? 'var(--color-bg)' : 'var(--color-surface-alt)'
  return (
    <section
      aria-label="Quote"
      style={{
        background:     bg,
        padding:        'clamp(60px,8vw,80px) clamp(24px,6vw,48px)',
        display:        'flex',
        justifyContent: 'center',
      }}
    >
      <div style={{ maxWidth: '720px', width: '100%' }}>
        <div
          style={{
            borderLeft:  '2px solid rgba(184,150,62,0.4)',
            paddingLeft: 'clamp(24px,4vw,40px)',
          }}
        >
          <blockquote
            style={{
              fontFamily:  'var(--font-cormorant, "Cormorant Garamond", Georgia, serif)',
              fontSize:    'clamp(1.5rem, 3vw, 2.25rem)',
              fontWeight:  300,
              fontStyle:   'italic',
              color:       'var(--color-text-primary)',
              lineHeight:  1.55,
              margin:      0,
            }}
          >
            {quote}
          </blockquote>
        </div>
      </div>
    </section>
  )
}
