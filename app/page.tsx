import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Basalith · Knowledge transfer when a business changes hands',
  description: 'What built the company is not in the data room. Basalith captures how an operator reasons, so it transfers through an acquisition or a succession. Individual and family archives also available.',
}

import Nav               from './components/Nav'
import HeroSection       from './components/HeroSection'
import SuccessionSection from './components/SuccessionSection'
import SecondDoorSection from './components/SecondDoorSection'
import ContrastDemo      from './components/ContrastDemo'
import ClosingSection    from './components/ClosingSection'
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
        <HeroSection />
        <SuccessionSection />
        <ContrastDemo />
        <SecondDoorSection />
        <ClosingSection />
      </main>
      <Footer />
    </>
  )
}
