import type { Metadata } from 'next'
import Link   from 'next/link'
import Nav    from '../components/Nav'
import Footer from '../components/Footer'

// The church door, October 12, 2026. Record: docs/CHURCHES_PAGE_2026-10-12.md.
//
// Every claim on this page restates one that already ships elsewhere on the
// site (/families, /integrity, /begin) or describes the founding proof as it
// runs today. Nothing here says a church uses Basalith, because none does yet.
// No church pricing is stated, because none is set.
//
// Word choices that are deliberate:
//   "machine" in place of the word section 8 keeps off this site, as on
//     /integrity.
//   "your Basalith" and "the record" throughout. "Entity" is left off this
//     page on purpose: to this reader a made thing that speaks as a person is
//     the fear itself.
//   The section "What is underneath" says plainly that a lab's language model
//     sits under the product. That is new on this site and is the founder's
//     call to keep or cut.

export const metadata: Metadata = {
  title:       'For Churches · Basalith',
  description: 'A machine should never put words in a person\'s mouth. Basalith keeps how a pastor or an elder reasons and decides, in their own words. Where they never spoke, it is built to say so.',
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

const KEPT = [
  'The sermons, written and recorded',
  'The minutes, the budgets, and the bylaws',
  'The membership roll',
  'The history told at every anniversary',
]

const LEAVES = [
  'How a divided board was brought back to one table',
  'When to spend the reserve and when to hold it',
  'How a hard conversation with a staff member was opened',
  'Why a ministry was ended, and how its people were told',
]

const LIMITS = [
  {
    title: 'It does not preach.',
    body:  'Basalith was not built to write sermons or to teach doctrine. It was built to hold how one person made the calls in front of them.',
  },
  {
    title: 'It does not speak past the record.',
    body:  'Your Basalith answers from what you put on the record. Where you never took a position, it is built to say so and stop there.',
  },
  {
    title: 'You decide what goes in.',
    body:  'Nothing reaches your record unless you or someone you invite puts it there. What was told to you in confidence stays where it was told.',
  },
  {
    title: 'It belongs to you.',
    body:  'Your Basalith is never shared, sold, or used to train another company\'s model. You can export all of it at any time.',
  },
]

const DOORS = [
  {
    label: 'One person',
    title: 'For a pastor or an elder.',
    body:  'It starts with one call about a hard decision you made. Fifteen to thirty minutes, by voice or typed, on your own time. Nothing is owed until your Basalith has answered you.',
    href:  '/begin',
    cta:   'Take the first call',
  },
  {
    label: 'A church',
    title: 'For a church planning a handover.',
    body:  'When a long serving pastor prepares to pass the work on, the judgment can be captured before the handoff, for the people who take over. It starts with a conversation with the founder.',
    href:  '/contact',
    cta:   'Start the conversation',
  },
]

export default function ChurchesPage() {
  return (
    <>
      <Nav />
      <main style={{ background: 'var(--color-bg)' }}>

        {/* Hero */}
        <section style={{ padding: `clamp(140px,16vw,200px) ${PAD} clamp(64px,8vw,96px)`, maxWidth: '820px' }}>
          <p style={{ ...MONO, fontSize: 'var(--text-caption)', color: 'var(--color-gold)', marginBottom: '28px' }}>
            Basalith for Churches
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
            A machine should never put words in a person&rsquo;s mouth.
          </h1>
          <p style={{ ...BODY, fontSize: '1.2rem', maxWidth: '620px' }}>
            Basalith keeps how a person reasons and decides, in their own words, while they
            are here to give it. Where they never spoke, it is built to say so.
          </p>
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'center', marginTop: '36px' }}>
            <Link href="/begin" style={BTN}>
              Take the first call
            </Link>
            <Link href="/integrity" style={{ ...MONO, fontSize: '0.72rem', color: 'var(--color-gold)', textDecoration: 'none' }}>
              Read the Integrity Promise <span aria-hidden="true">&rarr;</span>
            </Link>
          </div>
        </section>

        {/* Section 1. The question in the pews. */}
        <section style={{ padding: `clamp(48px,6vw,72px) ${PAD} clamp(64px,8vw,96px)` }}>
          <div style={{ maxWidth: '680px', margin: '0 auto' }}>
            <p style={{ ...MONO, fontSize: 'var(--text-caption)', color: 'var(--color-gold)', marginBottom: '24px' }}>
              What your people are asking
            </p>
            <h2 style={H2}>The questions have reached the pews.</h2>
            <p style={BODY}>
              People are asking their pastors what these machines are for, and who they answer
              to. Most of what they hear is about machines that speak for people, decide for
              people, and can be made to sound like anyone.
            </p>
            <p style={BODY}>
              Basalith is built on a narrower idea. A machine may hold what a person said. It
              may not speak past it. The person stays the author, and the machine stays the
              record.
            </p>
          </div>
        </section>

        {/* Section 2. The refusal. Describes the founding proof as it runs
            after call 1: one answer with the deposit shown, one refusal. */}
        <section className="section-dark" style={{ background: 'var(--color-void)', padding: `clamp(64px,8vw,96px) ${PAD}` }}>
          <div style={{ maxWidth: '680px', margin: '0 auto' }}>
            <p style={{ ...MONO, fontSize: 'var(--text-caption)', color: 'var(--color-gold)', marginBottom: '24px' }}>
              The part to watch
            </p>
            <h2 style={{ ...H2, color: 'var(--on-dark)' }}>Watch what it refuses.</h2>
            <p style={{ ...BODY, color: 'var(--on-dark-2)' }}>
              The first call is one conversation about a hard decision you made. When you are
              done, your Basalith does two things.
            </p>
            {[
              'It answers one question in your own words, and shows you the words of yours it drew from.',
              'It declines one question, because you never took a position on it, and it will not make one up for you.',
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                <span style={{ ...MONO, fontSize: '0.78rem', color: 'var(--color-gold)', paddingTop: '5px', flexShrink: 0 }}>0{i + 1}</span>
                <p style={{ ...BODY, color: 'var(--on-dark)', margin: 0 }}>{item}</p>
              </div>
            ))}
            <p style={{ ...BODY, color: 'var(--on-dark-2)', marginTop: '24px' }}>
              The second one is the reason to trust the first. A record that will tell you it
              has nothing is a record you can believe when it speaks.
            </p>
          </div>
        </section>

        {/* Section 3. What a church keeps, and what leaves. */}
        <section style={{ padding: `clamp(64px,8vw,96px) ${PAD}` }}>
          <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            <p style={{ ...MONO, fontSize: 'var(--text-caption)', color: 'var(--color-gold)', marginBottom: '24px' }}>
              When a pastor passes the work on
            </p>
            <h2 style={{ ...H2, maxWidth: '720px' }}>
              A church keeps the sermons. It rarely keeps how the hard calls were made.
            </h2>
            <div className="churches-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '40px' }}>
              <div style={{ border: '1px solid var(--color-border)', padding: 'clamp(24px,3vw,36px)', background: 'var(--color-surface)' }}>
                <p style={{ ...MONO, fontSize: '0.72rem', color: 'var(--color-text-secondary)', marginBottom: '20px' }}>
                  What a church keeps
                </p>
                {KEPT.map(item => (
                  <p key={item} style={{ ...BODY, fontSize: '1rem', lineHeight: 1.7, marginBottom: '12px' }}>{item}</p>
                ))}
              </div>
              <div style={{ border: '1px solid rgba(160,132,80,0.3)', padding: 'clamp(24px,3vw,36px)', background: 'rgba(160,132,80,0.03)' }}>
                <p style={{ ...MONO, fontSize: '0.72rem', color: 'var(--color-gold)', marginBottom: '20px' }}>
                  What usually leaves
                </p>
                {LEAVES.map(item => (
                  <p key={item} style={{ ...BODY, fontSize: '1rem', lineHeight: 1.7, color: 'var(--color-text-primary)', marginBottom: '12px' }}>{item}</p>
                ))}
              </div>
            </div>
            <p style={{ ...BODY, maxWidth: '680px', marginTop: '32px', marginBottom: 0 }}>
              Thirty years of leading people is thirty years of calls like these. They are
              not written down anywhere, and the next pastor will face every one of them.
            </p>
          </div>
        </section>

        {/* Section 4. The limits. */}
        <section className="section-dark" style={{ background: 'var(--color-void)', padding: `clamp(64px,8vw,96px) ${PAD}` }}>
          <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            <p style={{ ...MONO, fontSize: 'var(--text-caption)', color: 'var(--color-gold)', marginBottom: '24px' }}>
              The lines it holds
            </p>
            <h2 style={{ ...H2, color: 'var(--on-dark)' }}>What it will not do.</h2>
            <div className="churches-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px 24px', marginTop: '40px' }}>
              {LIMITS.map(({ title, body }) => (
                <div key={title} style={{ borderLeft: '3px solid rgba(160,132,80,0.5)', paddingLeft: 'clamp(20px,3vw,28px)' }}>
                  <h3 style={{ ...SERIF, fontSize: '1.25rem', fontWeight: 400, color: 'var(--on-dark)', lineHeight: 1.25, margin: '0 0 10px' }}>{title}</h3>
                  <p style={{ ...SERIF, fontSize: '1rem', fontWeight: 400, lineHeight: 1.8, color: 'var(--on-dark-2)', margin: 0 }}>{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Section 5. What is underneath. */}
        <section style={{ padding: `clamp(64px,8vw,96px) ${PAD}` }}>
          <div style={{ maxWidth: '680px', margin: '0 auto' }}>
            <p style={{ ...MONO, fontSize: 'var(--text-caption)', color: 'var(--color-gold)', marginBottom: '24px' }}>
              What is underneath
            </p>
            <h2 style={H2}>You should know what this runs on.</h2>
            <p style={BODY}>
              Underneath, Basalith uses a language model made by one of the large labs. We did
              not build that model, and we will not tell you otherwise.
            </p>
            <p style={BODY}>
              What we built is everything around it. The questions that draw out how you
              decide. The record that holds your answers. And the rule that your Basalith
              answers from that record, and is built to say so where the record is silent.
            </p>
            <p style={{ ...BODY, marginBottom: 0 }}>
              If your board asks what is underneath, that is the whole answer. The engineering
              is written up at{' '}
              <a href="https://basalith.xyz" style={{ color: 'var(--color-gold)', textDecoration: 'none' }}>basalith.xyz</a>.
            </p>
          </div>
        </section>

        {/* Section 6. Two ways to begin. */}
        <section style={{ padding: `0 ${PAD} clamp(64px,8vw,96px)` }}>
          <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            <p style={{ ...MONO, fontSize: 'var(--text-caption)', color: 'var(--color-gold)', marginBottom: '24px' }}>
              Two ways to begin
            </p>
            <div className="churches-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {DOORS.map(d => (
                <div key={d.href} style={{ border: '1px solid var(--color-border)', padding: 'clamp(24px,3vw,36px)', background: 'var(--color-surface)', display: 'flex', flexDirection: 'column' }}>
                  <p style={{ ...MONO, fontSize: '0.72rem', color: 'var(--color-gold)', marginBottom: '16px' }}>{d.label}</p>
                  <h3 style={{ ...SERIF, fontWeight: 400, fontSize: '1.4rem', lineHeight: 1.2, color: 'var(--color-text-primary)', margin: '0 0 12px' }}>{d.title}</h3>
                  <p style={{ ...SERIF, fontWeight: 400, fontSize: '1rem', lineHeight: 1.8, color: 'var(--color-text-secondary)', margin: '0 0 24px', flex: 1 }}>{d.body}</p>
                  <Link href={d.href} style={{ ...BTN, display: 'block', textAlign: 'center', padding: '15px', minHeight: '48px', boxSizing: 'border-box' }}>
                    {d.cta}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Section 7. From the founder. His account of why this page exists. */}
        <section className="section-dark" style={{ background: 'var(--color-void)', padding: `clamp(64px,8vw,96px) ${PAD}` }}>
          <div style={{ maxWidth: '680px', margin: '0 auto' }}>
            <p style={{ ...MONO, fontSize: 'var(--text-caption)', color: 'var(--color-gold)', marginBottom: '24px' }}>
              From the founder
            </p>
            <p style={{ ...BODY, color: 'var(--on-dark-2)' }}>
              A pastor looked at this site and told me it had nothing for churches. He was
              right. This page is the answer, and I would like to hear where it falls short.
            </p>
            <p style={{ ...BODY, color: 'var(--on-dark-2)' }}>
              Write to me at{' '}
              <a href="mailto:hello@basalith.xyz" style={{ color: 'var(--on-dark)', textDecoration: 'underline' }}>hello@basalith.xyz</a>.
              You will get a straight answer.
            </p>
            <p style={{ ...MONO, fontSize: 'var(--text-caption)', color: 'var(--on-dark-2)', marginTop: '28px' }}>
              David Ha, Founder
            </p>
          </div>
        </section>

        {/* Closing CTA */}
        <section className="section-dark" style={{ background: 'var(--color-void)', padding: `clamp(64px,8vw,96px) ${PAD} clamp(80px,10vw,128px)`, textAlign: 'center', borderTop: '1px solid rgba(247,245,241,0.06)' }}>
          <div style={{ maxWidth: '640px', margin: '0 auto' }}>
            <p style={{
              ...SERIF,
              fontSize:      'clamp(1.6rem,3.2vw,2.4rem)',
              fontWeight:    400,
              lineHeight:    1.3,
              letterSpacing: '-0.02em',
              color:         'var(--on-dark)',
              marginBottom:  '36px',
            }}>
              See what it does with your own words. Then see what it will not say.
            </p>
            <Link href="/begin" style={{ ...BTN, padding: '16px 48px' }}>
              Take the first call
            </Link>
            <p style={{ ...SERIF, fontSize: '0.95rem', fontStyle: 'italic', fontWeight: 400, lineHeight: 1.8, color: 'var(--on-dark-3)', margin: '28px 0 0' }}>
              No application and no approval. Your name, your email, and the first call.
              Nothing is owed until your Basalith has answered you.
            </p>
          </div>
        </section>

      </main>
      <Footer />

      <style>{`
        @media (max-width: 720px) {
          .churches-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </>
  )
}
