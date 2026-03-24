'use client'

import { useState } from 'react'
import Nav    from '../components/Nav'
import Footer from '../components/Footer'

// ── Data ─────────────────────────────────────────────────────────────────────

const VALUE_POINTS = [
  {
    num:   '01',
    title: 'Commission Structure',
    desc:  '10% recurring annual commission on every archive you refer, paid quarterly. The Archive tier pays $120/year per client. The Estate pays $360. The Dynasty pays $960. Every year. For as long as that archive is active.',
  },
  {
    num:   '02',
    title: 'Your Referral Link',
    desc:  'A unique referral code — yours from day one. White-label compatible. Works embedded in your own client communications, estate planning materials, or referral portal. No Basalith branding required.',
  },
  {
    num:   '03',
    title: 'The Offering',
    desc:  'A Golden Dataset is a generational asset no other provider touches. Estate attorneys already counsel clients on what to preserve. We give you the infrastructure to do it properly — and a revenue stream for doing so.',
  },
]

const PROFESSIONS = [
  'Estate Attorney',
  'Financial Advisor',
  'Wealth Manager',
  'Luxury Real Estate',
  'Family Office',
  'Concierge Medicine',
  'Other',
] as const

type Profession = typeof PROFESSIONS[number]

const WHO_WE_WORK_WITH = [
  { title: 'Estate Attorneys',       desc: 'You already have the conversation about what clients want to leave behind. We give you the infrastructure to make it happen.' },
  { title: 'Financial Advisors',     desc: 'Your clients trust you with their most valuable assets. A Golden Dataset belongs on that list.' },
  { title: 'Wealth Managers',        desc: 'Multi-generational families need multi-generational thinking. Basalith is built for the clients you serve best.' },
  { title: 'Luxury Real Estate',     desc: 'Your clients are building the homes their families will inherit. Help them build the archive those families will live inside.' },
  { title: 'Family Offices',         desc: 'You govern the full picture of a family\'s assets. The archive is the asset no one has formalised yet.' },
  { title: 'Concierge Medicine',     desc: 'You have their trust at the most personal level. No one is better positioned to introduce the idea of legacy preservation.' },
]

// ── Types ────────────────────────────────────────────────────────────────────

type Status = 'idle' | 'loading' | 'success' | 'error'

// ── Component ────────────────────────────────────────────────────────────────

