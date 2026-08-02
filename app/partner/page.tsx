import { redirect } from 'next/navigation'

// This used to land on /join-archivists. That form posts to
// /api/archivist-interest, which persists nothing and notifies nobody while
// still returning success, so the route is repointed until the handler is
// built. /partner is kept rather than deleted so held URLs do not 404.
// /partner/apply reaches this same redirect via /partner#apply.
export default function PartnerPage() {
  redirect('/contact')
}
