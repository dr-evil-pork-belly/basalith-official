import type { Metadata } from 'next'
import Link   from 'next/link'
import Nav    from '../components/Nav'
import Footer from '../components/Footer'

export const metadata: Metadata = {
  title:       'For Individuals and Families · Basalith',
  description: 'You will have the photographs. You will not have the way they thought. Basalith keeps how a person thinks, decides, and sees the world, captured while they are here and fully present.',
}

const MONO: React.CSSProperties = {
  fontFamily:    'var(--font-space-mono, "Space Mono", "Courier New", monospace)',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.28em',
}
const SERIF: React.CSSProperties = {
  fontFamily: 'var(--font-cormorant, "Cormorant Garamond", Georgia, serif)',
}
const GEORGIA: React.CSSProperties = {
  fontFamily: 'Georgia, "Times New Roman", serif',
}
const PAD  = 'clamp(24px,6vw,80px)'
const RULE = '1px solid rgba(250,250,248,0.06)'

// Text tokens for the dark B2C surface. Mirrors SecondDoorSection, which is the
// canonical family-facing component on the homepage.
const ON_DARK   = 'var(--text-on-dark)'
const ON_DARK_2 = 'var(--text-on-dark-2)'
const ON_DARK_3 = 'var(--text-on-dark-3)'

const KEPT = [
  'Photographs and home video',
  'Letters, journals, and recordings',
  'Names, dates, and the places that mattered',
  'The stories told at the table',
]

const LOST = [
  'The way they weighed a hard decision',
  'The advice they would give you right now',
  'How they read people and situations',
  'The reasoning behind everything they built',
]

const STEPS = [
  {
    n:     '01',
    title: 'The Founding.',
    body:  'Three of the hardest calls they ever made, in their own words, in their own time. Speak or type, about ten minutes each. Not an interview. The first deposits on the record, and the way they think, already showing.',
  },
  {
    n:     '02',
    title: 'Guided capture.',
    body:  'A photograph in the evening. A question each week. A story told into the phone for two minutes. They answer across the parts of life that shaped them, and every answer trains the model.',
  },
  {
    n:     '03',
    title: 'The check.',
    body:  'Every response is scored before it can shape the model. Lower-confidence responses get a closer pass. Their Basalith reflects how the person actually reasoned.',
  },
  {
    n:     '04',
    title: 'Presence.',
    body:  'The people who rely on them can ask their Basalith for that judgment, long after the person has stepped back. Where they never took a position, it is built to say so rather than guess.',
  },
]

const SUBJECTS = [
  { who: 'Yourself',              body: 'While your thinking is at its sharpest and you can shape your Basalith yourself.' },
  { who: 'A parent',             body: 'So the way they reason stays within reach of the people who rely on it.' },
  { who: 'A grandparent',        body: 'Whose memory is the family&rsquo;s first history.' },
  { who: 'A spouse or partner',  body: 'So their counsel stays part of how the family decides.' },
]

const TRUST = [
  {
    title: 'Built while they are here.',
    body:  'A Basalith is built while the person is present and fully participating. This is why the method matters, and why now matters.',
  },
  {
    title: 'Only ever them.',
    body:  'Every model is trained only on one person&rsquo;s deposits. No general AI speaks for the record.',
  },
  {
    title: 'Never shared. Never sold.',
    body:  'Your Basalith is never shared, sold, or used to train another company&rsquo;s model.',
  },
  {
    title: 'The family owns it.',
    body:  'You own your Basalith and can export all of it at any time. Nothing is stranded if we ever close.',
  },
]

