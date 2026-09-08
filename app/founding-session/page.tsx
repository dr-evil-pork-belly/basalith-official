import Nav                from '../components/Nav'
import Footer             from '../components/Footer'
import MilestoneProgress  from '../components/MilestoneProgress'
import type { Metadata }  from 'next'

export const metadata: Metadata = {
  title:       'The Founding Session · Basalith',
  description: 'Every Basalith archive begins with a Founding Session. A Legacy Guide sits with you, not to interview you, but to start listening to how you think.',
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
            The Founding Session is where the archive starts.
            <br />
            For a person, it is 90 minutes.
            <br />
            For a business, it runs longer, because the first thing we capture is the hardest calls the operator ever made.
          </p>

          <p style={P}>
            Your Legacy Guide sits with you.
            <br />
            Not to interview you.
            <br />
            To start listening to how you think.
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
            The session lays the foundation
            <br />
            of your entity.
            <br />
            Everything that follows builds on it.
          </p>

          <p style={{ ...P, marginBottom: '56px' }}>
            Come ready to talk. About anything.
            <br />
            Nothing you say has to be important.
            <br />
            The ordinary things are usually the ones that show how you think.
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
            Request a Founding Session
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
            After the session, the people around you start adding what they remember. It works because we took the friction out.
          </p>
          <p style={{ ...P }}>
            Your contributors never log in, never remember a password, never learn a new interface.
            They get an email. They hit reply. Their memory is added.
            Or they hold a button in the app and talk for two minutes.
            That is all we ask of them.
          </p>
          <p style={{ ...P, marginBottom: 0 }}>
            The archive grows because contributing feels like a conversation, not a task.
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
          </div>
          <MilestoneProgress />
        </div>

      </main>
      <Footer />
    </>
  )
}
