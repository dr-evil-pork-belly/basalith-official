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
      <main className="min-h-screen bg-[#F9F7F4] px-8 md:px-16 lg:px-24 pt-36 pb-24">
        <div className="max-w-lg mx-auto">
          <p className="text-[0.7rem] font-bold tracking-[0.2em] uppercase text-stone-400 mb-2">Step 2 of 3</p>
          <h1 className="font-serif text-[2.5rem] font-semibold text-stone-900 leading-tight tracking-[-0.02em] mb-2">Your Details</h1>
          <p className="font-sans text-[0.95rem] text-stone-500 leading-relaxed mb-12">We will use these to set up your archive and reach out with next steps.</p>
          <div className="flex flex-col gap-5 mb-8">
            <div>
              <label className="block font-sans text-[0.72rem] font-bold tracking-[0.12em] uppercase text-stone-500 mb-2">Full Name *</label>
              <input name="name" value={form.name} onChange={handleChange} placeholder="Robert James Whitfield" className="w-full border border-stone-200 rounded-md px-4 py-3 font-sans text-[0.95rem] text-stone-900 bg-white focus:outline-none focus:border-amber-500 transition-colors" />
            </div>
            <div>
              <label className="block font-sans text-[0.72rem] font-bold tracking-[0.12em] uppercase text-stone-500 mb-2">Email Address *</label>
              <input name="email" value={form.email} onChange={handleChange} placeholder="robert@whitfield.com" className="w-full border border-stone-200 rounded-md px-4 py-3 font-sans text-[0.95rem] text-stone-900 bg-white focus:outline-none focus:border-amber-500 transition-colors" />
            </div>
            <div>
              <label className="block font-sans text-[0.72rem] font-bold tracking-[0.12em] uppercase text-stone-500 mb-2">Phone <span className="font-normal normal-case tracking-normal text-stone-400">- optional</span></label>
              <input name="phone" value={form.phone} onChange={handleChange} placeholder="+1 (555) 000-0000" className="w-full border border-stone-200 rounded-md px-4 py-3 font-sans text-[0.95rem] text-stone-900 bg-white focus:outline-none focus:border-amber-500 transition-colors" />
            </div>
          </div>
          {error && <p className="font-sans text-[0.8rem] text-red-500 mb-5">{error}</p>}
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="font-sans text-[0.8rem] text-stone-400 hover:text-stone-600 transition-colors">Back</button>
            <button onClick={handleContinue} className="font-sans text-[0.8rem] font-bold tracking-[0.1em] uppercase px-8 py-4 rounded bg-stone-900 text-white hover:bg-stone-800 transition-all duration-200">Continue</button>
          </div>
        </div>
      </main>
    </>
  )
}