import Nav    from '../components/Nav'
import Footer from '../components/Footer'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title:       'The Founding Session',
  description: '90 minutes. Your family. A Senior Legacy Guide. Your first photographs. By the end of this session your archive exists, not as a promise, but as a fact.',
}

const EYEBROW: React.CSSProperties = {
  fontFamily:    "'Space Mono', 'DM Mono', monospace",
  fontSize:      '0.58rem',
  letterSpacing: '0.24em',
  textTransform: 'uppercase' as const,
  color:         '#C4A24A',
  display:       'block',
  marginBottom:  '1.5rem',
}

const H2: React.CSSProperties = {
  fontFamily:    "'Cormorant Garamond', Georgia, serif",
  fontWeight:    700,
  fontSize:      'clamp(1.6rem, 3vw, 2.2rem)',
  color:         '#F0EDE6',
  lineHeight:    1.2,
  letterSpacing: '-0.02em',
  marginBottom:  '1.75rem',
}

const BODY: React.CSSProperties = {
  fontFamily:  "'Cormorant Garamond', Georgia, serif",
  fontWeight:  300,
  fontSize:    '1.1rem',
  color:       '#9DA3A8',
  lineHeight:  1.85,
  marginBottom: '1.25rem',
}

const GOLD_RULE: React.CSSProperties = {
  height:     '1px',
  margin:     '3.5rem 0',
  background: 'linear-gradient(90deg, transparent, rgba(196,162,74,0.35), transparent)',
}

const BEFORE_ITEMS = [
  {
    n:    '01',
    name: 'Three Photographs',
    body: 'Not your best photographs. Not the ones already framed. The ones in the box nobody has looked at in years. The ones where you don\'t know everyone\'s name. Those are the ones that matter most.',
  },
  {
    n:    '02',
    name: 'One Person Who Remembers',
    body: 'A family member who knew the people in the photographs. A parent. An aunt or uncle. Anyone who carries context that exists nowhere else. Their presence in the first session changes everything.',
  },
  {
    n:    '03',
    name: 'Fifteen Minutes of Preparation',
    body: 'Think about one person whose story you most want to preserve. Not their biography. Their voice. The particular way they described things. What they said about what mattered. What they never said but you understood anyway.',
  },
]

const SESSION_STEPS = [
  {
    n:    '01',
    name: 'The First Photograph',
    body: 'Your Legacy Guide surfaces the first photograph. Often this is the moment families describe as when it became real. You begin labeling: not facts, but the story behind the facts. Who is in this photograph and what were they like? What was happening that day beyond what the camera shows? What would you want someone to know about this moment in fifty years?',
  },
  {
    n:    '02',
    name: 'The Contributor Network',
    body: 'Your Legacy Guide walks you through inviting your family contributors. Each contributor receives their first photograph email that evening. By the end of your first day your archive already has multiple perspectives being built.',
  },
  {
    n:    '03',
    name: 'The Archive Structure',
    body: 'Your decades are mapped. The gaps are identified. You can see, visually, which parts of the story are documented and which parts are waiting. This map becomes your guide for everything that follows.',
  },
  {
    n:    '04',
    name: 'The First Essence Deposit',
    body: 'The session closes with your first direct deposit: something only you know, in your own words, about the person or period you most want to preserve. This becomes the seed of your AI entity\'s understanding of what mattered.',
  },
]

const OUTCOMES = [
  'Your archive is initialized and legally documented',
  'Your first photographs are labeled with real stories',
  'Your contributor network is active and receiving photograph emails',
  'Your Custodian is designated with formal estate standing',
  'Your first nightly photograph email is scheduled for 9pm tonight',
]

