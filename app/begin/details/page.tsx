import { permanentRedirect } from 'next/navigation'

// Retired September 19, 2026. This was the old three-step application flow
// (tier, details, review, confirmed). The self-serve trial of September 17
// replaced it: /begin is now one page, email to magic link to the first call.
// Nothing linked here any more, not even the steps to each other. The URL is
// kept as a 308 so held links do not 404; the directory can be deleted after
// the redirect has lived a few months. Do not reuse the route.
export default function RetiredPage() {
  permanentRedirect('/begin')
}
