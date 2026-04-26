import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Basalith · You never truly leave',
  description: 'Basalith builds a living AI entity trained on how you specifically think. The infrastructure of human continuation. Priced for every family.',
}

import Nav                  from './components/Nav'
import HeroSection          from './components/HeroSection'
import PhilosophySection    from './components/PhilosophySection'
import HowItWorksSection    from './components/HowItWorksSection'
import StorySection         from './components/StorySection'
import PricingTeaserSection from './components/PricingTeaserSection'
import Footer               from './components/Footer'

export default function HomePage() {
  return (
    <>
      <Nav />
      <main>
        <HeroSection />
        <PhilosophySection />
        <HowItWorksSection />
        <StorySection />
        <PricingTeaserSection />
      </main>
      <Footer />
    </>
  )
}
