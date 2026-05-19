'use client'

import Link   from 'next/link'
import Nav    from '../components/Nav'
import Footer from '../components/Footer'


const MONO: React.CSSProperties = {
  fontFamily:    'var(--font-space-mono, "Space Mono", "Courier New", monospace)',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.28em',
}
const SERIF: React.CSSProperties = {
  fontFamily: 'var(--font-cormorant, "Cormorant Garamond", Georgia, serif)',
}
const GOLD_LINE: React.CSSProperties = {
  width:      '40px',
  height:     '1px',
  background: 'var(--color-gold)',
  margin:     '0 0 48px',
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ ...MONO, fontSize: 'var(--text-caption)', color: 'var(--color-gold)', marginBottom: '24px' }}>
      {children}
    </p>
  )
}

const COMPARISON = [
  { label: 'Founding session',   legacy: '$2,500',  succession: '$5,000'    },
  { label: 'Annual',             legacy: '$3,600',  succession: '$12,000'   },
  { label: 'Session length',     legacy: '90 min',  succession: '3 hours'   },
  { label: 'Scenarios',          legacy: 'Personal',succession: 'Business + Personal' },
  { label: 'Successor portal',   legacy: 'No',      succession: 'Yes'       },
  { label: 'Calibration',        legacy: 'Annual',  succession: 'Quarterly' },
  { label: 'Post-transition',    legacy: '$1,200',  succession: '$3,600'    },
]

