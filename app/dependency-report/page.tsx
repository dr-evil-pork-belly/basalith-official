import type { Metadata } from 'next'
import Link   from 'next/link'
import Nav    from '../components/Nav'
import Footer from '../components/Footer'

// The dependency report door, October 23, 2026. Record:
// docs/OWNER_BUYER_2026-10-23.md.
//
// This is a request door, not an order page. Payment, the release step, and
// the buyer's view are not built (see docs/DEPENDENCY_REPORT_SLICE_4A_2026-10-08.md),
// so every button here goes to /contact?intent=report and the founder sets up
// each report by hand, the way the October 8 live test was set up.
//
// Every mechanism sentence below points at shipped code:
//   eight calls             the minimum record of one area call per business
//                           domain (lib/dependencyReport.ts, areasCaptured)
//   the eight areas         lib/b2bDomains.ts
//   two readings            DEPENDENCY (lib/dependencyIntake.ts, labeled as
//                           stated by the owner) and CAPTURE (lib/coverageRun.ts)
//   measured twice          two distinct coverage runs, both counts printed
//                           where they differ (lib/dependencyReport.ts)
//   silent areas, no score  lib/dependencyReport.ts; guard in
//                           lib/assessmentGates.test.ts
//   you read it first       /archive/assessment/report is the only reader;
//                           there is no buyer view yet
//   the limits              the "What this report is, and is not" panel in
//                           ReportView.tsx
//
// The price. October 23, 2026, David: one price, $5,000, whoever orders it
// (supersedes the October 9 owner price of $1,500). Nothing in the code charges
// it yet; each order is set up by hand with amount_cents = 500000. Also absent: deposits quoted as evidence, because the
// report does not show any (no pipeline step attributes an answer to a deposit).
//
// The research figures are the paper's own: Smith, Yagan, Zidar, and Zwick,
// Quarterly Journal of Economics 134(4), 2019.

export const metadata: Metadata = {
  title:       'The Dependency Report · Basalith',
  description: 'For the owner of a closely held business. Eight calls, one for each area of how the business runs. The report shows which decisions run through you, and which of those are on the record. You read it first. $5,000.',
}

const SERIF: React.CSSProperties = {
  fontFamily: 'var(--font-newsreader), Georgia, serif',
}
const MONO: React.CSSProperties = {
  fontFamily:    'var(--font-space-mono)',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.18em',
}
const BODY: React.CSSProperties = {
  ...SERIF,
  fontWeight:   400,
  fontSize:     '1.1rem',
  lineHeight:   1.9,
  color:        'var(--color-text-secondary)',
  marginBottom: '16px',
}
const H2: React.CSSProperties = {
  ...SERIF,
  fontWeight:    400,
  fontSize:      'clamp(1.75rem,3vw,2.6rem)',
  lineHeight:    1.15,
  color:         'var(--color-text-primary)',
  letterSpacing: '-0.02em',
  marginBottom:  '24px',
}
const PAD = 'clamp(24px,6vw,80px)'
const BTN: React.CSSProperties = {
  ...MONO,
  fontSize:       'var(--text-caption)',
  display:        'inline-block',
  background:     'var(--btn)',
  color:          'var(--btn-label)',
  textDecoration: 'none',
  padding:        '16px 32px',
}

const CONTACT = '/contact?intent=report'

const STEPS = [
  {
    n:     '01',
    title: 'Eight calls with you.',
    body:  'One for each area of how the business runs: decisions, people, risk, capital, culture, strategy, adversity, and succession. By voice or typed, on your own time.',
  },
  {
    n:     '02',
    title: 'Two readings for every area.',
    body:  'Who makes this kind of call today, in your own words. And how much of your judgment on it is now on the record, measured against a fixed set of questions. Measured twice, and both counts shown where they differ.',
  },
  {
    n:     '03',
    title: 'Where the record is silent, it says so.',
    body:  'An area your record cannot answer is printed as silent. There is no score and no grade, because one number would hide the area that matters.',
  },
  {
    n:     '04',
    title: 'You read it first.',
    body:  'The report is yours. Nobody else sees it unless you decide to share it.',
  },
]

