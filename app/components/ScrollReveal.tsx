'use client'

import { useEffect } from 'react'

export default function ScrollReveal() {
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>('.reveal, [data-reveal]')

    const revealEl = (el: HTMLElement) => {
      el.classList.add('in-view', 'revealed')
      io.unobserve(el)
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) revealEl(entry.target as HTMLElement)
        })
      },
      // threshold 0.05 + minimal negative rootMargin so elements near fold
      // trigger reliably on all screen sizes including small iPhones
      { threshold: 0.05, rootMargin: '0px 0px -10px 0px' }
    )

    els.forEach((el) => io.observe(el))

    // Hard fallback: after 2.5s reveal anything the observer missed
    const fallback = setTimeout(() => {
      document.querySelectorAll<HTMLElement>(
        '.reveal:not(.in-view), [data-reveal]:not(.revealed)'
      ).forEach(el => el.classList.add('in-view', 'revealed'))
    }, 2500)

    return () => { io.disconnect(); clearTimeout(fallback) }
  }, [])

  return null
}
