import Nav    from '../components/Nav'
import Footer from '../components/Footer'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title:       'About',
  description: "A founder's statement. Why Basalith exists.",
}

const SERIF: React.CSSProperties = {
  fontFamily: 'var(--font-cormorant, "Cormorant Garamond", Georgia, serif)',
}
const MONO: React.CSSProperties = {
  fontFamily:    'var(--font-space-mono, "Space Mono", "Courier New", monospace)',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.3em',
}
const P: React.CSSProperties = {
  ...SERIF,
  fontWeight:   300,
  fontSize:     '1.1rem',
  lineHeight:   1.95,
  color:        'var(--color-text-secondary)',
  marginBottom: '1.75rem',
  maxWidth:     '640px',
  marginLeft:   'auto',
  marginRight:  'auto',
}
const RULE: React.CSSProperties = {
  width:      '40px',
  height:     '1px',
  background: 'var(--color-gold)',
  margin:     '48px auto',
  border:     'none',
}

export default function AboutPage() {
  return (
    <>
      <Nav />
      <main style={{ background: 'var(--color-bg)' }}>
        <section aria-label="Founder statement" style={{ padding: 'clamp(140px,16vw,180px) clamp(24px,6vw,48px) clamp(80px,10vw,120px)' }}>
          <div style={{ maxWidth: '720px', margin: '0 auto' }}>

            <p style={{ ...MONO, fontSize: 'var(--text-caption)', color: 'var(--color-gold)', marginBottom: '24px', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
              <span style={{ display: 'block', width: '24px', height: '1px', background: 'var(--color-gold)', flexShrink: 0 }} aria-hidden="true" />
              Why We Exist
              <span style={{ display: 'block', width: '24px', height: '1px', background: 'var(--color-gold)', flexShrink: 0 }} aria-hidden="true" />
            </p>

            <h1 style={{ ...SERIF, fontWeight: 300, fontSize: 'var(--text-h1)', color: 'var(--color-text-primary)', lineHeight: 1.1, letterSpacing: '-0.025em', marginBottom: '16px', textAlign: 'center' }}>
              The Most Valuable Thing<br />You Will Ever Own
            </h1>

            <p style={{ ...SERIF, fontStyle: 'italic', fontWeight: 300, fontSize: '1.1rem', color: 'var(--color-text-muted)', textAlign: 'center', margin: '0 0 48px' }}>
              A note from the founder.
            </p>

            <div aria-hidden="true" style={{ width: '100%', height: '1px', marginBottom: '56px', background: 'linear-gradient(90deg, transparent, var(--color-gold-border), transparent)' }} />

            <p style={P}>I grew up without much.</p>
            <p style={P}>Not without love. My mother made sure of that. She showed it the way she knew how: through her cooking, through her stories, through the particular way she was always there when everything else was not. But without money, without guidance, without anyone who had been where I was trying to go.</p>
            <p style={P}>What I had was curiosity. And eventually I discovered that curiosity, applied consistently over time, becomes something close to a superpower.</p>
            <p style={P}>I completed my undergraduate studies, then a master&rsquo;s degree, then a doctorate where I was supposed to research accounting and ended up researching happiness instead. That seemed like the more important question.</p>
            <p style={P}>Every decade I look back and think the same thing: if I had known then what I know now, everything would have been different. Not easier. Different. Better directed. Less wasted.</p>
            <p style={{ ...P, marginBottom: 0 }}>Knowledge compounds. That is the thing nobody tells you when you are young and trying to figure out which direction to point yourself. Every piece of knowledge you acquire becomes leverage for the next thing. The accumulation is slow and then suddenly it is not. You look back and realize the distance you have traveled.</p>

            <div aria-hidden="true" style={RULE} />

            <p style={P}>My grandmother died when I was young. I did not know her well enough. I had questions I never asked. Questions I did not even know I had until she was gone and I realized I would never be able to ask them.</p>
            <p style={P}>My mother is still here. She still tells her stories. And I notice now, with a clarity I did not have when I was younger, that I do not always listen as carefully as I should. Modern life moves fast. I have four children. Their grandparents&rsquo; stories. The specific, irreplaceable, unrepeatable stories of specific lives actually lived. Are not being captured.</p>
            <p style={{ ...P, marginBottom: 0 }}>This kept me up at night. For years.</p>

            <div aria-hidden="true" style={RULE} />

            <p style={P}>A few years ago I went through what I can only describe as a sustained crisis. Not of failure. Of fear.</p>
            <p style={P}>Everything around me was good. My family. My work. My life by any external measure.</p>
            <p style={P}>But inside something was wrong. A particular kind of dread that I have since come to understand more clearly: the fear of not being there. The fear that my children and their children would not know where they came from, what was learned, what was survived, what was discovered about how to live.</p>
            <p style={P}>I researched happiness for years. I know what the science says about meaning and connection and legacy. And I kept arriving at the same conclusion: the most meaningful thing most people will ever do is give the people who come after them the knowledge of how to live. Not through lectures. Through stories. Through the particular texture of a specific life, honestly told.</p>
            <p style={{ ...P, marginBottom: 0 }}>The problem is that those stories disappear. Every day. Every loss. Every family that did not have time to sit down and ask the right questions.</p>

            <div aria-hidden="true" style={RULE} />

            <p style={P}>I built Basalith because I believe knowledge is the most valuable thing one human being can give another.</p>
            <p style={P}>I know this from my own life. I went from a kid with no clear future to building companies, raising a family, and understanding something that took decades to learn: knowledge is the cheat code. Every piece of it compounds. Every story passed down changes the trajectory of the person who receives it.</p>
            <p style={P}>In 100 years the world will be unrecognizable. But the story of how your grandmother survived something hard, or your grandfather built something from nothing, or your mother showed love through cooking when she had no other way to show it. Those stories will still matter. They will still teach. They will still change how someone lives their life.</p>
            <p style={P}>That is what Basalith preserves.</p>
            <p style={{ ...P, marginBottom: '56px' }}>That is why I built it.</p>

            <div aria-hidden="true" style={{ ...RULE, marginBottom: '24px' }} />

            <p style={{ ...SERIF, fontStyle: 'italic', fontWeight: 300, fontSize: '1.15rem', color: 'var(--color-text-primary)', textAlign: 'center', margin: 0 }}>
              Dr. David Ha
            </p>
            <p style={{ ...MONO, fontSize: '0.48rem', color: 'var(--color-gold)', textAlign: 'center', marginTop: '8px' }}>
              Founder, Basalith
            </p>

          </div>
        </section>

        {/* CTA */}
        <section style={{ background: 'var(--color-void)', padding: 'clamp(64px,8vw,80px) clamp(24px,6vw,80px)', textAlign: 'center' }}>
          <p style={{ ...SERIF, fontStyle: 'italic', fontWeight: 300, fontSize: '1.15rem', color: 'rgba(250,248,244,0.5)', marginBottom: '32px', lineHeight: 1.8 }}>
            Every archive begins with a conversation.
          </p>
          <a href="/apply" style={{ fontFamily: 'var(--font-space-mono,"Space Mono","Courier New",monospace)', fontSize: 'var(--text-caption)', letterSpacing: '0.3em', textTransform: 'uppercase', display: 'inline-block', textDecoration: 'none', background: 'var(--color-gold)', color: '#0A0908', padding: '14px 32px', borderRadius: 'var(--radius-sm)' }}>
            Request Your Founding
          </a>
        </section>
      </main>
      <Footer />
    </>
  )
}
