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
import QuoteBreak           from './components/QuoteBreak'
import Footer               from './components/Footer'

export default function HomePage() {
  return (
    <>
      <Nav />
      <main>
        <HeroSection />
        <PhilosophySection />
        <QuoteBreak
          variant="bg"
          quote="Every person contains a universe of thought that disappears completely the moment they are gone. We are building the infrastructure to change that."
        />
        <HowItWorksSection />
        <QuoteBreak
          variant="surface-alt"
          quote="The stories we never told are the ones our children search for longest."
        />
        <StorySection />
        <QuoteBreak
          variant="bg"
          quote="The most expensive thing in the world to recreate is a specific way of thinking."
        />
        <PricingTeaserSection />
      </main>
      <Footer />
    </>
  )
}
