import Nav    from './components/Nav'
import Footer from './components/Footer'

export default function NotFound() {
  return (
    <>
      <Nav />
      <main className="min-h-screen bg-obsidian-void flex flex-col items-center justify-center px-8 md:px-16 text-center overflow-hidden relative">

        {/* Grid */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.022) 1px,transparent 1px),' +
              'linear-gradient(90deg,rgba(255,255,255,0.022) 1px,transparent 1px)',
            backgroundSize: '80px 80px',
            maskImage: 'radial-gradient(ellipse 70% 70% at 50% 50%,black 20%,transparent 100%)',
          }}
          aria-hidden="true"
        />
        {/* Amber radiance */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 55% 45% at 50% 55%,rgba(255,179,71,0.06) 0%,transparent 65%)' }}
          aria-hidden="true"
        />

        <div className="relative z-10 max-w-xl mx-auto">
          <p
            className="font-serif font-semibold text-amber leading-none tracking-[-0.05em] mb-6 animate-spark-text"
            style={{ fontSize: 'clamp(6rem,18vw,14rem)' }}
            aria-label="404"
          >
            404
          </p>
          <p className="eyebrow mb-5">Page Not Found</p>
          <p className="font-serif font-light text-text-secondary leading-[1.5] tracking-[-0.01em] mb-12"
            style={{ fontSize: 'clamp(1.25rem,2.5vw,1.75rem)' }}
          >
            This page does not exist.
          </p>
          <a href="/" className="btn-monolith-ghost">← Return Home</a>
        </div>

      </main>
      <Footer />
    </>
  )
}
