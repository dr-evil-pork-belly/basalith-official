import type { Metadata } from 'next'
import Link   from 'next/link'
import Nav    from '../components/Nav'
import Footer from '../components/Footer'

// The advisor door, October 15, 2026. Record: docs/ADVISOR_DOOR_2026-10-15.md.
//
// /partner was a permanent redirect to /contact from September 14, 2026 (Guide
// recruiting retired) until this page replaced it. The URL is kept because it
// was held in the wild.
//
// Every claim on this page restates one that already ships on /succession,
// /pricing, /integrity, or /begin, or describes the founding proof as it runs
// today, with one exception the founder has already decided but the site did
// not yet state: the Founding fee is waived for a Succession client introduced
// by an advisor (decision of September 24, 2026). This page is the first place
// it is written down publicly. /pricing and /succession do not yet say it.
//
// Deliberately absent: any partner terms, fees, discounts, exclusivity, or
// territory language. Those are decided in a conversation, not read on a page.
// No firm is named as a partner, because none has signed. The key person
// dependency report is not offered here, because its order flow is not live.

export const metadata: Metadata = {
  title:       'For Advisors · Basalith',
  description: 'For M&A advisors, brokers, exit planners, and the CPAs and attorneys in the room a year before the sale. Basalith captures how the owner reasons and decides, in their own words, before the buyer asks.',
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

const CONTACT = '/contact?intent=partner'

const IN_THE_ROOM = [
  'The quality of earnings',
  'The customer list and the contracts',
  'The org chart and the comp plans',
  'The lease, the loan, and the equipment schedule',
]

const NOT_IN_THE_ROOM = [
  'Which customer to call first when a shipment is late, and why',
  'When to hold price and when to give it away',
  'Who in the shop gets the benefit of the doubt, and who does not',
  'What the owner did the last time a key person quit',
]

const CLIENT_GETS = [
  {
    title: 'Basalith Succession, as it ships.',
    body:  'The Founding, then interviews across eight areas of judgment, each seeded on a real moment. The record is built from what the owner did, never from what they say they believe.',
  },
  {
    title: 'Delivered by the founder.',
    body:  'The scoping conversation, the interviews, and the reveal to the successor or buyer are run by Basalith. You introduce the client and stay in the room as much as you want.',
  },
  {
    title: 'The Founding fee waived.',
    body:  'When the introduction comes from you, your client pays the annual plan and nothing else to start.',
  },
  {
    title: 'A record that belongs to the client.',
    body:  'Not to you, and not to us. The owner decides who sees it, and a buyer or successor sees only what the owner lets them see.',
  },
]

const LINES = [
  {
    title: 'No one from Basalith in your pitch.',
    body:  'We do not join your calls, work your pipeline, or sell against you. You run your practice. We run the record.',
  },
  {
    title: 'No reading past the record.',
    body:  'The entity answers from what the owner put down. Where the owner never took a position, it is built to say so and stop. A buyer can rely on what it says because of what it will not say.',
  },
  {
    title: 'No access without consent.',
    body:  'You never see your client\'s record unless your client opens it to you. The same holds for the buyer, the lender, and us.',
  },
  {
    title: 'No claims you cannot repeat.',
    body:  'Everything we say about what Basalith does is on this site and in the engineering at basalith.xyz. If you cannot point to it, do not say it, and neither will we.',
  },
]

export default function PartnerPage() {
  return (
    <>
      <Nav />
      <main style={{ background: 'var(--color-bg)' }}>

        {/* Hero */}
        <section style={{ padding: `clamp(140px,16vw,200px) ${PAD} clamp(64px,8vw,96px)`, maxWidth: '820px' }}>
          <p style={{ ...MONO, fontSize: 'var(--text-caption)', color: 'var(--color-gold)', marginBottom: '28px' }}>
            Basalith for Advisors
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
            The deal that died in the owner&rsquo;s head.
          </h1>
          <p style={{ ...BODY, fontSize: '1.2rem', maxWidth: '620px' }}>
            You have had one. The numbers were clean and the buyer was serious, and the
            business still lived in one person who could not get it out in time. Basalith is
            what you hand that owner at engagement, months before anyone asks.
          </p>
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'center', marginTop: '36px' }}>
            <Link href={CONTACT} style={BTN}>
              Start the conversation
            </Link>
            <Link href="/begin" style={{ ...MONO, fontSize: '0.72rem', color: 'var(--color-gold)', textDecoration: 'none' }}>
              Run the first call on yourself <span aria-hidden="true">&rarr;</span>
            </Link>
          </div>
        </section>

        {/* Section 1. Who this is for. */}
        <section style={{ padding: `clamp(48px,6vw,72px) ${PAD} clamp(64px,8vw,96px)` }}>
          <div style={{ maxWidth: '680px', margin: '0 auto' }}>
            <p style={{ ...MONO, fontSize: 'var(--text-caption)', color: 'var(--color-gold)', marginBottom: '24px' }}>
              Who this is for
            </p>
            <h2 style={H2}>The people in the room a year before the sale.</h2>
            <p style={BODY}>
              M&amp;A advisors and business brokers running a sell side. Exit planners. The CPA
              who has done the owner&rsquo;s return for twenty years and knows a sale is coming
              before anyone else does. The estate attorney drafting the plan the business is
              supposed to outlive.
            </p>
            <p style={BODY}>
              You are the ones who can put this in front of an owner while there is still time
              to use it. By the time a buyer is in diligence, it is late.
            </p>
          </div>
        </section>

        {/* Section 2. The gap. What reaches the data room and what does not. */}
        <section style={{ padding: `0 ${PAD} clamp(64px,8vw,96px)` }}>
          <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            <p style={{ ...MONO, fontSize: 'var(--text-caption)', color: 'var(--color-gold)', marginBottom: '24px' }}>
              The gap
            </p>
            <h2 style={{ ...H2, maxWidth: '720px' }}>
              The data room holds the business. It does not hold the owner.
            </h2>
            <div className="partner-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '40px' }}>
              <div style={{ border: '1px solid var(--color-border)', padding: 'clamp(24px,3vw,36px)', background: 'var(--color-surface)' }}>
                <p style={{ ...MONO, fontSize: '0.72rem', color: 'var(--color-text-secondary)', marginBottom: '20px' }}>
                  What reaches the data room
                </p>
                {IN_THE_ROOM.map(item => (
                  <p key={item} style={{ ...BODY, fontSize: '1rem', lineHeight: 1.7, marginBottom: '12px' }}>{item}</p>
                ))}
              </div>
              <div style={{ border: '1px solid rgba(160,132,80,0.3)', padding: 'clamp(24px,3vw,36px)', background: 'rgba(160,132,80,0.03)' }}>
                <p style={{ ...MONO, fontSize: '0.72rem', color: 'var(--color-gold)', marginBottom: '20px' }}>
                  What the buyer asks about on day ninety
                </p>
                {NOT_IN_THE_ROOM.map(item => (
                  <p key={item} style={{ ...BODY, fontSize: '1rem', lineHeight: 1.7, color: 'var(--color-text-primary)', marginBottom: '12px' }}>{item}</p>
                ))}
              </div>
            </div>
            <p style={{ ...BODY, maxWidth: '680px', marginTop: '32px', marginBottom: 0 }}>
              Every call on the right is a call the owner has made a hundred times and written
              down nowhere. The buyer is paying for them anyway. The question is whether they
              transfer.
            </p>
          </div>
        </section>

        {/* Section 3. The refusal. Describes the founding proof as it runs after
            call 1: one answer with the deposit shown, one refusal. */}
        <section className="section-dark" style={{ background: 'var(--color-void)', padding: `clamp(64px,8vw,96px) ${PAD}` }}>
          <div style={{ maxWidth: '680px', margin: '0 auto' }}>
            <p style={{ ...MONO, fontSize: 'var(--text-caption)', color: 'var(--color-gold)', marginBottom: '24px' }}>
              Before you bring it to a client
            </p>
            <h2 style={{ ...H2, color: 'var(--on-dark)' }}>Run it on yourself. Watch what it refuses.</h2>
            <p style={{ ...BODY, color: 'var(--on-dark-2)' }}>
              The first call is one conversation about the hardest decision you ever made in
              your practice. Fifteen to thirty minutes, by voice or typed. When you are done,
              your Basalith does two things.
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
              If you have ever watched a tool invent an answer in front of a client, the second
              one is the part to see. A record that will tell a buyer it has nothing is a record
              the buyer can believe when it speaks.
            </p>
            <div style={{ marginTop: '32px' }}>
              <Link href="/begin" style={BTN}>
                Take the first call
              </Link>
            </div>
          </div>
        </section>

        {/* Section 4. What your client gets. Restates /succession and the
            September 24 waiver decision. */}
        <section style={{ padding: `clamp(64px,8vw,96px) ${PAD}` }}>
          <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            <p style={{ ...MONO, fontSize: 'var(--text-caption)', color: 'var(--color-gold)', marginBottom: '24px' }}>
              What your client gets
            </p>
            <h2 style={H2}>What you are handing the owner.</h2>
            <div className="partner-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px 24px', marginTop: '40px' }}>
              {CLIENT_GETS.map(({ title, body }) => (
                <div key={title} style={{ borderLeft: '3px solid rgba(160,132,80,0.5)', paddingLeft: 'clamp(20px,3vw,28px)' }}>
                  <h3 style={{ ...SERIF, fontSize: '1.25rem', fontWeight: 400, color: 'var(--color-text-primary)', lineHeight: 1.25, margin: '0 0 10px' }}>{title}</h3>
                  <p style={{ ...SERIF, fontSize: '1rem', fontWeight: 400, lineHeight: 1.8, color: 'var(--color-text-secondary)', margin: 0 }}>{body}</p>
                </div>
              ))}
            </div>
            <p style={{ ...BODY, maxWidth: '680px', marginTop: '40px', marginBottom: 0 }}>
              Succession pricing is on{' '}
              <Link href="/succession" style={{ color: 'var(--color-gold)', textDecoration: 'none' }}>the Succession page</Link>.
              Acquisition engagements, where a buyer brings us in during a live transaction,
              are scoped one at a time and start{' '}
              <Link href="/contact?intent=acquisition" style={{ color: 'var(--color-gold)', textDecoration: 'none' }}>here</Link>.
            </p>
          </div>
        </section>

        {/* Section 5. The lines. */}
        <section className="section-dark" style={{ background: 'var(--color-void)', padding: `clamp(64px,8vw,96px) ${PAD}` }}>
          <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            <p style={{ ...MONO, fontSize: 'var(--text-caption)', color: 'var(--color-gold)', marginBottom: '24px' }}>
              The lines we hold
            </p>
            <h2 style={{ ...H2, color: 'var(--on-dark)' }}>What we will not do.</h2>
            <div className="partner-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px 24px', marginTop: '40px' }}>
              {LINES.map(({ title, body }) => (
                <div key={title} style={{ borderLeft: '3px solid rgba(160,132,80,0.5)', paddingLeft: 'clamp(20px,3vw,28px)' }}>
                  <h3 style={{ ...SERIF, fontSize: '1.25rem', fontWeight: 400, color: 'var(--on-dark)', lineHeight: 1.25, margin: '0 0 10px' }}>{title}</h3>
                  <p style={{ ...SERIF, fontSize: '1rem', fontWeight: 400, lineHeight: 1.8, color: 'var(--on-dark-2)', margin: 0 }}>{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Section 6. How a relationship starts. No terms on this page by
            design; see the header comment. */}
        <section style={{ padding: `clamp(64px,8vw,96px) ${PAD}` }}>
          <div style={{ maxWidth: '680px', margin: '0 auto' }}>
            <p style={{ ...MONO, fontSize: 'var(--text-caption)', color: 'var(--color-gold)', marginBottom: '24px' }}>
              How it starts
            </p>
            <h2 style={H2}>A conversation, then one client.</h2>
            <p style={BODY}>
              Tell us about your practice, the deals you run, and the one that got away. We will
              tell you plainly whether Basalith fits the owners you work with. If it does, the
              first client you introduce is how we both find out.
            </p>
            <p style={{ ...BODY, marginBottom: 0 }}>
              We are working with a small number of firms at a time, and we would rather do this
              well with a few than loosely with many. The terms of a working relationship are
              set in that conversation, not on this page.
            </p>
          </div>
        </section>

        {/* Section 7. From the founder. */}
        <section className="section-dark" style={{ background: 'var(--color-void)', padding: `clamp(64px,8vw,96px) ${PAD}` }}>
          <div style={{ maxWidth: '680px', margin: '0 auto' }}>
            <p style={{ ...MONO, fontSize: 'var(--text-caption)', color: 'var(--color-gold)', marginBottom: '24px' }}>
              From the founder
            </p>
            <p style={{ ...BODY, color: 'var(--on-dark-2)' }}>
              I hold a broker&rsquo;s license. I built Basalith because the thing a buyer most
              wants to know about a business is the one thing a data room has never held.
            </p>
            <p style={{ ...BODY, color: 'var(--on-dark-2)' }}>
              If you run deals and this page is wrong about how they die, write to me at{' '}
              <a href="mailto:hello@basalith.ai" style={{ color: 'var(--on-dark)', textDecoration: 'underline' }}>hello@basalith.ai</a>.
              I answer every message myself.
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
              The next owner you sign will face every one of those calls. Bring the record with them.
            </p>
            <Link href={CONTACT} style={{ ...BTN, padding: '16px 48px' }}>
              Start the conversation
            </Link>
            <p style={{ ...SERIF, fontSize: '0.95rem', fontStyle: 'italic', fontWeight: 400, lineHeight: 1.8, color: 'var(--on-dark-3)', margin: '28px 0 0' }}>
              Or take the first call yourself first. No application, no approval, and nothing
              owed until your Basalith has answered you.
            </p>
          </div>
        </section>

      </main>
      <Footer />

      <style>{`
        @media (max-width: 720px) {
          .partner-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </>
  )
}
