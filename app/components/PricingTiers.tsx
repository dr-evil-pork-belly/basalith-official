'use client'

import { useState } from 'react'

const MONO: React.CSSProperties = {
  fontFamily:    'var(--font-space-mono, "Space Mono", "Courier New", monospace)',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.28em',
}

const SERIF: React.CSSProperties = {
  fontFamily: 'var(--font-cormorant, "Cormorant Garamond", Georgia, serif)',
}

interface Tier {
  name:         string
  tagline:      string
  annualPrice:  string
  annualSub:    string
  monthlyPrice: string
  featured:     boolean
  features:     string[]
}

const TIERS: Tier[] = [
  {
    name:         'The Archive',
    tagline:      'The foundation.\nYour entity begins learning\nfrom day one.',
    annualPrice:  '$1,800',
    annualSub:    '$150/mo equivalent',
    monthlyPrice: '$180',
    featured:     false,
    features: [
      'Secure archive infrastructure',
      'Up to 5 family contributors',
      'Unlimited photograph deposits',
      'Voice, photo, and journal labeling',
      'Nightly photograph email to contributors',
      'Digital Clone, foundational access',
      'Annual AI model updates',
      'Data portability guarantee',
      'Custodianship Reserve coverage',
    ],
  },
  {
    name:         'The Estate',
    tagline:      'Your entity. Your family.\nYour story. Everything working\ntogether to build something\nthat continues long after you are gone.',
    annualPrice:  '$3,600',
    annualSub:    '$300/mo equivalent',
    monthlyPrice: '$360',
    featured:     true,
    features: [
      'Everything in The Archive',
      'Up to 15 family contributors',
      'Digital Clone, full conversational access',
      'Will and trust integration',
      'Bequest language prepared',
      'Dedicated Custodian designation',
      'Annual estate compatibility review',
      'Priority curation support',
      'basalith.ai entity priority access',
      'Quarterly Provenance Report',
      'Family access tiers',
      '48-hour support response',
    ],
  },
  {
    name:         'The Dynasty',
    tagline:      'For families building\nacross generations.',
    annualPrice:  '$9,600',
    annualSub:    '$800/mo equivalent',
    monthlyPrice: '$960',
    featured:     false,
    features: [
      'Everything in The Estate',
      'Unlimited contributors across generations',
      'Full Family Trust legal instrument',
      'Multi-generational access tiers',
      'Dedicated Archive Manager. One person, not a ticket queue.',
      'Concierge onboarding. Dedicated support from day one.',
      'Annual in-person estate review',
      'First access to new AI generations',
      'Custom Digital Clone interaction boundaries',
      'Dedicated Legacy Guide permanently assigned',
      'Designed for generational continuity',
    ],
  },
]

