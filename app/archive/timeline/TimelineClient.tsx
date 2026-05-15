'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

const MONO: React.CSSProperties = { fontFamily: '"Space Mono","Courier New",monospace', textTransform: 'uppercase' as const, letterSpacing: '0.22em' }

interface SignificantDate { year: number; label: string; type: string }
interface DecadeData {
  decade:           number
  label:            string
  coverage:         number
  status:           string
  photoCount:       number
  dateCount:        number
  significantDates: SignificantDate[]
  previewPhotoId:   string | null
  locked:           boolean
}
interface TimelineStats {
  timeline:           DecadeData[]
  totalPhotos:        number
  totalDeposits:      number
  totalVoice:         number
  totalTrainingPairs: number
  weakestDecade:      DecadeData | null
  strongestDecade:    DecadeData | null
}

const STATUS_COLOR: Record<string, string> = {
  complete: '#C4A24A',
  rich:     'rgba(196,162,74,0.65)',
  growing:  'rgba(196,162,74,0.38)',
  sparse:   'rgba(196,162,74,0.15)',
  empty:    'rgba(196,162,74,0.05)',
}
const STATUS_MSG: Record<string, string> = {
  empty:    'Nothing here yet. This is where you can help the most.',
  sparse:   'A few memories exist. This decade needs more.',
  growing:  'This decade is taking shape. Keep adding.',
  rich:     'This decade is well documented.',
  complete: 'This decade is complete.',
}

