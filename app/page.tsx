import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Basalith · The way you think is irreplaceable.',
  description: 'Basalith builds a cognitive entity from the way you think, decide, and see the world. For families preserving a legacy. For businesses preserving a founder.',
}

import Nav               from './components/Nav'
import TaglineOpening    from './components/TaglineOpening'
import HeroSection       from './components/HeroSection'
import PhilosophySection from './components/PhilosophySection'
import TwoPathsSection   from './components/TwoPathsSection'
import ContrastDemo      from './components/ContrastDemo'
import ClosingSection    from './components/ClosingSection'
import WhatBasalithIsNot from './components/WhatBasalithIsNot'
import Footer            from './components/Footer'

const ORG_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Basalith',
  legalName: 'Heritage Nexus Inc.',
  url: 'https://basalith.ai',
  logo: 'https://basalith.ai/logo.png',
  foundingDate: '2026',
  founder: {
    '@type': 'Person',
    name: 'David Ha',
    jobTitle: 'Founder',
    affiliation: {
      '@type': 'Organization',
      name: 'University of Florida',
    },
  },
  description: 'Basalith builds cognitive reference entities from the way a person thinks, decides, and sees the world. For families preserving generational wisdom and organizations preserving institutional knowledge.',
  address: {
    '@type': 'PostalAddress',
    addressCountry: 'US',
    addressRegion: 'DE',
  },
  contactPoint: {
    '@type': 'ContactPoint',
    email: 'hello@basalith.xyz',
    contactType: 'customer service',
  },
  sameAs: [
    'https://basalith.xyz',
    'https://basalith.life',
  ],
}

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ORG_SCHEMA) }}
      />
      <Nav />
      <main>
        <TaglineOpening />
        <HeroSection />
        <PhilosophySection />
        <WhatBasalithIsNot />
        <TwoPathsSection />
        <ContrastDemo />
        <ClosingSection />
      </main>
      <Footer />
    </>
  )
}
