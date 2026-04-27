import type { Metadata } from 'next'
import { Cormorant_Garamond, Space_Mono } from 'next/font/google'
import { cookies } from 'next/headers'
import { LOCALES, type Locale } from '@/lib/i18n'
import { LangProvider }          from './components/LangProvider'
import './globals.css'
import ScrollReveal      from './components/ScrollReveal'
import AuthErrorRedirect from './components/AuthErrorRedirect'

const cormorant = Cormorant_Garamond({
  subsets:  ['latin'],
  weight:   ['300', '400', '500', '600', '700'],
  style:    ['normal', 'italic'],
  variable: '--font-cormorant',
  display:  'swap',
})

const spaceMono = Space_Mono({
  subsets:  ['latin'],
  weight:   ['400', '700'],
  variable: '--font-space-mono',
  display:  'swap',
})

export const metadata: Metadata = {
  title: {
    default:  'Basalith',
    template: '%s · Basalith',
  },
  description: 'The archive of a life, governed with the same seriousness as an estate. We build for legacy.',
  metadataBase: new URL('https://basalith.xyz'),
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
    title:       'Basalith',
    description: 'The archive of a life, governed with the same seriousness as an estate.',
    url:         'https://basalith.xyz',
    siteName:    'Basalith',
    images:      [{ url: '/icon-512x512.png' }],
  },
  twitter: {
    card:        'summary',
    title:       'Basalith',
    description: 'The archive of a life, governed with the same seriousness as an estate.',
    images:      ['/icon-512x512.png'],
  },
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const raw         = cookieStore.get('lang')?.value ?? 'en'
  const locale      = (LOCALES as readonly string[]).includes(raw) ? raw as Locale : 'en'

  return (
    <html lang={locale} className={`${cormorant.variable} ${spaceMono.variable}`}>
      <body>
        <LangProvider lang={locale}>
          <div className="grain fixed inset-0 z-[9997] pointer-events-none" aria-hidden="true" />
          <AuthErrorRedirect />
          <ScrollReveal />
          {children}
        </LangProvider>
      </body>
    </html>
  )
}
