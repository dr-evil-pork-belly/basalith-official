'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Nav from '../../components/Nav'

export default function DetailsPage() {
  const router = useRouter()
  const [form, setForm] = useState({ name: '', email: '', phone: '' })
  const [error, setError] = useState('')

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  function handleContinue() {
    if (!form.name || !form.email) { setError('Name and email are required.'); return }
    if (!/\S+@\S+\.\S+/.test(form.email)) { setError('Please enter a valid email.'); return }
    localStorage.setItem('begin_details', JSON.stringify(form))
    router.push('/begin/review')
  }

  return (
    <>
      <Nav />
      <main className="min-h-screen bg-obsidian-void px-8 md:px-16 lg:px-24 pt-36 pb-24">
        <div className="max-w-lg mx-auto">
          <p className="eyebrow mb-2">Step 2 of 3</p>
          <h1 className="font-serif text-[2.5rem] font-semibold text-text-primary leading-tight tracking-[-0.02em] mb-2">Your Details</h1>
          <p className="font-sans text-[0.95rem] text-text-secondary leading-relaxed mb-12">We will use these to set up your archive and reach out with next steps.</p>
          <div className="flex flex-col gap-5 mb-8">
            <div>
              <label className="block font-sans text-[0.72rem] font-bold tracking-[0.12em] uppercase text-text-muted mb-2">Full Name *</label>
              <input name="name" value={form.name} onChange={handleChange} placeholder="Robert James Whitfield" className="w-full border border-border-subtle rounded-sm px-4 py-3 font-sans text-[0.95rem] text-text-primary bg-obsidian focus:outline-none focus:border-border-amber transition-colors placeholder:text-text-muted" />
            </div>
            <div>
              <label className="block font-sans text-[0.72rem] font-bold tracking-[0.12em] uppercase text-text-muted mb-2">Email Address *</label>
              <input name="email" value={form.email} onChange={handleChange} placeholder="robert@whitfield.com" className="w-full border border-border-subtle rounded-sm px-4 py-3 font-sans text-[0.95rem] text-text-primary bg-obsidian focus:outline-none focus:border-border-amber transition-colors placeholder:text-text-muted" />
            </div>
            <div>
              <label className="block font-sans text-[0.72rem] font-bold tracking-[0.12em] uppercase text-text-muted mb-2">Phone <span className="font-normal normal-case tracking-normal text-text-muted">- optional</span></label>
              <input name="phone" value={form.phone} onChange={handleChange} placeholder="+1 (555) 000-0000" className="w-full border border-border-subtle rounded-sm px-4 py-3 font-sans text-[0.95rem] text-text-primary bg-obsidian focus:outline-none focus:border-border-amber transition-colors placeholder:text-text-muted" />
            </div>
          </div>
          {error && <p className="font-sans text-[0.8rem] text-red-400 mb-5">{error}</p>}
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="font-sans text-[0.8rem] text-text-muted hover:text-text-primary transition-colors">Back</button>
            <button onClick={handleContinue} className="font-sans text-[0.8rem] font-bold tracking-[0.1em] uppercase px-8 py-4 rounded-sm bg-amber text-obsidian-void hover:bg-amber/90 transition-all duration-200">Continue</button>
          </div>
        </div>
      </main>
    </>
  )
}