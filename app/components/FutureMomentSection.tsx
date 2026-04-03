export default function FutureMomentSection() {
  return (
    <section
      aria-label="The future moment"
      className="bg-obsidian-void"
      style={{ padding: '10rem 2rem', textAlign: 'center' }}
    >
      <div style={{ maxWidth: '760px', margin: '0 auto' }}>

        <p
          className="font-serif font-light"
          style={{
            fontSize:     'clamp(1.8rem, 4vw, 2.8rem)',
            color:        '#F0EDE6',
            lineHeight:   1.35,
            letterSpacing: '-0.02em',
            marginBottom: '2rem',
          }}
        >
          Someday, someone will want to know
          who you were when no one was watching.
        </p>

        <p
          className="font-serif font-light"
          style={{
            fontSize:     '1.1rem',
            fontStyle:    'italic',
            color:        '#9DA3A8',
            lineHeight:   1.9,
            marginBottom: '3.5rem',
            maxWidth:     '560px',
            margin:       '0 auto 3.5rem',
          }}
        >
          Not the milestones. Not the photographs taken for occasions.
          The ordinary Tuesday. The thing you said without thinking
          that the people who love you will never forget.
        </p>

        <div
          aria-hidden="true"
          style={{
            height:     '1px',
            margin:     '0 auto 3.5rem',
            maxWidth:   '320px',
            background: 'linear-gradient(90deg, transparent, rgba(196,162,74,0.4), transparent)',
          }}
        />

        <a
          href="/pricing"
          className="btn-monolith-amber"
          style={{ display: 'inline-block' }}
        >
          Begin Your Archive
        </a>

      </div>
    </section>
  )
}
