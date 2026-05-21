import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Basalith · The way you think is irreplaceable.',
  description: 'Basalith builds a living cognitive entity from the way you think, decide, and see the world. For families preserving a legacy. For businesses preserving a founder.',
}

import Nav               from './components/Nav'
import TaglineOpening    from './components/TaglineOpening'
import HeroSection       from './components/HeroSection'
import PhilosophySection from './components/PhilosophySection'
import TwoPathsSection   from './components/TwoPathsSection'
import ClosingSection    from './components/ClosingSection'
import Footer            from './components/Footer'

export default function HomePage() {
  return (
    <>
      <Nav />
      <main>
        <TaglineOpening />
        <HeroSection />
        <PhilosophySection />
        <div style={{ background: 'var(--color-void)', padding: '0 clamp(24px,6vw,80px) clamp(48px,6vw,72px)' }}>
          <p style={{
            fontFamily:    'var(--font-space-mono, "Space Mono", "Courier New", monospace)',
            fontSize:      '0.48rem',
            letterSpacing: '0.15em',
            textTransform: 'uppercase' as const,
            color:         'rgba(250,250,248,0.28)',
            maxWidth:      '860px',
            margin:        '0 auto',
          }}>
            Most archives reach Stage 2 within their first month.
            The Cognitive Fingerprint typically emerges between months four and twelve.
          </p>
        </div>
        <TwoPathsSection />
        <ClosingSection />
      </main>
      <Footer />
    </>
  )
}
