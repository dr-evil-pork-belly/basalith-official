'use client'

import { Suspense, useState } from 'react'
import { useAudience } from '@/lib/useAudience'
import { mono, serif, StoneBlock, StoneCard } from './StonePrimitives'

// Homepage-scoped variant of app/components/ContrastDemo.tsx.
//
// The shared component stays byte-identical because /succession renders it and
// /succession is out of scope for this build. Every rendered string, the
// audience toggle behavior, the analytics beacon, and the Suspense seeding are
// carried across unchanged. Only the presentation moves onto direction 1d's
// primitives: the padded light block, the bordered card, and the inset.

type Audience = 'founder' | 'family'

const AUDIENCE_NAME: Record<Audience, string> = {
  founder: 'Founders & Successors',
  family:  'Individuals & Families',
}

// Neutral default, shown when neither path is toggled.
const NEUTRAL_QUESTION =
  "What's a decision you make almost without thinking, that others rarely get right?"

const QUESTION: Record<Audience, string> = {
  founder: "What's a call you trust your gut on, that your team usually gets wrong?",
  family:  "What's something you understand now that you wish you'd known at thirty?",
}

// Fixed, illustrative "after two hundred deposits" answers. Not generated and
// not a real person; the visible caption says exactly that. The neutral default
// reuses the founder walk-away pair.
const ILLUSTRATION: Record<Audience, [string, string]> = {
  founder: [
    'When to walk away. Most people wait for proof that a thing has failed. I watch for the moment it stops teaching me anything.',
    'By the time it fails, you have paid for the lesson twice. I would rather leave a good deal early than a bad one late.',
  ],
  family: [
    'Money was never what I worried about losing. I watched my father keep score and miss the years doing it.',
    'So I taught mine to measure a year by what they would do again, not by what it paid. The ones who tried it stopped arguing with me.',
  ],
}

const LEFT_NOTE =
  "A fact, not a pattern. It can return what you said. It can't yet answer what you never said."
const ILLUSTRATION_CAPTION = 'Illustration. An example archive, not a real person.'
const CLOSING_LINE = 'That distance is the product.'
const CLOSING_SUB =
  'Not a record of what they said. A model of how they reasoned, shaped to answer what no one thought to ask.'

