import type { Metadata } from 'next'
export const metadata: Metadata = { title: 'Archivist Sign In' }
export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
