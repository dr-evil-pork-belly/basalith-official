import { useSearchParams } from 'next/navigation'

export type Audience = 'founder' | 'family'

// Single source of truth for reading the homepage audience choice from the URL
// (?audience=founder|family). Returns null when no valid choice is set. Any
// component that calls this must sit under a <Suspense> boundary, per the App
// Router's useSearchParams rule.
export function useAudience(): Audience | null {
  const raw = useSearchParams().get('audience')
  return raw === 'founder' || raw === 'family' ? raw : null
}