export default function PartnerPage() {
  const [form, setForm] = useState({
    name:       '',
    email:      '',
    firm_name:  '',
    profession: '' as Profession | '',
    message:    '',
  })
  const [status, setStatus]           = useState<Status>('idle')
  const [error, setError]             = useState('')
  const [referralCode, setReferralCode] = useState('')

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')
    setError('')

    try {
      const res  = await fetch('/api/partner', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          name:       form.name,
          email:      form.email,
          firm_name:  form.firm_name  || undefined,
          profession: form.profession || undefined,
          message:    form.message    || undefined,
        }),
      })
      const data = await res.json()

      if (!res.ok || !data.ok) {
        setError(data.error ?? 'Something went wrong. Please try again.')
        setStatus('error')
        return
      }

      setReferralCode(data.referral_code)
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

        {/* ── A: HERO ── */}
        <section
          className="relative bg-obsidian-void px-8 md:px-16 pt-40 pb-28 overflow-hidden"
          aria-label="Partner program hero"
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
            style={{ background: 'radial-gradient(ellipse 60% 55% at 50% 55%,rgba(255,179,71,0.07) 0%,transparent 65%)' }}
            aria-hidden="true"
          />

          <div className="relative z-10 max-w-3xl mx-auto text-center">
            <p className="eyebrow mb-7">Partner Program</p>
            <h1
              className="font-serif font-semibold text-text-primary leading-[0.92] tracking-[-0.038em] mb-8"
              style={{ fontSize: 'clamp(3rem,6.5vw,5.75rem)' }}
            >
              Earn a Living From{' '}
              <em className="italic font-medium text-amber" style={{ fontStyle: 'italic' }}>
                Selling Permanence.
              </em>
            </h1>
            <p className="font-sans font-light text-body-base text-text-secondary leading-[1.82] max-w-2xl mx-auto mb-4">
              Basalith is the first institution purpose-built for legacy preservation as a legal asset.
              Our partner program is for professionals who already advise the families we serve —
              and who want to offer them something no one else can.
            </p>
            <p className="font-sans font-light text-body-base text-text-secondary leading-[1.82] max-w-2xl mx-auto mb-12">
              10% recurring commission. A referral code that is yours permanently.
              A product that sells itself to the right client.
            </p>
            <a href="#apply" className="btn-monolith-amber">
              Apply to Partner Program →
            </a>
          </div>
        </section>

        {/* ── B: THREE VALUE POINTS ── */}
        <section
          className="relative bg-obsidian-deep px-8 md:px-16 lg:px-24 py-28 overflow-hidden"
          aria-label="Partner value points"
        >
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-border-amber to-transparent" />

          <div className="text-center max-w-xl mx-auto mb-16 reveal">
            <p className="eyebrow mb-4">Why It Works</p>
            <h2
              className="font-serif font-semibold text-text-primary leading-[1.0] tracking-[-0.03em]"
              style={{ fontSize: 'clamp(2rem,4vw,3.25rem)' }}
            >
              Built for Professionals Who Think in Decades.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-6xl mx-auto reveal">
            {VALUE_POINTS.map(({ num, title, desc }) => (
              <div
                key={num}
                className="group relative rounded-sm border border-border-subtle bg-white/[0.018] p-8 overflow-hidden transition-colors duration-300 hover:border-border-amber hover:bg-amber/[0.022]"
              >
                <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-transparent to-transparent transition-all duration-300 group-hover:via-amber/38" />
                <p className="font-serif text-[2.75rem] font-light text-amber/14 leading-none mb-4">{num}</p>
                <p className="font-sans text-[0.78rem] font-bold tracking-[0.1em] uppercase text-text-primary mb-3">{title}</p>
                <p className="font-sans font-light text-body-sm text-text-secondary leading-[1.75]">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── C: WHO WE WORK WITH ── */}
        <section
          className="relative bg-obsidian px-8 md:px-16 lg:px-24 py-28 overflow-hidden"
          aria-label="Who we work with"
        >
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-border-subtle to-transparent" />
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse 55% 60% at 50% 50%,rgba(255,179,71,0.04) 0%,transparent 65%)' }}
            aria-hidden="true"
          />

          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16 reveal">
              <p className="eyebrow mb-4">Accepted Professions</p>
              <h2
                className="font-serif font-semibold text-text-primary leading-[1.0] tracking-[-0.03em]"
                style={{ fontSize: 'clamp(2rem,4vw,3.25rem)' }}
              >
                The Clients Already In Your Office.
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 reveal">
              {WHO_WE_WORK_WITH.map(({ title, desc }) => (
                <div
                  key={title}
                  className="rounded-sm border border-border-subtle p-7"
                  style={{ background: 'linear-gradient(160deg,#1D1D20,#17171A)' }}
                >
                  <div className="flex items-center gap-2.5 mb-3">
                    <span className="ai-dot flex-shrink-0" />
                    <p className="font-sans text-[0.78rem] font-bold tracking-[0.1em] uppercase text-text-primary">{title}</p>
                  </div>
                  <p className="font-sans font-light text-body-sm text-text-secondary leading-[1.72]">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── D: APPLICATION FORM ── */}
        <section
          id="apply"
          className="relative bg-obsidian-deep px-8 md:px-16 lg:px-24 py-28 overflow-hidden"
          aria-label="Partner application"
        >
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-border-amber to-transparent" />
          <div
            className="absolute pointer-events-none"
            style={{ width: 800, height: 400, top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: 'radial-gradient(ellipse,rgba(255,179,71,0.05) 0%,transparent 65%)' }}
            aria-hidden="true"
          />

          <div className="relative z-10 max-w-xl mx-auto">
            <div className="text-center mb-12">
              <p className="eyebrow mb-4">Apply</p>
              <h2
                className="font-serif font-semibold text-text-primary leading-[1.0] tracking-[-0.03em] mb-4"
                style={{ fontSize: 'clamp(2rem,4vw,3.25rem)' }}
              >
                Begin the Conversation.
              </h2>
              <p className="font-sans font-light text-body-base text-text-secondary leading-[1.82]">
                Applications are reviewed personally. We respond within 3 business days.
              </p>
            </div>

            <div
              className="glass-obsidian rounded-sm p-10 md:p-12"
              style={{ boxShadow: '0 32px 64px rgba(0,0,0,0.7)' }}
            >
              {status === 'success' ? (
                /* ── Success ── */
                <div className="text-center py-4">
                  <div className="w-14 h-14 rounded-full bg-amber/10 border border-border-amber flex items-center justify-center mx-auto mb-7 animate-spark">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M5 12l5 5L20 7" stroke="#FFB347" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <p className="eyebrow mb-4">Application Received</p>
                  <h3 className="font-serif text-[1.75rem] font-semibold text-text-primary leading-tight tracking-[-0.02em] mb-5">
                    Welcome to the Program.
                  </h3>
                  <div
                    className="rounded-sm border border-border-amber px-6 py-4 mb-6 inline-block"
                    style={{ background: 'rgba(255,179,71,0.06)' }}
                  >
                    <p className="eyebrow !text-[0.6rem] mb-1">Your Referral Code</p>
                    <p className="font-serif text-[1.5rem] font-semibold text-amber tracking-[0.06em]">
                      {referralCode}
                    </p>
                  </div>
                  <p className="font-sans font-light text-body-sm text-text-secondary leading-[1.82]">
                    Our team will be in touch within 3 business days to complete your onboarding.
                  </p>
                </div>
              ) : (
                /* ── Form ── */
                <form onSubmit={handleSubmit} noValidate>
                  <div className="mb-8">
                    <p className="font-serif text-[1.5rem] font-semibold text-text-primary leading-tight tracking-[-0.02em] mb-1">
                      Partner Application
                    </p>
                    <p className="font-sans text-[0.82rem] text-text-muted">
                      We review every application personally.
                    </p>
                  </div>

                  <div className="flex flex-col gap-5">
                    {/* Name */}
                    <div>
                      <label htmlFor="p-name" className="block font-sans text-[0.72rem] font-bold tracking-[0.12em] uppercase text-text-muted mb-2">
                        Full Name <span className="text-amber">*</span>
                      </label>
                      <input
                        id="p-name"
                        name="name"
                        type="text"
                        value={form.name}
                        onChange={handleChange}
                        placeholder="David James Harrison"
                        required
                        autoComplete="name"
                        className={inputClass}
                      />
                    </div>

                    {/* Email */}
                    <div>
                      <label htmlFor="p-email" className="block font-sans text-[0.72rem] font-bold tracking-[0.12em] uppercase text-text-muted mb-2">
                        Email Address <span className="text-amber">*</span>
                      </label>
                      <input
                        id="p-email"
                        name="email"
                        type="email"
                        value={form.email}
                        onChange={handleChange}
                        placeholder="david@harrisonlaw.com"
                        required
                        autoComplete="email"
                        className={inputClass}
                      />
                    </div>

                    {/* Firm Name */}
                    <div>
                      <label htmlFor="p-firm" className="block font-sans text-[0.72rem] font-bold tracking-[0.12em] uppercase text-text-muted mb-2">
                        Firm Name <span className="font-normal normal-case tracking-normal text-text-muted">— optional</span>
                      </label>
                      <input
                        id="p-firm"
                        name="firm_name"
                        type="text"
                        value={form.firm_name}
                        onChange={handleChange}
                        placeholder="Harrison & Associates"
                        autoComplete="organization"
                        className={inputClass}
                      />
                    </div>

                    {/* Profession */}
                    <div>
                      <label htmlFor="p-profession" className="block font-sans text-[0.72rem] font-bold tracking-[0.12em] uppercase text-text-muted mb-2">
                        Profession <span className="text-amber">*</span>
                      </label>
                      <select
                        id="p-profession"
                        name="profession"
                        value={form.profession}
                        onChange={handleChange}
                        required
                        className={inputClass + ' appearance-none'}
                        style={{
                          backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'8\' viewBox=\'0 0 12 8\'%3E%3Cpath d=\'M1 1l5 5 5-5\' stroke=\'%235C6166\' stroke-width=\'1.5\' fill=\'none\' stroke-linecap=\'round\'/%3E%3C/svg%3E")',
                          backgroundRepeat: 'no-repeat',
                          backgroundPosition: 'right 1rem center',
                        }}
                      >
                        <option value="" disabled>Select your profession…</option>
                        {PROFESSIONS.map(p => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    </div>

                    {/* Message */}
                    <div>
                      <label htmlFor="p-message" className="block font-sans text-[0.72rem] font-bold tracking-[0.12em] uppercase text-text-muted mb-2">
                        Why You Want to Partner <span className="font-normal normal-case tracking-normal text-text-muted">— optional</span>
                      </label>
                      <textarea
                        id="p-message"
                        name="message"
                        value={form.message}
                        onChange={handleChange}
                        placeholder="Tell us about your practice and the clients you serve…"
                        rows={4}
                        className={inputClass + ' resize-none'}
                      />
                    </div>
                  </div>

                  {status === 'error' && error && (
                    <p className="font-sans text-[0.82rem] text-red-400 mt-5" role="alert">{error}</p>
                  )}

                  <div className="mt-8">
                    <button type="submit" disabled={status === 'loading'} className="btn-monolith-amber w-full justify-center">
                      {status === 'loading' ? (
                        <>
                          <span className="inline-block w-3.5 h-3.5 rounded-full border-2 border-obsidian/40 border-t-obsidian animate-spin" aria-hidden="true" />
                          Submitting…
                        </>
                      ) : (
                        'Submit Application →'
                      )}
                    </button>
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
