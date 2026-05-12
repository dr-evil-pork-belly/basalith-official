import type { Metadata } from 'next'
import Nav         from '../components/Nav'
import Footer      from '../components/Footer'
import PricingFAQ  from '../components/PricingFAQ'
import PricingTiers from '../components/PricingTiers'

export const metadata: Metadata = {
  title: 'Pricing · Basalith',
  description: 'Three moments. One archive. Active at $3,600/year. Resting at $600/year. Legacy at $2,500 one-time.',
}

const MONO: React.CSSProperties = {
  fontFamily:    'var(--font-space-mono, "Space Mono", "Courier New", monospace)',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.28em',
}

const SERIF: React.CSSProperties = {
  fontFamily: 'var(--font-cormorant, "Cormorant Garamond", Georgia, serif)',
}

const FOUNDING_DELIVERABLES = [
  { n: '01', title: 'Archive Architecture Build',   desc: 'Your permanent digital estate structure, configured for generational transfer and legal standing.' },
  { n: '02', title: 'Legal Instrument Review',       desc: 'Compatibility assessment with your existing will, trust, and estate documents. Attorney-ready output.' },
  { n: '03', title: 'Family Network Initialization', desc: 'Contributor onboarding for up to 15 family members. Roles assigned. Access levels configured.' },
  { n: '04', title: 'Founding Essence Session',      desc: 'Your first live family labeling session, guided by a Senior Legacy Guide. 90 minutes. This is where it becomes real.' },
  { n: '05', title: 'AI-Processed Data Migration',   desc: 'Every photograph filtered, deduplicated, dated, and sequenced by our AI pipeline before it reaches the labeling interface.' },
  { n: '06', title: 'Custodian Designation',         desc: "Your archive's legal custodian assigned and documented with formal estate standing." },
]

