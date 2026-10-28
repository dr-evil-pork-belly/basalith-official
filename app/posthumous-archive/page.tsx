import { permanentRedirect } from 'next/navigation'
import type { Metadata } from 'next'

// Retired October 28, 2026. The Witness Basalith (a record built for someone
// who has already passed) was pulled as a product on September 24, 2026, but
// this page stayed live, unlinked and out of the sitemap. Basalith is built
// with a living person who takes part, so the URL now sends held links to the
// personal door instead of 404ing. Do not restore a posthumous offer here.
// Record: docs/AI_WORD_PASS_2026-10-28.md.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default function PosthumousArchivePage() {
  permanentRedirect('/families')
}
