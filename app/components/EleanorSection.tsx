export default function EleanorSection() {
  return (
    <section
      aria-label="A conversation with Eleanor"
      className="bg-obsidian-void"
      style={{ padding: '8rem 2rem' }}
    >
      <div style={{ maxWidth: '680px', margin: '0 auto' }}>

        <p
          style={{
            fontFamily:    'monospace',
            fontSize:      '0.65rem',
            letterSpacing: '0.22em',
            textTransform: 'uppercase' as const,
            color:         '#5C6166',
            marginBottom:  '3rem',
          }}
        >
          A conversation with the archive
        </p>

        {/* Exchange 1 */}
        <div style={{ marginBottom: '2rem' }}>
          <p
            style={{
              fontFamily:  'monospace',
              fontSize:    '0.65rem',
              letterSpacing: '0.15em',
              textTransform: 'uppercase' as const,
              color:       '#5C6166',
              marginBottom: '0.5rem',
            }}
          >
            Eleanor, 74 &mdash; daughter
          </p>
          <p
            className="font-serif font-light"
            style={{
              fontSize:   '1.1rem',
              color:      '#D4CFC7',
              lineHeight: 1.8,
              fontStyle:  'italic',
            }}
          >
            &ldquo;I keep thinking about the summer we spent at the lake house.
            Dad would wake up before everyone and just sit on the dock.
            I never knew what he was thinking about.&rdquo;
          </p>
        </div>

        {/* Exchange 2 — Archive response */}
        <div
          style={{
            marginBottom:   '2rem',
            paddingLeft:    '1.5rem',
            borderLeft:     '2px solid rgba(196,162,74,0.25)',
          }}
        >
          <p
            style={{
              fontFamily:  'monospace',
              fontSize:    '0.65rem',
              letterSpacing: '0.15em',
              textTransform: 'uppercase' as const,
              color:       'rgba(196,162,74,0.5)',
              marginBottom: '0.5rem',
            }}
          >
            Basalith &middot; Archive Presence
          </p>
          <p
            className="font-serif font-light"
            style={{
              fontSize:   '1.1rem',
              color:      '#9DA3A8',
              lineHeight: 1.8,
              fontStyle:  'italic',
            }}
          >
            He wrote about that dock in 1962. He called it &ldquo;the only
            quiet place on earth.&rdquo; There are fourteen photographs from
            those summers. Would you like to see them?
          </p>
        </div>

        {/* Exchange 3 */}
        <div style={{ marginBottom: '2rem' }}>
          <p
            style={{
              fontFamily:  'monospace',
              fontSize:    '0.65rem',
              letterSpacing: '0.15em',
              textTransform: 'uppercase' as const,
              color:       '#5C6166',
              marginBottom: '0.5rem',
            }}
          >
            Eleanor
          </p>
          <p
            className="font-serif font-light"
            style={{
              fontSize:   '1.1rem',
              color:      '#D4CFC7',
              lineHeight: 1.8,
              fontStyle:  'italic',
            }}
          >
            &ldquo;He wrote about it?&rdquo;
          </p>
        </div>

        {/* Exchange 4 — Archive response */}
        <div
          style={{
            marginBottom:   '3rem',
            paddingLeft:    '1.5rem',
            borderLeft:     '2px solid rgba(196,162,74,0.25)',
          }}
        >
          <p
            style={{
              fontFamily:  'monospace',
              fontSize:    '0.65rem',
              letterSpacing: '0.15em',
              textTransform: 'uppercase' as const,
              color:       'rgba(196,162,74,0.5)',
              marginBottom: '0.5rem',
            }}
          >
            Basalith &middot; Archive Presence
          </p>
          <p
            className="font-serif font-light"
            style={{
              fontSize:   '1.1rem',
              color:      '#9DA3A8',
              lineHeight: 1.8,
              fontStyle:  'italic',
            }}
          >
            Often. He was thinking about your mother.
          </p>
        </div>

        <div
          aria-hidden="true"
          style={{
            height:     '1px',
            margin:     '0 0 2.5rem',
            background: 'linear-gradient(90deg, transparent, rgba(196,162,74,0.35), transparent)',
          }}
        />

        <p
          className="font-serif font-light"
          style={{
            fontSize:     '1rem',
            fontStyle:    'italic',
            color:        '#C4A24A',
            marginBottom: '2rem',
          }}
        >
          This is what the archive becomes.
        </p>

        <a
          href="https://basalith.ai"
          target="_blank"
          rel="noopener noreferrer"
          className="font-sans text-[0.65rem] tracking-[0.22em] uppercase text-text-muted no-underline border-b border-border-subtle pb-0.5 transition-colors duration-200 hover:text-text-primary"
        >
          Explore the Presence &rarr; basalith.ai
        </a>

      </div>
    </section>
  )
}
