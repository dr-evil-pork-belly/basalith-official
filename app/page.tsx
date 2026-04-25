import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Basalith · Legacy AI',
  description: 'The archive of a life, governed with the same seriousness as an estate. We build for legacy.',
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
