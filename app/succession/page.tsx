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
const GEORGIA: React.CSSProperties = {
  fontFamily: 'Georgia, "Times New Roman", serif',
}
const PAD = 'clamp(24px,6vw,80px)'

const DOCUMENTED = [
  'Strategic direction and long-range plans',
  'Process documentation and playbooks',
  'Org structure and reporting lines',
  'Financial models and unit economics',
]

const WALKS_OUT = [
  'Risk calibration built over decades',
  'Pattern recognition that preceded every major decision',
  'The unspoken veto logic applied to deals and hires',
  'The judgment that shaped every outcome',
]

const FEATURES = [
  'Extended 3-hour founding session',
  'Business decision framework capture',
  '20+ scenario training library',
  'Successor access portal',
  'Quarterly calibration sessions',
  'Annual accuracy report',
  'Board-level reporting',
  'Priority support',
]

export default function SuccessionPage() {
  return (
    <>
      <Nav />
      <main style={{ background: 'var(--color-bg)' }}>

        {/* ── Section 1: The Problem ── */}
        <section style={{
          padding:   `clamp(140px,16vw,200px) ${PAD} clamp(80px,10vw,120px)`,
          maxWidth:  '960px',
        }}>
          <p style={{ ...MONO, fontSize: 'var(--text-caption)', color: 'var(--color-gold)', marginBottom: '32px' }}>
            Basalith for Business
          </p>
          <h1 style={{
            ...SERIF,
            fontSize:      'clamp(2.6rem,5vw,3.25rem)',
            fontWeight:    300,
            lineHeight:    1.08,
            letterSpacing: '-0.02em',
            color:         'var(--color-text-primary)',
            marginBottom:  '36px',
            maxWidth:      '780px',
          }}>
            When the founder leaves, the judgment leaves with them.
          </h1>
          <p style={{
            ...GEORGIA,
            fontSize:   '1.2rem',
            fontStyle:  'italic',
            fontWeight: 300,
            lineHeight: 1.85,
            color:      'var(--color-text-secondary)',
            maxWidth:   '600px',
            margin:     0,
          }}>
            Not the strategy deck. Not the org chart. The pattern recognition built over decades that never made it into any document.
          </p>
        </section>

        {/* ── Section 2: What is actually lost ── */}
        <section style={{ background: 'var(--color-void)', padding: `clamp(80px,10vw,120px) ${PAD}` }}>
          <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            <p style={{ ...MONO, fontSize: 'var(--text-caption)', color: 'var(--color-gold)', marginBottom: '48px' }}>
              The Transfer Gap
            </p>
            <div className="succession-contrast" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px' }}>

              {/* Left: Documented */}
              <div style={{
                background: 'rgba(250,248,244,0.02)',
                border:     '1px solid rgba(255,255,255,0.06)',
                padding:    'clamp(28px,4vw,48px)',
              }}>
                <p style={{ ...MONO, fontSize: '0.46rem', color: 'rgba(250,248,244,0.35)', marginBottom: '28px' }}>
                  What gets documented
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                  {DOCUMENTED.map(item => (
                    <div key={item} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                      <span style={{ ...MONO, fontSize: '0.4rem', color: 'rgba(250,248,244,0.2)', paddingTop: '2px', flexShrink: 0 }}>
                        &#10003;
                      </span>
                      <p style={{ ...GEORGIA, fontSize: '1rem', fontStyle: 'italic', fontWeight: 300, lineHeight: 1.7, color: 'rgba(250,248,244,0.35)', margin: 0 }}>
                        {item}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right: Walks out */}
              <div style={{
                background:   'rgba(196,162,74,0.04)',
                border:       '1px solid rgba(196,162,74,0.2)',
                borderTop:    '2px solid rgba(196,162,74,0.7)',
                padding:      'clamp(28px,4vw,48px)',
              }}>
                <p style={{ ...MONO, fontSize: '0.46rem', color: 'var(--color-gold)', marginBottom: '28px' }}>
                  What walks out the door
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                  {WALKS_OUT.map(item => (
                    <div key={item} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                      <span style={{ ...MONO, fontSize: '0.4rem', color: 'rgba(196,162,74,0.5)', paddingTop: '2px', flexShrink: 0 }}>
                        &#8594;
                      </span>
                      <p style={{ ...GEORGIA, fontSize: '1rem', fontStyle: 'italic', fontWeight: 300, lineHeight: 1.7, color: 'rgba(250,248,244,0.75)', margin: 0 }}>
                        {item}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ── Section 3: The Solution ── */}
        <section style={{ padding: `clamp(80px,10vw,120px) ${PAD}` }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <p style={{ ...MONO, fontSize: 'var(--text-caption)', color: 'var(--color-gold)', marginBottom: '40px' }}>
              How Basalith Solves It
            </p>

            <p style={{ ...GEORGIA, fontSize: '1.15rem', fontWeight: 300, lineHeight: 1.9, color: 'var(--color-text-primary)', marginBottom: '32px' }}>
              Basalith builds a cognitive reference model of the founder while they are still active. Not a biography. Not a recorded interview series. A system that captures how they reason, what they weigh, and how they decide. Then makes that available to successors as an active intelligence resource.
            </p>

            <div style={{
              borderLeft:  '2px solid rgba(196,162,74,0.4)',
              paddingLeft: '24px',
              marginTop:   '40px',
            }}>
              <p style={{ ...MONO, fontSize: '0.42rem', color: 'rgba(196,162,74,0.6)', marginBottom: '12px' }}>
                The Architecture
              </p>
              <p style={{ ...GEORGIA, fontSize: '1rem', fontStyle: 'italic', fontWeight: 300, lineHeight: 1.85, color: 'var(--color-text-secondary)', margin: 0 }}>
                Two permanent layers: one holds every fact and decision deposited, one learns the reasoning patterns behind them. Successors query the system the same way they would consult the founder.
              </p>
            </div>
          </div>
        </section>

        {/* ── Section 4: The Two Layers ── */}
        <section style={{ background: 'var(--color-void)', padding: `clamp(80px,10vw,120px) ${PAD}` }}>
          <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            <p style={{ ...MONO, fontSize: 'var(--text-caption)', color: 'var(--color-gold)', marginBottom: '48px' }}>
              Succession Governance
            </p>
            <div className="succession-layers" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>

              {/* Frozen layer */}
              <div style={{
                border:      '1px solid rgba(255,255,255,0.08)',
                borderTop:   '2px solid rgba(250,248,244,0.3)',
                padding:     'clamp(28px,4vw,44px)',
                background:  'rgba(250,248,244,0.02)',
              }}>
                <p style={{ ...MONO, fontSize: '0.42rem', color: 'rgba(250,248,244,0.35)', marginBottom: '20px' }}>
                  Frozen at transition
                </p>
                <h3 style={{
                  ...SERIF,
                  fontSize:     'clamp(1.3rem,2.5vw,1.7rem)',
                  fontWeight:   300,
                  lineHeight:   1.2,
                  color:        'var(--color-text-primary)',
                  marginBottom: '20px',
                }}>
                  The Cognitive Fingerprint Layer
                </h3>
                <p style={{ ...GEORGIA, fontSize: '1rem', fontStyle: 'italic', fontWeight: 300, lineHeight: 1.8, color: 'var(--color-text-secondary)', marginBottom: '16px' }}>
                  The founder's lifetime logic. Locked at transition. Cannot be altered.
                </p>
                <p style={{ ...GEORGIA, fontSize: '0.9rem', fontWeight: 300, lineHeight: 1.8, color: 'var(--color-text-muted)', margin: 0 }}>
                  Every decision, position, and judgment captured during the active years. Immutable after the founder steps back.
                </p>
              </div>

              {/* Mutable layer */}
              <div style={{
                border:      '1px solid rgba(196,162,74,0.2)',
                borderTop:   '2px solid rgba(196,162,74,0.6)',
                padding:     'clamp(28px,4vw,44px)',
                background:  'rgba(196,162,74,0.03)',
              }}>
                <p style={{ ...MONO, fontSize: '0.42rem', color: 'var(--color-gold)', marginBottom: '20px', opacity: 0.7 }}>
                  Active post-transition
                </p>
                <h3 style={{
                  ...SERIF,
                  fontSize:     'clamp(1.3rem,2.5vw,1.7rem)',
                  fontWeight:   300,
                  lineHeight:   1.2,
                  color:        'var(--color-text-primary)',
                  marginBottom: '20px',
                }}>
                  The Contextual Intelligence Layer
                </h3>
                <p style={{ ...GEORGIA, fontSize: '1rem', fontStyle: 'italic', fontWeight: 300, lineHeight: 1.8, color: 'var(--color-text-secondary)', marginBottom: '16px' }}>
                  Successors inject current business context. The system combines the founder's reasoning with present facts.
                </p>
                <p style={{ ...GEORGIA, fontSize: '0.9rem', fontWeight: 300, lineHeight: 1.8, color: 'var(--color-text-muted)', margin: 0 }}>
                  The archive does not freeze in time. It meets the present.
                </p>
              </div>

            </div>
          </div>
        </section>

        {/* ── Section 5: Pricing + CTA ── */}
        <section style={{ padding: `clamp(80px,10vw,120px) ${PAD}` }}>
          <div style={{ maxWidth: '640px', margin: '0 auto' }}>
            <p style={{ ...MONO, fontSize: 'var(--text-caption)', color: 'var(--color-gold)', marginBottom: '32px' }}>
              The Succession Tier
            </p>

            <div style={{
              border:        '1px solid rgba(196,162,74,0.3)',
              borderTop:     '2px solid rgba(196,162,74,0.7)',
              background:    'rgba(196,162,74,0.03)',
              padding:       'clamp(32px,5vw,52px)',
              marginBottom:  '40px',
            }}>
              <p style={{ ...SERIF, fontSize: 'clamp(3rem,6vw,4rem)', fontWeight: 300, color: 'var(--color-text-primary)', lineHeight: 1, letterSpacing: '-0.02em', marginBottom: '4px' }}>
                $12,000
              </p>
              <p style={{ ...MONO, fontSize: '0.46rem', color: 'rgba(250,248,244,0.4)', marginBottom: '8px' }}>
                per year
              </p>
              <p style={{ ...GEORGIA, fontSize: '0.95rem', fontStyle: 'italic', color: 'var(--color-gold)', marginBottom: '32px' }}>
                + $5,000 founding session (one-time)
              </p>

              <div style={{ height: '1px', background: 'rgba(196,162,74,0.15)', marginBottom: '28px' }} />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 24px', marginBottom: '36px' }}>
                {FEATURES.map(f => (
                  <p key={f} style={{ ...MONO, fontSize: '0.43rem', color: 'rgba(250,248,244,0.5)', margin: 0 }}>
                    &#10003; {f}
                  </p>
                ))}
              </div>

              <p style={{ ...GEORGIA, fontSize: '1rem', fontStyle: 'italic', fontWeight: 300, lineHeight: 1.8, color: 'var(--color-text-secondary)', marginBottom: '28px' }}>
                Onboarding begins with a founding session. Apply below.
              </p>

              <Link
                href="/contact"
                style={{
                  ...MONO,
                  fontSize:       'var(--text-caption)',
                  display:        'block',
                  textAlign:      'center',
                  color:          '#0A0908',
                  textDecoration: 'none',
                  background:     'var(--color-gold)',
                  padding:        '16px 32px',
                  transition:     'background 250ms ease',
                }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--color-gold-light)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'var(--color-gold)'}
              >
                Start the Conversation
              </Link>
            </div>

            <p style={{ ...GEORGIA, fontSize: '0.9rem', fontStyle: 'italic', fontWeight: 300, lineHeight: 1.8, color: 'rgba(250,248,244,0.3)' }}>
              Post-transition access: $3,600/year. Institutional query access for the successor continues. No active sessions required.
            </p>
          </div>
        </section>

      </main>
      <Footer />

      <style>{`
        @media (max-width: 680px) {
          .succession-contrast { grid-template-columns: 1fr !important; }
          .succession-layers   { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </>
  )
}
