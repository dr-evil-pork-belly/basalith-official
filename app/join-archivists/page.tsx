import { permanentRedirect } from 'next/navigation'

// Retired September 14, 2026. Basalith does not recruit independent
// contractors to sell archives, so the public recruiting page is gone. The URL
// is kept as a permanent redirect so held links do not 404. Advisors who want
// to work with Basalith use the "Partnering as an advisor" topic on /contact.
// Do not restore a recruiting page here. If a certified delivery role ever
// exists, it gets its own page under a name that does not carry "archivist."
export default function JoinArchivistsPage() {
  permanentRedirect('/contact')
}
