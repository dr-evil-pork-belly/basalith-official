import { permanentRedirect } from 'next/navigation'

// Retired September 18, 2026. This surface was cut from the archive sidebar on
// September 16 and nothing links to it. The URL is kept as a 308 so held links
// do not 404; the directory can be deleted after the redirect has lived a few
// months. Do not reuse the route.
export default function RetiredPage() {
  permanentRedirect('/archive/dashboard')
}
