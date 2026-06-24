import type { Metadata } from 'next'
import Link        from 'next/link'
import Nav         from '../components/Nav'
import Footer      from '../components/Footer'
import PricingFAQ  from '../components/PricingFAQ'
import PricingTiers from '../components/PricingTiers'

export const metadata: Metadata = {
  title: 'Pricing · Basalith',
  description: 'Pricing for a business transition. Succession at $12,000 a year plus a one-time founding session. Individual and family archives also available.',
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
  { n: '01', title: 'Archive Architecture Build',     desc: 'Your permanent archive structure, configured for transfer and long-term standing.' },
  { n: '02', title: 'Document Compatibility Review',   desc: 'Assessment against your existing legal and succession documents. Attorney-ready output.' },
  { n: '03', title: 'Contributor Network Setup',       desc: 'Onboarding for up to 15 contributors. Roles assigned. Access levels configured.' },
  { n: '04', title: 'Founding Session',                desc: 'Your first guided session, led by a Senior Legacy Guide. This is where it becomes real.' },
  { n: '05', title: 'Data Migration',                  desc: 'Your records filtered, deduplicated, dated, and sequenced before they reach the labeling interface.' },
  { n: '06', title: 'Custodian Designation',           desc: "Your archive's custodian assigned and formally documented." },
]

const TRUST_BADGES = [
  { icon: '🔒', label: 'Immutability Vault after passing' },
  { icon: '🚫', label: 'Never used for other entities' },
  { icon: '📦', label: 'Full export in open formats at any time. Nothing is stranded if we ever close.' },
]

const SECURITY_BADGES = [
  { icon: '🔒', label: 'AES-256 encrypted at rest' },
  { icon: '🔐', label: 'TLS 1.3 in transit' },
  { icon: '📦', label: 'Full data export anytime' },
  { icon: '⚖️', label: 'Delaware C-Corp' },
  { icon: '🏛️', label: 'Academic research foundation' },
]

const SUCCESSION_FEATURES = [
  'Extended 3-hour founding session',
  'Business decision framework capture',
  '20+ scenario training library',
  'Successor access portal',
  'Quarterly calibration sessions',
  'Annual entity accuracy report',
  'Board-level reporting',
  'Priority support',
]

