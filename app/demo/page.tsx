import type { Metadata } from 'next'
import DemoClient from './DemoClient'

export const metadata: Metadata = {
  title:  'Live Demo',
  robots: { index: false, follow: false },
}

// Moved out of the Guide-gated /archivist tree on September 20, 2026, when the
// Guide portal was retired. Public and login-free, on the same pattern as
// /succession/demo: the APIs it calls (/api/demo/entity, /api/demo/whitepaper)
// were already public, rate limited per IP, and persist nothing. The experience
// itself is full-screen and ephemeral.
export default function DemoPage() {
  return <DemoClient />
}
