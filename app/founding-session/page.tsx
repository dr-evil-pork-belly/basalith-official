import Nav                from '../components/Nav'
import Footer             from '../components/Footer'
import MilestoneProgress  from '../components/MilestoneProgress'
import type { Metadata }  from 'next'

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

        {/* Contributor network */}
        <section
          style={{
            maxWidth: '640px',
            margin:   '0 auto',
            padding:  '0 clamp(24px,6vw,48px) clamp(64px,8vw,80px)',
          }}
        >
          <div
            aria-hidden="true"
            style={{ width: '40px', height: '1px', background: 'var(--color-gold)', margin: '0 0 40px' }}
          />
          <p style={{ ...P }}>
            The contributor network works because the friction is near zero.
          </p>
          <p style={{ ...P }}>
            Your contributors never need to log in, remember a password, or learn a new interface.
            They receive an email. They hit reply. Their memory is added.
            Or they hold a button in the app and speak for two minutes.
            That is all we ask.
          </p>
          <p style={{ ...P, marginBottom: 0 }}>
            The archive grows because we made contributing feel like a conversation, not a task.
          </p>
        </section>

        {/* 4-stage milestone roadmap */}
        <div style={{ borderTop: '1px solid var(--color-border)', background: 'var(--color-void)' }}>
          <div style={{ maxWidth: '640px', margin: '0 auto', padding: 'clamp(64px,8vw,96px) clamp(24px,6vw,48px) 0' }}>
            <p style={{
              fontFamily:   'var(--font-cormorant, "Cormorant Garamond", Georgia, serif)',
              fontSize:     '1.05rem',
              fontStyle:    'italic',
              fontWeight:   300,
              lineHeight:   1.85,
              color:        'rgba(250,248,244,0.5)',
              marginBottom: '8px',
            }}>
              You are starting at Stage 1.
            </p>
            <p style={{
              fontFamily:   'var(--font-cormorant, "Cormorant Garamond", Georgia, serif)',
              fontSize:     '1.05rem',
              fontStyle:    'italic',
              fontWeight:   300,
              lineHeight:   1.85,
              color:        'rgba(250,248,244,0.5)',
              marginBottom: '4px',
            }}>
              Here is what unlocks as you build.
            </p>
            <p style={{
              fontFamily:    'var(--font-space-mono, "Space Mono", "Courier New", monospace)',
              fontSize:      '0.46rem',
              letterSpacing: '0.15em',
              color:         'rgba(250,248,244,0.35)',
              marginBottom:  0,
            }}>
              Most archives reach Stage 2 within the first month.
              The Cognitive Fingerprint typically emerges between months 4 and 12.
            </p>
          </div>
          <MilestoneProgress />
        </div>

      </main>
      <Footer />
    </>
  )
}
