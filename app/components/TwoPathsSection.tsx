'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'

type Audience = 'founder' | 'family'

const MONO: React.CSSProperties = {
  fontFamily:    'var(--font-space-mono, "Space Mono", "Courier New", monospace)',
  fontSize:      '0.52rem',
  letterSpacing: '0.3em',
  textTransform: 'uppercase' as const,
}
const SERIF: React.CSSProperties = {
  fontFamily: 'var(--font-cormorant, "Cormorant Garamond", Georgia, serif)',
}

// Two choices mapped to the existing concepts: LEGACY -> /apply (family) and
// SUCCESSION -> /succession (founder). Headlines are the cards' own voice and
// deliberately do not repeat the hero copy.
const CARDS: {
  audience: Audience
  eyebrow:  string
  headline: string
  support:  string
  href:     string
  cta:      string
}[] = [
  {
    audience: 'family',
    eyebrow:  'INDIVIDUALS & FAMILIES',
    headline: 'Give them how you think, not just what you leave.',
    support:  'The years your family would spend guessing, answered while you are here.',
    href:     '/apply',
    cta:      'Begin Your Archive',
  },
  {
    audience: 'founder',
    eyebrow:  'FOUNDERS & SUCCESSORS',
    headline: "Keep your judgment in the room after you've left it.",
    support:  'When you step back, the way you decided does not have to go with you.',
    href:     '/succession',
    cta:      'Learn About Succession',
  },
]

// Fire-and-forget instrumentation. Counts the pick with no analytics vendor.
// Every path is guarded and failures are swallowed, so the selection itself can
// never wait on or break from any of this.
function trackAudience(audience: Audience) {
  // Generic dataLayer event, so a future analytics tool picks up the same signal.
  try {
    const w = window as unknown as { dataLayer?: unknown[] }
    if (Array.isArray(w.dataLayer)) {
      w.dataLayer.push({ event: 'audience_select', audience })
    }
  } catch { /* ignore */ }

  // Server beacon. sendBeacon survives navigation; a keepalive fetch is the
  // fallback when it is unavailable.
  try {
    const payload = JSON.stringify({ audience })
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      navigator.sendBeacon('/api/track/audience', new Blob([payload], { type: 'application/json' }))
    } else {
      fetch('/api/track/audience', {
        method:    'POST',
        headers:   { 'Content-Type': 'application/json' },
        body:      payload,
        keepalive: true,
      }).catch(() => { /* ignore */ })
    }
  } catch { /* ignore */ }
}

