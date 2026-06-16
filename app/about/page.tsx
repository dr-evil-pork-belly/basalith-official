import Nav    from '../components/Nav'
import Footer from '../components/Footer'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title:       'About · Basalith',
  description: 'We are building the infrastructure for how human knowledge outlasts the people who hold it. Heritage Nexus Inc.',
}

const SERIF: React.CSSProperties = {
  fontFamily: 'var(--font-cormorant, "Cormorant Garamond", Georgia, serif)',
}
const MONO: React.CSSProperties = {
  fontFamily:    'var(--font-space-mono, "Space Mono", "Courier New", monospace)',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.28em',
}
const BODY: React.CSSProperties = {
  ...SERIF,
  fontWeight:   300,
  fontSize:     '1.1rem',
  lineHeight:   1.9,
  color:        'var(--color-text-secondary)',
  marginBottom: '20px',
}
const H2: React.CSSProperties = {
  ...SERIF,
  fontWeight:    300,
  fontSize:      'clamp(1.75rem,3vw,2.6rem)',
  lineHeight:    1.15,
  color:         'var(--color-text-primary)',
  letterSpacing: '-0.02em',
  marginBottom:  '28px',
}

const ECOSYSTEM = [
  {
    name: 'Basalith.ai',
    body: 'The product. Where archives are built, entities are trained, and the work of preservation happens.',
  },
  {
    name: 'Basalith.life',
    body: 'The philosophy. The 135 mentality. On living fully enough that your life is worth preserving.',
  },
  {
    name: 'Basalith.xyz',
    body: 'The technical foundation. The architecture, the research, and the honest accounting of what this technology can and cannot do.',
  },
]

