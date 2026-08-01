import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Basalith · Knowledge transfer when a business changes hands',
  description: 'What built the company is not in the data room. Basalith captures how an operator reasons, so it transfers through an acquisition or a succession. Individual and family archives also available.',
}

import Nav               from './components/Nav'
import Footer            from './components/Footer'

// Stone direction, homepage only. Every section below is built from the block
// types in approved design direction 1d and carries live copy unchanged.
// The shared components these replace are left in place and untouched, because
// /succession still renders ContrastDemo and Section.
import HomeHero          from './components/home/HomeHero'
import HomeSuccession    from './components/home/HomeSuccession'
import HomeContrastDemo  from './components/home/HomeContrastDemo'
import HomeSecondDoor    from './components/home/HomeSecondDoor'
import HomeClosing       from './components/home/HomeClosing'

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
      <main className="home-stone">
        <HomeHero />
        <HomeSuccession />
        {/* Photograph slot 2 sits here in 1d. Deliberately empty this build. */}
        <HomeContrastDemo />
        <HomeSecondDoor />
        <HomeClosing />
      </main>
      <Footer />
    </>
  )
}
