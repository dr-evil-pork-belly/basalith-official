'use client'

import { useState, useEffect } from 'react'

interface DecadeCoverage {
  decade:     number
  label:      string
  photoCount: number
  coverage:   number
  status:     string
}

interface DimensionCoverage {
  dimension: string
  label:     string
  score:     number
  status:    string
}

function statusColor(status: string): string {
  switch (status) {
    case 'complete': return '#C4A24A'
    case 'rich':     return 'rgba(196,162,74,0.7)'
    case 'growing':  return 'rgba(196,162,74,0.4)'
    case 'sparse':   return 'rgba(196,162,74,0.15)'
    default:         return 'rgba(196,162,74,0.05)'
  }
}

export default function MemoryMapClient() {
  const [loading,          setLoading]          = useState(true)
  const [decadeData,       setDecadeData]        = useState<DecadeCoverage[]>([])
  const [dimensionData,    setDimensionData]     = useState<DimensionCoverage[]>([])
  const [weakestDecade,    setWeakestDecade]     = useState<DecadeCoverage | null>(null)
  const [weakestDimension, setWeakestDimension] = useState<DimensionCoverage | null>(null)

  useEffect(() => {
    fetch('/api/archive/memory-map')
      .then(r => r.json())
      .then(data => {
        setDecadeData(data.decadeCoverage     ?? [])
        setDimensionData(data.dimensionCoverage ?? [])
        setWeakestDecade(data.weakestDecade     ?? null)
        setWeakestDimension(data.weakestDimension ?? null)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '400px' }}>
        <p style={{ fontFamily: '"Courier New",monospace', fontSize: '0.42rem', letterSpacing: '0.3em', color: 'rgba(196,162,74,0.4)', textTransform: 'uppercase' }}>
          Mapping your archive…
        </p>
      </div>
    )
  }

  const LEGEND = [
    { label: 'Missing',  status: 'empty'    },
    { label: 'Sparse',   status: 'sparse'   },
    { label: 'Growing',  status: 'growing'  },
    { label: 'Rich',     status: 'rich'     },
    { label: 'Complete', status: 'complete' },
  ]

  return (
    <div style={{ paddingBottom: '64px' }}>

      {/* Header */}
      <div style={{ marginBottom: '48px' }}>
        <p style={{ fontFamily: '"Courier New",monospace', fontSize: '0.42rem', letterSpacing: '0.35em', textTransform: 'uppercase', color: '#C4A24A', marginBottom: '8px' }}>
          Memory Map
        </p>
        <h1 style={{ fontFamily: 'Georgia,serif', fontSize: 'clamp(1.5rem,3vw,2.5rem)', fontWeight: 300, color: '#F0EDE6', margin: '0 0 12px' }}>
          Where your archive is strong.
          Where it needs you.
        </h1>
        <p style={{ fontFamily: 'Georgia,serif', fontSize: '1rem', fontStyle: 'italic', color: '#706C65', lineHeight: 1.7, maxWidth: '560px', margin: 0 }}>
          Every decade of a life tells a different story.
          Every dimension reveals a different truth.
          The map shows what has been captured and what is still missing.
        </p>
      </div>

      {/* Alert for weakest areas */}
      {(weakestDecade || weakestDimension) && (
        <div style={{ background: 'rgba(196,162,74,0.06)', border: '1px solid rgba(196,162,74,0.2)', borderLeft: '3px solid #C4A24A', padding: '20px 24px', marginBottom: '48px', borderRadius: '2px' }}>
          <p style={{ fontFamily: '"Courier New",monospace', fontSize: '0.4rem', letterSpacing: '0.25em', textTransform: 'uppercase', color: '#C4A24A', marginBottom: '8px' }}>
            Needs Attention
          </p>
          {weakestDecade && (
            <p style={{ fontFamily: 'Georgia,serif', fontSize: '1rem', color: '#F0EDE6', lineHeight: 1.7, marginBottom: '4px' }}>
              The {weakestDecade.label} {weakestDecade.photoCount === 0
                ? 'have no photographs yet.'
                : `have only ${weakestDecade.photoCount} photograph${weakestDecade.photoCount === 1 ? '' : 's'}.`}
            </p>
          )}
          {weakestDimension && (
            <p style={{ fontFamily: 'Georgia,serif', fontSize: '1rem', fontStyle: 'italic', color: '#B8B4AB', lineHeight: 1.7, margin: 0 }}>
              {weakestDimension.label} is the least documented dimension.
              Wisdom sessions and voice recordings help most here.
            </p>
          )}
        </div>
      )}

      {/* Decade bars */}
      <div style={{ marginBottom: '64px' }}>
        <p style={{ fontFamily: '"Courier New",monospace', fontSize: '0.42rem', letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(196,162,74,0.6)', marginBottom: '24px' }}>
          By Decade
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {decadeData.map(d => (
            <div key={d.decade} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <span style={{ fontFamily: '"Courier New",monospace', fontSize: '0.52rem', letterSpacing: '0.15em', color: '#706C65', width: '52px', flexShrink: 0 }}>
                {d.label}
              </span>
              <div style={{ flex: 1, height: '8px', background: 'rgba(196,162,74,0.08)', borderRadius: '2px', overflow: 'hidden', maxWidth: '400px' }}>
                <div style={{ height: '100%', width: `${d.coverage}%`, background: statusColor(d.status), borderRadius: '2px', transition: 'width 800ms ease' }} />
              </div>
              <span style={{ fontFamily: '"Courier New",monospace', fontSize: '0.42rem', letterSpacing: '0.1em', color: d.coverage === 0 ? 'rgba(196,162,74,0.3)' : 'rgba(196,162,74,0.6)', width: '80px', flexShrink: 0 }}>
                {d.coverage === 0 ? 'MISSING' : d.photoCount === 1 ? '1 PHOTO' : `${d.photoCount} PHOTOS`}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Dimension bars */}
      <div>
        <p style={{ fontFamily: '"Courier New",monospace', fontSize: '0.42rem', letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(196,162,74,0.6)', marginBottom: '24px' }}>
          By Dimension
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {dimensionData.map(d => (
            <div key={d.dimension} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <span style={{ fontFamily: '"Courier New",monospace', fontSize: '0.48rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#706C65', width: '120px', flexShrink: 0 }}>
                {d.label}
              </span>
              <div style={{ flex: 1, height: '8px', background: 'rgba(196,162,74,0.08)', borderRadius: '2px', overflow: 'hidden', maxWidth: '400px' }}>
                <div style={{ height: '100%', width: `${d.score}%`, background: statusColor(d.status), borderRadius: '2px', transition: 'width 800ms ease' }} />
              </div>
              <span style={{ fontFamily: '"Courier New",monospace', fontSize: '0.42rem', letterSpacing: '0.1em', color: d.score === 0 ? 'rgba(196,162,74,0.3)' : 'rgba(196,162,74,0.6)', width: '48px', flexShrink: 0 }}>
                {d.score === 0 ? 'EMPTY' : `${d.score}%`}
              </span>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: '24px', marginTop: '32px', flexWrap: 'wrap' }}>
          {LEGEND.map(item => (
            <div key={item.status} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '24px', height: '6px', background: statusColor(item.status), borderRadius: '2px' }} />
              <span style={{ fontFamily: '"Courier New",monospace', fontSize: '0.38rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#3A3830' }}>
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}
