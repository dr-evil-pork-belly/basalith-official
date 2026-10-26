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
// October 23, 2026: the business door now leads with the dependency report,
// not with succession. An owner will not buy a "transfer" before anyone has
// shown him what would be lost; the report is that showing, and a Basalith is
// what closes the gap it names. Succession stays one link away inside the same
// card. The personal door says the same method works for a parent, which is
// real today through /begin. Record: docs/OWNER_BUYER_2026-10-23.md.
type Door = {
  label: string
  title: string
  body:  string
  href:  string
  cta:   string
  also?: { href: string; text: string }
}

const DOORS: Door[] = [
  {
    label: 'If you own the business',
    title: 'Find out how much of it runs through you.',
    body:  'Eight calls with you, one for each area of how the business runs. The report shows which decisions run through you, and which of those are on the record. You read it first.',
    href:  '/dependency-report',
    cta:   'See the dependency report',
    also:  { href: '/succession', text: 'Handing the business to a successor or a buyer? See how succession works' },
  },
  {
    label: 'One person',
    title: 'For your own judgment.',
    body:  'The calls you make at work and at home come from the same place. It starts with one call, and nothing is owed until your Basalith has answered you. It works the same for a parent whose thinking you want to keep.',
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
              {d.also && (
                <Link
                  href={d.also.href}
                  style={{
                    ...serif,
                    fontSize:   'var(--stone-fs-row-body)',
                    fontWeight: 400,
                    lineHeight: 1.45,
                    color:      'var(--stone-secondary)',
                    textAlign:  'center',
                  }}
                >
                  {d.also.text}
                </Link>
              )}
            </StoneCard>
          ))}
        </div>

        {/* Founder line, October 20, 2026. A visitor who searched the name and
            found little had no person to attach the product to. Every claim
            here is real: /about, and the OSF Stage 1 registration filed
            September 2, 2026 (osf.io/25srd), which tests the refusal behavior.
            The registration is under embargo, so it is named but not linked.
            Restore the link when the embargo lifts.
            Record: docs/HOMEPAGE_CATEGORY_2026-10-20.md.
            October 26, 2026: credentials cut (D.B.A., affiliation). Name and
            the OSF claim stay. Record: docs/FOUNDER_DETAILS_CUT_2026-10-26.md. */}
        <p
          style={{
            ...serif,
            fontSize:   'var(--stone-fs-row-body)',
            fontWeight: 400,
            lineHeight: 1.5,
            color:      'var(--stone-secondary)',
            margin:     '8px 0 0',
            textWrap:   'pretty',
          }}
        >
          Built by David Ha. The study that tests its refusals is preregistered
          on OSF.{' '}
          <Link href="/about" style={{ color: 'var(--stone-ink)' }}>About the founder</Link>
        </p>
      </StoneBlock>
    </section>
  )
}