// Presentational section. Pure: it takes the current selection and a pick
// handler, so it renders identically whether it is the Suspense fallback or the
// hydrated, interactive version.
function AudienceSection({
  selected,
  onPick,
}: {
  selected: Audience | null
  onPick:   (audience: Audience) => void
}) {
  return (
    <section
      id="audience"
      aria-label="Who Basalith is for"
      style={{
        background: 'var(--color-bg)',
        padding:    'clamp(80px,12vw,140px) clamp(24px,6vw,80px)',
      }}
    >
      <div style={{ maxWidth: '1040px', margin: '0 auto' }}>

        {/* Title */}
        <p style={{ ...MONO, color: 'var(--color-gold-on-light)', marginBottom: '20px' }}>
          WHO BASALITH IS FOR
        </p>
        <h2
          style={{
            ...SERIF,
            fontSize:   'clamp(1.9rem,3.2vw,2.8rem)',
            fontWeight: 300,
            lineHeight: 1.1,
            color:      'var(--color-text-primary)',
            margin:     '0 0 48px',
          }}
        >
          Which are you here for?
        </h2>

        {/* Two cards — the card itself is the stateful choice */}
        <div
          className="two-paths-grid"
          role="group"
          aria-label="Which are you here for?"
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}
        >
          {CARDS.map(card => {
            const isSelected = selected === card.audience
            return (
              <div
                key={card.audience}
                style={{
                  display:       'flex',
                  flexDirection: 'column',
                  border:        `1px solid ${isSelected ? 'var(--color-gold-on-light)' : 'var(--color-border-medium)'}`,
                  background:    isSelected ? 'var(--color-gold-subtle)' : 'var(--color-surface)',
                  boxShadow:     isSelected ? 'var(--shadow-gold)' : 'none',
                  transition:    'border-color 250ms ease, background 250ms ease, box-shadow 250ms ease',
                }}
              >
                {/* The choice. A real button, with aria-pressed reflecting state. */}
                <button
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => onPick(card.audience)}
                  className="audience-card-btn"
                  style={{
                    flex:          1,
                    display:       'flex',
                    flexDirection: 'column',
                    alignItems:    'flex-start',
                    textAlign:     'left',
                    width:         '100%',
                    background:    'transparent',
                    border:        'none',
                    cursor:        'pointer',
                    font:          'inherit',
                    padding:       'clamp(32px,4vw,52px) clamp(32px,4vw,52px) 24px',
                  }}
                >
                  <span style={{ ...MONO, color: 'var(--color-gold-on-light)', marginBottom: '20px' }}>
                    {card.eyebrow}
                  </span>
                  <span
                    style={{
                      ...SERIF,
                      display:      'block',
                      fontSize:     'clamp(1.5rem,2.5vw,2.1rem)',
                      fontWeight:   300,
                      lineHeight:   1.15,
                      color:        'var(--color-text-primary)',
                      marginBottom: '16px',
                    }}
                  >
                    {card.headline}
                  </span>
                  <span
                    style={{
                      ...SERIF,
                      display:    'block',
                      fontSize:   '1.05rem',
                      fontStyle:  'italic',
                      fontWeight: 300,
                      lineHeight: 1.7,
                      color:      'var(--color-text-secondary)',
                    }}
                  >
                    {card.support}
                  </span>

                  <span
                    aria-hidden={!isSelected}
                    style={{
                      ...MONO,
                      fontSize:   '0.5rem',
                      color:      'var(--color-gold-on-light)',
                      marginTop:  '20px',
                      opacity:    isSelected ? 1 : 0,
                      transition: 'opacity 250ms ease',
                    }}
                  >
                    Selected
                  </span>
                </button>

                {/* CTA stays on its card. Keeps /apply and /succession. */}
                <div style={{ padding: '0 clamp(32px,4vw,52px) clamp(32px,4vw,52px)' }}>
                  <Link
                    href={card.href}
                    style={{
                      ...MONO,
                      display:        'inline-block',
                      textDecoration: 'none',
                      color:          '#0A0908',
                      background:     'var(--color-gold)',
                      border:         'none',
                      padding:        '14px 28px',
                      transition:     'background 250ms ease, color 250ms ease',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--color-gold-light)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--color-gold)' }}
                  >
                    {card.cta} &rarr;
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <style>{`
        .audience-card-btn:focus-visible {
          outline: 2px solid var(--color-gold-on-light);
          outline-offset: -2px;
        }
        @media (max-width: 767px) {
          .two-paths-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </section>
  )
}

// Reads/writes the audience choice through the URL search param. The param is
// the source of truth: nothing is selected by default, and the choice survives
// reload and is shareable.
function AudienceSelector() {
  const router       = useRouter()
  const pathname     = usePathname()
  const searchParams = useSearchParams()

  const raw = searchParams.get('audience')
  const selected: Audience | null = raw === 'founder' || raw === 'family' ? raw : null

  function onPick(audience: Audience) {
    // The selection is instant and self-contained: update the URL in place,
    // with no scroll jump. This is the source of truth and survives reload.
    const params = new URLSearchParams(searchParams.toString())
    params.set('audience', audience)
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })

    // Then fire-and-forget instrumentation, fully guarded so it can never
    // affect the selection above.
    trackAudience(audience)
  }

  return <AudienceSection selected={selected} onPick={onPick} />
}

export default function TwoPathsSection() {
  // useSearchParams requires a Suspense boundary in the App Router. Mirrors the
  // pattern in app/begin/tier/page.tsx. The fallback renders the section with
  // nothing selected, which is also the default state, so there is no flash.
  return (
    <Suspense fallback={<AudienceSection selected={null} onPick={() => {}} />}>
      <AudienceSelector />
    </Suspense>
  )
}
