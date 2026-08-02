import type { Metadata } from 'next'
import ApplyForm from './ApplyForm'

export const metadata: Metadata = {
  title: 'Apply · Basalith',
  description: 'Begin your Basalith archive. Personal legacy or business succession.',
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
