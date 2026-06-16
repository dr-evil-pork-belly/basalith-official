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

const KEEP = [
  'Photographs and dates.',
  'Letters and voicemails.',
  'The stories told at the table.',
  'A record of what happened.',
]

const LOSE = [
  'How they reasoned.',
  'What they reached for when things got hard.',
  'The judgment behind the choices.',
  'The way they would think about a problem they never lived to see.',
]

const TENETS = [
  {
    headline: 'You own it.',
    body:     'Basalith is the custodian, not the owner.',
  },
  {
    headline: 'It is never sold.',
    body:     'Your archive is never shared, never sold, and never used to train models for anyone else.',
  },
  {
    headline: 'It is never lost.',
    body:     'Nothing is auto-deleted. If you ever stop, the archive rests. It is preserved, not erased.',
  },
  {
    headline: 'It is yours to end.',
    body:     'Export everything in open formats at any time, and request permanent deletion whenever you choose.',
  },
]

// B2C tiers. Every figure and billing phrase below is copied from the source of
// truth in components/PricingTiers.tsx (annualPrice, monthlyPrice, annualSub,
// eyebrow, name) so /families cannot drift from /pricing. The annual price is the
// headline; where the source carries a real monthly plan price it is shown as the
// monthly plan, not as a derived "/mo equivalent".
const TIERS = [
  {
    eyebrow:      'While You Are Building',
    name:         'Active',
    annual:       '$3,600',          // annualPrice
    annualLabel:  'Per year',
    monthlyLabel: 'or $360/mo, billed monthly, 12-month minimum', // monthlyPrice $360
    line:         'The full archive experience. Your entity learns every week.',
  },
  {
    eyebrow:      'When Life Gets in the Way',
    name:         'Resting',
    annual:       '$600',            // annualPrice
    annualLabel:  'Per year',
    monthlyLabel: 'or $60/mo, billed monthly, 12-month minimum',  // monthlyPrice $60
    line:         'Your archive preserved and waiting. No emails. No prompts.',
  },
  {
    eyebrow:      'The Archive Continues',
    name:         'Legacy',
    annual:       '$1,200',          // annualPrice, annualOnly
    annualLabel:  'Per year · billed to estate or family',        // annualSub
    monthlyLabel: 'Annual billing only',
    line:         'The entity continues. Archive and entity continue for your heirs.',
  },
]

