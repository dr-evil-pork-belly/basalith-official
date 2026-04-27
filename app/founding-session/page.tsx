import Nav    from '../components/Nav'
import Footer from '../components/Footer'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title:       'The Founding Session · Basalith',
  description: 'The beginning of something that will outlast you.',
}

const SERIF: React.CSSProperties = {
  fontFamily: 'var(--font-cormorant, "Cormorant Garamond", Georgia, serif)',
}

const P: React.CSSProperties = {
  ...SERIF,
  fontWeight:   300,
  fontSize:     '1.1rem',
  lineHeight:   1.9,
  color:        'var(--color-text-secondary)',
  marginBottom: '20px',
}

export default function FoundingSessionPage() {
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
              fontWeight:    300,
              fontSize:      'clamp(2rem,5vw,3.5rem)',
              color:         'var(--color-text-primary)',
              lineHeight:    1.15,
              letterSpacing: '-0.025em',
              marginBottom:  '56px',
            }}
          >
            The beginning
            <br />
            of something that will outlast you.
          </h1>

          <p style={P}>
            The Founding Session is 90 minutes.
          </p>

          <p style={P}>
            Your Legacy Guide sits with you.
            <br />
            Not to interview you.
            <br />
            To begin listening to how you think.
          </p>

          <p style={P}>
            What you say matters.
            <br />
            How you say it matters more.
          </p>

          <div
            aria-hidden="true"
            style={{ width: '40px', height: '1px', background: 'var(--color-gold)', margin: '40px 0' }}
          />

          <p style={P}>
            The session establishes the foundation
            <br />
            of your entity.
            <br />
            Everything that follows builds on this.
          </p>

          <p style={{ ...P, marginBottom: '56px' }}>
            Come prepared to talk.
            <br />
            About anything.
            <br />
            The entity is already listening.
          </p>

          <a
            href="/apply"
            style={{
              fontFamily:    'var(--font-space-mono, "Space Mono", "Courier New", monospace)',
              fontSize:      'var(--text-caption)',
              letterSpacing: '0.3em',
              textTransform: 'uppercase' as const,
              display:       'inline-block',
              background:    'var(--color-gold)',
              color:         'var(--color-bg)',
              textDecoration: 'none',
              padding:       '14px 32px',
              borderRadius:  'var(--radius-sm)',
            }}
          >
            Begin
          </a>
        </section>
      </main>
      <Footer />
    </>
  )
}
