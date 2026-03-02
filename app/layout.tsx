import type { Metadata } from 'next'
import { Cormorant_Garamond, Public_Sans } from 'next/font/google'
import './globals.css'
import CursorTracker from './components/CursorTracker'
import ScrollReveal  from './components/ScrollReveal'

const cormorant = Cormorant_Garamond({
  subsets:  ['latin'],
  weight:   ['300', '400', '500', '600', '700'],
  style:    ['normal', 'italic'],
  variable: '--font-cormorant',
  display:  'swap',
})

const publicSans = Public_Sans({
  subsets:  ['latin'],
  weight:   ['200', '300', '400', '500', '600', '700', '800'],
  style:    ['normal', 'italic'],
  variable: '--font-public-sans',
  display:  'swap',
})

export const metadata: Metadata = {
  title:       'Basalith — The Asset That Never Leaves',
  description: 'Your identity, preserved by the people who know it best. A Golden Dataset built by family, governed like an estate, inherited for centuries.',
  openGraph: {
    title:       'Basalith — The Asset That Never Leaves',
    description: 'High-end data storage powered by family labeling and Emotional Fidelity.',
    type:        'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${cormorant.variable} ${publicSans.variable}`}>
      <body>
        {/* Grain texture — fixed, full-screen, pointer-events none */}
        <div
          className="grain fixed inset-0 z-[9997] pointer-events-none"
          aria-hidden="true"
        />

        {/* Custom amber cursor — client component */}
        <CursorTracker />

        {/* Scroll-triggered reveal observer — client component */}
        <ScrollReveal />

        {children}
      </body>
    </html>
  )
}