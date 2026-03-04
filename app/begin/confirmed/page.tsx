import Nav from '../../components/Nav'
import Footer from '../../components/Footer'

export default function ConfirmedPage() {
  return (
    <>
      <Nav />
      <main className="min-h-screen bg-stone-100 flex items-center justify-center px-8 md:px-16">
        <div className="max-w-lg mx-auto text-center">
          <div className="w-14 h-14 rounded-full bg-amber-100 border-2 border-amber-200 flex items-center justify-center mx-auto mb-8">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M5 12l5 5L20 7" stroke="#D97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h1 className="font-serif text-[2.5rem] font-semibold text-stone-900 leading-tight tracking-[-0.02em] mb-4">Your Archive Has Been Reserved.</h1>
          <p className="font-sans text-[0.95rem] text-stone-600 leading-relaxed mb-4">We have received your application and will be in touch within 48 hours to begin The Founding process.</p>
          <p className="font-sans text-[0.85rem] text-stone-500 mb-12">Questions? Email us at <a href="mailto:legacy@basalith.xyz" className="text-amber-600 hover:text-amber-700 transition-colors">legacy@basalith.xyz</a></p>
          <a href="/" className="font-sans text-[0.8rem] font-bold tracking-[0.1em] uppercase px-8 py-4 rounded bg-stone-900 text-white hover:bg-stone-700 transition-all duration-200">Return Home</a>
        </div>
      </main>
      <Footer />
    </>
  )
}