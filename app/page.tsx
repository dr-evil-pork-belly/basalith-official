import type { Metadata } from 'next'
import Nav             from './components/Nav'

export const metadata: Metadata = {
  title: 'Basalith — The Asset That Never Leaves',
}

import Hero            from './components/Hero'
import LetterSection   from './components/LetterSection'
import ProductOverview from './components/ProductOverview'
import EleanorSection  from './components/EleanorSection'
import CtaSection      from './components/CtaSection'
import Footer          from './components/Footer'

export default function HomePage() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <LetterSection />
        <ProductOverview />
        <EleanorSection />
        <CtaSection />
      </main>
      <Footer />
    </>
  )
}
