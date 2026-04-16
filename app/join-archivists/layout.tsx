import type { Metadata } from 'next'
export const metadata: Metadata = { title: 'Become a Legacy Guide' }
export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
