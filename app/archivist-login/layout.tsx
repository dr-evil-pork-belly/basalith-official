import type { Metadata } from 'next'
export const metadata: Metadata = { title: 'Legacy Guide Sign In' }
export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
