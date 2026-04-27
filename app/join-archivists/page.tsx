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

const P: React.CSSProperties = {
  ...SERIF,
  fontWeight:   300,
  fontSize:     '1.1rem',
  lineHeight:   1.9,
  color:        'var(--color-text-secondary)',
  marginBottom: '20px',
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

            <h1
              style={{
                ...SERIF,
                fontWeight:    300,
                fontSize:      'clamp(2rem,5vw,3.5rem)',
                color:         'var(--color-text-primary)',
                lineHeight:    1.15,
                letterSpacing: '-0.025em',
                marginBottom:  '56px',
              }}
            >
              You will be the reason
              <br />
              a family never has to wonder.
            </h1>

            <p style={P}>
              The hardest conversation
              <br />
              is the one that starts with:
            </p>

            <p
              style={{
                ...SERIF,
                fontWeight:   300,
                fontSize:     '1.2rem',
                fontStyle:    'italic',
                lineHeight:   1.9,
                color:        'var(--color-gold)',
                marginBottom: '28px',
              }}
            >
              &ldquo;I should have done this sooner.&rdquo;
            </p>

            <p style={P}>
              A Legacy Guide begins that conversation
              <br />
              before it becomes regret.
            </p>

            <p style={P}>
              You identify families who understand
              <br />
              what is at stake.
              <br />
              You sit with them.
              <br />
              You help them begin.
            </p>

            <div
              aria-hidden="true"
              style={{
                width:        '40px',
                height:       '1px',
                background:   'var(--color-gold)',
                margin:       '40px 0',
              }}
            />

            <p
              style={{
                fontFamily:    'var(--font-space-mono, "Space Mono", "Courier New", monospace)',
                fontSize:      '0.52rem',
                letterSpacing: '0.22em',
                textTransform: 'uppercase' as const,
                color:         'var(--color-text-muted)',
                marginBottom:  '16px',
              }}
            >
              The Commission
            </p>

            <p style={P}>
              $1,000 on the founding.
              <br />
              8% for the life of the archive.
            </p>

            <div
              aria-hidden="true"
              style={{
                width:        '40px',
                height:       '1px',
                background:   'var(--color-border)',
                margin:       '40px 0',
              }}
            />

            <p style={P}>
              But the work is something else.
            </p>

            <p style={P}>
              You give families something
              <br />
              they did not know was possible.
              <br />
              The chance to never have to wonder.
            </p>

            {submitted ? (
              <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderTop: '2px solid var(--color-gold)', padding: '40px', textAlign: 'center', marginTop: '48px' }}>
                <p style={{ ...SERIF, fontWeight: 500, fontSize: '1.4rem', color: 'var(--color-text-primary)', marginBottom: '16px' }}>
                  Your interest has been noted.
                </p>
                <p style={{ ...SERIF, fontStyle: 'italic', fontWeight: 300, fontSize: '1rem', color: 'var(--color-text-secondary)', lineHeight: 1.85 }}>
                  We review every expression personally.
                  Accepted guides receive a complete briefing by private invitation.
                  <br /><br />
                  You will hear from us if there is a fit.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginTop: '48px' }}>
                <div className="jag-name-email-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '20px' }}>
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