export default function PricingPage() {
  return (
    <>
      <Nav />
      <main style={{ background: 'var(--color-bg)' }}>

        {/* Hero */}
        <section
          className="b2b-paper"
          style={{
            padding:    'clamp(140px,18vw,200px) clamp(24px,6vw,80px) clamp(64px,8vw,88px)',
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
              marginBottom:  '28px',
            }}
          >
            Pricing for a transition.
          </h1>
          <p
            style={{
              ...SERIF,
              fontSize:   '1.15rem',
              fontStyle:  'italic',
              fontWeight: 300,
              lineHeight: 1.85,
              color:      'var(--color-text-secondary)',
              maxWidth:   '520px',
              margin:     '0 auto',
            }}
          >
            Succession pricing for a business handoff. Individual and family archives below.
          </p>
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

        {/* Succession leads */}
        <section style={{ background: 'var(--color-void)', padding: 'clamp(72px,10vw,120px) clamp(24px,6vw,80px)' }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <p style={{ ...MONO, fontSize: 'var(--text-caption)', color: 'var(--color-gold)', marginBottom: '16px' }}>For Business</p>
            <h2 style={{ ...SERIF, fontSize: 'clamp(2rem,4vw,3rem)', fontWeight: 300, lineHeight: 1.1, color: 'rgba(250,248,244,0.9)', marginBottom: '16px' }}>
              Succession
            </h2>
            <p style={{ ...SERIF, fontSize: '1.1rem', fontStyle: 'italic', fontWeight: 300, lineHeight: 1.85, color: 'rgba(250,248,244,0.55)', marginBottom: '16px' }}>
              For founders and key knowledge holders preparing a handoff.
            </p>
            <p style={{ ...SERIF, fontSize: '1rem', fontStyle: 'italic', fontWeight: 300, lineHeight: 1.85, color: 'rgba(250,248,244,0.5)', marginBottom: '48px' }}>
              The unwritten pattern recognition. The risk calibration built over decades. The judgment that cannot be put in a handbook. That is what Basalith captures before a founder steps back.
            </p>

            <div style={{ border: '1px solid rgba(184,150,62,0.35)', borderTop: '2px solid rgba(196,162,74,0.7)', padding: 'clamp(32px,5vw,52px)', background: 'rgba(184,150,62,0.04)', marginBottom: '24px' }}>
              <p style={{ ...MONO, fontSize: '0.48rem', color: 'var(--color-gold)', marginBottom: '16px' }}>Succession</p>
              <p style={{ ...SERIF, fontSize: 'clamp(2.5rem,5vw,3.2rem)', fontWeight: 300, color: 'rgba(250,248,244,0.92)', lineHeight: 1, marginBottom: '4px' }}>$12,000</p>
              <p style={{ ...MONO, fontSize: '0.44rem', color: 'rgba(250,248,244,0.4)', marginBottom: '8px' }}>per year</p>
              <p style={{ ...SERIF, fontSize: '0.95rem', fontStyle: 'italic', color: 'var(--color-gold)', marginBottom: '28px' }}>+ $5,000 founding session (one-time)</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 20px', marginBottom: '32px' }}>
                {SUCCESSION_FEATURES.map(f => (
                  <p key={f} style={{ ...MONO, fontSize: '0.43rem', color: 'rgba(250,248,244,0.5)', margin: 0 }}>&#10003; {f}</p>
                ))}
              </div>
              <Link
                href="/contact"
                className="pricing-cta"
                style={{ ...MONO, fontSize: 'var(--text-caption)', display: 'block', textAlign: 'center', textDecoration: 'none', background: 'var(--color-gold)', color: '#0A0908', padding: '16px 32px', transition: 'background 250ms ease' }}
              >
                Start the conversation
              </Link>
            </div>

            <p style={{ ...SERIF, fontSize: '0.95rem', fontStyle: 'italic', color: 'rgba(250,248,244,0.4)', lineHeight: 1.8 }}>
              After transition: $3,600/year. Institutional access continues for the successor.
            </p>
            <Link href="/succession" className="pricing-ghost-link" style={{ ...MONO, fontSize: '0.46rem', color: 'rgba(196,162,74,0.7)', textDecoration: 'none', display: 'inline-block', marginTop: '16px' }}>
              How succession works &rarr;
            </Link>
          </div>
        </section>

        {/* Acquisition — per-deal engagement. Distinct block, not a tier card, not in the Active/Resting/Legacy group. */}
        <section className="b2b-paper" style={{ background: 'var(--color-bg)', padding: 'clamp(72px,10vw,120px) clamp(24px,6vw,80px)', borderTop: '1px solid rgba(196,162,74,0.18)' }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <p style={{ ...MONO, fontSize: 'var(--text-caption)', color: 'var(--color-gold)', display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <span style={{ width: '24px', height: '1px', background: 'var(--color-gold)', display: 'block', flexShrink: 0 }} aria-hidden="true" />
              Acquisition
            </p>
            <h2 style={{ ...SERIF, fontSize: 'clamp(2rem,4vw,3rem)', fontWeight: 300, lineHeight: 1.15, color: 'var(--color-text-primary)', letterSpacing: '-0.02em', marginBottom: '28px' }}>
              When you buy the company, you buy how it was run.
            </h2>
            <p style={{ ...SERIF, fontSize: '1.1rem', fontStyle: 'italic', fontWeight: 300, lineHeight: 1.85, color: 'var(--color-text-secondary)', marginBottom: '20px' }}>
              In an acquisition, the operator&rsquo;s judgment is part of what you valued, and most of it lives in one person&rsquo;s head. Basalith captures it during the active period before close, so what you priced in diligence is still in the room after the operator is gone.
            </p>
            <p style={{ ...SERIF, fontSize: '1.05rem', fontStyle: 'italic', fontWeight: 300, lineHeight: 1.85, color: 'var(--color-text-secondary)', marginBottom: '40px' }}>
              Acquisition work is a per-deal engagement, scoped to the transaction, not an annual subscription.
            </p>

            <div style={{ borderTop: '1px solid rgba(196,162,74,0.18)', paddingTop: '36px', marginBottom: '40px' }}>
              <p style={{ ...SERIF, fontSize: 'clamp(1.5rem,3vw,2rem)', fontWeight: 300, color: 'var(--color-text-primary)', lineHeight: 1.3, marginBottom: '16px' }}>
                Engagements start at $25,000, scaled to the size and complexity of the transaction.
              </p>
              <p style={{ ...SERIF, fontSize: '1rem', fontStyle: 'italic', fontWeight: 300, lineHeight: 1.8, color: 'var(--color-text-secondary)', marginBottom: '8px' }}>
                Priced against the value at risk in the transaction, as part of diligence, not as software.
              </p>
              <p style={{ ...SERIF, fontSize: '0.9rem', fontStyle: 'italic', fontWeight: 300, lineHeight: 1.8, color: 'var(--color-text-faint)', margin: 0 }}>
                For larger transactions, engagement scope and fee are set in conversation.
              </p>
            </div>

            <Link
              href="/apply?type=acquisition"
              className="pricing-cta-paper"
              style={{ ...MONO, fontSize: 'var(--text-caption)', display: 'inline-block', textDecoration: 'none', background: 'var(--b2b-btn)', color: '#0A0908', padding: '16px 32px', transition: 'background 250ms ease' }}
            >
              Talk to us about a transaction.
            </Link>
          </div>
        </section>

        {/* The Founding — audience-neutral, business framing first */}
        <section
          style={{
            background: 'var(--color-bg)',
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
                For a business, the operator works through the decision frameworks that
                built the company in an extended guided session with a Senior Legacy Guide.
                For an individual or a family, the session captures voice, values, and the
                specific way someone sees the world.
              </p>
              <p style={{ marginBottom: '20px' }}>
                It establishes the foundation of the archive. Everything that follows builds on it.
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
                  <p style={{ ...SERIF, fontSize: '3.5rem', fontWeight: 300, color: 'rgba(250,248,244,0.9)', lineHeight: 1, letterSpacing: '-0.02em', marginBottom: '8px' }}>$5,000</p>
                  <p style={{ ...MONO, fontSize: '0.48rem', color: 'var(--color-gold)', marginBottom: '16px' }}>Business founding, one-time</p>
                  <p style={{ ...SERIF, fontSize: '0.88rem', fontStyle: 'italic', fontWeight: 300, color: 'rgba(250,248,244,0.3)', lineHeight: 1.7 }}>
                    Individual and family founding is $2,500. Annual plan selected separately.
                    Executed by a Senior Legacy Guide.
                  </p>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '24px', marginTop: '40px', flexWrap: 'wrap' }}>
              <a href="/founding-session" className="pricing-ghost-link" style={{ ...SERIF, fontSize: '0.9rem', fontStyle: 'italic', color: 'rgba(196,162,74,0.6)', textDecoration: 'none', transition: 'color 200ms ease' }}>
                What happens in a Founding session →
              </a>
            </div>
          </div>
        </section>

        {/* B2C second door — individuals and families */}
        <section style={{ background: 'var(--color-surface-alt)', padding: 'clamp(64px,8vw,96px) clamp(24px,6vw,80px) 0', textAlign: 'center' }}>
          <div style={{ maxWidth: '620px', margin: '0 auto' }}>
            <p style={{ ...MONO, fontSize: 'var(--text-caption)', color: 'var(--color-text-muted)', marginBottom: '16px' }}>
              The second door &middot; Individuals and families
            </p>
            <h2 style={{ ...SERIF, fontSize: 'clamp(1.75rem,3vw,2.5rem)', fontWeight: 300, lineHeight: 1.15, color: 'var(--color-text-primary)', letterSpacing: '-0.02em', marginBottom: '16px' }}>
              For a life, not a business.
            </h2>
            <p style={{ ...SERIF, fontSize: '1.05rem', fontStyle: 'italic', fontWeight: 300, lineHeight: 1.8, color: 'var(--color-text-secondary)', margin: 0 }}>
              The same method, for preserving how a person thinks.
            </p>
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
          <p style={{ ...SERIF, fontSize: 'clamp(1.6rem,3vw,2.4rem)', fontWeight: 300, fontStyle: 'italic', lineHeight: 1.4, color: 'rgba(250,248,244,0.85)', maxWidth: '620px', margin: '0 auto 40px' }}>
            Every transition starts with a conversation. Tell us what is changing and we will tell you whether Basalith fits.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <a href="/contact" className="pricing-cta" style={{ ...MONO, fontSize: 'var(--text-caption)', display: 'inline-block', textDecoration: 'none', background: 'var(--color-gold)', color: '#0A0908', padding: '16px 32px', borderRadius: 'var(--radius-sm)', transition: 'background 250ms ease' }}>
              Start the conversation
            </a>
          </div>
          <p style={{ ...MONO, fontSize: '0.46rem', color: 'rgba(250,248,244,0.2)', marginTop: '24px' }}>
            hello@basalith.xyz
          </p>
        </section>

      </main>
      <Footer />

      <style>{`
        .pricing-ghost-link:hover { color: var(--color-gold) !important; }
        .pricing-cta:hover       { background: var(--color-gold-light) !important; }
        .pricing-cta-paper:hover { background: var(--b2b-btn-hover) !important; }
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
