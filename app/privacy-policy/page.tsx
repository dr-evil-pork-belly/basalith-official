import { permanentRedirect } from 'next/navigation'
import type { Metadata } from 'next'

// Two privacy documents existed. /privacy survives as the single canonical policy.
// Everything this page carried that /privacy did not, the named subprocessors, the
// localStorage disclosure, the law enforcement paragraph, and enquiry retention, was
// folded into /privacy in August 2026.
//
// The noindex below is belt and braces. A 308 carries no HTML body, so the redirect
// itself is what actually consolidates this URL onto /privacy.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default function PrivacyPolicyPage() {
  permanentRedirect('/privacy')
}
