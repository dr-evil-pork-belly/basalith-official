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
        <TwoPathsSection />
        <ClosingSection />
      </main>
      <Footer />
    </>
  )
}
