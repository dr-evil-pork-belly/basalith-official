import Section, { mono, serif } from './Section'

// Fixed copy. This section has no audience variants.
const PILLARS = [
  {
    n:     '01',
    title: 'The fingerprint.',
    body:  'Your reasoning, fixed from your own deposits. It does not drift.',
  },
  {
    n:     '02',
    title: 'The living layer.',
    body:  "Your successor adds today's reality. The judgment stays yours; the context stays current.",
  },
  {
    n:     '03',
    title: 'The handoff.',
    body:  'They consult how you decided on the calls that matter, long after you have stepped back.',
  },
]

export default function SuccessionSection() {
  return (
    <Section tone="dark" align="left" reveal ariaLabel="What succession preserves">

      {/* Editorial spine: sticky lede on the left, prose on the right */}
      <div className="editorial" style={{ marginBottom: 'var(--space-6)' }}>
        <div className="editorial-lede">
          <p style={{ ...mono, fontSize: 'var(--eyebrow-size)', letterSpacing: 'var(--eyebrow-tracking)', color: 'var(--color-gold)', marginBottom: 'var(--space-4)' }}>
            WHAT SUCCESSION PRESERVES
          </p>
          <h2 style={{ ...serif, fontSize: 'var(--text-section)', fontWeight: 300, lineHeight: 1.15, letterSpacing: '-0.02em', color: 'var(--text-on-dark)', margin: 0 }}>
            What built the company was never written down.
          </h2>
        </div>

        {/* Prose sizes/line-height come from .editorial-prose p in globals.css */}
        <div className="editorial-prose">
          <p style={{ ...serif, fontWeight: 300, color: 'var(--text-on-dark-2)', margin: '0 0 var(--space-4)' }}>
            It is in which deals you walked away from. The hires you trusted against the resume. When you held the line, and when you bent it.
          </p>
          <p style={{ ...serif, fontWeight: 300, color: 'var(--text-on-dark-2)', margin: '0 0 var(--space-4)' }}>
            Decades of calls that looked like instinct and were really pattern.
          </p>
          <p style={{ ...serif, fontWeight: 300, color: 'var(--text-on-dark)', margin: '0 0 var(--space-4)' }}>
            Basalith captures it while you are still making those calls. So the people who take over can ask how you would decide, instead of guessing.
          </p>
          {/* Emphasis: the only italic in the section; size overrides .editorial-prose p */}
          <p style={{ ...serif, fontSize: '1.32rem', fontStyle: 'italic', fontWeight: 300, color: 'var(--color-gold)', whiteSpace: 'pre-line', margin: 0 }}>
            We built this so the judgment outlasts the tenure.
          </p>
        </div>
      </div>

      {/* Rule divider above the pillars */}
      <div aria-hidden="true" style={{ width: '40px', height: '1px', background: 'var(--color-gold)', margin: '0 0 var(--space-5)' }} />

      {/* Three pillars — full-width siblings below the editorial grid */}
      <div className="succession-pillars" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-5)' }}>
        {PILLARS.map(({ n, title, body }) => (
          <div key={n} className="pillar" data-reveal>
            <p style={{ ...mono, fontSize: 'var(--eyebrow-size)', color: 'var(--color-gold)', marginBottom: 'var(--space-3)' }}>
              {n}
            </p>
            <h3 style={{ ...serif, fontSize: '1.4rem', fontWeight: 500, color: 'var(--text-on-dark)', marginBottom: '20px', lineHeight: 1.2 }}>
              {title}
            </h3>
            {/* Pillar body size/line-height come from .pillar p in globals.css */}
            <p style={{ ...serif, fontWeight: 300, color: 'var(--text-on-dark-3)', whiteSpace: 'pre-line', margin: 0 }}>
              {body}
            </p>
          </div>
        ))}
      </div>

      <style>{`
        @media (max-width: 768px) {
          .succession-pillars { grid-template-columns: 1fr !important; gap: var(--space-5) !important; }
        }
      `}</style>
    </Section>
  )
}
