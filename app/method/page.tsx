import Nav    from '../components/Nav'
import Footer from '../components/Footer'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title:       'The Method',
  description: 'How the Basalith archive is built. Two directions simultaneously, from the inside out and the outside in.',
}

const eyebrow: React.CSSProperties = {
  fontFamily:    "'Space Mono', 'Courier New', monospace",
  fontSize:      '0.44rem',
  letterSpacing: '0.4em',
  color:         '#C4A24A',
  textTransform: 'uppercase',
  marginBottom:  '1rem',
}

const h1: React.CSSProperties = {
  fontFamily:    "'Cormorant Garamond', Georgia, serif",
  fontSize:      'clamp(2rem, 5vw, 3.5rem)',
  fontWeight:    700,
  color:         '#F0EDE6',
  lineHeight:    1.2,
  marginBottom:  '1rem',
}

const sub: React.CSSProperties = {
  fontFamily:   "'Cormorant Garamond', Georgia, serif",
  fontSize:     '1.1rem',
  fontStyle:    'italic',
  color:        '#706C65',
  marginBottom: '4rem',
}

const h2: React.CSSProperties = {
  fontFamily:   "'Cormorant Garamond', Georgia, serif",
  fontSize:     '1.3rem',
  fontWeight:   700,
  color:        '#F0EDE6',
  marginBottom: '1.5rem',
  marginTop:    '3rem',
}

const body: React.CSSProperties = {
  fontFamily:   "'Cormorant Garamond', Georgia, serif",
  fontSize:     '1rem',
  fontWeight:   300,
  color:        '#B8B4AB',
  lineHeight:   1.9,
  marginBottom: '1.5rem',
}

const divider: React.CSSProperties = {
  borderTop: '1px solid rgba(196,162,74,0.2)',
  margin:    '3rem auto',
  maxWidth:  '120px',
}

export default function MethodPage() {
  return (
    <>
      <Nav />
      <main style={{ background: '#0A0908' }}>
        <div style={{ maxWidth: '760px', margin: '0 auto', padding: '8rem 2rem' }}>

          <p style={eyebrow}>The Method</p>

          <h1 style={h1}>How the archive is built.</h1>

          <p style={sub}>Two directions. Simultaneously. From the inside out and the outside in.</p>

          <div style={divider} />

          <h2 style={h2}>Inside looking out.</h2>
          <p style={body}>
            The archive subject deposits their own memories, wisdom, decisions, and beliefs directly.
            Through guided wisdom sessions, entity conversations, and structured deposits across ten
            dimensions of their life and thinking.
          </p>
          <p style={body}>
            This is the data only they can provide. Their first-person account of who they are,
            what they learned, what they believe, and what they want their descendants to know.
          </p>

          <h2 style={h2}>Outside looking in.</h2>
          <p style={body}>
            The people who know them contribute what they observed. Family members label photographs.
            Contributors answer witness session questions designed for their specific relationship
            to the subject.
          </p>
          <p style={body}>
            A daughter sees things her father never knew were visible. A colleague remembers decisions
            that shaped a team. A childhood friend carries who someone was before they became who
            they think they are.
          </p>
          <p style={body}>
            These observations capture dimensions of a person that the person themselves would never
            think to deposit.
          </p>

          <h2 style={h2}>The combination produces something neither could produce alone.</h2>
          <p style={body}>
            When inside and outside data are combined (the deposits, the witness observations,
            the family memories, the entity conversations) the result is the most accurate possible
            representation of a human life.
          </p>
          <p style={body}>
            Not a curated version. Not a highlight reel. The actual person, as they saw themselves
            and as the people who loved them saw them.
          </p>

          <h2 style={h2}>The nightly photograph email.</h2>
          <p style={body}>
            Every evening at 9pm one photograph from the archive is sent to every active contributor.
            No login required. No app to open.
          </p>
          <p style={body}>
            Contributors reply with what they remember. Their replies are parsed by AI and saved to
            the archive permanently. A confirmation arrives within minutes. A summary of all replies
            reaches the primary user the next morning.
          </p>
          <p style={body}>
            The archive builds itself around the family. Without anyone having to organize a session,
            schedule a call, or remember to do anything.
          </p>

          <h2 style={h2}>The Intelligence Layer.</h2>
          <p style={body}>
            Before a single photograph reaches the labeling interface our seven-layer AI pipeline
            has already processed every upload. Screenshots removed. Duplicates collapsed.
            Photographs scored by archive value. The most emotionally resonant image in a collection
            of thousands surfaces first.
          </p>
          <p style={body}>The family never sees the noise. They only see what matters.</p>

          <div style={divider} />

          <div style={{ textAlign: 'center', padding: '3rem 0' }}>
            <p style={{ ...body, fontStyle: 'italic', textAlign: 'center' }}>
              The archive begins with The Founding, a 90-minute guided session with a Senior Legacy Guide.
            </p>
            <a
              href="/founding-session"
              style={{
                fontFamily:     "'Space Mono', monospace",
                fontSize:       '0.44rem',
                letterSpacing:  '0.35em',
                color:          '#C4A24A',
                textDecoration: 'none',
                textTransform:  'uppercase',
              }}
            >
              What happens in The Founding →
            </a>
          </div>

        </div>
      </main>
      <Footer />
    </>
  )
}
