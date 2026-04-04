import Nav    from '../components/Nav'
import Footer from '../components/Footer'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title:       'Continuity · Basalith',
  description: 'The entity does not stop when you do. It improves. Built for centuries, not decades.',
}

const body: React.CSSProperties = {
  fontFamily:   "'Cormorant Garamond', Georgia, serif",
  fontWeight:   300,
  fontSize:     '1.05rem',
  lineHeight:   1.95,
  color:        '#B8B4AB',
  marginBottom: '1.5rem',
}

const h2style: React.CSSProperties = {
  fontFamily:   "'Cormorant Garamond', Georgia, serif",
  fontWeight:   700,
  fontSize:     'clamp(1.4rem, 3vw, 1.9rem)',
  color:        '#F0EDE6',
  lineHeight:   1.2,
  marginBottom: '1.5rem',
  marginTop:    '4rem',
}

const rule: React.CSSProperties = {
  borderTop:    '1px solid rgba(196,162,74,0.15)',
  margin:       '4rem 0',
}

export default function ContinuityPage() {
  return (
    <>
      <Nav />
      <main style={{ background: '#0A0908' }}>

        {/* ── HEADER ── */}
        <section style={{ padding: 'clamp(7rem, 12vw, 10rem) 2rem 4rem', textAlign: 'center', background: '#0A0908' }}>
          <p style={{
            fontFamily:    "'Space Mono', monospace",
            fontSize:      '0.44rem',
            letterSpacing: '0.4em',
            textTransform: 'uppercase',
            color:         '#C4A24A',
            marginBottom:  '1.5rem',
          }}>
            Continuity
          </p>
          <h1 style={{
            fontFamily:    "'Cormorant Garamond', Georgia, serif",
            fontWeight:    700,
            fontSize:      'clamp(2.5rem, 6vw, 4.5rem)',
            color:         '#F0EDE6',
            lineHeight:    1.05,
            letterSpacing: '-0.02em',
            marginBottom:  '1.25rem',
          }}>
            Built for centuries.<br />Not decades.
          </h1>
          <p style={{
            fontFamily:  "'Cormorant Garamond', Georgia, serif",
            fontStyle:   'italic',
            fontSize:    '1.15rem',
            color:       '#9DA3A8',
            margin:      '0 auto',
            maxWidth:    '480px',
            lineHeight:  1.7,
          }}>
            The entity does not stop when you do.<br />It improves.
          </p>
        </section>

        {/* ── BODY ── */}
        <section style={{ maxWidth: '720px', margin: '0 auto', padding: '2rem 2rem 8rem' }}>

          {/* Section 1 */}
          <h2 style={h2style}>Every generation of AI makes your entity more accurate.</h2>

          <p style={body}>
            When you initialize your archive today the AI that trains your entity is the best available.
            In ten years that AI will be significantly more capable. In twenty years, more still.
          </p>
          <p style={body}>
            Every major advancement in AI is applied to your entity automatically.
            What begins as a reasonable representation of how you think becomes, over decades,
            something extraordinarily accurate.
          </p>
          <p style={body}>
            Your grandchildren will interact with a more complete version of your entity than your children will.
            Your great-grandchildren will interact with a more complete version still.
          </p>
          <p style={body}>
            The archive compounds.<br />
            The entity deepens.<br />
            Time works in your favor.
          </p>

          <div style={rule} />

          {/* Section 2 */}
          <h2 style={h2style}>Every generation inherits the mind, not just the money.</h2>

          <p style={body}>
            Financial wealth transfers across generations through wills and trusts.
            Real estate transfers. Businesses sometimes transfer.
          </p>
          <p style={body}>
            But the judgment, the pattern recognition, the specific way of thinking about risk and
            opportunity and people that took a lifetime to develop — that disappears with the person
            who built it.
          </p>
          <p style={body}>
            Every generation starts over. They inherit the money but not the mind that made it.
          </p>
          <p style={{ ...body, color: '#F0EDE6', fontWeight: 400 }}>
            Basalith changes that.
          </p>
          <p style={body}>
            Your grandchildren will be able to ask your entity how you thought about a hard decision.
            What you learned from failure. What you believed about people. What took you thirty years
            to understand.
          </p>
          <p style={body}>
            The entity answers from your archive. From your actual documented history of thinking and deciding.
          </p>
          <p style={body}>
            That is generational wealth in its truest form.
          </p>

          <div style={rule} />

          {/* Section 3 */}
          <h2 style={h2style}>What happens to the archive if Basalith ceases to exist?</h2>

          <p style={body}>
            Every active archive is protected by the Data Custodianship Reserve.
            A dedicated fund maintained separately from our operating accounts ensures every archive
            transfers to a designated custodian institution with a minimum of ten years of continued
            access at no cost to the family.
          </p>
          <p style={body}>
            Your archive does not depend on Basalith&rsquo;s continued existence.
          </p>

          <a
            href="/custodianship"
            style={{
              fontFamily:     "'Cormorant Garamond', Georgia, serif",
              fontStyle:      'italic',
              fontSize:       '0.95rem',
              color:          'rgba(196,162,74,1)',
              textDecoration: 'none',
              display:        'inline-block',
              marginTop:      '0.5rem',
            }}
          >
            Read the full Custodianship Reserve details →
          </a>

          <div style={rule} />

          {/* Closing */}
          <div style={{ textAlign: 'center', padding: '2rem 0 0', maxWidth: '600px', margin: '0 auto' }}>
            <p style={{
              fontFamily:  "'Cormorant Garamond', Georgia, serif",
              fontStyle:   'italic',
              fontSize:    '1.3rem',
              color:       '#B8B4AB',
              lineHeight:  1.85,
              marginBottom: '2.5rem',
            }}>
              &ldquo;In 100 years the world will be unrecognizable.<br /><br />
              But the story of how your grandmother survived something hard,
              or your grandfather built something from nothing,
              or your mother showed love through cooking when she had no other way to show it —<br /><br />
              those stories will still matter.<br /><br />
              They will still teach.<br />
              They will still change how someone lives their life.&rdquo;
            </p>

            <p style={{
              fontFamily:    "'Space Mono', monospace",
              fontSize:      '0.44rem',
              letterSpacing: '0.35em',
              textTransform: 'uppercase',
              color:         '#C4A24A',
              marginBottom:  '2.5rem',
            }}>
              This Is What Basalith Preserves
            </p>

            <a
              href="/pricing"
              style={{
                display:       'inline-block',
                background:    'rgba(196,162,74,1)',
                color:         '#0A0908',
                fontFamily:    "'Space Mono', monospace",
                fontSize:      '0.58rem',
                letterSpacing: '0.3em',
                textTransform: 'uppercase',
                textDecoration:'none',
                padding:       '0.85rem 2rem',
                borderRadius:  '2px',
              }}
            >
              Begin Your Archive
            </a>
          </div>

        </section>
      </main>
      <Footer />
    </>
  )
}
