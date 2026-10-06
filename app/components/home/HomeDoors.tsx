import Link from 'next/link'
import { mono, serif, StoneBlock, StoneCard } from './StonePrimitives'

// The two doors, October 6, 2026. See docs/LAUNCH_REVENUE_2026-10-06.md.
//
// Until this date the homepage had one door above the fold and a block near the
// bottom labeled "The second door." The personal path is the only one a visitor
// can begin without a conversation, so it now sits beside the business path,
// directly under the hero, at the same size and in the same card.
//
// Built from StoneCard, one of the four block types direction 1d defines. The
// grid is auto-fit, so the cards sit side by side from roughly 600px up and
// stack below that with no media query.
//
// This block carries id="audience" because it is now the place a visitor
// chooses a path. scrollToAudience targets that id.
const DOORS = [
  {
    label: 'A business changing hands',
    title: 'For an acquisition or a succession.',
    body:  'How the operator decides, captured before the handoff, for the people who take over. It starts with a conversation.',
    href:  '/succession',
    cta:   'See how it transfers',
  },
  {
    label: 'One person',
    title: 'For your own judgment.',
    body:  'For anyone whose work is the calls they make, in a company, a practice, or a family. It starts with one call, and nothing is owed until your Basalith has answered you.',
    href:  '/begin',
    cta:   'Begin with one call',
  },
]

export default function HomeDoors() {
  return (
    <section id="audience" aria-label="Two ways to begin">
      <StoneBlock gap="20px" style={{ paddingTop: 0 }}>
        <div
          style={{
            display:             'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap:                 '16px',
          }}
        >
          {DOORS.map(d => (
            <StoneCard key={d.href} label={d.label}>
              <h2
                style={{
                  ...serif,
                  fontSize:      'var(--stone-fs-h3)',
                  fontWeight:    400,
                  lineHeight:    1.2,
                  letterSpacing: '-0.01em',
                  color:         'var(--stone-ink)',
                  margin:        0,
                  textWrap:      'pretty',
                }}
              >
                {d.title}
              </h2>
              <p
                style={{
                  ...serif,
                  fontSize:   'var(--stone-fs-row-body)',
                  fontWeight: 400,
                  lineHeight: 1.5,
                  color:      'var(--stone-body)',
                  margin:     0,
                  flex:       1,
                }}
              >
                {d.body}
              </p>
              <Link
                href={d.href}
                style={{
                  ...mono,
                  display:        'block',
                  textAlign:      'center',
                  textDecoration: 'none',
                  color:          'var(--btn-label)',
                  background:     'var(--btn)',
                  padding:        '15px',
                  minHeight:      '48px',
                  boxSizing:      'border-box',
                  marginTop:      '4px',
                }}
              >
                {d.cta}
              </Link>
            </StoneCard>
          ))}
        </div>
      </StoneBlock>
    </section>
  )
}