export default function FamiliesPage() {
  return (
    <>
      <Nav />
      <main style={{ background: 'var(--color-void)' }}>

        {/* ── Section 1: The Premise ── */}
        <section style={{ padding: `clamp(140px,16vw,200px) ${PAD} clamp(72px,9vw,110px)`, maxWidth: '960px' }}>
          <p style={{ ...MONO, fontSize: 'var(--text-caption)', color: 'var(--color-gold)', marginBottom: '16px' }}>
            Basalith for Individuals and Families
          </p>
          <p style={{ ...MONO, fontSize: '0.46rem', color: 'rgba(196,162,74,0.7)', lineHeight: 1.8, marginBottom: '36px', maxWidth: '640px' }}>
            How a person thinks, decides, and sees the world. Kept.
          </p>
          <h1 style={{
            ...SERIF,
            fontSize:      'clamp(2.6rem,5vw,3.25rem)',
            fontWeight:    300,
            lineHeight:    1.08,
            letterSpacing: '-0.02em',
            color:         ON_DARK,
            marginBottom:  '36px',
            maxWidth:      '820px',
          }}>
            You will have the photographs. You will not have the way they thought.
          </h1>
          <p style={{ ...GEORGIA, fontSize: '1.2rem', fontStyle: 'italic', fontWeight: 300, lineHeight: 1.85, color: ON_DARK_2, maxWidth: '660px', margin: 0 }}>
            Photographs hold a face. Letters hold a moment. Neither holds how a person reasoned, the advice they would give you, or the judgment the people around them lean on. Basalith keeps how a person thinks, captured while they are here and fully present.
          </p>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center', marginTop: '44px' }}>
            <Link
              href="/begin"
              className="families-cta"
              style={{
                ...MONO,
                fontSize:       'var(--text-caption)',
                display:        'inline-block',
                color:          '#0A0908',
                textDecoration: 'none',
                background:     'var(--color-gold)',
                padding:        '16px 32px',
                transition:     'background 250ms ease',
              }}
            >
              Begin a family Basalith
            </Link>
            <Link href="/pricing" style={{ ...MONO, fontSize: '0.46rem', color: 'var(--color-gold)', textDecoration: 'none' }}>
              See pricing <span aria-hidden="true">&rarr;</span>
            </Link>
          </div>
        </section>

        {/* ── Section 2: The gap ── */}
        <section style={{ padding: `clamp(72px,9vw,110px) ${PAD}`, borderTop: RULE }}>
          <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            <p style={{ ...MONO, fontSize: 'var(--text-caption)', color: 'var(--color-gold)', marginBottom: '48px' }}>
              What a lifetime leaves, and what it does not
            </p>
            <div className="families-contrast" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px' }}>

              {/* Left: kept */}
              <div style={{ background: 'rgba(250,248,244,0.02)', border: '1px solid rgba(255,255,255,0.06)', padding: 'clamp(28px,4vw,48px)' }}>
                <p style={{ ...MONO, fontSize: '0.46rem', color: 'rgba(250,248,244,0.35)', marginBottom: '28px' }}>
                  What a family keeps
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                  {KEPT.map(item => (
                    <div key={item} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                      <span style={{ ...MONO, fontSize: '0.4rem', color: 'rgba(250,248,244,0.2)', paddingTop: '2px', flexShrink: 0 }}>&#10003;</span>
                      <p style={{ ...GEORGIA, fontSize: '1rem', fontStyle: 'italic', fontWeight: 300, lineHeight: 1.7, color: 'rgba(250,248,244,0.35)', margin: 0 }}>{item}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right: lost */}
              <div style={{ background: 'rgba(196,162,74,0.04)', border: '1px solid rgba(196,162,74,0.2)', borderTop: '2px solid rgba(196,162,74,0.7)', padding: 'clamp(28px,4vw,48px)' }}>
                <p style={{ ...MONO, fontSize: '0.46rem', color: 'var(--color-gold)', marginBottom: '28px' }}>
                  What usually disappears
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                  {LOST.map(item => (
                    <div key={item} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                      <span style={{ ...MONO, fontSize: '0.4rem', color: 'rgba(196,162,74,0.5)', paddingTop: '2px', flexShrink: 0 }}>&#8594;</span>
                      <p style={{ ...GEORGIA, fontSize: '1rem', fontStyle: 'italic', fontWeight: 300, lineHeight: 1.7, color: 'rgba(250,248,244,0.75)', margin: 0 }}>{item}</p>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ── Section 3: Where Basalith began ── */}
        <section style={{ padding: `clamp(72px,9vw,110px) ${PAD}`, borderTop: RULE }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <p style={{ ...MONO, fontSize: 'var(--text-caption)', color: 'var(--color-gold)', marginBottom: '40px' }}>
              Basalith began here
            </p>
            <p style={{ ...GEORGIA, fontSize: '1.15rem', fontWeight: 300, lineHeight: 1.9, color: ON_DARK, marginBottom: '32px' }}>
              Before Basalith was a way to hand forward how a business is run, it was a way to keep how a person thinks. The method has not changed. We build a cognitive reference model of the person while they are here and fully present. It is not a biography or a set of recorded interviews. It is a record of how they reason, what they weigh, and how they decide, that the people who come after can ask.
            </p>
            <div style={{ borderLeft: '2px solid rgba(196,162,74,0.4)', paddingLeft: '24px', marginTop: '40px' }}>
              <p style={{ ...MONO, fontSize: '0.42rem', color: 'rgba(196,162,74,0.6)', marginBottom: '12px' }}>
                Built from them, not about them
              </p>
              <p style={{ ...GEORGIA, fontSize: '1rem', fontStyle: 'italic', fontWeight: 300, lineHeight: 1.85, color: ON_DARK_2, margin: 0 }}>
                A Basalith built from the person is not the same as one built about them. The difference can only come from the person, while they are here to give it and to correct it.
              </p>
            </div>
          </div>
        </section>

        {/* ── Section 4: How it works ── */}
        <section style={{ padding: `clamp(72px,9vw,110px) ${PAD}`, borderTop: RULE }}>
          <div style={{ maxWidth: '760px', margin: '0 auto' }}>
            <p style={{ ...MONO, fontSize: 'var(--text-caption)', color: 'var(--color-gold)', marginBottom: '48px' }}>
              How a Basalith is built
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
              {STEPS.map(({ n, title, body }) => (
                <div key={n} style={{ display: 'grid', gridTemplateColumns: '3rem 1fr', gap: '24px' }}>
                  <p style={{ ...MONO, fontSize: '0.52rem', color: 'var(--color-gold)', paddingTop: '4px' }}>{n}</p>
                  <div>
                    <h3 style={{ ...SERIF, fontSize: '1.4rem', fontWeight: 500, color: ON_DARK, marginBottom: '10px', lineHeight: 1.2 }}>{title}</h3>
                    <p style={{ ...GEORGIA, fontSize: '1.05rem', fontStyle: 'italic', fontWeight: 300, lineHeight: 1.8, color: ON_DARK_2, margin: 0 }}>{body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Section 5: Who it is for ── */}
        <section style={{ padding: `clamp(72px,9vw,110px) ${PAD}`, borderTop: RULE }}>
          <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            <h2 style={{
              ...SERIF,
              fontSize:      'clamp(1.8rem,3.4vw,2.6rem)',
              fontWeight:    300,
              lineHeight:    1.15,
              letterSpacing: '-0.02em',
              color:         ON_DARK,
              marginBottom:  '48px',
              maxWidth:      '720px',
            }}>
              A Basalith can be built for anyone whose way of thinking is worth keeping.
            </h2>
            <div className="families-subjects" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px 24px' }}>
              {SUBJECTS.map(({ who, body }) => (
                <div key={who} style={{ borderLeft: '3px solid rgba(196,162,74,0.5)', paddingLeft: 'clamp(20px,3vw,28px)' }}>
                  <h3 style={{ ...SERIF, fontSize: '1.25rem', fontWeight: 300, color: ON_DARK, lineHeight: 1.25, margin: '0 0 10px' }}>{who}</h3>
                  <p style={{ ...GEORGIA, fontSize: '1rem', fontStyle: 'italic', fontWeight: 300, lineHeight: 1.8, color: ON_DARK_3, margin: 0 }} dangerouslySetInnerHTML={{ __html: body }} />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Section 6: Trust ── */}
        <section style={{ padding: `clamp(72px,9vw,110px) ${PAD}`, borderTop: RULE }}>
          <div style={{ maxWidth: '760px', margin: '0 auto' }}>
            <p style={{ ...MONO, fontSize: 'var(--text-caption)', color: 'var(--color-gold)', marginBottom: '24px' }}>
              Trust is the whole product
            </p>
            <div className="families-trust" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px 24px', marginTop: '24px' }}>
              {TRUST.map(({ title, body }) => (
                <div key={title} style={{ borderLeft: '3px solid rgba(196,162,74,0.5)', paddingLeft: 'clamp(20px,3vw,28px)' }}>
                  <h3 style={{ ...SERIF, fontSize: '1.25rem', fontWeight: 300, color: ON_DARK, lineHeight: 1.25, margin: '0 0 10px' }} dangerouslySetInnerHTML={{ __html: title }} />
                  <p style={{ ...GEORGIA, fontSize: '1rem', fontStyle: 'italic', fontWeight: 300, lineHeight: 1.8, color: ON_DARK_3, margin: 0 }} dangerouslySetInnerHTML={{ __html: body }} />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Section 7: Close + CTA ── */}
        <section style={{ padding: `clamp(80px,12vw,160px) ${PAD}`, borderTop: RULE, textAlign: 'center' }}>
          <div style={{ maxWidth: '640px', margin: '0 auto' }}>
            <p style={{
              ...SERIF,
              fontSize:      'clamp(1.6rem,3.2vw,2.4rem)',
              fontWeight:    300,
              lineHeight:    1.3,
              letterSpacing: '-0.02em',
              color:         'rgba(250,248,244,0.9)',
              marginBottom:  '40px',
            }}>
              What a person has learned can keep working long after they step back. The only question is whether it is captured while they are the one giving it.
            </p>
            <Link
              href="/begin"
              className="families-cta"
              style={{
                ...MONO,
                fontSize:       'var(--text-caption)',
                display:        'inline-block',
                color:          '#0A0908',
                textDecoration: 'none',
                background:     'var(--color-gold)',
                padding:        '16px 48px',
                transition:     'background 250ms ease',
              }}
            >
              Begin a family Basalith
            </Link>
            <p style={{ ...GEORGIA, fontSize: '0.95rem', fontStyle: 'italic', fontWeight: 300, lineHeight: 1.8, color: ON_DARK_3, margin: '28px 0 0' }}>
              No application and no approval. Your name, your email, and the first call. You see what your Basalith does with your own words before anything is owed.
              {' '}
              <Link href="/pricing" style={{ color: 'var(--color-gold)', textDecoration: 'none' }}>
                See pricing <span aria-hidden="true">&rarr;</span>
              </Link>
            </p>
          </div>
        </section>

      </main>
      <Footer />

      <style>{`
        .families-cta:hover { background: var(--color-gold-light) !important; }
        @media (max-width: 680px) {
          .families-contrast { grid-template-columns: 1fr !important; }
          .families-subjects { grid-template-columns: 1fr !important; }
          .families-trust    { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </>
  )
}
