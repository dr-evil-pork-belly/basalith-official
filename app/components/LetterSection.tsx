export default function LetterSection() {
  return (
    <section
      aria-label="A letter"
      className="bg-obsidian-void px-8 md:px-16"
      style={{ padding: '8rem 2rem' }}
    >
      <div style={{ maxWidth: '680px', margin: '0 auto' }}>

        <p
          className="font-serif font-light"
          style={{
            fontSize:   '1.2rem',
            fontStyle:  'italic',
            color:      '#9DA3A8',
            lineHeight: 2.0,
            whiteSpace: 'pre-line',
          }}
        >
          {`I never asked him about the grain elevator.

I knew it meant something to him. He mentioned it twice. Both times like he was about to say more, and then didn't.

I thought I had time.

I thought there would be a Sunday afternoon, a slow conversation, a moment where I could finally ask.

There wasn't.

That's the thing about losing someone. It's not the big things you miss first. It's the questions you saved for later. The ones you were certain you'd get to.

I would give almost anything to ask him about that grain elevator now.`}
        </p>

        <div
          aria-hidden="true"
          style={{
            height:     '1px',
            margin:     '3rem 0 2rem',
            background: 'linear-gradient(90deg, transparent, rgba(196,162,74,0.35), transparent)',
          }}
        />

        <p
          style={{
            fontFamily:    'monospace',
            fontSize:      '0.42rem',
            letterSpacing: '0.25em',
            textTransform: 'uppercase' as const,
            color:         '#5C6166',
            marginBottom:  '1.25rem',
          }}
        >
          &mdash; Written by a daughter, 2024
        </p>

        <p
          className="font-serif font-light"
          style={{
            fontSize:  '1rem',
            fontStyle: 'italic',
            color:     '#C4A24A',
          }}
        >
          This is why we built Basalith.
        </p>

      </div>
    </section>
  )
}
