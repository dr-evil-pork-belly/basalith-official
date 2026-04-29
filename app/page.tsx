import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Basalith · Some people leave before you are ready.',
  description: 'Basalith was built so that leaving does not have to mean gone. The infrastructure of human continuation. Priced for every family.',
}

import Nav               from './components/Nav'
import HeroSection       from './components/HeroSection'
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

        {/* ── Tagline opening — full viewport, dark ── */}
        <section
          aria-label="Tagline"
          style={{
            minHeight:      '100vh',
            background:     'var(--color-void)',
            display:        'flex',
            flexDirection:  'column',
            alignItems:     'center',
            justifyContent: 'center',
            padding:        '120px 24px',
            position:       'relative',
          }}
        >
          <div
            aria-hidden="true"
            style={{
              width:        '1px',
              height:       '60px',
              background:   'linear-gradient(to bottom, transparent, rgba(184,150,62,0.6))',
              marginBottom: '48px',
            }}
          />

          <p
            style={{
              fontFamily:    'var(--font-cormorant, "Cormorant Garamond", Georgia, serif)',
              fontSize:      'clamp(1.75rem, 5vw, 4rem)',
              fontWeight:    300,
              fontStyle:     'italic',
              color:         'rgba(250,250,248,0.95)',
              lineHeight:    1.4,
              textAlign:     'center',
              maxWidth:      '800px',
              margin:        '0 0 48px',
              letterSpacing: '-0.01em',
            }}
          >
            &ldquo;You never truly leave
            <br />
            if you leave enough
            <br />
            of yourself behind.&rdquo;
          </p>

          <div
            aria-hidden="true"
            style={{
              width:        '1px',
              height:       '60px',
              background:   'linear-gradient(to top, transparent, rgba(184,150,62,0.6))',
              marginBottom: '64px',
            }}
          />

          {/* Scroll indicator */}
          <div
            aria-hidden="true"
            style={{
              position:       'absolute',
              bottom:         '40px',
              left:           '50%',
              transform:      'translateX(-50%)',
              display:        'flex',
              flexDirection:  'column',
              alignItems:     'center',
              gap:            '8px',
            }}
          >
            <p
              style={{
                fontFamily:    'var(--font-space-mono, "Space Mono", "Courier New", monospace)',
                fontSize:      '0.45rem',
                letterSpacing: '0.4em',
                color:         'rgba(184,150,62,0.4)',
                margin:        0,
                textTransform: 'uppercase' as const,
              }}
            >
              Begin
            </p>
            <svg
              width="16"
              height="24"
              viewBox="0 0 16 24"
              fill="none"
              style={{ animation: 'scrollBounce 2s ease-in-out infinite' }}
            >
              <line x1="8" y1="0"  x2="8"  y2="20" stroke="rgba(184,150,62,0.4)" strokeWidth="1" />
              <polyline points="2,14 8,20 14,14" stroke="rgba(184,150,62,0.4)" strokeWidth="1" fill="none" />
            </svg>
          </div>

          <style>{`
            @media (max-width: 430px) {
              section[aria-label="Tagline"] {
                padding: 80px 32px !important;
              }
            }
          `}</style>
        </section>

        {/* ── Hero — light, follows immediately ── */}
        <HeroSection />

        <DoorSelector />
        <PhilosophySection />
        <LegacySection />
        <HowItWorksSection />
        <StorySection />

        {/* ── Unified closing section — dark ── */}
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
                fontFamily:   'var(--font-cormorant, "Cormorant Garamond", Georgia, serif)',
                fontSize:     '1.15rem',
                fontStyle:    'italic',
                fontWeight:   300,
                lineHeight:   1.85,
                color:        'rgba(250,250,248,0.45)',
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
                width:      '40px',
                height:     '1px',
                background: 'var(--color-gold)',
                margin:     '0 auto 56px',
              }}
            />

            <div
              style={{
                fontFamily:   'var(--font-cormorant, "Cormorant Garamond", Georgia, serif)',
                fontSize:     'clamp(1.5rem, 3vw, 2.25rem)',
                fontWeight:   300,
                fontStyle:    'italic',
                lineHeight:   1.6,
                color:        'rgba(250,250,248,0.7)',
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
