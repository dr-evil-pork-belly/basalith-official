import Nav from '../../components/Nav'
import Footer from '../../components/Footer'

export default function ConfirmedPage() {
  return (
    <>
      <Nav />
      <main className="min-h-screen bg-obsidian-void flex items-center justify-center px-8 md:px-16">
        <div className="max-w-lg mx-auto text-center">
          <div className="w-14 h-14 rounded-full bg-amber/10 border border-border-amber flex items-center justify-center mx-auto mb-8">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M5 12l5 5L20 7" stroke="#FFB347" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h1 className="font-serif text-[2.5rem] font-semibold text-text-primary leading-tight tracking-[-0.02em] mb-4">Your Archive Has Been Reserved.</h1>
          <p className="font-sans text-[0.95rem] text-text-secondary leading-relaxed mb-4">We have received your application and will be in touch within 48 hours to begin The Founding process.</p>
          <p className="font-sans text-[0.85rem] text-text-muted mb-12">Questions? Email us at <a href="mailto:legacy@basalith.xyz" className="text-amber hover:text-amber/80 transition-colors">legacy@basalith.xyz</a></p>
          <a href="/" className="btn-monolith-amber">Return Home</a>
        </div>
      </main>
      <Footer />
    </>
  )
}