export default function FoundingSessionPage() {
  return (
    <>
      <Nav />
      <main style={{ background: '#0A0908' }}>

        {/* Opening */}
        <section aria-label="The Founding Session" style={{ padding: '10rem 2rem 5rem', background: '#0A0908' }}>
          <div style={{ maxWidth: '720px', margin: '0 auto' }}>

            <span style={EYEBROW}>The Founding Engagement</span>

            <h1 style={{
              fontFamily:    "'Cormorant Garamond', Georgia, serif",
              fontWeight:    700,
              fontSize:      'clamp(2.2rem, 5vw, 3.5rem)',
              color:         '#F0EDE6',
              lineHeight:    1.15,
              letterSpacing: '-0.02em',
              marginBottom:  '1.75rem',
            }}>
              What happens in<br />your Founding session.
            </h1>

            <p style={{
              fontFamily:  "'Cormorant Garamond', Georgia, serif",
              fontWeight:  300,
              fontSize:    '1.15rem',
              fontStyle:   'italic',
              color:       '#9DA3A8',
              lineHeight:  1.8,
              marginBottom: '0',
            }}>
              90 minutes. Your family. A Senior Legacy Guide. Your first photographs.
              <br /><br />
              By the end of this session your archive exists, not as a promise, but as a fact.
            </p>

            <div aria-hidden="true" style={GOLD_RULE} />

            {/* Before — What to bring */}
            <span style={EYEBROW}>Before the Session</span>
            <h2 style={H2}>What we ask you to bring</h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem', marginTop: '2rem' }}>
              {BEFORE_ITEMS.map(({ n, name, body }) => (
                <div key={n} style={{ display: 'grid', gridTemplateColumns: '3rem 1fr', gap: '1.5rem', alignItems: 'start' }}>
                  <span style={{
                    fontFamily:    "'Space Mono', 'DM Mono', monospace",
                    fontSize:      '0.6rem',
                    letterSpacing: '0.1em',
                    color:         'rgba(196,162,74,0.45)',
                    paddingTop:    '0.2rem',
                    display:       'block',
                  }}>
                    {n}
                  </span>
                  <div>
                    <p style={{
                      fontFamily:    "'Space Mono', 'DM Mono', monospace",
                      fontSize:      '0.58rem',
                      letterSpacing: '0.18em',
                      textTransform: 'uppercase' as const,
                      color:         '#C4A24A',
                      marginBottom:  '0.6rem',
                    }}>
                      {name}
                    </p>
                    <p style={{ ...BODY, marginBottom: 0 }}>{body}</p>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </section>

        {/* The session */}
        <section aria-label="What happens in the room" style={{ padding: '5rem 2rem', background: '#0C0B0A' }}>
          <div style={{ maxWidth: '720px', margin: '0 auto' }}>

            <span style={EYEBROW}>The Session Itself</span>
            <h2 style={H2}>What happens in the room</h2>

            <p style={BODY}>The session opens with three questions. Not about your archive. About your family.</p>

            <div style={{
              borderLeft:  '2px solid rgba(196,162,74,0.2)',
              paddingLeft: '1.5rem',
              margin:      '1.5rem 0 2rem',
            }}>
              <p style={{ ...BODY, fontStyle: 'italic', color: '#E8E4DC' }}>Who is the person whose story you most want to preserve?</p>
              <p style={{ ...BODY, fontStyle: 'italic', color: '#E8E4DC' }}>What do you want your great-grandchildren to know about them that they would never find in a document?</p>
              <p style={{ ...BODY, fontStyle: 'italic', color: '#E8E4DC', marginBottom: 0 }}>What is one thing that person knew about how to live that you wish more people understood?</p>
            </div>

            <p style={BODY}>These questions are not small talk. They are the architecture of your archive. Every photograph you label after this session will be labeled in the context of what you said in these first fifteen minutes.</p>

            <div aria-hidden="true" style={{ height: '1px', background: 'rgba(196,162,74,0.1)', margin: '2.5rem 0' }} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
              {SESSION_STEPS.map(({ n, name, body }) => (
                <div key={n} style={{ display: 'grid', gridTemplateColumns: '3rem 1fr', gap: '1.5rem', alignItems: 'start' }}>
                  <span style={{
                    fontFamily:    "'Space Mono', 'DM Mono', monospace",
                    fontSize:      '0.6rem',
                    letterSpacing: '0.1em',
                    color:         'rgba(196,162,74,0.45)',
                    paddingTop:    '0.2rem',
                    display:       'block',
                  }}>
                    {n}
                  </span>
                  <div>
                    <p style={{
                      fontFamily:    "'Space Mono', 'DM Mono', monospace",
                      fontSize:      '0.58rem',
                      letterSpacing: '0.18em',
                      textTransform: 'uppercase' as const,
                      color:         '#C4A24A',
                      marginBottom:  '0.6rem',
                    }}>
                      {name}
                    </p>
                    <p style={{ ...BODY, marginBottom: 0 }}>{body}</p>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </section>

        {/* After the session */}
        <section aria-label="What exists when you leave" style={{ padding: '5rem 2rem', background: '#0A0908' }}>
          <div style={{ maxWidth: '720px', margin: '0 auto' }}>

            <span style={EYEBROW}>After the Session</span>
            <h2 style={H2}>What exists when you leave</h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '3rem' }}>
              {OUTCOMES.map((item) => (
                <div key={item} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                  <span style={{ color: '#C4A24A', fontSize: '1.1rem', lineHeight: 1.5, flexShrink: 0 }}>&#10003;</span>
                  <p style={{ ...BODY, marginBottom: 0, color: '#E8E4DC' }}>{item}</p>
                </div>
              ))}
            </div>

            <p style={BODY}>Most families describe the Founding session as the moment they understood what they had been missing.</p>
            <p style={BODY}>Not the technology. Not the product.</p>
            <p style={BODY}>The conversation.</p>
            <p style={BODY}>The specific, unhurried conversation about the specific people who made them who they are. A conversation modern life almost never creates space for.</p>
            <p style={BODY}>The archive is what remains after that conversation.</p>
            <p style={{ ...BODY, fontStyle: 'italic', color: '#E8E4DC' }}>The conversation is the product.</p>

          </div>
        </section>

        {/* CTA */}
        <section aria-label="Begin" style={{ padding: '5rem 2rem 8rem', background: '#0C0B0A', textAlign: 'center' }}>
          <div style={{ maxWidth: '560px', margin: '0 auto' }}>

            <div aria-hidden="true" style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(196,162,74,0.3), transparent)', marginBottom: '3.5rem' }} />

            <p style={{
              fontFamily:  "'Cormorant Garamond', Georgia, serif",
              fontWeight:  300,
              fontSize:    '1rem',
              fontStyle:   'italic',
              color:       '#9DA3A8',
              lineHeight:  1.9,
              marginBottom: '1.5rem',
            }}>
              The Founding begins at $2,500.
              <br /><br />
              Every archive starts with this conversation.
              <br /><br />
              Yours can begin whenever you are ready.
            </p>

            <a
              href="/apply"
              style={{
                display:        'inline-block',
                fontFamily:     "'Space Mono', 'DM Mono', monospace",
                fontSize:       '0.6rem',
                letterSpacing:  '0.22em',
                textTransform:  'uppercase' as const,
                color:          '#0A0908',
                textDecoration: 'none',
                background:     '#C4A24A',
                padding:        '0.85rem 1.75rem',
                marginBottom:   '1.5rem',
              }}
            >
              Request your Founding →
            </a>

            <p style={{
              fontFamily:  "'Cormorant Garamond', Georgia, serif",
              fontSize:    '0.9rem',
              fontStyle:   'italic',
              color:       '#5C6166',
              marginTop:   '1.5rem',
            }}>
              <a href="/pricing" style={{ color: '#706C65', textDecoration: 'none' }}>View stewardship plans →</a>
            </p>

          </div>
        </section>

      </main>
      <Footer />
    </>
  )
}