export default function SuccessionPage() {
  return (
    <>
      <Nav />
      <main style={{ background: 'var(--color-bg)' }}>

        {/* Hero */}
        <section style={{ padding: 'clamp(140px,16vw,200px) clamp(24px,6vw,80px) clamp(80px,10vw,120px)', maxWidth: '780px' }}>
          <Eyebrow>Basalith for Business</Eyebrow>
          <h1 style={{
            ...SERIF,
            fontSize:      'clamp(2.4rem,5vw,4rem)',
            fontWeight:    300,
            lineHeight:    1.08,
            letterSpacing: '-0.02em',
            color:         'var(--color-text-primary)',
            marginBottom:  '32px',
          }}>
            Your founder&rsquo;s judgment built this company.
            <br />
            What happens to it when they leave?
          </h1>
          <p style={{
            ...SERIF,
            fontSize:     '1.2rem',
            fontStyle:    'italic',
            fontWeight:   300,
            lineHeight:   1.9,
            color:        'var(--color-text-secondary)',
            maxWidth:     '560px',
            marginBottom: '48px',
          }}>
            Every decision your founder made came from a way of thinking that exists nowhere in your documentation.
            Their risk tolerance. Their instinct about people. Their philosophy about customers. When they walk away from a deal.
            Basalith captures this while they are still here to teach it.
          </p>
          <Link
            href="/apply?type=succession"
            style={{
              ...MONO,
              fontSize:       'var(--text-caption)',
              display:        'inline-block',
              color:          'var(--color-surface)',
              textDecoration: 'none',
              background:     'var(--color-gold)',
              padding:        '16px 36px',
              transition:     'background 250ms ease',
            }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--color-gold-light)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'var(--color-gold)'}
          >
            Talk to us about Succession
          </Link>
        </section>

        {/* Problem */}
        <section style={{ background: 'var(--color-void)', padding: 'clamp(80px,12vw,140px) clamp(24px,6vw,80px)' }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <Eyebrow>The Succession Problem</Eyebrow>
            <p style={{
              ...SERIF,
              fontSize:     'clamp(1.3rem,2.5vw,1.7rem)',
              fontStyle:    'italic',
              fontWeight:   300,
              lineHeight:   1.7,
              color:        'rgba(250,250,248,0.85)',
              marginBottom: '40px',
            }}>
              Most succession plans transfer: systems, processes, relationships, financial models, org charts.
              None of them transfer judgment.
            </p>
            <div style={{ ...GOLD_LINE }} aria-hidden="true" />
            <p style={{ ...SERIF, fontSize: '1.1rem', fontStyle: 'italic', fontWeight: 300, lineHeight: 1.9, color: 'rgba(250,248,244,0.5)', marginBottom: '20px' }}>
              The way a founder thinks about a difficult hire.
              The instinct they have about a market shift.
              The pattern they recognize in a failing customer relationship.
            </p>
            <p style={{ ...SERIF, fontSize: '1.1rem', fontStyle: 'italic', fontWeight: 300, lineHeight: 1.9, color: 'rgba(250,248,244,0.5)', marginBottom: '20px' }}>
              This knowledge lives in one person. When they transition it goes with them.
            </p>
            <p style={{ ...SERIF, fontSize: '1.3rem', fontStyle: 'italic', fontWeight: 300, lineHeight: 1.7, color: 'rgba(184,150,62,0.9)', margin: 0 }}>
              Until now.
            </p>
          </div>
        </section>

        {/* How it works */}
        <section style={{ padding: 'clamp(80px,12vw,140px) clamp(24px,6vw,80px)' }}>
          <div style={{ maxWidth: '860px', margin: '0 auto' }}>
            <Eyebrow>How Basalith Succession Works</Eyebrow>
            <div className="succession-steps" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '48px' }}>

              {[
                {
                  n:     '01',
                  title: 'The Founding Session',
                  sub:   '3 hours',
                  body:  'A trained Legacy Guide conducts an extended session with the founder. Not about memories. About thinking. How they evaluate risk. How they read people and situations. How they have made their most important decisions. 20+ business scenarios captured and trained into the entity.',
                },
                {
                  n:     '02',
                  title: 'The Entity Builds',
                  sub:   'Months and years',
                  body:  'Over time the entity learns from continued deposits. Quarterly calibration sessions keep it current as the business evolves. The entity knows what the founder knew. It thinks the way they think.',
                },
                {
                  n:     '03',
                  title: 'The Successor Queries',
                  sub:   'When they are ready',
                  body:  'When the founder steps back the successor has access to the Basalith Successor Portal. They bring real decisions. The entity responds with the founder\'s cognitive framework applied to the situation. Not a replacement. A reference.',
                },
              ].map(step => (
                <div key={step.n}>
                  <p style={{ ...MONO, fontSize: '0.52rem', color: 'var(--color-gold)', marginBottom: '8px' }}>{step.n}</p>
                  <h3 style={{ ...SERIF, fontSize: '1.4rem', fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: '6px', lineHeight: 1.2 }}>
                    {step.title}
                  </h3>
                  <p style={{ ...MONO, fontSize: '0.45rem', color: 'var(--color-text-muted)', marginBottom: '20px' }}>{step.sub}</p>
                  <p style={{ ...SERIF, fontSize: '1rem', fontWeight: 300, lineHeight: 1.85, color: 'var(--color-text-secondary)' }}>
                    {step.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section style={{ background: 'var(--color-void)', padding: 'clamp(80px,12vw,140px) clamp(24px,6vw,80px)' }}>
          <div style={{ maxWidth: '680px', margin: '0 auto' }}>
            <Eyebrow>Succession Pricing</Eyebrow>

            {/* Pricing card */}
            <div style={{ border: '1px solid rgba(184,150,62,0.4)', padding: 'clamp(32px,5vw,56px)', marginBottom: '40px', background: 'rgba(184,150,62,0.04)' }}>
              <p style={{ ...MONO, fontSize: '0.52rem', color: 'var(--color-gold)', marginBottom: '20px' }}>Succession</p>
              <p style={{ ...SERIF, fontSize: 'clamp(2.5rem,5vw,3.5rem)', fontWeight: 300, color: 'var(--color-text-primary)', lineHeight: 1, marginBottom: '4px' }}>$12,000</p>
              <p style={{ ...MONO, fontSize: '0.45rem', color: 'var(--color-text-muted)', marginBottom: '8px' }}>per year</p>
              <p style={{ ...SERIF, fontSize: '1rem', fontStyle: 'italic', color: 'var(--color-gold)', marginBottom: '36px' }}>
                + $5,000 founding session (one-time)
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 24px', marginBottom: '36px' }}>
                {[
                  'Extended 3-hour founding session',
                  'Business decision framework capture',
                  '20+ scenario training library',
                  'Successor access portal',
                  'Quarterly calibration sessions',
                  'Annual entity accuracy report',
                  'Board-level reporting',
                  'Priority support',
                ].map(f => (
                  <p key={f} style={{ ...MONO, fontSize: '0.45rem', color: 'rgba(250,248,244,0.55)', margin: 0 }}>&#10003; {f}</p>
                ))}
              </div>
              <Link
                href="/apply?type=succession"
                style={{
                  ...MONO, fontSize: 'var(--text-caption)',
                  display: 'block', textAlign: 'center',
                  color: 'var(--color-surface)', textDecoration: 'none',
                  background: 'var(--color-gold)', padding: '16px 32px',
                  transition: 'background 250ms ease',
                }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--color-gold-light)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'var(--color-gold)'}
              >
                Talk to us about Succession
              </Link>
            </div>

            <p style={{ ...SERIF, fontSize: '1rem', fontStyle: 'italic', color: 'var(--color-text-muted)', marginBottom: '52px' }}>
              After transition: $3,600/year. Institutional access for the successor continues.
              Entity updated with new AI models. No active sessions required.
            </p>

            {/* Comparison table */}
            <Eyebrow>Legacy vs. Succession</Eyebrow>
            <div style={{ border: '1px solid var(--color-border-medium)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', borderBottom: '1px solid var(--color-border-medium)' }}>
                <div style={{ padding: '12px 16px' }} />
                <p style={{ ...MONO, fontSize: '0.45rem', color: 'var(--color-text-muted)', padding: '12px 16px', margin: 0 }}>Legacy</p>
                <p style={{ ...MONO, fontSize: '0.45rem', color: 'var(--color-gold)', padding: '12px 16px', margin: 0 }}>Succession</p>
              </div>
              {COMPARISON.map((row, i) => (
                <div key={row.label} style={{
                  display:       'grid',
                  gridTemplateColumns: '2fr 1fr 1fr',
                  borderBottom:  i < COMPARISON.length - 1 ? '1px solid var(--color-border-medium)' : 'none',
                  background:    i % 2 === 0 ? 'transparent' : 'rgba(250,248,244,0.02)',
                }}>
                  <p style={{ ...MONO, fontSize: '0.44rem', color: 'rgba(250,248,244,0.5)', padding: '12px 16px', margin: 0 }}>{row.label}</p>
                  <p style={{ ...SERIF, fontSize: '0.9rem', color: 'var(--color-text-secondary)', padding: '12px 16px', margin: 0 }}>{row.legacy}</p>
                  <p style={{ ...SERIF, fontSize: '0.9rem', color: 'rgba(250,248,244,0.9)', padding: '12px 16px', margin: 0, fontWeight: 500 }}>{row.succession}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section style={{ padding: 'clamp(80px,12vw,140px) clamp(24px,6vw,80px)', textAlign: 'center' }}>
          <p style={{ ...SERIF, fontSize: 'clamp(1.3rem,2.5vw,1.8rem)', fontStyle: 'italic', fontWeight: 300, color: 'var(--color-text-primary)', marginBottom: '16px', lineHeight: 1.5 }}>
            Ready to preserve what your founder built?
          </p>
          <p style={{ ...SERIF, fontSize: '1.1rem', fontStyle: 'italic', fontWeight: 300, color: 'var(--color-text-secondary)', marginBottom: '40px', lineHeight: 1.8 }}>
            Talk to a Legacy Guide about the Succession program.
          </p>
          <Link
            href="/apply?type=succession"
            style={{
              ...MONO, fontSize: 'var(--text-caption)',
              display: 'inline-block', color: 'var(--color-surface)', textDecoration: 'none',
              background: 'var(--color-gold)', padding: '16px 40px',
              transition: 'background 250ms ease',
            }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--color-gold-light)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'var(--color-gold)'}
          >
            Talk to us &rarr;
          </Link>
        </section>

      </main>
      <Footer />

      <style>{`
        @media (max-width: 768px) {
          .succession-steps { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </>
  )
}
