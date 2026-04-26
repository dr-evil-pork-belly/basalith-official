'use client'

import { useState } from 'react'
import Nav    from '../components/Nav'
import Footer from '../components/Footer'

type Intent = 'general' | 'pricing' | 'partner' | 'press'
type Status = 'idle' | 'loading' | 'success' | 'error'

const INTENTS: { value: Intent; label: string }[] = [
  { value: 'general', label: 'General Enquiry' },
  { value: 'pricing', label: 'Pricing Question' },
  { value: 'partner', label: 'Partner Program'  },
  { value: 'press',   label: 'Press'             },
]

const SERIF: React.CSSProperties = {
  fontFamily: 'var(--font-cormorant, "Cormorant Garamond", Georgia, serif)',
}
const MONO: React.CSSProperties = {
  fontFamily:    'var(--font-space-mono, "Space Mono", "Courier New", monospace)',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.28em',
}
const LABEL: React.CSSProperties = {
  display:       'block',
  fontFamily:    'var(--font-space-mono, "Space Mono", "Courier New", monospace)',
  fontSize:      '0.52rem',
  letterSpacing: '0.28em',
  textTransform: 'uppercase' as const,
  color:         'var(--color-text-muted)',
  marginBottom:  '8px',
}
const INPUT: React.CSSProperties = {
  width:        '100%',
  background:   'var(--color-surface)',
  border:       '1px solid var(--color-border)',
  borderRadius: 'var(--radius-sm)',
  outline:      'none',
  fontFamily:   'var(--font-cormorant, "Cormorant Garamond", Georgia, serif)',
  fontSize:     '1.05rem',
  fontWeight:   300,
  color:        'var(--color-text-primary)',
  padding:      '12px 16px',
  lineHeight:   1.5,
  boxSizing:    'border-box' as const,
  transition:   'border-color 200ms ease, box-shadow 200ms ease',
}

