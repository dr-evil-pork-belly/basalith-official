import Link from 'next/link'
import { mono, serif, StoneInvert } from './StonePrimitives'

// Live copy, unchanged, from SecondDoorSection. Direction 1d's inverted ink
// block, minus the Scope / Deposit / Transfer list that block carried in 1d.
// That list had no live copy and no denominator, so it is not rendered and
// nothing was written to fill the space.
export default function HomeSecondDoor() {
  return (
    <section id="audience" aria-label="The second door">
      <StoneInvert>
        <p style={{ ...mono, color: 'var(--color-gold)', margin: 0 }}>
          The second door
        </p>

        <h2
          style={{
            ...serif,
            fontSize:      'var(--stone-fs-h2-door)',
            fontWeight:    300,
            lineHeight:    1.14,
            letterSpacing: '-0.02em',
            color:         'var(--stone-invert-fg)',
            margin:        0,
          }}
        >
          Basalith began with families.
        </h2>

        <p
          style={{
            ...serif,
            fontSize:   'var(--stone-fs-body)',
            fontStyle:  'italic',
            fontWeight: 300,
            lineHeight: 1.55,
            color:      'var(--stone-invert-body)',
            margin:     0,
          }}
        >
          Before it was a way to hand forward how a business is run, it was a way to preserve how a person thinks while they are still here to get it right. That path is still open. The method is the same.
        </p>

        <Link
          href="/families"
          className="stone-cta"
          style={{
            ...mono,
            display:        'block',
            textAlign:      'center',
            textDecoration: 'none',
            color:          'var(--color-gold)',
            border:         '1px solid var(--color-gold)',
            padding:        '15px',
            minHeight:      '48px',
            boxSizing:      'border-box',
          }}
        >
          For individuals and families
        </Link>
      </StoneInvert>
    </section>
  )
}
