'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { scrollToAudience } from '@/lib/scrollToAudience'

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

const AUDIENCE_NAME: Record<Audience, string> = {
  founder: 'Founders & Successors',
  family:  'Individuals & Families',
}

const QUESTION: Record<Audience, string> = {
  founder: "What's a call you trust your gut on, that your team usually gets wrong?",
  family:  "What's something you understand now that you wish you'd known at thirty?",
}

// Fixed, illustrative "after two hundred deposits" answers. Not generated and
// not a real person; the visible caption says exactly that.
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

function ContrastDemoSection({ audience }: { audience: Audience }) {
  const [input, setInput]       = useState('')
  const [answered, setAnswered] = useState<string | null>(null)

  const canSubmit = input.trim().length > 0

  function onSubmit() {
    if (!canSubmit) return
    setAnswered(input.trim())
  }

  return (
    <section
      aria-label="Try Basalith"
      className="contrast-demo contrast-reveal"
      style={{
        background: 'var(--color-bg)',
        padding:    'clamp(80px,12vw,140px) clamp(24px,6vw,80px)',
      }}
    >
      <div style={{ maxWidth: '1040px', margin: '0 auto' }}>

        {/* Header */}
        <p style={{ ...MONO, color: 'var(--color-gold-on-light)', marginBottom: '20px' }}>
          Try it. Nothing is saved.
        </p>
        <h2
          style={{
            ...SERIF,
            fontSize:   'clamp(1.9rem,3.2vw,2.8rem)',
            fontWeight: 300,
            lineHeight: 1.1,
            color:      'var(--color-text-primary)',
            margin:     '0 0 24px',
          }}
        >
          Answer one question.
        </h2>

        {/* Lane marker + switch path */}
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '40px' }}>
          <span style={{ ...MONO, color: 'var(--color-gold-on-light)' }}>
            {AUDIENCE_NAME[audience]}
          </span>
          <span aria-hidden="true" style={{ color: 'var(--color-border-medium)' }}>&middot;</span>
          <button
            type="button"
            onClick={scrollToAudience}
            style={{
              ...MONO,
              background: 'transparent',
              border:     'none',
              cursor:     'pointer',
              color:      'var(--color-text-secondary)',
              padding:    '4px 0',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--color-gold-on-light)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--color-text-secondary)' }}
          >
            Switch path
          </button>
        </div>

        {/* The question, specific to the audience */}
        <p
          style={{
            ...SERIF,
            fontSize:   'clamp(1.4rem,2.6vw,2rem)',
            fontWeight: 300,
            lineHeight: 1.3,
            color:      'var(--color-text-primary)',
            maxWidth:   '760px',
            margin:     '0 0 24px',
          }}
        >
          {QUESTION[audience]}
        </p>

        {/* Answer field */}
        <textarea
          aria-label="Your answer"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="A sentence is enough."
          rows={4}
          style={{
            width:        '100%',
            maxWidth:     '760px',
            display:      'block',
            background:   'var(--color-surface)',
            border:       '1px solid var(--color-border-medium)',
            borderRadius: 'var(--radius-sm)',
            padding:      '16px 18px',
            fontFamily:   'var(--font-cormorant, "Cormorant Garamond", Georgia, serif)',
            fontSize:     '1.1rem',
            fontWeight:   300,
            lineHeight:   1.7,
            color:        'var(--color-text-primary)',
            resize:       'vertical',
          }}
        />

        <div style={{ marginTop: '24px' }}>
          <button
            type="button"
            onClick={onSubmit}
            disabled={!canSubmit}
            style={{
              ...MONO,
              display:    'inline-block',
              color:      '#0A0908',
              background: 'var(--color-gold)',
              border:     'none',
              padding:    '14px 28px',
              cursor:     canSubmit ? 'pointer' : 'default',
              opacity:    canSubmit ? 1 : 0.4,
              transition: 'background 250ms ease',
            }}
            onMouseEnter={e => { if (canSubmit) (e.currentTarget as HTMLElement).style.background = 'var(--color-gold-light)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--color-gold)' }}
          >
            Show me the difference.
          </button>
        </div>

        {/* The two panels appear on submit */}
        <div aria-live="polite">
          {answered !== null && (
            <>
            <div
              className="contrast-panels"
              style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginTop: '56px' }}
            >
              {/* Left: what one answer can do — return a fact */}
              <div
                className="contrast-panel"
                style={{ border: '1px solid var(--color-border-medium)', background: 'var(--color-surface)', padding: 'clamp(28px,3vw,40px)' }}
              >
                <p style={{ ...MONO, color: 'var(--color-gold-on-light)', marginBottom: '20px' }}>
                  After one answer
                </p>
                {/* Visitor input. React renders this as a text node (textContent
                    semantics); we never pass visitor input to dangerouslySetInnerHTML. */}
                <p
                  style={{
                    ...SERIF,
                    fontSize:   '1.25rem',
                    fontWeight: 300,
                    lineHeight: 1.7,
                    color:      'var(--color-text-primary)',
                    whiteSpace: 'pre-wrap',
                    margin:     '0 0 24px',
                  }}
                >
                  {answered}
                </p>
                <p style={{ ...SERIF, fontSize: '1rem', fontStyle: 'italic', fontWeight: 300, lineHeight: 1.7, color: 'var(--color-text-secondary)', margin: 0 }}>
                  {LEFT_NOTE}
                </p>
              </div>

              {/* Right: what a full archive can do — answer from how they reasoned */}
              <div
                className="contrast-panel"
                style={{ border: '1px solid var(--color-gold-border)', background: 'var(--color-gold-subtle)', padding: 'clamp(28px,3vw,40px)' }}
              >
                <p style={{ ...MONO, color: 'var(--color-gold-on-light)', marginBottom: '20px' }}>
                  After two hundred deposits
                </p>
                {ILLUSTRATION[audience].map((para, i) => (
                  <p
                    key={i}
                    style={{ ...SERIF, fontSize: '1.25rem', fontWeight: 300, lineHeight: 1.7, color: 'var(--color-text-primary)', margin: i === 0 ? '0 0 16px' : '0 0 24px' }}
                  >
                    {para}
                  </p>
                ))}
                <p style={{ ...MONO, fontSize: '0.5rem', color: 'var(--color-text-muted)', margin: 0 }}>
                  {ILLUSTRATION_CAPTION}
                </p>
              </div>
            </div>

            {/* Closing */}
            <div className="contrast-panel" style={{ marginTop: '56px', maxWidth: '640px' }}>
              <p style={{ ...SERIF, fontSize: 'clamp(1.5rem,2.8vw,2.1rem)', fontWeight: 300, lineHeight: 1.3, color: 'var(--color-text-primary)', margin: '0 0 16px' }}>
                {CLOSING_LINE}
              </p>
              <p style={{ ...SERIF, fontSize: '1.15rem', fontStyle: 'italic', fontWeight: 300, lineHeight: 1.7, color: 'var(--color-text-secondary)', margin: 0 }}>
                {CLOSING_SUB}
              </p>
            </div>
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes contrastReveal {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .contrast-reveal { animation: contrastReveal 600ms cubic-bezier(0.16,1,0.3,1) both; }
        .contrast-panel  { animation: contrastReveal 600ms cubic-bezier(0.16,1,0.3,1) both; }
        .contrast-demo :focus-visible {
          outline: 2px solid var(--color-gold-on-light);
          outline-offset: 2px;
        }
        @media (max-width: 767px) {
          .contrast-panels { grid-template-columns: 1fr !important; }
        }
        @media (prefers-reduced-motion: reduce) {
          .contrast-reveal, .contrast-panel { animation: none !important; }
        }
      `}</style>
    </section>
  )
}

function ContrastDemoInner() {
  const searchParams = useSearchParams()
  const raw = searchParams.get('audience')
  const audience: Audience | null = raw === 'founder' || raw === 'family' ? raw : null

  // Hidden until an audience is chosen. Keyed by audience so switching paths
  // remounts and fully resets the demo (cleared input and hidden panels).
  if (!audience) return null
  return <ContrastDemoSection key={audience} audience={audience} />
}

export default function ContrastDemo() {
  // useSearchParams requires a Suspense boundary in the App Router. Mirrors the
  // pattern in TwoPathsSection / app/begin/tier/page.tsx.
  return (
    <Suspense fallback={null}>
      <ContrastDemoInner />
    </Suspense>
  )
}
