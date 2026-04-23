export default function AncestorSection() {
  return (
    <section
      aria-label="A letter from the past"
      style={{
        background: 'var(--void, #0A0908)',
        padding:    '10rem 2rem',
      }}
    >
      <div
        style={{
          maxWidth:  '600px',
          margin:    '0 auto',
          textAlign: 'center',
        }}
      >

        {/* Opening story */}
        <p
          className="font-serif font-light"
          style={{
            fontSize:  '1.15rem',
            fontStyle: 'italic',
            color:     '#9DA3A8',
            lineHeight: 2.1,
            textAlign:  'left',
          }}
        >
          My great-grandmother came from a small village in 1907.
          <br /><br />
          She was twenty-two years old. She spoke no English. She had almost nothing.
          <br /><br />
          I know these facts the way you know facts from a book, accurately, but
          without weight.
          <br /><br />
          What I don&rsquo;t know is what she thought about on the crossing. Whether
          she was terrified or certain or both. What she left behind that she never
          spoke of. What she understood about starting over that her grandchildren,
          comfortable, settled, safe, never needed to learn.
          <br /><br />
          She died before I was born.
          <br /><br />
          I will never know her.
          <br /><br />
          But I think about her more than I think about most people I have actually met.
          <br /><br />
          I think about her because I know, I know, she would have had things to say
          that would have changed how I live my life.
          <br /><br />
          And she never got to say them.
          <br /><br />
          And nobody thought to ask.
        </p>

        {/* Significant pause */}
        <div style={{ height: '4rem' }} aria-hidden="true" />

        {/* Pivot line */}
        <p
          className="font-serif"
          style={{
            fontWeight:   700,
            fontSize:     'clamp(1.8rem, 4vw, 2.8rem)',
            color:        '#F0EDE6',
            lineHeight:   1.3,
            fontStyle:    'normal',
            textAlign:    'center',
            letterSpacing: '-0.02em',
          }}
        >
          You cannot go back.
          <br /><br />
          But you can make sure it doesn&rsquo;t happen again.
        </p>

        {/* Pause */}
        <div style={{ height: '3rem' }} aria-hidden="true" />

        {/* Closing question */}
        <p
          className="font-serif font-light"
          style={{
            fontSize:  '1.2rem',
            fontStyle: 'italic',
            color:     'rgba(196,162,74,0.9)',
            lineHeight: 1.8,
            textAlign: 'center',
          }}
        >
          What would your great-grandchildren give to be able to talk to you,
          <br /><br />
          not read about you,
          <br /><br />
          not see photographs of you,
          <br /><br />
          but actually talk to you,
          <br /><br />
          forty years from now?
        </p>

        {/* Final pause */}
        <div style={{ height: '4rem' }} aria-hidden="true" />

        {/* Thin gold rule — centered, 80px */}
        <div
          aria-hidden="true"
          style={{
            width:      '80px',
            height:     '1px',
            margin:     '0 auto',
            background: 'rgba(196,162,74,0.4)',
          }}
        />

        {/* Label below rule */}
        <p
          style={{
            marginTop:     '1.5rem',
            fontFamily:    "'Space Mono', 'DM Mono', monospace",
            fontSize:      '0.42rem',
            letterSpacing: '0.3em',
            textTransform: 'uppercase' as const,
            color:         '#5C6166',
            textAlign:     'center',
          }}
        >
          This is what Basalith builds
        </p>

      </div>
    </section>
  )
}