// Fire-and-forget instrumentation. Counts the pick with no analytics vendor.
// Every path is guarded and failures are swallowed, so the toggle can never
// wait on or break from any of this.
function trackAudience(audience: Audience) {
  try {
    const w = window as unknown as { dataLayer?: unknown[] }
    if (Array.isArray(w.dataLayer)) {
      w.dataLayer.push({ event: 'audience_select', audience })
    }
  } catch { /* ignore */ }

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

function HomeContrastDemoSection({
  audience,
  onSelect,
}: {
  audience: Audience | null
  onSelect: (audience: Audience) => void
}) {
  const [input, setInput]       = useState('')
  const [answered, setAnswered] = useState<string | null>(null)

  const canSubmit = input.trim().length > 0

  function onSubmit() {
    if (!canSubmit) return
    setAnswered(input.trim())
  }

  const question     = audience ? QUESTION[audience] : NEUTRAL_QUESTION
  const illustration = audience ? ILLUSTRATION[audience] : ILLUSTRATION.founder

  return (
    <section aria-label="Try Basalith" className="home-contrast">
      <StoneBlock>
        <p style={{ ...mono, color: 'var(--color-gold)', margin: 0 }}>
          Try it. Nothing is saved.
        </p>

        <h2
          style={{
            ...serif,
            fontSize:      'clamp(24px, 6.2vw, 34px)',
            fontWeight:    300,
            lineHeight:    1.14,
            letterSpacing: '-0.02em',
            color:         'var(--stone-ink)',
            margin:        0,
          }}
        >
          Answer one question.
        </h2>

        {/* Audience toggle. Switches the question and illustration in place; it
            never navigates. Neither option is selected by default. */}
        <div role="group" aria-label="Choose a path" style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
          {(['founder', 'family'] as const).map(opt => {
            const selected = audience === opt
            return (
              <button
                key={opt}
                type="button"
                aria-pressed={selected}
                onClick={() => onSelect(opt)}
                style={{
                  ...mono,
                  cursor:       'pointer',
                  padding:      '11px 16px',
                  minHeight:    '44px',
                  borderRadius: 'var(--radius-full)',
                  border:       `1px solid ${selected ? 'var(--color-gold)' : 'var(--stone-card-line)'}`,
                  background:   selected ? 'var(--stone-inset)' : 'transparent',
                  color:        selected ? 'var(--color-gold)' : 'var(--stone-secondary)',
                  transition:   'background 200ms ease, border-color 200ms ease, color 200ms ease',
                }}
              >
                {AUDIENCE_NAME[opt]}
              </button>
            )
          })}
        </div>

        <p
          style={{
            ...serif,
            fontSize:   'clamp(19px, 4.8vw, 24px)',
            fontWeight: 300,
            lineHeight: 1.3,
            color:      'var(--stone-ink)',
            margin:     0,
            textWrap:   'pretty',
          }}
        >
          {question}
        </p>

        <textarea
          aria-label="Your answer"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="A sentence is enough."
          rows={4}
          style={{
            width:      '100%',
            display:    'block',
            boxSizing:  'border-box',
            background: 'var(--stone-card)',
            border:     '1px solid var(--stone-card-line)',
            padding:    '14px 13px',
            fontFamily: 'var(--font-cormorant, "Cormorant Garamond", Georgia, serif)',
            fontSize:   '16px',
            fontWeight: 300,
            lineHeight: 1.6,
            color:      'var(--stone-ink)',
            resize:     'vertical',
          }}
        />

        <button
          type="button"
          onClick={onSubmit}
          disabled={!canSubmit}
          style={{
            ...mono,
            display:    'block',
            width:      '100%',
            textAlign:  'center',
            color:      '#0A0908',
            background: 'var(--b2b-btn)',
            border:     'none',
            padding:    '15px',
            minHeight:  '48px',
            cursor:     canSubmit ? 'pointer' : 'default',
            opacity:    canSubmit ? 1 : 0.4,
            transition: 'background 250ms ease',
          }}
        >
          Show me the difference.
        </button>

        <div aria-live="polite">
          {answered !== null && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '8px' }}>

              <StoneCard label="After one answer">
                {/* Visitor input. React renders this as a text node (textContent
                    semantics); we never pass visitor input to dangerouslySetInnerHTML. */}
                <p
                  style={{
                    ...serif,
                    fontSize:   '16px',
                    fontWeight: 300,
                    lineHeight: 1.5,
                    color:      'var(--stone-ink)',
                    whiteSpace: 'pre-wrap',
                    margin:     0,
                  }}
                >
                  {answered}
                </p>
                <p style={{ ...serif, fontSize: '14px', fontStyle: 'italic', fontWeight: 300, lineHeight: 1.45, color: 'var(--stone-secondary)', margin: 0 }}>
                  {LEFT_NOTE}
                </p>
              </StoneCard>

              <StoneCard label="After two hundred deposits">
                <div
                  style={{
                    background:     'var(--stone-inset)',
                    borderLeft:     '3px solid var(--color-gold)',
                    padding:        '11px 12px',
                    display:        'flex',
                    flexDirection:  'column',
                    gap:            '12px',
                  }}
                >
                  {illustration.map((para, i) => (
                    <p
                      key={i}
                      style={{ ...serif, fontSize: '16px', fontWeight: 300, lineHeight: 1.5, color: 'var(--stone-ink)', margin: 0 }}
                    >
                      {para}
                    </p>
                  ))}
                </div>
                <p style={{ ...mono, fontSize: '9.5px', color: 'var(--stone-label)', margin: 0 }}>
                  {ILLUSTRATION_CAPTION}
                </p>
              </StoneCard>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
                <p style={{ ...serif, fontSize: 'clamp(21px, 5.4vw, 28px)', fontWeight: 300, lineHeight: 1.2, color: 'var(--stone-ink)', margin: 0 }}>
                  {CLOSING_LINE}
                </p>
                <p style={{ ...serif, fontSize: '16px', fontStyle: 'italic', fontWeight: 300, lineHeight: 1.5, color: 'var(--stone-body)', margin: 0 }}>
                  {CLOSING_SUB}
                </p>
              </div>
            </div>
          )}
        </div>
      </StoneBlock>

      <style>{`
        .home-contrast :focus-visible {
          outline: 2px solid var(--color-gold);
          outline-offset: 2px;
        }
      `}</style>
    </section>
  )
}

function HomeContrastDemoInner() {
  // Seed once from the URL so deep links pre-select, then keep the choice in
  // local state. Default is Founders, the primary audience.
  const urlAudience = useAudience()
  const [demoAudience, setDemoAudience] = useState<Audience | null>(urlAudience ?? 'founder')

  function onSelect(next: Audience) {
    if (next === demoAudience) return
    setDemoAudience(next)
    trackAudience(next)   // analytics ping only; does not touch the URL
  }

  // Keyed by the choice so toggling remounts the section and resets the answer.
  return <HomeContrastDemoSection key={demoAudience ?? 'neutral'} audience={demoAudience} onSelect={onSelect} />
}

export default function HomeContrastDemo() {
  // useAudience reads useSearchParams under the hood (for the one-time seed), so
  // it needs a Suspense boundary. The fallback renders the Founders default, so
  // SSR matches the seeded client default with no flash.
  return (
    <Suspense fallback={<HomeContrastDemoSection audience="founder" onSelect={() => {}} />}>
      <HomeContrastDemoInner />
    </Suspense>
  )
}
