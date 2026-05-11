import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Basalith · Some people leave before you are ready.',
  description: 'Basalith was built so that leaving does not have to mean gone. The infrastructure of human continuation. Priced for every family.',
}

import Nav               from './components/Nav'
import TaglineOpening    from './components/TaglineOpening'
import HeroSection       from './components/HeroSection'
import DoorSelector      from './components/DoorSelector'
import PhilosophySection from './components/PhilosophySection'
import LegacySection     from './components/LegacySection'
import HowItWorksSection from './components/HowItWorksSection'
import ClosingSection    from './components/ClosingSection'
import Footer            from './components/Footer'

export default function HomePage() {
  return (
    <>
      <Nav />
      <main>
        <TaglineOpening />
        <HeroSection />
        <DoorSelector />
        <PhilosophySection />
        <LegacySection />
        <HowItWorksSection />
        <ClosingSection />
      </main>
      <Footer />
    </>
  )
}
