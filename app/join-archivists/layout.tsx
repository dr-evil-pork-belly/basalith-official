import type { Metadata } from 'next'
export const metadata: Metadata = { title: 'Join the Archivists' }
export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
