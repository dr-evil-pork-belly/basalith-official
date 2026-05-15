import type { Metadata } from 'next'
import TimelineClient from './TimelineClient'

export const metadata: Metadata = { title: 'Life Timeline · Basalith' }

export default function TimelinePage() {
  return <TimelineClient />
}
