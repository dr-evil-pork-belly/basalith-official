import Nav    from '../components/Nav'
import Footer from '../components/Footer'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title:       'The Founding Session',
  description: '90 minutes. Your family. A Senior Legacy Guide. Your first photographs. By the end of this session your archive exists, not as a promise, but as a fact.',
}

const SERIF: React.CSSProperties = {
  fontFamily: 'var(--font-cormorant, "Cormorant Garamond", Georgia, serif)',
}
const MONO: React.CSSProperties = {
  fontFamily:    'var(--font-space-mono, "Space Mono", "Courier New", monospace)',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.28em',
}
const BODY: React.CSSProperties = {
  ...SERIF,
  fontSize:     '1.1rem',
  fontWeight:   300,
  lineHeight:   1.9,
  color:        'var(--color-text-secondary)',
  marginBottom: '16px',
}

const BEFORE_ITEMS = [
  {
    n: '01', name: 'Three Photographs',
    body: 'Not your best photographs. Not the ones already framed. The ones in the box nobody has looked at in years. The ones where you do not know everyone\'s name. Those are the ones that matter most.',
  },
  {
    n: '02', name: 'One Person Who Remembers',
    body: 'A family member who knew the people in the photographs. A parent. An aunt or uncle. Anyone who carries context that exists nowhere else. Their presence in the first session changes everything.',
  },
  {
    n: '03', name: 'Fifteen Minutes of Preparation',
    body: 'Think about one person whose story you most want to preserve. Not their biography. Their voice. The particular way they described things. What they said about what mattered. What they never said but you understood anyway.',
  },
]

