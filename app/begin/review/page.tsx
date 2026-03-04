'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Nav from '../../components/Nav'
import { supabase } from '../../../lib/supabase'

const TIER_PRICES: Record<string, string> = {
  'The Archive': '$1,200 / year',
  'The Estate': '$3,600 / year',
  'The Dynasty': '$9,600 / year',
}

export default function ReviewPage() {
  const router = useRouter()
  const [tier, setTier] = useState('')
  const [details, setDetails] = useState({ name: '', email: '', phone: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const t = localStorage.getItem('begin_tier')
    const d = localStorage.getItem('begin_details')
    if (!t || !d) { router.push('/begin/tier'); return }
    setTier(t)
    setDetails(JSON.parse(d))
  }, [router])

  async function handleSubmit() {
    setLoading(true)
    setError('')
    const { error } = await supabase.from('signups').insert([{ name: details.name, email: details.email, phone: details.phone || null, tier }])
    if (error) { setError('Something went wrong. Please try again.'); setLoading(false); return }
    localStorage.removeItem('begin_tier')
    localStorage.removeItem('begin_details')
    router.push('/begin/confirmed')
  }

  return (
    <>
      <Nav />
      <main className="min-h-screen bg-obsidian-void px-8 md:px-16 lg:px-24 pt-36 pb-24">
        <div className="max-w-lg mx-auto">
          <p className="eyebrow mb-2">Step 3 of 3</p>
          <h1 className="font-serif text-[2.5rem] font-semibold text-text-primary leading-tight tracking-[-0.02em] mb-2">Review & Confirm</h1>
          <p className="font-sans text-[0.95rem] text-text-secondary leading-relaxed mb-12">Please confirm your details before we reserve your archive.</p>
          <div className="border border-border-subtle rounded-sm p-8 mb-8 flex flex-col gap-6" style={{ background: 'linear-gradient(160deg,#1D1D20,#17171A)' }}>
            <div>
              <p className="eyebrow !text-[0.62rem] mb-1">Selected Tier</p>
              <p className="font-serif text-[1.25rem] font-semibold text-text-primary">{tier}</p>
              <p className="font-sans text-[0.8rem] text-text-muted">{TIER_PRICES[tier]}</p>
            </div>
            <div className="h-px bg-border-subtle" />
            <div>
              <p className="eyebrow !text-[0.62rem] mb-1">One-Time Founding Fee</p>
              <p className="font-serif text-[1.25rem] font-semibold text-text-primary">$2,500</p>
              <p className="font-sans text-[0.8rem] text-text-muted">Due at archive setup</p>
            </div>
            <div className="h-px bg-border-subtle" />
            <div>
              <p className="eyebrow !text-[0.62rem] mb-1">Your Details</p>
              <p className="font-sans text-[0.95rem] text-text-primary">{details.name}</p>
              <p className="font-sans text-[0.9rem] text-text-secondary">{details.email}</p>
              {details.phone && <p className="font-sans text-[0.9rem] text-text-secondary">{details.phone}</p>}
            </div>
          </div>
          {error && <p className="font-sans text-[0.8rem] text-red-400 mb-5">{error}</p>}
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="font-sans text-[0.8rem] text-text-muted hover:text-text-primary transition-colors">Back</button>
            <button onClick={handleSubmit} disabled={loading} className="font-sans text-[0.8rem] font-bold tracking-[0.1em] uppercase px-8 py-4 rounded-sm bg-amber text-obsidian-void hover:bg-amber/90 transition-all duration-200 disabled:opacity-50">{loading ? 'Reserving...' : 'Reserve Your Archive'}</button>
          </div>
        </div>
      </main>
    </>
  )
}