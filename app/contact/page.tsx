'use client'

import { useState } from 'react'
import Nav from '../components/Nav'
import Footer from '../components/Footer'

type Intent = 'general' | 'pricing' | 'partner' | 'press'
type Status = 'idle' | 'loading' | 'success' | 'error'

const INTENTS: { value: Intent; label: string }[] = [
  { value: 'general', label: 'General Enquiry' },
  { value: 'pricing', label: 'Pricing Question' },
  { value: 'partner', label: 'Partner Program' },
  { value: 'press',   label: 'Press'             },
]

export default function ContactPage() {
  const [form, setForm]     = useState({ name: '', email: '', intent: '' as Intent | '', message: '' })
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError]   = useState('')

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')
    setError('')

    try {
      const res = await fetch('/api/contact', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          name:    form.name,
          email:   form.email,
          message: form.message || undefined,
          intent:  form.intent  || undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok || !data.ok) {
        setError(data.error ?? 'Something went wrong. Please try again.')
        setStatus('error')
        return
      }

      setStatus('success')
    } catch {
      setError('Network error. Please check your connection and try again.')
      setStatus('error')
    }
  }

  const inputClass =
    'w-full border border-border-subtle rounded-sm px-4 py-3 font-sans text-[0.95rem] text-text-primary bg-obsidian focus:outline-none focus:border-border-amber transition-colors duration-200 placeholder:text-text-muted'

  return (
    <>
      <Nav />
      <main>

        {/* ── HERO ── */}
        <section
          className="relative bg-obsidian-void px-8 md:px-16 pt-40 pb-20 overflow-hidden"
          aria-label="Contact hero"
        >
          {/* Grid */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,0.022) 1px,transparent 1px),' +
                'linear-gradient(90deg,rgba(255,255,255,0.022) 1px,transparent 1px)',
              backgroundSize: '80px 80px',
              maskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%,black 20%,transparent 100%)',
            }}
            aria-hidden="true"
          />
          {/* Amber radiance */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 55%,rgba(255,179,71,0.07) 0%,transparent 65%)' }}
            aria-hidden="true"
          />

          <div className="relative z-10 text-center max-w-2xl mx-auto">
            <p className="eyebrow mb-6">Get In Touch</p>
            <h1
              className="font-serif font-semibold text-text-primary leading-[0.92] tracking-[-0.038em] mb-6"
              style={{ fontSize: 'clamp(3rem,6vw,5rem)' }}
            >
              Every Legacy Begins{' '}
              <em className="italic font-medium text-amber" style={{ fontStyle: 'italic' }}>
                With a Conversation.
              </em>
            </h1>
            <p className="font-sans font-light text-body-base text-text-secondary leading-[1.82]">
              We are a small, deliberate team. If you are serious about building a Golden Dataset
              for your family, we want to hear from you.
            </p>
          </div>
        </section>

        {/* ── FORM ── */}
        <section
          className="relative bg-obsidian-deep px-8 md:px-16 lg:px-24 py-20 overflow-hidden"
          aria-label="Contact form"
        >
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-border-amber to-transparent" />

          <div className="max-w-xl mx-auto">
            <div
              className="glass-obsidian rounded-sm p-10 md:p-12"
              style={{ boxShadow: '0 32px 64px rgba(0,0,0,0.7)' }}
            >
              {status === 'success' ? (
                /* ── Success state ── */
                <div className="text-center py-6">
                  <div className="w-14 h-14 rounded-full bg-amber/10 border border-border-amber flex items-center justify-center mx-auto mb-7 animate-spark">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M5 12l5 5L20 7" stroke="#FFB347" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <p className="eyebrow mb-4">Message Received</p>
                  <h2 className="font-serif text-[1.75rem] font-semibold text-text-primary leading-tight tracking-[-0.02em] mb-4">
                    We&apos;ll Be In Touch.
                  </h2>
                  <p className="font-sans font-light text-body-base text-text-secondary leading-[1.82]">
                    Thank you for reaching out. We respond to every message personally within 48 hours.
                  </p>
                </div>
              ) : (
                /* ── Form state ── */
                <form onSubmit={handleSubmit} noValidate>
                  <div className="mb-8">
                    <p className="font-serif text-[1.5rem] font-semibold text-text-primary leading-tight tracking-[-0.02em] mb-1">
                      Send a Message
                    </p>
                    <p className="font-sans text-[0.82rem] text-text-muted">
                      We respond personally within 48 hours.
                    </p>
                  </div>

                  <div className="flex flex-col gap-5">

                    {/* Name */}
                    <div>
                      <label htmlFor="name" className="block font-sans text-[0.72rem] font-bold tracking-[0.12em] uppercase text-text-muted mb-2">
                        Full Name <span className="text-amber">*</span>
                      </label>
                      <input
                        id="name"
                        name="name"
                        type="text"
                        value={form.name}
                        onChange={handleChange}
                        placeholder="Robert James Whitfield"
                        required
                        autoComplete="name"
                        className={inputClass}
                      />
                    </div>

                    {/* Email */}
                    <div>
                      <label htmlFor="email" className="block font-sans text-[0.72rem] font-bold tracking-[0.12em] uppercase text-text-muted mb-2">
                        Email Address <span className="text-amber">*</span>
                      </label>
                      <input
                        id="email"
                        name="email"
                        type="email"
                        value={form.email}
                        onChange={handleChange}
                        placeholder="robert@whitfield.com"
                        required
                        autoComplete="email"
                        className={inputClass}
                      />
                    </div>

                    {/* Intent */}
                    <div>
                      <label htmlFor="intent" className="block font-sans text-[0.72rem] font-bold tracking-[0.12em] uppercase text-text-muted mb-2">
                        Nature of Enquiry
                      </label>
                      <select
                        id="intent"
                        name="intent"
                        value={form.intent}
                        onChange={handleChange}
                        className={inputClass + ' appearance-none'}
                        style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'8\' viewBox=\'0 0 12 8\'%3E%3Cpath d=\'M1 1l5 5 5-5\' stroke=\'%235C6166\' stroke-width=\'1.5\' fill=\'none\' stroke-linecap=\'round\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center' }}
                      >
                        <option value="" disabled>Select a topic…</option>
                        {INTENTS.map(({ value, label }) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    </div>

                    {/* Message */}
                    <div>
                      <label htmlFor="message" className="block font-sans text-[0.72rem] font-bold tracking-[0.12em] uppercase text-text-muted mb-2">
                        Message <span className="font-normal normal-case tracking-normal text-text-muted">— optional</span>
                      </label>
                      <textarea
                        id="message"
                        name="message"
                        value={form.message}
                        onChange={handleChange}
                        placeholder="Tell us what you have in mind…"
                        rows={5}
                        className={inputClass + ' resize-none'}
                      />
                    </div>

                  </div>

                  {/* Error message */}
                  {status === 'error' && error && (
                    <p className="font-sans text-[0.82rem] text-red-400 mt-5" role="alert">
                      {error}
                    </p>
                  )}

                  <div className="mt-8 flex items-center gap-5 flex-wrap">
                    <button
                      type="submit"
                      disabled={status === 'loading'}
                      className="btn-monolith-amber"
                    >
                      {status === 'loading' ? (
                        <>
                          <span
                            className="inline-block w-3.5 h-3.5 rounded-full border-2 border-obsidian/40 border-t-obsidian animate-spin"
                            aria-hidden="true"
                          />
                          Sending…
                        </>
                      ) : (
                        'Send Message →'
                      )}
                    </button>
                    <p className="font-sans text-[0.72rem] text-text-muted">
                      Or email{' '}
                      <a href="mailto:legacy@basalith.xyz" className="text-amber-dim hover:text-amber transition-colors duration-200">
                        legacy@basalith.xyz
                      </a>
                    </p>
                  </div>
                </form>
              )}
            </div>
          </div>
        </section>

      </main>
      <Footer />
    </>
  )
}
