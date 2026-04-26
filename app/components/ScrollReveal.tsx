'use client'

import { useEffect } from 'react'

export default function ScrollReveal() {
  useEffect(() => {
    // Support both legacy .reveal/.in-view (portal) and new [data-reveal]/.revealed (marketing)
    const els    = document.querySelectorAll<HTMLElement>('.reveal, [data-reveal]')

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          const el = entry.target as HTMLElement
          // Legacy system
          el.classList.add('in-view')
          // New system
          el.classList.add('revealed')
          io.unobserve(el)
        })
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    )

    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])

  return null
}
