import type { Metadata } from 'next'
import Nav        from '../components/Nav'
import Footer     from '../components/Footer'
import PricingFAQ from '../components/PricingFAQ'

export const metadata: Metadata = {
  title: 'Pricing · Basalith',
  description: 'The Basalith Estate begins at $2,500. The infrastructure of human continuation priced for every family.',
}

const MONO: React.CSSProperties = {
  fontFamily:    'var(--font-space-mono, "Space Mono", "Courier New", monospace)',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.28em',
}

const SERIF: React.CSSProperties = {
  fontFamily: 'var(--font-cormorant, "Cormorant Garamond", Georgia, serif)',
}

const TIERS = [
  {
    name:     'The Archive',
    tagline:  'The foundation. Your entity begins learning.',
    price:    '$1,200',
    period:   'per year',
    monthly:  '$100 / month equivalent',
    featured: false,
    features: [
      'Secure archive infrastructure',
      'Up to 5 family contributors',
      'Unlimited photograph deposits',
      'Voice, photo and journal labeling',
      'Nightly photograph email to contributors',
      'Basic Digital Clone access',
      'Annual AI model updates',
      'Data portability guarantee',
      'Data Custodianship Reserve coverage',
    ],
  },
  {
    name:     'The Estate',
    tagline:  'Your entity. Your family. Your story. Everything working together.',
    price:    '$3,600',
    period:   'per year',
    monthly:  '$300 / month equivalent',
    featured: true,
    features: [
      'Everything in The Archive',
      'Up to 15 family contributors',
      'Full Digital Clone with conversational access',
      'Will and Trust integration, bequest language prepared',
      'Dedicated Custodian designation',
      'Annual estate compatibility review',
      'Priority curation support',
      'basalith.ai entity priority access',
      'Quarterly Provenance report',
      'Family access tiers, control who sees what',
      '48-hour response on all support requests',
    ],
  },
  {
    name:     'The Dynasty',
    tagline:  'For families building across generations.',
    price:    '$9,600',
    period:   'per year',
    monthly:  '$800 / month equivalent',
    featured: false,
    features: [
      'Everything in The Estate',
      'Unlimited contributors across generations',
      'Full Family Trust legal instrument',
      'Multi-generational access tiers',
      'Dedicated Archive Manager. Named professional, not a ticket queue.',
      'White-glove onboarding. We come to you.',
      'Annual in-person estate review',
      'First access to new AI model generations',
      'Custom Digital Clone interaction boundaries',
      'Sovereign Legacy Guide permanently assigned',
      '200-year perpetual storage guarantee',
    ],
  },
]

const FOUNDING_DELIVERABLES = [
  { n: '01', title: 'Archive Architecture Build',   desc: 'Your permanent digital estate structure, configured for generational transfer and legal standing.' },
  { n: '02', title: 'Legal Instrument Review',       desc: 'Compatibility assessment with your existing will, trust, and estate documents. Attorney-ready output.' },
  { n: '03', title: 'Family Network Initialization', desc: 'Contributor onboarding for up to 15 family members. Roles assigned. Access levels configured.' },
  { n: '04', title: 'Founding Essence Session',      desc: 'Your first live family labeling session, guided by a Senior Legacy Guide. 90 minutes. This is where it becomes real.' },
  { n: '05', title: 'AI-Processed Data Migration',   desc: 'Every photograph filtered, deduplicated, dated, and sequenced by our AI pipeline before it reaches the labeling interface.' },
  { n: '06', title: 'Custodian Designation',         desc: "Your archive's legal custodian assigned and documented with formal estate standing." },
]

