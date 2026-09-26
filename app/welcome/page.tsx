import type { Metadata } from 'next'
import Nav    from '../components/Nav'
import Footer from '../components/Footer'

// Where Stripe Checkout returns a buyer after a successful payment
// (success_url in app/api/admin/checkout). Until September 25, 2026 this page
// did not exist and every paying customer landed on the 404.
//
// It reads nothing and claims nothing it cannot see. The Basalith is provisioned
// by the Stripe webhook and Inngest (provisionOnFoundingFee), not by this page,
// so it may not exist yet when the page renders. The session_id query
// parameter is ignored on purpose: nothing here needs it.

export const metadata: Metadata = {
  title:  'Welcome | Basalith',
  robots: { index: false, follow: false },
}

export default function WelcomePage() {
  return (
    <>
      <Nav />
      <main className="min-h-screen bg-obsidian-void flex flex-col items-center justify-center px-8 md:px-16 text-center overflow-hidden relative">

        {/* Amber radiance */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 55% 45% at 50% 55%,rgba(255,179,71,0.06) 0%,transparent 65%)' }}
          aria-hidden="true"
        />

        <div className="relative z-10 max-w-xl mx-auto">
          <p className="eyebrow mb-6">Payment received</p>
          <h1
            className="font-serif font-light text-text-primary leading-[1.15] tracking-[-0.02em] mb-8"
            style={{ fontSize: 'clamp(2.25rem,5vw,3.5rem)' }}
          >
            Welcome to Basalith.
          </h1>
          <p
            className="font-serif font-light text-text-secondary leading-[1.6] mb-6"
            style={{ fontSize: 'clamp(1.1rem,2vw,1.35rem)' }}
          >
            Your Basalith is being set up now. A welcome email with your sign-in link is on its way to the address you used at checkout.
          </p>
          <p
            className="font-serif font-light text-text-secondary leading-[1.6] mb-12"
            style={{ fontSize: 'clamp(1.1rem,2vw,1.35rem)' }}
          >
            If it has not arrived, check your spam folder. You can also request a sign-in link with that email address at any time.
          </p>
          <a href="/archive-login" className="btn-monolith-ghost">Request a sign-in link</a>
        </div>

      </main>
      <Footer />
    </>
  )
}
