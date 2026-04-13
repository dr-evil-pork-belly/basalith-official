'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

type LeaderRow   = { name: string; count: number }
type SessionInfo = { closesAt: string; totalMemories: number; status: string }
type ArchiveInfo = { name: string; familyName: string }

function timeLeft(closesAt: string): string {
  const diff = new Date(closesAt).getTime() - Date.now()
  if (diff <= 0) return 'Closed'
  const h = Math.floor(diff / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'long',
    month:   'long',
    day:     'numeric',
  })
}

export default function LeaderboardPage() {
  const params    = useParams()
  const sessionId = params?.sessionId as string

  const [leaderboard, setLeaderboard] = useState<LeaderRow[]>([])
  const [session,     setSession]     = useState<SessionInfo | null>(null)
  const [archive,     setArchive]     = useState<ArchiveInfo | null>(null)
  const [loading,     setLoading]     = useState(true)
  const [countdown,   setCountdown]   = useState('')
  const [myName,      setMyName]      = useState('')

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const saved = localStorage.getItem('mg-name') || ''
    setMyName(saved)
  }, [])

  useEffect(() => {
    if (!sessionId) return
    fetchData()

    // Auto-refresh every 30 seconds
    intervalRef.current = setInterval(fetchData, 30000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [sessionId])

  useEffect(() => {
    if (!session) return
    const t = setInterval(() => setCountdown(timeLeft(session.closesAt)), 1000)
    setCountdown(timeLeft(session.closesAt))
    return () => clearInterval(t)
  }, [session])

  async function fetchData() {
    try {
      const res  = await fetch(`/api/game/${sessionId}`)
      const data = await res.json()
      if (data.error) return

      setLeaderboard(data.leaderboard ?? [])
      setSession(data.session)
      setArchive(data.archive)
    } catch {
      // non-fatal
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0A0908', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', color: '#5C6166' }}>Loading…</p>
      </div>
    )
  }

  const familyName = archive?.familyName || archive?.name || 'Family'
  const maxCount   = leaderboard[0]?.count ?? 1
  const isActive   = session && session.status === 'active' && new Date(session.closesAt) > new Date()

  return (
    <div style={{ minHeight: '100vh', background: '#0A0908', padding: '3rem 1.5rem' }}>
      <div style={{ maxWidth: '540px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <p style={{ fontFamily: '"Courier New", monospace', fontSize: '0.7rem', letterSpacing: '0.28em', color: '#C4A24A', margin: '0 0 0.5rem' }}>
            THE {familyName.toUpperCase()} ARCHIVE
          </p>
          <p style={{ fontFamily: '"Courier New", monospace', fontSize: '0.62rem', letterSpacing: '0.18em', color: '#5C6166', margin: 0 }}>
            MEMORY GAME · WEEK OF {session ? formatDate(session.closesAt).toUpperCase() : ''}
          </p>
        </div>

        {/* Stats */}
        {session && (
          <div style={{ display: 'flex', gap: '2rem', justifyContent: 'center', marginBottom: '2.5rem', flexWrap: 'wrap' }}>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontFamily: 'Georgia, serif', fontWeight: 700, fontSize: '2rem', color: '#F0EDE6', margin: '0 0 2px', lineHeight: 1 }}>
                {session.totalMemories}
              </p>
              <p style={{ fontFamily: '"Courier New", monospace', fontSize: '0.58rem', letterSpacing: '0.14em', color: '#5C6166', margin: 0 }}>
                MEMORIES
              </p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontFamily: 'Georgia, serif', fontWeight: 700, fontSize: '2rem', color: isActive ? 'rgba(196,162,74,0.9)' : '#5C6166', margin: '0 0 2px', lineHeight: 1 }}>
                {isActive ? countdown : 'Closed'}
              </p>
              <p style={{ fontFamily: '"Courier New", monospace', fontSize: '0.58rem', letterSpacing: '0.14em', color: '#5C6166', margin: 0 }}>
                {isActive ? 'REMAINING' : 'GAME OVER'}
              </p>
            </div>
          </div>
        )}

        {/* Leaderboard */}
        <div style={{ marginBottom: '2.5rem' }}>
          <p style={{ fontFamily: '"Courier New", monospace', fontSize: '0.64rem', letterSpacing: '0.22em', color: '#5C6166', marginBottom: '1.25rem' }}>
            STANDINGS
          </p>

          {leaderboard.length === 0 ? (
            <p style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', color: '#3A3830', textAlign: 'center', padding: '2rem 0' }}>
              No memories contributed yet. Be the first.
            </p>
          ) : (
            leaderboard.map((row, i) => {
              const isMe   = myName && row.name === myName.trim()
              const width  = Math.round((row.count / maxCount) * 180)
              return (
                <div key={row.name} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <span style={{ fontFamily: 'Georgia, serif', fontWeight: 700, fontSize: '1rem', color: i === 0 ? '#C4A24A' : '#3A3F44', width: '20px', flexShrink: 0, letterSpacing: '-0.02em' }}>
                    {i + 1}
                  </span>
                  <span style={{ fontFamily: '"Courier New", monospace', fontSize: '0.7rem', color: isMe ? '#C4A24A' : '#F0EDE6', minWidth: '120px', flexShrink: 0 }}>
                    {row.name}{isMe ? ' (you)' : ''}
                  </span>
                  <div style={{ width: `${width}px`, height: '6px', background: isMe ? 'rgba(196,162,74,0.7)' : i === 0 ? 'rgba(196,162,74,0.4)' : 'rgba(240,237,230,0.12)', borderRadius: '2px', flexShrink: 0, transition: 'width 0.4s ease-out' }} />
                  <span style={{ fontFamily: '"Courier New", monospace', fontSize: '0.64rem', color: '#5C6166' }}>
                    {row.count}
                  </span>
                </div>
              )
            })
          )}

          {/* Current user row if not on leaderboard */}
          {myName && !leaderboard.find(r => r.name === myName.trim()) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
              <span style={{ fontFamily: 'Georgia, serif', fontSize: '1rem', color: '#3A3F44', width: '20px' }}>—</span>
              <span style={{ fontFamily: '"Courier New", monospace', fontSize: '0.7rem', color: 'rgba(196,162,74,0.6)', minWidth: '120px' }}>
                You
              </span>
              <div style={{ width: '4px', height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px' }} />
              <span style={{ fontFamily: '"Courier New", monospace', fontSize: '0.64rem', color: '#3A3830' }}>0</span>
            </div>
          )}
        </div>

        {/* Auto-refresh note */}
        <p style={{ fontFamily: '"Courier New", monospace', fontSize: '0.58rem', letterSpacing: '0.12em', color: '#3A3830', textAlign: 'center', marginBottom: '2rem' }}>
          UPDATES EVERY 30 SECONDS
        </p>

        {/* CTA */}
        {isActive && (
          <div style={{ textAlign: 'center' }}>
            <Link
              href={`/game/${sessionId}`}
              style={{ display: 'inline-block', fontFamily: '"Courier New", monospace', fontSize: '0.68rem', letterSpacing: '0.25em', color: '#0A0908', background: '#C4A24A', textDecoration: 'none', padding: '0.85rem 2rem', borderRadius: '2px' }}
            >
              {myName && leaderboard.find(r => r.name === myName.trim())
                ? 'ADD MORE MEMORIES →'
                : 'STILL TIME TO PLAY →'}
            </Link>
          </div>
        )}

      </div>
    </div>
  )
}
