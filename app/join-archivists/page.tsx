'use client'

import { useState } from 'react'
import Nav    from '../components/Nav'
import Footer from '../components/Footer'

const INITIAL = { fullName: '', email: '', background: '', why: '' }

const SERIF: React.CSSProperties = { fontFamily: 'var(--font-cormorant, "Cormorant Garamond", Georgia, serif)' }
const MONO: React.CSSProperties  = { fontFamily: 'var(--font-space-mono, "Space Mono", "Courier New", monospace)', textTransform: 'uppercase' as const, letterSpacing: '0.28em' }
const INPUT: React.CSSProperties = {
  width: '100%', background: 'var(--color-surface)', border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-sm)', outline: 'none',
  fontFamily: 'var(--font-cormorant, "Cormorant Garamond", Georgia, serif)',
  fontSize: '1.05rem', fontWeight: 300, color: 'var(--color-text-primary)',
  padding: '12px 16px', lineHeight: 1.5, boxSizing: 'border-box' as const,
  transition: 'border-color 200ms ease',
}
const LABEL: React.CSSProperties = {
  display: 'block', fontFamily: 'var(--font-space-mono, "Space Mono", "Courier New", monospace)',
  fontSize: '0.52rem', letterSpacing: '0.28em', textTransform: 'uppercase' as const,
  color: 'var(--color-text-muted)', marginBottom: '8px',
}

export default function JoinArchivistsPage() {
  const [form, setForm]             = useState(INITIAL)
  const [submitted, setSubmitted]   = useState(false)
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

  return (
    <>
      <style>{`.jag-input:focus { border-color: var(--color-gold) !important; box-shadow: var(--shadow-gold) !important; } .jag-input::placeholder { color: var(--color-text-faint); font-style: italic; }`}</style>
      <Nav />
      <main style={{ background: 'var(--color-bg)' }}>
        <section style={{ padding: 'clamp(140px,16vw,180px) clamp(24px,6vw,80px) clamp(80px,10vw,120px)' }} aria-label="Join Legacy Guides">
          <div style={{ maxWidth: '640px', margin: '0 auto' }}>

            <p style={{ ...MONO, fontSize: 'var(--text-caption)', color: 'var(--color-gold)', display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
              <span style={{ display: 'block', width: '24px', height: '1px', background: 'var(--color-gold)', flexShrink: 0 }} aria-hidden="true" />
              Legacy Guides
            </p>
            <h1 style={{ ...SERIF, fontWeight: 300, fontSize: 'clamp(2.5rem,5vw,4rem)', color: 'var(--color-text-primary)', lineHeight: 1.1, letterSpacing: '-0.025em', marginBottom: '24px' }}>
              Help families build
              <br />
              what they cannot leave without.
            </h1>

            <div style={{ ...SERIF, fontWeight: 300, fontSize: '1.1rem', lineHeight: 1.85, color: 'var(--color-text-secondary)', marginBottom: '48px' }}>
              <p style={{ marginBottom: '16px' }}>
                Basalith builds living AI entities trained on how specific people think.
                The families who understand what this means need to be found before it is too late.
              </p>
              <p style={{ marginBottom: '16px' }}>
                Legacy Guides are the people who find them.
              </p>
              <p style={{ marginBottom: '16px' }}>
                Not employees. Independent professionals who believe every family deserves
                what Mark Zuckerberg spent $300 million building for himself.
              </p>
              <p>
                If you believe in what we are doing and want to bring it to the families in your life,
                we would like to hear from you.
              </p>
            </div>

            {submitted ? (
              <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderTop: '2px solid var(--color-gold)', padding: '48px 40px', textAlign: 'center' }}>
                <p style={{ ...SERIF, fontWeight: 500, fontSize: '1.4rem', color: 'var(--color-text-primary)', marginBottom: '16px' }}>
                  Your interest has been noted.
                </p>
                <p style={{ ...SERIF, fontStyle: 'italic', fontWeight: 300, fontSize: '1rem', color: 'var(--color-text-secondary)', lineHeight: 1.85 }}>
                  We review every expression personally.
                  Accepted partners receive a complete program briefing by private invitation.
                  <br /><br />
                  You will hear from us if there is a fit.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '20px' }}>
                  <div>
                    <label style={LABEL}>Full Name</label>
                    <input type="text" required placeholder="Your name" value={form.fullName} onChange={set('fullName')} className="jag-input" style={INPUT} />
                  </div>
                  <div>
                    <label style={LABEL}>Email</label>
                    <input type="email" required placeholder="you@domain.com" value={form.email} onChange={set('email')} className="jag-input" style={INPUT} />
                  </div>
                </div>

                <div>
                  <label style={LABEL}>Background</label>
                  <select required value={form.background} onChange={set('background')} className="jag-input" style={{ ...INPUT, cursor: 'pointer', appearance: 'none' as const }}>
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
                  <label style={LABEL}>Why do you want to represent Basalith?</label>
                  <textarea required rows={4} value={form.why} onChange={set('why')} className="jag-input" style={{ ...INPUT, resize: 'none' as const, lineHeight: 1.75 }} />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    ...MONO, fontSize: 'var(--text-caption)',
                    background: submitting ? 'rgba(184,150,62,0.6)' : 'var(--color-gold)',
                    color: 'var(--color-bg)', border: 'none', borderRadius: 'var(--radius-sm)',
                    padding: '14px 32px', cursor: submitting ? 'not-allowed' : 'pointer',
                    width: '100%', transition: 'background 250ms ease',
                  }}
                >
                  {submitting ? 'Submitting…' : 'Register Your Interest'}
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
