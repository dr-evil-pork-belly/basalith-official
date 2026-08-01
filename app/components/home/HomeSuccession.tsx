import { mono, serif, StoneBlock, StoneRow, StoneLabelRow } from './StonePrimitives'

// Live copy, unchanged, from SuccessionSection. Rendered in direction 1d's
// primitives: the padded light block for the editorial spine, the numbered
// hairline list for the pillars, the label row for the two transitions.
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

const TRANSITIONS = [
  { label: 'Acquisition', body: 'You paid for how it was run. Make sure that transfers.' },
  { label: 'Succession',  body: 'The successor gets the systems. Hand forward the thinking.' },
]

export default function HomeSuccession() {
  return (
    <section aria-label="What succession preserves">

      <StoneBlock>
        <p style={{ ...mono, color: 'var(--color-gold)', margin: 0 }}>
          What succession preserves
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
            textWrap:      'pretty',
          }}
        >
          What built the company was never written down.
        </h2>

        <p style={{ ...serif, fontSize: '16px', fontWeight: 300, lineHeight: 1.5, color: 'var(--stone-body)', margin: 0 }}>
          It is in which deals you walked away from. The hires you trusted against the resume. When you held the line, and when you bent it.
        </p>
        <p style={{ ...serif, fontSize: '16px', fontWeight: 300, lineHeight: 1.5, color: 'var(--stone-body)', margin: 0 }}>
          Decades of calls that looked like instinct and were really pattern.
        </p>
        <p style={{ ...serif, fontSize: '16px', fontWeight: 300, lineHeight: 1.5, color: 'var(--stone-ink)', margin: 0 }}>
          Basalith captures it while you are still making those calls. So the people who take over can ask how you would decide, instead of guessing.
        </p>
        <p
          style={{
            ...serif,
            fontSize:   '18px',
            fontStyle:  'italic',
            fontWeight: 300,
            lineHeight: 1.5,
            color:      'var(--color-gold)',
            margin:     0,
          }}
        >
          We built this so the judgment outlasts the tenure.
        </p>
      </StoneBlock>

      {/* Numbered hairline list, 1d slot 4. */}
      <StoneBlock gap="0" style={{ paddingTop: 0 }}>
        {PILLARS.map(p => (
          <StoneRow key={p.n} n={p.n} title={p.title} body={p.body} />
        ))}
      </StoneBlock>

      {/* The two transitions, same hairline row without the number column. */}
      <StoneBlock gap="0" style={{ paddingTop: 0 }}>
        {TRANSITIONS.map(t => (
          <StoneLabelRow key={t.label} label={t.label} body={t.body} />
        ))}
      </StoneBlock>
    </section>
  )
}
