'use client'

import { useState, useEffect, useRef } from 'react'

type ArchiveItem = {
  id:                string
  name:              string
  preferredLanguage: string | null
  streak:            number
  tier:              string | null
  role:              'owner' | 'contributor'
  contributorId?:    string
}

const G = '#C4A24A'
const M = '#706C65'

const MONO: React.CSSProperties = {
  fontFamily:    '"Space Mono", "Courier New", monospace',
  letterSpacing: '0.2em',
  textTransform: 'uppercase' as const,
}

export default function ArchiveSwitcher() {
  const dropdownRef                     = useRef<HTMLDivElement>(null)
  const [archives,   setArchives]       = useState<ArchiveItem[]>([])
  const [currentId,  setCurrentId]      = useState<string | null>(null)
  const [open,       setOpen]           = useState(false)
  const [switching,  setSwitching]      = useState(false)

  useEffect(() => {
    fetch('/api/archive/my-archives')
      .then(r => r.json())
      .then(d => {
        setArchives(d.archives ?? [])
        setCurrentId(d.currentArchiveId ?? null)
      })
      .catch(() => {})
  }, [])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  if (archives.length <= 1) return null

  const current = archives.find(a => a.id === currentId)

  async function switchArchive(archiveId: string, role: string) {
    if (archiveId === currentId || switching) return
    setSwitching(true)
    setOpen(false)
    try {
      const res = await fetch('/api/archive/switch', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ archiveId, role }),
      })
      if (res.ok) {
        // Full reload so the server re-reads the freshly-set httpOnly
        // archive-id cookie. router.refresh() soft-refreshes without
        // applying the new cookie, leaving the dashboard body on the old archive.
        window.location.reload()
        return
      }
      setSwitching(false)
    } catch {
      setSwitching(false)
    }
  }

  return (
    <div ref={dropdownRef} style={{ position: 'relative', marginTop: '8px' }}>
      <button
        onClick={() => setOpen(o => !o)}
        disabled={switching}
        style={{
          ...MONO,
          fontSize:        '0.44rem',
          color:           open ? G : 'rgba(240,237,230,0.55)',
          background:      'none',
          border:          'none',
          cursor:          switching ? 'wait' : 'pointer',
          padding:         '4px 0',
          display:         'flex',
          alignItems:      'center',
          gap:             '6px',
          width:           '100%',
          transition:      'color 150ms ease',
        }}
        onMouseEnter={e => { if (!open) (e.currentTarget as HTMLElement).style.color = 'rgba(240,237,230,0.85)' }}
        onMouseLeave={e => { if (!open) (e.currentTarget as HTMLElement).style.color = 'rgba(240,237,230,0.55)' }}
      >
        <span style={{ flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {current?.name ?? 'Select Archive'}
        </span>
        <span style={{ opacity: 0.6, fontSize: '0.6rem' }}>▾</span>
      </button>

      {open && (
        <div style={{
          position:  'absolute',
          top:       'calc(100% + 6px)',
          left:      '-24px',
          width:     '260px',
          background: '#0C0B09',
          border:    '1px solid rgba(196,162,74,0.14)',
          boxShadow: '0 12px 40px rgba(0,0,0,0.7)',
          zIndex:    200,
        }}>
          {archives.map((archive, idx) => {
            const isActive = archive.id === currentId
            return (
              <button
                key={archive.id}
                onClick={() => void switchArchive(archive.id, archive.role)}
                disabled={isActive || switching}
                style={{
                  ...MONO,
                  display:       'flex',
                  alignItems:    'center',
                  gap:           '8px',
                  width:         '100%',
                  padding:       '11px 16px',
                  background:    isActive ? 'rgba(196,162,74,0.07)' : 'transparent',
                  border:        'none',
                  borderBottom:  idx < archives.length - 1 ? '1px solid rgba(196,162,74,0.06)' : 'none',
                  cursor:        isActive ? 'default' : 'pointer',
                  textAlign:     'left',
                  fontSize:      '0.44rem',
                  color:         isActive ? G : 'rgba(240,237,230,0.55)',
                  transition:    'background 150ms ease',
                }}
                onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'rgba(196,162,74,0.04)' }}
                onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
              >
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {archive.name}
                </span>

                <span style={{
                  ...MONO,
                  fontSize:  '0.36rem',
                  padding:   '2px 5px',
                  border:    `1px solid ${archive.role === 'owner' ? 'rgba(196,162,74,0.28)' : 'rgba(112,108,101,0.28)'}`,
                  color:     archive.role === 'owner' ? G : M,
                  flexShrink: 0,
                }}>
                  {archive.role === 'owner' ? 'Owner' : 'Contrib'}
                </span>

                {archive.streak > 0 && (
                  <span style={{ fontSize: '0.65rem', flexShrink: 0 }} aria-label={`${archive.streak} day streak`}>🔥</span>
                )}

                {isActive && (
                  <span style={{ color: G, fontSize: '0.7rem', flexShrink: 0 }}>✓</span>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
