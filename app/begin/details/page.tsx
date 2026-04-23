'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Nav           from '../../components/Nav'
import Footer        from '../../components/Footer'
import BeginProgress from '../../components/BeginProgress'

const inputClass =
  'w-full border border-border-subtle rounded-sm px-4 py-3 font-sans text-[0.95rem] text-text-primary bg-obsidian focus:outline-none focus:border-border-amber transition-colors placeholder:text-text-muted'

export default function DetailsPage() {
  const router    = useRouter()
  const [checked, setChecked] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', phone: '', referral: '' })
  const [error, setError] = useState('')

  // Redirect guard + pre-populate referral from ?ref= capture in step 1
  useEffect(() => {
    if (!localStorage.getItem('begin_tier')) {
      router.replace('/begin/tier')
      return
    }
    const ref = localStorage.getItem('begin_ref') ?? ''
    setForm(prev => ({ ...prev, referral: ref }))
    setChecked(true)
  }, [router])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
    // Keep begin_ref in sync as the user edits the referral field
    if (name === 'referral') {
      if (value.trim()) {
        localStorage.setItem('begin_ref', value.trim())
      } else {
        localStorage.removeItem('begin_ref')
      }
    }
  }

  function handleContinue() {
    if (!form.name || !form.email) { setError('Name and email are required.'); return }
    if (!/\S+@\S+\.\S+/.test(form.email)) { setError('Please enter a valid email.'); return }
    localStorage.setItem('begin_details', JSON.stringify({ name: form.name, email: form.email, phone: form.phone }))
    router.push('/begin/review')
  }

  if (!checked) return null

  return (
    <>
      <Nav />
      <main className="min-h-screen bg-obsidian-void px-8 md:px-16 lg:px-24 pt-36 pb-24">
        <div className="max-w-lg mx-auto">
          <BeginProgress step={2} />
          <p className="eyebrow mb-2">Step 2 of 3</p>
          <h1 className="font-serif text-[2.5rem] font-semibold text-text-primary leading-tight tracking-[-0.02em] mb-2">Your Details</h1>
          <p className="font-sans text-[0.95rem] text-text-secondary leading-relaxed mb-12">We will use these to set up your archive and reach out with next steps.</p>

          <div className="flex flex-col gap-5 mb-8">
            <div>
              <label className="block font-sans text-[0.72rem] font-bold tracking-[0.12em] uppercase text-text-muted mb-2">
                Full Name <span className="text-amber">*</span>
              </label>
              <input name="name" value={form.name} onChange={handleChange} placeholder="Robert James Whitfield" autoComplete="name" className={inputClass} />
            </div>
            <div>
              <label className="block font-sans text-[0.72rem] font-bold tracking-[0.12em] uppercase text-text-muted mb-2">
                Email Address <span className="text-amber">*</span>
              </label>
              <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="robert@whitfield.com" autoComplete="email" className={inputClass} />
            </div>
            <div>
              <label className="block font-sans text-[0.72rem] font-bold tracking-[0.12em] uppercase text-text-muted mb-2">
                Phone <span className="font-normal normal-case tracking-normal text-text-muted">(optional)</span>
              </label>
              <input name="phone" type="tel" value={form.phone} onChange={handleChange} placeholder="+1 (555) 000-0000" autoComplete="tel" className={inputClass} />
            </div>
            <div>
              <label className="block font-sans text-[0.72rem] font-bold tracking-[0.12em] uppercase text-text-muted mb-1">
                Referral Code <span className="font-normal normal-case tracking-normal text-text-muted">(optional)</span>
              </label>
              <p className="font-sans text-[0.72rem] text-text-muted mb-2">Leave blank if you were not referred.</p>
              <input name="referral" value={form.referral} onChange={handleChange} placeholder="BSL-XXX-00000" autoComplete="off" className={inputClass} />
            </div>
          </div>

          {error && <p className="font-sans text-[0.82rem] text-red-400 mb-5">{error}</p>}

          <div className="flex items-center gap-5">
            <button onClick={() => router.back()} className="font-sans text-[0.8rem] text-text-muted hover:text-text-primary transition-colors duration-200">
              ← Back
            </button>
            <button onClick={handleContinue} className="btn-monolith-amber">
              Continue →
            </button>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
