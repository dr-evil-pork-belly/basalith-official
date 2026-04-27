'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

const LANGUAGES = [
  { code: 'en', label: 'English'      },
  { code: 'zh', label: '中文'          },
  { code: 'es', label: 'Español'      },
  { code: 'vi', label: 'Tiếng Việt'   },
  { code: 'tl', label: 'Tagalog'      },
  { code: 'ko', label: '한국어'        },
] as const

type LangCode = typeof LANGUAGES[number]['code']

function getStoredLang(): LangCode {
  if (typeof document === 'undefined') return 'en'
  const match = document.cookie.match(/preferred_language=([^;]+)/)
  const val   = match?.[1] ?? 'en'
  return LANGUAGES.some(l => l.code === val) ? val as LangCode : 'en'
}

export default function LanguageSelector({
  variant = 'light',
}: {
  variant?: 'light' | 'dark'
}) {
  const [open,    setOpen]    = useState(false)
  const [current, setCurrent] = useState<LangCode>('en')
  const router    = useRef(useRouter())
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setCurrent(getStoredLang())
  }, [])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  function switchLang(code: LangCode) {
    document.cookie = `preferred_language=${code};path=/;max-age=31536000;SameSite=Lax`
    setCurrent(code)
    setOpen(false)
    router.current.refresh()
  }

  const isLight = variant === 'light'
  const textColor   = isLight ? 'var(--color-text-muted)'    : 'rgba(240,237,230,0.6)'
  const borderColor = isLight ? 'var(--color-border-medium)' : 'rgba(255,255,255,0.12)'
  const bgColor     = isLight ? 'var(--color-surface)'       : '#1C1A17'
  const activeBg    = isLight ? 'var(--color-gold-subtle)'   : 'rgba(196,162,74,0.08)'
  const activeText  = isLight ? 'var(--color-gold)'          : '#C4A24A'
  const hoverBg     = isLight ? 'var(--color-surface-alt)'   : 'rgba(255,255,255,0.04)'

  const MONO: React.CSSProperties = {
    fontFamily:    'var(--font-space-mono, "Space Mono", "Courier New", monospace)',
    fontSize:      '0.52rem',
    letterSpacing: '0.2em',
    textTransform: 'uppercase' as const,
  }

  const currentLabel = LANGUAGES.find(l => l.code === current)?.label ?? 'EN'

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <button
        aria-label={`Language: ${currentLabel}`}
        aria-expanded={open}
        onClick={() => setOpen(v => !v)}
        style={{
          ...MONO,
          display:        'flex',
          alignItems:     'center',
          gap:            '6px',
          background:     'transparent',
          border:         `1px solid ${borderColor}`,
          borderRadius:   '2px',
          padding:        '7px 12px',
          cursor:         'pointer',
          color:          textColor,
          minHeight:      '36px',
          transition:     'border-color 200ms ease, color 200ms ease',
          whiteSpace:     'nowrap',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.borderColor = isLight ? 'var(--color-gold)' : '#C4A24A'
          e.currentTarget.style.color       = isLight ? 'var(--color-gold)' : '#C4A24A'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.borderColor = borderColor
          e.currentTarget.style.color       = textColor
        }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10"/>
          <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
        </svg>
        {currentLabel}
        <svg width="8" height="8" viewBox="0 0 10 10" fill="currentColor" aria-hidden="true" style={{ opacity: 0.5, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 200ms' }}>
          <path d="M1 3l4 4 4-4"/>
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          style={{
            position:    'absolute',
            top:         'calc(100% + 4px)',
            right:       0,
            background:  bgColor,
            border:      `1px solid ${borderColor}`,
            borderRadius: '2px',
            boxShadow:   '0 8px 24px rgba(0,0,0,0.12)',
            zIndex:      300,
            minWidth:    '140px',
            overflow:    'hidden',
          }}
        >
          {LANGUAGES.map(({ code, label }) => {
            const active = current === code
            return (
              <button
                key={code}
                role="menuitem"
                onClick={() => switchLang(code)}
                style={{
                  ...MONO,
                  display:    'flex',
                  alignItems: 'center',
                  gap:        '10px',
                  width:      '100%',
                  padding:    '11px 16px',
                  background: active ? activeBg : 'transparent',
                  border:     'none',
                  cursor:     'pointer',
                  color:      active ? activeText : textColor,
                  textAlign:  'left',
                  transition: 'background 150ms ease',
                }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.background = hoverBg }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
              >
                <span style={{ flex: 1 }}>{label}</span>
                {active && (
                  <span style={{ color: activeText, fontSize: '0.7rem' }}>✓</span>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
