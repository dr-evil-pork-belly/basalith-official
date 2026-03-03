import Nav from '../components/Nav'
import Footer from '../components/Footer'

export default function ContactPage() {
  return (
    <>
      <Nav />
      <main>
        <section className="relative bg-obsidian-void min-h-screen flex items-center justify-center px-8 md:px-16 overflow-hidden" aria-label="Contact">
          <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.022) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.022) 1px,transparent 1px)', backgroundSize: '80px 80px', maskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%,black 20%,transparent 100%)' }} aria-hidden="true" />
          <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 55%,rgba(255,179,71,0.08) 0%,transparent 65%)' }} aria-hidden="true" />
          <div className="relative z-10 text-center max-w-2xl mx-auto">
            <p className="eyebrow mb-6">Get In Touch</p>
            <h1 className="font-serif font-semibold text-text-primary leading-[0.92] tracking-[-0.038em] mb-8" style={{ fontSize: 'clamp(3rem,6vw,5rem)' }}>
              Every Legacy Begins{' '}
              <em className="italic font-medium text-amber" style={{ fontStyle: 'italic' }}>With a Conversation.</em>
            </h1>
            <p className="font-sans font-light text-body-base text-text-secondary leading-[1.82] mb-12 max-w-lg mx-auto">
              We are a small, deliberate team. If you are serious about building a Golden Dataset for your family, we want to hear from you.
            </p>
            <a href="mailto:legacy@basalith.xyz" className="btn-monolith-amber group">legacy@basalith.xyz <span className="transition-transform duration-200 group-hover:translate-x-1">→</span></a>
            <p className="font-sans text-[0.75rem] text-text-muted mt-8">We respond to every message personally within 48 hours.</p>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}