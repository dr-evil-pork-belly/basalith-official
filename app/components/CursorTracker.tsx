'use client'

import { useEffect, useRef, useState } from 'react'

export default function CursorTracker() {
  const dotRef  = useRef<HTMLDivElement>(null)
  const ringRef = useRef<HTMLDivElement>(null)
  const mouse   = useRef({ x: -100, y: -100 })
  const ring    = useRef({ x: -100, y: -100 })
  const raf     = useRef<number>(0)
  const [hot, setHot] = useState(false)

  useEffect(() => {
    const move = (e: MouseEvent) => {
      mouse.current = { x: e.clientX, y: e.clientY }
      if (dotRef.current) {
        dotRef.current.style.left = `${e.clientX}px`
        dotRef.current.style.top  = `${e.clientY}px`
      }
    }

    const tick = () => {
      ring.current.x += (mouse.current.x - ring.current.x) * 0.11
      ring.current.y += (mouse.current.y - ring.current.y) * 0.11
      if (ringRef.current) {
        ringRef.current.style.left = `${ring.current.x}px`
        ringRef.current.style.top  = `${ring.current.y}px`
      }
      raf.current = requestAnimationFrame(tick)
    }

    const enter = () => setHot(true)
    const leave = () => setHot(false)

    window.addEventListener('mousemove', move, { passive: true })
    raf.current = requestAnimationFrame(tick)

    // Re-bind whenever DOM changes (for dynamic content)
    const bind = () => {
      document.querySelectorAll('a,button,[role="button"]').forEach(el => {
        el.removeEventListener('mouseenter', enter)
        el.removeEventListener('mouseleave', leave)
        el.addEventListener('mouseenter', enter)
        el.addEventListener('mouseleave', leave)
      })
    }
    bind()
    const obs = new MutationObserver(bind)
    obs.observe(document.body, { childList: true, subtree: true })

    return () => {
      window.removeEventListener('mousemove', move)
      cancelAnimationFrame(raf.current)
      obs.disconnect()
    }
  }, [])

  const dotSize  = hot ? 14 : 8
  const ringSize = hot ? 52 : 34

  return (
    <>
      {/* Dot */}
      <div
        ref={dotRef}
        className="pointer-events-none fixed z-[9999] -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber animate-spark"
        style={{ width: dotSize, height: dotSize, transition: 'width 200ms, height 200ms' }}
        aria-hidden="true"
      />
      {/* Ring */}
      <div
        ref={ringRef}
        className="pointer-events-none fixed z-[9998] -translate-x-1/2 -translate-y-1/2 rounded-full border"
        style={{
          width:       ringSize,
          height:      ringSize,
          borderColor: hot ? 'rgba(255,179,71,0.65)' : 'rgba(255,179,71,0.32)',
          transition:  'width 350ms cubic-bezier(0.16,1,0.3,1), height 350ms cubic-bezier(0.16,1,0.3,1), border-color 250ms',
        }}
        aria-hidden="true"
      />
    </>
  )
}