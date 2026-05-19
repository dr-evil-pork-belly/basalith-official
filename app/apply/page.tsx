import type { Metadata } from 'next'
import ApplyForm from './ApplyForm'

export const metadata: Metadata = {
  title: 'Apply · Basalith',
  description: 'Begin your Basalith archive. Personal legacy or business succession.',
}

export default function ApplyPage({
  searchParams,
}: {
  searchParams: { type?: string }
}) {
  return <ApplyForm initialType={searchParams.type} />
}
