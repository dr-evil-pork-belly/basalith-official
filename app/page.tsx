import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Basalith · Knowledge transfer when a business changes hands',
  description: 'What built the company is not in the data room. Basalith captures how an operator reasons, so it transfers through an acquisition or a succession. Also available for one person or a family.',
}

import Nav               from './components/Nav'
import Footer            from './components/Footer'

// Stone direction, homepage only. Every section below is built from the block
// types in approved design direction 1d. Copy was revised in the September 2026
// site-wide copy pass (see docs/COPY_PASS_2026-09-08.md).
// The shared components these replace are left in place and untouched, because
// /succession still renders ContrastDemo and Section.
import HomeHero          from './components/home/HomeHero'
import HomeSuccession    from './components/home/HomeSuccession'
import HomeContrastDemo  from './components/home/HomeContrastDemo'
import HomeSecondDoor    from './components/home/HomeSecondDoor'
import HomeClosing       from './components/home/HomeClosing'

// The Organization block used to be declared inline here and rendered only on
// this route. It now lives in lib/structuredData.ts and is emitted site-wide
// from app/layout.tsx, so every page carries it. See
// docs/AI_DISCOVERY_SLICE_1_2026-09-22.md.

export default function HomePage() {
  return (
    <>
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
