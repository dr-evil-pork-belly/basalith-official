import type { Metadata } from 'next'
import Link        from 'next/link'
import Nav         from '../components/Nav'
import Footer      from '../components/Footer'
import ContrastDemo from '../components/ContrastDemo'
import { CATEGORY_LINE } from '@/lib/copy'

export const metadata: Metadata = {
  title:       'For Business · Basalith',
  description: 'When a business changes hands, the judgment that built it usually does not transfer. Basalith captures how the operator reasons while they still run the company, so it transfers through an acquisition or a succession. Engagements begin with one conversation.',
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
  'Strategy and the long-range plan',
  'Playbooks and process documents',
  'The org chart and who reports to whom',
  'The financial model and unit economics',
]

const WALKS_OUT = [
  'How much risk is too much, learned over decades',
  'The pattern they saw before every big call',
  'The quiet veto on certain deals and certain hires',
  'Why the business made the choices it made',
]

const TRANSITIONS = [
  {
    label: 'Acquisition',
    href:  '/apply?type=acquisition',
    cta:   'Talk to us about an acquisition',
    body:  'You paid a multiple for how the company was run. The earnout assumes the operator’s judgment comes with the building. Most of it lives in one head and leaves on their last day. Basalith captures it before that day, so what you valued in diligence is still in the room after the operator is gone.',
  },
  {
    label: 'Succession',
    href:  '/apply?type=succession',
    cta:   'Talk to us about a succession',
    body:  'The founder is stepping back, or a partner is retiring. The successor gets the systems and the client list. Not the reasoning behind them. Basalith hands the thinking forward, so the next person can ask how the founder would have decided instead of guessing.',
  },
]

const HANDOFF = [
  {
    n:     '01',
    title: 'The Founding.',
    body:  'An extended guided session with a Senior Legacy Guide. We start with the hardest calls the operator ever made and work outward to the frameworks they use every day.',
  },
  {
    n:     '02',
    title: 'Scenario capture.',
    body:  'The operator works through 20 real business scenarios and 29 decision questions across 8 domains. Every response becomes training data.',
  },
  {
    n:     '03',
    title: 'The check.',
    body:  'Every response is scored before it can shape the model. What comes through reflects how the operator actually decided.',
  },
  {
    n:     '04',
    title: 'The handoff.',
    body:  'The successor or acquirer gets portal access and can consult the model on the calls that matter, long after the operator has stepped back. Where the archive holds no position, the model says so.',
  },
]

