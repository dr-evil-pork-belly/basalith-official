import type { Metadata } from 'next'
import { Cormorant_Garamond, Public_Sans } from 'next/font/google'
import './globals.css'
import CursorTracker     from './components/CursorTracker'
import ScrollReveal      from './components/ScrollReveal'
import AuthErrorRedirect from './components/AuthErrorRedirect'

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
  title:       'Basalith · XYZ — Sovereign Data Infrastructure',
  description: 'The provenance record that powers your entity. Biological ledgers, strategic archives, lineage blueprints. Every deposit feeds the AI.',
  manifest:    '/site.webmanifest',
  icons: {
    icon: [
      { url: '/favicon.ico',        sizes: 'any' },
      { url: '/favicon-16x16.png',  sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png',  sizes: '32x32', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    other: [
      { rel: 'icon', url: '/icon-192x192.png', sizes: '192x192' },
      { rel: 'icon', url: '/icon-512x512.png', sizes: '512x512' },
    ],
  },
  openGraph: {
    title:       'Basalith · XYZ',
    description: 'The provenance record that powers your entity.',
    url:         'https://basalith.xyz',
    siteName:    'Basalith XYZ',
    images:      [{ url: '/icon-512x512.png' }],
  },
  twitter: {
    card:        'summary',
    title:       'Basalith · XYZ',
    description: 'Sovereign data infrastructure.',
    images:      ['/icon-512x512.png'],
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${cormorant.variable} ${publicSans.variable}`}>
      <body>
        <div className="grain fixed inset-0 z-[9997] pointer-events-none" aria-hidden="true" />
        <AuthErrorRedirect />
        <CursorTracker />
        <ScrollReveal />
        {children}
      </body>
    </html>
  )
}