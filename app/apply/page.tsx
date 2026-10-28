import type { Metadata } from 'next'
import ApplyForm from './ApplyForm'

export const metadata: Metadata = {
  title: 'Talk to us about a business changing hands',
  description: 'For a succession or an acquisition, tell us about the transition and we will reply within 48 hours. For a person or a family, begin directly at /begin.',
  // October 25, 2026: no public surface links here any more. Every business
  // button goes to /contact with a topic; this form is sent by the founder
  // after the scoping conversation, because it writes archive_applications,
  // which the admin checkout provisions from. Record: docs/NICHE_PASS_2026-10-25.md.
  robots: { index: false, follow: false },
}

// searchParams is a Promise in Next 16. It was typed and read as a plain
// object, so `type` was always undefined and the form fell back to 'legacy'.
// That silently broke /apply?type=acquisition and /apply?type=succession,
// including the acquisition CTA on /pricing. Awaiting it opts the route into
// dynamic rendering, which is required for the param to be read at all.
export default async function ApplyPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>
}) {
  const { type } = await searchParams
  return <ApplyForm initialType={type} />
}