export default function FamiliesPage() {
  return (
    <>
      <Nav />
      <main style={{ background: 'var(--color-bg)' }}>

        {/* ── Hero ── */}
        <section style={{
          padding:  `clamp(140px,16vw,200px) ${PAD} clamp(80px,10vw,120px)`,
          maxWidth: '960px',
        }}>
          <p style={{ ...MONO, fontSize: 'var(--text-caption)', color: 'var(--color-gold)', marginBottom: '32px' }}>
            Basalith for Families
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
            The way you think is the part worth keeping.
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
            Basalith builds a cognitive reference model of how you reason, decide, and see the world, from your own words, while you are still here to give it.
          </p>
        </section>

        {/* ── Section 1: The Problem ── */}
        <section style={{ background: 'var(--color-void)', padding: `clamp(80px,10vw,120px) ${PAD}` }}>
          <div style={{ maxWidth: '760px', margin: '0 auto' }}>
            <p style={{ ...MONO, fontSize: 'var(--text-caption)', color: 'var(--color-gold)', marginBottom: '40px' }}>
              The Problem
            </p>
            <h2 style={{
              ...SERIF,
              fontSize:      'clamp(1.9rem,3.8vw,2.7rem)',
              fontWeight:    300,
              lineHeight:    1.12,
              letterSpacing: '-0.02em',
              color:         'var(--color-text-primary)',
              marginBottom:  '32px',
            }}>
              When someone is gone, the way they thought goes with them.
            </h2>
            <p style={{ ...GEORGIA, fontSize: '1.15rem', fontStyle: 'italic', fontWeight: 300, lineHeight: 1.9, color: 'var(--color-text-secondary)', margin: 0 }}>
              You keep the photographs. The recordings. The documents. What you cannot keep is how they would have answered the question you never thought to ask. How they weighed a hard decision. What they believed when no one was watching. That part fades first, and no one writes it down.
            </p>
          </div>
        </section>

        {/* ── Section 2: The Gap ── */}
        <section style={{ padding: `clamp(80px,10vw,120px) ${PAD}` }}>
          <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            <p style={{ ...MONO, fontSize: 'var(--text-caption)', color: 'var(--color-gold)', marginBottom: '20px' }}>
              The Gap
            </p>
            <h2 style={{
              ...SERIF,
              fontSize:      'clamp(1.9rem,3.8vw,2.7rem)',
              fontWeight:    300,
              lineHeight:    1.12,
              letterSpacing: '-0.02em',
              color:         'var(--color-text-primary)',
              marginBottom:  '48px',
            }}>
              What a family keeps is not what a family loses.
            </h2>

            <div className="families-contrast" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px' }}>

              {/* Left: what you keep */}
              <div style={{
                background: 'rgba(250,248,244,0.02)',
                border:     '1px solid rgba(255,255,255,0.06)',
                padding:    'clamp(28px,4vw,48px)',
              }}>
                <p style={{ ...MONO, fontSize: '0.46rem', color: 'rgba(250,248,244,0.35)', marginBottom: '28px' }}>
                  What you keep
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                  {KEEP.map(item => (
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

              {/* Right: what you lose */}
              <div style={{
                background: 'rgba(196,162,74,0.04)',
                border:     '1px solid rgba(196,162,74,0.2)',
                borderTop:  '2px solid rgba(196,162,74,0.7)',
                padding:    'clamp(28px,4vw,48px)',
              }}>
                <p style={{ ...MONO, fontSize: '0.46rem', color: 'var(--color-gold)', marginBottom: '28px' }}>
                  What you lose
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                  {LOSE.map(item => (
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

            <p style={{ ...GEORGIA, fontSize: '1.2rem', fontStyle: 'italic', fontWeight: 300, lineHeight: 1.7, color: 'var(--color-gold)', textAlign: 'center', marginTop: '48px', marginBottom: 0 }}>
              The first is a record. The second is a person.
            </p>
          </div>
        </section>

        {/* ── Section 3: How It Works ── */}
        <section style={{ background: 'var(--color-void)', padding: `clamp(80px,10vw,120px) ${PAD}` }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <p style={{ ...MONO, fontSize: 'var(--text-caption)', color: 'var(--color-gold)', marginBottom: '40px' }}>
              How It Works
            </p>
            <h2 style={{
              ...SERIF,
              fontSize:      'clamp(1.9rem,3.8vw,2.7rem)',
              fontWeight:    300,
              lineHeight:    1.12,
              letterSpacing: '-0.02em',
              color:         'var(--color-text-primary)',
              marginBottom:  '32px',
            }}>
              Built while they are here. Not reconstructed after.
            </h2>
            <p style={{ ...GEORGIA, fontSize: '1.15rem', fontStyle: 'italic', fontWeight: 300, lineHeight: 1.9, color: 'var(--color-text-secondary)', marginBottom: '32px' }}>
              Basalith is not a wrapper on a general AI. Every entity is trained on one person&rsquo;s own deposits: the answers they give, the photographs they label, the decisions they talk through. From that, it captures the characteristic patterns in how they reason and express themselves. So the people who come after can ask a question and hear an answer grounded in how that person actually thought, instead of guessing.
            </p>
            <Link
              href="/method"
              style={{ ...MONO, fontSize: '0.5rem', color: 'rgba(196,162,74,0.8)', textDecoration: 'none' }}
            >
              See how the method works &rarr;
            </Link>
          </div>
        </section>

        {/* ── Section 4: What You Are Guaranteed ── */}
        <section style={{ padding: `clamp(80px,10vw,120px) ${PAD}` }}>
          <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            <p style={{ ...MONO, fontSize: 'var(--text-caption)', color: 'var(--color-gold)', marginBottom: '20px' }}>
              What You Are Guaranteed
            </p>
            <h2 style={{
              ...SERIF,
              fontSize:      'clamp(1.9rem,3.8vw,2.7rem)',
              fontWeight:    300,
              lineHeight:    1.12,
              letterSpacing: '-0.02em',
              color:         'var(--color-text-primary)',
              marginBottom:  '48px',
            }}>
              The archive is yours. Completely.
            </h2>

            <div className="families-tenets" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              {TENETS.map(t => (
                <div key={t.headline} style={{
                  border:     '1px solid rgba(196,162,74,0.2)',
                  borderTop:  '2px solid rgba(196,162,74,0.6)',
                  padding:    'clamp(28px,4vw,44px)',
                  background: 'rgba(196,162,74,0.03)',
                }}>
                  <h3 style={{
                    ...SERIF,
                    fontSize:     'clamp(1.3rem,2.5vw,1.7rem)',
                    fontWeight:   300,
                    lineHeight:   1.2,
                    color:        'var(--color-text-primary)',
                    marginBottom: '16px',
                  }}>
                    {t.headline}
                  </h3>
                  <p style={{ ...GEORGIA, fontSize: '1rem', fontStyle: 'italic', fontWeight: 300, lineHeight: 1.8, color: 'var(--color-text-secondary)', margin: 0 }}>
                    {t.body}
                  </p>
                </div>
              ))}
            </div>

            <p style={{ marginTop: '40px', marginBottom: 0 }}>
              <Link
                href="/data-ownership"
                style={{ ...MONO, fontSize: '0.5rem', color: 'rgba(196,162,74,0.8)', textDecoration: 'none' }}
              >
                Read the full ownership terms &rarr;
              </Link>
            </p>
          </div>
        </section>

        {/* ── Section 5: Begin ── */}
        <section style={{ background: 'var(--color-void)', padding: `clamp(80px,10vw,120px) ${PAD}` }}>
          <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            <p style={{ ...MONO, fontSize: 'var(--text-caption)', color: 'var(--color-gold)', marginBottom: '20px' }}>
              Begin
            </p>
            <h2 style={{
              ...SERIF,
              fontSize:      'clamp(1.9rem,3.8vw,2.7rem)',
              fontWeight:    300,
              lineHeight:    1.12,
              letterSpacing: '-0.02em',
              color:         'var(--color-text-primary)',
              marginBottom:  '28px',
            }}>
              Begin while you still can.
            </h2>
            <p style={{ ...GEORGIA, fontSize: '1.15rem', fontStyle: 'italic', fontWeight: 300, lineHeight: 1.9, color: 'var(--color-text-secondary)', maxWidth: '640px', marginBottom: '24px' }}>
              Every archive starts with a founding session, a guided conversation that captures how you think before anything else.
            </p>
            <p style={{ ...MONO, fontSize: '0.5rem', color: 'var(--color-gold)', marginBottom: '40px' }}>
              All plans begin with a one-time Founding Session investment of $2,500.
            </p>

            <div className="families-tiers" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', marginBottom: '40px' }}>
              {TIERS.map(tier => (
                <div key={tier.name} style={{
                  border:     '1px solid rgba(196,162,74,0.2)',
                  borderTop:  '2px solid rgba(196,162,74,0.6)',
                  padding:    'clamp(28px,4vw,40px)',
                  background: 'rgba(196,162,74,0.03)',
                  display:    'flex',
                  flexDirection: 'column',
                }}>
                  <p style={{ ...MONO, fontSize: '0.42rem', color: 'rgba(250,248,244,0.4)', marginBottom: '16px' }}>
                    {tier.eyebrow}
                  </p>
                  <h3 style={{ ...SERIF, fontSize: '1.5rem', fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: '16px' }}>
                    {tier.name}
                  </h3>
                  <p style={{ ...SERIF, fontSize: 'clamp(2.2rem,4vw,2.8rem)', fontWeight: 300, color: 'var(--color-gold)', lineHeight: 1, letterSpacing: '-0.02em', marginBottom: '6px' }}>
                    {tier.annual}
                  </p>
                  <p style={{ ...MONO, fontSize: '0.44rem', color: 'rgba(250,248,244,0.4)', marginBottom: '6px' }}>
                    {tier.annualLabel}
                  </p>
                  <p style={{ ...MONO, fontSize: '0.4rem', color: 'rgba(250,248,244,0.28)', marginBottom: '20px' }}>
                    {tier.monthlyLabel}
                  </p>
                  <p style={{ ...GEORGIA, fontSize: '0.95rem', fontStyle: 'italic', fontWeight: 300, lineHeight: 1.7, color: 'var(--color-text-secondary)', margin: 0 }}>
                    {tier.line}
                  </p>
                </div>
              ))}
            </div>

            <p style={{ marginBottom: '40px' }}>
              <Link
                href="/pricing"
                style={{ ...MONO, fontSize: '0.5rem', color: 'rgba(196,162,74,0.8)', textDecoration: 'none' }}
              >
                See full pricing &rarr;
              </Link>
            </p>

            <Link
              href="/apply?type=legacy"
              style={{
                ...MONO,
                fontSize:       'var(--text-caption)',
                display:        'block',
                maxWidth:       '420px',
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
              Begin your archive &rarr;
            </Link>
          </div>
        </section>

      </main>
      <Footer />

      <style>{`
        @media (max-width: 680px) {
          .families-contrast { grid-template-columns: 1fr !important; }
          .families-tenets   { grid-template-columns: 1fr !important; }
          .families-tiers    { grid-template-columns: 1fr !important; }
        }
        @media (min-width: 681px) and (max-width: 900px) {
          .families-tiers    { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </>
  )
}
