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
  id:           'active' | 'resting' | 'legacy'
  eyebrow:      string
  name:         string
  annualPrice:  string
  annualSub:    string
  monthlyPrice: string
  annualOnly?:  boolean
  description:  string
  featured:     boolean
  features:     string[]
  cta:          string
  ctaHref:      string
  note:         string
}

const TIERS: Tier[] = [
  {
    id:          'active',
    eyebrow:     'While You Are Building',
    name:        'Active',
    annualPrice: '$3,600',
    annualSub:   '$300/mo equivalent',
    monthlyPrice:'$360',
    description: 'The full archive experience.\nYour entity learns every week.\nYour family stays connected.\nYour story keeps growing.',
    featured:    true,
    features: [
      'Weekly story prompts',
      'Nightly photograph emails',
      'Entity chat — full access',
      'Contributor network',
      'Memory game (monthly)',
      'Annual accuracy report',
      'Quarterly entity letter',
      'All supported languages',
    ],
    cta:     'Begin Your Archive',
    ctaHref: '/apply',
    note:    'One-time founding fee of $2,500',
  },
  {
    id:          'resting',
    eyebrow:     'When Life Gets in the Way',
    name:        'Resting',
    annualPrice: '$600',
    annualSub:   '$50/mo equivalent',
    monthlyPrice:'$60',
    description: 'Your archive preserved and waiting.\nNo emails. No prompts.\nJust your data — safe and intact —\nuntil you are ready to return.',
    featured:    false,
    features: [
      'All data preserved permanently',
      'Login access maintained',
      'Entity accessible',
      'Reactivate anytime',
      'No commitment to return',
    ],
    cta:     'Learn About Resting',
    ctaHref: '/apply',
    note:    'Available to Active members who need to step back.',
  },
  {
    id:          'legacy',
    eyebrow:     'After They Are Gone',
    name:        'Legacy',
    annualPrice: '$1,200',
    annualSub:   'billed to estate or family',
    monthlyPrice:'$1,200',
    annualOnly:  true,
    description: 'The entity continues.\n\nAs AI advances your loved one\'s entity advances with it. Every new model generation makes the presence more accurate. Every contributor who adds a memory makes it more complete.',
    featured:    false,
    features: [
      'Entity updated with every new AI model generation',
      'Full family contributor access',
      'New capability integration as technology advances',
      'Annual entity report to family',
      'Archive storage and security',
      'Generational access — forever',
      'No features removed at death',
    ],
    cta:     'Ask Your Legacy Guide',
    ctaHref: '/apply',
    note:    'Arranged through your Legacy Guide or estate. Annual billing only.',
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
      aria-label="Pricing tiers"
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
          Three Moments. One Archive.
          <span style={{ width: '24px', height: '1px', background: 'var(--color-gold)', display: 'block', flexShrink: 0 }} aria-hidden="true" />
        </p>

        <h2
          style={{
            ...SERIF,
            fontSize:      'var(--text-h1)',
            fontWeight:    300,
            color:         'var(--color-text-primary)',
            letterSpacing: '-0.02em',
            marginBottom:  '16px',
          }}
        >
          Most families move through all three.
        </h2>

        <p
          style={{
            ...SERIF,
            fontSize:   '1.05rem',
            fontStyle:  'italic',
            fontWeight: 300,
            lineHeight: 1.8,
            color:      'var(--color-text-secondary)',
            marginBottom: '32px',
          }}
        >
          Begin active. Rest when life demands it. Leave something permanent.
        </p>

        {/* Founding fee */}
        <p style={{ ...MONO, fontSize: 'var(--text-caption)', color: 'var(--color-gold)', marginBottom: '24px' }}>
          All plans begin with a one-time Founding Session investment of $2,500
        </p>

        {/* Toggle — Annual / Monthly (Active + Resting only) */}
        <div
          role="group"
          aria-label="Billing frequency"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginBottom: '48px' }}
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
        {TIERS.map(({ id, eyebrow, name, annualPrice, annualSub, monthlyPrice, annualOnly, description, featured, features, cta, ctaHref, note }) => (
          <div
            key={id}
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

            {/* Eyebrow */}
            <p style={{ ...MONO, fontSize: '0.42rem', color: 'var(--color-gold)', marginBottom: '16px' }}>
              {eyebrow}
            </p>

            {/* Name */}
            <h3
              style={{
                ...SERIF,
                fontSize:     '1.5rem',
                fontWeight:   500,
                color:        featured ? 'rgba(250,248,244,0.9)' : 'var(--color-text-primary)',
                marginBottom: '16px',
              }}
            >
              {name}
            </h3>

            {/* Description */}
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
              {description}
            </p>

            {/* Price */}
            {(isAnnual || annualOnly) ? (
              <>
                <div style={{ ...SERIF, fontSize: 'clamp(2rem,3.5vw,3rem)', fontWeight: 300, color: 'var(--color-gold)', letterSpacing: '-0.025em', lineHeight: 1, marginBottom: '6px' }}>
                  {annualPrice}
                </div>
                <p style={{ ...MONO, fontSize: '0.5rem', letterSpacing: '0.2em', color: featured ? 'rgba(250,248,244,0.3)' : 'var(--color-text-faint)', marginBottom: '24px' }}>
                  Per year · {annualSub}
                </p>
              </>
            ) : (
              <>
                <div style={{ ...SERIF, fontSize: 'clamp(2rem,3.5vw,3rem)', fontWeight: 300, color: 'var(--color-gold)', letterSpacing: '-0.025em', lineHeight: 1, marginBottom: '6px' }}>
                  {monthlyPrice}
                </div>
                <p style={{ ...MONO, fontSize: '0.5rem', letterSpacing: '0.2em', color: featured ? 'rgba(250,248,244,0.3)' : 'var(--color-text-faint)', marginBottom: '24px' }}>
                  Per month · Billed monthly
                </p>
              </>
            )}

            <div style={{ height: '1px', background: featured ? 'rgba(250,248,244,0.06)' : 'var(--color-border)', marginBottom: '24px' }} />

            {/* Features */}
            <ul style={{ listStyle: 'none', margin: '0 0 32px', padding: 0, display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
              {features.map(f => (
                <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <Check />
                  <span style={{ ...SERIF, fontSize: '0.9rem', fontWeight: 300, lineHeight: 1.5, color: featured ? 'rgba(250,248,244,0.55)' : 'var(--color-text-secondary)' }}>
                    {f}
                  </span>
                </li>
              ))}
            </ul>

            {/* CTA */}
            <a
              href={ctaHref}
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
                marginBottom:   '12px',
              }}
            >
              {cta}
            </a>

            {/* Note */}
            <p style={{ ...SERIF, fontSize: '0.78rem', fontStyle: 'italic', fontWeight: 300, color: 'var(--color-text-faint)', textAlign: 'center', lineHeight: 1.5 }}>
              {note}
            </p>
          </div>
        ))}
      </div>

      {/* Monthly minimum note */}
      {!isAnnual && (
        <p style={{ ...MONO, fontSize: '0.5rem', letterSpacing: '0.2em', color: 'var(--color-text-faint)', textAlign: 'center', marginTop: '24px' }}>
          Monthly plans require a 12-month minimum commitment. Cancel anytime after month 12.
        </p>
      )}

      {/* Tax note */}
      <div style={{ maxWidth: '640px', margin: '56px auto 0', padding: '48px 32px', background: 'var(--color-surface)', borderTop: '1px solid var(--color-border)' }}>
        <p style={{ ...MONO, fontSize: 'var(--text-caption)', color: 'var(--color-gold)', marginBottom: '20px' }}>
          A Note on Your Investment
        </p>
        <div style={{ ...SERIF, fontSize: '1rem', fontStyle: 'italic', fontWeight: 300, lineHeight: 1.8, color: 'var(--color-text-secondary)' }}>
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
          .pricing-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  )
}