export default function ContactPage() {
  const [form,   setForm]   = useState({ name: '', email: '', intent: '' as Intent | '', message: '' })
  const [status, setStatus] = useState<Status>('idle')
  const [error,  setError]  = useState('')

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')
    setError('')
    try {
      const res  = await fetch('/api/contact', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ name: form.name, email: form.email, message: form.message || undefined, intent: form.intent || undefined }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) { setError(data.error ?? 'Something went wrong. Please try again.'); setStatus('error'); return }
      setStatus('success')
    } catch {
      setError('Network error. Please check your connection and try again.')
      setStatus('error')
    }
  }

  return (
    <>
      <style>{`
        .contact-input:focus { border-color: var(--color-gold) !important; box-shadow: var(--shadow-gold) !important; }
        .contact-input::placeholder { color: var(--color-text-faint); font-style: italic; }
      `}</style>
      <Nav />
      <main style={{ background: 'var(--color-bg)' }}>

        {/* Hero */}
        <section style={{ padding: 'clamp(140px,16vw,180px) clamp(24px,6vw,80px) clamp(60px,8vw,80px)', textAlign: 'center' }}>
          <p style={{ ...MONO, fontSize: 'var(--text-caption)', color: 'var(--color-gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '24px' }}>
            <span style={{ display: 'block', width: '24px', height: '1px', background: 'var(--color-gold)', flexShrink: 0 }} aria-hidden="true" />
            Get In Touch
            <span style={{ display: 'block', width: '24px', height: '1px', background: 'var(--color-gold)', flexShrink: 0 }} aria-hidden="true" />
          </p>
          <h1 style={{ ...SERIF, fontWeight: 300, fontSize: 'var(--text-h1)', color: 'var(--color-text-primary)', letterSpacing: '-0.025em', lineHeight: 1.1, marginBottom: '20px' }}>
            Every Legacy Begins{' '}
            <em style={{ fontStyle: 'italic', color: 'var(--color-gold)' }}>With a Conversation.</em>
          </h1>
          <p style={{ ...SERIF, fontStyle: 'italic', fontWeight: 300, fontSize: '1.1rem', color: 'var(--color-text-secondary)', lineHeight: 1.8, maxWidth: '440px', margin: '0 auto' }}>
            We are a small, deliberate team. If you are serious about building an archive for your family, we want to hear from you.
          </p>
        </section>

        {/* Form */}
        <section style={{ background: 'var(--color-surface-alt)', padding: 'clamp(48px,6vw,80px) clamp(24px,6vw,80px)' }} aria-label="Contact form">
          <div style={{ maxWidth: '520px', margin: '0 auto' }}>

            {status === 'success' ? (
              <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderTop: '2px solid var(--color-gold)', padding: '48px 40px', textAlign: 'center' }}>
                <div style={{ width: '40px', height: '1px', background: 'var(--color-gold)', margin: '0 auto 32px' }} aria-hidden="true" />
                <h2 style={{ ...SERIF, fontSize: '1.75rem', fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: '16px' }}>
                  We&apos;ll Be In Touch.
                </h2>
                <p style={{ ...SERIF, fontStyle: 'italic', fontWeight: 300, fontSize: '1rem', color: 'var(--color-text-secondary)', lineHeight: 1.8 }}>
                  Thank you for reaching out. We respond to every message personally within 48 hours.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderTop: '2px solid var(--color-gold-border)', padding: 'clamp(32px,5vw,48px)', display: 'flex', flexDirection: 'column', gap: '28px' }}>

                <div>
                  <h2 style={{ ...SERIF, fontSize: '1.4rem', fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: '4px' }}>Send a Message</h2>
                  <p style={{ ...SERIF, fontStyle: 'italic', fontWeight: 300, fontSize: '0.95rem', color: 'var(--color-text-muted)' }}>We respond personally within 48 hours.</p>
                </div>

                <div>
                  <label htmlFor="c-name" style={LABEL}>Full Name <span style={{ color: 'var(--color-gold)' }}>*</span></label>
                  <input id="c-name" name="name" type="text" value={form.name} onChange={handleChange} placeholder="Robert James Whitfield" required autoComplete="name" className="contact-input" style={INPUT} />
                </div>

                <div>
                  <label htmlFor="c-email" style={LABEL}>Email Address <span style={{ color: 'var(--color-gold)' }}>*</span></label>
                  <input id="c-email" name="email" type="email" value={form.email} onChange={handleChange} placeholder="robert@whitfield.com" required autoComplete="email" className="contact-input" style={INPUT} />
                </div>

                <div>
                  <label htmlFor="c-intent" style={LABEL}>Nature of Enquiry</label>
                  <select id="c-intent" name="intent" value={form.intent} onChange={handleChange} className="contact-input" style={{ ...INPUT, cursor: 'pointer', appearance: 'none' as const }}>
                    <option value="" disabled>Select a topic…</option>
                    {INTENTS.map(({ value, label }) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="c-message" style={LABEL}>Message <span style={{ fontFamily: 'inherit', textTransform: 'none', letterSpacing: 0, fontSize: '0.85rem', fontStyle: 'italic', color: 'var(--color-text-faint)' }}>(optional)</span></label>
                  <textarea id="c-message" name="message" value={form.message} onChange={handleChange} placeholder="Tell us what you have in mind…" rows={5} className="contact-input" style={{ ...INPUT, resize: 'none' as const, lineHeight: 1.75 }} />
                </div>

                {status === 'error' && error && (
                  <p style={{ ...SERIF, fontSize: '0.9rem', fontStyle: 'italic', color: 'var(--color-text-muted)' }} role="alert">{error}</p>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
                  <button
                    type="submit"
                    disabled={status === 'loading'}
                    style={{
                      ...MONO,
                      fontSize:      'var(--text-caption)',
                      background:    status === 'loading' ? 'rgba(184,150,62,0.6)' : 'var(--color-gold)',
                      color:         'var(--color-bg)',
                      border:        'none',
                      borderRadius:  'var(--radius-sm)',
                      padding:       '13px 28px',
                      cursor:        status === 'loading' ? 'not-allowed' : 'pointer',
                      transition:    'background 250ms ease',
                    }}
                  >
                    {status === 'loading' ? 'Sending…' : 'Send Message →'}
                  </button>
                  <p style={{ ...SERIF, fontStyle: 'italic', fontWeight: 300, fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
                    Or email{' '}
                    <a href="mailto:legacy@basalith.xyz" style={{ color: 'var(--color-gold)', textDecoration: 'none' }}>
                      legacy@basalith.xyz
                    </a>
                  </p>
                </div>
              </form>
            )}
          </div>
        </section>

      </main>
      <Footer />
    </>
  )
}