export default function PricingPage() {
  return (
    <>
      <Nav />
      <main style={{ background: 'var(--color-bg)' }}>

        {/* Hero */}
        <section
          style={{
            padding:    'clamp(140px,18vw,200px) clamp(24px,6vw,80px) clamp(80px,10vw,120px)',
            textAlign:  'center',
            background: 'var(--color-bg)',
          }}
        >
          <p
            style={{
              ...MONO,
              fontSize:       'var(--text-caption)',
              color:          'var(--color-gold)',
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              gap:            '12px',
              marginBottom:   '24px',
            }}
          >
            <span style={{ width: '24px', height: '1px', background: 'var(--color-gold)', display: 'block', flexShrink: 0 }} aria-hidden="true" />
            Stewardship Pricing
            <span style={{ width: '24px', height: '1px', background: 'var(--color-gold)', display: 'block', flexShrink: 0 }} aria-hidden="true" />
          </p>
          <h1
            style={{
              ...SERIF,
              fontSize:      'var(--text-hero)',
              fontWeight:    300,
              lineHeight:    1.1,
              color:         'var(--color-text-primary)',
              letterSpacing: '-0.025em',
              marginBottom:  '32px',
            }}
          >
            Three moments.
            <br />
            One archive.
          </h1>
          <div
            style={{
              ...SERIF,
              fontSize:   '1.15rem',
              fontStyle:  'italic',
              fontWeight: 300,
              lineHeight: 1.85,
              color:      'var(--color-text-secondary)',
              maxWidth:   '480px',
              margin:     '0 auto',
            }}
          >
            <p style={{ marginBottom: '8px' }}>Most families move through all three.</p>
            <p style={{ marginBottom: '24px' }}>Begin active. Rest when life demands it.</p>
            <p style={{ margin: 0 }}>Leave something permanent.</p>
          </div>
        </section>

        {/* The Founding */}
        <section
          style={{
            background: 'var(--color-void)',
            padding:    'clamp(64px,8vw,96px) clamp(24px,6vw,80px)',
          }}
        >
          <div
            style={{
              maxWidth:       '860px',
              margin:         '0 auto',
              border:         '1px solid rgba(196,162,74,0.18)',
              borderTopColor: 'rgba(196,162,74,0.6)',
              borderTopWidth: '2px',
              padding:        'clamp(40px,5vw,64px)',
              background:     '#0D0C0A',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
              <p style={{ ...MONO, fontSize: '0.52rem', color: 'var(--color-gold)' }}>The Founding Session</p>
              <svg width="32" height="32" viewBox="0 0 34 34" fill="none" aria-hidden="true" style={{ opacity: 0.5 }}>
                <polygon points="17,1 33,17 17,33 1,17" fill="none" stroke="#C4A24A" strokeWidth="1.4"/>
                <polygon points="17,7 27,17 17,27 7,17" fill="none" stroke="#C4A24A" strokeWidth="1.1"/>
                <polygon points="17,13 21,17 17,21 13,17" fill="#C4A24A"/>
              </svg>
            </div>

            <h2 style={{ ...SERIF, fontSize: '2.25rem', fontWeight: 300, color: 'rgba(250,248,244,0.9)', marginBottom: '12px' }}>
              The Founding
            </h2>
            <div style={{ ...SERIF, fontSize: '1.05rem', fontStyle: 'italic', fontWeight: 300, color: 'rgba(250,248,244,0.45)', lineHeight: 1.8, marginBottom: '40px', maxWidth: '600px' }}>
              <p style={{ marginBottom: '20px' }}>Every archive begins with a Founding Session.</p>
              <p style={{ marginBottom: '20px' }}>
                Your Legacy Guide conducts a 90-minute session that establishes
                the foundation of your entity.
                Your voice. Your values.
                The specific way you see the world.
              </p>
              <p style={{ marginBottom: '20px' }}>
                The one-time founding investment of $2,500 covers this session,
                your archive initialization,
                and your first-year entity calibration.
              </p>
              <p style={{ margin: 0 }}>
                This is where your archive begins.
                Everything that follows builds on it.
              </p>
            </div>

            <div style={{ height: '1px', background: 'rgba(196,162,74,0.15)', marginBottom: '40px' }} />

            <div className="founding-grid" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '48px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
                {FOUNDING_DELIVERABLES.map(({ n, title, desc }) => (
                  <div key={n} style={{ display: 'flex', gap: '20px' }}>
                    <span style={{ ...MONO, fontSize: '0.48rem', color: 'var(--color-gold)', flexShrink: 0, paddingTop: '2px', width: '24px' }}>{n}</span>
                    <div>
                      <p style={{ ...MONO, fontSize: '0.52rem', color: 'rgba(250,248,244,0.75)', marginBottom: '4px' }}>{title}</p>
                      <p style={{ ...SERIF, fontSize: '0.9rem', fontStyle: 'italic', fontWeight: 300, color: 'rgba(250,248,244,0.35)', lineHeight: 1.7 }}>{desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                <div style={{ borderTop: '1px solid rgba(196,162,74,0.15)', paddingTop: '32px' }}>
                  <p style={{ ...SERIF, fontSize: '3.5rem', fontWeight: 300, color: 'rgba(250,248,244,0.9)', lineHeight: 1, letterSpacing: '-0.02em', marginBottom: '8px' }}>$2,500</p>
                  <p style={{ ...MONO, fontSize: '0.48rem', color: 'var(--color-gold)', marginBottom: '16px' }}>One-Time Engagement Fee</p>
                  <p style={{ ...SERIF, fontSize: '0.88rem', fontStyle: 'italic', fontWeight: 300, color: 'rgba(250,248,244,0.3)', lineHeight: 1.7 }}>
                    Required for all new archives. Annual stewardship selected separately.
                    Executed by a Senior Legacy Guide assigned to your family.
                  </p>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '24px', marginTop: '40px', flexWrap: 'wrap' }}>
              <a href="/founding-session" className="pricing-ghost-link" style={{ ...SERIF, fontSize: '0.9rem', fontStyle: 'italic', color: 'rgba(196,162,74,0.6)', textDecoration: 'none', transition: 'color 200ms ease' }}>
                What happens in your Founding session →
              </a>
            </div>
          </div>
        </section>

        {/* Tiers + toggle + founding note + tax note */}
        <PricingTiers />

        {/* FAQ */}
        <PricingFAQ />

        {/* CTA */}
        <section style={{ background: 'var(--color-void)', padding: 'clamp(80px,12vw,120px) clamp(24px,6vw,80px)', textAlign: 'center' }}>
          <h2 style={{ ...SERIF, fontSize: 'var(--text-h1)', fontWeight: 300, color: 'rgba(250,248,244,0.9)', letterSpacing: '-0.02em', marginBottom: '20px' }}>
            Basalith Is Not{' '}
            <em style={{ fontStyle: 'italic', color: 'var(--color-gold)' }}>For Everyone.</em>
          </h2>
          <p style={{ ...SERIF, fontSize: '1.1rem', fontStyle: 'italic', fontWeight: 300, lineHeight: 1.8, color: 'rgba(250,248,244,0.4)', maxWidth: '480px', margin: '0 auto 40px' }}>
            It is for the rare few who understand that memory is an asset,
            and that leaving it unarchived is a choice with consequences
            their family will live with long after they are gone.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <a href="/apply" style={{ ...MONO, fontSize: 'var(--text-caption)', display: 'inline-block', textDecoration: 'none', background: 'var(--color-gold)', color: '#0A0908', padding: '14px 32px', borderRadius: 'var(--radius-sm)' }}>
              Begin Your Application
            </a>
          </div>
          <p style={{ ...MONO, fontSize: '0.46rem', color: 'rgba(250,248,244,0.2)', marginTop: '24px' }}>
            Archives accepted on a rolling basis · legacy@basalith.xyz
          </p>
        </section>

      </main>
      <Footer />

      <style>{`
        .pricing-ghost-link:hover { color: var(--color-gold) !important; }
        @media (max-width: 900px) {
          .founding-grid {
            grid-template-columns: 1fr !important;
            gap: 32px !important;
          }
        }
      `}</style>
    </>
  )
}
