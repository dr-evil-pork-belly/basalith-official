'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Nav from '../../components/Nav'

const TIERS = [
  { name: 'The Archive', tagline: 'For individuals beginning their Golden Dataset.', price: '$1,200', monthly: '$100 / month equivalent', founding: '$2,500 one-time founding fee' },
  { name: 'The Estate', tagline: 'Full family archive with legal integration.', price: '$3,600', monthly: '$300 / month equivalent', founding: '$2,500 one-time founding fee', featured: true },
  { name: 'The Dynasty', tagline: 'Multi-generational governance for serious legacies.', price: '$9,600', monthly: '$800 / month equivalent', founding: '$2,500 one-time founding fee' },
]

export default function TierPage() {
  const router = useRouter()
  const [selected, setSelected] = useState<string | null>(null)

  function handleContinue() {
    if (!selected) return
    localStorage.setItem('begin_tier', selected)
    router.push('/begin/details')
  }

  return (
    <>
      <Nav />
      <main className="min-h-screen bg-[#F9F7F4] px-8 md:px-16 lg:px-24 pt-36 pb-24">
        <div className="max-w-4xl mx-auto">
          <p className="text-[0.7rem] font-bold tracking-[0.2em] uppercase text-stone-400 mb-2">Step 1 of 3</p>
          <h1 className="font-serif text-[2.5rem] font-semibold text-stone-900 leading-tight tracking-[-0.02em] mb-2">Choose Your Tier</h1>
          <p className="font-sans text-[0.95rem] text-stone-500 leading-relaxed mb-12">All plans begin with The Founding - a one-time $2,500 setup investment.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
            {TIERS.map(({ name, tagline, price, monthly, founding, featured }) => (
              <button key={name} onClick={() => setSelected(name)} className={['text-left rounded-lg border-2 p-7 transition-all duration-200 cursor-pointer', selected === name ? 'border-amber-500 bg-amber-50' : featured ? 'border-stone-300 bg-white' : 'border-stone-200 bg-white hover:border-stone-300'].join(' ')}>
                {featured && <span className="inline-block text-[0.6rem] font-bold tracking-[0.15em] uppercase text-amber-600 bg-amber-100 px-2 py-0.5 rounded mb-3">Most Popular</span>}
                <h3 className="font-serif text-[1.25rem] font-semibold text-stone-900 mb-1">{name}</h3>
                <p className="font-sans text-[0.8rem] text-stone-500 leading-relaxed mb-5">{tagline}</p>
                <p className="font-serif text-[1.75rem] font-semibold text-stone-900 leading-none mb-1">{price}</p>
                <p className="font-sans text-[0.72rem] text-stone-400 mb-3">{monthly}</p>
                <p className="font-sans text-[0.72rem] text-stone-400 border-t border-stone-100 pt-3">{founding}</p>
                {selected === name && <p className="font-sans text-[0.72rem] font-bold text-amber-600 mt-3">Selected</p>}
              </button>
            ))}
          </div>
          <button onClick={handleContinue} disabled={!selected} className={['font-sans text-[0.8rem] font-bold tracking-[0.1em] uppercase px-8 py-4 rounded transition-all duration-200', selected ? 'bg-stone-900 text-white hover:bg-stone-800' : 'bg-stone-200 text-stone-400 cursor-not-allowed'].join(' ')}>
            Continue
          </button>
        </div>
      </main>
    </>
  )
}