const LIMITS = [
  'It reads what you tell it. It does not look at your staff, your customers, or your books.',
  'Who makes each call is your own statement, and the report labels it that way.',
  'It is not a valuation, and it does not say what the business is worth.',
]

export default function DependencyReportPage() {
  return (
    <>
      <Nav />
      <main style={{ background: 'var(--color-bg)' }}>

        {/* Hero */}
        <section style={{ padding: `clamp(140px,16vw,200px) ${PAD} clamp(64px,8vw,96px)`, maxWidth: '820px' }}>
          <p style={{ ...MONO, fontSize: 'var(--text-caption)', color: 'var(--color-gold)', marginBottom: '28px' }}>
            The Dependency Report
          </p>
          <h1 style={{
            ...SERIF,
            fontWeight:    400,
            fontSize:      'clamp(2.4rem,5vw,3.6rem)',
            lineHeight:    1.08,
            letterSpacing: '-0.025em',
            color:         'var(--color-text-primary)',
            marginBottom:  '32px',
          }}>
            How much of the business leaves when you do?
          </h1>
          <p style={{ ...BODY, fontSize: '1.2rem', maxWidth: '620px' }}>
            The dealership, the distributor, the dental group. The systems are on paper. The
            calls that make them work are in one head. The report shows you which calls those
            are, before a buyer, a lender, or your own family has to find out.
          </p>
          <div style={{ marginTop: '36px' }}>
            <Link href={CONTACT} style={BTN}>
              Request a report
            </Link>
          </div>
        </section>

        {/* Section 1. The research. */}
        <section className="section-dark" style={{ background: 'var(--color-void)', padding: `clamp(64px,8vw,96px) ${PAD}` }}>
          <div style={{ maxWidth: '680px', margin: '0 auto' }}>
            <p style={{ ...MONO, fontSize: 'var(--text-caption)', color: 'var(--color-gold)', marginBottom: '24px' }}>
              What the tax records show
            </p>
            <h2 style={{ ...H2, color: 'var(--on-dark)' }}>
              When the owner of a closely held business retires or dies, its profits fall by about three quarters.
            </h2>
            <p style={{ ...BODY, color: 'var(--on-dark-2)' }}>
              That is what U.S. tax records linking 11 million firms to their owners show. The
              drop is the part of the business that lives in the owner: the work, the
              relationships, the reputation, and the judgment.
            </p>
            <p style={{ ...BODY, color: 'var(--on-dark-2)' }}>
              Judgment is the part that can be put on the record. The report shows how much of
              yours already is.
            </p>
            <p style={{ ...SERIF, fontSize: '0.95rem', fontStyle: 'italic', fontWeight: 400, lineHeight: 1.8, color: 'var(--on-dark-3)', margin: '24px 0 0' }}>
              Smith, Yagan, Zidar, and Zwick,{' '}
              <a href="https://www.nber.org/papers/w25442" rel="noopener" style={{ color: 'var(--on-dark)', textDecoration: 'underline' }}>
                Capitalists in the Twenty-First Century
              </a>
              , Quarterly Journal of Economics, 2019.
            </p>
          </div>
        </section>

        {/* Section 2. How it works. */}
        <section style={{ padding: `clamp(64px,8vw,96px) ${PAD}` }}>
          <div style={{ maxWidth: '680px', margin: '0 auto' }}>
            <p style={{ ...MONO, fontSize: 'var(--text-caption)', color: 'var(--color-gold)', marginBottom: '24px' }}>
              How it works
            </p>
            <h2 style={H2}>Eight calls. One report. No score.</h2>
            {STEPS.map(({ n, title, body }) => (
              <div key={n} style={{ display: 'flex', gap: '20px', padding: '22px 0', borderTop: '1px solid var(--color-border)' }}>
                <span style={{ ...MONO, fontSize: '0.78rem', color: 'var(--color-gold)', paddingTop: '6px', flexShrink: 0 }}>{n}</span>
                <div>
                  <h3 style={{ ...SERIF, fontSize: '1.25rem', fontWeight: 400, color: 'var(--color-text-primary)', lineHeight: 1.25, margin: '0 0 8px' }}>{title}</h3>
                  <p style={{ ...BODY, fontSize: '1rem', lineHeight: 1.8, margin: 0 }}>{body}</p>
                </div>
              </div>
            ))}
            <p style={{ ...BODY, marginTop: '24px', marginBottom: 0 }}>
              $5,000, whoever orders it. You can order it for yourself. A buyer, a lender, or your
              advisor can also ask for one, and you still take the calls and read it first.
            </p>
          </div>
        </section>

        {/* Section 3. The limits, as the report itself prints them. */}
        <section style={{ padding: `0 ${PAD} clamp(64px,8vw,96px)` }}>
          <div style={{ maxWidth: '680px', margin: '0 auto', border: '1px solid var(--color-border)', background: 'var(--color-surface)', padding: 'clamp(24px,4vw,40px)' }}>
            <p style={{ ...MONO, fontSize: '0.72rem', color: 'var(--color-text-secondary)', marginBottom: '20px' }}>
              What the report is not
            </p>
            {LIMITS.map(item => (
              <p key={item} style={{ ...BODY, fontSize: '1rem', lineHeight: 1.7, marginBottom: '12px' }}>{item}</p>
            ))}
          </div>
        </section>

        {/* Section 4. After the report. One buyer, one method: the business
            record and the personal one are the same thing. */}
        <section className="section-dark" style={{ background: 'var(--color-void)', padding: `clamp(64px,8vw,96px) ${PAD}` }}>
          <div style={{ maxWidth: '680px', margin: '0 auto' }}>
            <p style={{ ...MONO, fontSize: 'var(--text-caption)', color: 'var(--color-gold)', marginBottom: '24px' }}>
              After the report
            </p>
            <h2 style={{ ...H2, color: 'var(--on-dark)' }}>The report names the gap. A Basalith closes it.</h2>
            <p style={{ ...BODY, color: 'var(--on-dark-2)' }}>
              An area that runs through you and is not on the record is the exposure. A Succession
              Basalith is how you close it: interviews in the areas the report found thin, a
              separate sign in for the person taking over, and a record they can consult after you
              step back.
            </p>
            <p style={{ ...BODY, color: 'var(--on-dark-2)' }}>
              The same method works for one person. Your own judgment, at work and at home, or a
              parent whose thinking you want to keep.
            </p>
            <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', marginTop: '28px' }}>
              <Link href="/succession" style={{ ...MONO, fontSize: '0.72rem', color: 'var(--color-gold)', textDecoration: 'none' }}>
                How succession works <span aria-hidden="true">&rarr;</span>
              </Link>
              <Link href="/begin" style={{ ...MONO, fontSize: '0.72rem', color: 'var(--color-gold)', textDecoration: 'none' }}>
                Begin one for yourself <span aria-hidden="true">&rarr;</span>
              </Link>
            </div>
          </div>
        </section>

        {/* Section 5. How it starts. */}
        <section style={{ padding: `clamp(64px,8vw,96px) ${PAD} clamp(80px,10vw,128px)` }}>
          <div style={{ maxWidth: '680px', margin: '0 auto' }}>
            <p style={{ ...MONO, fontSize: 'var(--text-caption)', color: 'var(--color-gold)', marginBottom: '24px' }}>
              How it starts
            </p>
            <h2 style={H2}>A short conversation, then the first call.</h2>
            <p style={BODY}>
              Tell us about the business and what is coming: a sale, a successor, a loan, or
              nothing yet. We set up your report from there. We run a small number of reports at
              a time, and the founder reads every one.
            </p>
            <div style={{ marginTop: '32px' }}>
              <Link href={CONTACT} style={BTN}>
                Request a report
              </Link>
            </div>
            <p style={{ ...SERIF, fontSize: '0.95rem', fontWeight: 400, lineHeight: 1.7, color: 'var(--color-text-muted)', margin: '40px 0 0' }}>
              <Link href="/about" style={{ color: 'var(--color-text-primary)' }}>About the founder</Link>
            </p>
          </div>
        </section>

      </main>
      <Footer />
    </>
  )
}