const SESSION_STEPS = [
  {
    n: '01', name: 'The First Photograph',
    body: 'Your Legacy Guide surfaces the first photograph. Often this is the moment families describe as when it became real. You begin labeling: not facts, but the story behind the facts. Who is in this photograph and what were they like? What was happening that day beyond what the camera shows?',
  },
  {
    n: '02', name: 'The Contributor Network',
    body: 'Your Legacy Guide walks you through inviting your family contributors. Each contributor receives their first photograph email that evening. By the end of your first day your archive already has multiple perspectives being built.',
  },
  {
    n: '03', name: 'The Archive Structure',
    body: 'Your decades are mapped. The gaps are identified. You can see, visually, which parts of the story are documented and which parts are waiting. This map becomes your guide for everything that follows.',
  },
  {
    n: '04', name: 'The First Essence Deposit',
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
      <main style={{ background: 'var(--color-bg)' }}>

        {/* Hero */}
        <section style={{ padding: 'clamp(140px,16vw,180px) clamp(24px,6vw,80px) clamp(60px,8vw,80px)', maxWidth: 'calc(var(--max-width-text) + 160px)', margin: '0 auto' }}>
          <p
            style={{
              ...MONO,
              fontSize:     'var(--text-caption)',
              color:        'var(--color-gold)',
              display:      'flex',
              alignItems:   'center',
              gap:          '12px',
              marginBottom: '24px',
            }}
          >
            <span style={{ display: 'block', width: '24px', height: '1px', background: 'var(--color-gold)', flexShrink: 0 }} aria-hidden="true" />
            The Founding Engagement
          </p>
          <h1
            style={{
              ...SERIF,
              fontSize:      'var(--text-h1)',
              fontWeight:    300,
              lineHeight:    1.15,
              color:         'var(--color-text-primary)',
              letterSpacing: '-0.025em',
              marginBottom:  '24px',
            }}
          >
            What happens in<br />your Founding session.
          </h1>
          <p
            style={{
              ...SERIF,
              fontSize:  '1.2rem',
              fontStyle: 'italic',
              fontWeight: 300,
              lineHeight: 1.8,
              color:     'var(--color-text-secondary)',
              maxWidth:  '520px',
            }}
          >
            90 minutes. Your family. A Senior Legacy Guide. Your first photographs.
            By the end of this session your archive exists, not as a promise, but as a fact.
          </p>
        </section>

        {/* Gold divider */}
        <div style={{ margin: '0 clamp(24px,6vw,80px)', height: '1px', background: 'linear-gradient(90deg, var(--color-gold-border), transparent)' }} aria-hidden="true" />

        {/* Before */}
        <section style={{ padding: 'clamp(60px,8vw,80px) clamp(24px,6vw,80px)', maxWidth: 'calc(var(--max-width-text) + 160px)', margin: '0 auto' }}>
          <p style={{ ...MONO, fontSize: 'var(--text-caption)', color: 'var(--color-gold)', display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <span style={{ display: 'block', width: '24px', height: '1px', background: 'var(--color-gold)', flexShrink: 0 }} aria-hidden="true" />
            Before the Session
          </p>
          <h2 style={{ ...SERIF, fontSize: 'clamp(1.5rem, 2.5vw, 2rem)', fontWeight: 300, color: 'var(--color-text-primary)', marginBottom: '40px' }}>
            What we ask you to bring
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
            {BEFORE_ITEMS.map(({ n, name, body }) => (
              <div key={n} data-reveal style={{ display: 'grid', gridTemplateColumns: '3rem 1fr', gap: '24px' }}>
                <p style={{ ...MONO, fontSize: '0.52rem', color: 'var(--color-gold)', paddingTop: '3px' }}>{n}</p>
                <div>
                  <p style={{ ...MONO, fontSize: '0.52rem', color: 'var(--color-text-primary)', marginBottom: '10px' }}>{name}</p>
                  <p style={{ ...BODY, marginBottom: 0 }}>{body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* The Session */}
        <section style={{ background: 'var(--color-surface-alt)', padding: 'clamp(60px,8vw,80px) clamp(24px,6vw,80px)' }}>
          <div style={{ maxWidth: 'calc(var(--max-width-text) + 160px)', margin: '0 auto' }}>
            <p style={{ ...MONO, fontSize: 'var(--text-caption)', color: 'var(--color-gold)', display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
              <span style={{ display: 'block', width: '24px', height: '1px', background: 'var(--color-gold)', flexShrink: 0 }} aria-hidden="true" />
              The Session Itself
            </p>
            <h2 style={{ ...SERIF, fontSize: 'clamp(1.5rem, 2.5vw, 2rem)', fontWeight: 300, color: 'var(--color-text-primary)', marginBottom: '24px' }}>
              What happens in the room
            </h2>
            <p style={BODY}>The session opens with three questions. Not about your archive. About your family.</p>
            <div style={{ borderLeft: '2px solid var(--color-gold-border)', paddingLeft: '24px', margin: '24px 0 36px' }}>
              <p style={{ ...BODY, fontStyle: 'italic', color: 'var(--color-text-primary)' }}>Who is the person whose story you most want to preserve?</p>
              <p style={{ ...BODY, fontStyle: 'italic', color: 'var(--color-text-primary)' }}>What do you want your great-grandchildren to know about them that they would never find in a document?</p>
              <p style={{ ...BODY, fontStyle: 'italic', color: 'var(--color-text-primary)', marginBottom: 0 }}>What is one thing that person knew about how to live that you wish more people understood?</p>
            </div>
            <p style={BODY}>These questions are not small talk. They are the architecture of your archive. Every photograph you label after this session will be labeled in the context of what you said in these first fifteen minutes.</p>

            <div style={{ height: '1px', background: 'var(--color-border)', margin: '40px 0' }} aria-hidden="true" />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '36px' }}>
              {SESSION_STEPS.map(({ n, name, body }) => (
                <div key={n} data-reveal style={{ display: 'grid', gridTemplateColumns: '3rem 1fr', gap: '24px' }}>
                  <p style={{ ...MONO, fontSize: '0.52rem', color: 'var(--color-gold)', paddingTop: '3px' }}>{n}</p>
                  <div>
                    <p style={{ ...MONO, fontSize: '0.52rem', color: 'var(--color-text-primary)', marginBottom: '10px' }}>{name}</p>
                    <p style={{ ...BODY, marginBottom: 0 }}>{body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* After */}
        <section style={{ padding: 'clamp(60px,8vw,80px) clamp(24px,6vw,80px)', maxWidth: 'calc(var(--max-width-text) + 160px)', margin: '0 auto' }}>
          <p style={{ ...MONO, fontSize: 'var(--text-caption)', color: 'var(--color-gold)', display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <span style={{ display: 'block', width: '24px', height: '1px', background: 'var(--color-gold)', flexShrink: 0 }} aria-hidden="true" />
            After the Session
          </p>
          <h2 style={{ ...SERIF, fontSize: 'clamp(1.5rem, 2.5vw, 2rem)', fontWeight: 300, color: 'var(--color-text-primary)', marginBottom: '32px' }}>
            What exists when you leave
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '40px' }}>
            {OUTCOMES.map(item => (
              <div key={item} style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                <span style={{ color: 'var(--color-gold)', fontSize: '1rem', lineHeight: 1.6, flexShrink: 0 }}>&#10003;</span>
                <p style={{ ...BODY, marginBottom: 0, color: 'var(--color-text-primary)' }}>{item}</p>
              </div>
            ))}
          </div>
          <p style={BODY}>Most families describe the Founding session as the moment they understood what they had been missing.</p>
          <p style={{ ...BODY, fontStyle: 'italic', color: 'var(--color-text-primary)' }}>The conversation is the product.</p>
        </section>

        {/* CTA */}
        <section style={{ background: 'var(--color-void)', padding: 'clamp(64px,8vw,96px) clamp(24px,6vw,80px)', textAlign: 'center' }}>
          <div style={{ maxWidth: '520px', margin: '0 auto' }}>
            <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(184,150,62,0.3), transparent)', marginBottom: '48px' }} aria-hidden="true" />
            <p style={{ ...SERIF, fontSize: '1.05rem', fontStyle: 'italic', fontWeight: 300, color: 'rgba(250,248,244,0.45)', lineHeight: 1.9, marginBottom: '40px' }}>
              The Founding begins at $2,500.
              <br /><br />
              Every archive starts with this conversation.
              <br /><br />
              Yours can begin whenever you are ready.
            </p>
            <a
              href="/apply"
              style={{
                ...MONO,
                fontSize:       'var(--text-caption)',
                display:        'inline-block',
                textDecoration: 'none',
                background:     'var(--color-gold)',
                color:          '#0A0908',
                padding:        '14px 32px',
                borderRadius:   'var(--radius-sm)',
                marginBottom:   '20px',
              }}
            >
              Request Your Founding
            </a>
            <p style={{ marginTop: '16px' }}>
              <a href="/pricing" style={{ ...SERIF, fontSize: '0.9rem', fontStyle: 'italic', color: 'rgba(250,248,244,0.25)', textDecoration: 'none' }}>
                View stewardship plans →
              </a>
            </p>
          </div>
        </section>

      </main>
      <Footer />
    </>
  )
}
