import Nav    from '../components/Nav'
import Footer from '../components/Footer'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title:       'The Asset',
  description: 'The Golden Dataset, the Digital Clone, the legal archive. The most valuable thing you own is not on your balance sheet.',
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
  fontFamily:   "'Cormorant Garamond', Georgia, serif",
  fontSize:     'clamp(2rem, 5vw, 3.5rem)',
  fontWeight:   700,
  color:        '#F0EDE6',
  lineHeight:   1.2,
  marginBottom: '1rem',
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

export default function AssetPage() {
  return (
    <>
      <Nav />
      <main style={{ background: '#0A0908' }}>
        <div style={{ maxWidth: '760px', margin: '0 auto', padding: '8rem 2rem' }}>

          <p style={eyebrow}>The Asset</p>

          <h1 style={h1}>The most valuable thing you own is not on your balance sheet.</h1>

          <p style={sub}>
            It is the particular way you think. The reasoning behind your decisions.
            The things only your family knows about you.
          </p>

          <div style={divider} />

          <h2 style={h2}>The Golden Dataset.</h2>
          <p style={body}>
            Every photograph labeled by the people who were present when it was taken. Every story
            preserved in the voice of the person who lived it. Every decade of a life documented
            by the family that witnessed it.
          </p>
          <p style={body}>
            The result is the most accurate record of a human life ever assembled. Not a curated
            highlight reel. The actual texture of a specific life — the hard years, the ordinary
            years, the years that defined everything that came after.
          </p>

          <h2 style={h2}>The Digital Clone.</h2>
          <p style={body}>
            An AI entity trained on the Golden Dataset. It speaks in the patterns of the person
            it was built from. It carries their documented opinions, their specific memories,
            their particular way of thinking about the world.
          </p>
          <p style={body}>
            It is not a simulation. It is a preservation — of everything the archive contains
            about how a specific person actually thought.
          </p>
          <p style={body}>
            Your grandchildren will be able to ask it questions. It will answer from decades of
            documented wisdom. Not what you looked like. Not what you did. How you thought.
          </p>

          <h2 style={h2}>Every generation inherits the mind, not just the money.</h2>
          <p style={body}>
            Financial wealth transfers through wills and trusts. Real estate transfers.
            Businesses sometimes transfer.
          </p>
          <p style={body}>
            But the judgment — the pattern recognition, the specific way of thinking about risk
            and opportunity and people that took a lifetime to develop — that disappears with
            the person who built it.
          </p>
          <p style={body}>Every generation starts over. They inherit the money but not the mind that made it.</p>
          <p style={{ ...body, fontSize: '1.15rem', color: '#F0EDE6', fontStyle: 'italic' }}>
            Basalith changes that.
          </p>

          <h2 style={h2}>A legal asset with formal estate standing.</h2>
          <p style={body}>
            The Basalith archive is not a cloud storage account. It is a legal asset documented
            in your estate plan with a designated Custodian who has formal standing to govern it
            after your death or incapacity.
          </p>
          <p style={body}>
            The archive can be named in a will. It can be inherited. The Custodian can grant and
            revoke access, manage stewardship tiers, and ensure the archive continues for the
            generations that follow.
          </p>
          <p style={body}>This is what makes Basalith an estate instrument and not a subscription service.</p>

          <div style={divider} />

          <div style={{ textAlign: 'center', padding: '3rem 0' }}>
            <p style={{ ...body, fontStyle: 'italic', textAlign: 'center', marginBottom: '2rem' }}>
              See the entity that lives at the center of every archive.
            </p>
            <a
              href="https://basalith.ai"
              style={{
                fontFamily:     "'Space Mono', monospace",
                fontSize:       '0.44rem',
                letterSpacing:  '0.35em',
                color:          '#C4A24A',
                textDecoration: 'none',
                textTransform:  'uppercase',
                display:        'block',
                marginBottom:   '1.5rem',
              }}
            >
              Meet Eleanor on basalith.ai →
            </a>
            <a
              href="/pricing"
              style={{
                display:        'inline-block',
                fontFamily:     "'Space Mono', monospace",
                fontSize:       '0.44rem',
                letterSpacing:  '0.35em',
                color:          '#0A0908',
                backgroundColor:'#C4A24A',
                textDecoration: 'none',
                textTransform:  'uppercase',
                padding:        '0.75rem 2rem',
                borderRadius:   '2px',
              }}
            >
              Begin Your Archive →
            </a>
          </div>

        </div>
      </main>
      <Footer />
    </>
  )
}
