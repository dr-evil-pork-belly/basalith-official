import Nav    from '../components/Nav'
import Footer from '../components/Footer'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title:       'About',
  description: "A founder's statement. Why Basalith exists.",
}

const P: React.CSSProperties = {
  fontFamily:   "'Cormorant Garamond', Georgia, serif",
  fontWeight:   300,
  fontSize:     '1.05rem',
  lineHeight:   1.95,
  color:        '#B8B4AB',
  marginBottom: '1.8rem',
  maxWidth:     '680px',
  marginLeft:   'auto',
  marginRight:  'auto',
}

const RULE: React.CSSProperties = {
  borderTop:    '1px solid rgba(196,162,74,0.25)',
  maxWidth:     '120px',
  margin:       '2.5rem auto',
  border:       'none',
  borderTopWidth: '1px',
  borderTopStyle: 'solid',
  borderTopColor: 'rgba(196,162,74,0.25)',
}

export default function AboutPage() {
  return (
    <>
      <Nav />
      <main style={{ background: '#0A0908' }}>
        <section aria-label="Founder statement" style={{ padding: '10rem 2rem 8rem', background: '#0A0908' }}>
          <div style={{ maxWidth: '720px', margin: '0 auto' }}>

            <p style={{
              fontFamily:    "'Space Mono', 'DM Mono', monospace",
              fontSize:      '0.46rem',
              letterSpacing: '0.4em',
              textTransform: 'uppercase' as const,
              color:         '#C4A24A',
              marginBottom:  '1.5rem',
              textAlign:     'center',
            }}>
              Why We Exist
            </p>

            <h1 style={{
              fontFamily:    "'Cormorant Garamond', Georgia, serif",
              fontWeight:    700,
              fontSize:      'clamp(2.2rem, 5vw, 3.5rem)',
              color:         '#F0EDE6',
              lineHeight:    1.1,
              letterSpacing: '-0.02em',
              marginBottom:  '1rem',
              textAlign:     'center',
            }}>
              The Most Valuable Thing<br />You Will Ever Own
            </h1>

            <p style={{
              fontFamily:   "'Cormorant Garamond', Georgia, serif",
              fontStyle:    'italic',
              fontSize:     '1.05rem',
              color:        '#9DA3A8',
              textAlign:    'center',
              margin:       '0 0 2rem',
            }}>
              A note from the founder.
            </p>

            <div aria-hidden="true" style={{
              width:        '100%',
              height:       '1px',
              marginBottom: '4rem',
              background:   'linear-gradient(90deg, transparent, rgba(196,162,74,0.35), transparent)',
            }} />

            {/* Section 1 */}
            <p style={P}>I grew up without much.</p>

            <p style={P}>Not without love. My mother made sure of that. She showed it the way she knew how: through her cooking, through her stories, through the particular way she was always there when everything else was not. But without money, without guidance, without anyone who had been where I was trying to go.</p>

            <p style={P}>What I had was curiosity. And eventually I discovered that curiosity, applied consistently over time, becomes something close to a superpower.</p>

            <p style={P}>I completed my undergraduate studies, then a master&rsquo;s degree, then a doctorate where I was supposed to research accounting and ended up researching happiness instead. That seemed like the more important question.</p>

            <p style={P}>Every decade I look back and think the same thing: if I had known then what I know now, everything would have been different. Not easier. Different. Better directed. Less wasted.</p>

            <p style={{ ...P, marginBottom: 0 }}>Knowledge compounds. That is the thing nobody tells you when you are young and trying to figure out which direction to point yourself. Every piece of knowledge you acquire becomes leverage for the next thing. The accumulation is slow and then suddenly it is not. You look back and realize the distance you have traveled.</p>

            {/* Rule 1 */}
            <div aria-hidden="true" style={RULE} />

            {/* Section 2 */}
            <p style={P}>My grandmother died when I was young. I did not know her well enough. I had questions I never asked. Questions I did not even know I had until she was gone and I realized I would never be able to ask them.</p>

            <p style={P}>My mother is still here. She still tells her stories. And I notice now, with a clarity I did not have when I was younger, that I do not always listen as carefully as I should. Modern life moves fast. I have four children. They have school and sports and the ten thousand demands of being young right now. They love their grandparents. But they do not always have time to sit and listen. And their grandparents&rsquo; stories. The specific, irreplaceable, unrepeatable stories of specific lives actually lived. Are not being captured.</p>

            <p style={{ ...P, marginBottom: 0 }}>This kept me up at night. For years.</p>

            {/* Rule 2 */}
            <div aria-hidden="true" style={RULE} />

            {/* Section 3 */}
            <p style={P}>A few years ago I went through what I can only describe as a sustained crisis. Not of failure. Of fear.</p>

            <p style={P}>Everything around me was good. My family. My work. My life by any external measure.</p>

            <p style={P}>But inside something was wrong. A particular kind of dread that I have since come to understand more clearly: the fear of not being there. The fear that my children and their children would not know where they came from, what was learned, what was survived, what was discovered about how to live.</p>

            <p style={P}>I researched happiness for years. I know what the science says about meaning and connection and legacy. And I kept arriving at the same conclusion: the most meaningful thing most people will ever do is give the people who come after them the knowledge of how to live. Not through lectures. Through stories. Through the particular texture of a specific life, honestly told.</p>

            <p style={{ ...P, marginBottom: 0 }}>The problem is that those stories disappear. Every day. Every loss. Every family that did not have time to sit down and ask the right questions.</p>

            {/* Rule 3 */}
            <div aria-hidden="true" style={RULE} />

            {/* Section 4 */}
            <p style={P}>I built Basalith because I believe knowledge is the most valuable thing one human being can give another.</p>

            <p style={P}>I know this from my own life. I went from a kid with no clear future to building companies, raising a family, and understanding something that took decades to learn: knowledge is the cheat code. Every piece of it compounds. Every story passed down changes the trajectory of the person who receives it.</p>

            <p style={P}>In 100 years the world will be unrecognizable. But the story of how your grandmother survived something hard, or your grandfather built something from nothing, or your mother showed love through cooking when she had no other way to show it. Those stories will still matter. They will still teach. They will still change how someone lives their life.</p>

            <p style={P}>That is what Basalith preserves.</p>

            <p style={{ ...P, marginBottom: '4rem' }}>That is why I built it.</p>

            {/* Signoff */}
            <div aria-hidden="true" style={{
              width:        '80px',
              height:       '1px',
              background:   'rgba(196,162,74,0.4)',
              margin:       '0 auto 1.5rem',
            }} />

            <p style={{
              fontFamily:  "'Cormorant Garamond', Georgia, serif",
              fontStyle:   'italic',
              fontSize:    '1.1rem',
              color:       '#B8B4AB',
              textAlign:   'center',
              margin:      0,
            }}>
              Dr. David Ha
            </p>

          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
