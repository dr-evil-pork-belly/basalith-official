import Link from 'next/link'
import { mono, serif, StoneInvert } from './StonePrimitives'

// The personal path, October 6, 2026. Replaces HomeSecondDoor on the homepage.
// See docs/LAUNCH_REVENUE_2026-10-06.md.
//
// HomeSecondDoor framed this path as where Basalith began ("Basalith began with
// families") and sent the visitor to /families. This block frames it for the
// owner and the professional, and sends them to /begin, the first call. The
// family page is one link below the button.
//
// The frame is the founder's own, from September 15, 2026: a life is not split
// into a business half and a personal half. Every mechanism sentence here is
// one the product keeps today: the first call length is the one /begin states,
// the answer and the refusal are the proof card, and nothing is charged before
// it.
//
// HomeSecondDoor.tsx is left in place, unused, per annotate over delete.
export default function HomePersonal() {
  return (
    <section aria-label="For one person">
      <StoneInvert>
        <p style={{ ...mono, color: 'var(--color-gold)', margin: 0 }}>
          For one person
        </p>

        <h2
          style={{
            ...serif,
            fontSize:      'var(--stone-fs-h2-door)',
            fontWeight:    400,
            lineHeight:    1.14,
            letterSpacing: '-0.02em',
            color:         'var(--stone-invert-fg)',
            margin:        0,
            textWrap:      'pretty',
          }}
        >
          You do not keep one mind for work and another for home.
        </h2>

        <p
          style={{
            ...serif,
            fontSize:   'var(--stone-fs-body)',
            fontWeight: 400,
            lineHeight: 1.55,
            color:      'var(--stone-invert-body)',
            margin:     0,
          }}
        >
          The calls you make about money, people, and risk come from the same place. A Basalith holds how you make them, in your own words, while you are still the one who can say why.
        </p>

        <p
          style={{
            ...serif,
            fontSize:   'var(--stone-fs-body)',
            fontWeight: 400,
            lineHeight: 1.55,
            color:      'var(--stone-invert-body)',
            margin:     0,
          }}
        >
          Begin with the hardest call you ever made. Fifteen to thirty minutes, by voice or typed, on your own time. Then your Basalith answers one question in your own words and declines one it has no grounds for. Where the record is silent, it says so.
        </p>

        <Link
          href="/begin"
          className="stone-cta"
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
          }}
        >
          Begin with one call
        </Link>

        <p
          style={{
            ...serif,
            fontSize:   'var(--stone-fs-note)',
            fontWeight: 400,
            lineHeight: 1.5,
            color:      'var(--stone-invert-body)',
            margin:     0,
          }}
        >
          Nothing is owed until you have seen it.{' '}
          <Link href="/pricing" style={{ color: 'var(--color-gold)', textDecoration: 'none' }}>
            Pricing
          </Link>
          {' '}&middot;{' '}
          <Link href="/families" style={{ color: 'var(--color-gold)', textDecoration: 'none' }}>
            For a family
          </Link>
        </p>
      </StoneInvert>
    </section>
  )
}
