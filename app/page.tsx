import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Basalith · Some people leave before you are ready.',
  description: 'Basalith was built so that leaving does not have to mean gone. The infrastructure of human continuation. Priced for every family.',
}

import Nav                  from './components/Nav'
import HeroSection          from './components/HeroSection'
import DoorSelector         from './components/DoorSelector'
import PhilosophySection    from './components/PhilosophySection'
import LegacySection        from './components/LegacySection'
import HowItWorksSection    from './components/HowItWorksSection'
import StorySection         from './components/StorySection'
import TechnologySection    from './components/TechnologySection'
import PricingTeaserSection from './components/PricingTeaserSection'
import Footer               from './components/Footer'

export default function HomePage() {
  return (
    <>
      <Nav />
      <main>
        <HeroSection />
        <DoorSelector />
        <PhilosophySection />
        <LegacySection />
        <HowItWorksSection />
        <StorySection />
        <TechnologySection />

        {/* Breathing room between Technology CTA and Pricing CTA */}
        <section
          style={{
            background: 'var(--color-bg)',
            padding:    '80px 24px',
            textAlign:  'center',
          }}
        >
          <p
            style={{
              fontFamily: 'var(--font-cormorant, "Cormorant Garamond", Georgia, serif)',
              fontSize:   'clamp(1.25rem, 3vw, 2rem)',
              fontWeight: 300,
              fontStyle:  'italic',
              color:      'var(--color-text-secondary)',
              maxWidth:   '600px',
              margin:     '0 auto',
              lineHeight: 1.7,
            }}
          >
            &ldquo;You never truly leave
            if you leave enough of yourself behind.&rdquo;
          </p>
        </section>

        <PricingTeaserSection />
      </main>
      <Footer />
    </>
  )
}
