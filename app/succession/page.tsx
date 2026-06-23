import type { Metadata } from 'next'
import Link        from 'next/link'
import Nav         from '../components/Nav'
import Footer      from '../components/Footer'
import ContrastDemo from '../components/ContrastDemo'
import { CATEGORY_LINE } from '@/lib/copy'

export const metadata: Metadata = {
  title:       'For Business · Basalith',
  description: 'When a business changes hands, the judgment that built it usually does not transfer. Basalith captures how the operator reasons during the active years, so it transfers through an acquisition or a succession.',
}

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

const TRANSITIONS = [
  {
    label: 'Acquisition',
    body:  'You bought the company because of how it was run. The operator’s judgment is the asset you paid for, and the earnout assumes it transfers. Most of it lives in one person’s head and leaves on their last day. Basalith captures it during the active years, so what you valued in diligence is still in the room after the operator is gone.',
  },
  {
    label: 'Succession',
    body:  'The founder is stepping back, or a partner is retiring. The successor inherits the systems and the client list. Not the reasoning that built them. Basalith hands forward the thinking behind the structure, so the next person can ask how the founder would have decided instead of guessing.',
  },
]

const HANDOFF = [
  {
    n:     '01',
    title: 'The Founding.',
    body:  'An extended guided session captures the decision frameworks the operator uses most.',
  },
  {
    n:     '02',
    title: 'Scenario capture.',
    body:  'The operator works through 20 real business scenarios and 29 decision questions across 8 domains. Their responses train the model.',
  },
  {
    n:     '03',
    title: 'Verification.',
    body:  'Responses are evaluated before they influence the model, so the system reflects how the operator actually decided.',
  },
  {
    n:     '04',
    title: 'Handoff.',
    body:  'The successor or acquirer gets portal access and consults the model on the calls that matter, long after the operator has stepped back.',
  },
]

