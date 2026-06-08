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

const TRUST_BADGES = [
  { icon: '🔒', label: 'Immutability Vault after passing' },
  { icon: '📦', label: 'Complete data export anytime' },
  { icon: '🚫', label: 'Never used for other entities' },
  { icon: '✉', label: '90-day notice if we close' },
]

const SECURITY_BADGES = [
  { icon: '🔒', label: 'AES-256 encrypted at rest' },
  { icon: '🔐', label: 'TLS 1.3 in transit' },
  { icon: '📦', label: 'Full data export anytime' },
  { icon: '⚖️', label: 'Delaware C-Corp' },
  { icon: '🏛️', label: 'Academic research foundation' },
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
            Pricing
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

        {/* Trust badges */}
        <div style={{
          display:        'flex',
          justifyContent: 'center',
          flexWrap:       'wrap',
          gap:            '12px 32px',
          padding:        '0 clamp(24px,6vw,80px) clamp(48px,6vw,72px)',
        }}>
          {TRUST_BADGES.map(b => (
            <span key={b.label} style={{
              fontFamily:    'var(--font-space-mono, "Space Mono", "Courier New", monospace)',
              fontSize:      '0.48rem',
              letterSpacing: '0.15em',
              textTransform: 'uppercase' as const,
              color:         'var(--color-text-faint)',
              display:       'flex',
              alignItems:    'center',
              gap:           '6px',
            }}>
              <span>{b.icon}</span>{b.label}
            </span>
          ))}
        </div>

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
              <p style={{ marginBottom: '20px' }}>
                This is where your archive begins.
                Everything that follows builds on it.
              </p>
              <p style={{ ...SERIF, fontSize: '0.88rem', fontStyle: 'italic', fontWeight: 300, color: 'rgba(250,248,244,0.28)', lineHeight: 1.85, margin: 0 }}>
                Your archive runs on two permanent layers: one that holds every fact and memory you have deposited, and one that learns how you express, reason, and decide. Neither replaces the other.
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
                    Required for all new archives. Annual plan selected separately.
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

        {/* Security & legitimacy trust row */}
        <div style={{
          display:        'flex',
          justifyContent: 'center',
          flexWrap:       'wrap',
          gap:            '12px 32px',
          padding:        'clamp(40px,6vw,64px) clamp(24px,6vw,80px)',
          background:     'var(--color-bg)',
        }}>
          {SECURITY_BADGES.map(b => (
            <span key={b.label} style={{
              fontFamily:    'var(--font-space-mono, "Space Mono", "Courier New", monospace)',
              fontSize:      '0.48rem',
              letterSpacing: '0.15em',
              textTransform: 'uppercase' as const,
              color:         'var(--color-text-faint)',
              display:       'flex',
              alignItems:    'center',
              gap:           '6px',
            }}>
              <span>{b.icon}</span>{b.label}
            </span>
          ))}
        </div>

        {/* Immutability Vault trust signal */}
        <section style={{ padding: '0 clamp(24px,6vw,80px) clamp(48px,6vw,64px)', background: 'var(--color-surface-alt)' }}>
          <div style={{
            maxWidth:       '680px',
            margin:         '0 auto',
            border:         '1px solid rgba(196,162,74,0.22)',
            borderLeft:     '3px solid rgba(196,162,74,0.5)',
            padding:        'clamp(24px,3vw,36px) clamp(24px,3vw,40px)',
            background:     'rgba(196,162,74,0.03)',
          }}>
            <p style={{ ...MONO, fontSize: '0.5rem', color: 'var(--color-gold)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🔒</span> The Immutability Vault
            </p>
            <p style={{ ...SERIF, fontSize: '1rem', fontWeight: 300, lineHeight: 1.8, color: 'var(--color-text-secondary)', margin: '0 0 8px' }}>
              Your cognitive fingerprint is permanently frozen after you pass.
            </p>
            <p style={{ ...SERIF, fontSize: '1rem', fontWeight: 300, lineHeight: 1.8, color: 'var(--color-text-secondary)', margin: '0 0 8px' }}>
              Heirs can add context. Nobody can change what you said.
            </p>
            <a href="/integrity" style={{ ...MONO, fontSize: '0.44rem', color: 'rgba(196,162,74,0.6)', textDecoration: 'none', display: 'inline-block', marginTop: '8px' }}>
              How this works →
            </a>
          </div>
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
            It is for the rare few who understand that what they know
            and how they think is a legacy, and that leaving it uncaptured
            is a choice their family will feel for generations.
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

        {/* B2B — Succession */}
        <section style={{ background: 'var(--color-bg)', padding: 'clamp(80px,12vw,140px) clamp(24px,6vw,80px)' }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <p style={{ ...MONO, fontSize: 'var(--text-caption)', color: 'var(--color-gold)', marginBottom: '16px' }}>For Business</p>
            <h2 style={{ ...SERIF, fontSize: 'clamp(2rem,4vw,3rem)', fontWeight: 300, lineHeight: 1.1, color: 'var(--color-text-primary)', marginBottom: '16px' }}>
              Succession Pricing
            </h2>
            <p style={{ ...SERIF, fontSize: '1.1rem', fontStyle: 'italic', fontWeight: 300, lineHeight: 1.85, color: 'var(--color-text-secondary)', marginBottom: '16px' }}>
              For SME founders and key knowledge holders.
            </p>
            <p style={{ ...SERIF, fontSize: '1rem', fontStyle: 'italic', fontWeight: 300, lineHeight: 1.85, color: 'var(--color-text-secondary)', marginBottom: '48px' }}>
              The unwritten pattern recognition. The risk calibration built over decades. The judgment that cannot be put in a handbook. That is what Basalith captures before a founder steps back.
            </p>

            <div style={{ border: '1px solid rgba(184,150,62,0.35)', padding: 'clamp(32px,5vw,52px)', background: 'rgba(184,150,62,0.03)', marginBottom: '24px' }}>
              <p style={{ ...MONO, fontSize: '0.48rem', color: 'var(--color-gold)', marginBottom: '16px' }}>Succession</p>
              <p style={{ ...SERIF, fontSize: 'clamp(2.5rem,5vw,3.2rem)', fontWeight: 300, color: 'var(--color-text-primary)', lineHeight: 1, marginBottom: '4px' }}>$12,000</p>
              <p style={{ ...MONO, fontSize: '0.44rem', color: 'var(--color-text-muted)', marginBottom: '8px' }}>per year</p>
              <p style={{ ...SERIF, fontSize: '0.95rem', fontStyle: 'italic', color: 'var(--color-gold)', marginBottom: '28px' }}>+ $5,000 founding session (one-time)</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 20px', marginBottom: '32px' }}>
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
                  <p key={f} style={{ ...MONO, fontSize: '0.43rem', color: 'var(--color-text-muted)', margin: 0 }}>&#10003; {f}</p>
                ))}
              </div>
              <a
                href="/apply?type=succession"
                style={{ ...MONO, fontSize: 'var(--text-caption)', display: 'block', textAlign: 'center', textDecoration: 'none', background: 'var(--color-gold)', color: '#0A0908', padding: '14px 32px' }}
              >
                Talk to us about Succession
              </a>
            </div>

            <p style={{ ...SERIF, fontSize: '0.95rem', fontStyle: 'italic', color: 'var(--color-text-muted)', marginBottom: '40px' }}>
              After transition: $3,600/year. Institutional access continues for the successor.
            </p>

            <p style={{ ...SERIF, fontSize: '1rem', fontStyle: 'italic', color: 'var(--color-text-secondary)', lineHeight: 1.85 }}>
              Not sure which is right for you?
              Every archive starts with a conversation with a Legacy Guide.
            </p>
            <a href="/apply" style={{ ...MONO, fontSize: 'var(--text-caption)', display: 'inline-block', marginTop: '20px', textDecoration: 'none', color: 'var(--color-gold)', border: '1px solid var(--color-gold)', padding: '12px 28px' }}>
              Speak to a Guide &rarr;
            </a>
          </div>
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