const TRUST = [
  {
    title: 'Not reconstructed after the fact.',
    body:  'Built while the operator is active and in the room. Not pieced together from old emails once they are gone.',
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
    body:  'Export all of it, any time, in open formats. Nothing is stranded if we ever close.',
  },
  {
    title: 'Frozen at transition.',
    body:  'The fingerprint is locked at transition. The new owner can add context. Nobody can rewrite what the operator said.',
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
        <div className="b2b-paper">
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
            The operator knows when to walk from a deal, which hire to trust over the resume, how much risk is too much. None of it is in the data room. Basalith captures how they reason while they are still running the company, so it transfers with the business. Through an acquisition or a succession.
          </p>

          <div className="succession-hero-ctas" style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginTop: '44px', alignItems: 'center' }}>
            <Link
              href="/apply?type=succession"
              className="succession-cta-paper"
              style={{
                ...MONO,
                fontSize:       'var(--text-caption)',
                display:        'inline-block',
                color:          '#0A0908',
                textDecoration: 'none',
                background:     'var(--b2b-btn)',
                padding:        '16px 32px',
                transition:     'background 250ms ease',
              }}
            >
              Tell us about the transition
            </Link>
            <Link
              href="/succession/demo"
              className="succession-cta-ghost"
              style={{
                ...MONO,
                fontSize:       'var(--text-caption)',
                display:        'inline-block',
                color:          'var(--color-text-primary)',
                textDecoration: 'none',
                border:         '1px solid var(--b2b-rule)',
                padding:        '15px 32px',
                transition:     'border-color 250ms ease',
              }}
            >
              See the demo
            </Link>
          </div>
          <p style={{ ...GEORGIA, fontSize: '0.95rem', fontStyle: 'italic', fontWeight: 300, lineHeight: 1.7, color: 'var(--color-text-muted)', marginTop: '18px', marginBottom: 0, maxWidth: '560px' }}>
            The demo runs on a fictional founder. Ask it something they never answered and watch it decline to guess.
          </p>
        </section>
        </div>

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
        <section className="b2b-paper" style={{ padding: `clamp(80px,10vw,120px) ${PAD}` }}>
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
              {TRANSITIONS.map(({ label, body, href, cta }) => (
                <div key={label} style={{
                  border:     '1px solid rgba(196,162,74,0.2)',
                  borderTop:  '2px solid rgba(196,162,74,0.6)',
                  background: 'rgba(196,162,74,0.03)',
                  padding:    'clamp(28px,4vw,44px)',
                  display:    'flex',
                  flexDirection: 'column',
                }}>
                  <p style={{ ...MONO, fontSize: '0.46rem', color: 'var(--color-gold)', marginBottom: '20px' }}>
                    {label}
                  </p>
                  <p style={{ ...GEORGIA, fontSize: '1.05rem', fontStyle: 'italic', fontWeight: 300, lineHeight: 1.85, color: 'var(--color-text-secondary)', margin: '0 0 28px' }}>
                    {body}
                  </p>
                  <Link
                    href={href}
                    className="succession-inline-link"
                    style={{ ...MONO, fontSize: '0.46rem', color: 'var(--color-gold-on-light)', textDecoration: 'none', marginTop: 'auto' }}
                  >
                    {cta} &rarr;
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Section 4: The Solution ── */}
        <section style={{ background: 'var(--color-void)', padding: `clamp(80px,10vw,120px) ${PAD}` }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <p style={{ ...MONO, fontSize: 'var(--text-caption)', color: 'var(--color-gold)', marginBottom: '40px' }}>
              What Basalith does about it
            </p>

            <p style={{ ...GEORGIA, fontSize: '1.15rem', fontWeight: 300, lineHeight: 1.9, color: 'var(--color-text-primary)', marginBottom: '24px' }}>
              Basalith builds a cognitive reference model of the operator while they are still active. Not a biography or a set of recorded interviews. A working record of how they reason, what they weigh, and how they decide, that a successor can put questions to.
            </p>
            <p style={{ ...GEORGIA, fontSize: '1.15rem', fontWeight: 300, lineHeight: 1.9, color: 'var(--color-text-primary)', marginBottom: '32px' }}>
              And when the operator never took a position on something, it says so. It will not fill the gap with an answer that sounds like them. In a handoff, a confident wrong answer is worse than no answer at all.
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
                Two permanent layers. One holds every fact and decision deposited. One learns the reasoning patterns behind them. Successors ask it the way they would have asked the founder.
              </p>
            </div>
          </div>
        </section>

        {/* ── Section 5: The Two Layers ── */}
        <section style={{ background: 'var(--color-void)', padding: `0 ${PAD} clamp(80px,10vw,120px)` }}>
          <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            <p style={{ ...MONO, fontSize: 'var(--text-caption)', color: 'var(--color-gold)', marginBottom: '48px' }}>
              Two layers. One rule.
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
                  The founder&rsquo;s reasoning, fixed from their own deposits. Locked at transition. Nobody can rewrite it.
                </p>
                <p style={{ ...GEORGIA, fontSize: '0.9rem', fontWeight: 300, lineHeight: 1.8, color: 'var(--color-text-muted)', margin: 0 }}>
                  Every decision, position, and judgment captured during the active years. It does not drift after the founder steps back.
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
                  Successors add today&rsquo;s facts. The new customer, the changed market, the hire that did not work out. The system reads the founder&rsquo;s reasoning against the present.
                </p>
                <p style={{ ...GEORGIA, fontSize: '0.9rem', fontWeight: 300, lineHeight: 1.8, color: 'var(--color-text-muted)', margin: 0 }}>
                  The judgment stays fixed. The context stays current.
                </p>
              </div>

            </div>
          </div>
        </section>

        {/* ── Section 6: How the handoff works ── */}
        <section className="b2b-paper" style={{ padding: `clamp(80px,10vw,120px) ${PAD}` }}>
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
        <section className="b2b-paper" style={{ padding: `clamp(80px,10vw,120px) ${PAD}` }}>
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
              <p style={{ ...MONO, fontSize: '0.46rem', color: 'var(--color-text-faint)', marginBottom: '8px' }}>
                per year
              </p>
              <p style={{ ...GEORGIA, fontSize: '0.95rem', fontStyle: 'italic', color: 'var(--color-gold)', marginBottom: '32px' }}>
                + $5,000 founding session (one-time)
              </p>

              <div style={{ height: '1px', background: 'rgba(196,162,74,0.15)', marginBottom: '28px' }} />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 24px', marginBottom: '36px' }}>
                {FEATURES.map(f => (
                  <p key={f} style={{ ...MONO, fontSize: '0.43rem', color: 'var(--color-text-muted)', margin: 0 }}>
                    &#10003; {f}
                  </p>
                ))}
              </div>

              <p style={{ ...GEORGIA, fontSize: '1rem', fontStyle: 'italic', fontWeight: 300, lineHeight: 1.8, color: 'var(--color-text-secondary)', marginBottom: '28px' }}>
                Every engagement begins with a founding session. Tell us about the transition and we will tell you whether Basalith fits.
              </p>

              <Link
                href="/apply?type=succession"
                className="succession-cta-paper"
                style={{
                  ...MONO,
                  fontSize:       'var(--text-caption)',
                  display:        'block',
                  textAlign:      'center',
                  color:          '#0A0908',
                  textDecoration: 'none',
                  background:     'var(--b2b-btn)',
                  padding:        '16px 32px',
                  transition:     'background 250ms ease',
                }}
              >
                Start the conversation
              </Link>
            </div>

            <p style={{ ...GEORGIA, fontSize: '0.9rem', fontStyle: 'italic', fontWeight: 300, lineHeight: 1.8, color: 'var(--color-text-muted)', marginBottom: '56px' }}>
              After transition: $3,600 a year keeps successor access open. No active sessions required.
            </p>

            {/* Acquisition. Published floor only, per the standing integrity rule. */}
            <p style={{ ...MONO, fontSize: 'var(--text-caption)', color: 'var(--color-gold)', marginBottom: '20px' }}>
              Buying the company?
            </p>
            <p style={{ ...GEORGIA, fontSize: '1.05rem', fontWeight: 300, lineHeight: 1.85, color: 'var(--color-text-primary)', marginBottom: '12px' }}>
              Acquisition engagements start at $50,000, scaled to the size and complexity of the transaction.
            </p>
            <p style={{ ...GEORGIA, fontSize: '0.95rem', fontStyle: 'italic', fontWeight: 300, lineHeight: 1.8, color: 'var(--color-text-secondary)', marginBottom: '24px' }}>
              Priced against the value at risk in the deal, as part of diligence, not as software. The buyer pays, because the buyer is the one holding the risk.
            </p>
            <Link
              href="/apply?type=acquisition"
              className="succession-inline-link"
              style={{ ...MONO, fontSize: '0.46rem', color: 'var(--color-gold-on-light)', textDecoration: 'none' }}
            >
              Talk to us about a transaction &rarr;
            </Link>
          </div>
        </section>

        {/* ── Section 9: Proof ── */}
        <div className="b2b-paper"><ContrastDemo /></div>

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
            <p style={{ ...GEORGIA, fontSize: '1.05rem', fontStyle: 'italic', fontWeight: 300, lineHeight: 1.8, color: 'rgba(250,248,244,0.6)', marginBottom: '40px', maxWidth: '520px', marginLeft: 'auto', marginRight: 'auto' }}>
              One conversation tells you whether this fits. Start there.
            </p>
            <Link
              href="/apply?type=succession"
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
        .succession-cta:hover       { background: var(--color-gold-light) !important; }
        .succession-cta-paper:hover { background: var(--b2b-btn-hover) !important; }
        .succession-cta-ghost:hover { border-color: var(--color-gold-on-light) !important; }
        .succession-inline-link:hover { text-decoration: underline !important; text-underline-offset: 4px; }
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
