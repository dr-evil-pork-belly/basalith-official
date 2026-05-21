import type { Metadata } from 'next'
import Link   from 'next/link'
import Nav    from '../components/Nav'
import Footer from '../components/Footer'

export const metadata: Metadata = {
  title:       'The Integrity Promise · Basalith',
  description: 'Your archive is yours. Forever. Without exception. What happens to it while you are alive, after you pass, and if we ever close our doors.',
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
  marginBottom: '16px',
}
const H2: React.CSSProperties = {
  ...SERIF,
  fontWeight:    300,
  fontSize:      'clamp(1.75rem,3vw,2.6rem)',
  lineHeight:    1.15,
  color:         'var(--color-text-primary)',
  letterSpacing: '-0.02em',
  marginBottom:  '24px',
}

const DATA_CARDS = [
  {
    headline: 'We never use your archive to train other people\'s entities.',
    body:     'What you deposit trains your entity. It does not make anyone else\'s entity smarter. Your memories stay in your archive.',
  },
  {
    headline: 'You can take everything with you.',
    body:     'At any time, for any reason, you can download your complete archive — every deposit, every voice recording, every photograph — in formats you can open on any device.',
  },
  {
    headline: 'We will never sell your archive.',
    body:     'Not to advertisers. Not to a data broker. Not as part of a bankruptcy or acquisition. Your archive is not an asset we own. It is property we hold in trust for you.',
  },
]

