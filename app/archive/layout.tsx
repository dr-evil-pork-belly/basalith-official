'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  { href: '/archive/dashboard',    label: 'Archive'        },
  { href: '/archive/entity',       label: 'My Entity'      },
  { href: '/archive/voice',        label: 'Voice'          },
  { href: '/archive/wisdom',       label: 'Wisdom Session' },
  { href: '/archive/writing',      label: 'Writing'        },
  { href: '/archive/videos',       label: 'Videos'         },
  { href: '/archive/upload',       label: 'Upload'         },
  { href: '/archive/label',        label: 'Label'          },
  { href: '/archive/gallery',      label: 'Gallery'        },
  { href: '/archive/contributors', label: 'Contributors'   },
  { href: '/archive/dates',        label: 'Important Dates'},
  { href: '/archive/preferences',  label: 'Email Delivery' },
]

export default function ArchiveLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="min-h-screen flex" style={{ background: '#0C0C0D' }}>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-52 shrink-0 border-r" style={{ borderColor: 'rgba(255,255,255,0.06)', background: '#0C0C0D' }}>
        <div className="px-6 pt-8 pb-6 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <Link href="/" className="font-sans text-[0.72rem] font-bold tracking-[0.2em] uppercase no-underline block" style={{ color: '#F0F0EE' }}>
            Basalith
          </Link>
          <p className="font-sans text-[0.58rem] tracking-[0.14em] uppercase mt-1" style={{ color: '#5C6166' }}>
            Archive Portal
          </p>
        </div>

        <nav className="flex flex-col pt-4 pb-6 flex-1" aria-label="Archive navigation">
          {NAV.map(({ href, label }) => {
            const active    = pathname === href || pathname.startsWith(href + '/')
            const isEntity  = href === '/archive/entity'
            const isVoice   = href === '/archive/voice'
            const isWisdom  = href === '/archive/wisdom'
            const isWriting = href === '/archive/writing'
            const isVideos  = href === '/archive/videos'
            const isUpload  = href === '/archive/upload'
            const isGold    = isEntity || isWisdom || isVoice || isWriting || isVideos || isUpload
            return (
              <Link
                key={href}
                href={href}
                className="font-sans text-[0.7rem] tracking-[0.1em] uppercase no-underline px-6 py-3 transition-colors duration-200 relative flex items-center gap-2"
                style={{ color: active ? '#F0F0EE' : isGold ? 'rgba(196,162,74,0.6)' : '#5C6166' }}
              >
                {active && (
                  <span
                    className="absolute left-0 top-0 bottom-0 w-px"
                    style={{ background: 'rgba(196,162,74,0.7)' }}
                    aria-hidden="true"
                  />
                )}
                {isEntity && (
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
                    <rect x="1" y="1" width="6" height="6" stroke="rgba(196,162,74,0.8)" strokeWidth="0.8" transform="rotate(45 4 4)" />
                  </svg>
                )}
                {isVoice && (
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="rgba(196,162,74,0.8)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}>
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                    <line x1="12" y1="19" x2="12" y2="23"/>
                    <line x1="8"  y1="23" x2="16" y2="23"/>
                  </svg>
                )}
                {isWriting && (
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="rgba(196,162,74,0.8)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}>
                    <path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>
                  </svg>
                )}
                {isVideos && (
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="rgba(196,162,74,0.8)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}>
                    <polygon points="5 3 19 12 5 21 5 3"/>
                  </svg>
                )}
                {isUpload && (
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="rgba(196,162,74,0.8)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}>
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
                  </svg>
                )}
                {label}
              </Link>
            )
          })}
        </nav>

        <div className="px-6 pb-8">
          <a
            href="/api/archive-signout"
            className="font-sans text-[0.62rem] tracking-[0.1em] uppercase no-underline transition-colors duration-200"
            style={{ color: '#3A3F44' }}
          >
            Sign Out
          </a>
        </div>
      </aside>

      {/* Mobile top nav */}
      <div className="md:hidden fixed inset-x-0 top-0 z-50 border-b" style={{ background: '#0C0C0D', borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="flex items-center justify-between px-5 py-4">
          <Link href="/" className="font-sans text-[0.7rem] font-bold tracking-[0.2em] uppercase no-underline" style={{ color: '#F0F0EE' }}>
            Basalith Archive
          </Link>
          <a href="/api/archive-signout" className="font-sans text-[0.58rem] tracking-[0.1em] uppercase no-underline" style={{ color: '#5C6166' }}>
            Out
          </a>
        </div>
        <div className="flex overflow-x-auto scrollbar-none px-5 pb-3 gap-6">
          {NAV.map(({ href, label }) => {
            const active    = pathname === href || pathname.startsWith(href + '/')
            const isEntity  = href === '/archive/entity'
            const isVoice   = href === '/archive/voice'
            const isWriting = href === '/archive/writing'
            const isVideos  = href === '/archive/videos'
            const isUpload  = href === '/archive/upload'
            const isGold    = isEntity || isVoice || isWriting || isVideos || isUpload || href === '/archive/wisdom'
            return (
              <Link
                key={href}
                href={href}
                className="font-sans text-[0.62rem] tracking-[0.1em] uppercase no-underline whitespace-nowrap shrink-0 pb-px transition-colors duration-200 flex items-center gap-1"
                style={{
                  color:        active ? '#F0F0EE' : isGold ? 'rgba(196,162,74,0.6)' : '#5C6166',
                  borderBottom: active ? '1px solid rgba(196,162,74,0.6)' : '1px solid transparent',
                }}
              >
                {isEntity && (
                  <svg width="7" height="7" viewBox="0 0 8 8" fill="none" aria-hidden="true">
                    <rect x="1" y="1" width="6" height="6" stroke="rgba(196,162,74,0.8)" strokeWidth="0.8" transform="rotate(45 4 4)" />
                  </svg>
                )}
                {isVoice && (
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="rgba(196,162,74,0.8)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                    <line x1="12" y1="19" x2="12" y2="23"/>
                    <line x1="8"  y1="23" x2="16" y2="23"/>
                  </svg>
                )}
                {isWriting && (
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="rgba(196,162,74,0.8)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>
                  </svg>
                )}
                {isVideos && (
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="rgba(196,162,74,0.8)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polygon points="5 3 19 12 5 21 5 3"/>
                  </svg>
                )}
                {isUpload && (
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="rgba(196,162,74,0.8)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
                  </svg>
                )}
                {label}
              </Link>
            )
          })}
        </div>
      </div>

      {/* Page content */}
      <main className="flex-1 md:px-10 px-5 pt-8 md:pt-8 pb-16 md:mt-0 mt-[72px]">
        {children}
      </main>

    </div>
  )
}
