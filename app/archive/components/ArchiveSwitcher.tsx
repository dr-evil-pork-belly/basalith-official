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

// Stone register: every color is a var(--portal-*) read (globals.css,
// .portal-stone). No hex literal belongs in this file.
const SERIF = 'var(--portal-serif)'

const MONO: React.CSSProperties = {
  fontFamily:    'var(--portal-mono)',
  fontSize:      '11px',
  letterSpacing: '0.16em',
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
        aria-haspopup="listbox"
        aria-expanded={open}
        style={{
          fontFamily:      SERIF,
          fontSize:        '15px',
          color:           open ? 'var(--spine-fg)' : 'var(--spine-body)',
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
        onMouseEnter={e => { if (!open) (e.currentTarget as HTMLElement).style.color = 'var(--spine-fg)' }}
        onMouseLeave={e => { if (!open) (e.currentTarget as HTMLElement).style.color = 'var(--spine-body)' }}
      >
        <span style={{ flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {current?.name ?? 'Select Archive'}
        </span>
        <span aria-hidden="true" style={{ color: 'var(--spine-dim)', fontSize: '12px' }}>▾</span>
      </button>

      {open && (
        <div style={{
          position:  'absolute',
          top:       'calc(100% + 6px)',
          left:      '-24px',
          width:     '260px',
          background: 'var(--portal-card)',
          border:    '1px solid var(--portal-card-line)',
          boxShadow: 'var(--portal-lift)',
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
                  fontFamily:    SERIF,
                  display:       'flex',
                  alignItems:    'center',
                  gap:           '8px',
                  width:         '100%',
                  padding:       '11px 16px',
                  background:    isActive ? 'var(--portal-gold-wash)' : 'transparent',
                  border:        'none',
                  borderBottom:  idx < archives.length - 1 ? '1px solid var(--portal-rule)' : 'none',
                  cursor:        isActive ? 'default' : 'pointer',
                  textAlign:     'left',
                  fontSize:      '15px',
                  color:         isActive ? 'var(--portal-ink)' : 'var(--portal-body)',
                  transition:    'background 150ms ease',
                }}
                onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'var(--portal-inset)' }}
                onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
              >
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {archive.name}
                </span>

                <span style={{
                  ...MONO,
                  padding:   '2px 6px',
                  border:    `1px solid ${archive.role === 'owner' ? 'var(--portal-gold-line)' : 'var(--portal-card-line)'}`,
                  color:     archive.role === 'owner' ? 'var(--portal-gold-ink)' : 'var(--portal-label)',
                  flexShrink: 0,
                }}>
                  {archive.role === 'owner' ? 'Owner' : 'Contributor'}
                </span>

                {archive.streak > 0 && (
                  <span style={{ ...MONO, color: 'var(--portal-label)', flexShrink: 0 }} aria-label={`${archive.streak} day streak`}>{archive.streak}d</span>
                )}

                {isActive && (
                  <span aria-hidden="true" style={{ color: 'var(--portal-gold-ink)', fontSize: '13px', flexShrink: 0 }}>✓</span>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