export default function IntegrityPage() {
  return (
    <>
      <Nav />
      <main style={{ background: 'var(--color-bg)' }}>

        {/* Hero */}
        <section style={{ padding: 'clamp(140px,16vw,200px) clamp(24px,6vw,80px) clamp(64px,8vw,96px)', maxWidth: '760px' }}>
          <p style={{ ...MONO, fontSize: 'var(--text-caption)', color: 'var(--color-gold)', marginBottom: '28px' }}>
            The Integrity Promise
          </p>
          <h1 style={{
            ...SERIF,
            fontWeight:    300,
            fontSize:      'clamp(2.4rem,5vw,4rem)',
            lineHeight:    1.08,
            letterSpacing: '-0.025em',
            color:         'var(--color-text-primary)',
            marginBottom:  '32px',
          }}>
            Your archive is yours.
            <br />
            <em style={{ fontStyle: 'italic', color: 'var(--color-gold)' }}>Forever. Without exception.</em>
          </h1>
          <p style={{ ...BODY, fontSize: '1.2rem', maxWidth: '560px' }}>
            We are going to tell you exactly what happens to your archive while you are alive,
            after you pass, and if we ever close our doors. No legal language. Plain truth.
          </p>
        </section>

        {/* Section 1 — Immutability Vault */}
        <section style={{ background: 'var(--color-void)', padding: 'clamp(64px,8vw,96px) clamp(24px,6vw,80px)' }}>
          <div style={{ maxWidth: '680px', margin: '0 auto' }}>
            <p style={{ ...MONO, fontSize: 'var(--text-caption)', color: 'var(--color-gold)', marginBottom: '24px' }}>
              After You Pass
            </p>
            <h2 style={H2}>No one can change what you built.</h2>

            <p style={BODY}>When you die your archive is sealed.</p>
            <p style={BODY}>
              Not locked behind a paywall. Not archived in a format no one can access. Sealed.
            </p>
            <p style={BODY}>
              Your cognitive fingerprint — the training data that makes your entity sound like you —
              is permanently frozen at the database level.
            </p>
            <p style={BODY}>Your heirs can talk to your entity. Your grandchildren can add new memories to the archive.</p>
            <p style={{ ...BODY, color: 'var(--color-text-primary)' }}>
              What they cannot do is change what you built. They cannot edit your stated values.
              They cannot delete your voice recordings. They cannot alter the deposits you made
              while you were alive and thinking clearly.
            </p>
            <p style={{ ...BODY, color: 'var(--color-gold)', fontStyle: 'italic' }}>
              What you said is what you said. Forever.
            </p>
          </div>
        </section>

        {/* Section 2 — Data Promise */}
        <section style={{ padding: 'clamp(64px,8vw,96px) clamp(24px,6vw,80px)' }}>
          <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            <p style={{ ...MONO, fontSize: 'var(--text-caption)', color: 'var(--color-gold)', marginBottom: '24px' }}>
              Your Data
            </p>
            <div className="data-cards" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
              {DATA_CARDS.map(card => (
                <div key={card.headline} style={{
                  border:   '1px solid var(--color-border)',
                  padding:  'clamp(24px,3vw,36px)',
                  background: 'var(--color-surface)',
                }}>
                  <p style={{
                    ...SERIF, fontWeight: 500, fontSize: '1.1rem',
                    color:        'var(--color-text-primary)',
                    lineHeight:   1.35, marginBottom: '16px',
                  }}>
                    {card.headline}
                  </p>
                  <p style={{ ...SERIF, fontWeight: 300, fontSize: '1rem', color: 'var(--color-text-secondary)', lineHeight: 1.8, margin: 0 }}>
                    {card.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Section 3 — If We Close */}
        <section style={{ background: 'var(--color-void)', padding: 'clamp(64px,8vw,96px) clamp(24px,6vw,80px)' }}>
          <div style={{ maxWidth: '680px', margin: '0 auto' }}>
            <p style={{ ...MONO, fontSize: 'var(--text-caption)', color: 'var(--color-gold)', marginBottom: '24px' }}>
              If Basalith Closes
            </p>
            <h2 style={H2}>You will not lose what you built.</h2>
            <p style={{ ...BODY, fontStyle: 'italic' }}>Startups close. We know this.</p>
            <p style={BODY}>
              If Heritage Nexus Inc. ever faces dissolution we commit to three things:
            </p>
            {[
              '90 days notice where circumstances allow — so you have time to decide what to do.',
              'Complete data export before we close — everything in open formats you can take to any platform or host yourself.',
              'No sale of archive data — your memories are not a corporate asset we can liquidate. They are yours.',
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                <span style={{ ...MONO, fontSize: '0.52rem', color: 'var(--color-gold)', paddingTop: '5px', flexShrink: 0 }}>0{i + 1}</span>
                <p style={{ ...BODY, margin: 0 }}>{item}</p>
              </div>
            ))}
            <p style={{ ...BODY, marginTop: '24px' }}>
              We cannot promise we will exist forever. We can promise you will not lose what
              you built without warning and without the option to take it with you.
            </p>
          </div>
        </section>

        {/* Section 4 — Dual-Engine */}
        <section style={{ padding: 'clamp(64px,8vw,96px) clamp(24px,6vw,80px)' }}>
          <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            <p style={{ ...MONO, fontSize: 'var(--text-caption)', color: 'var(--color-gold)', marginBottom: '24px' }}>
              How Your Entity Stays Accurate
            </p>
            <h2 style={H2}>Two systems protect what you actually said.</h2>
            <div className="data-cards" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={{ border: '1px solid var(--color-border)', padding: 'clamp(24px,3vw,36px)', background: 'var(--color-surface)' }}>
                <p style={{ ...MONO, fontSize: '0.48rem', color: 'var(--color-gold)', marginBottom: '16px' }}>The Memory Vault</p>
                <p style={{ ...BODY, margin: 0 }}>
                  Every deposit you make is stored permanently. When your entity answers a question
                  it retrieves your actual words — not a guess.
                  <br /><br />
                  This is why your entity will never tell your grandchildren something you never said.
                </p>
              </div>
              <div style={{ border: '1px solid rgba(196,162,74,0.3)', padding: 'clamp(24px,3vw,36px)', background: 'rgba(196,162,74,0.03)' }}>
                <p style={{ ...MONO, fontSize: '0.48rem', color: 'var(--color-gold)', marginBottom: '16px' }}>The Voice Layer</p>
                <p style={{ ...BODY, margin: 0 }}>
                  As your archive grows a second system learns how you say things — your phrasing,
                  your characteristic way of expressing uncertainty, the specific words you reach for.
                  <br /><br />
                  This is why your entity starts to sound like you, not just inform like you.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Closing CTA */}
        <section style={{ background: 'var(--color-void)', padding: 'clamp(64px,8vw,96px) clamp(24px,6vw,80px)', textAlign: 'center' }}>
          <p style={{ ...SERIF, fontSize: '1.1rem', fontStyle: 'italic', fontWeight: 300, color: 'var(--color-text-secondary)', marginBottom: '8px', lineHeight: 1.85 }}>
            These are not marketing claims.
          </p>
          <p style={{ ...SERIF, fontSize: '1.1rem', fontStyle: 'italic', fontWeight: 300, color: 'var(--color-text-secondary)', marginBottom: '40px', lineHeight: 1.85 }}>
            They are the principles this company was built on.
            If you have a question we have not answered here — ask us directly.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <a href="mailto:hello@basalith.xyz"
              style={{ ...MONO, fontSize: 'var(--text-caption)', display: 'inline-block', background: 'var(--color-gold)', color: 'var(--color-bg)', textDecoration: 'none', padding: '14px 28px' }}>
              hello@basalith.xyz
            </a>
            <Link href="/privacy"
              style={{ ...MONO, fontSize: 'var(--text-caption)', display: 'inline-block', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)', textDecoration: 'none', padding: '13px 27px' }}>
              Privacy Policy
            </Link>
            <Link href="/security"
              style={{ ...MONO, fontSize: 'var(--text-caption)', display: 'inline-block', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)', textDecoration: 'none', padding: '13px 27px' }}>
              Security Practices
            </Link>
          </div>
        </section>

      </main>
      <Footer />

      <style>{`
        @media (max-width: 767px) {
          .data-cards { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </>
  )
}
