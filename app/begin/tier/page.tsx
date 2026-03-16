'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Nav from '../../components/Nav'
import Footer from '../../components/Footer'

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
      <main className="min-h-screen bg-obsidian-void px-8 md:px-16 lg:px-24 pt-36 pb-24">
        <div className="max-w-4xl mx-auto">
          <p className="eyebrow mb-2">Step 1 of 3</p>
          <h1 className="font-serif text-[2.5rem] font-semibold text-text-primary leading-tight tracking-[-0.02em] mb-2">Choose Your Tier</h1>
          <p className="font-sans text-[0.95rem] text-text-secondary leading-relaxed mb-12">All plans begin with The Founding - a one-time $2,500 setup investment.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
            {TIERS.map(({ name, tagline, price, monthly, founding, featured }) => (
              <button key={name} onClick={() => setSelected(name)} className={['text-left rounded-sm border p-7 transition-all duration-200 cursor-pointer', selected === name ? 'border-border-amber bg-obsidian-deep' : featured ? 'border-border-subtle bg-obsidian-deep' : 'border-border-subtle bg-obsidian hover:border-border-amber'].join(' ')}>
                {featured && <span className="inline-block text-[0.6rem] font-bold tracking-[0.15em] uppercase text-amber bg-amber/10 px-2 py-0.5 rounded mb-3">Most Popular</span>}
                <h3 className="font-serif text-[1.25rem] font-semibold text-text-primary mb-1">{name}</h3>
                <p className="font-sans text-[0.8rem] text-text-secondary leading-relaxed mb-5">{tagline}</p>
                <p className="font-serif text-[1.75rem] font-semibold text-text-primary leading-none mb-1">{price}</p>
                <p className="font-sans text-[0.72rem] text-text-muted mb-3">{monthly}</p>
                <p className="font-sans text-[0.72rem] text-text-muted border-t border-border-subtle pt-3">{founding}</p>
                {selected === name && <p className="font-sans text-[0.72rem] font-bold text-amber mt-3">Selected</p>}
              </button>
            ))}
          </div>
          <button onClick={handleContinue} disabled={!selected} className="btn-monolith-amber">
            Continue →
          </button>
        </div>
      </main>
      <Footer />
    </>
  )
}