export default function AboutPage() {
  return (
    <>
      <Nav />
      <main style={{ background: 'var(--color-bg)' }}>

        {/* Section 1 — What We Are Building */}
        <section style={{ padding: 'clamp(140px,16vw,200px) clamp(24px,6vw,80px) clamp(64px,8vw,96px)', maxWidth: '760px' }}>
          <p style={{ ...MONO, fontSize: 'var(--text-caption)', color: 'var(--color-gold)', marginBottom: '28px' }}>
            Heritage Nexus Inc.
          </p>
          <h1
            style={{
              ...SERIF,
              fontWeight:    300,
              fontSize:      'clamp(2.2rem,5vw,3.75rem)',
              lineHeight:    1.1,
              letterSpacing: '-0.025em',
              color:         'var(--color-text-primary)',
              marginBottom:  '48px',
            }}
          >
            We are building the infrastructure
            <br />
            for how human knowledge
            <br />
            <em style={{ fontStyle: 'italic', color: 'var(--color-gold)' }}>
              outlasts the people who hold it.
            </em>
          </h1>

          <p style={BODY}>Most of what a person knows never gets written down.</p>
          <p style={BODY}>
            Not because they do not want to share it. Because nobody built
            the right way to capture it while they were still here
            to make sure it was right.
          </p>
          <p style={BODY}>Basalith is that infrastructure.</p>
          <p style={BODY}>
            For families who want to preserve how someone thinks, not just what they owned.
          </p>
          <p style={BODY}>
            For businesses whose founders carry thirty years of judgment
            in their heads and nowhere else.
          </p>
          <p style={{ ...BODY, marginBottom: 0 }}>
            For the generations that follow, who deserve access to the real
            version of the people who shaped them.
          </p>
        </section>

        {/* Section 2 — The Ecosystem */}
        <section style={{ background: 'var(--color-void)', padding: 'clamp(64px,8vw,96px) clamp(24px,6vw,80px)' }}>
          <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            <p style={{ ...MONO, fontSize: 'var(--text-caption)', color: 'var(--color-gold)', marginBottom: '40px' }}>
              The Ecosystem
            </p>
            <div
              className="ecosystem-grid"
              style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2px' }}
            >
              {ECOSYSTEM.map(({ name, body }) => (
                <div
                  key={name}
                  style={{
                    background: 'var(--color-surface)',
                    border:     '1px solid var(--color-border)',
                    padding:    'clamp(28px,3vw,40px)',
                  }}
                >
                  <p style={{ ...MONO, fontSize: '0.5rem', color: 'var(--color-gold-on-light)', marginBottom: '20px' }}>
                    {name}
                  </p>
                  <p style={{ ...SERIF, fontSize: '1rem', fontStyle: 'italic', fontWeight: 300, color: 'var(--color-text-secondary)', lineHeight: 1.8, margin: 0 }}>
                    {body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Section 3 — Founder Story */}
        <section style={{ padding: 'clamp(80px,10vw,120px) clamp(24px,6vw,80px)' }}>
          <div style={{ maxWidth: '640px', margin: '0 auto' }}>
            <p style={{ ...MONO, fontSize: 'var(--text-caption)', color: 'var(--color-gold)', marginBottom: '48px' }}>
              From the Founder
            </p>

            <p style={BODY}>I built Basalith because I kept asking the same question.</p>
            <p style={BODY}>Not after someone died. While they were still here.</p>
            <p style={BODY}>
              How does a person hand forward everything they have learned
              in a way that actually lands? Not a letter that gets read once.
              Not a document that sits in a folder.
              Something that gets more accurate over time, not less.
            </p>

            <div aria-hidden="true" style={{ width: '40px', height: '1px', background: 'var(--color-gold)', margin: '44px 0' }} />

            <p style={BODY}>I am an entrepreneur by upbringing and a researcher by training.</p>
            <p style={BODY}>
              I set out to study business, settled on accounting, and then, given the
              freedom to write on whatever I wanted, wrote my dissertation on
              entrepreneur well-being instead.
            </p>
            <p style={BODY}>
              The years since have circled the same question from new angles. What
              actually makes people happy, and how the things we build either deepen
              our relationships or thin them out.
            </p>
            <p style={BODY}>
              What I keep coming back to is that people do not want to be remembered.
              They want to be known.
            </p>
            <p style={{ ...BODY, color: 'var(--color-text-primary)', fontStyle: 'italic' }}>
              There is a difference.
            </p>
            <p style={BODY}>
              Being remembered is passive. It happens to you after you are gone.
              Being known is active.
              It happens through a relationship that continues because you built
              something worth continuing.
            </p>

            <div aria-hidden="true" style={{ width: '40px', height: '1px', background: 'var(--color-gold)', margin: '44px 0' }} />

            <p style={BODY}>
              My parents built their lives in languages I do not fully speak,
              in a country that was not theirs,
              through decades I did not witness.
              What they know about surviving, about building, about the specific
              weight of leaving one place for another, I am still learning
              how to ask the right questions.
            </p>
            <p style={BODY}>
              Basalith is the answer to that.
              Not for after they are gone.
              Now. While they can correct me when I get it wrong.
            </p>

            <div aria-hidden="true" style={{ width: '40px', height: '1px', background: 'var(--color-gold)', margin: '44px 0' }} />

            <p style={BODY}>But this was never only a family product.</p>
            <p style={BODY}>
              Every founder I know has the same problem my parents have.
              They carry decades of judgment that lives nowhere but in their head.
              When they leave, that judgment leaves.
              Their successor gets the systems.
              They do not get the thinking behind the systems.
            </p>
            <p style={{ ...BODY, color: 'var(--color-text-primary)' }}>Basalith changes that.</p>
            <p style={BODY}>
              Preserving how a person thinks should not be a privilege of the wealthy.
            </p>
            <p style={BODY}>
              My mother deserves this.
              Your founders deserve this.
              Every family and every organization that has ever wondered
              what someone would have said deserves this.
            </p>

            <div aria-hidden="true" style={{ width: '40px', height: '1px', background: 'var(--color-gold)', margin: '44px 0' }} />

            <p style={BODY}>This is not about living forever.</p>
            <p style={{ ...BODY, color: 'var(--color-gold)', fontStyle: 'italic', marginBottom: '12px' }}>
              It is about never fully leaving.
            </p>
            <p style={{ ...BODY, fontStyle: 'italic', color: 'var(--color-text-secondary)', marginBottom: '48px' }}>
              There is a difference.
            </p>

            <p style={{
              fontFamily:    'var(--font-space-mono, "Space Mono", "Courier New", monospace)',
              fontSize:      '0.52rem',
              letterSpacing: '0.22em',
              textTransform: 'uppercase' as const,
              color:         'var(--color-text-faint)',
              lineHeight:    1.9,
            }}>
              David Ha
              <br />
              Founder, Basalith
              <br />
              Heritage Nexus Inc., 2026
            </p>
          </div>
        </section>

        {/* Section 4 — Legacy Guides */}
        <section style={{ background: 'var(--color-void)', padding: 'clamp(64px,8vw,96px) clamp(24px,6vw,80px)' }}>
          <div style={{ maxWidth: '680px', margin: '0 auto' }}>
            <p style={{ ...MONO, fontSize: 'var(--text-caption)', color: 'var(--color-gold)', marginBottom: '24px' }}>
              The Legacy Guides
            </p>
            <h2 style={{ ...H2, color: 'rgba(250,248,244,0.9)' }}>The people who make this real.</h2>
            <p style={{ ...BODY, color: 'rgba(250,248,244,0.5)' }}>
              Basalith is built by a network of Legacy Guides, trained professionals
              who conduct Founding Sessions and maintain archive relationships over time.
            </p>
            <p style={{ ...BODY, color: 'rgba(250,248,244,0.5)' }}>The technology handles the complexity. The Guide handles the humanity.</p>
            <p style={{ ...BODY, color: 'rgba(250,248,244,0.85)', fontStyle: 'italic', marginBottom: '36px' }}>
              Every archive is a relationship, not a subscription.
            </p>
            <a
              href="/join-archivists"
              style={{
                ...MONO,
                fontSize:       'var(--text-caption)',
                display:        'inline-flex',
                alignItems:     'center',
                gap:            '8px',
                color:          'var(--color-gold)',
                textDecoration: 'none',
                border:         '1px solid rgba(196,162,74,0.4)',
                padding:        '12px 24px',
              }}
            >
              Become a Legacy Guide <span aria-hidden="true">→</span>
            </a>
          </div>
        </section>

        {/* Section 5 — The Research */}
        <section style={{ padding: 'clamp(64px,8vw,96px) clamp(24px,6vw,80px)' }}>
          <div style={{ maxWidth: '640px', margin: '0 auto' }}>
            <p style={{ ...MONO, fontSize: 'var(--text-caption)', color: 'var(--color-gold)', marginBottom: '24px' }}>
              Built on Evidence
            </p>
            <p style={BODY}>
              The architecture behind Basalith draws on peer-reviewed research in
              cognitive fingerprinting, personalized language model fine-tuning, oral
              history preservation, and organizational succession planning.
            </p>
            <p style={{ ...BODY, marginBottom: '36px' }}>
              The technical foundation is documented at basalith.xyz for anyone who wants
              to understand how this works, not just what it does.
            </p>
            <a
              href="https://basalith.xyz"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                ...MONO,
                fontSize:       'var(--text-caption)',
                display:        'inline-flex',
                alignItems:     'center',
                gap:            '8px',
                color:          'var(--color-gold)',
                textDecoration: 'none',
              }}
            >
              Read the Technical Foundation <span aria-hidden="true">→</span>
            </a>
          </div>
        </section>

        {/* Section 6 — Closing */}
        <section style={{ background: 'var(--color-void)', padding: 'clamp(80px,12vw,140px) clamp(24px,6vw,80px)', textAlign: 'center' }}>
          <div style={{ maxWidth: '540px', margin: '0 auto' }}>
            <p style={{ ...SERIF, fontSize: '1.1rem', fontStyle: 'italic', fontWeight: 300, color: 'rgba(250,248,244,0.5)', lineHeight: 1.85, marginBottom: '8px' }}>
              We are early.
            </p>
            <p style={{ ...SERIF, fontSize: '1.1rem', fontStyle: 'italic', fontWeight: 300, color: 'rgba(250,248,244,0.5)', lineHeight: 1.85, marginBottom: '8px' }}>
              The archives being built today will be the most valuable ones
              in twenty years, because they will have had the most time.
            </p>
            <p style={{ ...SERIF, fontSize: '1.1rem', fontStyle: 'italic', fontWeight: 300, color: 'rgba(250,248,244,0.5)', lineHeight: 1.85, marginBottom: '8px' }}>
              Every year you begin is a year the entity has more to work with.
            </p>
            <p style={{ ...SERIF, fontSize: '1.15rem', fontStyle: 'italic', fontWeight: 300, color: 'rgba(250,248,244,0.85)', lineHeight: 1.85, marginBottom: '32px' }}>
              Every year you wait is a year it has less.
            </p>
            <p style={{ ...SERIF, fontSize: '0.88rem', fontStyle: 'italic', fontWeight: 300, color: 'rgba(250,248,244,0.25)', lineHeight: 1.85, marginBottom: '40px', maxWidth: '420px', margin: '0 auto 40px' }}>
              Your archive runs on two permanent layers: one that holds every fact and memory you have deposited, and one that learns how you express, reason, and decide. Neither replaces the other.
            </p>
            <a
              href="/apply"
              style={{
                fontFamily:     'var(--font-space-mono, "Space Mono", "Courier New", monospace)',
                fontSize:       'var(--text-caption)',
                letterSpacing:  '0.3em',
                textTransform:  'uppercase' as const,
                display:        'inline-block',
                background:     'var(--color-gold)',
                color:          '#0A0908',
                textDecoration: 'none',
                padding:        '14px 32px',
                borderRadius:   'var(--radius-sm)',
              }}
            >
              Begin Your Archive
            </a>
          </div>
        </section>

      </main>
      <Footer />

      <style>{`
        @media (max-width: 767px) {
          .ecosystem-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </>
  )
}
