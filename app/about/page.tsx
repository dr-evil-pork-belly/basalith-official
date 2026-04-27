import Nav    from '../components/Nav'
import Footer from '../components/Footer'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title:       'About · Basalith',
  description: 'I built Basalith because I am not ready.',
}

const SERIF: React.CSSProperties = {
  fontFamily: 'var(--font-cormorant, "Cormorant Garamond", Georgia, serif)',
}

const P: React.CSSProperties = {
  ...SERIF,
  fontWeight:   300,
  fontSize:     '1.15rem',
  lineHeight:   1.95,
  color:        'var(--color-text-secondary)',
  marginBottom: '1.75rem',
}

export default function AboutPage() {
  return (
    <>
      <Nav />
      <main style={{ background: 'var(--color-bg)' }}>
        <section
          style={{
            maxWidth: '640px',
            margin:   '0 auto',
            padding:  'clamp(140px,16vw,180px) clamp(24px,6vw,48px) clamp(80px,10vw,120px)',
          }}
        >
          <h1
            style={{
              ...SERIF,
              fontSize:      'clamp(2rem,5vw,3.5rem)',
              fontWeight:    300,
              lineHeight:    1.15,
              letterSpacing: '-0.025em',
              color:         'var(--color-text-primary)',
              marginBottom:  '56px',
            }}
          >
            I built Basalith
            <br />
            because I am not ready.
          </h1>

          <p style={P}>
            Not for my father.
            <br />
            Not for my mother.
            <br />
            Not for the friends I have already lost
            <br />
            before I understood what losing meant.
          </p>

          <p style={P}>
            I have watched people leave.
            <br />
            Some suddenly. Some slowly.
            <br />
            None of them at a time
            <br />
            I would have chosen.
          </p>

          <p style={P}>
            And every time, the same thing follows.
            <br />
            The wondering.
          </p>

          <p style={P}>
            What would they have said
            <br />
            about this moment.
            <br />
            What would they have done
            <br />
            with this decision.
            <br />
            What would they think
            <br />
            of who I have become.
          </p>

          <p style={P}>
            The wondering does not stop.
            <br />
            It just gets quieter.
          </p>

          <div
            aria-hidden="true"
            style={{
              width:        '40px',
              height:       '1px',
              background:   'var(--color-gold)',
              margin:       '48px 0',
            }}
          />

          <p style={P}>
            I built Basalith because I am a researcher.
            <br />
            I know what is coming with AI.
            <br />
            I know what is possible.
            <br />
            And I know that the technology
            <br />
            being used by the wealthiest people
            <br />
            in the world to preserve themselves
            <br />
            should not belong only to them.
          </p>

          <p style={P}>
            My mother deserves this.
            <br />
            Your mother deserves this.
            <br />
            Every family that has ever wondered
            <br />
            deserves this.
          </p>

          <p style={{ ...P, marginBottom: '8px' }}>
            This is not about living forever.
            <br />
            It is about never fully leaving.
          </p>

          <p
            style={{
              ...SERIF,
              fontWeight:  300,
              fontSize:    '1.15rem',
              fontStyle:   'italic',
              lineHeight:  1.95,
              color:       'var(--color-gold)',
              marginBottom: '64px',
            }}
          >
            There is a difference.
          </p>

          <p
            style={{
              fontFamily:    'var(--font-space-mono, "Space Mono", "Courier New", monospace)',
              fontSize:      '0.52rem',
              letterSpacing: '0.22em',
              textTransform: 'uppercase' as const,
              color:         'var(--color-text-faint)',
              lineHeight:    1.9,
            }}
          >
            David Ha
            <br />
            Founder, Basalith
            <br />
            Heritage Nexus Inc., 2026
          </p>
        </section>
      </main>
      <Footer />
    </>
  )
}
