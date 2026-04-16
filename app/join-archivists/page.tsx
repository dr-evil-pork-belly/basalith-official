'use client'

import { useState } from 'react'
import Nav    from '../components/Nav'
import Footer from '../components/Footer'

const INITIAL = { fullName: '', email: '', background: '', why: '' }

export default function JoinArchivistsPage() {
  const [form, setForm]           = useState(INITIAL)
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  function set(key: keyof typeof INITIAL) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    await fetch('/api/archivist-interest', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(form),
    })
    setSubmitted(true)
    setSubmitting(false)
  }

  const inputCls = 'w-full bg-obsidian-deep border border-border-subtle rounded-sm px-4 py-3 font-sans text-[0.88rem] text-text-primary placeholder:text-text-muted focus:outline-none focus:border-amber/40 transition-colors duration-200'

  return (
    <>
      <Nav />
      <main>
        <section className="relative bg-obsidian-void px-8 md:px-16 pt-40 pb-32 overflow-hidden" aria-label="Join Legacy Guides">
          <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 50% 40% at 50% 70%,rgba(196,162,74,0.06) 0%,transparent 65%)' }} aria-hidden="true" />
          <div className="relative z-10 max-w-2xl mx-auto">

            <p className="eyebrow mb-6">The Legacy Guide Program</p>
            <h1 className="font-serif font-semibold text-text-primary leading-[0.92] tracking-[-0.038em] mb-8" style={{ fontSize: 'clamp(2.5rem,5vw,4.5rem)' }}>
              Represent Basalith<br />in Your Community.
            </h1>

            <div className="font-serif font-light text-text-secondary leading-[1.85] mb-14" style={{ fontSize: '1.1rem' }}>
              <p className="mb-5">
                Basalith works with a select group of independent professionals who help families
                begin their archives before it is too late.
              </p>
              <p className="mb-5">
                Legacy Guides are not employees. They are trusted partners — professionals who
                understand what Basalith builds and who it is built for.
              </p>
              <p>
                If you believe in what we are doing and want to represent us in your community,
                we would like to hear from you.
              </p>
            </div>

            {submitted ? (
              <div className="rounded-sm border px-10 py-14 text-center" style={{ background: 'rgba(196,162,74,0.04)', borderColor: 'rgba(196,162,74,0.2)' }}>
                <p className="font-serif font-semibold text-text-primary mb-5" style={{ fontSize: '1.4rem' }}>
                  Your interest has been noted.
                </p>
                <p className="font-serif font-light text-text-secondary leading-[1.85]" style={{ fontSize: '1rem' }}>
                  We review every expression personally.
                  Accepted partners receive a complete program briefing by private invitation.
                  <br /><br />
                  You will hear from us if there is a fit.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="font-sans text-[0.62rem] font-bold tracking-[0.14em] uppercase text-text-muted block mb-2">Full Name</label>
                    <input type="text" required placeholder="Your name" value={form.fullName} onChange={set('fullName')} className={inputCls} />
                  </div>
                  <div>
                    <label className="font-sans text-[0.62rem] font-bold tracking-[0.14em] uppercase text-text-muted block mb-2">Email</label>
                    <input type="email" required placeholder="you@domain.com" value={form.email} onChange={set('email')} className={inputCls} />
                  </div>
                </div>

                <div>
                  <label className="font-sans text-[0.62rem] font-bold tracking-[0.14em] uppercase text-text-muted block mb-2">Background</label>
                  <select required value={form.background} onChange={set('background')} className={inputCls}>
                    <option value="" disabled>Select your background</option>
                    <option value="Graduate">Graduate</option>
                    <option value="Sales Pro">Sales Pro</option>
                    <option value="Estate Legal">Estate Legal</option>
                    <option value="Financial Advisor">Financial Advisor</option>
                    <option value="Healthcare">Healthcare</option>
                    <option value="Community Leader">Community Leader</option>
                    <option value="Entrepreneur">Entrepreneur</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="font-sans text-[0.62rem] font-bold tracking-[0.14em] uppercase text-text-muted block mb-2">
                    Why do you want to represent Basalith?
                  </label>
                  <textarea required rows={4} value={form.why} onChange={set('why')} className={inputCls + ' resize-none'} />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-monolith-amber w-full text-center mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Submitting\u2026' : 'Register Your Interest'}
                </button>
              </form>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