function Check() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0, marginTop: '3px' }} aria-hidden="true">
      <circle cx="7" cy="7" r="6.5" stroke="rgba(184,150,62,0.3)" />
      <path d="M4 7l2 2 4-4" stroke="var(--color-gold)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function PricingTiers() {
  const [billing, setBilling] = useState<'annual' | 'monthly'>('annual')
  const isAnnual = billing === 'annual'

  return (
    <section
      aria-label="Stewardship tiers"
      style={{
        background: 'var(--color-surface-alt)',
        padding:    'clamp(64px,8vw,96px) clamp(24px,6vw,80px)',
      }}
    >
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <p
          style={{
            ...MONO,
            fontSize:       'var(--text-caption)',
            color:          'var(--color-gold)',
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            gap:            '12px',
            marginBottom:   '16px',
          }}
        >
          <span style={{ width: '24px', height: '1px', background: 'var(--color-gold)', display: 'block', flexShrink: 0 }} aria-hidden="true" />
          Annual Stewardship
          <span style={{ width: '24px', height: '1px', background: 'var(--color-gold)', display: 'block', flexShrink: 0 }} aria-hidden="true" />
        </p>
        <h2
          style={{
            ...SERIF,
            fontSize:      'var(--text-h1)',
            fontWeight:    300,
            color:         'var(--color-text-primary)',
            letterSpacing: '-0.02em',
            marginBottom:  '32px',
          }}
        >
          Choose Your Level of Stewardship.
        </h2>

        {/* Founding fee — fixed above toggle */}
        <p
          style={{
            ...MONO,
            fontSize:     'var(--text-caption)',
            color:        'var(--color-gold)',
            marginBottom: '24px',
          }}
        >
          All plans begin with a one-time Founding Session investment of $2,500
        </p>

        {/* Toggle */}
        <div
          role="group"
          aria-label="Billing frequency"
          style={{
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            gap:            '16px',
            marginBottom:   '48px',
          }}
        >
          <button
            onClick={() => setBilling('annual')}
            aria-pressed={isAnnual}
            style={{
              fontFamily:    'var(--font-space-mono, "Space Mono", "Courier New", monospace)',
              fontSize:      '0.6rem',
              letterSpacing: '0.25em',
              textTransform: 'uppercase' as const,
              padding:       '10px 24px',
              border:        '1px solid var(--color-border-medium)',
              borderRadius:  '2px',
              cursor:        'pointer',
              background:    isAnnual ? 'var(--color-void)' : 'transparent',
              color:         isAnnual ? 'var(--color-bg)' : 'var(--color-text-secondary)',
              transition:    'all 200ms ease',
            }}
          >
            Annual
          </button>

          <div
            aria-hidden="true"
            style={{
              fontFamily:    'var(--font-space-mono, "Space Mono", "Courier New", monospace)',
              fontSize:      '0.5rem',
              letterSpacing: '0.2em',
              textTransform: 'uppercase' as const,
              color:         'var(--color-gold)',
              padding:       '6px 12px',
              border:        '1px solid var(--color-gold-border)',
              borderRadius:  '2px',
            }}
          >
            Save 20%
          </div>

          <button
            onClick={() => setBilling('monthly')}
            aria-pressed={!isAnnual}
            style={{
              fontFamily:    'var(--font-space-mono, "Space Mono", "Courier New", monospace)',
              fontSize:      '0.6rem',
              letterSpacing: '0.25em',
              textTransform: 'uppercase' as const,
              padding:       '10px 24px',
              border:        '1px solid var(--color-border-medium)',
              borderRadius:  '2px',
              cursor:        'pointer',
              background:    !isAnnual ? 'var(--color-void)' : 'transparent',
              color:         !isAnnual ? 'var(--color-bg)' : 'var(--color-text-secondary)',
              transition:    'all 200ms ease',
            }}
          >
            Monthly
          </button>
        </div>
      </div>

      {/* Tier cards */}
      <div
        className="pricing-grid"
        style={{
          display:             'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap:                 '24px',
          maxWidth:            '1100px',
          margin:              '0 auto',
        }}
      >
        {TIERS.map(({ name, tagline, annualPrice, annualSub, monthlyPrice, featured, features }) => (
          <div
            key={name}
            style={{
              background:    featured ? 'var(--color-void)' : 'var(--color-surface)',
              border:        featured ? '1px solid rgba(184,150,62,0.35)' : '1px solid var(--color-border)',
              borderRadius:  'var(--radius-md)',
              padding:       '36px',
              display:       'flex',
              flexDirection: 'column',
              boxShadow:     featured ? 'var(--shadow-gold)' : 'var(--shadow-sm)',
              position:      'relative',
            }}
          >
            {featured && (
              <div
                aria-hidden="true"
                style={{
                  position:   'absolute',
                  top:        0,
                  left:       '15%',
                  right:      '15%',
                  height:     '1px',
                  background: 'linear-gradient(90deg,transparent,rgba(184,150,62,0.5),transparent)',
                }}
              />
            )}
            {featured && (
              <p style={{ ...MONO, fontSize: '0.44rem', color: 'var(--color-gold)', marginBottom: '20px' }}>
                Most Popular
              </p>
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
                lineHeight:   1.65,
                whiteSpace:   'pre-line',
              }}
            >
              {tagline}
            </p>

            {/* Price */}
            {isAnnual ? (
              <>
                <div
                  style={{
                    ...SERIF,
                    fontSize:      'clamp(2rem,3.5vw,3rem)',
                    fontWeight:    300,
                    color:         'var(--color-gold)',
                    letterSpacing: '-0.025em',
                    lineHeight:    1,
                    marginBottom:  '6px',
                  }}
                >
                  {annualPrice}
                </div>
                <p
                  style={{
                    ...MONO,
                    fontSize:     '0.5rem',
                    letterSpacing: '0.2em',
                    color:        featured ? 'rgba(250,248,244,0.3)' : 'var(--color-text-faint)',
                    marginBottom: '24px',
                  }}
                >
                  Per year · {annualSub}
                </p>
              </>
            ) : (
              <>
                <div
                  style={{
                    ...SERIF,
                    fontSize:      'clamp(2rem,3.5vw,3rem)',
                    fontWeight:    300,
                    color:         'var(--color-gold)',
                    letterSpacing: '-0.025em',
                    lineHeight:    1,
                    marginBottom:  '6px',
                  }}
                >
                  {monthlyPrice}
                </div>
                <p
                  style={{
                    ...MONO,
                    fontSize:     '0.5rem',
                    letterSpacing: '0.2em',
                    color:        featured ? 'rgba(250,248,244,0.3)' : 'var(--color-text-faint)',
                    marginBottom: '24px',
                  }}
                >
                  Per month · Billed monthly
                </p>
              </>
            )}

            <div
              style={{
                height:       '1px',
                background:   featured ? 'rgba(250,248,244,0.06)' : 'var(--color-border)',
                marginBottom: '24px',
              }}
            />

            <ul
              style={{
                listStyle:     'none',
                margin:        '0 0 32px',
                padding:       0,
                display:       'flex',
                flexDirection: 'column',
                gap:           '10px',
                flex:          1,
              }}
            >
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

      {/* Monthly minimum note — only shown when monthly is selected */}
      {!isAnnual && (
        <p
          style={{
            ...MONO,
            fontSize:     '0.5rem',
            letterSpacing: '0.2em',
            color:        'var(--color-text-faint)',
            textAlign:    'center',
            marginTop:    '24px',
          }}
        >
          Monthly plans require a 12-month minimum commitment.
          Cancel anytime after month 12.
        </p>
      )}

      {/* Tax note */}
      <div
        style={{
          maxWidth:   '640px',
          margin:     '56px auto 0',
          padding:    '48px 32px',
          background: 'var(--color-surface)',
          borderTop:  '1px solid var(--color-border)',
        }}
      >
        <p
          style={{
            ...MONO,
            fontSize:     'var(--text-caption)',
            color:        'var(--color-gold)',
            marginBottom: '20px',
          }}
        >
          A Note on Your Investment
        </p>
        <div
          style={{
            ...SERIF,
            fontSize:   '1rem',
            fontStyle:  'italic',
            fontWeight: 300,
            lineHeight: 1.8,
            color:      'var(--color-text-secondary)',
          }}
        >
          <p style={{ marginBottom: '16px' }}>
            Many clients work with their estate attorney or CPA to explore whether
            the annual Basalith fee qualifies as an estate planning expense.
          </p>
          <p style={{ marginBottom: '16px' }}>
            We provide detailed invoicing and service descriptions to support
            this conversation with your advisor.
          </p>
          <p style={{ margin: 0 }}>
            We recommend discussing this with your tax professional.
          </p>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .pricing-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </section>
  )
}
