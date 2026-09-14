import { redirect } from 'next/navigation'

// This used to land on /join-archivists, which is itself a permanent redirect
// to /contact as of September 14, 2026 (Guide recruiting retired). /partner is
// kept rather than deleted so held URLs do not 404. /partner/apply reaches this
// same redirect via /partner#apply. Advisors use the "Partnering as an advisor"
// topic on /contact.
export default function PartnerPage() {
  redirect('/contact')
}