function Check() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0, marginTop: '2px' }} aria-hidden="true">
      <circle cx="7" cy="7" r="6.5" stroke="rgba(184,150,62,0.3)" />
      <path d="M4 7l2 2 4-4" stroke="var(--color-gold)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

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
              fontSize:     'var(--text-caption)',
              color:        'var(--color-gold)',
              display:      'flex',
              alignItems:   'center',
              justifyContent: 'center',
              gap:          '12px',
              marginBottom: '24px',
            }}
          >
            <span style={{ width: '24px', height: '1px', background: 'var(--color-gold)', display: 'block', flexShrink: 0 }} aria-hidden="true" />
            Stewardship Pricing
            <span style={{ width: '24px', height: '1px', background: 'var(--color-gold)', display: 'block', flexShrink: 0 }} aria-hidden="true" />
          </p>
          <h1
            style={{
              ...SERIF,
              fontSize:     'var(--text-hero)',
              fontWeight:   300,
              lineHeight:   1.1,
              color:        'var(--color-text-primary)',
              letterSpacing: '-0.025em',
              marginBottom: '32px',
            }}
          >
            What is it worth
            <br />
            to never have to wonder?
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
            <p style={{ marginBottom: '8px' }}>We built this for families</p>
            <p style={{ marginBottom: '24px' }}>not billionaires.</p>
            <p style={{ marginBottom: '8px' }}>The Estate is $3,600 a year.</p>
            <p style={{ margin: 0 }}>Less than most people spend on things that matter far less.</p>
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
              maxWidth:     '860px',
              margin:       '0 auto',
              borderTop:    '2px solid rgba(196,162,74,0.6)',
              border:       '1px solid rgba(196,162,74,0.18)',
              borderTopColor: 'rgba(196,162,74,0.6)',
              padding:      'clamp(40px,5vw,64px)',
              background:   '#0D0C0A',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
              <p style={{ ...MONO, fontSize: '0.52rem', color: 'var(--color-gold)' }}>One-Time Engagement</p>
              <svg width="32" height="32" viewBox="0 0 34 34" fill="none" aria-hidden="true" style={{ opacity: 0.5 }}>
                <polygon points="17,1 33,17 17,33 1,17" fill="none" stroke="#C4A24A" strokeWidth="1.4"/>
                <polygon points="17,7 27,17 17,27 7,17" fill="none" stroke="#C4A24A" strokeWidth="1.1"/>
                <polygon points="17,13 21,17 17,21 13,17" fill="#C4A24A"/>
              </svg>
            </div>

            <h2 style={{ ...SERIF, fontSize: '2.25rem', fontWeight: 300, color: 'rgba(250,248,244,0.9)', marginBottom: '12px' }}>
              The Founding
            </h2>
            <p style={{ ...SERIF, fontSize: '1.05rem', fontStyle: 'italic', fontWeight: 300, color: 'rgba(250,248,244,0.45)', lineHeight: 1.8, marginBottom: '40px', maxWidth: '600px' }}>
              Every Basalith archive begins with The Founding, a comprehensive legal and technical engagement
              that establishes your archive&rsquo;s permanent infrastructure. Executed once. Built to last centuries.
            </p>

            <div style={{ height: '1px', background: 'rgba(196,162,74,0.15)', marginBottom: '40px' }} />

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '48px' }}>
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

        {/* Annual Tiers */}
        <section
          style={{
            background: 'var(--color-surface-alt)',
            padding:    'clamp(64px,8vw,96px) clamp(24px,6vw,80px)',
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: '56px' }}>
            <p style={{ ...MONO, fontSize: 'var(--text-caption)', color: 'var(--color-gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '16px' }}>
              <span style={{ width: '24px', height: '1px', background: 'var(--color-gold)', display: 'block', flexShrink: 0 }} aria-hidden="true" />
              Annual Stewardship
              <span style={{ width: '24px', height: '1px', background: 'var(--color-gold)', display: 'block', flexShrink: 0 }} aria-hidden="true" />
            </p>
            <h2 style={{ ...SERIF, fontSize: 'var(--text-h1)', fontWeight: 300, color: 'var(--color-text-primary)', letterSpacing: '-0.02em' }}>
              Choose Your Level of Stewardship.
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', maxWidth: '1100px', margin: '0 auto' }}>
            {TIERS.map(({ name, tagline, price, period, monthly, featured, features }) => (
              <div
                key={name}
                style={{
                  background:  featured ? 'var(--color-void)' : 'var(--color-surface)',
                  border:      featured ? '1px solid rgba(184,150,62,0.35)' : '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  padding:     '36px',
                  display:     'flex',
                  flexDirection: 'column',
                  boxShadow:   featured ? 'var(--shadow-gold)' : 'var(--shadow-sm)',
                  position:    'relative',
                }}
              >
                {featured && (
                  <div style={{ position: 'absolute', top: 0, left: '15%', right: '15%', height: '1px', background: 'linear-gradient(90deg,transparent,rgba(184,150,62,0.5),transparent)' }} aria-hidden="true" />
                )}
                {featured && (
                  <p style={{ ...MONO, fontSize: '0.44rem', color: 'var(--color-gold)', marginBottom: '20px' }}>Most Popular</p>
                )}

                <h3
                  style={{
                    ...SERIF,
                    fontSize:     '1.5rem',
                    fontWeight:   500,
                    color:        featured ? 'rgba(250,248,244,0.9)' : 'var(--color-text-primary)',
                    marginBottom: '6px',
                  }}
                >
                  {name}
                </h3>
                <p
                  style={{
                    ...SERIF,
                    fontSize:     '0.9rem',
                    fontStyle:    'italic',
                    fontWeight:   300,
                    color:        featured ? 'rgba(250,248,244,0.4)' : 'var(--color-text-muted)',
                    marginBottom: '28px',
                    lineHeight:   1.6,
                  }}
                >
                  {tagline}
                </p>

                <div style={{ marginBottom: '6px' }}>
                  <span
                    style={{
                      ...SERIF,
                      fontSize:      'clamp(2rem,3.5vw,2.75rem)',
                      fontWeight:    300,
                      color:         featured ? 'rgba(250,248,244,0.9)' : 'var(--color-text-primary)',
                      letterSpacing: '-0.025em',
                    }}
                  >
                    {price}
                  </span>
                  <span style={{ ...MONO, fontSize: '0.48rem', color: featured ? 'rgba(250,248,244,0.3)' : 'var(--color-text-muted)', marginLeft: '8px' }}>
                    {period}
                  </span>
                </div>
                <p style={{ ...MONO, fontSize: '0.44rem', color: featured ? 'rgba(250,248,244,0.25)' : 'var(--color-text-faint)', marginBottom: '24px' }}>
                  {monthly}
                </p>

                <div style={{ height: '1px', background: featured ? 'rgba(250,248,244,0.06)' : 'var(--color-border)', marginBottom: '24px' }} />

                <ul style={{ listStyle: 'none', margin: '0 0 32px', padding: 0, display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
                  {features.map(f => (
                    <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                      <Check />
                      <span
                        style={{
                          ...SERIF,
                          fontSize:   '0.9rem',
                          fontWeight: 300,
                          lineHeight: 1.5,
                          color:      featured ? 'rgba(250,248,244,0.55)' : 'var(--color-text-secondary)',
                        }}
                      >
                        {f}
                      </span>
                    </li>
                  ))}
                </ul>

                <a
                  href="/apply"
                  style={{
                    ...MONO,
                    display:        'block',
                    textAlign:      'center',
                    textDecoration: 'none',
                    padding:        '13px 24px',
                    borderRadius:   'var(--radius-sm)',
                    fontSize:       'var(--text-caption)',
                    background:     featured ? 'var(--color-gold)' : 'transparent',
                    color:          featured ? '#0A0908' : 'var(--color-text-secondary)',
                    border:         featured ? 'none' : '1px solid var(--color-border-medium)',
                    transition:     'all 250ms ease',
                  }}
                >
                  Request Your Founding
                </a>
              </div>
            ))}
          </div>

          <p style={{ ...SERIF, fontSize: '0.9rem', fontStyle: 'italic', fontWeight: 300, color: 'var(--color-text-muted)', textAlign: 'center', marginTop: '32px' }}>
            All plans require The Founding, a one-time setup investment of $2,500.
          </p>
        </section>

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
          div[style*="grid-template-columns: repeat(3, 1fr)"] {
            grid-template-columns: 1fr !important;
          }
          div[style*="grid-template-columns: 1.2fr"] {
            grid-template-columns: 1fr !important;
          }
        }
        @media (max-width: 768px) {
          /* Pricing hero */
          section[aria-label="Pricing hero"] {
            padding-top: max(140px, calc(80px + env(safe-area-inset-top, 0px))) !important;
          }
          /* Founding block two-col */
          div[style*="grid-template-columns: 1.15fr"] {
            grid-template-columns: 1fr !important;
            gap: 32px !important;
          }
          /* CTA buttons full-width */
          section[aria-label="Pricing CTA"] div[style*="justify-content: 'center'"] {
            flex-direction: column !important;
          }
          section[aria-label="Pricing CTA"] a {
            width: 100% !important;
            text-align: center !important;
            box-sizing: border-box !important;
          }
        }
      `}</style>
    </>
  )
}
