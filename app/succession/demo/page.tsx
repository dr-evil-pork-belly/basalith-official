import type { Metadata } from 'next'
import SuccessionDemoClient from './SuccessionDemoClient'

export const metadata: Metadata = {
  title:  'Succession Demo',
  robots: { index: false, follow: false },
}

// Read-only, boardroom-ready walkthrough of the B2B succession product.
// Fully scripted from a fictional founder persona. Public and login-free.
export default function SuccessionDemoPage() {
  return <SuccessionDemoClient />
}
