import Nav                from './components/Nav'
import Hero               from './components/Hero'
import MarqueeStrip       from './components/MarqueeStrip'
import Comparison         from './components/Comparison'
import AssetPillar        from './components/AssetPillar'
import IntelligenceLayer  from './components/IntelligenceLayer'
import ContinuityPillar   from './components/ContinuityPillar'
import CtaSection         from './components/CtaSection'
import Footer             from './components/Footer'

export default function HomePage() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <MarqueeStrip />
        <Comparison />
        <AssetPillar />
        <IntelligenceLayer />
        <ContinuityPillar />
        <CtaSection />
      </main>
      <Footer />
    </>
  )
}