const TRUST = [
  {
    title: 'Not reconstructed after the fact.',
    body:  'Basalith is built while the operator is active and fully participating. Not assembled from old messages once they are gone.',
  },
  {
    title: 'Not a wrapper on a general AI.',
    body:  'Every model is trained only on one operator’s deposits. No general model speaks for the archive.',
  },
  {
    title: 'Never shared. Never sold.',
    body:  'Your archive is never shared, sold, or used to train another company’s model.',
  },
  {
    title: 'You own the archive.',
    body:  'You own the archive and can export all of it at any time. Nothing is stranded if we ever close.',
  },
  {
    title: 'Frozen at transition.',
    body:  'The fingerprint is frozen at transition. The new owner can add context. Nobody can rewrite what the operator said.',
  },
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
          <p style={{ ...MONO, fontSize: 'var(--text-caption)', color: 'var(--color-gold)', marginBottom: '16px' }}>
            Basalith for Business &middot; Acquisition and Succession
          </p>
          <p style={{ ...MONO, fontSize: '0.46rem', color: 'rgba(196,162,74,0.7)', lineHeight: 1.8, marginBottom: '36px', maxWidth: '640px' }}>
            {CATEGORY_LINE}
          </p>
          <h1 style={{
            ...SERIF,
            fontSize:      'clamp(2.6rem,5vw,3.25rem)',
            fontWeight:    300,
            lineHeight:    1.08,
            letterSpacing: '-0.02em',
            color:         'var(--color-text-primary)',
            marginBottom:  '36px',
            maxWidth:      '820px',
          }}>
            When a business changes hands, the judgment that built it usually doesn&rsquo;t.
          </h1>
          <p style={{
            ...GEORGIA,
            fontSize:   '1.2rem',
            fontStyle:  'italic',
            fontWeight: 300,
            lineHeight: 1.85,
            color:      'var(--color-text-secondary)',
            maxWidth:   '660px',
            margin:     0,
          }}>
            Basalith builds a cognitive reference model of the operator while they are still running the company. How they price risk, how they read people, the calls they make without thinking. It captures the reasoning behind the decisions, so it transfers with the business, through an acquisition or a succession.
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

        {/* ── Section 3: Two transitions ── */}
        <section style={{ padding: `clamp(80px,10vw,120px) ${PAD}` }}>
          <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            <h2 style={{
              ...SERIF,
              fontSize:      'clamp(1.8rem,3.4vw,2.6rem)',
              fontWeight:    300,
              lineHeight:    1.15,
              letterSpacing: '-0.02em',
              color:         'var(--color-text-primary)',
              marginBottom:  '48px',
              maxWidth:      '720px',
            }}>
              A business changes hands two ways. Both lose the same thing.
            </h2>
            <div className="succession-transitions" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              {TRANSITIONS.map(({ label, body }) => (
                <div key={label} style={{
                  border:     '1px solid rgba(196,162,74,0.2)',
                  borderTop:  '2px solid rgba(196,162,74,0.6)',
                  background: 'rgba(196,162,74,0.03)',
                  padding:    'clamp(28px,4vw,44px)',
                }}>
                  <p style={{ ...MONO, fontSize: '0.46rem', color: 'var(--color-gold)', marginBottom: '20px' }}>
                    {label}
                  </p>
                  <p style={{ ...GEORGIA, fontSize: '1.05rem', fontStyle: 'italic', fontWeight: 300, lineHeight: 1.85, color: 'var(--color-text-secondary)', margin: 0 }}>
                    {body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Section 4: The Solution ── */}
        <section style={{ background: 'var(--color-void)', padding: `clamp(80px,10vw,120px) ${PAD}` }}>
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

        {/* ── Section 5: The Two Layers ── */}
        <section style={{ background: 'var(--color-void)', padding: `0 ${PAD} clamp(80px,10vw,120px)` }}>
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
                  The founder&rsquo;s lifetime logic. Locked at transition. Cannot be altered.
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
                  Successors inject current business context. The system combines the founder&rsquo;s reasoning with present facts.
                </p>
                <p style={{ ...GEORGIA, fontSize: '0.9rem', fontWeight: 300, lineHeight: 1.8, color: 'var(--color-text-muted)', margin: 0 }}>
                  The archive does not freeze in time. It meets the present.
                </p>
              </div>

            </div>
          </div>
        </section>

        {/* ── Section 6: How the handoff works ── */}
        <section style={{ padding: `clamp(80px,10vw,120px) ${PAD}` }}>
          <div style={{ maxWidth: '760px', margin: '0 auto' }}>
            <p style={{ ...MONO, fontSize: 'var(--text-caption)', color: 'var(--color-gold)', marginBottom: '48px' }}>
              How the handoff actually works
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
              {HANDOFF.map(({ n, title, body }) => (
                <div key={n} style={{ display: 'grid', gridTemplateColumns: '3rem 1fr', gap: '24px' }}>
                  <p style={{ ...MONO, fontSize: '0.52rem', color: 'var(--color-gold)', paddingTop: '4px' }}>{n}</p>
                  <div>
                    <h3 style={{ ...SERIF, fontSize: '1.4rem', fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: '10px', lineHeight: 1.2 }}>
                      {title}
                    </h3>
                    <p style={{ ...GEORGIA, fontSize: '1.05rem', fontStyle: 'italic', fontWeight: 300, lineHeight: 1.8, color: 'var(--color-text-secondary)', margin: 0 }}>
                      {body}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Section 7: Trust framing ── */}
        <section style={{ background: 'var(--color-void)', padding: `clamp(80px,10vw,120px) ${PAD}` }}>
          <div style={{ maxWidth: '760px', margin: '0 auto' }}>
            <p style={{ ...MONO, fontSize: 'var(--text-caption)', color: 'var(--color-gold)', marginBottom: '24px' }}>
              Trust is the whole product
            </p>
            <div className="succession-trust" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px 24px', marginTop: '24px' }}>
              {TRUST.map(({ title, body }) => (
                <div key={title} style={{ borderLeft: '3px solid rgba(196,162,74,0.5)', paddingLeft: 'clamp(20px,3vw,28px)' }}>
                  <h3 style={{ ...SERIF, fontSize: '1.25rem', fontWeight: 300, color: 'var(--text-on-dark, rgba(250,248,244,0.9))', lineHeight: 1.25, margin: '0 0 10px' }}>
                    {title}
                  </h3>
                  <p style={{ ...GEORGIA, fontSize: '1rem', fontStyle: 'italic', fontWeight: 300, lineHeight: 1.8, color: 'rgba(250,248,244,0.55)', margin: 0 }}>
                    {body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Section 8: Pricing + CTA ── */}
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
                Onboarding begins with a founding session. Start the conversation below.
              </p>

              <Link
                href="/contact"
                className="succession-cta"
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
              >
                Start the conversation
              </Link>
            </div>

            <p style={{ ...GEORGIA, fontSize: '0.9rem', fontStyle: 'italic', fontWeight: 300, lineHeight: 1.8, color: 'rgba(250,248,244,0.3)' }}>
              Post-transition access: $3,600/year. Institutional query access for the successor continues. No active sessions required.
            </p>
          </div>
        </section>

        {/* ── Section 9: Proof ── */}
        <ContrastDemo />

        {/* ── Section 10: Close ── */}
        <section style={{ background: 'var(--color-void)', padding: `clamp(80px,12vw,160px) ${PAD}`, textAlign: 'center' }}>
          <div style={{ maxWidth: '640px', margin: '0 auto' }}>
            <p style={{
              ...SERIF,
              fontSize:      'clamp(1.6rem,3.2vw,2.4rem)',
              fontWeight:    300,
              lineHeight:    1.3,
              letterSpacing: '-0.02em',
              color:         'rgba(250,248,244,0.9)',
              marginBottom:  '40px',
            }}>
              The judgment that built the company is the one thing diligence cannot copy. Capture it while the person making the calls is still making them.
            </p>
            <Link
              href="/contact"
              className="succession-cta"
              style={{
                ...MONO,
                fontSize:       'var(--text-caption)',
                display:        'inline-block',
                color:          '#0A0908',
                textDecoration: 'none',
                background:     'var(--color-gold)',
                padding:        '16px 48px',
                transition:     'background 250ms ease',
              }}
            >
              Start the conversation
            </Link>
          </div>
        </section>

      </main>
      <Footer />

      <style>{`
        .succession-cta:hover { background: var(--color-gold-light) !important; }
        @media (max-width: 680px) {
          .succession-contrast    { grid-template-columns: 1fr !important; }
          .succession-layers      { grid-template-columns: 1fr !important; }
          .succession-transitions { grid-template-columns: 1fr !important; }
          .succession-trust       { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </>
  )
}
