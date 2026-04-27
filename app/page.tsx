import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Basalith · Some people leave before you are ready.',
  description: 'Basalith was built so that leaving does not have to mean gone. The infrastructure of human continuation. Priced for every family.',
}

import Nav                  from './components/Nav'
import HeroSection          from './components/HeroSection'
import PhilosophySection    from './components/PhilosophySection'
import HowItWorksSection    from './components/HowItWorksSection'
import StorySection         from './components/StorySection'
import ClosingSection       from './components/ClosingSection'
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
        <ClosingSection />
        <PricingTeaserSection />
      </main>
      <Footer />
    </>
  )
}