export default function TimelineClient() {
  const [data,     setData]     = useState<TimelineStats | null>(null)
  const [selected, setSelected] = useState<DecadeData | null>(null)
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    fetch('/api/archive/timeline')
      .then(r => r.json())
      .then((d: TimelineStats) => {
        setData(d)
        setSelected(d.weakestDecade ?? d.timeline[0] ?? null)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <p style={{ ...MONO, fontSize: '0.42rem', color: 'rgba(196,162,74,0.4)' }}>Building your timeline...</p>
      </div>
    )
  }

  if (!data || !data.timeline.length) {
    return (
      <div style={{ textAlign: 'center', paddingTop: '80px' }}>
        <p style={{ ...MONO, fontSize: '0.42rem', color: 'rgba(196,162,74,0.4)', marginBottom: '20px' }}>No data yet</p>
        <Link href="/archive/label" style={{ ...MONO, fontSize: '0.44rem', color: '#C4A24A', background: 'rgba(196,162,74,0.1)', padding: '12px 24px', textDecoration: 'none', borderRadius: '2px' }}>
          Upload your first photographs →
        </Link>
      </div>
    )
  }

  return (
    <div style={{ paddingBottom: '80px' }}>

      {/* Header */}
      <div style={{ marginBottom: '40px' }}>
        <p style={{ ...MONO, fontSize: '0.42rem', color: '#C4A24A', marginBottom: '8px' }}>Life Timeline</p>
        <h1 style={{ fontFamily: '"Cormorant Garamond",Georgia,serif', fontSize: 'clamp(1.5rem,3vw,2.5rem)', fontWeight: 300, color: '#F0EDE6', margin: '0 0 12px' }}>
          A life, decade by decade.
        </h1>
        <p style={{ fontFamily: 'Georgia,serif', fontSize: '1rem', fontStyle: 'italic', color: '#706C65', lineHeight: 1.7, maxWidth: '520px', margin: 0 }}>
          Each decade tells a different story. The brighter the bar, the richer the archive. Dark decades need your help.
        </p>
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '48px', flexWrap: 'wrap' }}>
        {[
          { label: 'Photographs',    value: data.totalPhotos        },
          { label: 'Deposits',       value: data.totalDeposits      },
          { label: 'Voice',          value: data.totalVoice         },
          { label: 'Training Pairs', value: data.totalTrainingPairs },
        ].map(s => (
          <div key={s.label} style={{ background: 'rgba(196,162,74,0.04)', border: '1px solid rgba(196,162,74,0.1)', borderRadius: '4px', padding: '14px 18px', minWidth: '110px' }}>
            <p style={{ ...MONO, fontSize: '0.36rem', color: '#5C6166', margin: '0 0 6px' }}>{s.label}</p>
            <p style={{ fontFamily: 'Georgia,serif', fontSize: '1.75rem', fontWeight: 300, color: '#C4A24A', margin: 0, lineHeight: 1 }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Bar chart timeline */}
      <div style={{ marginBottom: '40px', overflowX: 'auto', paddingBottom: '8px' }}>
        <div style={{ display: 'flex', minWidth: `${data.timeline.length * 72}px`, gap: '4px', alignItems: 'flex-end', height: '120px', paddingBottom: '0' }}>
          {data.timeline.map(d => (
            <div
              key={d.decade}
              onClick={() => setSelected(d)}
              title={`${d.label}: ${d.coverage}%`}
              style={{
                flex:           1,
                minWidth:       '60px',
                display:        'flex',
                flexDirection:  'column',
                alignItems:     'center',
                cursor:         'pointer',
                gap:            '6px',
              }}
            >
              {/* Bar container */}
              <div style={{ width: '32px', height: '80px', position: 'relative', background: 'rgba(196,162,74,0.06)', borderRadius: '3px 3px 0 0', overflow: 'hidden', border: selected?.decade === d.decade ? '1px solid #C4A24A' : '1px solid rgba(196,162,74,0.12)', flexShrink: 0 }}>
                <div style={{
                  position:   'absolute', bottom: 0, left: 0, right: 0,
                  height:     `${d.coverage}%`,
                  background: STATUS_COLOR[d.status],
                  transition: 'height 600ms cubic-bezier(0.16,1,0.3,1)',
                }} />
              </div>
              {/* Dot */}
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: d.coverage > 0 ? '#C4A24A' : 'rgba(196,162,74,0.2)', flexShrink: 0 }} />
              {/* Label */}
              <p style={{ ...MONO, fontSize: '0.34rem', color: selected?.decade === d.decade ? '#C4A24A' : '#5C6166', margin: 0, whiteSpace: 'nowrap' }}>{d.label}</p>
              {d.photoCount > 0 && (
                <p style={{ ...MONO, fontSize: '0.3rem', color: '#3A3F44', margin: 0 }}>{d.photoCount}p</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Selected decade panel */}
      {selected && (
        <div style={{ background: 'rgba(196,162,74,0.04)', border: '1px solid rgba(196,162,74,0.15)', borderRadius: '4px', padding: '28px', marginBottom: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
            <div>
              <p style={{ ...MONO, fontSize: '0.42rem', color: '#C4A24A', marginBottom: '6px' }}>The {selected.label}</p>
              <p style={{ fontFamily: 'Georgia,serif', fontSize: '1.05rem', fontWeight: 300, color: '#F0EDE6', margin: 0, lineHeight: 1.5, maxWidth: '400px' }}>
                {STATUS_MSG[selected.status]}
              </p>
            </div>
            <p style={{ fontFamily: 'Georgia,serif', fontSize: '2.5rem', fontWeight: 300, color: STATUS_COLOR[selected.status], letterSpacing: '-0.02em', margin: 0 }}>
              {selected.coverage}%
            </p>
          </div>

          {selected.significantDates.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <p style={{ ...MONO, fontSize: '0.36rem', color: '#3A3F44', marginBottom: '10px' }}>Significant Moments</p>
              {selected.significantDates.map((d, i) => (
                <div key={i} style={{ display: 'flex', gap: '14px', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontFamily: '"Space Mono",monospace', fontSize: '0.42rem', color: '#C4A24A', flexShrink: 0, minWidth: '40px' }}>{d.year}</span>
                  <span style={{ fontFamily: 'Georgia,serif', fontSize: '0.9rem', fontStyle: 'italic', color: '#B8B4AB' }}>{d.label ?? 'Significant moment'}</span>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <Link href="/archive/label" style={{ ...MONO, fontSize: '0.42rem', background: '#C4A24A', color: '#0A0908', textDecoration: 'none', padding: '10px 18px', borderRadius: '2px' }}>Add Photographs →</Link>
            <Link href="/archive/voice" style={{ ...MONO, fontSize: '0.42rem', background: 'transparent', color: '#C4A24A', border: '1px solid rgba(196,162,74,0.35)', textDecoration: 'none', padding: '10px 18px', borderRadius: '2px' }}>Record a Memory →</Link>
            <Link href="/archive/dates" style={{ ...MONO, fontSize: '0.42rem', background: 'transparent', color: '#706C65', border: '1px solid rgba(240,237,230,0.1)', textDecoration: 'none', padding: '10px 18px', borderRadius: '2px' }}>Add Dates →</Link>
          </div>
        </div>
      )}

      {/* Legend */}
      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        {['empty','sparse','growing','rich','complete'].map(s => (
          <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
            <div style={{ width: '18px', height: '10px', background: STATUS_COLOR[s], borderRadius: '2px' }} />
            <span style={{ ...MONO, fontSize: '0.34rem', color: '#5C6166' }}>{s}</span>
          </div>
        ))}
      </div>

    </div>
  )
}
