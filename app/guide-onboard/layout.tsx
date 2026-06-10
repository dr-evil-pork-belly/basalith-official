import type { Metadata } from 'next'
export const metadata: Metadata = { title: 'Legacy Guide Onboarding' }
export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
