import type { Metadata } from 'next'
export const metadata: Metadata = { title: 'Request Your Founding' }
export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
