import Section, { mono, serif } from './Section'

type Item = { title: string; body: string }

// Plain facts, no defensive tone. Directly answers the "AI chatbot wrapper" doubt.
// One fixed set for everyone (no audience variants).
const ITEMS: Item[] = [
  {
    title: 'Not reconstructed after the fact.',
    body:  'Basalith is built while the operator is active and fully participating. Not assembled from old messages once they are gone.',
  },
  {
    title: 'Not a wrapper on a general AI.',
    body:  "Every entity is trained exclusively on one person's deposits. Their voice, their words, their specific way of thinking. No general model speaks for your archive.",
  },
  {
    title: 'Not a data broker.',
    body:  'Your archive data is never shared, never sold, and never used to train models for other users. Ever.',
  },
  {
    title: 'Not a startup with your memories.',
    body:  'You own your archive completely. You can export all of it at any time. Because the archive is yours to hold, nothing is stranded if we ever close.',
  },
]

export default function WhatBasalithIsNot() {
  return (
    <Section tone="dark" align="left" ariaLabel="What Basalith is not">

      {/* Editorial spine: sticky lede on the left, stacked refusals on the right */}
      <div className="editorial">
        <div className="editorial-lede">
          <p style={{ ...mono, fontSize: 'var(--eyebrow-size)', letterSpacing: 'var(--eyebrow-tracking)', color: 'var(--color-gold)', marginBottom: 'var(--space-4)' }}>
            WHAT BASALITH IS NOT
          </p>
          {/* Same treatment as the Philosophy heading */}
          <h2 style={{ ...serif, fontSize: 'var(--text-section)', fontWeight: 300, lineHeight: 1.15, letterSpacing: '-0.02em', color: 'var(--text-on-dark)', margin: 0 }}>
            Trust is the whole product.
          </h2>
        </div>

        {/* Single stacked column; .neg h3 / .neg p sizing comes from globals.css */}
        <div className="negations">
          {ITEMS.map(item => (
            <div key={item.title} className="neg" style={{ borderLeft: '3px solid rgba(196,162,74,0.5)', paddingLeft: 'clamp(20px,3vw,32px)' }}>
              <h3 style={{ ...serif, fontWeight: 300, color: 'var(--text-on-dark)', letterSpacing: '-0.01em', lineHeight: 1.2, margin: '0 0 10px' }}>
                {item.title}
              </h3>
              <p style={{ ...serif, fontWeight: 300, color: 'var(--text-on-dark-2)', margin: 0 }}>
                {item.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </Section>
  )
}
