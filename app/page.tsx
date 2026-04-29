import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Basalith · Some people leave before you are ready.',
  description: 'Basalith was built so that leaving does not have to mean gone. The infrastructure of human continuation. Priced for every family.',
}

import Nav               from './components/Nav'
import HeroSection       from './components/HeroSection'
import TaglineSection    from './components/TaglineSection'
import DoorSelector      from './components/DoorSelector'
import PhilosophySection from './components/PhilosophySection'
import LegacySection     from './components/LegacySection'
import HowItWorksSection from './components/HowItWorksSection'
import StorySection      from './components/StorySection'
import Footer            from './components/Footer'

const MONO: React.CSSProperties = {
  fontFamily:    'var(--font-space-mono, "Space Mono", "Courier New", monospace)',
  fontSize:      '0.52rem',
  letterSpacing: '0.35em',
  textTransform: 'uppercase' as const,
}

export default function HomePage() {
  return (
    <>
      <Nav />
      <main>
        <HeroSection />
        <TaglineSection variant="light" />
        <DoorSelector />
        <PhilosophySection />
        <LegacySection />
        <HowItWorksSection />
        <StorySection />

        {/* Unified closing section */}
        <section
          aria-label="Begin your archive"
          style={{
            background: 'var(--color-void)',
            padding:    'clamp(80px,12vw,160px) clamp(24px,6vw,80px)',
            textAlign:  'center',
          }}
        >
          <div style={{ maxWidth: '640px', margin: '0 auto' }}>

            <p style={{ ...MONO, color: 'var(--color-gold)', marginBottom: '48px' }}>
              For the forward-thinking
            </p>

            <p
              style={{
                fontFamily:    'var(--font-cormorant, "Cormorant Garamond", Georgia, serif)',
                fontSize:      'clamp(1.75rem, 4vw, 3rem)',
                fontWeight:    300,
                lineHeight:    1.2,
                letterSpacing: '-0.02em',
                color:         'rgba(250,250,248,0.9)',
                marginBottom:  '28px',
              }}
            >
              The most sophisticated AI in the world
              <br />
              can learn to think like you.
            </p>

            <p
              style={{
                fontFamily:  'var(--font-cormorant, "Cormorant Garamond", Georgia, serif)',
                fontSize:    '1.15rem',
                fontStyle:   'italic',
                fontWeight:  300,
                lineHeight:  1.85,
                color:       'rgba(250,250,248,0.45)',
                marginBottom: '56px',
              }}
            >
              The question is whether you give it enough to learn from
              <br />
              while you still can.
            </p>

            <div
              aria-hidden="true"
              style={{
                width:        '40px',
                height:       '1px',
                background:   'var(--color-gold)',
                margin:       '0 auto 56px',
              }}
            />

            <div
              style={{
                fontFamily:  'var(--font-cormorant, "Cormorant Garamond", Georgia, serif)',
                fontSize:    'clamp(1.5rem, 3vw, 2.25rem)',
                fontWeight:  300,
                fontStyle:   'italic',
                lineHeight:  1.6,
                color:       'rgba(250,250,248,0.7)',
                marginBottom: '56px',
              }}
            >
              <p style={{ margin: '0' }}>You never truly leave</p>
              <p style={{ margin: '0' }}>if you leave enough</p>
              <p style={{ margin: '0' }}>of yourself behind.</p>
            </div>

            <Link
              href="/apply"
              style={{
                ...MONO,
                display:        'inline-block',
                color:          'var(--color-void)',
                textDecoration: 'none',
                background:     'var(--color-gold)',
                padding:        '16px 48px',
                borderRadius:   'var(--radius-sm)',
                marginBottom:   '24px',
              }}
            >
              Begin
            </Link>

            <p
              style={{
                ...MONO,
                fontSize:  '0.44rem',
                color:     'rgba(250,250,248,0.2)',
                marginTop: '20px',
              }}
            >
              The Estate begins at $2,500
            </p>

          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
